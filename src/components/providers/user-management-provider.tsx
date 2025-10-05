"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useUserManagement } from "@/hooks/use-user-management";
import type { UserManagementContextValue } from "@/types/user-management";

/**
 * User Management Context
 */
const UserManagementContext = createContext<
  UserManagementContextValue | undefined
>(undefined);

/**
 * User Management Provider Props
 */
interface UserManagementProviderProps {
  children: React.ReactNode;
  /**
   * Enable automatic session refresh
   * @default true
   */
  autoRefresh?: boolean;
  /**
   * Session refresh interval in milliseconds
   * @default 300000 (5 minutes)
   */
  refreshInterval?: number;
  /**
   * Disable Better Auth cookie cache
   * @default false
   */
  disableCookieCache?: boolean;
  /**
   * Session freshness threshold in seconds
   * @default 86400 (1 day)
   */
  freshAgeSeconds?: number;
}

/**
 * User Management Provider Component
 *
 * Provides centralized user management state and functions
 * with Better Auth integration and security features.
 *
 * Features:
 * - Automatic session refresh
 * - Cookie cache synchronization
 * - Cross-tab session updates
 * - Session freshness validation
 * - Security event tracking
 *
 * @example
 * ```tsx
 * <UserManagementProvider autoRefresh>
 *   <App />
 * </UserManagementProvider>
 * ```
 */
export function UserManagementProvider({
  children,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  disableCookieCache = false,
  freshAgeSeconds = 86400, // 1 day
}: UserManagementProviderProps) {
  const userManagement = useUserManagement({
    autoRefresh,
    refreshInterval,
    disableCookieCache,
  });

  const [isFreshSession, setIsFreshSession] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);

  /**
   * Calculate if session is fresh
   * A session is fresh if created within the freshAge threshold
   */
  useEffect(() => {
    if (!userManagement.session) {
      setIsFreshSession(false);
      setSessionExpiresAt(null);
      return;
    }

    const sessionCreatedAt = new Date(userManagement.session.session.createdAt);
    const now = new Date();
    const ageInSeconds = (now.getTime() - sessionCreatedAt.getTime()) / 1000;

    setIsFreshSession(ageInSeconds <= freshAgeSeconds);
    setSessionExpiresAt(new Date(userManagement.session.session.expiresAt));
  }, [userManagement.session, freshAgeSeconds]);

  /**
   * Handle cross-tab session updates
   * Listen for storage events to sync session across tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "session_updated") {
        userManagement.refreshSession();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [userManagement]);

  /**
   * Handle visibility change to refresh session when tab becomes active
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && autoRefresh) {
        userManagement.refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefresh, userManagement]);

  /**
   * Notify other tabs when session is updated
   */
  const notifySessionUpdate = useCallback(() => {
    try {
      localStorage.setItem("session_updated", Date.now().toString());
      localStorage.removeItem("session_updated");
    } catch (error) {
      console.error("Failed to notify session update:", error);
    }
  }, []);

  /**
   * Enhanced update profile with cross-tab notification
   */
  const updateProfile = useCallback(
    async (...args: Parameters<typeof userManagement.updateProfile>) => {
      const result = await userManagement.updateProfile(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced change email with cross-tab notification
   */
  const changeEmail = useCallback(
    async (...args: Parameters<typeof userManagement.changeEmail>) => {
      const result = await userManagement.changeEmail(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced change password with cross-tab notification
   */
  const changePassword = useCallback(
    async (...args: Parameters<typeof userManagement.changePassword>) => {
      const result = await userManagement.changePassword(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced delete account with cross-tab notification
   */
  const deleteAccount = useCallback(
    async (...args: Parameters<typeof userManagement.deleteAccount>) => {
      const result = await userManagement.deleteAccount(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced revoke session with cross-tab notification
   */
  const revokeSession = useCallback(
    async (...args: Parameters<typeof userManagement.revokeSession>) => {
      const result = await userManagement.revokeSession(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced revoke other sessions with cross-tab notification
   */
  const revokeOtherSessions = useCallback(
    async (...args: Parameters<typeof userManagement.revokeOtherSessions>) => {
      const result = await userManagement.revokeOtherSessions(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced revoke all sessions with cross-tab notification
   */
  const revokeAllSessions = useCallback(
    async (...args: Parameters<typeof userManagement.revokeAllSessions>) => {
      const result = await userManagement.revokeAllSessions(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced link account with cross-tab notification
   */
  const linkAccount = useCallback(
    async (...args: Parameters<typeof userManagement.linkAccount>) => {
      const result = await userManagement.linkAccount(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Enhanced unlink account with cross-tab notification
   */
  const unlinkAccount = useCallback(
    async (...args: Parameters<typeof userManagement.unlinkAccount>) => {
      const result = await userManagement.unlinkAccount(...args);
      if (result.success) {
        notifySessionUpdate();
      }
      return result;
    },
    [userManagement, notifySessionUpdate]
  );

  /**
   * Memoized context value
   */
  const contextValue = useMemo<UserManagementContextValue>(
    () => ({
      ...userManagement,
      updateProfile,
      changeEmail,
      changePassword,
      deleteAccount,
      revokeSession,
      revokeOtherSessions,
      revokeAllSessions,
      linkAccount,
      unlinkAccount,
      isFreshSession,
      sessionExpiresAt,
    }),
    [
      userManagement,
      updateProfile,
      changeEmail,
      changePassword,
      deleteAccount,
      revokeSession,
      revokeOtherSessions,
      revokeAllSessions,
      linkAccount,
      unlinkAccount,
      isFreshSession,
      sessionExpiresAt,
    ]
  );

  return (
    <UserManagementContext.Provider value={contextValue}>
      {children}
    </UserManagementContext.Provider>
  );
}

/**
 * Hook to access user management context
 *
 * @throws Error if used outside UserManagementProvider
 * @returns User management context value
 *
 * @example
 * ```tsx
 * const { session, updateProfile, changePassword } = useUserManagementContext();
 * ```
 */
export function useUserManagementContext(): UserManagementContextValue {
  const context = useContext(UserManagementContext);

  if (!context) {
    throw new Error(
      "useUserManagementContext must be used within UserManagementProvider"
    );
  }

  return context;
}

/**
 * Export context for advanced use cases
 */
export { UserManagementContext };
