import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Copy,
  Globe,
  HardDrive,
  Loader2,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { DeviceCheckResult } from "../../../electron/types/deviceCheck";
import { Button } from "../../../lib/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../lib/components/card";
import { Badge } from "../../../lib/components/badge";
import { Alert, AlertDescription } from "../../../lib/components/alert";
import { useToast } from "../../../lib/contexts/toastContext";
import { useLicense } from "../../../lib/contexts/licenseContext";
import { ONLINE_CUSTOMER_ID_OPTION_KEY } from "../../../lib/onboarding/constants";
import {
  getEffectiveOfflineDeadlineMs,
  isOfflineLicenseAllowed,
  readLicenseGraceSnapshot,
  type LicenseGraceSnapshot,
} from "../../../lib/license/offlineGrace";

type AccessMode = "licensed_online" | "licensed_offline" | "not_licensed" | "unknown";

const ONLINE_CHECK_COOLDOWN_MS = 60_000;

function readCustomerIdFromCheck(result: DeviceCheckResult | null): string | null {
  if (!result || result.success !== true || !result.raw || typeof result.raw !== "object") {
    return null;
  }
  const customerId = (result.raw as Record<string, unknown>).customer_id;
  return typeof customerId === "string" && customerId.trim() ? customerId.trim() : null;
}

function formatDateTime(valueMs: number | null | undefined, locale: string): string {
  if (valueMs == null || !Number.isFinite(valueMs)) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valueMs));
}

