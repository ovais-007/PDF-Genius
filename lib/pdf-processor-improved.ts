import { createRequire } from "module";

const DEBUG = true; // Force debug on Vercel

export interface ProcessedChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface PDFExtractionResult {
  text: string;
  numPages?: number;
  metadata?: any;
}

/**
 * Improved PDF text extraction with multiple fallback strategies
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log("ovais from improved pdf-processor-improved");
  try {
    if (DEBUG) console.log("📖 Starting improved PDF text extraction...");

    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer");
    }

    if (DEBUG) console.log("📊 Buffer size:", buffer.length, "bytes");

    // Validate PDF header
    const pdfHeader = buffer.toString("ascii", 0, 4);
    if (pdfHeader !== "%PDF") {
      throw new Error("Invalid PDF file: Missing PDF header");
    }

    // Strategy 1: Try pdf-parse with improved error handling
    try {
      const result = await extractWithPdfParse(buffer);
      if (result && result.text && result.text.trim().length > 0) {
        if (DEBUG)
          console.log("✅ Successfully extracted text using pdf-parse");
        return result.text;
      }
    } catch (pdfParseError) {
      if (DEBUG)
        console.warn("⚠️ pdf-parse failed, trying fallback:", pdfParseError);

      // Check if it's the known ENOENT test file issue
      if (
        pdfParseError instanceof Error &&
        pdfParseError.message.includes("ENOENT") &&
        pdfParseError.message.includes("test")
      ) {
        console.log(
          "🔄 Detected pdf-parse test file issue, using workaround...",
        );

        // Try the workaround approach
        try {
          const workaroundResult = await extractWithWorkaround(buffer);
          if (workaroundResult && workaroundResult.trim().length > 0) {
            if (DEBUG)
              console.log("✅ Successfully extracted text using workaround");
            return workaroundResult;
          }
        } catch (workaroundError) {
          if (DEBUG)
            console.warn("⚠️ Workaround also failed:", workaroundError);
        }
      }
    }

    // Strategy 2: Try basic text extraction fallback
    try {
      const basicResult = await extractBasicText(buffer);
      if (basicResult && basicResult.trim().length > 0) {
        if (DEBUG)
          console.log("✅ Successfully extracted text using basic extraction");
        return basicResult;
      }
    } catch (basicError) {
      if (DEBUG) console.warn("⚠️ Basic extraction failed:", basicError);
    }

    // If all strategies fail
    throw new Error(
      "Failed to extract text from PDF using all available methods. " +
        "The PDF might be password protected, corrupted, or contain only images.",
    );
  } catch (error) {
    if (DEBUG) console.error("❌ PDF extraction error:", error);

    if (error instanceof Error) {
      // Re-throw with more context
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }

    throw new Error("Unknown error occurred during PDF text extraction");
  }
}

/**
 * Extract text using pdf-parse with improved error handling
 */
async function extractWithPdfParse(
  buffer: Buffer,
): Promise<PDFExtractionResult> {
  const require = createRequire(import.meta.url);

  try {
    // Import pdf-parse
    const pdfParse = require("pdf-parse");

    // Create a clean buffer copy to avoid potential issues
    const cleanBuffer = Buffer.from(buffer);

    // Parse with options to handle problematic PDFs
    const data = await pdfParse(cleanBuffer, {
      // Disable external resources that might cause ENOENT errors
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });

    if (DEBUG) {
      console.log("📄 PDF parse results:", {
        pages: data.numpages,
        textLength: data.text?.length || 0,
        hasInfo: !!data.info,
      });
    }

    return {
      text: data.text || "",
      numPages: data.numpages,
      metadata: data.info,
    };
  } catch (error) {
    if (DEBUG) console.error("❌ pdf-parse extraction failed:", error);
    throw error;
  }
}

/**
 * Workaround for pdf-parse ENOENT issues
 */
async function extractWithWorkaround(buffer: Buffer): Promise<string> {
  const require = createRequire(import.meta.url);

  try {
    // Try to isolate pdf-parse from its test dependencies
    const originalCwd = process.cwd();

    // Temporarily change working directory to avoid test file lookups
    const tempDir = require("os").tmpdir();
    process.chdir(tempDir);

    try {
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buffer);
      return result.text || "";
    } finally {
      // Always restore original working directory
      process.chdir(originalCwd);
    }
  } catch (error) {
    if (DEBUG) console.error("❌ Workaround extraction failed:", error);
    throw error;
  }
}

/**
 * Basic text extraction fallback (limited functionality)
 */
