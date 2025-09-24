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
        const { machineId, validationKey, timestamp } = JSON.parse(storedLicense);
        
        // Check if license is still valid (not expired)
        const now = Date.now();
        const licenseAge = now - timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        if (licenseAge < maxAge) {
          // Verify the stored license is still valid
          const result = await window.api.system.validateKey(machineId, validationKey);
          if (result.success && result.isValid) {
            setIsLicenseValid(true);
            return;
          }
        }
        
        // License expired or invalid, clear it
        localStorage.removeItem("storeManagementLicense");
      }
      
      setIsLicenseValid(false);
    } catch (error) {
      console.error("Error checking license:", error);
      setIsLicenseValid(false);
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

