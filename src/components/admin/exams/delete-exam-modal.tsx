"use client";

/**
 * Delete Exam Confirmation Dialog
 *
 * Features:
 * - Confirmation dialog with exam details
 * - Server action integration
 * - Loading states
 * - Toast notifications
 * - Auto-refresh on success
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteExam } from "@/lib/actions/exam-upload";
import { toast } from "sonner";
import type { AdminExam } from "@/types/admin";

interface DeleteExamDialogProps {
  exam: AdminExam;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteExamDialog({
  exam,
  open,
  onOpenChange,
}: DeleteExamDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteExam(exam.id);

      if (result.success) {
        toast.success("Exam deleted successfully");
        onOpenChange(false);
        // Refresh the page to show updated list
        router.refresh();
      } else {
        toast.error(result.message || "Failed to delete exam");
      }
    } catch (error) {
      console.error("Delete exam error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Exam
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this exam? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <p className="text-sm font-semibold">{exam.title}</p>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Exam Type
                </p>
                <Badge variant="outline" className="mt-1">
                  {exam.examType}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Subject
                </p>
                <p className="text-sm">{exam.subject}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Year
                </p>
                <p className="text-sm font-medium">{exam.year}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Questions
              </p>
              <p className="text-sm">
                {exam.questionCount} question
                {exam.questionCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Warning: This will soft-delete the exam. It can be restored by
              an administrator.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Exam"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
