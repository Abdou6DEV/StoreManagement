import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DeviceCheckResult } from "../../electron/types/deviceCheck";
import {
  isSessionLicenseAccessAllowed,
  readLicenseDeadlines,
  readLicenseGraceSnapshot,
  resolveLicenseValidityFromDeviceCheck,
  type LicenseGraceSnapshot,
} from "../license/offlineGrace";
import { LICENSE_RECHECK_AFTER_LOGIN_EVENT } from "../license/recheckEvents";

interface LicenseContextType {
  isLicenseValid: boolean;
  isLoading: boolean;
  /** Last device-check result from login, startup, or an explicit online recheck. */
  lastDeviceCheckResult: DeviceCheckResult | null;
  /** Apply a device-check result without the global loading gate (e.g. Administrator License tab). */
  applyDeviceCheckResult: (result: DeviceCheckResult) => Promise<boolean>;
  /** Pass `preFetched` to apply the result of a `device-check` you already awaited (avoids a duplicate request). */
  checkLicense: (preFetched?: DeviceCheckResult) => Promise<boolean>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const SESSION_LICENSE_NEAR_DEADLINE_MS = 2 * 60 * 60 * 1000;

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDeviceCheckResult, setLastDeviceCheckResult] = useState<DeviceCheckResult | null>(null);
  const [graceSnapshot, setGraceSnapshot] = useState<LicenseGraceSnapshot | null>(null);

  const applyDeviceCheckResult = useCallback(async (result: DeviceCheckResult) => {
    setLastDeviceCheckResult(result);
    const valid = await resolveLicenseValidityFromDeviceCheck(result);
    setIsLicenseValid(valid);
    return valid;
  }, []);

  const checkLicense = useCallback(async (preFetched?: DeviceCheckResult) => {
    try {
      setIsLoading(true);

      const online = preFetched ?? (await window.api.online.deviceCheck());
      setLastDeviceCheckResult(online);
      const valid = await resolveLicenseValidityFromDeviceCheck(online);
      setIsLicenseValid(valid);
      return valid;
    } catch {
      try {
        const snapshot = await readLicenseGraceSnapshot();
        setGraceSnapshot(snapshot);
        const valid = isSessionLicenseAccessAllowed(null, snapshot);
        setIsLicenseValid(valid);
        return valid;
      } catch {
        setIsLicenseValid(false);
        return false;
      }
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

  useEffect(() => {
    let cancelled = false;
    void readLicenseGraceSnapshot().then((snapshot) => {
      if (!cancelled) setGraceSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    if (isLoading || !isLicenseValid) return;

    let cancelled = false;

    const enforceSessionLicense = async () => {
      const snapshot = graceSnapshot ?? (await readLicenseGraceSnapshot());
      if (cancelled) return;
      if (graceSnapshot == null && snapshot != null) {
        setGraceSnapshot(snapshot);
      }
      if (!isSessionLicenseAccessAllowed(lastDeviceCheckResult, snapshot, Date.now())) {
        setIsLicenseValid(false);
      }
    };

    void enforceSessionLicense();

    const { trialEndsAtMs, expiresAtMs } = readLicenseDeadlines(
      lastDeviceCheckResult,
      graceSnapshot,
    );
    const deadlines = [trialEndsAtMs, expiresAtMs].filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
    const nearestDeadlineMs = deadlines.length > 0 ? Math.min(...deadlines) : null;
    const msUntilDeadline =
      nearestDeadlineMs != null ? nearestDeadlineMs - Date.now() : null;
    const intervalMs =
      msUntilDeadline != null &&
      msUntilDeadline > 0 &&
      msUntilDeadline <= SESSION_LICENSE_NEAR_DEADLINE_MS
        ? 1000
        : 60_000;

    const timerId = window.setInterval(() => {
      void enforceSessionLicense();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [isLoading, isLicenseValid, lastDeviceCheckResult, graceSnapshot]);

  const value: LicenseContextType = {
    isLicenseValid,
    isLoading,
    lastDeviceCheckResult,
    applyDeviceCheckResult,
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
