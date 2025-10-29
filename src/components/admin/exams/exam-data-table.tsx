"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { examKeys } from "@/hooks/use-exams";
import { getExamById } from "@/lib/actions/exam-upload";
import {
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
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
import { DeleteExamDialog } from "./delete-exam-modal";
import type { AdminExam } from "@/types/admin";
import Link from "next/link";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface ExamsTableProps {
  exams: AdminExam[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "published":
      return CheckCircle2;
    case "draft":
      return Clock;
    case "archived":
      return XCircle;
    default:
      return FileText;
  }
}

// ============================================
// ROW ACTIONS COMPONENT
// ============================================

function RowActions({ exam }: { exam: AdminExam }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Prefetch exam details on hover for instant navigation
  const handlePrefetch = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: examKeys.detail(exam.id),
      queryFn: () => getExamById(exam.id),
      staleTime: 60 * 1000, // 1 minute
    });
  }, [queryClient, exam.id]);

  const handleEdit = () => {
    router.push(`/cp/admin-dashboard/exams/${exam.id}`);
  };

  const handleDuplicate = () => {
    const params = new URLSearchParams({
      duplicate: exam.id,
      title: `${exam.title} (Copy)`,
    });
    router.push(`/cp/admin-dashboard/exams/new?${params.toString()}`);
    toast.success("Duplicating exam...");
  };

  return (
    <>
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

          <DropdownMenuItem onMouseEnter={handlePrefetch} onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteExamDialog
        exam={exam}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}

// ============================================
// PAGINATION COMPONENT
// ============================================

function Pagination({
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

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const changePageSize = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newSize);
    params.delete("page"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* Page Size Selector */}
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

        {/* Navigation Buttons */}
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
}

// ============================================
// EXAM ROW COMPONENT
// ============================================

const ExamRow = React.memo(function ExamRow({ exam }: { exam: AdminExam }) {
  const queryClient = useQueryClient();

  // Optimize date formatting - create Date object once
  const { formattedDate, formattedTime } = React.useMemo(() => {
    const date = new Date(exam.createdAt);
    return {
      formattedDate: format(date, "MMM d, yyyy"),
      formattedTime: format(date, "h:mm a"),
    };
  }, [exam.createdAt]);

  // Prefetch exam details on hover for instant navigation
  const handlePrefetch = React.useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: examKeys.detail(exam.id),
      queryFn: () => getExamById(exam.id),
      staleTime: 60 * 1000, // 1 minute
    });
  }, [queryClient, exam.id]);

  const StatusIcon = getStatusIcon(exam.status);
  const hours = Math.floor(exam.duration / 60);
  const minutes = exam.duration % 60;
  let durationText = "";
  if (hours > 0) durationText += `${hours}h `;
  if (minutes > 0 || hours === 0) durationText += `${minutes}m`;

  return (
    <TableRow>
      {/* Title - Clickable with prefetch */}
      <TableCell>
        <div onMouseEnter={handlePrefetch}>
          <Link
            href={`/cp/admin-dashboard/exams/${exam.id}`}
            className="flex flex-col hover:underline"
          >
            <span className="font-medium">{exam.title}</span>
            <Badge variant="outline" className="mt-1 w-fit text-xs">
              {exam.examType}
            </Badge>
          </Link>
        </div>
      </TableCell>

      {/* Subject */}
      <TableCell>{exam.subject}</TableCell>

      {/* Year */}
      <TableCell>
        <span className="font-medium">{exam.year}</span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge variant={getStatusVariant(exam.status)}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
        </Badge>
      </TableCell>

      {/* Questions */}
      <TableCell>
        <div className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{exam.questionCount}</span>
        </div>
      </TableCell>

      {/* Duration */}
      <TableCell>{durationText.trim()}</TableCell>

      {/* Created */}
      <TableCell>
        <div className="flex flex-col">
          <span className="text-sm">{formattedDate}</span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <RowActions exam={exam} />
      </TableCell>
    </TableRow>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export function ExamsTable({
  exams,
  currentPage,
  totalPages,
  pageSize,
}: ExamsTableProps) {
  if (exams.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No exams found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or create a new exam.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <ExamRow key={exam.id} exam={exam} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
      />
    </div>
  );
}
