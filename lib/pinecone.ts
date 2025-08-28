import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const indexName = process.env.PINECONE_INDEX_NAME!;

export interface PdfChunk {
  id: string;
  text: string;
  metadata: {
    userId: string;
    fileName: string;
    pageNumber: number;
    chunkIndex: number;
    uploadedAt: string;
  };
}

export interface QueryResult {
  id: string;
  text: string;
  score: number;
  metadata: {
    userId: string;
    fileName: string;
    pageNumber: number;
    chunkIndex: number;
    uploadedAt: string;
  };
}

export async function getIndex() {
  try {
    return pinecone.Index(indexName);
  } catch (error) {
    console.error("Error getting Pinecone index:", error);
    throw new Error("Failed to get Pinecone index");
  }
}

export async function upsertVectors(
  chunks: PdfChunk[],
  embeddings: number[][],
): Promise<void> {
  try {
    const index = await getIndex();

    const vectors = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        text: chunk.text,
        userId: chunk.metadata.userId,
        fileName: chunk.metadata.fileName,
        pageNumber: chunk.metadata.pageNumber,
        chunkIndex: chunk.metadata.chunkIndex,
        uploadedAt: chunk.metadata.uploadedAt,
      },
    }));

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw new Error("Failed to upsert vectors to Pinecone");
  }
}

export async function queryVectors(
  queryEmbedding: number[],
  userId: string,
  topK: number = 5,
): Promise<QueryResult[]> {
  try {
    const index = await getIndex();

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        userId: { $eq: userId },
      },
    });

    return (
      queryResponse.matches?.map((match) => ({
        id: match.id,
        text: (match.metadata?.text as string) || "",
        score: match.score || 0,
        metadata: {
          userId: (match.metadata?.userId as string) || "",
          fileName: (match.metadata?.fileName as string) || "",
          pageNumber: (match.metadata?.pageNumber as number) || 0,
          chunkIndex: (match.metadata?.chunkIndex as number) || 0,
          uploadedAt: (match.metadata?.uploadedAt as string) || "",
        },
      })) || []
    );
  } catch (error) {
    console.error("Error querying vectors:", error);
    throw new Error("Failed to query vectors from Pinecone");
  }
}

export async function deleteVectors(
  userId: string,
  fileName?: string,
): Promise<void> {
  try {
    const index = await getIndex();

    const filter: Record<string, { $eq: string }> = { userId: { $eq: userId } };
    if (fileName) {
      filter.fileName = { $eq: fileName };
    }

    await index.deleteMany(filter);
  } catch (error) {
    console.error("Error deleting vectors:", error);
    throw new Error("Failed to delete vectors from Pinecone");
  }
}

export async function getAllUserFiles(userId: string): Promise<{
  files: string[];
  totalChunks: number;
}> {
  try {
    const index = await getIndex();

    // Query to get all vectors for a user
    const queryResponse = await index.query({
      vector: new Array(768).fill(0), // Dummy vector with correct dimension for Gemini
      topK: 10000, // Large number to get all files
      includeMetadata: true,
      filter: {
        userId: { $eq: userId },
      },
    });

    const fileNames = new Set<string>();
    let totalChunks = 0;

    queryResponse.matches?.forEach((match) => {
      if (match.metadata?.fileName) {
        fileNames.add(match.metadata.fileName as string);
        totalChunks++;
      }
    });

    return {
      files: Array.from(fileNames),
      totalChunks,
    };
  } catch (error) {
    console.error("Error getting user files:", error);
    throw new Error("Failed to get user files from Pinecone");
  }
}
