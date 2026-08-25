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
import { cn } from "../../../../lib/utils";
import type { ScanReceiptExtraction } from "../../../../lib/ai/scanReceiptTypes";
import { AnalyzingImage } from "../../../../lib/components/ai/AnalyzingImage";
import InvoiceScanWizard from "./InvoiceScanWizard";

type Phase =
  | "loading"
  | "qr"
  | "downloading"
  | "received"
  | "ai"
  | "wizard"
  | "error";

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
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ScanReceiptExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [runId, setRunId] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number | null>(null);
  const localPathRef = useRef<string | null>(null);
  const qrWatchingRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const deleteTemp = (path: string | null) => {
    if (!path) return;
    void window.api.online.invoiceScanDeleteTemp(path);
  };

  useEffect(() => {
    if (!open) {
      deleteTemp(localPathRef.current);
      sessionIdRef.current = null;
      expiresAtRef.current = null;
      localPathRef.current = null;
      qrWatchingRef.current = false;
      setPhase("loading");
      setQrDataUrl(null);
      setScanUrl(null);
      setImageDataUrl(null);
      setLocalPath(null);
      setExtraction(null);
      setError(null);
      setSecondsLeft(null);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    const stopQrWatch = () => {
      qrWatchingRef.current = false;
      expiresAtRef.current = null;
      sessionIdRef.current = null;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    };

    const showError = (message: string) => {
      if (cancelled) return;
      stopQrWatch();
      setError(message);
      setPhase("error");
    };

    const failQr = (message: string) => {
      if (!qrWatchingRef.current) return;
      showError(message);
    };

    const start = async () => {
      setError(null);
      setImageDataUrl(null);
      setLocalPath(null);
      localPathRef.current = null;
      setExtraction(null);
      setPhase("loading");
      const created = await window.api.online.invoiceScanCreateSession();
      if (cancelled) return;
      if (created.success === false) {
        const code = created.code;
        if (code === "missing_env") {
          showError(
            tRef.current(
              "stock.invoiceScan.configMissing",
              "Online scanning is not configured.",
            ),
          );
          return;
        }
        const err = created.error;
        if (err === "ai_disabled" || err === "ai_trial_blocked" || err === "ai_not_licensed") {
          showError(
            tRef.current(
              "stock.invoiceScan.aiBlocked",
              "AI scanning is not available on this device.",
            ),
          );
          return;
        }
        showError(err || tRef.current("stock.invoiceScan.uploadFailed", "Receipt upload failed."));
        return;
      }

      sessionIdRef.current = created.sessionId;
      expiresAtRef.current = new Date(created.expiresAt).getTime();
      qrWatchingRef.current = true;
      setQrDataUrl(created.qrDataUrl);
      setScanUrl(created.scanUrl);
      setPhase("qr");

      const tick = () => {
        if (!qrWatchingRef.current || !expiresAtRef.current) return;
        const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left <= 0) {
          failQr(
            tRef.current("stock.invoiceScan.expired", "QR code expired. Please try again."),
          );
        }
      };
      tick();
      tickTimer = setInterval(tick, 1000);

      let isPolling = false;
      const poll = async () => {
        const id = sessionIdRef.current;
        if (!id || cancelled || !qrWatchingRef.current || isPolling) return;
        isPolling = true;
        try {
          const status = await window.api.online.invoiceScanGetStatus(id);
          if (cancelled || !qrWatchingRef.current) return;
          if (status.success === false) {
            if (status.code === "expired" || status.error === "expired") {
              failQr(
                tRef.current(
                  "stock.invoiceScan.expired",
                  "QR code expired. Please try again.",
                ),
              );
            }
            return;
          }
          if (status.status === "expired") {
            failQr(
              tRef.current("stock.invoiceScan.expired", "QR code expired. Please try again."),
            );
            return;
          }
          if (status.status !== "uploaded") return;
          stopQrWatch();
          setPhase("downloading");
          const downloaded = await window.api.online.invoiceScanDownloadAndCleanup(id);
          if (cancelled) return;
          if (downloaded.success === false) {
            setError(
              tRef.current(
                "stock.invoiceScan.downloadFailed",
                "Could not receive the receipt. Please try again.",
              ),
            );
            setPhase("error");
            return;
          }
          setImageDataUrl(downloaded.dataUrl);
          setLocalPath(downloaded.localPath);
          localPathRef.current = downloaded.localPath;
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
      qrWatchingRef.current = false;
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
  }, [open, runId]);

  const runAi = async () => {
    if (!localPath) {
      setError(t("stock.invoiceScan.missingFile", "Receipt image not found."));
      setPhase("error");
      return;
    }
    setPhase("ai");
    setError(null);
    const result = await window.api.ai.scanReceipt(localPath);
    if (result.success === false) {
      if (result.code === "quota") {
        setError(
          t(
            "stock.invoiceScan.quota",
            "AI quota reached. Try again in a minute or tomorrow.",
          ),
        );
      } else if (result.code === "offline" || result.code === "ai_disabled") {
        setError(
          t("stock.invoiceScan.aiBlocked", "AI scanning is not available on this device."),
        );
      } else if (result.code === "unreadable") {
        setError(
          t(
            "stock.invoiceScan.unreadable",
            "Could not read the receipt. Please try another photo.",
          ),
        );
      } else {
        setError(
          result.error ||
            t(
              "stock.invoiceScan.unreadable",
              "Could not read the receipt. Please try another photo.",
            ),
        );
      }
      setPhase("error");
      return;
    }
    setExtraction(result.data);
    setPhase("wizard");
  };

  const wide = phase === "wizard" || phase === "ai" || phase === "received";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          wide
            ? cn(
                "flex flex-col overflow-hidden",
                "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)]",
                "sm:w-[min(72rem,calc(100vw-2rem))] sm:max-w-[min(72rem,calc(100vw-2rem))]",
                "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)]",
                "sm:h-[min(56rem,calc(100dvh-2rem))] sm:max-h-[min(56rem,calc(100dvh-2rem))]",
                "p-4 sm:p-6",
              )
            : "sm:max-w-md"
        }
        showCloseButton
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {t("stock.invoiceScan.title", "Scan Supplier Receipt")}
          </DialogTitle>
          <DialogDescription>
            {phase === "wizard"
              ? t("stock.invoiceScan.wizardDesc", "Match supplier and products, then confirm.")
              : phase === "ai"
                ? t("stock.invoiceScan.reading", "Reading the receipt…")
                : phase === "received"
                  ? t("stock.invoiceScan.received", "Receipt received")
                  : t("stock.invoiceScan.scanQr", "Scan this QR code with your phone.")}
          </DialogDescription>
        </DialogHeader>

        {phase === "loading" || phase === "downloading" ? (
          <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {phase === "downloading"
                ? t("stock.invoiceScan.downloading", "Receiving the receipt…")
                : t("stock.invoiceScan.starting", "Starting scan…")}
            </span>
          </div>
        ) : null}

        {phase === "ai" ? (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-muted">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt=""
                className="h-full w-full scale-[1.04] object-contain blur-[3px]"
              />
            ) : null}
            <div className="absolute inset-0 bg-background/25" />
            <div className="analyzing-image-sweep" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-lg backdrop-blur-md">
                <AnalyzingImage />
              </div>
            </div>
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <img
              src={imageDataUrl}
              alt=""
              className="min-h-0 flex-1 w-full rounded-md object-contain bg-muted"
            />
            <div className="flex shrink-0 justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("stock.invoiceScan.close", "Close")}
              </Button>
              <Button type="button" onClick={() => void runAi()}>
                {t("stock.invoiceScan.continueAi", "Continue — read with AI")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "wizard" && extraction ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <InvoiceScanWizard
              extraction={extraction}
              onBack={() => setPhase("received")}
              onDone={() => {
                deleteTemp(localPathRef.current);
                localPathRef.current = null;
                setLocalPath(null);
                onOpenChange(false);
              }}
            />
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-end gap-2">
              {localPath && imageDataUrl ? (
                <Button type="button" onClick={() => void runAi()}>
                  {t("stock.invoiceScan.retryAi", "Try AI again")}
                </Button>
              ) : (
                <Button type="button" onClick={() => setRunId((n) => n + 1)}>
                  {t("stock.invoiceScan.retry", "Try again")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("stock.invoiceScan.close", "Close")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "qr" || phase === "loading" || phase === "downloading" ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("stock.invoiceScan.close", "Close")}
            </Button>
          </div>
        ) : null}
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
