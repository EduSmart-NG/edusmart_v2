"use client";

/**
 * Subjects Filters Component
 *
 * Client component for URL state management and filtering.
 * Follows the same pattern as question-filter.tsx
 *
 * @module components/admin/subjects/subjects-filter
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

type SortByOption = "name" | "createdAt" | "updatedAt";

export function SubjectsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") || "";
  const currentIsActive = searchParams.get("isActive") || "all";
  const currentSortBy = (searchParams.get("sortBy") || "name") as SortByOption;
  const currentSortOrder = searchParams.get("sortOrder") || "asc";

  const [searchValue, setSearchValue] = React.useState(currentSearch);

  const hasActiveFilters =
    currentSearch ||
    currentIsActive !== "all" ||
    currentSortBy !== "name" ||
    currentSortOrder !== "asc";

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

      // Reset to page 1 when filters change
      if (!updates.page) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateURL({ search: value });
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  const clearFilters = () => {
    setSearchValue("");
    updateURL({
      search: null,
      isActive: null,
      sortBy: null,
      sortOrder: null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subjects by name or code..."
            value={searchValue}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters} className="shrink-0">
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filters Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Active Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={currentIsActive}
            onValueChange={(value) => updateURL({ isActive: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Sort By</label>
          <Select
            value={currentSortBy}
            onValueChange={(value) => updateURL({ sortBy: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="updatedAt">Updated Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Order</label>
          <Select
            value={currentSortOrder}
            onValueChange={(value) => updateURL({ sortOrder: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