async function extractBasicText(buffer: Buffer): Promise<string> {
  try {
    // This is a very basic approach - convert buffer to string and look for text patterns
    const pdfString = buffer.toString("binary");

    // Look for text between stream objects (very basic PDF parsing)
    const textMatches =
      pdfString.match(/stream\s*([\s\S]*?)\s*endstream/g) || [];

    let extractedText = "";

    for (const match of textMatches) {
      // Remove stream markers
      const content = match
        .replace(/^stream\s*/, "")
        .replace(/\s*endstream$/, "");

      // Look for readable text (basic heuristic)
      const readableText = content.match(/[a-zA-Z0-9\s.,!?;:"'-]+/g);
      if (readableText) {
        extractedText += readableText.join(" ") + " ";
      }
    }

    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?;:"'-]/g, "")
      .trim();

    if (extractedText.length < 50) {
      throw new Error("Insufficient text extracted using basic method");
    }

    return extractedText;
  } catch (error) {
    if (DEBUG) console.error("❌ Basic extraction failed:", error);
    throw error;
  }
}

/**
 * Enhanced text cleaning with better handling
 */
export function cleanText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return (
    text
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize line breaks
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Trim
      .trim()
  );
}

/**
 * Improved text chunking with better sentence boundary detection
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): ProcessedChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: ProcessedChunk[] = [];

  // Better sentence splitting that handles abbreviations
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter((s) => s.trim().length > 0);

  let currentChunk = "";
  let currentChunkIndex = 0;
  let currentPageNumber = 1;

  // Estimate characters per page (rough approximation)
  const avgCharsPerPage = 2500;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();

    if (!sentence) continue;

    // Check if adding this sentence would exceed chunk size
    if (
      currentChunk.length + sentence.length + 1 > chunkSize &&
      currentChunk.length > 0
    ) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        pageNumber: currentPageNumber,
        chunkIndex: currentChunkIndex,
      });

      // Create overlap for new chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = Math.min(Math.floor(overlap / 6), words.length);
      const overlapText = words.slice(-overlapWords).join(" ");

      currentChunk = overlapText ? overlapText + " " + sentence : sentence;
      currentChunkIndex++;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? " " : "") + sentence;
    }

    // Update page number estimation
    const totalCharsProcessed =
      chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) +
      currentChunk.length;
    currentPageNumber = Math.max(
      1,
      Math.ceil(totalCharsProcessed / avgCharsPerPage),
    );
  }

  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      pageNumber: currentPageNumber,
      chunkIndex: currentChunkIndex,
    });
  }

  return chunks;
}

/**
 * Main processing function with comprehensive error handling
 */
export async function processPDFToChunks(
  buffer: Buffer,
  chunkSize: number = 1000,
  overlap: number = 200,
): Promise<ProcessedChunk[]> {
  try {
    if (DEBUG) console.log("🔄 Processing PDF to chunks (improved)...");

    // Validate inputs
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid PDF buffer provided");
    }

    if (chunkSize < 100 || chunkSize > 10000) {
      throw new Error("Chunk size must be between 100 and 10000 characters");
    }

    if (overlap < 0 || overlap >= chunkSize) {
      throw new Error("Overlap must be between 0 and chunk size");
    }

    // Extract text
    const text = await extractTextFromPDF(buffer);
    if (DEBUG) console.log("📝 Extracted text length:", text.length);

    if (text.length === 0) {
      throw new Error("No text content found in PDF");
    }

    // Clean text
    const cleanedText = cleanText(text);
    if (DEBUG) console.log("🧹 Cleaned text length:", cleanedText.length);

    if (cleanedText.length === 0) {
      throw new Error("No valid text content after cleaning");
    }

    // Create chunks
    const chunks = splitTextIntoChunks(cleanedText, chunkSize, overlap);
    if (DEBUG) console.log("✂️ Created chunks:", chunks.length);

    if (chunks.length === 0) {
      throw new Error("Failed to create text chunks from PDF content");
    }

    // Validate chunks
    const validChunks = chunks.filter(
      (chunk) => chunk.text && chunk.text.trim().length > 0,
    );

    if (validChunks.length === 0) {
      throw new Error("All created chunks are empty");
    }

    if (DEBUG) {
      console.log("📊 Chunk statistics:", {
        totalChunks: validChunks.length,
        avgChunkSize: Math.round(
          validChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
            validChunks.length,
        ),
        minChunkSize: Math.min(
          ...validChunks.map((chunk) => chunk.text.length),
        ),
        maxChunkSize: Math.max(
          ...validChunks.map((chunk) => chunk.text.length),
        ),
      });
    }

    return validChunks;
  } catch (error) {
    if (DEBUG) console.error("❌ Processing error:", error);

    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes("Invalid PDF")) {
        throw new Error("The uploaded file is not a valid PDF document");
      }
      if (error.message.includes("password")) {
        throw new Error(
          "This PDF is password protected and cannot be processed",
        );
      }
      if (error.message.includes("ENOENT")) {
        throw new Error(
          "PDF processing library configuration issue. Please try again or contact support.",
        );
      }

      throw error;
    }

    throw new Error("Unknown error occurred while processing PDF");
  }
}

/**
 * Generate unique chunk ID
 */
export function generateChunkId(
  userId: string,
  fileName: string,
  chunkIndex: number,
): string {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const timestamp = Date.now();
  return `${userId}-${sanitizedFileName}-${chunkIndex}-${timestamp}`;
}

/**
 * Validate PDF buffer
 */
export function validatePDFBuffer(buffer: Buffer): {
  isValid: boolean;
  error?: string;
} {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: "Empty or invalid buffer" };
  }

  if (buffer.length < 100) {
    return { isValid: false, error: "File too small to be a valid PDF" };
  }

  const header = buffer.toString("ascii", 0, 4);
  if (header !== "%PDF") {
    return { isValid: false, error: "Invalid PDF file format" };
  }

  return { isValid: true };
}
