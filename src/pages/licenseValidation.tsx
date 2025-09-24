import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Key, Shield, AlertCircle, CheckCircle, Copy, Check } from "lucide-react";

export default function LicenseValidation() {
  const { t } = useTranslation();
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
          // Redirect to main app after successful validation
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        } else {
          setValidationResult({
            isValid: false,
            message: "Invalid validation key. Please contact support."
          });
        }
      } else {
        setValidationResult({
          isValid: false,
          message: result.error || "Validation failed"
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: "An error occurred during validation"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing license validation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            License Activation
          </h2>
          <p className="text-sm text-muted-foreground">
            Contact support to get your activation key
          </p>
        </div>

        {/* Machine ID Display - Compact */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center">
            <Key className="h-4 w-4 mr-2" />
            License Code
          </h3>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Send this code to support:
            </p>
            <div className="bg-muted/30 rounded-md p-3 border border-border/50 relative group">
              <code className="text-sm font-mono font-semibold text-foreground tracking-wide">
                {machineId ? machineId.replace(/-/g, '').toUpperCase() : 'Loading...'}
              </code>
              <button
                onClick={handleCopyMachineId}
                className="absolute top-1 right-1 p-1 rounded bg-muted hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                title="Copy Machine ID"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {copied ? "Copied!" : "Hover to copy"}
            </p>
          </div>
        </div>

        {/* Activation Key Input */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-3">
            Enter Activation Key
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Activation Key
              </label>
              <input
                type="text"
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter activation key"
                className="block w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 font-mono text-center text-sm"
                maxLength={16}
              />
            </div>

            <button
              onClick={handleValidate}
              disabled={isValidating || !enteredKey.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Activating...
                </div>
              ) : (
                "Activate License"
              )}
            </button>
          </div>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <div className={`rounded-md border p-3 ${
            validationResult.isValid 
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400" 
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
          }`}>
            <div className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">
                {validationResult.message}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
