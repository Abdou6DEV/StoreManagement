import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { useActiveTrial } from "../hooks/useActiveTrial";
import { usePaidExpiryWarning } from "../hooks/usePaidExpiryWarning";
import { cn } from "../utils";

export function PaidExpiryHeaderBanner({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { isTrialActive } = useActiveTrial();
  const { isPaidExpiryClose, remainingLabel, isPaidExpiryComfortable } = usePaidExpiryWarning();
  const isRTL = i18n.language === "ar";

  if (isTrialActive || !isPaidExpiryClose || !remainingLabel) {
    return null;
  }

  return (
    <Link
      to="/administrator?tab=license"
      className={cn(
        "inline-flex max-w-[min(100%,16rem)] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        isPaidExpiryComfortable
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-200"
          : "border-orange-500/35 bg-orange-500/10 text-orange-800 hover:bg-orange-500/15 dark:text-orange-200",
        isRTL && "flex-row-reverse",
        className,
      )}
      title={t("navigation.subscriptionBannerTitle", "View license details")}
    >
      <ShieldAlert
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isPaidExpiryComfortable
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-orange-600 dark:text-orange-300",
        )}
        aria-hidden
      />
      <span className="truncate">
        {t("navigation.subscriptionBanner", "Subscription ends · {{remaining}}", {
          remaining: remainingLabel,
        })}
      </span>
    </Link>
  );
}
