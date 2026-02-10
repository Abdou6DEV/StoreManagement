import React, { useRef, useEffect } from "react";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../hooks/useTheme";
import { LOGO_ICON, LOGO_ICON_DARK } from "../assets";
import PreloadLoading from "./preloadLoading";

const LOGO_HOLD_MS = 500;   // sit still after mount to avoid flicker feeling
const LOGO_DOWN_DURATION_MS = 600;
const LOGO_TOTAL_ANIMATION_MS = LOGO_HOLD_MS + LOGO_DOWN_DURATION_MS;

interface LoginToPreloadTransitionProps {
  onPreloadComplete?: () => void;
}

/**
 * Shown after successful login: logo holds for a moment (masks mount flicker), then moves down.
 * Preload content fades in after the move. One stable layout so no jump.
 */
export default function LoginToPreloadTransition({ onPreloadComplete }: LoginToPreloadTransitionProps) {
  const { justLoggedIn, markLoginTransitionDone } = useAuth();
  const { isDark } = useTheme();
  const transitionDoneRef = useRef(false);

  useEffect(() => {
    if (!justLoggedIn || transitionDoneRef.current) return;
    const t = setTimeout(() => {
      transitionDoneRef.current = true;
      markLoginTransitionDone();
    }, LOGO_TOTAL_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [justLoggedIn, markLoginTransitionDone]);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center">
      <style>{`
        @keyframes logoDownToPreload {
          0%, 33.33% {
            transform: translateY(-14vh);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Same layout as PreloadLoading: one column so logo position never jumps */}
      <div className="flex flex-col items-center w-full max-w-md px-4">
        {/* Logo: hold then move down; will-change avoids wrong first-paint position (flicker) */}
        <div
          className="mb-4 flex items-center justify-center flex-shrink-0 w-full"
          style={{
            transform: justLoggedIn ? "translateY(-14vh)" : undefined,
            animation: justLoggedIn
              ? `logoDownToPreload ${LOGO_TOTAL_ANIMATION_MS}ms ease-out forwards`
              : "none",
            ...(justLoggedIn ? { willChange: "transform" as const } : {}),
          }}
        >
          <img
            src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
            alt=""
            className="w-50 h-50 object-contain select-none animate-pulse"
          />
        </div>
        {/* Preload content: always in DOM (reserves space), invisible until logo animation done then fade in */}
        <div
          className="w-full flex flex-col items-center"
          style={{
            opacity: justLoggedIn ? 0 : 1,
            transition: "opacity 0.35s ease-out",
            pointerEvents: justLoggedIn ? "none" : "auto",
          }}
        >
          <PreloadLoading onComplete={onPreloadComplete} hideLogo />
        </div>
      </div>
    </div>
  );
}
