"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/actions/user-management";
import { NIGERIAN_STATES_AND_LGAS } from "@/lib/utils/nigerianStates";
import type {
  SessionData,
  UpdateUserProfileInput,
} from "@/types/user-management";
import { Gender } from "@/generated/prisma";

interface UpdateProfileFormProps {
  session: SessionData;
  onSuccess?: (updates: Partial<UpdateUserProfileInput>) => void;
}

export function UpdateProfileForm({
  session,
  onSuccess,
}: UpdateProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedState, setSelectedState] = useState<string>(
    session.user.state || ""
  );
  const [availableLGAs, setAvailableLGAs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    session.user.dateOfBirth ? new Date(session.user.dateOfBirth) : undefined
  );
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState<UpdateUserProfileInput>({
    name: session.user.name || "",
    phoneNumber: session.user.phoneNumber || "",
    address: session.user.address || "",
    state: session.user.state || "",
    lga: session.user.lga || "",
    schoolName: session.user.schoolName || "",
    dateOfBirth: session.user.dateOfBirth || undefined,
    gender: session.user.gender || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update available LGAs when state changes
  useEffect(() => {
    if (selectedState) {
      const stateData = NIGERIAN_STATES_AND_LGAS.find(
        (item) => item.state === selectedState
      );
      if (stateData) {
        setAvailableLGAs(stateData.lgas);
      }
    } else {
      setAvailableLGAs([]);
    }
  }, [selectedState]);

  const handleInputChange = (
    field: keyof UpdateUserProfileInput,
    value: string | Date | Gender
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleStateChange = (value: string) => {
    setSelectedState(value);
    setFormData((prev) => ({ ...prev, state: value, lga: "" }));
    if (errors.state) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.state;
        return newErrors;
      });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      handleInputChange("dateOfBirth", date);
      setDatePickerOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Filter out unchanged fields
    const changedFields: Partial<UpdateUserProfileInput> = {};

    (Object.keys(formData) as Array<keyof UpdateUserProfileInput>).forEach(
      (field) => {
        const currentValue = formData[field];
        const originalValue = session.user[field];

        // Compare values - handle Date objects specially
        let hasChanged = false;
        if (currentValue instanceof Date && originalValue instanceof Date) {
          hasChanged = currentValue.getTime() !== originalValue.getTime();
        } else if (
          currentValue instanceof Date &&
          typeof originalValue === "string"
        ) {
          hasChanged =
            currentValue.getTime() !== new Date(originalValue).getTime();
        } else {
          hasChanged =
            currentValue !== originalValue &&
            currentValue !== undefined &&
            currentValue !== "";
        }

        if (hasChanged) {
          // Type-safe assignment based on field type
          if (field === "name" && typeof currentValue === "string") {
            changedFields.name = currentValue;
          } else if (
            field === "phoneNumber" &&
            typeof currentValue === "string"
          ) {
            changedFields.phoneNumber = currentValue;
          } else if (field === "address" && typeof currentValue === "string") {
            changedFields.address = currentValue;
          } else if (field === "state" && typeof currentValue === "string") {
            changedFields.state = currentValue;
          } else if (field === "lga" && typeof currentValue === "string") {
            changedFields.lga = currentValue;
          } else if (
            field === "schoolName" &&
            typeof currentValue === "string"
          ) {
            changedFields.schoolName = currentValue;
          } else if (field === "dateOfBirth" && currentValue instanceof Date) {
            changedFields.dateOfBirth = currentValue;
          } else if (
            field === "gender" &&
            (currentValue === "MALE" || currentValue === "FEMALE")
          ) {
            changedFields.gender = currentValue;
          }
        }
      }
    );

    // Check if any fields were changed
    if (Object.keys(changedFields).length === 0) {
      toast.info("No changes detected");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUserProfile(changedFields);

        if (result.success) {
          // Only update UI and close dialog on successful API response
          onSuccess?.(changedFields);
          toast.success(result.message);
        } else {
          toast.error(result.message);
          if (result.error) {
            // Parse validation errors if present
            try {
              const validationErrors = JSON.parse(result.error);
              setErrors(validationErrors);
            } catch {
              // If not JSON, show as general error
              toast.error(result.error);
            }
          }
          // Don't close dialog on error so user can see errors and retry
        }
      } catch (error) {
        console.error("Profile update error:", error);
        toast.error("An unexpected error occurred. Please try again.");
        // Don't close dialog on error
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name and Phone Number */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={isPending}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+234 800 000 0000"
            value={formData.phoneNumber || ""}
            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            disabled={isPending}
          />
          {errors.phoneNumber && (
            <p className="text-xs text-red-500">{errors.phoneNumber}</p>
          )}
        </div>
      </div>

      {/* Date of Birth and Gender */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="dateOfBirth"
                className="w-full justify-between bg-transparent font-normal"
                type="button"
                disabled={isPending}
              >
                {selectedDate
                  ? selectedDate.toLocaleDateString()
                  : "YYYY/MM/DD"}
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-full overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
                defaultMonth={selectedDate || new Date(2000, 0)}
              />
            </PopoverContent>
          </Popover>
          {errors.dateOfBirth && (
            <p className="text-xs text-red-500">{errors.dateOfBirth}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender || ""}
            onValueChange={(value) =>
              handleInputChange("gender", value as Gender)
            }
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-xs text-red-500">{errors.gender}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          placeholder="123 Main Street"
          value={formData.address || ""}
          onChange={(e) => handleInputChange("address", e.target.value)}
          disabled={isPending}
        />
        {errors.address && (
          <p className="text-xs text-red-500">{errors.address}</p>
        )}
      </div>

      {/* State and LGA */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select
            value={formData.state || ""}
            onValueChange={handleStateChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES_AND_LGAS.map((item) => (
                <SelectItem key={item.state} value={item.state}>
                  {item.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && (
            <p className="text-xs text-red-500">{errors.state}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lga">Local Government Area</Label>
          <Select
            value={formData.lga || ""}
            onValueChange={(value) => handleInputChange("lga", value)}
            disabled={isPending || !selectedState}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  selectedState ? "Select LGA" : "Select a state first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableLGAs.map((lga) => (
                <SelectItem key={lga} value={lga}>
                  {lga}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.lga && <p className="text-xs text-red-500">{errors.lga}</p>}
        </div>
      </div>

      {/* School Name */}
      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name (Optional)</Label>
        <Input
          id="schoolName"
          type="text"
          placeholder="Your school name"
          value={formData.schoolName || ""}
          onChange={(e) => handleInputChange("schoolName", e.target.value)}
          disabled={isPending}
        />
        {errors.schoolName && (
          <p className="text-xs text-red-500">{errors.schoolName}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Update Profile
      </Button>
    </form>
  );
}
