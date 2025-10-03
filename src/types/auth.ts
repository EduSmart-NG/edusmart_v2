import { Gender } from "@/generated/prisma";
import type { RegisterInput } from "@/lib/validations/auth";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string;
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string | null;
  address: string | null;
  state: string;
  lga: string;
  schoolName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationFormData extends RegisterInput {
  confirmPassword?: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  redirectTo?: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface OAuthProvider {
  id: "google" | "facebook" | "tiktok";
  name: string;
  icon: string;
}

export const oAuthProviders: OAuthProvider[] = [
  { id: "google", name: "Google", icon: "google" },
  { id: "facebook", name: "Facebook", icon: "facebook" },
  { id: "tiktok", name: "TikTok", icon: "tiktok" },
];

export interface LocationData {
  state: string;
  lgas: string[];
}

export interface RegistrationStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
}
