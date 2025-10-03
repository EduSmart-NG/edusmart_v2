import { z } from "zod";

// Password validation regex
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Username validation - alphanumeric and underscore only
const usernameRegex = /^[a-zA-Z0-9_]+$/;

// Nigerian phone number format
const phoneNumberRegex = /^\+234[0-9]{10}$/;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      usernameRegex,
      "Username can only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase(),

  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must not exceed 255 characters")
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(
      passwordRegex,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  dateOfBirth: z
    .string()
    .refine((date) => {
      const dob = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      // Check if birthday hasn't occurred this year yet
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        return age - 1 >= 13;
      }

      return age >= 13;
    }, "You must be at least 13 years old to register")
    .refine((date) => {
      const dob = new Date(date);
      return dob <= new Date();
    }, "Date of birth cannot be in the future"),

  gender: z.enum(["MALE", "FEMALE"], {
    message: "Please select a valid gender",
  }),

  phoneNumber: z
    .string()
    .regex(phoneNumberRegex, "Phone number must be in format +234XXXXXXXXXX")
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .max(500, "Address must not exceed 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),

  state: z
    .string()
    .min(1, "State is required")
    .max(100, "State must not exceed 100 characters")
    .trim(),

  lga: z
    .string()
    .min(1, "Local Government Area is required")
    .max(100, "LGA must not exceed 100 characters")
    .trim(),

  schoolName: z
    .string()
    .max(200, "School name must not exceed 200 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Sanitization helper to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .trim();
}

// Validate and sanitize registration data
export function validateAndSanitizeRegistration(
  data: RegisterInput
): RegisterInput {
  const validated = registerSchema.parse(data);

  return {
    ...validated,
    name: sanitizeInput(validated.name),
    username: sanitizeInput(validated.username),
    email: sanitizeInput(validated.email),
    address: validated.address
      ? sanitizeInput(validated.address)
      : validated.address,
    state: sanitizeInput(validated.state),
    lga: sanitizeInput(validated.lga),
    schoolName: validated.schoolName
      ? sanitizeInput(validated.schoolName)
      : validated.schoolName,
  };
}
