import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ImageOff,
  Loader2,
  Search,
  Sparkles,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../lib/components/dialog";
import { Button } from "../../../../lib/components/button";
import { AnalyzingImageScanBars } from "../../../../lib/components/ai/AnalyzingImage";
import ShinyText from "../../../../lib/components/ui/shinyText";
import { cn } from "../../../../lib/utils";
import type { FindImageCandidate } from "../../../../lib/ai/findImageTypes";
import { resizeDataUrlToProductPhoto } from "../../../../lib/utils/resizeProductPhoto";
import { ScanFlowError } from "../invoiceScan/ScanFlowError";

type Phase = "loading" | "results" | "downloading" | "error";

type FindImageErrorKind =
  | "quota"
  | "ai_blocked"
  | "offline"
  | "config"
  | "no_results"
  | "search"
  | "download"
  | "generic";

function mapFindImageError(
  t: TFunction,
  code: string,
  error: string,
): {
  kind: FindImageErrorKind;
  title: string;
  description: string;
  tips: string[];
} {
  if (code === "quota" || error === "rate_limit_minute" || error === "rate_limit_day") {
    return {
      kind: "quota",
      title: t("stock.findImage.errorQuotaTitle", "Not enough AI points"),
      description: t(
        "stock.findImage.errorQuotaDesc",
        "This device has used its AI allowance for now. Try again after the limit resets.",
      ),
      tips: [
        t(
          "stock.findImage.errorQuotaTip1",
          "Try again in a minute, or wait until tomorrow if the daily limit is reached.",
        ),
      ],
    };
  }

  if (
    code === "ai_disabled" ||
    error === "ai_disabled" ||
    error === "ai_trial_blocked" ||
    error === "ai_not_licensed"
  ) {
    return {
      kind: "ai_blocked",
      title: t("stock.findImage.errorAiBlockedTitle", "Premium required"),
      description: t(
        "stock.findImage.errorAiBlockedDesc",
        "Finding product photos with REDA AI requires Premium on this device.",
      ),
      tips: [
        t(
          "stock.findImage.errorAiBlockedTip1",
          "Contact your provider to enable Premium on your account.",
        ),
      ],
    };
  }

  if (code === "offline") {
    return {
      kind: "offline",
      title: t("stock.findImage.errorOfflineTitle", "Internet connection required"),
      description: t(
        "stock.findImage.errorOfflineDesc",
        "Connect to Wi‑Fi or Ethernet, then try again.",
      ),
      tips: [],
    };
  }

  if (code === "missing_env") {
    return {
      kind: "config",
      title: t("stock.findImage.errorConfigTitle", "Image search is not set up"),
      description: t(
        "stock.findImage.errorConfigDesc",
        "This installation is missing the settings needed for AI image search.",
      ),
      tips: [
        t(
          "stock.findImage.errorConfigTip1",
          "Contact your provider if this problem continues.",
        ),
      ],
    };
  }

  if (code === "no_results") {
    return {
      kind: "no_results",
      title: t("stock.findImage.errorNoResultsTitle", "No photos found"),
      description: t(
        "stock.findImage.errorNoResultsDesc",
        "Try a clearer product name or check the spelling.",
      ),
      tips: [
        t(
          "stock.findImage.errorNoResultsTip1",
          "Include the brand and model when possible.",
        ),
      ],
    };
  }

  if (code === "search" || code === "model") {
    return {
      kind: "search",
      title: t("stock.findImage.errorSearchTitle", "Search could not finish"),
      description: error || t("stock.findImage.errorSearchDesc", "Please try again."),
      tips: [
        t("stock.findImage.errorSearchTip1", "Check your internet connection, then retry."),
      ],
    };
  }

  return {
    kind: "generic",
    title: t("stock.findImage.errorGenericTitle", "Something went wrong"),
    description: error || t("stock.findImage.errorGenericDesc", "Please try again."),
    tips: [t("stock.findImage.errorGenericTip1", "Check your connection and try again.")],
  };
}

function errorIcon(kind: FindImageErrorKind) {
  switch (kind) {
    case "quota":
      return Zap;
    case "offline":
      return WifiOff;
    case "no_results":
      return ImageOff;
    default:
      return Sparkles;
  }
}

