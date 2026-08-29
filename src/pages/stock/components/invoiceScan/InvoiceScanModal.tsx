import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  CloudOff,
  ImageOff,
  Loader2,
  QrCode,
  Sparkles,
  TimerOff,
  WifiOff,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../lib/components/dialog";
import { Button } from "../../../../lib/components/button";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";
import { Tooltip } from "../../../../lib/components/tooltip";
import { useAiChatGate } from "../../../../lib/hooks/useAiChatGate";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperList,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "../../../../lib/components/ui/stepper";
import { cn } from "../../../../lib/utils";
import type { ScanReceiptExtraction } from "../../../../lib/ai/scanReceiptTypes";
import { AnalyzingImage, AnalyzingImageScanBars } from "../../../../lib/components/ai/AnalyzingImage";
import InvoiceScanWizard, { type WizardStep } from "./InvoiceScanWizard";
import { ScanFlowError, type ScanErrorTone } from "./ScanFlowError";
import ScanPrintLabelsModal, {
  hasAnyLabelPrinter,
  type ScanLabelItem,
} from "./ScanPrintLabelsModal";

type ScanErrorKind =
  | "expired"
  | "unreadable"
  | "quota"
  | "ai_blocked"
  | "download_failed"
  | "upload_failed"
  | "config_missing"
  | "missing_file"
  | "generic";

type Phase =
  | "loading"
  | "qr"
  | "downloading"
  | "received"
  | "ai"
  | "wizard"
  | "error";

type FlowStep = "scan" | "analyze" | WizardStep;

const FLOW_STEPS: FlowStep[] = [
  "scan",
  "analyze",
  "supplier",
  "products",
  "review",
];

const indicatorClass =
  "bg-muted-foreground text-secondary data-[state=active]:border-green-600 data-[state=completed]:border-green-600 data-[state=active]:bg-green-600 data-[state=completed]:bg-green-600 data-[state=active]:text-white data-[state=completed]:text-white";

const separatorClass =
  "data-[state=active]:bg-green-600 data-[state=completed]:bg-green-600";

