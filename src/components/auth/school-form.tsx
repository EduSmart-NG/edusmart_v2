"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Building2, Check, X } from "lucide-react";
import { nigerianStatesAndLGAs } from "@/lib/utils/nigerianStates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SchoolFormProps extends React.ComponentProps<"div"> {
  className?: string;
}

// Predefined class options
const CLASS_OPTIONS = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

// Common subjects
const SUBJECT_OPTIONS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Civic Education",
  "Economics",
  "Commerce",
  "Agricultural Science",
  "Computer Science",
  "Fine Arts",
  "Music",
  "French",
  "Hausa",
  "Igbo",
  "Yoruba",
  "Literature in English",
  "Government",
  "Christian Religious Studies",
  "Islamic Studies",
  "Technical Drawing",
  "Home Economics",
  "Physical Education",
];

export function SchoolForm({ className, ...props }: SchoolFormProps) {
  return (
    <div className={`flex flex-col gap-6 ${className}`} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="bg-blue-100 text-blue-600 flex h-12 w-12 items-center justify-center rounded-full">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-semibold">Complete your registration</h3>
        <p className="text-gray-600 text-sm max-w-md">
          Please provide your school and admin details to complete the
          registration process.
        </p>
      </div>

      <div className="flex flex-col gap-6 bg-white px-4 md:px-8 py-8 rounded-lg border shadow-sm">
        {/* School Information */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">School Information</h4>
            <p className="text-sm text-gray-600">
              Basic details about your school
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="schoolName">
                School Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="Lagos State Model College"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="schoolType">
                School Type <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select school type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="address">
                School Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="Plot 15, Independence Layout, Victoria Island"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://lsmc.edu.ng"
              />
            </div>
          </div>
        </div>

        {/* Admin Information */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">Administrator Information</h4>
            <p className="text-sm text-gray-600">
              Details of the school administrator
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="adminFirstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input id="adminFirstName" type="text" placeholder="Sarah" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="adminMiddleName">Middle Name (Optional)</Label>
              <Input id="adminMiddleName" type="text" placeholder="Chioma" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="adminLastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input id="adminLastName" type="text" placeholder="Okafor" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input id="email" type="email" placeholder="admin@lsmc.edu.ng" />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input id="phoneNumber" type="tel" placeholder="+2348123456789" />
            </div>
          </div>
        </div>

        {/* Classes and Subjects */}
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h4 className="text-lg font-medium">Academic Information</h4>
            <p className="text-sm text-gray-600">
              Select classes and subjects offered at your school
            </p>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label>
                Classes <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {CLASS_OPTIONS.map((className) => (
                  <div
                    key={className}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <Checkbox id={`class-${className}`} />
                    <Label
                      htmlFor={`class-${className}`}
                      className="text-sm cursor-pointer"
                    >
                      {className}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500">
                Please select at least one class level
              </p>
            </div>

            <div className="grid gap-3">
              <Label>
                Subjects Offered <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {SUBJECT_OPTIONS.map((subject) => (
                  <div
                    key={subject}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <Checkbox id={`subject-${subject}`} />
                    <Label
                      htmlFor={`subject-${subject}`}
                      className="text-sm cursor-pointer"
                    >
                      {subject}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-500">
                Please select at least one subject offered
              </p>
            </div>
          </div>
        </div>

        {/* Password Fields */}
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

        <Button
          className="w-full md:w-fit md:px-12 bg-blue-600 hover:bg-blue-700"
          disabled
        >
          Complete Registration
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
