import { NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/gemini';

export async function GET() {
  try {
    // Test embedding model (quick test)
    await generateEmbedding('test');
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        embedding: 'available'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}