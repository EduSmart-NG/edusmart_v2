/**
 * Permission Guard Component
 *
 * React components and hooks for client-side permission checking.
 *
 * SECURITY WARNING: These are for UI display only.
 * Always verify permissions server-side in Server Actions.
 *
 * @module components/auth/permission-guard
 */

"use client";

import { useEffect, useState } from "react";
import type { Permission, RoleName } from "@/lib/rbac/permissions";
import { checkPermissionClient, checkRoleClient } from "@/lib/rbac/utils";
import type { PermissionState } from "@/types/rbac";

// ============================================
// PERMISSION HOOK
// ============================================

/**
 * Hook to check user permission
 *
 * CLIENT-SIDE ONLY - Use for conditional UI rendering
 *
 * @param permission - Permission to check
 * @returns Permission state
 *
 * @example
 * ```tsx
 * "use client";
 *
 * export function UploadButton() {
 *   const { isAllowed, isLoading } = usePermission({ question: ["upload"] });
 *
 *   if (isLoading) return <Spinner />;
 *   if (!isAllowed) return null;
 *
 *   return <button>Upload Question</button>;
 * }
 * ```
 */
export function usePermission(permission: Permission): PermissionState {
  const [state, setState] = useState<PermissionState>({
    isAllowed: false,
    isLoading: true,
    error: null,
    userRole: null,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const allowed = await checkPermissionClient(permission);

        if (mounted) {
          setState({
            isAllowed: allowed,
            isLoading: false,
            error: null,
            userRole: null, // Could be fetched if needed
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            isAllowed: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error
                : new Error("Permission check failed"),
            userRole: null,
          });
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [permission]);

  return state;
}

// ============================================
// ROLE HOOK
// ============================================

/**
 * Hook to check user role
 *
 * CLIENT-SIDE ONLY - Use for conditional UI rendering
 * Note: Prefer usePermission over useRole for better granularity
 *
 * @param role - Role name to check
 * @returns Role state
 *
 * @example
 * ```tsx
 * "use client";
 *
 * export function AdminPanel() {
 *   const { isAllowed, isLoading } = useRole("admin");
 *
 *   if (isLoading) return <Spinner />;
 *   if (!isAllowed) return <AccessDenied />;
 *
 *   return <AdminDashboard />;
 * }
 * ```
 */
export function useRole(
  role: RoleName
): Pick<PermissionState, "isAllowed" | "isLoading" | "error"> {
  const [state, setState] = useState({
    isAllowed: false,
    isLoading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAccess() {
      try {
        const allowed = await checkRoleClient(role);

        if (mounted) {
          setState({
            isAllowed: allowed,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            isAllowed: false,
            isLoading: false,
            error:
              error instanceof Error ? error : new Error("Role check failed"),
          });
        }
      }
    }

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [role]);

  return state;
}

// ============================================
// PERMISSION GUARD COMPONENT
// ============================================

export interface PermissionGuardProps {
  /** Permission required to view children */
  permission?: Permission;
  /** Role required to view children (use permission instead when possible) */
  role?: RoleName;
  /** Fallback to show when permission denied */
  fallback?: React.ReactNode;
  /** Loading state component */
  loading?: React.ReactNode;
  /** Children to render when permission granted */
  children: React.ReactNode;
}

/**
 * Guard component to conditionally render based on permissions
 *
 * CLIENT-SIDE ONLY - Use for conditional UI rendering
 *
 * @example
 * ```tsx
 * <PermissionGuard
 *   permission={{ question: ["upload"] }}
 *   fallback={<p>You can't upload questions</p>}
 *   loading={<Spinner />}
 * >
 *   <UploadForm />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  role,
  fallback = null,
  loading = <div>Loading...</div>,
  children,
}: PermissionGuardProps) {
  // Use permission check if provided, otherwise use role check
  const permissionState = usePermission(permission || {});
  const roleState = useRole(role || "user");

  const state = permission ? permissionState : roleState;

  if (state.isLoading) {
    return <>{loading}</>;
  }

  if (!state.isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// SHORTHAND GUARDS
// ============================================

/**
 * Guard for admin-only content
 *
 * @example
 * ```tsx
 * <AdminGuard fallback={<AccessDenied />}>
 *   <AdminPanel />
 * </AdminGuard>
 * ```
 */
export function AdminGuard({
  fallback,
  loading,
  children,
}: Omit<PermissionGuardProps, "permission" | "role">) {
  return (
    <PermissionGuard role="admin" fallback={fallback} loading={loading}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Guard for exam manager content
 *
 * @example
 * ```tsx
 * <ExamManagerGuard>
 *   <QuestionUploadForm />
 * </ExamManagerGuard>
 * ```
 */
export function ExamManagerGuard({
  fallback,
  loading,
  children,
}: Omit<PermissionGuardProps, "permission" | "role">) {
  return (
    <PermissionGuard role="exam_manager" fallback={fallback} loading={loading}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Guard for question upload permission
 * Works for both admin and exam_manager
 *
 * @example
 * ```tsx
 * <QuestionUploadGuard fallback={<p>No access</p>}>
 *   <UploadForm />
 * </QuestionUploadGuard>
 * ```
 */
export function QuestionUploadGuard({
  fallback,
  loading,
  children,
}: Omit<PermissionGuardProps, "permission" | "role">) {
  return (
    <PermissionGuard
      permission={{ question: ["upload"] }}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </PermissionGuard>
  );
}
