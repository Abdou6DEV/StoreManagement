import { useEffect, useMemo, useState } from "react";
import { useLicense } from "../contexts/licenseContext";
import {
  resolvePaidCloudBackupAccess,
  type CloudBackupAccessBlockReason,
} from "../license/paidCloudBackupAccess";
import { readLicenseGraceSnapshot, type LicenseGraceSnapshot } from "../license/offlineGrace";

export function usePaidCloudBackupAccess() {
  const { lastDeviceCheckResult, isLicenseValid, isLoading: licenseLoading } = useLicense();
  const [snapshot, setSnapshot] = useState<LicenseGraceSnapshot | null>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readLicenseGraceSnapshot().then((s) => {
      if (!cancelled) {
        setSnapshot(s);
        setSnapshotLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    setNowMs(Date.now());
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const aiEnabled =
    lastDeviceCheckResult?.success === true
      ? lastDeviceCheckResult.aiEnabled
      : undefined;

  const isAccessResolved =
    !licenseLoading && (snapshotLoaded || lastDeviceCheckResult != null);

  const access = useMemo(
    () =>
      resolvePaidCloudBackupAccess({
        effectiveCheckResult: lastDeviceCheckResult,
        snapshot,
        isLicenseValid,
        nowMs,
        isOnline,
        aiEnabled,
      }),
    [lastDeviceCheckResult, snapshot, isLicenseValid, nowMs, isOnline, aiEnabled],
  );

  return {
    hasPaidCloudBackupAccess: access.hasPaidCloudBackupAccess,
    blockReason: access.blockReason as CloudBackupAccessBlockReason | null,
    isAccessResolved,
  };
}
