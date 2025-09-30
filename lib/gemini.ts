import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Initialize the embedding model
const embeddingModel = genAI.getGenerativeModel({
  model: "embedding-001"
});

// Initialize text generation models (with fallbacks)
const modelNames = ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"];

async function generateWithFallback<T>(
  operation: (model: any) => Promise<T>
): Promise<T> {
  let lastError: Error | null = null;
  
  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      console.log(`Trying model: ${modelName}`);
      return await retryWithBackoff(() => operation(model));
    } catch (error) {
      console.log(`Model ${modelName} failed:`, error instanceof Error ? error.message : error);
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }
  
  throw lastError || new Error("All models failed");
}

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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = error?.status === 503 || error?.status === 429 || error?.message?.includes('overloaded');
      
      if (isLastAttempt || !isRetryableError) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
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

    const result = await generateWithFallback(async (model) => {
      return await model.generateContent(prompt);
    });
    
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('overloaded') || error.message.includes('503')) {
        throw new Error("The AI service is currently overloaded. Please try again in a few moments.");
      } else if (error.message.includes('429')) {
        throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
      }
    }
    
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

    const result = await generateWithFallback(async (model) => {
      return await model.generateContentStream(prompt);
    });

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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('overloaded') || error.message.includes('503')) {
        throw new Error("The AI service is currently overloaded. Please try again in a few moments.");
      } else if (error.message.includes('429')) {
        throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
      }
    }
    
    throw new Error("Failed to generate streaming response");
  }
}
