import { Shield, Sparkles, WifiOff } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "../button";
import type { AiChatBlockReason } from "../../hooks/useAiChatGate";

type AiChatBlockOverlayProps = {
  blockReason: AiChatBlockReason;
  onOpenLicenseTab?: () => void;
};

export function AiChatBlockOverlay({
  blockReason,
  onOpenLicenseTab,
}: AiChatBlockOverlayProps) {
  const { t } = useTranslation();

  const title =
    blockReason === "trial"
      ? t("ai.unavailableTitle", "REDA AI unavailable")
      : blockReason === "disabled"
        ? t("ai.disabledTitle", "REDA AI not enabled")
        : t("ai.offlineTitle", "Internet connection required");

  const message =
    blockReason === "trial"
      ? t(
          "ai.trialBlocked",
          "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
        )
      : blockReason === "disabled"
        ? t(
            "ai.disabled",
            "This is a premium feature. Contact your provider to enable REDA AI.",
          )
        : t(
            "ai.offlineBlocked",
            "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
          );

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-6 backdrop-blur-[2px]"
      role="region"
      aria-labelledby="ai-chat-unavailable-title"
    >
      <div className="max-w-lg space-y-4 text-center">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ring-1 ${
          blockReason === "disabled"
            ? "bg-[#8b5cf6]/10 ring-[#8b5cf6]/25"
            : "bg-muted ring-border"
        }`}>
          {blockReason === "trial" ? (
            <Shield className="h-6 w-6 text-orange-600" aria-hidden />
          ) : blockReason === "disabled" ? (
            <Sparkles className="h-6 w-6 text-[#8b5cf6]" aria-hidden />
          ) : (
            <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </div>
        <h4
          id="ai-chat-unavailable-title"
          className="text-base font-semibold text-foreground"
        >
          {title}
        </h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {blockReason === "disabled" ? (
            <Trans
              i18nKey="ai.disabledRich"
              defaults="This is a <premium>premium</premium> feature. Contact your provider to enable REDA AI."
              components={{
                premium: <span className="font-semibold text-[#8b5cf6]" />,
              }}
            />
          ) : (
            message
          )}
        </p>
        {blockReason === "trial" && onOpenLicenseTab ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenLicenseTab}>
            {t("ai.openLicenseTab", "Open License tab")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
