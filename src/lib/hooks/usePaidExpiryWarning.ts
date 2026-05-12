import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLicense } from "../contexts/licenseContext";
import { formatDeadlineRemaining } from "../license/formatDeadlineRemaining";
import { readLicenseGraceSnapshot } from "../license/offlineGrace";

const PAID_EXPIRY_WARNING_MS = 14 * 24 * 60 * 60 * 1000;

export function usePaidExpiryWarning() {
  const { t } = useTranslation();
  const { lastDeviceCheckResult } = useLicense();
  const [snapshotExpiresAtMs, setSnapshotExpiresAtMs] = useState<number | null | undefined>(undefined);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    let cancelled = false;
    void readLicenseGraceSnapshot().then((snapshot) => {
      if (!cancelled) {
        setSnapshotExpiresAtMs(snapshot?.expiresAtMs ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const expiresAtMs = useMemo(() => {
    if (lastDeviceCheckResult?.success === true && lastDeviceCheckResult.expiresAt) {
      const parsed = Date.parse(lastDeviceCheckResult.expiresAt);
      if (Number.isFinite(parsed)) return parsed;
    }
    return snapshotExpiresAtMs ?? null;
  }, [lastDeviceCheckResult, snapshotExpiresAtMs]);

  const remainingMs =
    expiresAtMs != null && Number.isFinite(expiresAtMs) && nowMs < expiresAtMs
      ? expiresAtMs - nowMs
      : null;

  const isPaidExpiryClose =
    remainingMs != null && remainingMs > 0 && remainingMs <= PAID_EXPIRY_WARNING_MS;

  const remainingLabel =
    isPaidExpiryClose && expiresAtMs != null
      ? formatDeadlineRemaining(expiresAtMs, nowMs, t)
      : null;

  const remainingDays =
    isPaidExpiryClose && expiresAtMs != null
      ? Math.floor((expiresAtMs - nowMs) / (24 * 60 * 60 * 1000))
      : null;

  const isPaidExpiryComfortable = remainingDays != null && remainingDays > 2;

  return { isPaidExpiryClose, remainingLabel, isPaidExpiryComfortable };
}
