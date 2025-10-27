"use client";

import { useEffect, useRef, useCallback } from "react";
import { AntiCheatState } from "./use-exam-session";

interface UseAntiCheatProps {
  isEnabled: boolean;
  antiCheatState: AntiCheatState;
  setAntiCheatState: React.Dispatch<React.SetStateAction<AntiCheatState>>;
  onViolation: (type: "tab_switch" | "window_blur" | "copy_attempt" | "paste_attempt" | "fullscreen_exit", metadata?: Record<string, unknown>) => void;
  examCategory: "practice" | "test" | "recruitment" | "competition" | "challenge";
}

export function useAntiCheat({
  isEnabled,
  antiCheatState,
  setAntiCheatState,
  onViolation,
  examCategory,
}: UseAntiCheatProps) {
  const focusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tab visibility monitoring
  useEffect(() => {
    if (!isEnabled) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setAntiCheatState(prev => ({ ...prev, isTabVisible: isVisible }));

      if (!isVisible) {
        onViolation("tab_switch", { 
          timestamp: new Date().toISOString(),
          visibilityState: document.visibilityState 
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isEnabled, setAntiCheatState, onViolation]);

  // Window focus monitoring
  useEffect(() => {
    if (!isEnabled) return;

    const handleWindowBlur = () => {
      setAntiCheatState(prev => ({ ...prev, hasWindowFocus: false }));
      onViolation("window_blur", { 
        timestamp: new Date().toISOString(),
        documentHasFocus: document.hasFocus() 
      });
    };

    const handleWindowFocus = () => {
      setAntiCheatState(prev => ({ ...prev, hasWindowFocus: true }));
    };

    // Additional focus checking with document.hasFocus()
    const checkFocus = () => {
      const currentlyHasFocus = document.hasFocus();
      if (!currentlyHasFocus && antiCheatState.hasWindowFocus) {
        setAntiCheatState(prev => ({ ...prev, hasWindowFocus: false }));
        onViolation("window_blur", { 
          timestamp: new Date().toISOString(),
          source: "focus_check_interval",
          documentHasFocus: false 
        });
      } else if (currentlyHasFocus && !antiCheatState.hasWindowFocus) {
        setAntiCheatState(prev => ({ ...prev, hasWindowFocus: true }));
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    
    // Start focus checking interval for stricter monitoring
    focusCheckIntervalRef.current = setInterval(checkFocus, 2000);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
      }
    };
  }, [isEnabled, antiCheatState.hasWindowFocus, setAntiCheatState, onViolation]);

  // Keyboard shortcuts blocking
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { ctrlKey, shiftKey, key, metaKey, altKey } = e;

      // Block common shortcuts
      if (ctrlKey || metaKey) {
        const blockedKeys = ["t", "n", "r", "w", "u", "s", "p"];
        if (blockedKeys.includes(key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Block Ctrl+Shift+I (DevTools)
        if (shiftKey && key.toLowerCase() === "i") {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Block F12 (DevTools)
      if (key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Alt+Tab
      if (altKey && key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isEnabled]);

  // Copy/Paste monitoring
  useEffect(() => {
    if (!isEnabled) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation("copy_attempt", { 
        timestamp: new Date().toISOString(),
        selection: window.getSelection()?.toString() || ""
      });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation("paste_attempt", { 
        timestamp: new Date().toISOString()
      });
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation("copy_attempt", { 
        timestamp: new Date().toISOString(),
        type: "cut",
        selection: window.getSelection()?.toString() || ""
      });
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
    };
  }, [isEnabled, onViolation]);

  // Fullscreen monitoring for strict exam types
  useEffect(() => {
    if (!isEnabled || examCategory === "practice") return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setAntiCheatState(prev => ({ ...prev, isFullscreen: isCurrentlyFullscreen }));

      // If exiting fullscreen in strict mode, record violation
      if (!isCurrentlyFullscreen && antiCheatState.isFullscreen) {
        onViolation("fullscreen_exit", { 
          timestamp: new Date().toISOString(),
          examCategory 
        });

        // For recruitment/competition, force re-enter fullscreen
        if (["recruitment", "competition", "challenge"].includes(examCategory)) {
          fullscreenTimeoutRef.current = setTimeout(() => {
            if (containerRef.current && !document.fullscreenElement) {
              containerRef.current.requestFullscreen().catch(console.error);
            }
          }, 100);
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (fullscreenTimeoutRef.current) {
        clearTimeout(fullscreenTimeoutRef.current);
      }
    };
  }, [isEnabled, examCategory, antiCheatState.isFullscreen, setAntiCheatState, onViolation]);

  // Context menu blocking
  useEffect(() => {
    if (!isEnabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [isEnabled]);

  // Mouse leave detection for strict exam types
  useEffect(() => {
    if (!isEnabled || examCategory === "practice") return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse completely leaves the viewport
      if (
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        onViolation("window_blur", { 
          timestamp: new Date().toISOString(),
          type: "mouse_leave",
          coordinates: { x: e.clientX, y: e.clientY }
        });
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isEnabled, examCategory, onViolation]);

  // Auto-enter fullscreen for strict exam types
  const enterFullscreen = useCallback(async () => {
    if (containerRef.current && !document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setAntiCheatState(prev => ({ ...prev, isFullscreen: true }));
        return true;
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
        return false;
      }
    }
    return false;
  }, [setAntiCheatState]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setAntiCheatState(prev => ({ ...prev, isFullscreen: false }));
        return true;
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
        return false;
      }
    }
    return false;
  }, [setAntiCheatState]);

  // Auto-enter fullscreen on component mount for strict exams
  useEffect(() => {
    if (isEnabled && ["test", "recruitment", "competition", "challenge"].includes(examCategory)) {
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isEnabled, examCategory, enterFullscreen]);

  return {
    containerRef,
    enterFullscreen,
    exitFullscreen,
  };
}