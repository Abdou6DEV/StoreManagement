"use client";

import { useEffect, useState, type FC } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import ShinyText from "../ui/shinyText";

type WorkStatus = {
  phase: "thinking" | "tool" | "writing";
  toolName?: string;
};

function statusLabel(
  t: (key: string, fallback: string) => string,
  status: WorkStatus,
) {
  if (status.phase === "writing") {
    return t("ai.statusWriting", "Writing reply");
  }
  if (status.phase === "tool") {
    switch (status.toolName) {
      case "report":
        return t("ai.statusAnalyzing", "Analyzing data");
      case "find":
        return t("ai.statusSearching", "Searching the store");
      case "alerts":
        return t("ai.statusCheckingAlerts", "Checking alerts");
      case "restock":
        return t("ai.statusPlanningRestock", "Planning restock");
      default:
        return t("ai.statusLookingUp", "Looking up store data");
    }
  }
  return t("ai.statusThinking", "Thinking");
}

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const WorkingStatus: FC = () => {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<WorkStatus>({ phase: "thinking" });

  useEffect(() => {
    setStatus({ phase: "thinking" });
    return window.api.ai.onStatus?.((next) => setStatus(next));
  }, []);

  const label = statusLabel(t, status);
  const isRtl = i18n.language.startsWith("ar");

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex items-center gap-2 text-sm leading-none"
    >
      <span className="working-status-spinner" aria-hidden />
      <span className="relative inline-grid overflow-hidden leading-5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            initial={reduceMotion ? false : fadeUp.initial}
            animate={fadeUp.animate}
            exit={reduceMotion ? fadeUp.animate : fadeUp.exit}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            <ShinyText
              text={label}
              speed={2}
              delay={0}
              color="var(--color-muted-foreground)"
              shineColor="color-mix(in oklab, white 40%, var(--color-muted-foreground))"
              spread={120}
              direction={isRtl ? "right" : "left"}
              yoyo={false}
              pauseOnHover={false}
              disabled={!!reduceMotion}
            />
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};
