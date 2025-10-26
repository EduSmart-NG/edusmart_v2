"use client";

import { useState } from "react";
import { bulkImportQuestions } from "@/lib/actions/bulk-questions";
import { downloadTemplate } from "@/lib/actions/bulk-template-download";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileCheck, Download } from "lucide-react";
import { toast } from "sonner";

interface Progress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  errors?: Array<{ row: number; field?: string; message: string }>;
}

export function BulkImportForm() {
  const [selectedFormat, setSelectedFormat] = useState<
    "excel" | "csv" | "json" | ""
  >("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFormat) {
      toast.error("Please select a format");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to validate");
      return;
    }

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

    if (response.success) {
      toast.success(response.message);
    } else {
      toast.error(response.message);
    }
  };

  const handleImport = async () => {
    if (!selectedFormat) {
      toast.error("Please select a format");
      return;
    }

    if (!selectedFile) {
      toast.error("Please select a file to import");
      return;
    }

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
      toast.success(response.message);
      setSelectedFile(null);
    } else {
      toast.error(response.message);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedFormat) {
      toast.error("Please select a format first");
      return;
    }

    const response = await downloadTemplate(selectedFormat);

    if (response.success && response.data) {
      const binaryString = atob(response.data.buffer);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: response.data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully");
    } else {
      toast.error(response.message || "Failed to download template");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Format</CardTitle>
          <CardDescription>
            Select the format of your import file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select
              value={selectedFormat}
              onValueChange={(value) =>
                setSelectedFormat(value as "excel" | "csv" | "json")
              }
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Choose a file to import questions from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <input
              id="file"
              type="file"
              accept={
                selectedFormat === "excel"
                  ? ".xlsx"
                  : selectedFormat === "csv"
                    ? ".csv"
                    : selectedFormat === "json"
                      ? ".json"
                      : ".xlsx,.csv,.json"
              }
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleValidate}
              disabled={!selectedFile || !selectedFormat || importing}
              variant="outline"
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Validate Only
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !selectedFormat || importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>

          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{progress.message}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-green-700 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.current} of {progress.total} processed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
          <CardDescription>
            Download a template file to see the required format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            disabled={!selectedFormat}
          >
            <Download className="mr-2 h-4 w-4" />
            Download {selectedFormat ? selectedFormat.toUpperCase() : ""}{" "}
            Template
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card
          className={result.success ? "border-green-500" : "border-red-500"}
        >
          <CardHeader>
            <CardTitle
              className={result.success ? "text-green-800" : "text-red-800"}
            >
              {result.success ? "✓ Success" : "✗ Error"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={result.success ? "text-green-700" : "text-red-700"}>
              {result.message}
            </p>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-medium text-red-800 mb-2">
                  Errors ({result.errors.length}):
                </p>
                <div className="max-h-60 overflow-y-auto bg-red-50 p-4 rounded border border-red-200">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
