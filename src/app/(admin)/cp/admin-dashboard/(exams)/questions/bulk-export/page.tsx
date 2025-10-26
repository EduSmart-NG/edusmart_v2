import type { Metadata } from "next";
import { BulkExportManager } from "@/components/admin/exams/bulk-export-manager";
import { getExportFilterOptions } from "@/lib/actions/bulk-export-filters";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Bulk Export Questions",
  description: "Export questions with advanced filtering and selection",
};

export default async function BulkExportPage() {
  const filterOptions = await getExportFilterOptions();

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground mt-2">
          Filter and select questions to export to Excel, CSV, or JSON format
        </p>

        <Button asChild variant="outline">
          <Link href="/cp/admin-dashboard/questions/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Link>
        </Button>
      </div>

      <BulkExportManager filterOptions={filterOptions} />
    </div>
  );
}
