"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Upload, FileText } from "lucide-react";

interface DiagnosticResult {
  timestamp: string;
  environment: string;
  healthScore: number;
  status: string;
  diagnostics: {
    environment: {
      isValid: boolean;
      missing: string[];
      warnings: string[];
      recommendations: string[];
    };
    authentication: {
      hasSession: boolean;
      hasUser: boolean;
      hasUserId: boolean;
      userEmail: string;
      error?: string;
    };
    services: {
      google: {
        isValid: boolean;
        hasApiKey: boolean;
        keyFormat: string;
      };
      pinecone: {
        isValid: boolean;
        hasApiKey: boolean;
        keyFormat: string;
        hasIndexName: boolean;
        indexName: string;
      };
      errors: string[];
    };
    pdfLibraries: {
      pdfParse: {
        available: boolean;
        version?: string;
        error?: string;
      };
    };
    fileSystem: {
      canWriteTemp: boolean;
      tempDir?: string;
      workingDirectory: string;
      error?: string;
    };
    system: {
      memory: {
        rss: string;
        heapTotal: string;
        heapUsed: string;
        external: string;
      };
      platform: string;
      nodeVersion: string;
      uptime: string;
    };
    commonIssues: Array<{
      issue: string;
      severity: string;
      solution: string;
    }>;
  };
}

interface TestResult {
  timestamp: string;
  file: {
    name: string;
    size: number;
    type: string;
    sizeFormatted: string;
  };
  validation: {
    isValid: boolean;
    error?: string;
  };
  tests: {
    textExtraction: {
      success: boolean;
      textLength?: number;
      preview?: string;
      error?: string;
    };
    chunking: {
      success: boolean;
      chunksCreated?: number;
      avgChunkSize?: number;
      error?: string;
    };
  };
}

