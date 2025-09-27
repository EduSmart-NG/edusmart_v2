"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Eye, EyeOff, CheckCircle, Check, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nigerianStatesAndLGAs } from "@/lib/utils/nigerianStates";

export interface StudentFormProps extends React.ComponentProps<"div"> {
  className?: string;
}

export function StudentForm({ className, ...props }: StudentFormProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="bg-blue-100 text-blue-600 flex h-12 w-12 items-center justify-center rounded-full">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-semibold">Complete your registration</h3>
        <p className="text-gray-600 text-sm max-w-md">
          Please provide your personal details to create your student account
        </p>
      </div>

      <div className="flex flex-col gap-6 bg-white px-4 md:px-8 py-8 rounded-lg border shadow-sm">
        {/* Personal Information */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">Personal Information</h4>
            <p className="text-sm text-gray-600">
              Basic details about yourself
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input id="firstName" type="text" placeholder="John" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="middleName">Middle Name (Optional)</Label>
              <Input id="middleName" type="text" placeholder="William" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input id="lastName" type="text" placeholder="Doe" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input id="username" type="text" placeholder="johndoe123" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="gender">
                Gender <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="dateOfBirth"
                    className="w-full justify-between font-normal bg-transparent"
                    type="button"
                  >
                    YYYY/MM/DD
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-full overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear() - 9}
                    defaultMonth={new Date(2010, 0)}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-gray-600 text-xs">
                You must be at least 9 years old to register
              </p>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input id="email" type="email" placeholder="john@example.com" />
              <p className="text-xs text-gray-600">
                This must match your verified email address
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Location Information */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">Contact & Location</h4>
            <p className="text-sm text-gray-600">
              Where you can be reached and located
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input id="phoneNumber" type="tel" placeholder="+2348123456789" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main Street, Ikeja"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="state">
                State <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStatesAndLGAs.map((item) => (
                    <SelectItem key={item.state} value={item.state}>
                      {item.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="lga">
                Local Government Area <span className="text-red-500">*</span>
              </Label>
              <Select disabled>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Please select a state first" />
                </SelectTrigger>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="schoolName">School Name (Optional)</Label>
            <Input id="schoolName" type="text" placeholder="My School" />
            <p className="text-xs text-gray-600">
              Reference to your current school (if applicable)
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">Security</h4>
            <p className="text-sm text-gray-600">
              Create a secure password for your account
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div className="grid gap-3">
              <Label htmlFor="password">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  <Eye className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">
                  Password requirements:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="h-3 w-3" />
                    At least 8 characters
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="h-3 w-3" />
                    One uppercase letter
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="h-3 w-3" />
                    One lowercase letter
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="h-3 w-3" />
                    One number
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <X className="h-3 w-3" />
                    One special character
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  <Eye className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full md:w-fit md:px-12 bg-blue-600 hover:bg-blue-700"
          disabled
        >
          Create Student Account
        </Button>
      </div>

      {/* Terms and Privacy */}
      <div className="text-gray-600 text-center text-xs">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="underline underline-offset-4">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
