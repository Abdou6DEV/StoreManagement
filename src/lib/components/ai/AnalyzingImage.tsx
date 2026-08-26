import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "../../utils";
import ShinyText from "../ui/shinyText";

const scanEase = "ease-[cubic-bezier(0.175,0.885,0.32,1.275)]";

/** Horizontal scanner bars from the barcode loader, tinted with AI purple. */
export function AnalyzingImageScanBars() {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 z-0 h-[6px] w-full rounded bg-[#9c43fe91] blur-[10px]",
          "animate-scan motion-reduce:animate-none transition-all duration-1000",
          scanEase,
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 z-[1] h-[5px] w-full rounded bg-[#9c43fe] opacity-90",
          "animate-scan motion-reduce:animate-none transition-all duration-1000",
          scanEase,
        )}
      />
    </>
  );
}

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
        <AnalyzingImageScanBars />
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
