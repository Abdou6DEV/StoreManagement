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

  const isAccessResolved =
    !licenseLoading && (snapshotLoaded || lastDeviceCheckResult != null);

  const access = useMemo(
    () =>
      resolvePaidCloudBackupAccess({
        effectiveCheckResult: lastDeviceCheckResult,
        snapshot,
        isLicenseValid,
        nowMs,
      }),
    [lastDeviceCheckResult, snapshot, isLicenseValid, nowMs],
  );

  return {
    hasPaidCloudBackupAccess: access.hasPaidCloudBackupAccess,
    blockReason: access.blockReason as CloudBackupAccessBlockReason | null,
    isAccessResolved,
  };
}