function scanErrorCopy(
  kind: ScanErrorKind,
  t: TFunction,
): {
  icon: LucideIcon;
  tone: ScanErrorTone;
  title: string;
  description: string;
  tips: string[];
  subtitle: string;
} {
  if (kind === "expired") {
    return {
      icon: TimerOff,
      tone: "warning",
      title: t("stock.invoiceScan.errorExpiredTitle", "QR code expired"),
      description: t(
        "stock.invoiceScan.errorExpiredDesc",
        "The time to send the photo ran out. For security, each QR code is valid only for a short moment.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorExpiredTip1",
          "Scan the new QR code with your phone as soon as it appears.",
        ),
        t(
          "stock.invoiceScan.errorExpiredTip2",
          "Photograph the receipt and send it before the timer reaches zero.",
        ),
        t(
          "stock.invoiceScan.errorExpiredTip3",
          "Keep this window open while you take the photo.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorExpiredSubtitle",
        "Generate a new code to continue.",
      ),
    };
  }
  if (kind === "unreadable") {
    return {
      icon: ImageOff,
      tone: "danger",
      title: t(
        "stock.invoiceScan.errorUnreadableTitle",
        "This photo is not a readable receipt",
      ),
      description: t(
        "stock.invoiceScan.errorUnreadableDesc",
        "REDA AI found no supplier or product lines. The image may not be a receipt, or it may be too dark, cropped, or blurry.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorUnreadableTip1",
          "Photograph a supplier receipt or invoice — not a random picture.",
        ),
        t(
          "stock.invoiceScan.errorUnreadableTip2",
          "Use good light and keep the whole ticket in frame, without glare.",
        ),
        t(
          "stock.invoiceScan.errorUnreadableTip3",
          "Hold the phone steady so text is sharp and readable.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorUnreadableSubtitle",
        "Send a clear photo of a supplier receipt.",
      ),
    };
  }
  if (kind === "quota") {
    return {
      icon: Zap,
      tone: "warning",
      title: t("stock.invoiceScan.errorQuotaTitle", "Not enough AI points"),
      description: t(
        "stock.invoiceScan.errorQuotaDesc",
        "This device has used its AI allowance for now. Receipt scanning will be available again after the limit resets.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorQuotaTip1",
          "Try again in a minute, or wait until tomorrow if the daily limit is reached.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorQuotaSubtitle",
        "Wait a moment, then try again.",
      ),
    };
  }
  if (kind === "ai_blocked") {
    return {
      icon: WifiOff,
      tone: "muted",
      title: t("stock.invoiceScan.errorAiBlockedTitle", "AI scanning unavailable"),
      description: t(
        "stock.invoiceScan.errorAiBlockedDesc",
        "REDA AI cannot run on this device right now. Check the internet connection or the license.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorAiBlockedTip1",
          "Connect to Wi‑Fi or Ethernet, then try again.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorAiBlockedSubtitle",
        "AI scanning is not available on this device.",
      ),
    };
  }
  if (kind === "download_failed") {
    return {
      icon: CloudOff,
      tone: "danger",
      title: t("stock.invoiceScan.errorDownloadTitle", "Could not receive the photo"),
      description: t(
        "stock.invoiceScan.errorDownloadDesc",
        "The receipt photo was sent, but this computer could not download it. The connection may have dropped.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorDownloadTip1",
          "Check your internet connection, then generate a new QR code and send the photo again.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorDownloadSubtitle",
        "Try sending the photo again.",
      ),
    };
  }
  if (kind === "upload_failed") {
    return {
      icon: CloudOff,
      tone: "danger",
      title: t("stock.invoiceScan.errorUploadTitle", "Could not start the scan"),
      description: t(
        "stock.invoiceScan.errorUploadDesc",
        "The scan session could not be created. The computer may be offline, or the online service is unavailable.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorUploadTip1",
          "Check the internet connection, then try again.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorUploadSubtitle",
        "Try again in a moment.",
      ),
    };
  }
  if (kind === "config_missing") {
    return {
      icon: CloudOff,
      tone: "muted",
      title: t("stock.invoiceScan.errorConfigTitle", "Online scanning is not set up"),
      description: t(
        "stock.invoiceScan.errorConfigDesc",
        "This installation is missing the settings needed to receive photos from a phone.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorConfigTip1",
          "Contact your provider to enable online receipt scanning.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorConfigSubtitle",
        "Online scanning is not configured.",
      ),
    };
  }
  if (kind === "missing_file") {
    return {
      icon: ImageOff,
      tone: "danger",
      title: t("stock.invoiceScan.errorMissingFileTitle", "Receipt image not found"),
      description: t(
        "stock.invoiceScan.errorMissingFileDesc",
        "The photo is no longer on this computer. Start a new scan and send the receipt again.",
      ),
      tips: [
        t(
          "stock.invoiceScan.errorMissingFileTip1",
          "Generate a new QR code and photograph the receipt once more.",
        ),
      ],
      subtitle: t(
        "stock.invoiceScan.errorMissingFileSubtitle",
        "Start a new scan to continue.",
      ),
    };
  }
  return {
    icon: QrCode,
    tone: "muted",
    title: t("stock.invoiceScan.errorGenericTitle", "Scan could not continue"),
    description: t(
      "stock.invoiceScan.errorGenericDesc",
      "Something went wrong while preparing the receipt scan. You can try again.",
    ),
    tips: [
      t(
        "stock.invoiceScan.errorGenericTip1",
        "Check the internet connection, then generate a new QR code.",
      ),
    ],
    subtitle: t(
      "stock.invoiceScan.errorGenericSubtitle",
      "Please try again.",
    ),
  };
}

