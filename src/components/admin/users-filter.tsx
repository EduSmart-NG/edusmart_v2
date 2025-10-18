"use client";

/**
 * Users Filters Component - Client Component for URL state management
 *
 * FEATURES:
 * - URL-based state management (shareable, bookmarkable)
 * - Debounced search input (300ms)
 * - Filter by role (admin/user), status (active/banned), gender, state
 * - Sort by name, email, created date
 * - Reset all filters functionality
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

// Nigerian states list
const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

// ============================================
// TYPES
// ============================================

type SortByOption = "name" | "email" | "createdAt";

// ============================================
// COMPONENT
// ============================================

export function UsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current values from URL
  const currentSearch = searchParams.get("search") || "";
  const currentRole = searchParams.get("role") || "all";
  const currentBanned = searchParams.get("banned") || "all";
  const currentGender = searchParams.get("gender") || "all";
  const currentState = searchParams.get("state") || "all";
  const currentSortBy = (searchParams.get("sort_by") ||
    "createdAt") as SortByOption;
  const currentSortOrder = searchParams.get("sort_order") || "desc";

  // Local state for search input (controlled)
  const [searchValue, setSearchValue] = React.useState(currentSearch);

  // Check if any filters are active
  const hasActiveFilters =
    currentSearch ||
    currentRole !== "all" ||
    currentBanned !== "all" ||
    currentGender !== "all" ||
    currentState !== "all" ||
    currentSortBy !== "createdAt" ||
    currentSortOrder !== "desc";

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

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleRoleChange = (value: string) => {
    updateURL({ role: value === "all" ? null : value });
  };

  const handleBannedChange = (value: string) => {
    updateURL({ banned: value === "all" ? null : value });
  };

  const handleGenderChange = (value: string) => {
    updateURL({ gender: value === "all" ? null : value });
  };

  const handleStateChange = (value: string) => {
    updateURL({ state: value === "all" ? null : value });
  };

  const handleSortByChange = (value: SortByOption) => {
    updateURL({ sort_by: value });
  };

  const handleSortOrderChange = (value: string) => {
    updateURL({ sort_order: value });
  };

  const handleResetFilters = () => {
    setSearchValue("");
    router.push(pathname, { scroll: false });
  };

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
            placeholder="Search by name or email..."
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
        {/* Role Filter */}
        <Select value={currentRole} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={currentBanned} onValueChange={handleBannedChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="false">Active</SelectItem>
            <SelectItem value="true">Banned</SelectItem>
          </SelectContent>
        </Select>

        {/* Gender Filter */}
        <Select value={currentGender} onValueChange={handleGenderChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
          </SelectContent>
        </Select>

        {/* State Filter */}
        <Select value={currentState} onValueChange={handleStateChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {NIGERIAN_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
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
            <SelectItem value="createdAt">Join Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="email">Email</SelectItem>
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
}
