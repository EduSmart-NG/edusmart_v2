"use client";

import { generateBackupCodes, viewBackupCodes } from "@/lib/actions/two-factor";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import {
  AlertTriangle,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";

interface BackupCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupCodesModal({
  open,
  onOpenChange,
}: BackupCodesModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"view" | "regenerate">("view");

  const handleViewCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await viewBackupCodes({ password });

      if (result.success && result.data) {
        setCodes(result.data.backupCodes);
        toast.success("Backup codes retrieved successfully", {
          description: "Save these codes in a secure place.",
        });
      } else {
        toast.error(result.message || "Failed to retrieve backup codes", {
          description: "Please check your password and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to retrieve backup codes", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("View backup codes error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await generateBackupCodes({ password });

      if (result.success && result.data) {
        setCodes(result.data.backupCodes);
        setActiveTab("view");
        toast.success("New backup codes generated", {
          description:
            "Old codes are now invalid. Save the new codes immediately.",
        });
      } else {
        toast.error(result.message || "Failed to generate backup codes", {
          description: "Please check your password and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to generate backup codes", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Generate backup codes error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    toast.success("Backup codes copied to clipboard", {
      description: "Make sure to save them in a secure place.",
    });
  };

  const downloadBackupCodes = () => {
    const content = `EduSmart Backup Codes\n\nSave these codes in a secure place. Each code can only be used once.\n\n${codes.join("\n")}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edusmart-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes saved to file", {
      description: "Keep this file in a secure location.",
    });
  };

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setCodes([]);
    setActiveTab("view");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backup Codes</DialogTitle>
          <DialogDescription>
            View or regenerate your backup codes
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "view" | "regenerate")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">View Codes</TabsTrigger>
            <TabsTrigger value="regenerate">Regenerate</TabsTrigger>
          </TabsList>

          {/* View Codes Tab */}
          <TabsContent value="view" className="space-y-4">
            {codes.length === 0 ? (
              <form onSubmit={handleViewCodes} className="space-y-4">
                <div>
                  <Label htmlFor="view-password">Password *</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="view-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                  Password verification is required for security
                </div>

                <Button
                  type="submit"
                  disabled={!password || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "View Backup Codes"
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-yellow-50 p-4 text-sm text-yellow-900">
                  Save these codes securely. Each code can only be used once.
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4">
                  {codes.map((code, index) => (
                    <div key={index} className="font-mono text-sm">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={copyBackupCodes}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={downloadBackupCodes}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Regenerate Codes Tab */}
          <TabsContent value="regenerate" className="space-y-4">
            <form onSubmit={handleRegenerateCodes} className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <div className="text-sm text-red-900">
                    <p className="font-medium">
                      This will invalidate all old codes
                    </p>
                    <p className="mt-1">
                      Any previously generated backup codes will no longer work.
                      Save the new codes immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="regen-password">Password *</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="regen-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!password || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Codes
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