function flowFromPhase(phase: Phase, wizardStep: WizardStep, hasImage: boolean): FlowStep {
  if (phase === "wizard") return wizardStep;
  if (phase === "ai") return "analyze";
  if (phase === "error" && hasImage) return "analyze";
  return "scan";
}

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
  const [errorKind, setErrorKind] = useState<ScanErrorKind | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [runId, setRunId] = useState(0);
  const [wizardStep, setWizardStep] = useState<WizardStep>("supplier");
  const [farthest, setFarthest] = useState<FlowStep>("scan");
  const [printItems, setPrintItems] = useState<ScanLabelItem[] | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number | null>(null);
  const localPathRef = useRef<string | null>(null);
  const qrWatchingRef = useRef(false);
  const forceNewRef = useRef(false);
  const allowCloseRef = useRef(false);
  const leaveConfirmOpenRef = useRef(false);
  const openRef = useRef(open);
  leaveConfirmOpenRef.current = leaveConfirmOpen;
  openRef.current = open;

  const deleteTemp = (path: string | null) => {
    if (!path) return;
    void window.api.online.invoiceScanDeleteTemp(path);
  };

  const reach = (step: FlowStep) => {
    setFarthest((current) =>
      FLOW_STEPS.indexOf(step) > FLOW_STEPS.indexOf(current) ? step : current,
    );
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
      setErrorKind(null);
      setSecondsLeft(null);
      setWizardStep("supplier");
      setFarthest("scan");
      setLeaveConfirmOpen(false);
      // Keep allowCloseRef until the next open. Resetting it here lets a late
      // Radix onOpenChange(false) treat a finished save as a user dismiss.
      return;
    }

    allowCloseRef.current = false;

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

    const showError = (kind: ScanErrorKind) => {
      if (cancelled) return;
      stopQrWatch();
      setErrorKind(kind);
      setPhase("error");
    };

    const failQr = (kind: ScanErrorKind) => {
      if (!qrWatchingRef.current) return;
      showError(kind);
    };

    let removeOnlineListener: (() => void) | null = null;

    const start = async () => {
      setErrorKind(null);
      setImageDataUrl(null);
      setLocalPath(null);
      localPathRef.current = null;
      setExtraction(null);
      setWizardStep("supplier");
      setFarthest("scan");
      setPhase("loading");
      const forceNew = forceNewRef.current;
      forceNewRef.current = false;
      const started = await window.api.online.invoiceScanStartSession(forceNew);
      if (cancelled) return;
      if (started.success === false) {
        const code = started.code;
        if (code === "missing_env") {
          showError("config_missing");
          return;
        }
        const err = started.error;
        if (err === "ai_disabled" || err === "ai_trial_blocked" || err === "ai_not_licensed") {
          showError("ai_blocked");
          return;
        }
        if (code === "download") {
          showError("download_failed");
          return;
        }
        showError("upload_failed");
        return;
      }

      if (started.kind === "photo") {
        setImageDataUrl(started.dataUrl);
        setLocalPath(started.localPath);
        localPathRef.current = started.localPath;
        setPhase("received");
        return;
      }

      sessionIdRef.current = started.sessionId;
      expiresAtRef.current = new Date(started.expiresAt).getTime();
      qrWatchingRef.current = true;
      setQrDataUrl(started.qrDataUrl);
      setScanUrl(started.scanUrl);
      setPhase("qr");

      const receiveUploaded = async (id: string) => {
        stopQrWatch();
        setPhase("downloading");
        const downloaded = await window.api.online.invoiceScanDownloadAndCleanup(id);
        if (cancelled) return;
        if (downloaded.success === false) {
          setErrorKind("download_failed");
          setPhase("error");
          return;
        }
        setImageDataUrl(downloaded.dataUrl);
        setLocalPath(downloaded.localPath);
        localPathRef.current = downloaded.localPath;
        setPhase("received");
      };

      let expiryCheckStarted = false;
      const tick = () => {
        if (!qrWatchingRef.current || !expiresAtRef.current) return;
        const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left > 0) return;
        if (expiryCheckStarted) return;
        expiryCheckStarted = true;
        void (async () => {
          const id = sessionIdRef.current;
          if (!id || cancelled || !qrWatchingRef.current) return;
          const status = await window.api.online.invoiceScanGetStatus(id);
          if (cancelled || !qrWatchingRef.current) return;
          if (status.success && status.status === "uploaded") {
            await receiveUploaded(id);
            return;
          }
          failQr("expired");
        })();
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
              failQr("expired");
            }
            return;
          }
          if (status.status === "expired") {
            failQr("expired");
            return;
          }
          if (status.status !== "uploaded") return;
          await receiveUploaded(id);
        } finally {
          isPolling = false;
        }
      };

      const onOnline = () => {
        if (!qrWatchingRef.current || cancelled) return;
        void poll();
      };
      window.addEventListener("online", onOnline);
      removeOnlineListener = () => window.removeEventListener("online", onOnline);

      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, 10000);
    };

    void start();

    return () => {
      cancelled = true;
      qrWatchingRef.current = false;
      removeOnlineListener?.();
      if (pollTimer) clearInterval(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
  }, [open, runId]);

  const restartScan = (forceNew: boolean) => {
    deleteTemp(localPathRef.current);
    localPathRef.current = null;
    setLocalPath(null);
    setImageDataUrl(null);
    setExtraction(null);
    setErrorKind(null);
    forceNewRef.current = forceNew;
    setRunId((n) => n + 1);
  };

  const runAi = async () => {
    if (!localPath) {
      setErrorKind("missing_file");
      setPhase("error");
      return;
    }
    setPhase("ai");
    reach("analyze");
    setErrorKind(null);
    const result = await window.api.ai.scanReceipt(localPath);
    if (result.success === false) {
      if (result.code === "quota") {
        setErrorKind("quota");
      } else if (result.code === "offline" || result.code === "ai_disabled") {
        setErrorKind("ai_blocked");
      } else if (result.code === "missing_file") {
        setErrorKind("missing_file");
      } else if (result.code === "missing_env") {
        setErrorKind("config_missing");
      } else {
        setErrorKind("unreadable");
      }
      setPhase("error");
      return;
    }
    setExtraction(result.data);
    setWizardStep("supplier");
    reach("supplier");
    setPhase("wizard");
  };

  const errorCopy = errorKind ? scanErrorCopy(errorKind, t) : null;

  const hasImage = !!(localPath && imageDataUrl);
  const flowStep = flowFromPhase(phase, wizardStep, hasImage);
  const farthestIndex = FLOW_STEPS.indexOf(farthest);
  const busy = phase === "loading" || phase === "downloading" || phase === "ai";

  const stepDisabled = (step: FlowStep) => {
    if (busy && step !== flowStep) return true;
    if (step === "scan") return false;
    if (step === "analyze") {
      return !(phase === "ai" || (phase === "error" && hasImage));
    }
    if (!extraction) return true;
    return FLOW_STEPS.indexOf(step) > farthestIndex;
  };

  const handleFlowChange = (next: string) => {
    const step = next as FlowStep;
    if (!FLOW_STEPS.includes(step) || step === flowStep || stepDisabled(step)) return;
    if (step === "scan") {
      if (imageDataUrl) setPhase("received");
      return;
    }
    if (step === "analyze") return;
    if (!extraction) return;
    setPhase("wizard");
    setWizardStep(step);
  };

  const handleWizardStep = (step: WizardStep) => {
    setWizardStep(step);
    reach(step);
  };

  const stepLabel = (step: FlowStep) => {
    if (step === "scan") return t("stock.invoiceScan.stepScan", "Scan photo");
    if (step === "analyze") return t("stock.invoiceScan.stepAnalyze", "Read with AI");
    if (step === "supplier") return t("stock.invoiceScan.stepSupplier", "Supplier");
    if (step === "products") return t("stock.invoiceScan.stepProducts", "Products");
    return t("stock.invoiceScan.stepReview", "Confirm");
  };

  const requestClose = () => {
    if (allowCloseRef.current) return;
    if (!openRef.current) return;
    if (leaveConfirmOpenRef.current) return;
    setLeaveConfirmOpen(true);
  };

  const closeScan = () => {
    allowCloseRef.current = true;
    openRef.current = false;
    setLeaveConfirmOpen(false);
    onOpenChange(false);
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (allowCloseRef.current || !openRef.current) {
      onOpenChange(false);
      return;
    }
    requestClose();
  };

  const blockDismiss = (event: Event) => {
    if (allowCloseRef.current || !openRef.current) return;
    event.preventDefault();
    requestClose();
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col overflow-hidden",
          "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)]",
          "sm:w-[min(72rem,calc(100vw-2rem))] sm:max-w-[min(72rem,calc(100vw-2rem))]",
          "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)]",
          "sm:h-[min(56rem,calc(100dvh-2rem))] sm:max-h-[min(56rem,calc(100dvh-2rem))]",
          "p-4 sm:p-6",
        )}
        showCloseButton
        onEscapeKeyDown={blockDismiss}
        onPointerDownOutside={blockDismiss}
        onInteractOutside={blockDismiss}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 pe-8">
            <Sparkles className="h-4 w-4 shrink-0 text-[#8b5cf6]" aria-hidden />
            <span>{t("stock.invoiceScan.title", "Scan Supplier Receipt")}</span>
            <span className="rounded-full bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#8b5cf6] uppercase">
              {t("stock.invoiceScan.premiumBadge", "Premium")}
            </span>
          </DialogTitle>
          <DialogDescription>
            {phase === "error" && errorCopy
              ? errorCopy.subtitle
              : phase === "wizard"
                ? t("stock.invoiceScan.wizardDesc", "Match supplier and products, then confirm.")
                : phase === "ai"
                  ? t("stock.invoiceScan.reading", "Reading the receipt…")
                  : phase === "received"
                    ? t("stock.invoiceScan.received", "Receipt received")
                    : t("stock.invoiceScan.scanQr", "Scan this QR code with your phone.")}
          </DialogDescription>
        </DialogHeader>

        <Stepper
          value={flowStep}
          onValueChange={handleFlowChange}
          activationMode="manual"
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <StepperList className="shrink-0 items-start">
            {FLOW_STEPS.map((step) => {
              const current = step === flowStep;
              return (
                <StepperItem
                  key={step}
                  value={step}
                  disabled={stepDisabled(step)}
                  completed={FLOW_STEPS.indexOf(step) < FLOW_STEPS.indexOf(flowStep)}
                  className="items-start"
                >
                  <StepperTrigger
                    aria-label={stepLabel(step)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md px-1",
                      !current && "opacity-50",
                    )}
                  >
                    <StepperIndicator className={indicatorClass} />
                    <StepperTitle
                      className={cn(
                        "max-w-[5.75rem] text-center text-[11px] leading-tight sm:max-w-none sm:text-xs",
                        current
                          ? "font-semibold text-green-600"
                          : "font-medium text-muted-foreground",
                      )}
                    >
                      {stepLabel(step)}
                    </StepperTitle>
                  </StepperTrigger>
                  <StepperSeparator className={cn(separatorClass, "mt-3.5")} />
                </StepperItem>
              );
            })}
          </StepperList>

          <StepperContent
            value="scan"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {phase === "error" && !hasImage && errorCopy ? (
              <ScanFlowError
                icon={errorCopy.icon}
                tone={errorCopy.tone}
                title={errorCopy.title}
                description={errorCopy.description}
                tips={errorCopy.tips}
              >
                <Button type="button" variant="outline" onClick={requestClose}>
                  {t("stock.invoiceScan.close", "Close")}
                </Button>
                {errorKind === "config_missing" ? null : (
                  <Button
                    type="button"
                    onClick={() => restartScan(errorKind === "expired")}
                  >
                    {errorKind === "expired"
                      ? t("stock.invoiceScan.newQr", "New QR code")
                      : t("stock.invoiceScan.retry", "Try again")}
                  </Button>
                )}
              </ScanFlowError>
            ) : phase === "received" && imageDataUrl ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                <img
                  src={imageDataUrl}
                  alt=""
                  className="min-h-0 flex-1 w-full rounded-md object-contain bg-muted"
                />
                <div className="flex shrink-0 justify-end gap-2">
                  <Button type="button" variant="outline" onClick={requestClose}>
                    {t("stock.invoiceScan.close", "Close")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => restartScan(true)}>
                    {t("stock.invoiceScan.newPhoto", "Take another photo")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void runAi()} className="invoice-scan-ai-btn">
                    <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
                    {t("stock.invoiceScan.continueAi", "Continue — read with AI")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center overflow-hidden">
                <div className="grid w-full grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                  <div className="flex flex-col items-center justify-center overflow-y-auto px-8 py-6">
                    <div className="flex w-full max-w-md flex-col gap-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                          {t("stock.invoiceScan.qrHeadline", "Scan with your phone")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t(
                            "stock.invoiceScan.qrSub",
                            "Use your phone to photograph the supplier receipt. It will appear on this computer.",
                          )}
                        </p>
                      </div>
                      <ol className="list-decimal space-y-3 ps-5 text-sm leading-relaxed">
                        <li>{t("stock.invoiceScan.qrStep1", "Open the camera on your phone")}</li>
                        <li>{t("stock.invoiceScan.qrStep2", "Scan the QR code")}</li>
                        <li>
                          {t("stock.invoiceScan.qrStep3", "Take a photo of the full receipt")}
                        </li>
                        <li>
                          {t("stock.invoiceScan.qrStep4", "Send — the photo appears here")}
                        </li>
                      </ol>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "stock.invoiceScan.qrTips",
                          "Use good light, keep the whole receipt in frame, one photo.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="hidden w-px bg-border md:block" />
                  <div className="flex flex-col items-center justify-center gap-4 px-8 py-6">
                    {phase === "qr" && qrDataUrl ? (
                      <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                        <img
                          src={qrDataUrl}
                          alt=""
                          className="h-56 w-56"
                        />
                      </div>
                    ) : (
                      <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-border bg-muted">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>
                            {phase === "downloading"
                              ? t("stock.invoiceScan.downloading", "Receiving the receipt…")
                              : t("stock.invoiceScan.starting", "Starting scan…")}
                          </span>
                        </div>
                      </div>
                    )}
                    {phase === "qr" ? (
                      <p className="text-center text-sm text-muted-foreground">
                        {t("stock.invoiceScan.waiting", "Waiting for the receipt photo…")}
                        {secondsLeft != null
                          ? ` ${t("stock.invoiceScan.expiresIn", "Expires in {{seconds}}s", {
                              seconds: secondsLeft,
                            })}`
                          : ""}
                      </p>
                    ) : null}
                    {scanUrl ? (
                      <p className="max-w-[17.5rem] break-all text-center text-xs text-muted-foreground">
                        {t("stock.invoiceScan.openUrl", "Or open this link on your phone")}
                        {": "}
                        {scanUrl}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            {phase === "qr" || phase === "loading" || phase === "downloading" ? (
              <div className="flex shrink-0 justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={requestClose}>
                  {t("stock.invoiceScan.close", "Close")}
                </Button>
              </div>
            ) : null}
          </StepperContent>

          <StepperContent
            value="analyze"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {phase === "error" && hasImage && errorCopy ? (
              <ScanFlowError
                icon={errorCopy.icon}
                tone={errorCopy.tone}
                title={errorCopy.title}
                description={errorCopy.description}
                tips={errorCopy.tips}
                previewSrc={errorKind === "unreadable" ? imageDataUrl : null}
              >
                <Button type="button" variant="outline" onClick={requestClose}>
                  {t("stock.invoiceScan.close", "Close")}
                </Button>
                {errorKind === "unreadable" || errorKind === "quota" || errorKind === "ai_blocked" ? (
                  <Button
                    type="button"
                    variant={errorKind === "unreadable" ? "outline" : "default"}
                    onClick={() => void runAi()}
                    className={errorKind === "unreadable" ? "invoice-scan-ai-btn" : undefined}
                  >
                    {errorKind === "unreadable" ? (
                      <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
                    ) : null}
                    {t("stock.invoiceScan.retryAi", "Try AI again")}
                  </Button>
                ) : null}
                {errorKind === "unreadable" ? (
                  <Button type="button" onClick={() => restartScan(true)}>
                    {t("stock.invoiceScan.newPhoto", "Take another photo")}
                  </Button>
                ) : errorKind !== "config_missing" &&
                  errorKind !== "quota" &&
                  errorKind !== "ai_blocked" ? (
                  <Button
                    type="button"
                    onClick={() => restartScan(errorKind === "expired")}
                  >
                    {t("stock.invoiceScan.retry", "Try again")}
                  </Button>
                ) : null}
              </ScanFlowError>
            ) : (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-muted">
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt=""
                    className="h-full w-full scale-[1.04] object-contain blur-[3px]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-background/25" />
                <AnalyzingImageScanBars />
                <div className="absolute inset-0 flex items-end justify-center p-4">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-lg backdrop-blur-md">
                    <AnalyzingImage />
                  </div>
                </div>
              </div>
            )}
          </StepperContent>

          {phase === "wizard" && extraction ? (
            <InvoiceScanWizard
              extraction={extraction}
              step={wizardStep}
              onStepChange={handleWizardStep}
              onBack={() => setPhase("received")}
              onDone={(labels) => {
                deleteTemp(localPathRef.current);
                localPathRef.current = null;
                setLocalPath(null);
                closeScan();
                if (labels.length === 0) return;
                void hasAnyLabelPrinter()
                  .then((ok) => {
                    if (!ok) return;
                    window.setTimeout(() => setPrintItems(labels), 180);
                  })
                  .catch(() => undefined);
              }}
            />
          ) : null}
        </Stepper>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={leaveConfirmOpen}
      onOpenChange={setLeaveConfirmOpen}
      variant="warning"
      title={t("stock.invoiceScan.leaveTitle", "Leave receipt scan?")}
      message={t(
        "stock.invoiceScan.leaveMessage",
        "If you close now, the scan will be cancelled and any progress will be lost.",
      )}
      confirmText={t("stock.invoiceScan.leaveConfirm", "Leave")}
      cancelText={t("stock.invoiceScan.stay", "Stay")}
      onConfirm={closeScan}
    />
    <ScanPrintLabelsModal
      open={printItems != null}
      items={printItems ?? []}
      onDone={() => setPrintItems(null)}
    />
    </>
  );
}

export function InvoiceScanButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const { canUseAi, blockReason } = useAiChatGate();
  const locked = !canUseAi;
  const lockMessage =
    blockReason === "offline"
      ? t(
          "ai.offlineBlocked",
          "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
        )
      : blockReason === "trial"
        ? t(
            "ai.trialBlocked",
            "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
          )
        : t(
            "ai.disabled",
            "This is a premium feature. Contact your provider to enable REDA AI.",
          );

  const button = (
    <Button
      type="button"
      variant="outline"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={cn("invoice-scan-ai-btn", locked && "animate-none")}
    >
      <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
      {t("stock.invoiceScan.button", "Scan Receipt with REDA AI")}
      {locked && blockReason !== "offline" ? (
        <span className="rounded-full bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#8b5cf6] uppercase">
          {t("stock.invoiceScan.premiumBadge", "Premium")}
        </span>
      ) : null}
    </Button>
  );

  if (!locked) return button;

  return (
    <Tooltip content={lockMessage} position="top">
      <span className="inline-flex">
        {button}
      </span>
    </Tooltip>
  );
}