export function FindImageDialog({
  open,
  onOpenChange,
  productName,
  categoryName,
  onPhotoSelected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  categoryName?: string;
  onPhotoSelected: (photo: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [images, setImages] = useState<FindImageCandidate[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ReturnType<typeof mapFindImageError> | null>(
    null,
  );

  const runSearch = useCallback(async () => {
    setPhase("loading");
    setErrorInfo(null);
    setDownloadError(null);
    setImages([]);
    setSelectedUrl(null);

    const result = await window.api.ai.findProductImage({
      productName: productName.trim(),
      categoryName: categoryName?.trim() || null,
      locale: i18n.language,
    });

    if (!result.success) {
      setErrorInfo(mapFindImageError(t, result.code, result.error));
      setPhase("error");
      return;
    }

    setImages(result.images);
    setSelectedUrl(result.images[0]?.url ?? null);
    setPhase("results");
  }, [categoryName, i18n.language, productName, t]);

  useEffect(() => {
    if (!open) return;
    void runSearch();
  }, [open, runSearch]);

  const handleConfirm = async () => {
    if (!selectedUrl) return;
    setPhase("downloading");
    setDownloadError(null);

    const downloaded = await window.api.ai.downloadProductImage({ url: selectedUrl });
    if (!downloaded.success) {
      setDownloadError(
        downloaded.error ||
          t("stock.findImage.errorDownloadDesc", "Could not download the selected photo."),
      );
      setPhase("results");
      return;
    }

    try {
      const resized = await resizeDataUrlToProductPhoto(downloaded.dataUrl);
      onPhotoSelected(resized);
      onOpenChange(false);
    } catch {
      setDownloadError(
        t(
          "stock.findImage.errorDownloadDesc",
          "The image was downloaded but could not be resized for the product photo.",
        ),
      );
      setPhase("results");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPhase("loading");
      setImages([]);
      setSelectedUrl(null);
      setDownloadError(null);
      setErrorInfo(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[min(96vw,80rem)] flex-col overflow-hidden sm:max-w-7xl",
          phase === "results"
            ? "h-[min(92dvh,900px)] gap-2 p-3 sm:gap-3 sm:p-4"
            : "max-h-[92dvh] gap-4 p-6",
        )}
      >
        <DialogHeader className={cn("shrink-0", phase === "results" && "gap-1")}>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-[#8b5cf6]" />
            {t("stock.findImage.title", "Find product photo")}
          </DialogTitle>
          {phase !== "results" ? (
            <DialogDescription>
              {t(
                "stock.findImage.description",
                "REDA AI searches the web for product photos. Pick one to use.",
              )}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {phase === "loading" ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10">
            <div className="relative size-11 overflow-hidden rounded-lg border border-border/70 bg-background/80 shadow-sm">
              <Search className="absolute inset-0 m-auto size-5 text-muted-foreground/45" />
              <AnalyzingImageScanBars />
            </div>
            <ShinyText
              text={t("stock.findImage.searching", "Searching for photos…")}
              speed={2}
              color="color-mix(in oklab, #9c43fe 28%, var(--color-muted-foreground))"
              shineColor="#e9d5ff"
              className="text-base font-medium"
            />
          </div>
        ) : null}

        {phase === "downloading" ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
            <p className="text-sm text-muted-foreground">
              {t("stock.findImage.downloading", "Preparing your photo…")}
            </p>
          </div>
        ) : null}

        {phase === "results" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="shrink-0 truncate rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs sm:text-sm">
              <span className="text-muted-foreground">
                {t("stock.findImage.searchingFor", "Searching for")}:{" "}
              </span>
              <span className="font-medium">{productName.trim()}</span>
              {categoryName?.trim() ? (
                <span className="text-muted-foreground"> · {categoryName.trim()}</span>
              ) : null}
              <span className="text-muted-foreground">
                {" · "}
                {t("stock.findImage.pickHint", "Tap a photo, then confirm your choice.")}
              </span>
            </div>

            {downloadError ? (
              <p className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 sm:text-sm dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {downloadError}
              </p>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-1.5 sm:gap-2 md:gap-3">
              {images.map((image) => {
                const preview = image.thumbnailUrl ?? image.url;
                const selected = selectedUrl === image.url;
                return (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => setSelectedUrl(image.url)}
                    title={image.title ?? image.source ?? undefined}
                    className={cn(
                      "group flex h-full min-h-0 min-w-0 overflow-hidden rounded-lg border bg-background transition-colors",
                      selected
                        ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/40"
                        : "border-border hover:border-[#8b5cf6]/50",
                    )}
                  >
                    <div className="flex h-full w-full items-center justify-center bg-muted/40 p-1.5 sm:p-2">
                      <img
                        src={preview}
                        alt={image.title ?? ""}
                        className="max-h-full max-w-full object-contain object-center"
                        loading="lazy"
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                {t("stock.findImage.cancel", "Cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleConfirm()}
                disabled={!selectedUrl}
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
              >
                {t("stock.findImage.confirm", "Use this photo")}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "error" && errorInfo ? (
          <ScanFlowError
            icon={errorIcon(errorInfo.kind)}
            tone={errorInfo.kind === "quota" ? "warning" : "danger"}
            title={errorInfo.title}
            description={errorInfo.description}
            tips={errorInfo.tips}
          >
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t("stock.findImage.close", "Close")}
              </Button>
              <Button
                type="button"
                onClick={() => void runSearch()}
                className="gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
              >
                <Search className="h-4 w-4" />
                {t("stock.findImage.retry", "Try again")}
              </Button>
            </div>
          </ScanFlowError>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
