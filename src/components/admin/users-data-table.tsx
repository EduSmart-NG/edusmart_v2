"use client";

/**
 * Users Table Component - Client Component for table display
 *
 * FEATURES:
 * - Server-rendered data (no client-side filtering/sorting)
 * - URL-based pagination
 * - Row actions (view, edit, ban, delete)
 * - Displays: Name, Email, Role, Status, Gender, State, 2FA, Join Date
 * - Responsive design
 */

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Shield,
  Ban,
  UserX,
  Users as UsersIcon,
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
import type { AdminUser } from "@/types/admin";

// ============================================
// TYPES
// ============================================

interface UsersTableProps {
  users: AdminUser[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

// ============================================
// ROW ACTIONS COMPONENT
// ============================================

function RowActions({ user }: { user: AdminUser }) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCopyId}>Copy user ID</DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyEmail}>
          Copy email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Shield className="mr-2 h-4 w-4" />
          Change role
        </DropdownMenuItem>
        <DropdownMenuItem>View sessions</DropdownMenuItem>
        <DropdownMenuItem>View details</DropdownMenuItem>
        <DropdownMenuSeparator />
        {!user.banned ? (
          <DropdownMenuItem className="text-destructive">
            <Ban className="mr-2 h-4 w-4" />
            Ban user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem>Unban user</DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-destructive">
          <UserX className="mr-2 h-4 w-4" />
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
// MAIN COMPONENT
// ============================================

export function UsersTable({
  users,
  currentPage,
  totalPages,
  pageSize,
}: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No users found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters to see more users.
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>State</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              return (
                <TableRow key={user.id}>
                  {/* Name */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        @{user.displayUsername}
                      </span>
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{user.email}</span>
                      {user.emailVerified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "outline"}
                    >
                      {user.role || "user"}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "default"}>
                      {user.banned ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>

                  {/* Gender */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.gender
                        ? user.gender === "MALE"
                          ? "Male"
                          : "Female"
                        : "—"}
                    </span>
                  </TableCell>

                  {/* State */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {user.state || "—"}
                    </span>
                  </TableCell>

                  {/* 2FA */}
                  <TableCell>
                    <Badge
                      variant={user.twoFactorEnabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>

                  {/* Joined */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <RowActions user={user} />
                  </TableCell>
                </TableRow>
              );
            })}
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
