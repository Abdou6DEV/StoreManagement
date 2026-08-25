import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../lib/components/dialog";
import { Button } from "../../../../lib/components/button";

type Phase = "loading" | "qr" | "downloading" | "received" | "error";

export default function InvoiceScanModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [runId, setRunId] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      sessionIdRef.current = null;
      expiresAtRef.current = null;
      setPhase("loading");
      setQrDataUrl(null);
      setScanUrl(null);
      setImageDataUrl(null);
      setError(null);
      setSecondsLeft(null);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    const fail = (message: string) => {
      if (cancelled) return;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      setError(message);
      setPhase("error");
    };

    const start = async () => {
      setError(null);
      setImageDataUrl(null);
      setPhase("loading");
      const created = await window.api.online.invoiceScanCreateSession();
      if (cancelled) return;
      if (!created.success) {
        const code = created.code;
        if (code === "missing_env") {
          fail(t("stock.invoiceScan.configMissing", "Online scanning is not configured."));
          return;
        }
        const err = created.error;
        if (err === "ai_disabled" || err === "ai_trial_blocked" || err === "ai_not_licensed") {
          fail(
            t("stock.invoiceScan.aiBlocked", "AI scanning is not available on this device."),
          );
          return;
        }
        fail(err || t("stock.invoiceScan.uploadFailed", "Receipt upload failed."));
        return;
      }

      sessionIdRef.current = created.sessionId;
      expiresAtRef.current = new Date(created.expiresAt).getTime();
      setQrDataUrl(created.qrDataUrl);
      setScanUrl(created.scanUrl);
      setPhase("qr");

      const tick = () => {
        if (!expiresAtRef.current) return;
        const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left <= 0) {
          fail(t("stock.invoiceScan.expired", "QR code expired. Please try again."));
        }
      };
      tick();
      tickTimer = setInterval(tick, 1000);

      let isPolling = false;
      const poll = async () => {
        const id = sessionIdRef.current;
        if (!id || cancelled || isPolling) return;
        isPolling = true;
        try {
          const status = await window.api.online.invoiceScanGetStatus(id);
          if (cancelled) return;
          if (!status.success) {
            if (status.code === "expired" || status.error === "expired") {
              fail(t("stock.invoiceScan.expired", "QR code expired. Please try again."));
            }
            return;
          }
          if (status.status === "expired") {
            fail(t("stock.invoiceScan.expired", "QR code expired. Please try again."));
            return;
          }
          if (status.status !== "uploaded") return;
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          if (tickTimer) {
            clearInterval(tickTimer);
            tickTimer = null;
          }
          setPhase("downloading");
          const downloaded = await window.api.online.invoiceScanDownloadAndCleanup(id);
          if (cancelled) return;
          if (!downloaded.success) {
            fail(
              t(
                "stock.invoiceScan.downloadFailed",
                "Could not receive the receipt. Please try again.",
              ),
            );
            return;
          }
          setImageDataUrl(downloaded.dataUrl);
          setPhase("received");
        } finally {
          isPolling = false;
        }
      };

      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, 10000);
    };

    void start();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
  }, [open, runId, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {t("stock.invoiceScan.title", "Scan Supplier Receipt")}
          </DialogTitle>
          <DialogDescription>
            {phase === "received"
              ? t("stock.invoiceScan.received", "Receipt received")
              : t("stock.invoiceScan.scanQr", "Scan this QR code with your phone.")}
          </DialogDescription>
        </DialogHeader>

        {phase === "loading" || phase === "downloading" ? (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {phase === "downloading"
                ? t("stock.invoiceScan.downloading", "Receiving the receipt…")
                : t("stock.invoiceScan.starting", "Starting scan…")}
            </span>
          </div>
        ) : null}

        {phase === "qr" && qrDataUrl ? (
          <div className="space-y-3">
            <img
              src={qrDataUrl}
              alt=""
              className="mx-auto h-64 w-64 rounded-md bg-white p-2"
            />
            <p className="text-center text-sm text-muted-foreground">
              {t("stock.invoiceScan.waiting", "Waiting for the receipt photo…")}
              {secondsLeft != null
                ? ` ${t("stock.invoiceScan.expiresIn", "Expires in {{seconds}}s", {
                    seconds: secondsLeft,
                  })}`
                : ""}
            </p>
            {scanUrl ? (
              <p className="break-all text-center text-xs text-muted-foreground">
                {t("stock.invoiceScan.openUrl", "Or open this link on your phone")}
                {": "}
                {scanUrl}
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === "received" && imageDataUrl ? (
          <img
            src={imageDataUrl}
            alt=""
            className="max-h-80 w-full rounded-md object-contain bg-muted"
          />
        ) : null}

        {phase === "error" ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          {phase === "error" ? (
            <Button type="button" onClick={() => setRunId((n) => n + 1)}>
              {t("stock.invoiceScan.retry", "Try again")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("stock.invoiceScan.close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceScanButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      <Camera className="h-4 w-4" />
      {t("stock.invoiceScan.button", "Scan Supplier Receipt")}
    </Button>
  );
}
