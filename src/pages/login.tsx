import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/contexts/authContext";
import { Eye, EyeOff, User, Lock, AlertCircle, Settings } from "lucide-react";
import { useTheme } from "../lib/hooks/useTheme";
import { ThemeToggleButton } from "../lib/components/themeToggleButton";
import { FullscreenToggleButton } from "../lib/components/fullscreenToggleButton";
import { TooltipToggleButton } from "../lib/components/tooltipToggleButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../lib/components/dropdownMenu";
import { useTranslation } from "react-i18next";
import { LOGO_ICON, LOGO_ICON_DARK } from "../lib/assets";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [successPhase, setSuccessPhase] = useState<'idle' | 'green_hold' | 'fade_out'>('idle');
  const { login, confirmLoginTransition } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  
  // Refs for focus management
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Focus username input on page load
  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  // Focus username input when error occurs (preventScroll to avoid layout flicker)
  useEffect(() => {
    if (error && usernameRef.current) {
      usernameRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  // Clear error (and revert button) after 2 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 2000);
    return () => clearTimeout(t);
  }, [error]);

  // Success flow: green button 1s → fade out → confirm transition
  useEffect(() => {
    if (successPhase !== 'green_hold') return;
    const t = setTimeout(() => setSuccessPhase('fade_out'), 1000);
    return () => clearTimeout(t);
  }, [successPhase]);

  useEffect(() => {
    if (successPhase !== 'fade_out') return;
    const t = setTimeout(() => confirmLoginTransition(), 500);
    return () => clearTimeout(t);
  }, [successPhase, confirmLoginTransition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      // Focus the first empty field
      if (!username.trim() && usernameRef.current) {
        usernameRef.current.focus();
      } else if (!password.trim() && passwordRef.current) {
        passwordRef.current.focus();
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(username, password);
      if (result.success) {
        // Single update: green button (no separate loading=false to avoid extra re-render flicker)
        setSuccessPhase('green_hold');
        setIsLoading(false);
      } else {
        setError(result.error || "Login failed");
        if (usernameRef.current) {
          usernameRef.current.focus();
        }
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      if (usernameRef.current) {
        usernameRef.current.focus();
      }
      setIsLoading(false);
    }
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.currentTarget === usernameRef.current) {
        // From username, go to password
        if (passwordRef.current) {
          passwordRef.current.focus();
        }
      } else if (e.currentTarget === passwordRef.current) {
        // From password, trigger submit
        if (submitButtonRef.current && !isLoading) {
          submitButtonRef.current.click();
        }
      }
    }
  };

  const isRTL = i18n.language === "ar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loginFadeInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes loginFadeInFromLeftRtl {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Settings Button - Top Right */}
      <div className={`fixed top-4 z-50 ${isRTL ? "left-4" : "right-4"}`}>
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
              <Settings
                className={`transition-transform duration-400 ${
                  dropdownOpen ? "rotate-360 scale-110" : ""
                } hover:text-red-400`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={`mx-4 my-2 w-56 ${isRTL ? "text-right" : ""}`}
          >
            {/* User Info */}
            <DropdownMenuLabel className="font-semibold text-md flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("navigation.welcomeToStoreManagement", "Welcome to Store Management")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.preferences")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <ThemeToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TooltipToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <FullscreenToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.language")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("en");
              }}
              disabled={i18n.language === "en"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇬🇧</span>{" "}
              {t("navigation.english")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("fr");
              }}
              disabled={i18n.language === "fr"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇫🇷</span>{" "}
              {t("navigation.french")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("ar");
              }}
              disabled={i18n.language === "ar"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇸🇦</span>{" "}
              {t("navigation.arabic")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header: logo always visible; welcome text fades in then fades out on success */}
        <div className="text-center">
          <img
            src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
            alt=""
            className="mx-auto h-50 w-50 object-contain select-none mb-4 -mt-14 opacity-0"
            style={{
              animation: isRTL
                ? "loginFadeInFromLeftRtl 0.5s ease-out forwards"
                : "loginFadeInFromLeft 0.5s ease-out forwards",
            }}
          />
          <div
            className="opacity-0 transition-opacity duration-500 ease-out"
            style={{
              ...(successPhase === 'fade_out' ? { opacity: 0 } : successPhase === 'green_hold' ? { opacity: 1 } : {}),
              animation: successPhase === 'idle'
                ? (isRTL
                  ? "loginFadeInFromLeftRtl 0.5s ease-out 0.35s forwards"
                  : "loginFadeInFromLeft 0.5s ease-out 0.35s forwards")
                : undefined,
            }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {t("login.welcomeBack", "Welcome Back")}
            </h2>
            <p className="text-muted-foreground">
              {t("login.signInToAccount", "Sign in to your Store Management account")}
            </p>
          </div>
        </div>

        {/* Login Form + Footer: fade in after welcome, fade out on success */}
        <div
          className="opacity-0 transition-opacity duration-500 ease-out"
          style={{
            ...(successPhase === 'fade_out' ? { opacity: 0 } : successPhase === 'green_hold' ? { opacity: 1 } : {}),
            animation: successPhase === 'idle' ? "loginFadeIn 0.4s ease-out 0.7s forwards" : undefined,
          }}
        >
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t("login.username", "Username")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  ref={usernameRef}
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="block w-full pl-10 pr-3 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  placeholder={t("login.enterUsername", "Enter your username")}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                {t("login.password", "Password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="block w-full pl-10 pr-12 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  placeholder={t("login.enterPassword", "UPDATE WORKEED")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button – green "Signing in..." on success hold, then form fades out */}
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={isLoading || !!error || !username.trim() || !password.trim() || successPhase !== 'idle'}
              className={`group relative w-full flex justify-center items-center min-h-[3rem] py-3 px-4 border border-transparent text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed transition-all duration-200 ${
                successPhase === 'green_hold'
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : error
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "text-primary-foreground bg-primary hover:bg-primary/90"
              } ${!error && successPhase === 'idle' && (isLoading || !username.trim() || !password.trim()) ? "disabled:opacity-50" : ""}`}
            >
              {error ? (
                <span className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
                  {error}
                </span>
              ) : successPhase === 'green_hold' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t("login.signingIn", "Signing in...")}
                </div>
              ) : isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  {t("login.signingIn", "Signing in...")}
                </div>
              ) : (
                t("login.signIn", "Sign In")
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            {t("login.copyright", "© 2025 Store Management System. All rights reserved.")}
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
