import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { DeviceCheckResult } from "../../../electron/types/deviceCheck";
import type {
  MobileDevice,
  MobilePairingCreateResult,
} from "../../../electron/types/mobilePairing";
import { Button } from "../../../lib/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../lib/components/card";
import { Badge } from "../../../lib/components/badge";
import {
  Alert,
  AlertDescription,
} from "../../../lib/components/alert";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import { useToast } from "../../../lib/contexts/toastContext";

const MOBILE_APP_URL = "https://www.redatechpos.com/mobile/";
const MOBILE_REFRESH_COOLDOWN_MS = 60_000;

function InfoRow({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 ${
        className ?? ""
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="break-all text-sm font-semibold text-foreground">
        {value}
      </div>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

export function MobileAppManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [deviceCheck, setDeviceCheck] =
    useState<DeviceCheckResult | null>(null);
  const [mobileAppQrDataUrl, setMobileAppQrDataUrl] = useState<string | null>(null);
  const [mobileAppQrFailed, setMobileAppQrFailed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [mobileUserName, setMobileUserName] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAtMs, setLastRefreshAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [deviceToRevoke, setDeviceToRevoke] =
    useState<MobileDevice | null>(null);

  const refreshStatus = useCallback(async () => {
    if (
      refreshing ||
      (lastRefreshAtMs !== null &&
        Date.now() < lastRefreshAtMs + MOBILE_REFRESH_COOLDOWN_MS)
    ) {
      return;
    }

    setRefreshing(true);
    try {
      const snapshot = await window.api.online.mobileManagementRefresh();
      setDeviceCheck(snapshot.deviceCheck);
      setDevices(snapshot.devices);
      setDevicesError(snapshot.devicesError);
      const refreshedAtMs = Date.now();
      setLastRefreshAtMs(refreshedAtMs);
      setNowMs(refreshedAtMs);
    } catch {
      showToast(
        t("admin.mobileApp.refreshFailed", "Could not refresh mobile access."),
        "error",
      );
    } finally {
      setRefreshing(false);
    }
  }, [lastRefreshAtMs, refreshing, showToast, t]);

  useEffect(() => {
    if (lastRefreshAtMs === null) return;

    const cooldownEndsAt = lastRefreshAtMs + MOBILE_REFRESH_COOLDOWN_MS;
    if (Date.now() >= cooldownEndsAt) {
      setNowMs(Date.now());
      return;
    }

    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      setNowMs(currentTime);
      if (currentTime >= cooldownEndsAt) window.clearInterval(interval);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lastRefreshAtMs]);

  const refreshCooldownRemainingMs =
    lastRefreshAtMs === null
      ? 0
      : Math.max(
          0,
          lastRefreshAtMs + MOBILE_REFRESH_COOLDOWN_MS - nowMs,
        );

  const revokeDevice = async () => {
    if (!deviceToRevoke) return;

    const device = deviceToRevoke;
    setRevokingDeviceId(device.id);
    setError(null);

    try {
      const result = await window.api.online.mobileDeviceRevoke(device.id);

      if (result.success === false) {
        setError(result.error);
        showToast(
          t("admin.mobileApp.revokeFailed", "Could not revoke this phone."),
          "error",
        );
        return;
      }

      setDeviceToRevoke(null);
      showToast(
        t("admin.mobileApp.revokeSuccess", "{{name}} was revoked.", {
          name: device.deviceName,
        }),
        "success",
      );
    } catch {
      setError(t("admin.mobileApp.revokeFailed", "Could not revoke this phone."));
      showToast(
        t("admin.mobileApp.revokeFailed", "Could not revoke this phone."),
        "error",
      );
    } finally {
      setRevokingDeviceId(null);
    }
  };

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(MOBILE_APP_URL, {
      width: 180,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (active) setMobileAppQrDataUrl(dataUrl);
    }).catch(() => {
      if (active) setMobileAppQrFailed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const expiresAtMs = Date.parse(expiresAt);
    let expiryTimeout: ReturnType<typeof setTimeout> | null = null;
    const updateCountdown = () => {
      const seconds = Number.isFinite(expiresAtMs)
        ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
        : 0;
      setRemainingSeconds(seconds);
      if (seconds === 0) {
        clearInterval(interval);
        expiryTimeout = setTimeout(() => {
          setQrDataUrl(null);
          setExpiresAt(null);
          setRemainingSeconds(null);
        }, 8000);
      }
    };
    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => {
      clearInterval(interval);
      if (expiryTimeout !== null) clearTimeout(expiryTimeout);
    };
  }, [expiresAt]);

  useEffect(() => {
    let active = true;
    const applySnapshot = (snapshot: {
      deviceCheck: DeviceCheckResult | null;
      devices: MobileDevice[];
      devicesError: string | null;
    }) => {
      setDeviceCheck(snapshot.deviceCheck);
      setDevices(snapshot.devices);
      setDevicesError(snapshot.devicesError);
    };
    const unsubscribe =
      window.api.online.onMobileManagementSnapshotChanged(applySnapshot);
    void window.api.online.mobileManagementSnapshot().then((snapshot) => {
      if (active) applySnapshot(snapshot);
    }).catch((cause: unknown) => {
      if (active) {
        setError(
          cause instanceof Error
            ? cause.message
            : t("admin.mobileApp.syncRequestFailed"),
        );
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const createPairingCode = async () => {
    const name = mobileUserName.trim();

    if (!name) {
      setError(t("admin.mobileApp.nameRequired"));
      return;
    }

    setBusy(true);
    setError(null);
    setQrDataUrl(null);
    setExpiresAt(null);

    try {
      const result: MobilePairingCreateResult =
        await window.api.online.mobilePairingCreate(name);

      if (result.success === false) {
        setError(result.error);
        showToast(
          t("admin.mobileApp.createFailed", "Could not create a pairing code."),
          "error",
        );
        return;
      }

      const qr = await QRCode.toDataURL(result.token, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setExpiresAt(result.expiresAt);
      setQrDataUrl(qr);
      showToast(
        t(
          "admin.mobileApp.pairingCreated",
          "Pairing QR code created. Scan it with the mobile app.",
        ),
        "success",
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : t("admin.mobileApp.createFailed");
      setError(message);
      showToast(
        t("admin.mobileApp.createFailed", "Could not create a pairing code."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const mobileEnabled =
    deviceCheck?.success === true &&
    deviceCheck.mobileEnabled === true &&
    (deviceCheck.mobileDeviceLimit ?? 0) > 0;

  const statusText =
    deviceCheck === null
      ? t("admin.mobileApp.checking")
      : deviceCheck.success === false
        ? deviceCheck.error
        : !deviceCheck.allowed
          ? t("admin.mobileApp.desktopNotLicensed")
          : mobileEnabled
            ? t("admin.mobileApp.enabled")
            : t("admin.mobileApp.disabled");

  const statusBadgeClass =
    deviceCheck?.success === true &&
    deviceCheck.allowed &&
    mobileEnabled
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : deviceCheck === null
        ? "border-border bg-muted text-muted-foreground"
        : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";

  const activeDeviceCount = devices.filter(
    (device) => device.active && !device.revokedAt,
  ).length;
  const hasPairingCode = qrDataUrl !== null && expiresAt !== null;
  const countdownLabel =
    remainingSeconds === null
      ? ""
      : remainingSeconds === 0
        ? t("admin.mobileApp.expired")
        : t("admin.mobileApp.expiresIn", {
            time: `${Math.floor(remainingSeconds / 60)
              .toString()
              .padStart(2, "0")}:${(remainingSeconds % 60)
              .toString()
              .padStart(2, "0")}`,
          });

  const pairingSteps = [
    {
      number: "01",
      title: t("admin.mobileApp.pwaQrTitle"),
      description: t("admin.mobileApp.pwaQrStep"),
      Icon: Smartphone,
    },
    {
      number: "02",
      title: t("admin.mobileApp.nameLabel"),
      description: t(
        "admin.mobileApp.namePlaceholder",
        "Enter a name for this phone",
      ),
      Icon: Smartphone,
    },
    {
      number: "03",
      title: t("admin.mobileApp.createCode"),
      description: t(
        "admin.mobileApp.generateHelp",
        "Generate a temporary QR code",
      ),
      Icon: QrCode,
    },
    {
      number: "04",
      title: t("admin.mobileApp.scanStep", "Scan and connect"),
      description: t(
        "admin.mobileApp.scanInstruction",
        "Scan the QR code with your phone",
      ),
      Icon: ScanLine,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
            <Smartphone className="h-6 w-6 text-orange-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("admin.mobileApp.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("admin.mobileApp.description")}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshStatus()}
          disabled={refreshing || refreshCooldownRemainingMs > 0}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {refreshCooldownRemainingMs > 0
            ? t("admin.mobileApp.refreshCooldown", "Refresh ({{seconds}}s)", {
                seconds: Math.ceil(refreshCooldownRemainingMs / 1000),
              })
            : refreshing
              ? t("admin.mobileApp.refreshing", "Refreshing...")
              : t("admin.mobileApp.refresh")}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {/* Mobile access status and pairing */}
      <div className="space-y-5">
        <Card className="border-border shadow-sm">
          <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-orange-600" />
                <span className="text-sm font-semibold">
                  {t("admin.mobileApp.status")}
                </span>
                {!(deviceCheck?.success === true &&
                  deviceCheck.allowed &&
                  mobileEnabled) ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                ) : null}
                <Badge
                  variant="outline"
                  className={`max-w-full whitespace-normal ${statusBadgeClass}`}
                >
                  {statusText}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("admin.mobileApp.entitlementHelp")}
              </p>
            </div>

            {deviceCheck?.success === true && deviceCheck.allowed ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                  <Smartphone className="h-4 w-4 shrink-0 text-orange-600" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("admin.mobileApp.pairedDevices", "Paired phones")}
                    </p>
                    <p className="text-lg font-bold tabular-nums">
                      {activeDeviceCount}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {t("admin.mobileApp.deviceActive", "Active")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-orange-600" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {t("admin.mobileApp.deviceLimitLabel", "Phone limit")}
                    </p>
                    <p className="text-lg font-bold tabular-nums">
                      {deviceCheck.mobileDeviceLimit ?? 0}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {t("admin.mobileApp.deviceLimitHelp", "Allowed")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Pair a new phone */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

          <CardHeader className="relative pb-2">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
                <QrCode className="h-5 w-5 text-orange-600" />
              </div>

              <div className="min-w-0">
                <CardTitle className="text-base">
                  {t("admin.mobileApp.createCode")}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "admin.mobileApp.pairingDescription",
                    "Connect a phone to your store in a few simple steps.",
                  )}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative grid gap-5 pt-3">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
              <div className="grid w-full max-w-sm gap-2">
                <label
                  htmlFor="mobile-user-name"
                  className="text-sm font-medium"
                >
                  {t("admin.mobileApp.nameLabel")}
                </label>

                <input
                  id="mobile-user-name"
                  value={mobileUserName}
                  onChange={(event) => setMobileUserName(event.target.value)}
                  maxLength={60}
                  autoComplete="off"
                  disabled={hasPairingCode}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/50"
                  placeholder={t("admin.mobileApp.namePlaceholder")}
                />
              </div>

              <Button
                type="button"
                onClick={() => void createPairingCode()}
                disabled={
                  !mobileEnabled ||
                  busy ||
                  !mobileUserName.trim() ||
                  hasPairingCode
                }
                className="h-11 w-fit bg-orange-600 font-semibold text-white hover:bg-orange-700"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}

                {busy
                  ? t("admin.mobileApp.syncingData")
                  : t("admin.mobileApp.createCode")}
              </Button>
            </div>

            {!mobileEnabled && deviceCheck !== null ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusText}</span>
              </div>
            ) : null}

            {/* Three-step guide */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pairingSteps.map((step) => {
                const StepIcon = step.Icon;

                return (
                  <div
                    key={step.number}
                    className="rounded-lg border border-border/70 bg-muted/20 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-1">
                      <StepIcon className="h-4 w-4 text-orange-600" />
                      <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                        {step.number}
                      </span>
                    </div>

                    <p className="text-xs font-semibold leading-4">
                      {step.title}
                    </p>

                    <p className="mt-1 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className={`grid gap-4 ${
                qrDataUrl && expiresAt ? "lg:grid-cols-2" : ""
              }`}
            >
              <div className="flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-5 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t("admin.mobileApp.pwaQrTitle")}
                  </p>
                  <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
                    {t("admin.mobileApp.pwaQrHelp")}
                  </p>
                </div>

                <a
                  href={MOBILE_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("admin.mobileApp.pwaQrAlt")}
                  className="block w-full max-w-[164px] rounded-xl border border-border bg-white p-2 shadow-sm"
                >
                  {mobileAppQrDataUrl ? (
                    <img
                      src={mobileAppQrDataUrl}
                      alt={t("admin.mobileApp.pwaQrAlt")}
                      className="block aspect-square w-full rounded-md"
                    />
                  ) : mobileAppQrFailed ? (
                    <div className="flex aspect-square items-center justify-center p-3 text-center text-xs text-muted-foreground">
                      {t("admin.mobileApp.pwaQrUnavailable")}
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </a>

                <a
                  href={MOBILE_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs font-medium text-orange-700 underline decoration-orange-500/40 underline-offset-4 dark:text-orange-300"
                >
                  {MOBILE_APP_URL}
                </a>
              </div>

              {hasPairingCode && qrDataUrl && expiresAt ? (
                <div className="flex flex-col items-center gap-4 rounded-xl border border-orange-500/20 bg-muted/20 p-5">
                  <div className="flex w-full items-center gap-2">
                    {remainingSeconds === 0 ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}

                    <span className="text-sm font-semibold">
                      {remainingSeconds === 0
                        ? t("admin.mobileApp.expired")
                        : t("admin.mobileApp.qrReady")}
                    </span>

                    <Badge
                      variant="outline"
                      className={`ml-auto shrink-0 ${
                        remainingSeconds === 0
                          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                          : ""
                      }`}
                    >
                      <Clock3 className="mr-1 h-3 w-3" />
                      {remainingSeconds === 0
                        ? t("admin.mobileApp.expired")
                        : t("admin.mobileApp.temporary")}
                    </Badge>
                  </div>

                  <div className="w-full max-w-[164px] rounded-xl border border-border bg-white p-2 shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt={t("admin.mobileApp.qrAlt")}
                      className={`block aspect-square w-full rounded-md ${
                        remainingSeconds === 0
                          ? "grayscale opacity-40"
                          : ""
                      }`}
                    />
                  </div>

                  <p
                    className={`text-center text-xs leading-relaxed ${
                      remainingSeconds === 0
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t("admin.mobileApp.scanInstruction")}
                  </p>

                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg border border-border/70 bg-background/70 p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        {t("admin.mobileApp.nameLabel")}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold">
                        {mobileUserName.trim()}
                      </p>
                    </div>

                    <div
                      className={`min-w-0 rounded-lg border p-3 text-center ${
                        remainingSeconds === 0
                          ? "border-red-500/30 bg-red-500/10"
                          : "border-orange-500/20 bg-orange-500/5"
                      }`}
                    >
                      <p className="flex items-center justify-center gap-1.5 text-xs font-medium">
                        <Clock3
                          className={`h-3.5 w-3.5 ${
                            remainingSeconds === 0
                              ? "text-red-600"
                              : "text-orange-600"
                          }`}
                        />
                        {t("admin.mobileApp.expiryLabel")}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          remainingSeconds === 0
                            ? "font-semibold text-red-700 dark:text-red-300"
                            : "text-muted-foreground"
                        }`}
                      >
                        {countdownLabel}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paired device management */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
                <Smartphone className="h-5 w-5 text-orange-600" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {t("admin.mobileApp.pairedDevices", "Paired phones")}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {activeDeviceCount}{" "}
                    {t("admin.mobileApp.activeCount", "active")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "admin.mobileApp.deviceManagementHelp",
                    "View and manage phones connected to your store.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {devicesError ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{devicesError}</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
                <Smartphone className="h-6 w-6 text-orange-600" />
              </div>

              <p className="text-sm font-semibold">
                {t(
                  "admin.mobileApp.noDevices",
                  "No phones are paired yet.",
                )}
              </p>

              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {t(
                  "admin.mobileApp.emptyDevicesHelp",
                  "Create a pairing QR code above to connect your first phone.",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const isActive = device.active && !device.revokedAt;
                const platformLabel =
                  device.platform === "ios"
                    ? "iPhone"
                    : device.platform === "android"
                      ? "Android"
                      : device.platform;

                return (
                  <div
                    key={device.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:p-4"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        isActive
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-border bg-muted"
                      }`}
                    >
                      <Smartphone
                        className={`h-5 w-5 ${
                          isActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-semibold">
                          {device.deviceName}
                        </p>
                        {platformLabel ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {platformLabel}
                          </Badge>
                        ) : null}

                        <Badge
                          variant="outline"
                          className={
                            isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                          }
                        >
                          {isActive
                            ? t("admin.mobileApp.deviceActive", "Active")
                            : t("admin.mobileApp.deviceRevoked", "Revoked")}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
                        <span>
                          {t("admin.mobileApp.pairedOn", "Paired")}:{" "}
                          {new Date(device.pairedAt).toLocaleString()}
                        </span>

                        <span>
                          {t("admin.mobileApp.lastSeen", "Last seen")}:{" "}
                          {device.lastSeenAt
                            ? new Date(device.lastSeenAt).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                        disabled={revokingDeviceId !== null}
                        onClick={() => setDeviceToRevoke(device)}
                      >
                        {revokingDeviceId === device.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {t("admin.mobileApp.revoke", "Revoke")}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deviceToRevoke !== null}
        onOpenChange={(open) => {
          if (!open && revokingDeviceId === null) {
            setDeviceToRevoke(null);
          }
        }}
        title={t("admin.mobileApp.revoke", "Revoke")}
        message={t("admin.mobileApp.confirmRevoke", {
          name: deviceToRevoke?.deviceName ?? "",
        })}
        confirmText={t("admin.mobileApp.revoke", "Revoke")}
        variant="danger"
        onConfirm={revokeDevice}
        loading={revokingDeviceId !== null}
      />
    </div>
  );
}
