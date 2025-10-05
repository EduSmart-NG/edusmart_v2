import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { SessionData } from "@/types/user-management";

/**
 * Get Current Session (Cached)
 *
 * This function uses React's `cache()` to ensure the session is only
 * fetched once per request, even if called multiple times in different
 * Server Components.
 *
 * Benefits:
 * - Reduces database queries
 * - Improves performance
 * - Maintains consistency across components in the same request
 *
 * Usage:
 * ```typescript
 * import { getSession } from "@/lib/session";
 *
 * export default async function Page() {
 *   const session = await getSession();
 *   if (!session) redirect("/auth/login");
 *   return <div>Welcome {session.user.name}</div>;
 * }
 * ```
 *
 * @returns Session data or null if not authenticated
 */
export const getSession = cache(async (): Promise<SessionData | null> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session as SessionData | null;
  } catch (error) {
    console.error("Error fetching session:", error);
    return null;
  }
});

/**
 * Get Current User (Cached)
 *
 * Convenience function to get just the user object from the session.
 *
 * @returns User data or null if not authenticated
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user || null;
});

/**
 * Require Authentication
 *
 * Throws an error if the user is not authenticated.
 * Use this in Server Actions or API Routes where you want to ensure
 * the user is logged in.
 *
 * Usage:
 * ```typescript
 * "use server";
 *
 * export async function deleteAccount() {
 *   const session = await requireAuth();
 *   // session is guaranteed to exist here
 *   await prisma.user.delete({ where: { id: session.user.id } });
 * }
 * ```
 *
 * @throws {Error} If user is not authenticated
 * @returns Session data (guaranteed to be non-null)
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}

/**
 * Check if user has specific role
 *
 * Example for future role-based access control (RBAC)
 * Uncomment and modify when you add roles to your user model
 *
 * @param role - Required role
 * @returns True if user has the role
 */
/*
export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  
  // Assuming you add a 'role' field to your user model
  return session.user.role === role;
}
*/

/**
 * Get User ID
 *
 * Convenience function to get just the user ID.
 * Useful for database queries.
 *
 * @returns User ID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id || null;
}
