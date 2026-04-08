import React, { useRef, useEffect, useState } from "react";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../hooks/useTheme";
import { LOGO_ICON, LOGO_ICON_DARK } from "../assets";
import PreloadLoading from "./preloadLoading";
import { routeLoaders } from "../../pages/lazyRoutes";
import { runAppWarmupOnce, startAppWarmup } from "../warmup/appWarmup";

const LOGO_FADE_DURATION_MS = 500;   // logo fades in up-to-down
const CONTENT_DELAY_MS = 200;       // delay before other preload content fades in (after logo)
const CONTENT_FADE_MS = 300;         // other content fade-in duration
const TOTAL_MS = LOGO_FADE_DURATION_MS + CONTENT_DELAY_MS + CONTENT_FADE_MS;

interface LoginToPreloadTransitionProps {
  onPreloadComplete?: () => void;
}

/**
 * Shown after successful login: logo fades in up-to-down, then other preload content fades in. Stays visible until loading completes.
 */
export default function LoginToPreloadTransition({ onPreloadComplete }: LoginToPreloadTransitionProps) {
  const { justLoggedIn, markLoginTransitionDone, isPreloading, preloadProgress, setPreloadProgress, setIsPreloading } = useAuth();
  const { isDark } = useTheme();
  const transitionDoneRef = useRef(false);
  const [entranceDone, setEntranceDone] = useState(false);

  // Run route preload from HERE (same tree as App) so we use the same lazyRoutes module → same chunks as React.lazy → no Suspense after
  useEffect(() => {
    if (!isPreloading) return;
    let cancelled = false;
    const run = async () => {
      // Start persistent warmup/polling early (idempotent).
      startAppWarmup();

      const steps = [...routeLoaders.map((fn) => () => fn()), () => runAppWarmupOnce()];
      const total = steps.length;
      try {
        // Let the preload UI paint before heavy work begins.
        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        for (let i = 0; i < total; i++) {
          if (cancelled) break;
          try {
            await steps[i]();
          } catch (error) {
            console.error(`Failed preload step ${i}:`, error);
          }
          if (!cancelled) setPreloadProgress(Math.round(((i + 1) / total) * 100));
        }
      } finally {
        if (!cancelled) setIsPreloading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isPreloading, setPreloadProgress, setIsPreloading]);

  useEffect(() => {
    if (!justLoggedIn || transitionDoneRef.current) return;
    const t = setTimeout(() => {
      transitionDoneRef.current = true;
      setEntranceDone(true); // keep logo + content visible after animations
      markLoginTransitionDone();
    }, TOTAL_MS);
    return () => clearTimeout(t);
  }, [justLoggedIn, markLoginTransitionDone]);

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center">
      <style>{`
        @keyframes preloadLogoFadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes preloadFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div className="flex flex-col items-center w-full max-w-md px-4">
        {/* Logo: fades in up-to-down first; stays visible after entrance */}
        <div
          className="mb-4 flex items-center justify-center flex-shrink-0 w-full opacity-0"
          style={
            entranceDone
              ? { opacity: 1 }
              : {
                  animation: justLoggedIn
                    ? `preloadLogoFadeInDown ${LOGO_FADE_DURATION_MS}ms ease-out forwards`
                    : undefined,
                }
          }
        >
          <img
            src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
            alt=""
            className="w-50 h-50 object-contain select-none animate-pulse"
          />
        </div>
        {/* Other preload content: fades in after logo; stays visible until loading completes */}
        <div
          className="w-full flex flex-col items-center opacity-0"
          style={
            entranceDone
              ? { opacity: 1 }
              : {
                  animation: justLoggedIn
                    ? `preloadFadeIn ${CONTENT_FADE_MS}ms ease-in-out ${LOGO_FADE_DURATION_MS + CONTENT_DELAY_MS}ms forwards`
                    : undefined,
                }
          }
        >
          <PreloadLoading
            onComplete={onPreloadComplete}
            hideLogo
            isPreloading={isPreloading}
            preloadProgress={preloadProgress}
          />
        </div>
      </div>
    </div>
  );
}
