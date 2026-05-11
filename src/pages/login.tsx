import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../lib/contexts/authContext";
import { useLicense } from "../lib/contexts/licenseContext";
import { Eye, EyeOff, User, Lock, AlertCircle, Settings, Key, ArrowLeft, Copy, Check } from "lucide-react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activationKey, setActivationKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingLicenseCheck, setAwaitingLicenseCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [successPhase, setSuccessPhase] = useState<'idle' | 'green_hold' | 'fade_out'>('idle');
  const [useActivationKey, setUseActivationKey] = useState(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [machineIdLoading, setMachineIdLoading] = useState(false);
  const [guidCopied, setGuidCopied] = useState(false);
  const [initialAdminSetupRequired, setInitialAdminSetupRequired] = useState<
    boolean | null
  >(null);
  const {
    login,
    loginByActivationKey,
    loginDevAsPrimaryAdmin,
    confirmLoginTransition,
    startPreloadAfterLicenseGate,
    openSessionBlockedOnLicense,
    abandonPendingLogin,
    needsInitialAdminSetup,
    completeInitialAdminSetup,
  } = useAuth();
  const { checkLicense } = useLicense();
  const { t, i18n } = useTranslation();

  const completeLoginAfterDeviceCheck = useCallback(async () => {
    try {
      const r = await window.api.online.deviceCheck();
      const isLicensed = await checkLicense(r);

      if (isLicensed) {
        startPreloadAfterLicenseGate();
        setSuccessPhase("green_hold");
        return;
      }

      if (r.success === true && !r.allowed) {
        setError("login.licenseBlockedPendingRedirect");
        if (licenseRedirectTimerRef.current) {
          clearTimeout(licenseRedirectTimerRef.current);
        }
        licenseRedirectTimerRef.current = setTimeout(() => {
          licenseRedirectTimerRef.current = null;
          openSessionBlockedOnLicense();
        }, 3000);
        return;
      }

      if (r.success === false) {
        abandonPendingLogin();
        if (r.code === "missing_env") {
          setError("login.onlineLicensingNotConfigured");
        } else if (r.code === "network") {
          setError("login.internetRequiredToSignIn");
        } else if (r.code === "invalid") {
          setError("login.deviceIdentityLicenseError");
        } else {
          setError("login.licenseVerificationFailed");
        }
      }
    } catch {
      const isLicensed = await checkLicense();
      if (isLicensed) {
        startPreloadAfterLicenseGate();
        setSuccessPhase("green_hold");
        return;
      }
      abandonPendingLogin();
      setError("login.internetRequiredToSignIn");
    } finally {
      setAwaitingLicenseCheck(false);
      setIsLoading(false);
    }
  }, [abandonPendingLogin, checkLicense, openSessionBlockedOnLicense, startPreloadAfterLicenseGate]);
  const { isDark } = useTheme();

  const isFirstAdminSetup = initialAdminSetupRequired === true;
  const credentialsIncomplete =
    useActivationKey
      ? !activationKey.trim()
      : isFirstAdminSetup
        ? !username.trim() || !password.trim() || !confirmPassword.trim()
        : !username.trim() || !password.trim();

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const activationKeyRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const licenseRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    needsInitialAdminSetup().then((needs) => {
      if (!cancelled) setInitialAdminSetupRequired(needs);
    });
    return () => {
      cancelled = true;
    };
  }, [needsInitialAdminSetup]);

  useEffect(() => {
    if (initialAdminSetupRequired === true) {
      setUseActivationKey(false);
      setActivationKey("");
    }
  }, [initialAdminSetupRequired]);

  useEffect(() => {
    return () => {
      if (licenseRedirectTimerRef.current) {
        clearTimeout(licenseRedirectTimerRef.current);
        licenseRedirectTimerRef.current = null;
      }
    };
  }, []);

  // Focus username or activation key input on page load
  useEffect(() => {
    if (initialAdminSetupRequired === null) return;
    if (useActivationKey && activationKeyRef.current) {
      activationKeyRef.current.focus();
    } else if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [useActivationKey, initialAdminSetupRequired]);

  // Load machine ID when switching to activation key mode
  useEffect(() => {
    if (!useActivationKey) return;
    let cancelled = false;
    setMachineIdLoading(true);
    window.api.system
      .getMachineId()
      .then((res) => {
        if (!cancelled && res.success && res.machineId) {
          setMachineId(res.machineId);
        }
      })
      .finally(() => {
        if (!cancelled) setMachineIdLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useActivationKey]);

  // Focus appropriate input when error occurs
  useEffect(() => {
    if (!error) return;
    if (useActivationKey && activationKeyRef.current) {
      activationKeyRef.current.focus({ preventScroll: true });
    } else if (
      isFirstAdminSetup &&
      error === "login.initialSetup.passwordMismatch" &&
      confirmPasswordRef.current
    ) {
      confirmPasswordRef.current.focus({ preventScroll: true });
    } else if (
      isFirstAdminSetup &&
      error === "login.initialSetup.passwordTooShort" &&
      passwordRef.current
    ) {
      passwordRef.current.focus({ preventScroll: true });
    } else if (usernameRef.current) {
      usernameRef.current.focus({ preventScroll: true });
    }
  }, [error, useActivationKey, isFirstAdminSetup]);

  // Clear error (and revert button) after a few seconds so longer messages stay readable
  useEffect(() => {
    if (!error) return;
    const errorClearTimer = window.setTimeout(() => setError(null), 5500);
    return () => clearTimeout(errorClearTimer);
  }, [error]);

  // Success flow: green button 1s → fade out → confirm transition
  useEffect(() => {
    if (successPhase !== 'green_hold') return;
    const t = setTimeout(() => setSuccessPhase('fade_out'), 1000);
    return () => clearTimeout(t);
  }, [successPhase]);

  useEffect(() => {
    if (successPhase !== 'fade_out') return;
    // Message + form fade together (0.35s delay), then logo (1s delay + 0.5s) → switch after 1.6s
    const t = setTimeout(() => confirmLoginTransition(), 1500);
    return () => clearTimeout(t);
  }, [successPhase, confirmLoginTransition]);

  // Production builds: Vite sets DEV=false, PROD=true — button and IPC path are inert.
  const showDevLoginButton = import.meta.env.DEV && !import.meta.env.PROD;

  const handleDevLogin = async () => {
    setError(null);
    setIsLoading(true);
    setAwaitingLicenseCheck(false);
    try {
      const result = await loginDevAsPrimaryAdmin();
      if (result.success) {
        setAwaitingLicenseCheck(true);
        await completeLoginAfterDeviceCheck();
      } else {
        setError(result.error || t("login.devLogInFailed", "Dev login failed"));
        setIsLoading(false);
      }
    } catch {
      setError(t("login.devLogInFailed", "Dev login failed"));
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirstAdminSetup) {
      if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
        if (!username.trim() && usernameRef.current) usernameRef.current.focus();
        else if (!password.trim() && passwordRef.current) passwordRef.current.focus();
        else if (!confirmPassword.trim() && confirmPasswordRef.current)
          confirmPasswordRef.current.focus();
        return;
      }
      if (password !== confirmPassword) {
        setError("login.initialSetup.passwordMismatch");
        confirmPasswordRef.current?.focus();
        return;
      }
      if (password.length < 6) {
        setError("login.initialSetup.passwordTooShort");
        passwordRef.current?.focus();
        return;
      }
      setIsLoading(true);
      setAwaitingLicenseCheck(false);
      setError(null);
      try {
        const result = await completeInitialAdminSetup(
          username.trim(),
          password,
        );
        if (result.success) {
          setAwaitingLicenseCheck(true);
          await completeLoginAfterDeviceCheck();
        } else {
          setError(result.error || "login.initialSetup.failed");
          setIsLoading(false);
        }
      } catch {
        setError("login.initialSetup.failed");
        setIsLoading(false);
      }
      return;
    }

    if (useActivationKey) {
      if (!activationKey.trim()) {
        activationKeyRef.current?.focus();
        return;
      }
      setIsLoading(true);
      setAwaitingLicenseCheck(false);
      setError(null);
      try {
        const result = await loginByActivationKey(
          activationKey.trim(),
          machineId ?? undefined
        );
        if (result.success) {
          setAwaitingLicenseCheck(true);
          await completeLoginAfterDeviceCheck();
        } else {
          setError(result.error || t("login.invalidActivationKey", "Invalid activation key"));
          activationKeyRef.current?.focus();
          setIsLoading(false);
        }
      } catch (err) {
        setError(t("login.activationKeyError", "An unexpected error occurred"));
        activationKeyRef.current?.focus();
        setIsLoading(false);
      }
      return;
    }

    if (!username.trim() || !password.trim()) {
      if (!username.trim() && usernameRef.current) usernameRef.current.focus();
      else if (!password.trim() && passwordRef.current) passwordRef.current.focus();
      return;
    }

    setIsLoading(true);
    setAwaitingLicenseCheck(false);
    setError(null);
    try {
      const result = await login(username, password);
      if (result.success) {
        setAwaitingLicenseCheck(true);
        await completeLoginAfterDeviceCheck();
      } else {
        setError(result.error || "Login failed");
        usernameRef.current?.focus();
        setIsLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      usernameRef.current?.focus();
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (useActivationKey) {
      if (e.currentTarget === activationKeyRef.current && submitButtonRef.current && !isLoading) {
        submitButtonRef.current.click();
      }
      return;
    }
    if (isFirstAdminSetup) {
      if (e.currentTarget === usernameRef.current && passwordRef.current) {
        passwordRef.current.focus();
      } else if (
        e.currentTarget === passwordRef.current &&
        confirmPasswordRef.current
      ) {
        confirmPasswordRef.current.focus();
      } else if (
        e.currentTarget === confirmPasswordRef.current &&
        submitButtonRef.current &&
        !isLoading
      ) {
        submitButtonRef.current.click();
      }
      return;
    }
    if (e.currentTarget === usernameRef.current && passwordRef.current) {
      passwordRef.current.focus();
    } else if (e.currentTarget === passwordRef.current && submitButtonRef.current && !isLoading) {
      submitButtonRef.current.click();
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
        @keyframes loginFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes loginFadeOutDown {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(30px); }
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
        {/* Header: message and form fade out normally; then logo fades out up-to-down */}
        <div className="text-center">
          {/* Logo: fades out up-to-down after message + form (1s delay, 0.5s duration) */}
          <div
            className="mb-4"
            style={
              successPhase === "fade_out"
                ? { animation: "loginFadeOutDown 0.5s ease-out 1s forwards" }
                : undefined
            }
          >
            <img
              src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
              alt=""
              className="mx-auto h-50 w-50 object-contain select-none -mt-10 opacity-0"
              style={{
                opacity: successPhase === "green_hold" || successPhase === "fade_out" ? 1 : undefined,
                animation:
                  successPhase === "idle"
                    ? isRTL
                      ? "loginFadeInFromLeftRtl 0.5s ease-out forwards"
                      : "loginFadeInFromLeft 0.5s ease-out forwards"
                    : undefined,
              }}
            />
          </div>
          {/* Message: normal fade out — 0.5s, 0.35s delay */}
          <div
            className="opacity-0 transition-opacity duration-500 ease-out"
            style={{
              opacity: successPhase === "green_hold" || successPhase === "fade_out" ? 1 : undefined,
              animation:
                successPhase === "idle"
                  ? isRTL
                    ? "loginFadeInFromLeftRtl 0.5s ease-out 0.35s forwards"
                    : "loginFadeInFromLeft 0.5s ease-out 0.35s forwards"
                  : successPhase === "fade_out"
                    ? "loginFadeOut 0.5s ease-out 0.35s forwards"
                    : undefined,
            }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-2 mt-0">
              {isFirstAdminSetup
                ? t(
                    "login.createAdminTitle",
                    "Create administrator account",
                  )
                : t("login.welcomeBack", "Welcome Back")}
            </h2>
            <p className="text-muted-foreground">
              {isFirstAdminSetup
                ? t(
                    "login.createAdminSubtitle",
                    "Choose the username and password for the main administrator. You can add more accounts later.",
                  )
                : t(
                    "login.signInToAccount",
                    "Sign in to your Store Management account",
                  )}
            </p>
          </div>
        </div>

        {/* Form: normal fade out — same time as message (0.35s delay, 0.5s duration) */}
        <div
          className="opacity-0 transition-opacity duration-500 ease-out"
          style={{
            opacity: successPhase === "green_hold" || successPhase === "fade_out" ? 1 : undefined,
            animation:
              successPhase === "idle"
                ? "loginFadeIn 0.4s ease-out 0.7s forwards"
                : successPhase === "fade_out"
                  ? "loginFadeOut 0.5s ease-out 0.35s forwards"
                  : undefined,
          }}
        >
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          {initialAdminSetupRequired === null ? (
            <p className="text-center text-muted-foreground py-10">
              {t("login.loading", "Loading...")}
            </p>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {useActivationKey ? (
              <>
                {/* Back to username/password */}
                <button
                  type="button"
                  onClick={() => {
                    setUseActivationKey(false);
                    setActivationKey("");
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("login.backToUsernamePassword", "Back to username and password")}
                </button>

                {/* GUID used to create activation key */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("login.licenseCode", "License code (send to support for activation key)")}
                  </label>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50 relative group">
                    <code className="text-sm font-mono text-foreground tracking-wide break-all pr-10">
                      {machineIdLoading
                        ? t("login.loading", "Loading...")
                        : machineId
                          ? machineId.replace(/-/g, "").toLowerCase()
                          : "—"}
                    </code>
                    {machineId && (
                      <button
                        type="button"
                        onClick={async () => {
                          const text = machineId.replace(/-/g, "").toLowerCase();
                          try {
                            await navigator.clipboard.writeText(text);
                            setGuidCopied(true);
                            setTimeout(() => setGuidCopied(false), 2000);
                          } catch (err) {
                            console.error("Copy failed:", err);
                          }
                        }}
                        className="absolute top-2 right-2 p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                        title={t("login.copyGuid", "Copy")}
                      >
                        {guidCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Activation Key Field */}
                <div>
                  <label
                    htmlFor="activationKey"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    {t("login.activationKey", "Activation key")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <input
                      ref={activationKeyRef}
                      id="activationKey"
                      name="activationKey"
                      type="text"
                      value={activationKey}
                      onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      maxLength={16}
                      className="block w-full pl-10 pr-3 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 font-mono"
                      placeholder={t("login.enterActivationKey", "Enter activation key")}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
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
                      placeholder={t("login.enterPassword", "Enter your password")}
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

                {isFirstAdminSetup ? (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      {t("login.confirmPassword", "Confirm password")}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <input
                        ref={confirmPasswordRef}
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="block w-full pl-10 pr-12 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                        placeholder={t(
                          "login.enterConfirmPassword",
                          "Confirm your password",
                        )}
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
                ) : null}

                {/* Forgot username/password → activation key */}
                {!isFirstAdminSetup ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUseActivationKey(true);
                      setError(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground underline transition-colors w-full text-center"
                  >
                    {t("login.loginViaActivationKey", "Log in via activation key (forgot username or password)")}
                  </button>
                ) : null}
              </>
            )}

            {/* Submit Button */}
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={
                initialAdminSetupRequired === null ||
                isLoading ||
                !!error ||
                successPhase !== "idle" ||
                credentialsIncomplete
              }
              className={`group relative w-full flex justify-center items-center min-h-[3rem] py-3 px-4 border border-transparent text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed transition-all duration-200 ${
                successPhase === 'green_hold' || successPhase === 'fade_out'
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : error
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "text-primary-foreground bg-primary hover:bg-primary/90"
              } ${!error && successPhase === 'idle' && (isLoading || credentialsIncomplete) ? "disabled:opacity-50" : ""}`}
            >
              {error ? (
                <span className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
                  {t(error, error)}
                </span>
              ) : successPhase === 'green_hold' || successPhase === 'fade_out' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t("login.signingIn", "Signing in...")}
                </div>
              ) : isLoading && awaitingLicenseCheck ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  {t("license.checking", "Checking license…")}
                </div>
              ) : isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  {t("login.signingIn", "Signing in...")}
                </div>
              ) : isFirstAdminSetup ? (
                t("login.createAdminAccount", "Create account")
              ) : (
                t("login.signIn", "Sign In")
              )}
            </button>

            {showDevLoginButton &&
            !useActivationKey &&
            initialAdminSetupRequired === false ? (
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={isLoading || successPhase !== "idle" || !!error}
                  title={t("login.devLogInHint")}
                  className="w-full text-xs font-medium text-amber-700/90 dark:text-amber-400/90 py-2.5 px-3 rounded-lg border border-dashed border-amber-600/35 dark:border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {t("login.devLogIn")}
                </button>
              </div>
            ) : null}
          </form>
          )}

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
