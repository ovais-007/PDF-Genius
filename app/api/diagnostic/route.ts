import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  validateEnvironmentVariables,
  validateServices,
} from "@/lib/env-validation";
import { validatePDFBuffer } from "@/lib/pdf-processor-improved";

export async function GET(req: NextRequest) {
  console.log("🔍 Diagnostic API called");

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      diagnostics: {} as any,
    };

    // 1. Environment Variables Check
    console.log("🔧 Checking environment variables...");
    const envValidation = validateEnvironmentVariables();
    diagnostics.diagnostics.environment = {
      isValid: envValidation.isValid,
      missing: envValidation.missing,
      warnings: envValidation.warnings,
      recommendations: envValidation.recommendations,
    };

    // 2. Authentication Check
    console.log("🔐 Checking authentication...");
    try {
      const session = await getServerSession(authOptions);
      diagnostics.diagnostics.authentication = {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        userEmail: session?.user?.email || "Not available",
      };
    } catch (authError) {
      diagnostics.diagnostics.authentication = {
        error:
          authError instanceof Error ? authError.message : "Unknown auth error",
        hasSession: false,
        hasUser: false,
        hasUserId: false,
      };
    }

    // 3. Services Validation
    console.log("🌐 Checking external services...");
    try {
      const serviceValidation = await validateServices();
      diagnostics.diagnostics.services = {
        google: {
          isValid: serviceValidation.google,
          hasApiKey: !!process.env.GOOGLE_API_KEY,
          keyFormat:
            process.env.GOOGLE_API_KEY?.substring(0, 10) + "..." || "Not set",
        },
        pinecone: {
          isValid: serviceValidation.pinecone,
          hasApiKey: !!process.env.PINECONE_API_KEY,
          keyFormat:
            process.env.PINECONE_API_KEY?.substring(0, 10) + "..." || "Not set",
          hasIndexName: !!process.env.PINECONE_INDEX_NAME,
          indexName: process.env.PINECONE_INDEX_NAME || "Not set",
        },
        errors: serviceValidation.errors,
      };
    } catch (serviceError) {
      diagnostics.diagnostics.services = {
        error:
          serviceError instanceof Error
            ? serviceError.message
            : "Unknown service error",
      };
    }

    // 4. PDF Processing Libraries Check
    console.log("📚 Checking PDF processing libraries...");
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);

      // Check if pdf-parse is available
      try {
        const pdfParse = require("pdf-parse");
        diagnostics.diagnostics.pdfLibraries = {
          pdfParse: {
            available: true,
            version: "Available (version check requires actual PDF)",
          },
        };
      } catch (pdfParseError) {
        diagnostics.diagnostics.pdfLibraries = {
          pdfParse: {
            available: false,
            error:
              pdfParseError instanceof Error
                ? pdfParseError.message
                : "Unknown error",
          },
        };
      }
    } catch (importError) {
      diagnostics.diagnostics.pdfLibraries = {
        error:
          importError instanceof Error
            ? importError.message
            : "Failed to check PDF libraries",
      };
    }

    // 5. File System and Permissions Check
    console.log("📁 Checking file system permissions...");
    try {
      const fs = require("fs");
      const path = require("path");
      const os = require("os");

      const tempDir = os.tmpdir();
      const testFile = path.join(tempDir, `pdf-genius-test-${Date.now()}.txt`);

      // Test write permission
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      diagnostics.diagnostics.fileSystem = {
        canWriteTemp: true,
        tempDir,
        workingDirectory: process.cwd(),
      };
    } catch (fsError) {
      diagnostics.diagnostics.fileSystem = {
        canWriteTemp: false,
        error:
          fsError instanceof Error
            ? fsError.message
            : "Unknown file system error",
        workingDirectory: process.cwd(),
      };
    }

    // 6. Memory and System Info
    console.log("💾 Checking system resources...");
    try {
      const memUsage = process.memoryUsage();
      diagnostics.diagnostics.system = {
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
        platform: process.platform,
        nodeVersion: process.version,
        uptime: `${Math.round(process.uptime())}s`,
      };
    } catch (systemError) {
      diagnostics.diagnostics.system = {
        error:
          systemError instanceof Error
            ? systemError.message
            : "Unknown system error",
      };
    }

    // 7. Common Issues Check
    console.log("⚠️ Checking for common issues...");
    const commonIssues = [];

    if (!envValidation.isValid) {
      commonIssues.push({
        issue: "Missing environment variables",
        severity: "high",
        solution: "Add missing environment variables to .env.local file",
      });
    }

    if (!diagnostics.diagnostics.authentication.hasUserId) {
      commonIssues.push({
        issue: "Authentication not working",
        severity: "high",
        solution:
          "Make sure NextAuth is properly configured and user is signed in",
      });
    }

    if (diagnostics.diagnostics.pdfLibraries?.pdfParse?.available === false) {
      commonIssues.push({
        issue: "PDF parsing library not available",
        severity: "high",
        solution:
          "Run 'npm install pdf-parse' to reinstall the PDF parsing library",
      });
    }

    if (diagnostics.diagnostics.services?.errors?.length > 0) {
      commonIssues.push({
        issue: "External service configuration issues",
        severity: "medium",
        solution: "Check your Google and Pinecone API keys",
      });
    }

    diagnostics.diagnostics.commonIssues = commonIssues;

    // 8. Overall Health Score
    let healthScore = 100;
    if (!envValidation.isValid) healthScore -= 30;
    if (!diagnostics.diagnostics.authentication.hasUserId) healthScore -= 25;
    if (diagnostics.diagnostics.pdfLibraries?.pdfParse?.available === false)
      healthScore -= 25;
    if (diagnostics.diagnostics.services?.errors?.length > 0) healthScore -= 10;
    if (!diagnostics.diagnostics.fileSystem?.canWriteTemp) healthScore -= 10;

    diagnostics.healthScore = Math.max(0, healthScore);
    diagnostics.status =
      healthScore >= 80
        ? "healthy"
        : healthScore >= 50
          ? "warning"
          : "critical";

    console.log(
      `✅ Diagnostic complete. Health score: ${diagnostics.healthScore}%`,
    );

    return NextResponse.json(diagnostics, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("❌ Diagnostic error:", error);

    return NextResponse.json(
      {
        error: "Diagnostic check failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      },
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("🧪 PDF Test Upload for Diagnostic");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          error: "No test file provided",
          hint: "Upload a small PDF file to test the processing pipeline",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Test PDF validation
    const pdfValidation = validatePDFBuffer(buffer);

    const testResult = {
      timestamp: new Date().toISOString(),
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeFormatted: `${Math.round((file.size / 1024) * 100) / 100}KB`,
      },
      validation: pdfValidation,
      tests: {} as any,
    };

    // Test 1: PDF parsing
    try {
      const { extractTextFromPDF } = await import(
        "@/lib/pdf-processor-improved"
      );
      const extractedText = await extractTextFromPDF(buffer);

      testResult.tests.textExtraction = {
        success: true,
        textLength: extractedText.length,
        preview:
          extractedText.substring(0, 200) +
          (extractedText.length > 200 ? "..." : ""),
      };
    } catch (extractError) {
      testResult.tests.textExtraction = {
        success: false,
        error:
          extractError instanceof Error
            ? extractError.message
            : "Unknown extraction error",
      };
    }

    // Test 2: Chunking
    try {
      const { processPDFToChunks } = await import(
        "@/lib/pdf-processor-improved"
      );
      const chunks = await processPDFToChunks(buffer, 500, 100);

      testResult.tests.chunking = {
        success: true,
        chunksCreated: chunks.length,
        avgChunkSize:
          chunks.length > 0
            ? Math.round(
                chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) /
                  chunks.length,
              )
            : 0,
      };
    } catch (chunkError) {
      testResult.tests.chunking = {
        success: false,
        error:
          chunkError instanceof Error
            ? chunkError.message
            : "Unknown chunking error",
      };
    }

    return NextResponse.json(testResult, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("❌ PDF test error:", error);

    return NextResponse.json(
      {
        error: "PDF test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
