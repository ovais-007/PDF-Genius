// Configuration constants for PDF Genius application
export const APP_CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_FILE_TYPES: ["application/pdf"],
  ALLOWED_FILE_EXTENSIONS: [".pdf"],

  // PDF processing
  DEFAULT_CHUNK_SIZE: 1000,
  DEFAULT_OVERLAP: 200,
  MAX_CHUNKS_PER_FILE: 500,

  // Vector search
  DEFAULT_TOP_K: 5,
  MIN_SIMILARITY_SCORE: 0.7,

  // Gemini API
  GEMINI_EMBEDDING_MODEL: "embedding-001",
  GEMINI_TEXT_MODEL: "gemini-1.5-flash",
  GEMINI_EMBEDDING_DIMENSION: 768,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_UPLOADS_PER_DAY: 50,

  // UI
  CHAT_HISTORY_LIMIT: 100,
  SOURCE_PREVIEW_LENGTH: 200,

  // Cache
  EMBEDDING_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const;

// Environment validation
export function validateEnvironment() {
  const requiredEnvVars = [
    "GOOGLE_API_KEY",
    "PINECONE_API_KEY",
    "PINECONE_INDEX_NAME",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ];

  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }
}

// API endpoints
export const API_ROUTES = {
  UPLOAD: "/api/upload",
  QUERY: "/api/query",
  FILES: "/api/files",
  AUTH: "/api/auth",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "You must be signed in to perform this action",
  FILE_TOO_LARGE: `File size must be less than ${APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
  INVALID_FILE_TYPE: "Only PDF files are allowed",
  NO_FILE_PROVIDED: "Please select a file to upload",
  PROCESSING_FAILED: "Failed to process the PDF file",
  NO_CONTENT_FOUND: "No readable content found in the PDF",
  QUERY_FAILED: "Failed to process your question",
  NO_DOCUMENTS_FOUND: "No documents found. Please upload a PDF first",
  EMPTY_QUESTION: "Please enter a question",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: "PDF uploaded and processed successfully",
  FILE_DELETED: "File deleted successfully",
  PROCESSING_COMPLETE: "Document processing completed",
} as const;
