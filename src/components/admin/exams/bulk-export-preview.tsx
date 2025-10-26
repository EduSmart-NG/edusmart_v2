"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { bulkExportQuestions } from "@/lib/actions/bulk-questions";
import type { ExportFilters } from "./bulk-export-manager";
import type { QuestionDecrypted } from "@/types/question-api";
import { Badge } from "@/components/ui/badge";
import { getFilteredQuestionsPreview } from "@/lib/actions/bulk-export-filters";

interface BulkExportPreviewProps {
  filters: ExportFilters;
  selectedQuestionIds: string[];
  onSelectQuestions: (ids: string[]) => void;
}

export function BulkExportPreview({
  filters,
  selectedQuestionIds,
  onSelectQuestions,
}: BulkExportPreviewProps) {
  const [questions, setQuestions] = useState<QuestionDecrypted[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Memoize loadQuestions to prevent unnecessary recreations
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const response = await getFilteredQuestionsPreview({
      ...filters,
      page,
      pageSize,
    });

    if (response.success && response.data) {
      setQuestions(response.data.questions);
      setTotal(response.data.total);
    } else {
      toast.error(response.message || "Failed to load questions");
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSelectAll = () => {
    if (selectedQuestionIds.length === questions.length) {
      onSelectQuestions([]);
    } else {
      onSelectQuestions(questions.map((q) => q.id));
    }
  };

  const handleSelectQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      onSelectQuestions(selectedQuestionIds.filter((qid) => qid !== id));
    } else {
      onSelectQuestions([...selectedQuestionIds, id]);
    }
  };

  const handleExport = async () => {
    if (selectedQuestionIds.length === 0) {
      toast.error("Please select at least one question to export");
      return;
    }

    setExporting(true);

    const response = await bulkExportQuestions({
      format: filters.format,
      questionIds: selectedQuestionIds,
    });

    setExporting(false);

    if (response.success && response.data) {
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

      toast.success(response.message);
    } else {
      toast.error(response.message || "Failed to export questions");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Questions Found</CardTitle>
          <CardDescription>
            No questions match the selected filters. Try adjusting your filters.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Question Preview</CardTitle>
            <CardDescription>
              {selectedQuestionIds.length} of {total} questions selected
            </CardDescription>
          </div>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedQuestionIds.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export Selected"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedQuestionIds.length === questions.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Exam Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedQuestionIds.includes(question.id)}
                      onCheckedChange={() => handleSelectQuestion(question.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate">{question.questionText}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.examType}</Badge>
                  </TableCell>
                  <TableCell>{question.subject}</TableCell>
                  <TableCell>{question.year}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        question.difficultyLevel === "easy"
                          ? "secondary"
                          : question.difficultyLevel === "hard"
                            ? "destructive"
                            : "default"
                      }
                    >
                      {question.difficultyLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{question.questionType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total questions)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
