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
import type { MobileSyncStatus } from "../../../electron/types/mobileSync";
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
  const [deviceCheck, setDeviceCheck] =
    useState<DeviceCheckResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [mobileUserName, setMobileUserName] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [mobileSyncStatus, setMobileSyncStatus] =
    useState<MobileSyncStatus | null>(null);
  const [mobileSyncBusy, setMobileSyncBusy] = useState(false);
  const [mobileSyncMessage, setMobileSyncMessage] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(
    null,
  );
  const [deviceToRevoke, setDeviceToRevoke] =
    useState<MobileDevice | null>(null);

  const refreshDevices = useCallback(async () => {
    const result = await window.api.online.mobileDeviceList();

    if (result.success === true) {
      setDevices(result.devices);
      setDevicesError(null);
    } else {
      setDevicesError(result.error);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const result = await window.api.online.deviceCheck();
    setDeviceCheck(result);
    await refreshDevices();
    setMobileSyncStatus(await window.api.online.mobileSyncStatus());
  }, [refreshDevices]);

  const refreshMobileSyncStatus = useCallback(async () => {
    setMobileSyncStatus(await window.api.online.mobileSyncStatus());
  }, []);

  const retryMobileSync = async () => {
    setMobileSyncBusy(true);
    setMobileSyncMessage(null);
    try {
      const result = await window.api.online.mobileSyncNow();
      setMobileSyncStatus(result.status);
      setMobileSyncMessage(
        result.success === true
          ? t("admin.mobileApp.syncSucceeded")
          : result.error,
      );
    } catch {
      setMobileSyncMessage(t("admin.mobileApp.syncRequestFailed"));
    } finally {
      setMobileSyncBusy(false);
    }
  };

  const revokeDevice = async () => {
    if (!deviceToRevoke) return;

    const device = deviceToRevoke;
    setRevokingDeviceId(device.id);
    setError(null);

    try {
      const result = await window.api.online.mobileDeviceRevoke(device.id);

      if (result.success === false) {
        setError(result.error);
        return;
      }

      setDeviceToRevoke(null);
      await refreshDevices();
    } finally {
      setRevokingDeviceId(null);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const unsubscribe =
      window.api.online.onMobileSyncStatusChanged(setMobileSyncStatus);
    void refreshMobileSyncStatus();
    return unsubscribe;
  }, [refreshMobileSyncStatus]);

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
        return;
      }

      const qr = await QRCode.toDataURL(result.token, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setExpiresAt(result.expiresAt);
      setQrDataUrl(qr);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("admin.mobileApp.createFailed"),
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

  const pairingSteps = [
    {
      number: "01",
      title: t("admin.mobileApp.nameLabel"),
      description: t(
        "admin.mobileApp.namePlaceholder",
        "Enter a name for this phone",
      ),
      Icon: Smartphone,
    },
    {
      number: "02",
      title: t("admin.mobileApp.createCode"),
      description: t(
        "admin.mobileApp.generateHelp",
        "Generate a temporary QR code",
      ),
      Icon: QrCode,
    },
    {
      number: "03",
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
          className="shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("admin.mobileApp.refresh")}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {mobileSyncMessage ? (
        <Alert variant={mobileSyncStatus?.lastError ? "destructive" : "default"}>
          {mobileSyncStatus?.lastError ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{mobileSyncMessage}</AlertDescription>
        </Alert>
      ) : null}

      {/* Status and pairing */}
      <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.4fr]">
        {/* Mobile access status */}
        <Card className="h-full border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-orange-600" />
              {t("admin.mobileApp.status")}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {t("admin.mobileApp.status")}
                </span>

                {deviceCheck?.success === true &&
                deviceCheck.allowed &&
                mobileEnabled ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <Badge
                variant="outline"
                className={`max-w-full whitespace-normal ${statusBadgeClass}`}
              >
                {statusText}
              </Badge>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {t("admin.mobileApp.entitlementHelp")}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {t("admin.mobileApp.syncTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mobileSyncStatus?.inProgress
                      ? t("admin.mobileApp.syncing")
                      : mobileSyncStatus?.pending
                        ? t("admin.mobileApp.syncPending")
                        : mobileSyncStatus?.lastSuccessAt
                          ? `${t("admin.mobileApp.syncLastSuccess")}: ${new Date(
                              mobileSyncStatus.lastSuccessAt,
                            ).toLocaleString()}`
                          : t("admin.mobileApp.syncNever")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!mobileEnabled || mobileSyncBusy || mobileSyncStatus?.inProgress}
                  onClick={() => void retryMobileSync()}
                >
                  {mobileSyncBusy || mobileSyncStatus?.inProgress ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {mobileSyncBusy || mobileSyncStatus?.inProgress
                    ? t("admin.mobileApp.syncing")
                    : t("admin.mobileApp.syncNow")}
                </Button>
              </div>
              {mobileSyncStatus?.lastError ? (
                <p className="text-xs text-destructive">
                  {t("admin.mobileApp.syncError")}: {mobileSyncStatus.lastError}
                </p>
              ) : null}
            </div>

            {deviceCheck?.success === true && deviceCheck.allowed ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="h-4 w-4 text-orange-600" />
                    <span className="text-xs">
                      {t(
                        "admin.mobileApp.pairedDevices",
                        "Paired phones",
                      )}
                    </span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {activeDeviceCount}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admin.mobileApp.deviceActive", "Active")}
                  </p>
                </div>

                <div className="rounded-xl border border-border/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-orange-600" />
                    <span className="text-xs">
                      {t(
                        "admin.mobileApp.deviceLimitLabel",
                        "Phone limit",
                      )}
                    </span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {deviceCheck.mobileDeviceLimit ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "admin.mobileApp.deviceLimitHelp",
                      "Allowed devices",
                    )}
                  </p>
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
            <div className="grid gap-2">
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
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/50"
                placeholder={t("admin.mobileApp.namePlaceholder")}
              />
            </div>

            <Button
              type="button"
              onClick={() => void createPairingCode()}
              disabled={!mobileEnabled || busy || !mobileUserName.trim()}
              className="h-11 w-full bg-orange-600 font-semibold text-white hover:bg-orange-700"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}

              {busy
                ? t("admin.mobileApp.creating")
                : t("admin.mobileApp.createCode")}
            </Button>

            {!mobileEnabled && deviceCheck !== null ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusText}</span>
              </div>
            ) : null}

            {/* Three-step guide */}
            <div className="grid grid-cols-3 gap-2">
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

            {/* Generated QR code */}
            {qrDataUrl && expiresAt ? (
              <div className="overflow-hidden rounded-xl border border-orange-500/20 bg-muted/20">
                <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />

                  <span className="text-sm font-semibold">
                    {t(
                      "admin.mobileApp.qrReady",
                      "Pairing code ready",
                    )}
                  </span>

                  <Badge variant="outline" className="ml-auto shrink-0">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {t("admin.mobileApp.temporary", "Temporary")}
                  </Badge>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                  <div className="mx-auto w-full max-w-[220px] rounded-xl border border-border bg-white p-2 shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt={t("admin.mobileApp.qrAlt")}
                      className="block aspect-square w-full rounded-md"
                    />
                  </div>

                  <div className="min-w-0 space-y-3 text-center sm:text-left">
                    <p className="text-sm font-semibold text-foreground">
                      {t("admin.mobileApp.scanInstruction")}
                    </p>

                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t("admin.mobileApp.nameLabel")}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold">
                        {mobileUserName.trim()}
                      </p>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-left">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">
                          {t(
                            "admin.mobileApp.expiryLabel",
                            "Code expiry",
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("admin.mobileApp.expiresAt", {
                            time: new Date(expiresAt).toLocaleTimeString(),
                          })}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        "admin.mobileApp.qrSecurityHelp",
                        "Scan this code using the mobile pairing page to connect the phone.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Paired device management */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
                <Smartphone className="h-5 w-5 text-orange-600" />
              </div>

              <div>
                <CardTitle className="text-base">
                  {t("admin.mobileApp.pairedDevices", "Paired phones")}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "admin.mobileApp.deviceManagementHelp",
                    "View and manage phones connected to your store.",
                  )}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="w-fit">
              {activeDeviceCount}{" "}
              {t("admin.mobileApp.activeCount", "active")}
            </Badge>
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
