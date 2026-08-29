import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../../lib/utils";

export type ScanErrorTone = "warning" | "danger" | "muted";

const toneClass: Record<
  ScanErrorTone,
  { wrap: string; icon: string }
> = {
  warning: {
    wrap: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: "text-yellow-600 dark:text-yellow-500",
  },
  danger: {
    wrap: "bg-red-100 dark:bg-red-900/30",
    icon: "text-red-600 dark:text-red-400",
  },
  muted: {
    wrap: "bg-muted",
    icon: "text-muted-foreground",
  },
};

export function ScanFlowError({
  icon: Icon,
  tone,
  title,
  description,
  tips,
  previewSrc,
  children,
}: {
  icon: LucideIcon;
  tone: ScanErrorTone;
  title: string;
  description: string;
  tips?: string[];
  previewSrc?: string | null;
  children: ReactNode;
}) {
  const colors = toneClass[tone];
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 py-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center sm:p-8"
      >
        {previewSrc ? (
          <img
            src={previewSrc}
            alt=""
            className="mx-auto mb-5 h-28 max-w-full rounded-lg border border-border bg-muted object-contain"
          />
        ) : null}
        <div
          className={cn(
            "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
            colors.wrap,
          )}
        >
          <Icon className={cn("h-7 w-7", colors.icon)} aria-hidden />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {tips && tips.length > 0 ? (
          <ul className="mt-5 space-y-2.5 rounded-lg border border-border bg-background px-4 py-3 text-start text-sm text-muted-foreground">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-600"
                  aria-hidden
                />
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
