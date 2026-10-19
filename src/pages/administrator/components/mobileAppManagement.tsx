import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { AlertCircle, Ban, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import type { DeviceCheckResult } from "../../../electron/types/deviceCheck";
import type { MobileDevice, MobilePairingCreateResult } from "../../../electron/types/mobilePairing";
import { Button } from "../../../lib/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../lib/components/card";
import { Badge } from "../../../lib/components/badge";
import { Alert, AlertDescription } from "../../../lib/components/alert";
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
    <div className={`flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 ${className ?? ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="break-all text-sm font-semibold text-foreground">{value}</div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function MobileAppManagement() {
  const { t } = useTranslation();
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheckResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [mobileUserName, setMobileUserName] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<MobileDevice | null>(null);

  const refreshDevices = useCallback(async () => {
    const result = await window.api.online.mobileDeviceList();
    if (result.success) {
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
  }, [refreshDevices]);

  const revokeDevice = async () => {
    if (!deviceToRevoke) return;
    const device = deviceToRevoke;
    setRevokingDeviceId(device.id);
    setError(null);
    try {
      const result = await window.api.online.mobileDeviceRevoke(device.id);
      if (!result.success) {
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
      if (!result.success) {
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
      setError(cause instanceof Error ? cause.message : t("admin.mobileApp.createFailed"));
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
    deviceCheck?.success === true && deviceCheck.allowed && mobileEnabled
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : deviceCheck === null
        ? "bg-muted text-muted-foreground border-border"
        : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Smartphone className="h-7 w-7 text-orange-600" />
            {t("admin.mobileApp.title")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t("admin.mobileApp.description")}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refreshStatus()} className="shrink-0">
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-orange-600" />
              {t("admin.mobileApp.status")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <InfoRow
              label={t("admin.mobileApp.status")}
              value={
                <Badge variant="outline" className={statusBadgeClass}>
                  {statusText}
                </Badge>
              }
              hint={t("admin.mobileApp.entitlementHelp")}
            />
            {deviceCheck?.success === true && deviceCheck.allowed ? (
              <InfoRow
                label={t("admin.mobileApp.deviceLimitLabel", "Phone limit")}
                value={deviceCheck.mobileDeviceLimit ?? 0}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4 text-orange-600" />
              {t("admin.mobileApp.createCode")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium" htmlFor="mobile-user-name">
              {t("admin.mobileApp.nameLabel")}
              <input
                id="mobile-user-name"
                value={mobileUserName}
                onChange={(event) => setMobileUserName(event.target.value)}
                maxLength={60}
                autoComplete="off"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t("admin.mobileApp.namePlaceholder")}
              />
            </label>
            <Button
              type="button"
              onClick={() => void createPairingCode()}
              disabled={!mobileEnabled || busy || !mobileUserName.trim()}
              className="w-full sm:w-auto sm:justify-self-start"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              {busy ? t("admin.mobileApp.creating") : t("admin.mobileApp.createCode")}
            </Button>

            {qrDataUrl && expiresAt ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 sm:flex-row">
                <img
                  src={qrDataUrl}
                  alt={t("admin.mobileApp.qrAlt")}
                  className="h-[220px] w-[220px] rounded-md bg-white"
                />
                <div className="min-w-0 space-y-3 text-center sm:text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {t("admin.mobileApp.scanInstruction")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.mobileApp.nameLabel")}: <span className="font-semibold text-foreground">{mobileUserName.trim()}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.mobileApp.expiresAt", {
                      time: new Date(expiresAt).toLocaleTimeString(),
                    })}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-orange-600" />
            {t("admin.mobileApp.pairedDevices", "Paired phones")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {devicesError ? (
            <p className="text-sm text-muted-foreground">{devicesError}</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.mobileApp.noDevices", "No phones are paired yet.")}
            </p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center gap-3">
                <InfoRow
                  label={t("admin.mobileApp.nameLabel")}
                  className="min-w-0 flex-1"
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{device.deviceName}</span>
                      <Badge
                        variant="outline"
                        className={
                          device.active && !device.revokedAt
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                        }
                      >
                        {device.active && !device.revokedAt
                          ? t("admin.mobileApp.deviceActive", "Active")
                          : t("admin.mobileApp.deviceRevoked", "Revoked")}
                      </Badge>
                    </div>
                  }
                  hint={`${t("admin.mobileApp.pairedOn", "Paired")}: ${new Date(device.pairedAt).toLocaleString()} · ${t("admin.mobileApp.lastSeen", "Last seen")}: ${device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "—"}`}
                />
                {device.active && !device.revokedAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={revokingDeviceId !== null}
                    onClick={() => setDeviceToRevoke(device)}
                  >
                    {revokingDeviceId === device.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Ban className="mr-1 h-3.5 w-3.5" />
                    )}
                    {t("admin.mobileApp.revoke", "Revoke")}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deviceToRevoke !== null}
        onOpenChange={(open) => {
          if (!open && revokingDeviceId === null) setDeviceToRevoke(null);
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
