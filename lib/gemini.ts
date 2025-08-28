import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Initialize the embedding model
const embeddingModel = genAI.getGenerativeModel({
  model: "embedding-001"
});

// Initialize the text generation model
const textModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}

export async function generateResponse(
  question: string,
  context: string[]
): Promise<string> {
  try {
    const contextText = context.join("\n\n");

    const prompt = `
Based on the following context from PDF documents, answer the user's question.
If the answer cannot be found in the context, say so clearly.

Context:
${contextText}

Question: ${question}

Answer:`;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error("Failed to generate response");
  }
}

export async function generateStreamingResponse(
  question: string,
  context: string[]
): Promise<ReadableStream<Uint8Array>> {
  try {
    const contextText = context.join("\n\n");

    const prompt = `
Based on the following context from PDF documents, answer the user's question.
If the answer cannot be found in the context, say so clearly.

Context:
${contextText}

Question: ${question}

Answer:`;

    const result = await textModel.generateContentStream(prompt);

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
  } catch (error) {
    console.error("Error generating streaming response:", error);
    throw new Error("Failed to generate streaming response");
  }
}