export default function DiagnosticPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/diagnostic");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setDiagnostic(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run diagnostic");
    } finally {
      setLoading(false);
    }
  };

  const testPDFUpload = async (file: File) => {
    setTestLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/diagnostic", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test PDF upload");
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            PDF Genius Diagnostic
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Use this tool to diagnose issues with PDF uploads and system configuration.
            This will help identify why PDFs might not be uploading successfully.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Run System Diagnostic
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            {testLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Test PDF Upload
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) testPDFUpload(file);
              }}
              className="hidden"
              disabled={testLoading}
            />
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* System Health Overview */}
        {diagnostic && (
          <div className="mb-8">
            <div className={`p-6 rounded-lg border ${getStatusColor(diagnostic.status)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostic.status)}
                  <div>
                    <h2 className="text-xl font-semibold">System Health</h2>
                    <p className="text-sm opacity-75">
                      Last checked: {new Date(diagnostic.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{diagnostic.healthScore}%</div>
                  <div className="text-sm opacity-75 capitalize">{diagnostic.status}</div>
                </div>
              </div>

              {/* Common Issues */}
              {diagnostic.diagnostics.commonIssues.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Issues Found:</h3>
                  <div className="space-y-2">
                    {diagnostic.diagnostics.commonIssues.map((issue, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium">{issue.issue}</div>
                        <div className="opacity-75">Solution: {issue.solution}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Diagnostics */}
        {diagnostic && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Environment Variables */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {diagnostic.diagnostics.environment.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Environment Variables
              </h3>

              {diagnostic.diagnostics.environment.missing.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-600 mb-2">Missing Variables:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {diagnostic.diagnostics.environment.missing.map((variable, index) => (
                      <li key={index} className="font-mono">{variable}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostic.diagnostics.environment.warnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-yellow-600 mb-2">Warnings:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {diagnostic.diagnostics.environment.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diagnostic.diagnostics.environment.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 mb-2">Recommendations:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {diagnostic.diagnostics.environment.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Authentication */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {diagnostic.diagnostics.authentication.hasUserId ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Authentication
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Has Session:</span>
                  <span className={diagnostic.diagnostics.authentication.hasSession ? "text-green-600" : "text-red-600"}>
                    {diagnostic.diagnostics.authentication.hasSession ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Has User ID:</span>
                  <span className={diagnostic.diagnostics.authentication.hasUserId ? "text-green-600" : "text-red-600"}>
                    {diagnostic.diagnostics.authentication.hasUserId ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>User Email:</span>
                  <span className="font-mono">{diagnostic.diagnostics.authentication.userEmail}</span>
                </div>

                {diagnostic.diagnostics.authentication.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
                    {diagnostic.diagnostics.authentication.error}
                  </div>
                )}
              </div>
            </div>

            {/* PDF Libraries */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {diagnostic.diagnostics.pdfLibraries.pdfParse.available ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                PDF Libraries
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>pdf-parse Available:</span>
                  <span className={diagnostic.diagnostics.pdfLibraries.pdfParse.available ? "text-green-600" : "text-red-600"}>
                    {diagnostic.diagnostics.pdfLibraries.pdfParse.available ? "Yes" : "No"}
                  </span>
                </div>

                {diagnostic.diagnostics.pdfLibraries.pdfParse.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
                    {diagnostic.diagnostics.pdfLibraries.pdfParse.error}
                  </div>
                )}
              </div>
            </div>

            {/* External Services */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {diagnostic.diagnostics.services.google.isValid && diagnostic.diagnostics.services.pinecone.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                External Services
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Google API:</span>
                    <span className={diagnostic.diagnostics.services.google.isValid ? "text-green-600" : "text-red-600"}>
                      {diagnostic.diagnostics.services.google.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  <div className="text-gray-500 font-mono text-xs">
                    {diagnostic.diagnostics.services.google.keyFormat}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Pinecone API:</span>
                    <span className={diagnostic.diagnostics.services.pinecone.isValid ? "text-green-600" : "text-red-600"}>
                      {diagnostic.diagnostics.services.pinecone.isValid ? "Valid" : "Invalid"}
                    </span>
                  </div>
                  <div className="text-gray-500 font-mono text-xs">
                    {diagnostic.diagnostics.services.pinecone.keyFormat}
                  </div>
                </div>

                {diagnostic.diagnostics.services.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-700 dark:text-yellow-300">
                    <div className="font-medium mb-1">Service Issues:</div>
                    <ul className="space-y-1">
                      {diagnostic.diagnostics.services.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PDF Test Results */}
        {testResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Test Results
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">File Information</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {testResult.file.name}</div>
                  <div><strong>Size:</strong> {testResult.file.sizeFormatted}</div>
                  <div><strong>Type:</strong> {testResult.file.type}</div>
                  <div><strong>Valid PDF:</strong>
                    <span className={testResult.validation.isValid ? "text-green-600" : "text-red-600"}>
                      {testResult.validation.isValid ? " Yes" : " No"}
                    </span>
                  </div>
                  {testResult.validation.error && (
                    <div className="text-red-600 text-xs mt-1">{testResult.validation.error}</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Processing Tests</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {testResult.tests.textExtraction.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">Text Extraction</span>
                    </div>
                    {testResult.tests.textExtraction.success ? (
                      <div className="text-sm text-gray-600 mt-1">
                        Extracted {testResult.tests.textExtraction.textLength} characters
                        {testResult.tests.textExtraction.preview && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                            <strong>Preview:</strong> {testResult.tests.textExtraction.preview}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 mt-1">
                        {testResult.tests.textExtraction.error}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      {testResult.tests.chunking.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">Text Chunking</span>
                    </div>
                    {testResult.tests.chunking.success ? (
                      <div className="text-sm text-gray-600 mt-1">
                        Created {testResult.tests.chunking.chunksCreated} chunks (avg: {testResult.tests.chunking.avgChunkSize} chars)
                      </div>
                    ) : (
                      <div className="text-sm text-red-600 mt-1">
                        {testResult.tests.chunking.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Setup Guide */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Quick Setup Guide
          </h3>
          <div className="space-y-4 text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-2">1. Create Environment File</h4>
              <p className="text-sm mb-2">Create a <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">.env.local</code> file in your project root with:</p>
              <pre className="bg-blue-100 dark:bg-blue-800 p-3 rounded text-xs overflow-x-auto">
{`GOOGLE_API_KEY=your_google_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=pdf-embeddings
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Install Dependencies</h4>
              <pre className="bg-blue-100 dark:bg-blue-800 p-3 rounded text-xs">
npm install pdf-parse @types/pdf-parse
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Sign In</h4>
              <p className="text-sm">Make sure you're signed in through NextAuth before trying to upload PDFs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
