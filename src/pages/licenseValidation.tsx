import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Key, Shield, AlertCircle, CheckCircle, Copy, Check, Settings, User } from "lucide-react";
import { useLicense } from "../lib/contexts/licenseContext";
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

export default function LicenseValidation() {
  const { t, i18n } = useTranslation();
  const { checkLicense } = useLicense();
  const [machineId, setMachineId] = useState<string>("");
  const [validationKey, setValidationKey] = useState<string>("");
  const [enteredKey, setEnteredKey] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isRTL = i18n.language === "ar";

  // Get machine ID and generate validation key on component mount
  useEffect(() => {
    const initializeLicense = async () => {
      try {
        setIsLoading(true);
        
        // Get machine ID
        const machineResult = await window.api.system.getMachineId();
        if (machineResult.success && machineResult.machineId) {
          setMachineId(machineResult.machineId);
          
          // Generate validation key
          const keyResult = await window.api.system.generateValidationKey(machineResult.machineId);
          if (keyResult.success && keyResult.validationKey) {
            setValidationKey(keyResult.validationKey);
          }
        }
      } catch (error) {
        console.error("Error initializing license:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLicense();
  }, []);

  const handleValidate = async () => {
    if (!enteredKey.trim()) {
      setValidationResult({
        isValid: false,
        message: "Please enter the validation key"
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await window.api.system.validateKey(machineId, enteredKey);
      
      if (result.success) {
        if (result.isValid) {
          // Store license in localStorage
          const licenseData = {
            machineId,
            validationKey: enteredKey,
            timestamp: Date.now()
          };
          localStorage.setItem("storeManagementLicense", JSON.stringify(licenseData));
          
          setValidationResult({
            isValid: true,
            message: "License validated successfully! Redirecting to app..."
          });
          // Refresh license context to recognize the new valid license
          setTimeout(async () => {
            try {
              await checkLicense();
            } catch (error) {
              console.error("Error refreshing license context:", error);
              // If refresh fails, try a page reload as fallback
              window.location.reload();
            }
          }, 2000);
        } else {
          setValidationResult({
            isValid: false,
            message: t("license.invalidKey", "Invalid validation key. Please contact support.")
          });
        }
      } else {
        setValidationResult({
          isValid: false,
          message: result.error || t("license.validationFailed", "Validation failed")
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: t("license.errorOccurred", "An error occurred during validation")
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleValidate();
    }
  };

  const handleCopyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground">{t("license.initializing", "Initializing license validation...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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

      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            {t("license.title", "License Activation")}
          </h2>
          <p className="text-base text-muted-foreground">
            {t("license.subtitle", "Contact support to get your activation key")}
          </p>
        </div>

        {/* Machine ID Display - Compact */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2" />
            {t("license.licenseCode", "License Code")}
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("license.sendCodeToSupport", "Send this code to support:")}
            </p>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50 relative group">
              <code className="text-base font-mono font-semibold text-foreground tracking-wide">
                {machineId ? machineId.replace(/-/g, '').toUpperCase() : t("license.loading", "Loading...")}
              </code>
              <button
                onClick={handleCopyMachineId}
                className="absolute top-2 right-2 p-2 rounded bg-muted hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                title="Copy Machine ID"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {copied ? t("license.copied", "Copied!") : t("license.hoverToCopy", "Hover to copy")}
            </p>
          </div>
        </div>

        {/* Activation Key Input */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("license.enterActivationKey", "Enter Activation Key")}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("license.activationKey", "Activation Key")}
              </label>
              <input
                type="text"
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder={t("license.enterActivationKeyPlaceholder", "Enter activation key")}
                className="block w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 font-mono text-center text-base"
                maxLength={16}
              />
            </div>

            <button
              onClick={handleValidate}
              disabled={isValidating || !enteredKey.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                  {t("license.activating", "Activating...")}
                </div>
              ) : (
                t("license.activateLicense", "Activate License")
              )}
            </button>
          </div>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div className={`rounded-lg border p-4 ${
            validationResult.isValid 
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400" 
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
          }`}>
            <div className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 mr-3" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-3" />
              )}
              <span className="text-base font-medium">
                {validationResult.message}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
