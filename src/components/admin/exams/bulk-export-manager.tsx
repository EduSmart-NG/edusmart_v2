"use client";

import { useState } from "react";
import { BulkExportFilters } from "./bulk-export-filters";
import { BulkExportPreview } from "./bulk-export-preview";
import type { FilterOptions } from "@/types/bulk-import";

interface BulkExportManagerProps {
  filterOptions: FilterOptions;
}

export interface ExportFilters {
  format: "excel" | "csv" | "json";
  subjects: string[];
  examTypes: string[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
  status: "active" | "inactive" | "all";
  difficulty: string[];
}

export function BulkExportManager({ filterOptions }: BulkExportManagerProps) {
  const [filters, setFilters] = useState<ExportFilters>({
    format: "excel",
    subjects: [],
    examTypes: [],
    status: "active",
    difficulty: [],
  });

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleApplyFilters = (newFilters: ExportFilters) => {
    setFilters(newFilters);
    setShowPreview(true);
    setSelectedQuestionIds([]);
  };

  const handleSelectQuestions = (ids: string[]) => {
    setSelectedQuestionIds(ids);
  };

  return (
    <div className="space-y-6">
      <BulkExportFilters
        filterOptions={filterOptions}
        onApplyFilters={handleApplyFilters}
      />

      {showPreview && (
        <BulkExportPreview
          filters={filters}
          selectedQuestionIds={selectedQuestionIds}
          onSelectQuestions={handleSelectQuestions}
        />
      )}
    </div>
  );
}
