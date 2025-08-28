"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Header from "@/components/Header";
import PDFUploader from "@/components/PDFUploader";
import ChatInterface from "@/components/ChatInterface";
import {
  AlertCircle,
  FileText,
  MessageSquare,
  Upload,
  Sparkles,
  Brain,
  Search,
  Zap,
  Trash2,
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"manage" | "chat">("manage");
  const [fileStats, setFileStats] = useState({ count: 0, totalChunks: 0 });

  // Fetch user files on mount and session change
  useEffect(() => {
    if (session?.user) {
      fetchUserFiles();
    }
  }, [session]);

  const fetchUserFiles = async () => {
    try {
      const response = await fetch("/api/files");
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
        setFileStats({
          count: data.count || 0,
          totalChunks: data.totalChunks || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    }
  };

  const handleUploadSuccess = (fileName: string) => {
    setUploadedFiles((prev) => [...prev, fileName]);
    setFileStats((prev) => ({
      count: prev.count + 1,
      totalChunks: prev.totalChunks + 1, // This will be updated on next fetch
    }));
    setActiveTab("chat");
    setError(null);
    // Refresh file stats
    setTimeout(fetchUserFiles, 1000);
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const handleChatError = (error: string) => {
    setError(error);
  };

  const clearError = () => {
    setError(null);
  };

  const handleDeleteFile = async (fileName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/files?fileName=${encodeURIComponent(fileName)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        // Update local state
        setUploadedFiles((prev) => prev.filter((name) => name !== fileName));
        setFileStats((prev) => ({
          count: Math.max(0, prev.count - 1),
          totalChunks: Math.max(0, prev.totalChunks - 1), // Approximate, will be corrected on next fetch
        }));

        // Refresh file stats from server
        setTimeout(fetchUserFiles, 500);
      } else {
        const errorData = await response.json();
        setError(`Failed to delete file: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setError("Failed to delete file. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />

        {/* Hero Section */}
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Main Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-blue-100 text-blue-700 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered PDF Intelligence
              </div>

              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                Chat with Your
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Documents
                </span>
              </h1>

              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Upload PDF documents and ask questions to get instant,
                intelligent answers powered by advanced AI technology.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Smart Upload
                </h3>
                <p className="text-gray-600 text-sm">
                  Drag & drop PDF files up to 10MB with instant processing
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  AI Analysis
                </h3>
                <p className="text-gray-600 text-sm">
                  Advanced AI understands context and provides accurate answers
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Source Citations
                </h3>
                <p className="text-gray-600 text-sm">
                  Get answers with precise references to original content
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <button
                onClick={() => signIn("google")}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                  <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Welcome back, {session.user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload PDF documents and start asking questions to get AI-powered
            answers with source citations.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                activeTab === "manage"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Manage</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md transform scale-105"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              disabled={fileStats.count === 0}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Ask a Question</span>
              {fileStats.count > 0 && (
                <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                  {fileStats.count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          {activeTab === "manage" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Upload New Document
                    </h2>
                    <p className="text-gray-600">
                      Add new PDFs to your knowledge base
                    </p>
                  </div>
                  <PDFUploader
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />
                </div>

                {fileStats.count > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-1">
                          Ready to Chat! ✨
                        </h3>
                        <p className="text-green-700">
                          {fileStats.count} document
                          {fileStats.count > 1 ? "s" : ""} ready for questions
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("chat")}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>Start Chat</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* File Management Section */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Your Documents
                  </h2>
                  <p className="text-gray-600">Manage your uploaded PDFs</p>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {uploadedFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No documents uploaded yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Upload your first PDF to get started
                      </p>
                    </div>
                  ) : (
                    uploadedFiles.map((fileName, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {fileName}
                            </p>
                            <p className="text-sm text-gray-500">
                              PDF Document
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(fileName)}
                          className="opacity-0 group-hover:opacity-100 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 flex items-center space-x-1"
                          title="Delete document"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span className="text-xs">Delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{fileStats.count} documents</span>
                      <span>{fileStats.totalChunks} chunks total</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Chat with Your Documents
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Ask questions about your {fileStats.count} uploaded
                        document{fileStats.count > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                <ChatInterface onError={handleChatError} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
