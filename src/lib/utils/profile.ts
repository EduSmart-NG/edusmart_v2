/**
 * Generate user initials from full name
 * @param name - User's full name
 * @returns Initials (max 2 characters)
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== "string") return "U";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format phone number for display
 * @param phone - Phone number string
 * @returns Formatted phone number or null
 */
export function formatPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as international if it starts with country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return phone;
}

/**
 * Format date for display
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not provided";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return "Not provided";

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get display value with fallback
 * @param value - Value to display
 * @param fallback - Fallback text if value is null/undefined
 * @returns Display value or fallback
 */
export function getDisplayValue(
  value: string | null | undefined,
  fallback: string = "Not provided"
): string {
  return value && value.trim() !== "" ? value : fallback;
}

/**
 * Format location (State, LGA)
 * @param state - State name
 * @param lga - LGA name
 * @returns Formatted location string
 */
export function formatLocation(
  state: string | null,
  lga: string | null
): string {
  if (!state && !lga) return "Location not provided";
  if (state && lga) return `${lga}, ${state}`;
  return state || lga || "Location not provided";
}
