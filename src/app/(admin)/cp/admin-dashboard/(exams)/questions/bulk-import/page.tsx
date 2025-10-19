"use client";

import { useState } from "react";
import {
  bulkImportQuestions,
  bulkExportQuestions,
} from "@/lib/actions/bulk-questions";
import { downloadTemplate } from "@/lib/actions/bulk-template-download";
import type { BulkExportQuery } from "@/types/question-api";

interface Progress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
}

export default function QuestionBulkManager() {
  const [selectedFormat, setSelectedFormat] = useState<
    "excel" | "csv" | "json"
  >("excel");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    errors?: Array<{ row: number; field?: string; message: string }>;
  } | null>(null);

  // ============================================
  // FILE SELECTION
  // ============================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  // ============================================
  // VALIDATION PREVIEW
  // ============================================
  const handleValidate = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setResult(null);
    setProgress({
      stage: "validating",
      current: 0,
      total: 0,
      percentage: 0,
      message: "Validating...",
    });

    const formData = new FormData();
    formData.append("format", selectedFormat);
    formData.append("validateOnly", "true");
    formData.append("file", selectedFile);

    const response = await bulkImportQuestions(formData);

    setImporting(false);
    setProgress(null);
    setResult(response);
  };

  // ============================================
  // IMPORT
  // ============================================
  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setResult(null);
    setProgress({
      stage: "parsing",
      current: 0,
      total: 0,
      percentage: 0,
      message: "Starting import...",
    });

    const formData = new FormData();
    formData.append("format", selectedFormat);
    formData.append("validateOnly", "false");
    formData.append("file", selectedFile);

    const response = await bulkImportQuestions(formData);

    setImporting(false);
    setProgress(null);
    setResult(response);

    if (response.success) {
      setSelectedFile(null);
    }
  };

  // ============================================
  // EXPORT
  // ============================================
  const handleExport = async () => {
    setExporting(true);
    setResult(null);
    setProgress({
      stage: "querying",
      current: 0,
      total: 0,
      percentage: 0,
      message: "Exporting...",
    });

    const query: BulkExportQuery = {
      format: selectedFormat,
      limit: 1000,
    };

    const response = await bulkExportQuestions(query);

    setExporting(false);
    setProgress(null);

    if (response.success && response.data) {
      // Create blob and download
      const blob = new Blob([new Uint8Array(response.data.buffer)], {
        type: response.data.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResult({ success: true, message: response.message });
    } else {
      setResult({ success: false, message: response.message });
    }
  };

  // ============================================
  // DOWNLOAD TEMPLATE - FIXED FOR BASE64
  // ============================================
  const handleDownloadTemplate = async () => {
    const response = await downloadTemplate(selectedFormat);

    if (response.success && response.data) {
      // Convert base64 string back to binary
      const binaryString = atob(response.data.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
      const blob = new Blob([bytes], {
        type: response.data.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Question Bulk Operations</h1>

      {/* Format Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">1. Select Format</h2>
        <div className="flex gap-4">
          {(["excel", "csv", "json"] as const).map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format)}
              className={`px-4 py-2 rounded ${
                selectedFormat === format
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">2. Import Questions</h2>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File ({selectedFormat.toUpperCase()})
            </label>
            <input
              type="file"
              accept={
                selectedFormat === "excel"
                  ? ".xlsx"
                  : selectedFormat === "csv"
                    ? ".csv"
                    : ".json"
              }
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleValidate}
              disabled={!selectedFile || importing}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Validate Only
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{progress.message}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {progress.current} of {progress.total} processed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">3. Export Questions</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {exporting
            ? "Exporting..."
            : `Export as ${selectedFormat.toUpperCase()}`}
        </button>
      </div>

      {/* Template Download */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">4. Download Template</h2>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Download {selectedFormat.toUpperCase()} Template
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`p-6 rounded-lg ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-2 ${result.success ? "text-green-800" : "text-red-800"}`}
          >
            {result.success ? "✓ Success" : "✗ Error"}
          </h3>
          <p className={result.success ? "text-green-700" : "text-red-700"}>
            {result.message}
          </p>

          {/* Error Details */}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <p className="font-medium text-red-800 mb-2">
                Errors ({result.errors.length}):
              </p>
              <div className="max-h-60 overflow-y-auto bg-white p-4 rounded border border-red-200">
                <ul className="space-y-2">
                  {result.errors.slice(0, 20).map((error, index) => (
                    <li key={index} className="text-sm text-red-700">
                      <strong>Row {error.row}</strong>
                      {error.field && ` - ${error.field}`}: {error.message}
                    </li>
                  ))}
                  {result.errors.length > 20 && (
                    <li className="text-sm text-red-600 italic">
                      ... and {result.errors.length - 20} more errors
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
