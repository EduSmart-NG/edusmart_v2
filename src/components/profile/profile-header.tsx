"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Facebook,
  Instagram,
  Linkedin,
  Pencil,
  Twitter,
  Camera,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getInitials, formatLocation } from "@/lib/utils/profile";
import { uploadAvatar, deleteAvatar } from "@/lib/actions/avatar-upload";
import { authClient } from "@/lib/auth-client";
import type { ProfileHeaderProps } from "@/types/profile";

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const location = formatLocation(user.state, user.lga);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUrl, setImageUrl] = useState(user.image);
  const [showActions, setShowActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Update imageUrl when user prop changes
  useEffect(() => {
    setImageUrl(user.image);
  }, [user.image]);

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showActions]);

  const handleAvatarClick = () => {
    setShowActions(!showActions);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setShowActions(false);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_SIZE) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("avatar", file);

      // Upload avatar
      const result = await uploadAvatar(formData);

      if (result.success && result.data) {
        // Update local state immediately for better UX
        setImageUrl(result.data.imageUrl);
        toast.success(result.message);

        // Refresh session to get updated data
        await authClient.getSession({ query: { disableCookieCache: true } });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    setShowActions(false);
    setIsDeleting(true);

    try {
      const result = await deleteAvatar();

      if (result.success) {
        // Update local state immediately
        setImageUrl(null);
        toast.success(result.message);

        // Refresh session
        await authClient.getSession({ query: { disableCookieCache: true } });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete avatar");
    } finally {
      setIsDeleting(false);
    }
  };

  console.log(`Avatar: ${user.image}`);

  return (
    <div className="mb-8 rounded-lg border bg-white p-6 lg:p-8">
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left section: Avatar and user info */}
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center">
          {/* Avatar with upload functionality */}
          <div ref={avatarRef} className="relative">
            <Avatar
              className="size-20 cursor-pointer lg:size-24"
              onClick={handleAvatarClick}
            >
              <AvatarImage src={imageUrl || undefined} alt={user.name} />
              <AvatarFallback className="text-xl font-semibold lg:text-2xl">
                {isUploading || isDeleting ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : (
                  getInitials(user.name)
                )}
              </AvatarFallback>
            </Avatar>

            {/* Upload overlay on hover */}
            <div
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100"
              onClick={handleAvatarClick}
            >
              <Camera className="size-6 text-white lg:size-8" />
            </div>

            {/* Action buttons dropdown */}
            {showActions && !isUploading && !isDeleting && (
              <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-lg border bg-white shadow-lg">
                <button
                  onClick={handleFileSelect}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <Camera className="size-4" />
                  {imageUrl ? "Change Photo" : "Upload Photo"}
                </button>
                {imageUrl && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="size-4" />
                    Remove Photo
                  </button>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading || isDeleting}
            />
          </div>

          {/* User info */}
          <div className="flex flex-col items-center gap-2 lg:items-start">
            <h4>{user.name}</h4>
            <div className="flex flex-col items-center gap-1 text-sm text-gray-600 lg:items-start">
              {user.schoolName && (
                <p className="font-medium">@{user.displayUsername}</p>
              )}
              <p>{location}</p>
            </div>
          </div>
        </div>

        {/* Right section: Social links and Edit button */}
        <div className="flex flex-col items-center gap-4 lg:items-end">
          {/* Social media icons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-10 cursor-pointer rounded-full"
              aria-label="Facebook"
            >
              <Facebook className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10 cursor-pointer rounded-full"
              aria-label="Twitter"
            >
              <Twitter className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10 cursor-pointer rounded-full"
              aria-label="LinkedIn"
            >
              <Linkedin className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10 cursor-pointer rounded-full"
              aria-label="Instagram"
            >
              <Instagram className="size-5" />
            </Button>
          </div>

          {/* Edit button */}
          <Button
            variant="outline"
            className="w-full cursor-pointer gap-2 lg:w-auto"
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
