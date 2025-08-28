import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  processPDFToChunks,
  generateChunkId,
  validatePDFBuffer,
} from "@/lib/pdf-processor-improved";
import { generateEmbeddings } from "@/lib/gemini";
import { upsertVectors, PdfChunk } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
  console.log("📤 Upload API called");

  try {
    // Add CORS headers for better error handling
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    };
    // Check environment variables first
    if (!process.env.GOOGLE_API_KEY) {
      console.error("❌ Missing GOOGLE_API_KEY");
      return NextResponse.json(
        { error: "Server configuration error: Missing Google API key" },
        { status: 500 },
      );
    }

    if (!process.env.PINECONE_API_KEY) {
      console.error("❌ Missing PINECONE_API_KEY");
      return NextResponse.json(
        { error: "Server configuration error: Missing Pinecone API key" },
        { status: 500 },
      );
    }

    // Check authentication
    console.log("🔐 Checking authentication...");
    const session = await getServerSession(authOptions);
    console.log("👤 Session:", session ? "Found" : "Not found");

    if (!session?.user?.id) {
      console.error("❌ No valid session found");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    console.log("✅ User authenticated:", userId);

    // Parse form data with error handling
    console.log("📂 Parsing form data...");
    let formData;
    let file;

    try {
      formData = await req.formData();
      file = formData.get("file") as File;
      console.log("✅ Form data parsed successfully");
    } catch (error) {
      console.error("❌ Failed to parse form data:", error);
      return NextResponse.json(
        {
          error:
            "Failed to parse form data. Please check file format and size.",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 400, headers },
      );
    }

    if (!file) {
      console.error("❌ No file in form data");
      const availableFields = Array.from(formData.keys());
      console.log("Available form fields:", availableFields);
      return NextResponse.json(
        {
          error: "No file provided",
          availableFields,
          hint: "Make sure to include a 'file' field in your form data",
        },
        { status: 400, headers },
      );
    }

    console.log(
      "📄 File received:",
      file.name,
      "Size:",
      file.size,
      "Type:",
      file.type,
    );

    // Validate file type
    if (file.type !== "application/pdf") {
      console.error("❌ Invalid file type:", file.type);
      return NextResponse.json(
        {
          error: "Only PDF files are allowed",
          receivedType: file.type,
          expectedType: "application/pdf",
        },
        { status: 400, headers },
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error("❌ File too large:", file.size, "bytes");
      return NextResponse.json(
        {
          error: "File too large. Maximum size is 10MB",
          fileSize: file.size,
          maxSize,
          fileSizeFormatted: `${Math.round((file.size / 1024 / 1024) * 100) / 100}MB`,
        },
        { status: 400, headers },
      );
    }

    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitize filename
    console.log("📝 Sanitized filename:", fileName);

    // Convert to buffer with error handling
    let buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      console.log("💾 Buffer size:", buffer.length);
    } catch (error) {
      console.error("❌ Failed to create buffer:", error);
      return NextResponse.json(
        {
          error: "Failed to process file buffer",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers },
      );
    }

    // Validate PDF buffer first
    console.log("🔍 Validating PDF buffer...");
    const pdfValidation = validatePDFBuffer(buffer);
    if (!pdfValidation.isValid) {
      console.error("❌ PDF validation failed:", pdfValidation.error);
      return NextResponse.json(
        {
          error: "Invalid PDF file",
          details: pdfValidation.error,
          hint: "Please ensure you're uploading a valid PDF file",
        },
        { status: 400, headers },
      );
    }

    // Process PDF into chunks with enhanced error handling
    console.log("⚙️ Processing PDF with improved processor...");
    let processedChunks;
    try {
      processedChunks = await processPDFToChunks(buffer);
      console.log("📊 Chunks created:", processedChunks.length);

      if (processedChunks.length === 0) {
        throw new Error("No text content could be extracted from the PDF");
      }
    } catch (error) {
      console.error("❌ PDF processing failed:", error);

      // Provide more specific error messages based on error type
      let errorMessage = "Failed to process PDF";
      let possibleCauses = [
        "PDF is password protected",
        "PDF is corrupted or invalid",
        "PDF contains only images without text",
        "Unsupported PDF format",
      ];

      if (error instanceof Error) {
        if (
          error.message.includes("ENOENT") &&
          error.message.includes("test")
        ) {
          errorMessage = "PDF processing library configuration issue";
          possibleCauses = [
            "The pdf-parse library has internal test file dependencies missing",
            "Try reinstalling the PDF processing dependencies",
            "This is a known issue with the pdf-parse library",
          ];
        } else if (error.message.includes("password")) {
          errorMessage = "Password protected PDF";
          possibleCauses = ["This PDF requires a password to access"];
        } else if (error.message.includes("No text content")) {
          errorMessage = "No extractable text found";
          possibleCauses = [
            "PDF contains only images or scanned content",
            "PDF text may be embedded as images",
            "Try using a PDF with selectable text",
          ];
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error instanceof Error ? error.message : "Unknown error",
          possibleCauses,
          troubleshooting: "Visit /diagnostic to run system diagnostics",
        },
        { status: 400, headers },
      );
    }

    // Create PDF chunks with metadata
    const pdfChunks: PdfChunk[] = processedChunks.map((chunk, index) => ({
      id: generateChunkId(userId, fileName, index),
      text: chunk.text,
      metadata: {
        userId,
        fileName,
        pageNumber: chunk.pageNumber,
        chunkIndex: index,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Generate embeddings for all chunks with error handling
    console.log("🧠 Generating embeddings...");
    let embeddings;
    try {
      const texts = pdfChunks.map((chunk) => chunk.text);
      embeddings = await generateEmbeddings(texts);
      console.log("✅ Embeddings generated:", embeddings.length);
    } catch (error) {
      console.error("❌ Embedding generation failed:", error);
      return NextResponse.json(
        {
          error: "Failed to generate embeddings",
          details: error instanceof Error ? error.message : "Unknown error",
          possibleCauses: [
            "Google Gemini API quota exceeded",
            "Invalid API key",
            "Network connection issue",
            "Text chunks too large",
          ],
        },
        { status: 500, headers },
      );
    }

    // Store vectors in Pinecone with error handling
    console.log("💾 Storing in Pinecone...");
    try {
      await upsertVectors(pdfChunks, embeddings);
      console.log("✅ Vectors stored successfully");
    } catch (error) {
      console.error("❌ Pinecone storage failed:", error);
      return NextResponse.json(
        {
          error: "Failed to store vectors in database",
          details: error instanceof Error ? error.message : "Unknown error",
          possibleCauses: [
            "Pinecone API quota exceeded",
            "Invalid API key",
            "Index not found or misconfigured",
            "Network connection issue",
          ],
        },
        { status: 500, headers },
      );
    }

    const stats = {
      originalFileSize: file.size,
      processedChunks: processedChunks.length,
      averageChunkSize: Math.round(
        processedChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
          processedChunks.length,
      ),
      totalTextLength: processedChunks.reduce(
        (sum, chunk) => sum + chunk.text.length,
        0,
      ),
    };

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed PDF: ${fileName}`,
        chunksCreated: pdfChunks.length,
        fileName,
        processingStats: stats,
        diagnostic: {
          hint: "If you experienced any issues, visit /diagnostic for troubleshooting",
          processingMethod: "improved-pdf-processor",
        },
      },
      { headers },
    );
  } catch (error) {
    console.error("❌ Unexpected error processing PDF upload:", error);

    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    };

    if (error instanceof Error) {
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        constructor: error.constructor.name,
      });

      // Enhanced error handling with more specific responses
      if (error.message.includes("fetch")) {
        return NextResponse.json(
          {
            error: "Network error occurred",
            details: error.message,
            type: "network_error",
            troubleshooting: "Check your internet connection and API endpoints",
          },
          { status: 503, headers },
        );
      }

      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Request timeout - file processing took too long",
            details: error.message,
            type: "timeout_error",
            troubleshooting:
              "Try uploading a smaller PDF or check server performance",
          },
          { status: 408, headers },
        );
      }

      if (error.message.includes("quota") || error.message.includes("rate")) {
        return NextResponse.json(
          {
            error: "API quota exceeded",
            details: error.message,
            type: "quota_error",
            troubleshooting: "Check your Google/Pinecone API usage limits",
          },
          { status: 429, headers },
        );
      }

      return NextResponse.json(
        {
          error: `Failed to process PDF: ${error.message}`,
          type: "processing_error",
          errorName: error.name,
          troubleshooting:
            "Visit /diagnostic to run system diagnostics for detailed error analysis",
        },
        { status: 500, headers },
      );
    }

    console.error("🔍 Unknown error type:", typeof error, error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing the PDF",
        type: "unknown_error",
        details: String(error),
        troubleshooting: "Visit /diagnostic to identify the root cause",
      },
      { status: 500, headers },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
