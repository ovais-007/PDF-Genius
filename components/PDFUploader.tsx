"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";

interface PDFUploaderProps {
  onUploadSuccess?: (fileName: string) => void;
  onUploadError?: (error: string) => void;
}

export default function PDFUploader({
  onUploadSuccess,
  onUploadError,
}: PDFUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type
      if (file.type !== "application/pdf") {
        const errorMsg = "Only PDF files are allowed";
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const errorMsg = "File too large. Maximum size is 10MB";
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      setIsUploading(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        console.log("🚀 Starting upload...");
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        console.log(
          "📡 Response received:",
          response.status,
          response.statusText,
        );

        // Check if response is HTML (error page)
        const contentType = response.headers.get("content-type");
        console.log("📄 Content-Type:", contentType);

        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text();
          console.error(
            "❌ Non-JSON response:",
            textResponse.substring(0, 200),
          );
          throw new Error(
            "Server returned an error page instead of JSON. Check server logs.",
          );
        }

        const result = await response.json();
        console.log("✅ JSON parsed successfully:", result);

        if (!response.ok) {
          throw new Error(result.error || "Upload failed");
        }

        const successMsg = `Successfully uploaded: ${result.fileName} (${result.chunksCreated} chunks created)`;
        setSuccess(successMsg);
        setUploadedFiles((prev) => [...prev, result.fileName]);
        onUploadSuccess?.(result.fileName);
      } catch (err) {
        console.error("❌ Upload error:", err);
        let errorMsg = "Upload failed";

        if (err instanceof Error) {
          errorMsg = err.message;
        } else if (typeof err === "string") {
          errorMsg = err;
        }

        setError(errorMsg);
        onUploadError?.(errorMsg);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadSuccess, onUploadError],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isUploading]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragActive
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          }
          ${isUploading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="space-y-4">
          {isUploading ? (
            <>
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600 dark:text-gray-400">
                Processing PDF...
              </p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">
                  Drop the PDF file here...
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    PDF files only (max 10MB)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Success Message - uselesss*/}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
          <button
            onClick={clearMessages}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
