import React, { createContext, useContext, useState, useEffect } from "react";

interface LicenseContextType {
  isLicenseValid: boolean;
  isLoading: boolean;
  checkLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkLicense = async () => {
    try {
      setIsLoading(true);
      
      // Check if license is already validated (stored in localStorage)
      const storedLicense = localStorage.getItem("storeManagementLicense");
      
      if (storedLicense) {
        const { machineId, validationKey } = JSON.parse(storedLicense);
        
        // Verify the stored license is still valid (no expiration check)
        const result = await window.api.system.validateKey(machineId, validationKey);
        
        if (result.success && result.isValid) {
          setIsLicenseValid(true);
          return;
        }
        
        // Only clear when we got a successful response that said the key is invalid.
        // Do not clear on IPC/network errors (result.success === false) so we don't
        // wipe the license on transient failures.
        if (result.success && result.isValid === false) {
          localStorage.removeItem("storeManagementLicense");
        }
      }
      
      setIsLicenseValid(false);
    } catch (error) {
      setIsLicenseValid(false);
      // Clear only corrupted stored data (JSON parse error), not on IPC/validation failures
      if (error instanceof SyntaxError) {
        try {
          localStorage.removeItem("storeManagementLicense");
        } catch (_) {}
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  const value: LicenseContextType = {
    isLicenseValid,
    isLoading,
    checkLicense,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
}



