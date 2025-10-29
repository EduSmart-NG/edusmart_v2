"use client";

/**
 * Exams Filters Component - Client Component for URL state management
 *
 * FEATURES:
 * - URL-based state management (shareable, bookmarkable)
 * - Debounced search input (300ms)
 * - Filter by status, exam type, subject, year
 * - Sort by multiple columns with direction
 * - Reset all filters functionality
 * - Preserves pagination on filter changes
 *
 * ARCHITECTURE:
 * - Uses useSearchParams and useRouter from Next.js
 * - All state changes update URL
 * - Server component re-fetches data on URL change
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS, EXAM_TYPES, YEARS, EXAM_STATUS } from "@/lib/utils/exam";
import { useDebouncedCallback } from "use-debounce";

// ============================================
// TYPES
// ============================================

type SortByOption = "createdAt" | "title" | "year" | "status";

// ============================================
// COMPONENT
// ============================================

export const ExamsFilters = React.memo(function ExamsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current values from URL
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentExamType = searchParams.get("exam_type") || "all";
  const currentSubject = searchParams.get("subject") || "all";
  const currentYear = searchParams.get("year") || "all";
  const currentSortBy = (searchParams.get("sort_by") ||
    "createdAt") as SortByOption;
  const currentSortOrder = searchParams.get("sort_order") || "desc";

  // Local state for search input (controlled)
  const [searchValue, setSearchValue] = React.useState(currentSearch);

  // Sync search value with URL changes
  React.useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  // Check if any filters are active - Memoized for performance
  const hasActiveFilters = React.useMemo(
    () =>
      currentSearch ||
      currentStatus !== "all" ||
      currentExamType !== "all" ||
      currentSubject !== "all" ||
      currentYear !== "all" ||
      currentSortBy !== "createdAt" ||
      currentSortOrder !== "desc",
    [
      currentSearch,
      currentStatus,
      currentExamType,
      currentSubject,
      currentYear,
      currentSortBy,
      currentSortOrder,
    ]
  );

  // ============================================
  // URL UPDATE HELPER
  // ============================================

  const updateURL = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change
      if (!updates.page) {
        params.delete("page");
      }

      // Update URL
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // ============================================
  // DEBOUNCED SEARCH
  // ============================================

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateURL({ search: value || null });
  }, 300);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleStatusChange = React.useCallback(
    (value: string) => {
      updateURL({ status: value === "all" ? null : value });
    },
    [updateURL]
  );

  const handleExamTypeChange = React.useCallback(
    (value: string) => {
      updateURL({ exam_type: value === "all" ? null : value });
    },
    [updateURL]
  );

  const handleSubjectChange = React.useCallback(
    (value: string) => {
      updateURL({ subject: value === "all" ? null : value });
    },
    [updateURL]
  );

  const handleYearChange = React.useCallback(
    (value: string) => {
      updateURL({ year: value === "all" ? null : value });
    },
    [updateURL]
  );

  const handleSortByChange = React.useCallback(
    (value: SortByOption) => {
      updateURL({ sort_by: value });
    },
    [updateURL]
  );

  const handleSortOrderChange = React.useCallback(
    (value: string) => {
      updateURL({ sort_order: value });
    },
    [updateURL]
  );

  const handleResetFilters = React.useCallback(() => {
    setSearchValue("");
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-4">
      {/* Search and Reset */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, subject, or year..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="shrink-0"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {EXAM_STATUS.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Exam Type Filter */}
        <Select value={currentExamType} onValueChange={handleExamTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Exam Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EXAM_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subject Filter */}
        <Select value={currentSubject} onValueChange={handleSubjectChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Filter */}
        <Select value={currentYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEARS.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={currentSortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={currentSortOrder} onValueChange={handleSortOrderChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});
