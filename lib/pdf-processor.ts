// Add debug logging for PDF processing
const DEBUG = process.env.NODE_ENV === "development";

export interface ProcessedChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    if (DEBUG) console.log("📖 Starting PDF text extraction...");

    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty PDF buffer");
    }

    if (DEBUG) console.log("📊 Buffer size:", buffer.length);

    // Use dynamic import with proper error handling for pdf-parse
    let pdfParse;
    try {
      const pdfModule = await import("pdf-parse");
      pdfParse = pdfModule.default;

      if (typeof pdfParse !== "function") {
        throw new Error("pdf-parse module is not a function");
      }
    } catch (importError) {
      if (DEBUG) console.error("❌ Failed to import pdf-parse:", importError);
      throw new Error(
        "PDF parsing library is not available or corrupted. Please reinstall dependencies.",
      );
    }

    let data;
    try {
      data = await pdfParse(buffer, {
        // Add options to prevent test file access
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });
    } catch (parseError) {
      if (DEBUG) console.error("❌ PDF parsing failed:", parseError);

      // Handle specific pdf-parse errors
      if (parseError instanceof Error) {
        if (
          parseError.message.includes("ENOENT") &&
          parseError.message.includes("test")
        ) {
          throw new Error(
            "PDF parsing library has configuration issues. The PDF file itself is valid, but the library is trying to access test files.",
          );
        }
        if (parseError.message.includes("Invalid PDF")) {
          throw new Error("The uploaded file is not a valid PDF document");
        }
        if (parseError.message.includes("password")) {
          throw new Error(
            "This PDF is password protected and cannot be processed",
          );
        }
        throw new Error(`PDF parsing failed: ${parseError.message}`);
      }
      throw new Error("Unknown error occurred while parsing PDF");
    }

    if (DEBUG) {
      console.log("📄 PDF info:", {
        pages: data.numpages,
        textLength: data.text.length,
        info: data.info,
      });
    }

    if (!data.text || data.text.trim().length === 0) {
      throw new Error(
        "No text content found in PDF. The PDF might be image-based or password protected.",
      );
    }

    return data.text;
  } catch (error) {
    if (DEBUG) console.error("❌ PDF extraction error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid PDF")) {
        throw new Error("Invalid PDF file format");
      }
      if (error.message.includes("password")) {
        throw new Error("PDF is password protected");
      }
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }

    throw new Error("Failed to extract text from PDF: Unknown error");
  }
}

export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = "";
  let currentChunkIndex = 0;
  let currentPageNumber = 1; // Start with page 1

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

      // Start new chunk with overlap
      const words = currentChunk.split(" ");
      const overlapWords = words.slice(-Math.floor(overlap / 6)); // Approximate overlap
      currentChunk = overlapWords.join(" ") + " " + sentence;
      currentChunkIndex++;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? " " : "") + sentence;
    }

    // Simple page estimation based on text length (approximate)
    if (currentChunk.length > 2000 * currentPageNumber) {
      currentPageNumber++;
    }
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

export function cleanText(text: string): string {
  // Remove extra whitespace and normalize line breaks
  return text.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();
}

export async function processPDFToChunks(
  buffer: Buffer,
  chunkSize: number = 1000,
  overlap: number = 200,
): Promise<ProcessedChunk[]> {
  try {
    if (DEBUG) console.log("🔄 Processing PDF to chunks...");

    const text = await extractTextFromPDF(buffer);
    if (DEBUG) console.log("📝 Extracted text length:", text.length);

    const cleanedText = cleanText(text);
    if (DEBUG) console.log("🧹 Cleaned text length:", cleanedText.length);

    const chunks = splitTextIntoChunks(cleanedText, chunkSize, overlap);
    if (DEBUG) console.log("✂️ Created chunks:", chunks.length);

    if (chunks.length === 0) {
      throw new Error("No text chunks could be created from the PDF");
    }

    return chunks;
  } catch (error) {
    if (DEBUG) console.error("❌ Processing error:", error);

    if (error instanceof Error) {
      throw error; // Re-throw with original message
    }

    throw new Error("Failed to process PDF into chunks");
  }
}

export function generateChunkId(
  userId: string,
  fileName: string,
  chunkIndex: number,
): string {
  return `${userId}-${fileName}-${chunkIndex}-${Date.now()}`;
}
