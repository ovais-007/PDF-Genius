import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAllUserFiles, deleteVectors } from "@/lib/pinecone";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all files for the user
    const fileData = await getAllUserFiles(userId);

    return NextResponse.json({
      files: fileData.files,
      count: fileData.files.length,
      totalChunks: fileData.totalChunks,
    });
  } catch (error) {
    console.error("Error getting user files:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to get files: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while getting files" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get fileName from query parameters
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 },
      );
    }

    // Delete vectors for the specific file
    await deleteVectors(userId, fileName);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted file: ${fileName}`,
    });
  } catch (error) {
    console.error("Error deleting file:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to delete file: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while deleting the file" },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
