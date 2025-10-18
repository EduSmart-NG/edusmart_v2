"use client";

/**
 * Questions Filters Component - Client Component for URL state management
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
import { useDebouncedCallback } from "use-debounce";
import { SUBJECTS, EXAM_TYPES, YEARS } from "@/lib/utils/exam";

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "essay",
  "fill_in_blank",
];

type SortByOption = "createdAt" | "examType" | "subject" | "year";

export function QuestionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentExamType = searchParams.get("exam_type") || "all";
  const currentSubject = searchParams.get("subject") || "all";
  const currentYear = searchParams.get("year") || "all";
  const currentDifficulty = searchParams.get("difficulty") || "all";
  const currentQuestionType = searchParams.get("question_type") || "all";
  const currentSortBy = (searchParams.get("sort_by") ||
    "createdAt") as SortByOption;
  const currentSortOrder = searchParams.get("sort_order") || "desc";

  const [searchValue, setSearchValue] = React.useState(currentSearch);

  const hasActiveFilters =
    currentSearch ||
    currentExamType !== "all" ||
    currentSubject !== "all" ||
    currentYear !== "all" ||
    currentDifficulty !== "all" ||
    currentQuestionType !== "all" ||
    currentSortBy !== "createdAt" ||
    currentSortOrder !== "desc";

  const updateURL = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      if (!updates.page) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateURL({ search: value || null });
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleResetFilters = () => {
    setSearchValue("");
    router.push(pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
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

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={currentExamType}
          onValueChange={(value) =>
            updateURL({ exam_type: value === "all" ? null : value })
          }
        >
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

        <Select
          value={currentSubject}
          onValueChange={(value) =>
            updateURL({ subject: value === "all" ? null : value })
          }
        >
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

        <Select
          value={currentYear}
          onValueChange={(value) =>
            updateURL({ year: value === "all" ? null : value })
          }
        >
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

        <Select
          value={currentDifficulty}
          onValueChange={(value) =>
            updateURL({ difficulty: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DIFFICULTY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentQuestionType}
          onValueChange={(value) =>
            updateURL({ question_type: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Question Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type
                  .split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentSortBy}
          onValueChange={(value) =>
            updateURL({ sort_by: value as SortByOption })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created Date</SelectItem>
            <SelectItem value="examType">Exam Type</SelectItem>
            <SelectItem value="subject">Subject</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentSortOrder}
          onValueChange={(value) => updateURL({ sort_order: value })}
        >
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
}
