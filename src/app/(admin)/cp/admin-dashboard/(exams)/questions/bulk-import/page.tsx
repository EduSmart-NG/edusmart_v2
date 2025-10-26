import { BulkImportForm } from "@/components/admin/exams/bulk-import-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bulk Import Questions",
  description: "Import multiple questions from Excel, CSV, or JSON files",
};

export default function BulkImportPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground mt-2">
          Upload Excel, CSV, or JSON files to import multiple questions at once
        </p>

        <Button asChild variant="outline">
          <Link href="/cp/admin-dashboard/questions/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Link>
        </Button>
      </div>

      <BulkImportForm />
    </div>
  );
}
