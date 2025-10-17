import { useCallback, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

/**
 * reCAPTCHA action types for different authentication operations
 */
export type ReCaptchaAction =
  | "signup"
  | "signin"
  | "forgot_password"
  | "reset_password"
  | "resend_verification"
  | "exam_create"
  | "exam_update";

/**
 * Hook return type
 */
interface UseRecaptchaTokenReturn {
  /**
   * Generate a reCAPTCHA token for a specific action
   * @param action - The action being performed (e.g., 'signup', 'signin')
   * @returns Promise<string | null> - The reCAPTCHA token, or null if generation fails
   */
  generateToken: (action: ReCaptchaAction) => Promise<string | null>;

  /**
   * Whether token generation is in progress
   */
  isLoading: boolean;

  /**
   * Error message if token generation fails
   */
  error: string | null;
}

/**
 * Custom hook for generating reCAPTCHA v3 tokens
 *
 * This hook provides a convenient way to generate reCAPTCHA tokens
 * for form submissions. It handles loading states and errors automatically.
 *
 * Usage:
 * ```tsx
 * const { generateToken, isLoading, error } = useRecaptchaToken();
 *
 * const handleSubmit = async () => {
 *   const token = await generateToken('signin');
 *   if (token) {
 *     // Use token in API call
 *   }
 * };
 * ```
 *
 * @returns Object with generateToken function, loading state, and error
 */
export function useRecaptchaToken(): UseRecaptchaTokenReturn {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a reCAPTCHA token for the specified action
   */
  const generateToken = useCallback(
    async (action: ReCaptchaAction): Promise<string | null> => {
      // Clear previous errors
      setError(null);

      // Check if reCAPTCHA is available
      if (!executeRecaptcha) {
        const errorMsg = "reCAPTCHA not yet available. Please try again.";
        console.warn(errorMsg);
        setError(errorMsg);
        return null;
      }

      setIsLoading(true);

      try {
        // Execute reCAPTCHA and get token
        const token = await executeRecaptcha(action);

        if (!token) {
          const errorMsg = "Failed to generate reCAPTCHA token.";
          console.error(errorMsg);
          setError(errorMsg);
          return null;
        }

        // Log for debugging (remove in production if needed)
        console.log(`reCAPTCHA token generated for action: ${action}`);

        return token;
      } catch (err) {
        const errorMsg = "Error generating reCAPTCHA token.";
        console.error(errorMsg, err);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [executeRecaptcha]
  );

  return {
    generateToken,
    isLoading,
    error,
  };
}