function formatRemaining(
  deadlineMs: number | null | undefined,
  nowMs: number,
  t: TFunction,
): string {
  if (deadlineMs == null || !Number.isFinite(deadlineMs)) {
    return t("admin.license.notApplicable", "Not applicable");
  }
  if (nowMs >= deadlineMs) {
    return t("admin.license.expired", "Expired");
  }

  const diffMs = deadlineMs - nowMs;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return t("admin.license.remainingDaysHours", "{{days}}d {{hours}}h left", { days, hours });
  }
  if (hours > 0) {
    return t("admin.license.remainingHoursMinutes", "{{hours}}h {{minutes}}m left", { hours, minutes });
  }
  return t("admin.license.remainingMinutes", "{{minutes}}m left", { minutes });
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="break-all text-sm font-semibold text-foreground">{value}</div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function LicenseManagement() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isLicenseValid, lastDeviceCheckResult, applyDeviceCheckResult } = useLicense();
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [storedCustomerId, setStoredCustomerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LicenseGraceSnapshot | null>(null);
  const [pageCheckResult, setPageCheckResult] = useState<DeviceCheckResult | null>(null);
  const [lastOnlineCheckAtMs, setLastOnlineCheckAtMs] = useState<number | null>(null);
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);
  const [copiedCustomerId, setCopiedCustomerId] = useState(false);

  const locale = i18n.language === "ar" ? "ar" : i18n.language === "fr" ? "fr" : "en";

  const loadSavedLicense = useCallback(async () => {
    try {
      const [machineResult, customerIdValue, localSnapshot] = await Promise.all([
        window.api.system.getMachineId(),
        window.api.database.options.get(ONLINE_CUSTOMER_ID_OPTION_KEY),
        readLicenseGraceSnapshot(),
      ]);

      setDeviceId(machineResult.success ? machineResult.machineId ?? null : null);
      let trimmedCustomerId = customerIdValue?.trim() || null;
      if (!trimmedCustomerId && isOnline) {
        const check = await window.api.online.deviceCheck();
        if (check.success === true && check.customerId?.trim()) {
          trimmedCustomerId = check.customerId.trim();
          const refreshed = await window.api.database.options.get(ONLINE_CUSTOMER_ID_OPTION_KEY);
          trimmedCustomerId = refreshed?.trim() || trimmedCustomerId;
        }
      }
      setStoredCustomerId(trimmedCustomerId);
      setSnapshot(localSnapshot);
    } catch {
      setSnapshot(null);
    }
  }, [isOnline]);

  const checkOnlineLicense = useCallback(async () => {
    if (refreshing) return;
    if (
      lastOnlineCheckAtMs != null &&
      Date.now() < lastOnlineCheckAtMs + ONLINE_CHECK_COOLDOWN_MS
    ) {
      return;
    }

    setRefreshing(true);
    try {
      const deviceCheck = await window.api.online.deviceCheck();
      setPageCheckResult(deviceCheck);
      await applyDeviceCheckResult(deviceCheck);
      setSnapshot(await readLicenseGraceSnapshot());
      setLastOnlineCheckAtMs(Date.now());
    } catch {
      setPageCheckResult(null);
      showToast(
        t("admin.license.checkOnlineFailed", "Could not complete the online license check"),
        "error",
      );
    } finally {
      setRefreshing(false);
    }
  }, [applyDeviceCheckResult, lastOnlineCheckAtMs, refreshing, showToast, t]);

  useEffect(() => {
    void loadSavedLicense();
  }, [loadSavedLicense]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastOnlineCheckAtMs == null) return;
    if (Date.now() >= lastOnlineCheckAtMs + ONLINE_CHECK_COOLDOWN_MS) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastOnlineCheckAtMs]);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  const effectiveCheckResult = pageCheckResult ?? lastDeviceCheckResult;

  const remoteCustomerId = useMemo(
    () => readCustomerIdFromCheck(effectiveCheckResult),
    [effectiveCheckResult],
  );
  const customerId = remoteCustomerId ?? storedCustomerId;

  const customerName = useMemo(() => {
    if (effectiveCheckResult?.success !== true) return null;
    const name = effectiveCheckResult.customerName;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  }, [effectiveCheckResult]);

  const customerPhone = useMemo(() => {
    if (effectiveCheckResult?.success !== true) return null;
    const phone = effectiveCheckResult.customerPhone;
    return typeof phone === "string" && phone.trim() ? phone.trim() : null;
  }, [effectiveCheckResult]);

  const onlineCheckCooldownRemainingMs = useMemo(() => {
    if (lastOnlineCheckAtMs == null) return 0;
    return Math.max(0, lastOnlineCheckAtMs + ONLINE_CHECK_COOLDOWN_MS - nowMs);
  }, [lastOnlineCheckAtMs, nowMs]);

  const accessMode: AccessMode = useMemo(() => {
    if (!effectiveCheckResult) {
      if (!snapshot) return "unknown";
      if (!isOfflineLicenseAllowed(snapshot, nowMs)) return "not_licensed";
      return isLicenseValid ? "licensed_online" : "licensed_offline";
    }
    if (effectiveCheckResult.success === true) {
      return effectiveCheckResult.allowed ? "licensed_online" : "not_licensed";
    }
    if (effectiveCheckResult.code === "network" && isOfflineLicenseAllowed(snapshot, nowMs)) {
      return "licensed_offline";
    }
    return "not_licensed";
  }, [effectiveCheckResult, isLicenseValid, snapshot, nowMs]);

  const trialEndsAtMs = useMemo(() => {
    if (effectiveCheckResult?.success === true && effectiveCheckResult.trialEndsAt) {
      const parsed = Date.parse(effectiveCheckResult.trialEndsAt);
      if (Number.isFinite(parsed)) return parsed;
    }
    return snapshot?.trialEndsAtMs ?? null;
  }, [effectiveCheckResult, snapshot]);

  const subscriptionEndsAtMs = useMemo(() => {
    if (effectiveCheckResult?.success === true && effectiveCheckResult.expiresAt) {
      const parsed = Date.parse(effectiveCheckResult.expiresAt);
      if (Number.isFinite(parsed)) return parsed;
    }
    return snapshot?.expiresAtMs ?? null;
  }, [effectiveCheckResult, snapshot]);

  const effectiveOfflineDeadlineMs = snapshot ? getEffectiveOfflineDeadlineMs(snapshot) : null;
  const isTrialActive =
    trialEndsAtMs != null && Number.isFinite(trialEndsAtMs) && nowMs < trialEndsAtMs;
  const hasPaidAccess =
    accessMode === "licensed_online" || accessMode === "licensed_offline";
  const subscriptionEndsLabel =
    subscriptionEndsAtMs != null
      ? formatDateTime(subscriptionEndsAtMs, locale)
      : isTrialActive
        ? t("admin.license.trialOnlyNoPaid", "Trial only — no paid subscription yet")
        : hasPaidAccess
          ? t("admin.license.lifetimePaid", "Lifetime paid license")
          : t("admin.license.noPaidLicense", "No paid license");
  const subscriptionRemainingLabel =
    subscriptionEndsAtMs != null
      ? formatRemaining(subscriptionEndsAtMs, nowMs, t)
      : t("admin.license.notApplicable", "Not applicable");

  const copyDeviceId = async () => {
    if (!deviceId) return;
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopiedDeviceId(true);
      showToast(t("admin.license.deviceIdCopied", "Device ID copied"), "success");
      window.setTimeout(() => setCopiedDeviceId(false), 2000);
    } catch {
      showToast(t("admin.license.deviceIdCopyFailed", "Could not copy device ID"), "error");
    }
  };

  const copyCustomerId = async () => {
    if (!customerId) return;
    try {
      await navigator.clipboard.writeText(customerId);
      setCopiedCustomerId(true);
      showToast(t("admin.license.customerIdCopied", "Customer ID copied"), "success");
      window.setTimeout(() => setCopiedCustomerId(false), 2000);
    } catch {
      showToast(t("admin.license.customerIdCopyFailed", "Could not copy customer ID"), "error");
    }
  };

  const statusMeta = {
    licensed_online: {
      icon: ShieldCheck,
      badge: t("admin.license.statusLicensed", "Licensed"),
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      title: t("admin.license.statusLicensedTitle", "This device is allowed to use the app"),
      description: t(
        "admin.license.statusLicensedDescription",
        "The latest online check succeeded. The dates below show how long you can stay offline before you must go online and sign in again.",
      ),
    },
    licensed_offline: {
      icon: WifiOff,
      badge: t("admin.license.statusOfflineGrace", "Offline access"),
      badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      title: t("admin.license.statusOfflineTitle", "Offline access is active on this device"),
      description: t(
        "admin.license.statusOfflineDescription",
        "The licensing service could not be reached. Access is based on the last successful online check stored on this PC.",
      ),
    },
    not_licensed: {
      icon: ShieldOff,
      badge: t("admin.license.statusBlocked", "Not allowed"),
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
      title: t("admin.license.statusBlockedTitle", "This device is not allowed right now"),
      description: t(
        "admin.license.statusBlockedDescription",
        "Sign in again when the device is activated, the trial is valid, or the internet connection is restored.",
      ),
    },
    unknown: {
      icon: Shield,
      badge: t("admin.license.statusUnknown", "Not checked online"),
      badgeClass: "bg-muted text-muted-foreground border-border",
      title: t("admin.license.statusUnknownTitle", "No online check on this page yet"),
      description: t(
        "admin.license.statusUnknownDescription",
        "Review the saved dates below, or use Check online in the top right for a current server result. Online checks are limited to once per minute.",
      ),
    },
  }[accessMode];

  const StatusIcon = statusMeta.icon;
  const checkError =
    effectiveCheckResult &&
    effectiveCheckResult.success === false &&
    effectiveCheckResult.code !== "network"
      ? effectiveCheckResult.error
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Shield className="h-7 w-7 text-orange-600" />
            {t("admin.license.title", "License")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t(
              "admin.license.description",
              "Review device licensing, trial and subscription dates, and offline access limits for this computer.",
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void checkOnlineLicense()}
          disabled={refreshing || onlineCheckCooldownRemainingMs > 0}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {onlineCheckCooldownRemainingMs > 0
            ? t("admin.license.checkOnlineCooldown", "Check online ({{seconds}}s)", {
                seconds: Math.ceil(onlineCheckCooldownRemainingMs / 1000),
              })
            : t("admin.license.checkOnline", "Check online")}
        </Button>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-orange-500/10 via-background to-background p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
                <StatusIcon className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusMeta.badgeClass}>
                    {statusMeta.badge}
                  </Badge>
                  <Badge variant="outline" className="border-border">
                    {isOnline ? (
                      <div className="inline-flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5" />
                        {t("admin.license.online", "Online")}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <WifiOff className="h-3.5 w-3.5" />
                        {t("admin.license.offline", "Offline")}
                      </div>
                    )}
                  </Badge>
                  {isTrialActive ? (
                    <Badge className="border-orange-500 bg-orange-500 text-white hover:bg-orange-500">
                      {t("admin.license.trialModeBadge", "Free trial")}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{statusMeta.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{statusMeta.description}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {checkError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{checkError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4 text-orange-600" />
              {t("admin.license.deviceSection", "Device")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label={t("admin.license.deviceId", "Device ID")}
              value={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm">{deviceId ?? "—"}</span>
                  {deviceId ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void copyDeviceId()}>
                      {copiedDeviceId ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                      {copiedDeviceId ? t("admin.license.copied", "Copied") : t("admin.license.copy", "Copy")}
                    </Button>
                  ) : null}
                </div>
              }
              hint={t("admin.license.deviceIdHint", "Used for online device activation on this PC.")}
            />
            <InfoRow
              label={t("admin.license.customerId", "Customer ID")}
              value={
                customerId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm">{customerId}</span>
                    <Button type="button" size="sm" variant="outline" onClick={() => void copyCustomerId()}>
                      {copiedCustomerId ? (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="mr-1 h-3.5 w-3.5" />
                      )}
                      {copiedCustomerId
                        ? t("admin.license.copied", "Copied")
                        : t("admin.license.copy", "Copy")}
                    </Button>
                  </div>
                ) : (
                  t("admin.license.notRecorded", "Not recorded")
                )
              }
              hint={t(
                "admin.license.customerIdHint",
                "Used for cloud backup ownership after welcome setup.",
              )}
            />
            <InfoRow
              label={t("admin.license.customerName", "Customer name")}
              value={customerName ?? t("admin.license.notRecorded", "Not recorded")}
            />
            <InfoRow
              label={t("admin.license.customerPhone", "Phone")}
              value={customerPhone ?? t("admin.license.notRecorded", "Not recorded")}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-orange-600" />
              {t("admin.license.onlineSection", "Latest online check")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label={t("admin.license.lastCheck", "Last successful online allow")}
              value={formatDateTime(snapshot?.lastOkAtMs, locale)}
              hint={t(
                "admin.license.lastCheckHint",
                "Updated only when the server returns allowed.",
              )}
            />
            <InfoRow
              label={t("admin.license.serverAllowed", "Server result")}
              value={
                effectiveCheckResult?.success === true
                  ? effectiveCheckResult.allowed
                    ? t("admin.license.allowedYes", "Allowed")
                    : t("admin.license.allowedNo", "Not allowed")
                  : t("admin.license.unavailable", "Unavailable")
              }
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-orange-600" />
              {t("admin.license.trialSection", "Trial")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label={t("admin.license.trialEnds", "Trial ends")}
              value={formatDateTime(trialEndsAtMs, locale)}
            />
            <InfoRow
              label={t("admin.license.trialRemaining", "Time left")}
              value={formatRemaining(trialEndsAtMs, nowMs, t)}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-orange-600" />
              {t("admin.license.subscriptionSection", "Paid license")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label={t("admin.license.subscriptionEnds", "Subscription ends")}
              value={subscriptionEndsLabel}
            />
            <InfoRow
              label={t("admin.license.subscriptionRemaining", "Time left")}
              value={subscriptionRemainingLabel}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <WifiOff className="h-4 w-4 text-orange-600" />
              {t("admin.license.offlineSection", "Offline access")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <InfoRow
              label={t("admin.license.graceEnds", "Next online check by")}
              value={formatDateTime(snapshot?.graceUntilMs, locale)}
              hint={t(
                "admin.license.graceEndsHint",
                "You can keep using the app offline until then. After that, connect and sign in again.",
              )}
            />
            <InfoRow
              label={t("admin.license.graceRemaining", "Time left until next online check")}
              value={formatRemaining(snapshot?.graceUntilMs, nowMs, t)}
            />
            <InfoRow
              label={t("admin.license.effectiveOfflineEnds", "Work offline until")}
              value={formatDateTime(effectiveOfflineDeadlineMs, locale)}
              hint={t(
                "admin.license.effectiveOfflineEndsHint",
                "The earliest of your next required online check, trial end, and paid subscription end.",
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
