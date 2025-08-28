# PDF Genius - AI-Powered PDF Assistant

A Next.js application that allows users to upload PDF documents and ask questions about their content using AI. Built with Google Gemini for embeddings and responses, Pinecone for vector storage, and NextAuth for authentication.

## Features

- 🔐 **Google Authentication** - Secure sign-in with Google OAuth
- 📄 **PDF Upload & Management** - Upload, view, and delete PDF documents
- 🤖 **AI-Powered Q&A** - Ask questions about your PDF content
- 🔍 **Source Citations** - Get answers with relevant source references
- 💾 **Vector Storage** - Efficient document search using Pinecone
- 📱 **Modern Design** - Clean, responsive interface

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
# Google Gemini API
GOOGLE_API_KEY=your_gemini_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=pdf-assistant

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Services

**Google Gemini API:**
- Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

**Pinecone:**
- Create account at [Pinecone](https://www.pinecone.io/)
- Create index with dimensions: 768, metric: cosine

**Google OAuth:**
- Setup OAuth in [Google Cloud Console](https://console.cloud.google.com/)
- Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Run Application
```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Update URLs for production domain
5. Update Google OAuth redirect URIs

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Google Provider
- **AI**: Google Gemini API for embeddings and text generation
- **Database**: Pinecone for vector storage and similarity search
- **PDF Processing**: pdf-parse for text extraction
