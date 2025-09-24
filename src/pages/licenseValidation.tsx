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
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            License Activation
          </h2>
          <p className="text-muted-foreground">
            Please contact support to activate your license and get your activation key
          </p>
        </div>

        {/* Machine ID Display - Hidden and User-Friendly */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Your License Information
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To activate your license, please contact support with the following information:
            </p>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Your License Code</p>
                <div className="bg-background rounded-lg p-3 border border-border relative group">
                  <code className="text-lg font-mono font-semibold text-foreground tracking-wider">
                    {machineId ? machineId.replace(/-/g, '').toUpperCase() : 'Loading...'}
                  </code>
                  <button
                    onClick={handleCopyMachineId}
                    className="absolute top-2 right-2 p-1 rounded-md bg-muted hover:bg-muted/80 transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy Machine ID"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {copied ? "Copied to clipboard!" : "Hover to copy"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll provide you with an activation key after verifying your purchase.
            </p>
          </div>
        </div>

        {/* Activation Key Input */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Enter Activation Key
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Activation Key
              </label>
              <input
                type="text"
                value={enteredKey}
                onChange={(e) => setEnteredKey(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter your activation key here"
                className="block w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 font-mono text-center"
                maxLength={16}
              />
            </div>

            <button
              onClick={handleValidate}
              disabled={isValidating || !enteredKey.trim()}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isValidating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
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
          <div className={`rounded-xl border p-4 ${
            validationResult.isValid 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <div className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
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
