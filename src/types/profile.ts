import { Gender } from "@/generated/prisma";

/**
 * Profile data interface matching User model fields
 */
export interface ProfileData {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string;
  displayUsername: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  phoneNumber: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  schoolName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile header component props
 */
export interface ProfileHeaderProps {
  user: ProfileData;
}

/**
 * Personal information component props
 */
export interface PersonalInformationProps {
  user: ProfileData;
}

/**
 * Address section component props
 */
export interface AddressSectionProps {
  user: ProfileData;
}

/**
 * Social media link configuration
 */
export interface SocialLink {
  id: string;
  name: string;
  url: string | null;
  icon: React.ComponentType<{ className?: string }>;
}
