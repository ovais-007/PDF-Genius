import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { processPDFToChunks, generateChunkId } from "@/lib/pdf-processor";
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

    // Process PDF into chunks with enhanced error handling
    console.log("⚙️ Processing PDF...");
    let processedChunks;
    try {
      processedChunks = await processPDFToChunks(buffer);
      console.log("📊 Chunks created:", processedChunks.length);
    } catch (error) {
      console.error("❌ PDF processing failed:", error);
      return NextResponse.json(
        {
          error: "Failed to process PDF",
          details: error instanceof Error ? error.message : "Unknown error",
          possibleCauses: [
            "PDF is password protected",
            "PDF is corrupted or invalid",
            "PDF contains only images without text",
            "Unsupported PDF format",
          ],
        },
        { status: 400, headers },
      );
    }

    if (processedChunks.length === 0) {
      return NextResponse.json(
        {
          error: "No text content found in PDF",
          hint: "This PDF might contain only images or be password protected",
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

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed PDF: ${fileName}`,
        chunksCreated: pdfChunks.length,
        fileName,
        processingStats: {
          originalFileSize: file.size,
          processedChunks: processedChunks.length,
          averageChunkSize: Math.round(
            processedChunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
              processedChunks.length,
          ),
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

      // Handle specific error types
      if (error.message.includes("fetch")) {
        return NextResponse.json(
          {
            error: "Network error occurred",
            details: error.message,
            type: "network_error",
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
          },
          { status: 408, headers },
        );
      }

      return NextResponse.json(
        {
          error: `Failed to process PDF: ${error.message}`,
          type: "processing_error",
          errorName: error.name,
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
      },
      { status: 500, headers },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
