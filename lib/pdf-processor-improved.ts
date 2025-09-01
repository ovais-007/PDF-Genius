import * as parser from "pdf-parse/lib/pdf-parse.js";

const DEBUG = process.env.NODE_ENV === "development";

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
 * PDF text extraction using a direct import of the pdf-parse library.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  console.log("ovais from improved pdf-processor-improved");
  try {
    if (DEBUG)
      console.log("📖 Starting PDF text extraction with direct import...");

    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer");
    }

    if (DEBUG) console.log("📊 Buffer size:", buffer.length, "bytes");

    // Validate PDF header
    const pdfHeader = buffer.toString("ascii", 0, 4);
    if (pdfHeader !== "%PDF") {
      throw new Error("Invalid PDF file: Missing PDF header");
    }

    // Use the direct import strategy
    try {
      const data = await parser.default(buffer);
      if (data && data.text && data.text.trim().length > 0) {
        if (DEBUG)
          console.log(
            "✅ Successfully extracted text using direct import of pdf-parse",
          );
        return data.text;
      }
    } catch (error) {
      if (DEBUG) console.warn("⚠️ Direct import of pdf-parse failed:", error);
      // Re-throw the error to be handled by the main catch block
      throw error;
    }

    // If the strategy fails or returns no text
    throw new Error(
      "Failed to extract text from PDF. The file might be password protected, corrupted, or contain only images.",
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


// text cleaning with better handli
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


//text chunking with better sentence boundary detection
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
