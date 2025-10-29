"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { questionKeys } from "@/hooks/use-questions";
import { getQuestionById } from "@/lib/actions/question-upload";
import {
  MoreHorizontal,
  FileQuestion,
  Edit,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuestionDecrypted } from "@/types/question-api";
import Link from "next/link";

interface QuestionsTableProps {
  questions: QuestionDecrypted[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function getDifficultyVariant(
  difficulty: string
): "default" | "secondary" | "destructive" {
  switch (difficulty) {
    case "easy":
      return "default";
    case "medium":
      return "secondary";
    case "hard":
      return "destructive";
    default:
      return "secondary";
  }
}

const RowActions = React.memo(function RowActions({
  question,
}: {
  question: QuestionDecrypted;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Prefetch question details on hover for instant navigation
  const handlePrefetch = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: questionKeys.detail(question.id),
      queryFn: () => getQuestionById(question.id),
      staleTime: 60 * 1000, // 1 minute
    });
  }, [queryClient, question.id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onMouseEnter={handlePrefetch}
          onClick={() =>
            router.push(`/cp/admin-dashboard/questions/${question.id}`)
          }
          className="cursor-pointer"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive cursor-pointer">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToPage = React.useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const changePageSize = React.useCallback(
    (newSize: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", newSize);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={pageSize.toString()} onValueChange={changePageSize}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigateToPage(1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigateToPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

const QuestionRow = React.memo(function QuestionRow({
  question,
}: {
  question: QuestionDecrypted;
}) {
  const queryClient = useQueryClient();

  // Optimize date formatting - create Date object once
  const { formattedDate, formattedTime } = React.useMemo(() => {
    const date = new Date(question.createdAt);
    return {
      formattedDate: format(date, "MMM d, yyyy"),
      formattedTime: format(date, "h:mm a"),
    };
  }, [question.createdAt]);

  const questionTypeFormatted = React.useMemo(
    () =>
      question.questionType
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    [question.questionType]
  );

  const difficultyFormatted = React.useMemo(
    () =>
      question.difficultyLevel.charAt(0).toUpperCase() +
      question.difficultyLevel.slice(1),
    [question.difficultyLevel]
  );

  // Prefetch question details on hover for instant navigation
  const handlePrefetch = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: questionKeys.detail(question.id),
      queryFn: () => getQuestionById(question.id),
      staleTime: 60 * 1000, // 1 minute
    });
  }, [queryClient, question.id]);

  return (
    <TableRow>
      <TableCell className="w-[300px]">
        <div
          className="max-w-[300px] overflow-hidden"
          onMouseEnter={handlePrefetch}
        >
          <Link
            href={`/cp/admin-dashboard/questions/${question.id}`}
            className="text-sm font-medium truncate hover:underline"
          >
            {truncateText(question.questionText, 60)}
          </Link>
        </div>
      </TableCell>

      <TableCell>
        <Badge variant="outline">{question.examType}</Badge>
      </TableCell>

      <TableCell>{question.subject}</TableCell>

      <TableCell>
        <span className="font-medium">{question.year}</span>
      </TableCell>

      <TableCell>
        <span className="text-sm text-muted-foreground">
          {questionTypeFormatted}
        </span>
      </TableCell>

      <TableCell>
        <Badge variant={getDifficultyVariant(question.difficultyLevel)}>
          {difficultyFormatted}
        </Badge>
      </TableCell>

      <TableCell>
        <span className="font-medium">{question.questionPoint}</span>
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">{formattedDate}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>
      </TableCell>

      <TableCell className="text-right">
        <RowActions question={question} />
      </TableCell>
    </TableRow>
  );
});

export function QuestionsTable({
  questions,
  currentPage,
  totalPages,
  pageSize,
}: QuestionsTableProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No questions found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or add a new question.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Question</TableHead>
              <TableHead>Exam Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <QuestionRow key={question.id} question={question} />
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
      />
    </div>
  );
}
