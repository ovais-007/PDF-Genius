import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateEmbedding, generateStreamingResponse } from '@/lib/gemini';
import { queryVectors } from '@/lib/pinecone';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const { question, streaming = false } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (question.trim().length === 0) {
      return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
    }

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Query similar vectors from Pinecone
    const relevantChunks = await queryVectors(questionEmbedding, userId, 5);

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        error: 'No relevant content found. Please upload a PDF document first.',
      }, { status: 404 });
    }

    // Extract context from relevant chunks
    const context = relevantChunks.map(chunk => chunk.text);

    // Generate response
    if (streaming) {
      // Return streaming response
      const stream = await generateStreamingResponse(question, context);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Return regular response with sources
      const { generateResponse } = await import('@/lib/gemini');
      const answer = await generateResponse(question, context);

      return NextResponse.json({
        answer,
        sources: relevantChunks.map((chunk, index) => ({
          id: index + 1,
          content: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
          fileName: chunk.metadata.fileName,
          pageNumber: chunk.metadata.pageNumber,
          score: Math.round(chunk.score * 100) / 100,
        })),
        question,
      });
    }

  } catch (error) {
    console.error('Error processing query:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to process query: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your question' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
