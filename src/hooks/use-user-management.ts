"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getSessionUser,
  updateUserProfile,
  changeUserEmail,
  changeUserPassword,
  deleteUserAccount,
  listUserSessions,
  revokeUserSession,
  revokeOtherUserSessions,
  revokeAllUserSessions,
  listUserAccounts,
  linkUserAccount,
  unlinkUserAccount,
} from "@/lib/actions/user-management";
import type {
  SessionData,
  UpdateUserProfileInput,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteAccountInput,
  LinkAccountInput,
  UnlinkAccountInput,
  ActionResult,
  SessionRevocationResult,
  DeviceSession,
  UserAccount,
  UseUserManagementReturn,
} from "@/types/user-management";

/**
 * User management hook with Better Auth integration
 *
 * Features:
 * - Session management with cookie cache
 * - Profile updates with optimistic UI
 * - Multi-device session tracking
 * - Account linking/unlinking
 * - Automatic session refresh
 * - Security event handling
 *
 * @param options - Hook configuration options
 * @returns User management functions and state
 */
export function useUserManagement(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  disableCookieCache?: boolean;
}): UseUserManagementReturn {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    disableCookieCache = false,
  } = options || {};

  // State management
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch session from server with cache control
   */
  const fetchSession = useCallback(
    async (forceRefresh = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await getSessionUser(forceRefresh || disableCookieCache);

        if (result.success && result.data) {
          setSession(result.data);
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Session fetch error:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch session")
        );
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    },
    [disableCookieCache]
  );

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  /**
   * Auto-refresh session at intervals
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSession(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSession]);

  /**
   * Refresh session manually
   */
  const refreshSession = useCallback(async () => {
    await fetchSession(true);
  }, [fetchSession]);

  /**
   * Clear session from local state
   */
  const clearSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  /**
   * Update user profile with optimistic updates
   */
  const updateProfile = useCallback(
    async (
      data: UpdateUserProfileInput
    ): Promise<ActionResult<SessionData>> => {
      try {
        // Optimistic update
        if (session) {
          setSession({
            ...session,
            user: {
              ...session.user,
              ...data,
              updatedAt: new Date(),
            },
          });
        }

        const result = await updateUserProfile(data);

        if (result.success && result.data) {
          setSession(result.data);
        } else if (!result.success && session) {
          // Revert optimistic update on failure
          await refreshSession();
        }

        return result;
      } catch (err) {
        // Revert optimistic update
        await refreshSession();
        throw err;
      }
    },
    [session, refreshSession]
  );

  /**
   * Change user email
   */
  const changeEmail = useCallback(
    async (data: ChangeEmailInput): Promise<ActionResult> => {
      const result = await changeUserEmail(data);

      // Refresh session after email change
      if (result.success) {
        await refreshSession();
      }

      return result;
    },
    [refreshSession]
  );

  /**
   * Change user password
   */
  const changePassword = useCallback(
    async (data: ChangePasswordInput): Promise<ActionResult> => {
      const result = await changeUserPassword(data);

      // Refresh session after password change
      if (result.success) {
        if (data.revokeOtherSessions) {
          // Only current session remains
          await refreshSession();
        }
      }

      return result;
    },
    [refreshSession]
  );

  /**
   * Delete user account
   */
  const deleteAccount = useCallback(
    async (data: DeleteAccountInput): Promise<ActionResult> => {
      const result = await deleteUserAccount(data);

      // Clear session after account deletion
      if (result.success) {
        clearSession();
      }

      return result;
    },
    [clearSession]
  );

  /**
   * List all active sessions
   */
  const listSessions = useCallback(async (): Promise<
    ActionResult<DeviceSession[]>
  > => {
    return await listUserSessions();
  }, []);

  /**
   * Revoke a specific session
   */
  const revokeSession = useCallback(
    async (token: string): Promise<SessionRevocationResult> => {
      const result = await revokeUserSession(token);

      // If we revoked our own session, clear local state
      if (result.success && session?.session.token === token) {
        clearSession();
      }

      return result;
    },
    [session, clearSession]
  );

  /**
   * Revoke all other sessions
   */
  const revokeOtherSessions =
    useCallback(async (): Promise<SessionRevocationResult> => {
      return await revokeOtherUserSessions();
    }, []);

  /**
   * Revoke all sessions including current
   */
  const revokeAllSessions =
    useCallback(async (): Promise<SessionRevocationResult> => {
      const result = await revokeAllUserSessions();

      // Clear local session after revoking all
      if (result.success) {
        clearSession();
      }

      return result;
    }, [clearSession]);

  /**
   * List all linked accounts
   */
  const listAccounts = useCallback(async (): Promise<
    ActionResult<UserAccount[]>
  > => {
    return await listUserAccounts();
  }, []);

  /**
   * Link a social account
   */
  const linkAccount = useCallback(
    async (data: LinkAccountInput): Promise<ActionResult> => {
      const result = await linkUserAccount(data);

      // Refresh session after linking account
      if (result.success) {
        await refreshSession();
      }

      return result;
    },
    [refreshSession]
  );

  /**
   * Unlink a social account
   */
  const unlinkAccount = useCallback(
    async (data: UnlinkAccountInput): Promise<ActionResult> => {
      return await unlinkUserAccount(data);
    },
    []
  );

  return {
    // State
    session,
    isLoading,
    isAuthenticated: !!session,
    error,

    // Session management
    refreshSession,
    clearSession,

    // Profile management
    updateProfile,
    changeEmail,
    changePassword,
    deleteAccount,

    // Session management
    listSessions,
    revokeSession,
    revokeOtherSessions,
    revokeAllSessions,

    // Account management
    listAccounts,
    linkAccount,
    unlinkAccount,
  };
}
