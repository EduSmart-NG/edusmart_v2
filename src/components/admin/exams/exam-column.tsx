"use client";

/**
 * Enhanced Exam Table Column Definitions
 *
 * Features:
 * - Functional delete with confirmation dialog
 * - Functional view and duplicate actions
 * - Proper filter functions for all filterable columns
 */

import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ArrowUpDown,
  FileText,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminExam } from "@/types/admin";
import { format } from "date-fns";
import Link from "next/link";
import { DeleteExamDialog } from "./delete-exam-modal";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Get status badge variant based on exam status
 */
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

/**
 * Get status icon based on exam status
 */
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

/**
 * Actions Cell Component with Delete Dialog
 */
function ActionsCell({ exam }: { exam: AdminExam }) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleView = () => {
    router.push(`/cp/admin-dashboard/exams/${exam.id}`);
  };

  const handleDuplicate = () => {
    // Navigate to create page with exam data as query params
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
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/cp/admin-dashboard/exams/${exam.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Exam
            </Link>
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

export const columns: ColumnDef<AdminExam>[] = [
  // Select column
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Title column with exam type badge
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const exam = row.original;
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium">{exam.title}</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {exam.examType}
              </Badge>
            </div>
          </div>
        </div>
      );
    },
  },

  // Exam Type column (for filtering)
  {
    accessorKey: "examType",
    header: "Type",
    cell: () => null,
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },

  // Subject column
  {
    accessorKey: "subject",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Subject
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="text-sm">{row.getValue("subject")}</span>;
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },

  // Year column
  {
    accessorKey: "year",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Year
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm font-medium">{row.getValue("year")}</span>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },

  // Status column with badge
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const StatusIcon = getStatusIcon(status);
      return (
        <Badge variant={getStatusVariant(status)}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      if (!value) return true;
      return row.getValue(id) === value;
    },
  },

  // Questions count
  {
    accessorKey: "questionCount",
    header: "Questions",
    cell: ({ row }) => {
      const count = row.getValue("questionCount") as number;
      return (
        <div className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{count}</span>
        </div>
      );
    },
  },

  // Duration
  {
    accessorKey: "duration",
    header: "Duration",
    cell: ({ row }) => {
      const duration = row.getValue("duration") as number;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;

      let durationText = "";
      if (hours > 0) {
        durationText += `${hours}h `;
      }
      if (minutes > 0 || hours === 0) {
        durationText += `${minutes}m`;
      }

      return <span className="text-sm">{durationText.trim()}</span>;
    },
  },

  // Created date
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as Date;
      return (
        <div className="flex flex-col">
          <span className="text-sm">
            {format(new Date(date), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(date), "h:mm a")}
          </span>
        </div>
      );
    },
  },

  // Actions dropdown
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell exam={row.original} />,
  },
];
