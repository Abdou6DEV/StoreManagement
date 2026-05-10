import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DeviceCheckResult } from "../../electron/types/deviceCheck";
import { LICENSE_RECHECK_AFTER_LOGIN_EVENT } from "../license/recheckEvents";

interface LicenseContextType {
  isLicenseValid: boolean;
  isLoading: boolean;
  /** Pass `preFetched` to apply the result of a `device-check` you already awaited (avoids a duplicate request). */
  checkLicense: (preFetched?: DeviceCheckResult) => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkLicense = useCallback(async (preFetched?: DeviceCheckResult) => {
    try {
      setIsLoading(true);

      const online = preFetched ?? (await window.api.online.deviceCheck());

      if (online.success === true) {
        setIsLicenseValid(online.allowed);
        return;
      }

      setIsLicenseValid(false);
    } catch {
      setIsLicenseValid(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkLicense();
  }, [checkLicense]);

  useEffect(() => {
    const onRecheck = (): void => {
      void checkLicense();
    };
    window.addEventListener(LICENSE_RECHECK_AFTER_LOGIN_EVENT, onRecheck);
    return () => window.removeEventListener(LICENSE_RECHECK_AFTER_LOGIN_EVENT, onRecheck);
  }, [checkLicense]);

  const value: LicenseContextType = {
    isLicenseValid,
    isLoading,
    checkLicense,
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
}
