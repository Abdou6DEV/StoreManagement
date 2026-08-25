import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "../../utils";
import ShinyText from "../ui/shinyText";

export function AnalyzingImage({ className, ...props }: ComponentProps<"div">) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const isRtl = i18n.language.startsWith("ar");
  const label = t("stock.invoiceScan.analyzingImage", "Analyzing image…");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("inline-flex items-center gap-3", className)}
      {...props}
    >
      <div
        className="relative size-11 overflow-hidden rounded-lg border border-border/70 bg-background/80 shadow-sm"
        aria-hidden
      >
        <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground/45" />
        <span className="analyzing-image-frame-bar motion-reduce:hidden" />
      </div>
      <ShinyText
        text={label}
        speed={2}
        delay={0}
        color="color-mix(in oklab, #9c43fe 28%, var(--color-muted-foreground))"
        shineColor="#e9d5ff"
        spread={120}
        direction={isRtl ? "right" : "left"}
        yoyo={false}
        pauseOnHover={false}
        disabled={!!reduceMotion}
        className="text-base font-medium"
      />
    </div>
  );
}
