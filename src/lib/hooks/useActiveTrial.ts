import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLicense } from "../contexts/licenseContext";
import { formatDeadlineRemaining } from "../license/formatDeadlineRemaining";
import { readLicenseGraceSnapshot } from "../license/offlineGrace";

export function useActiveTrial() {
  const { t } = useTranslation();
  const { lastDeviceCheckResult } = useLicense();
  const [snapshotTrialEndsAtMs, setSnapshotTrialEndsAtMs] = useState<number | null | undefined>(
    undefined,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [lastDeviceCheckResult]);

  useEffect(() => {
    let cancelled = false;
    void readLicenseGraceSnapshot().then((snapshot) => {
      if (!cancelled) {
        setSnapshotTrialEndsAtMs(snapshot?.trialEndsAtMs ?? null);
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

  const trialEndsAtMs = useMemo(() => {
    if (lastDeviceCheckResult?.success === true && lastDeviceCheckResult.trialEndsAt) {
      const parsed = Date.parse(lastDeviceCheckResult.trialEndsAt);
      if (Number.isFinite(parsed)) return parsed;
    }
    return snapshotTrialEndsAtMs ?? null;
  }, [lastDeviceCheckResult, snapshotTrialEndsAtMs]);

  const isTrialActive =
    trialEndsAtMs != null && Number.isFinite(trialEndsAtMs) && nowMs < trialEndsAtMs;

  const remainingLabel =
    isTrialActive && trialEndsAtMs != null
      ? formatDeadlineRemaining(trialEndsAtMs, nowMs, t)
      : null;

  const remainingDays =
    isTrialActive && trialEndsAtMs != null
      ? Math.floor((trialEndsAtMs - nowMs) / (24 * 60 * 60 * 1000))
      : null;

  const isTrialComfortable = remainingDays != null && remainingDays > 2;

  return { isTrialActive, remainingLabel, isTrialComfortable };
}
