"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { dailyQuotaProgress } from "@/lib/ai/aiQuota";
import { useAiQuota } from "@/lib/contexts/aiQuotaContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/lib/components/ui/tooltip";

const SIZE = 22;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(ratio: number): string {
  if (ratio >= 1) return "stroke-destructive";
  if (ratio >= 0.85) return "stroke-amber-500";
  return "stroke-primary";
}

export function AiQuotaRing({ className }: { className?: string }) {
  const { t } = useTranslation();
  const quotaCtx = useAiQuota();
  const progress = useMemo(
    () => dailyQuotaProgress(quotaCtx?.quota ?? null),
    [quotaCtx?.quota],
  );

  const unavailableLabel = t(
    "ai.quotaUnavailable",
    "Points limit unavailable",
  );

  if (!progress) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative inline-flex size-6 shrink-0 items-center justify-center",
                className,
              )}
              aria-label={unavailableLabel}
            >
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="-rotate-90"
                aria-hidden
              >
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  className="stroke-muted-foreground/25"
                  strokeWidth={STROKE}
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{unavailableLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const remaining = Math.max(progress.max - progress.used, 0);
  const tooltipLabel =
    remaining === 0
      ? t("ai.quotaNoneLeft", "No points left today")
      : t("ai.quotaRemaining", "{{count}} points left today", {
          count: remaining,
        });

  const dashOffset = CIRCUMFERENCE * (1 - progress.ratio);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative inline-flex size-6 shrink-0 items-center justify-center",
              className,
            )}
            aria-label={tooltipLabel}
          >
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                className="stroke-muted-foreground/25"
                strokeWidth={STROKE}
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                className={cn(
                  "transition-[stroke-dashoffset,stroke] duration-300",
                  ringColor(progress.ratio),
                )}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
