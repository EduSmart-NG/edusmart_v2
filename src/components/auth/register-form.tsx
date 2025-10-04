"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerUser, checkUsernameAvailability } from "@/lib/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { NIGERIAN_STATES_AND_LGAS } from "@/lib/utils/nigerianStates";
import { toast } from "sonner";
import { OAuthButtons } from "./oauth-button";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [selectedState, setSelectedState] = useState<string>("");
  const [availableLGAs, setAvailableLGAs] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<
    RegisterInput & { confirmPassword: string }
  >({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "MALE",
    phoneNumber: "",
    address: "",
    state: "",
    lga: "",
    schoolName: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Validate password in real-time
  useEffect(() => {
    const pwd = formData.password;
    setPasswordValidation({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  }, [formData.password]);

  // Debounced username availability check
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.username && formData.username.length >= 3) {
        setCheckingUsername(true);
        const result = await checkUsernameAvailability(formData.username);
        setUsernameAvailable(result.available);
        setCheckingUsername(false);
      } else {
        setUsernameAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

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

  const handleInputChange = (field: keyof typeof formData, value: string) => {
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
      const formattedDate = date.toISOString().split("T")[0];
      handleInputChange("dateOfBirth", formattedDate);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      // ✅ FIXED: Use .issues instead of .errors (Zod v4)
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0].toString()] = issue.message;
        }
      });
    }

    if (usernameAvailable === false) {
      newErrors.username = "Username is already taken";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      const { ...registrationData } = formData;
      const result = await registerUser(registrationData);

      if (result.success) {
        toast.success(result.message);
        router.push("/auth/verify-email");
      } else {
        if (result.errors) {
          setErrors(result.errors);
          Object.entries(result.errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`);
          });
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="bg-blue-100 text-blue-600 flex h-12 w-12 items-center justify-center rounded-full">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-semibold">Create an account</h3>
        <p className="text-gray-600 text-sm max-w-md">
          Enter your information to get started
        </p>
      </div>

      <div className="bg-white px-4 md:px-8 py-6 rounded-lg border shadow-sm">
        <OAuthButtons mode="signup" />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-600">
              Or continue with email
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Personal Information */}
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h4 className="text-lg font-medium">Personal Information</h4>
              <p className="text-sm text-gray-600">
                Basic details about yourself
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    disabled={isLoading}
                    className="pr-10"
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-500" />
                  )}
                  {!checkingUsername &&
                    usernameAvailable === true &&
                    formData.username && (
                      <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
                    )}
                  {!checkingUsername &&
                    usernameAvailable === false &&
                    formData.username && (
                      <X className="absolute right-3 top-3 h-4 w-4 text-red-500" />
                    )}
                </div>
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username}</p>
                )}
                {!errors.username && usernameAvailable === false && (
                  <p className="text-xs text-red-500">
                    Username is already taken
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    handleInputChange("email", e.target.value.toLowerCase())
                  }
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="gender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange("gender", value)}
                  disabled={isLoading}
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
                    disabled={isLoading}
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
                    defaultMonth={new Date(2000, 0)}
                  />
                </PopoverContent>
              </Popover>
              {errors.dateOfBirth && (
                <p className="text-xs text-red-500">{errors.dateOfBirth}</p>
              )}
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
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+2348123456789"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  disabled={isLoading}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main Street, Ikeja"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  disabled={isLoading}
                />
                {errors.address && (
                  <p className="text-xs text-red-500">{errors.address}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.state}
                  onValueChange={handleStateChange}
                  disabled={isLoading}
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

              <div className="grid gap-3">
                <Label htmlFor="lga">
                  Local Government Area <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.lga}
                  onValueChange={(value) => handleInputChange("lga", value)}
                  disabled={isLoading || !selectedState}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        selectedState
                          ? "Select LGA"
                          : "Please select a state first"
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
                {errors.lga && (
                  <p className="text-xs text-red-500">{errors.lga}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="schoolName">School Name (Optional)</Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="Your School Name"
                value={formData.schoolName}
                onChange={(e) =>
                  handleInputChange("schoolName", e.target.value)
                }
                disabled={isLoading}
              />
              {errors.schoolName && (
                <p className="text-xs text-red-500">{errors.schoolName}</p>
              )}
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    Password requirements:
                  </p>
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs ${passwordValidation.length ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordValidation.length ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      At least 8 characters
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${passwordValidation.uppercase ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordValidation.uppercase ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      One uppercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${passwordValidation.lowercase ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordValidation.lowercase ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      One lowercase letter
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${passwordValidation.number ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordValidation.number ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      One number
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs ${passwordValidation.special ? "text-green-600" : "text-gray-500"}`}
                    >
                      {passwordValidation.special ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
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
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pr-10"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            className="w-full md:w-fit md:px-12"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </div>
      </div>

      {/* Terms and Privacy & Sign In Link */}
      <div className="space-y-3">
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in
          </a>
        </p>
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
    </div>
  );
}
