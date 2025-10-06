"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  HelpCircle,
  LogOut,
  Shield,
} from "lucide-react";
import {
  listUserSessions,
  revokeUserSession,
  revokeOtherUserSessions,
} from "@/lib/actions/user-management";
import { parseUserAgent, formatDeviceInfo } from "@/lib/utils/device-parser";
import type { DeviceSession } from "@/types/user-management";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import SettingsLoading from "@/components/dashboard/settings/settings-loading";

export default function ActiveSessionsClient() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [showRevokeAllModal, setShowRevokeAllModal] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const result = await listUserSessions();
      if (result.success && result.data) {
        // Parse user agent for each session
        const sessionsWithDeviceInfo = result.data.map((session) => ({
          ...session,
          deviceInfo: session.userAgent
            ? parseUserAgent(session.userAgent)
            : undefined,
        }));
        setSessions(sessionsWithDeviceInfo);
      } else {
        toast.error("Failed to load sessions", {
          description: "Please refresh the page and try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to load sessions", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Load sessions error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (token: string, isCurrent: boolean) => {
    if (isCurrent) {
      toast.error("Cannot revoke current session", {
        description: "You cannot sign out from your current session.",
      });
      return;
    }

    setRevokingSession(token);

    try {
      const result = await revokeUserSession(token);

      if (result.success) {
        toast.success("Session revoked successfully", {
          description: "The device has been signed out.",
        });
        await loadSessions();
      } else {
        toast.error(result.message || "Failed to revoke session", {
          description: "Please try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to revoke session", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Revoke session error:", error);
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllOther = async () => {
    setIsRevokingAll(true);

    try {
      const result = await revokeOtherUserSessions();

      if (result.success) {
        toast.success("All other sessions revoked", {
          description: `${result.revokedCount || 0} session(s) have been signed out.`,
        });
        setShowRevokeAllModal(false);
        await loadSessions();
      } else {
        toast.error(result.message || "Failed to revoke sessions", {
          description: "Please try again.",
        });
      }
    } catch (error) {
      toast.error("Failed to revoke sessions", {
        description: "An unexpected error occurred. Please try again.",
      });
      console.error("Revoke all sessions error:", error);
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIconComponent = (deviceType: string) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-6 w-6" />;
      case "tablet":
        return <Tablet className="h-6 w-6" />;
      case "desktop":
        return <Monitor className="h-6 w-6" />;
      default:
        return <HelpCircle className="h-6 w-6" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  if (isLoading) {
    return <SettingsLoading />;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        {otherSessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowRevokeAllModal(true)}
            className="border-red-600 text-red-600 hover:bg-red-50 max-sm:w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Revoke All Other Sessions
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h4>No active sessions</h4>
          <p className="mt-2">
            You don&lsquo;t have any active sessions at the moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <div
              key={session.id || session.token || index}
              className={`rounded-lg border p-6 ${
                session.isCurrent ? "border-green-200 bg-green-50" : "bg-white"
              }`}
            >
              <div className="flex max-sm:flex-col gap-4 items-start justify-between">
                <div className="flex max-sm:flex-col gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      session.isCurrent
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {session.deviceInfo ? (
                      getDeviceIconComponent(session.deviceInfo.deviceType)
                    ) : (
                      <HelpCircle className="h-6 w-6" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex max-sm:flex-col gap-2">
                      <h4>
                        {session.deviceInfo
                          ? formatDeviceInfo(session.deviceInfo)
                          : "Unknown Device"}
                      </h4>
                      {session.isCurrent && (
                        <div className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 flex items-center">
                          <span>Current Session</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {session.deviceInfo?.browser && (
                        <p>
                          <span className="font-medium">Browser:</span>{" "}
                          {session.deviceInfo.browser}
                          {session.deviceInfo.browserVersion &&
                            ` ${session.deviceInfo.browserVersion}`}
                        </p>
                      )}
                      {session.deviceInfo?.os && (
                        <p>
                          <span className="font-medium">Operating System:</span>{" "}
                          {session.deviceInfo.os}
                          {session.deviceInfo.osVersion &&
                            ` ${session.deviceInfo.osVersion}`}
                        </p>
                      )}
                      {session.ipAddress && (
                        <p>
                          <span className="font-medium">IP Address:</span>{" "}
                          {session.ipAddress}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Signed in:</span>{" "}
                        {formatDate(session.createdAt)}
                      </p>
                      <p>
                        <span className="font-medium">Expires:</span>{" "}
                        {formatDate(session.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleRevokeSession(session.token, session.isCurrent)
                    }
                    disabled={revokingSession === session.token}
                    className="border-red-600 text-red-600 hover:bg-red-50 max-sm:w-full"
                  >
                    {revokingSession === session.token ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Revoking...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Revoke
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Tips */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h4 className="text-blue-900">Session Security Tips</h4>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>
              Revoke any sessions you don&lsquo;t recognize immediately
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>Sign out from devices you no longer use regularly</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>Enable two-factor authentication for extra security</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>Change your password if you see suspicious activity</span>
          </li>
        </ul>
      </div>

      {/* Revoke All Modal */}
      <Dialog open={showRevokeAllModal} onOpenChange={setShowRevokeAllModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke All Other Sessions?</DialogTitle>
            <DialogDescription>
              This will sign you out from all devices except this one.
              You&lsquo;ll need to sign in again on those devices.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-900">
              <strong>
                You&lsquo;re about to revoke {otherSessions.length} session(s):
              </strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-yellow-800">
              {otherSessions.slice(0, 3).map((session, index) => (
                <li key={session.id || session.token || index}>
                  •{" "}
                  {session.deviceInfo
                    ? formatDeviceInfo(session.deviceInfo)
                    : "Unknown Device"}
                </li>
              ))}
              {otherSessions.length > 3 && (
                <li>• And {otherSessions.length - 3} more...</li>
              )}
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeAllModal(false)}
              disabled={isRevokingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAllOther}
              disabled={isRevokingAll}
            >
              {isRevokingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
