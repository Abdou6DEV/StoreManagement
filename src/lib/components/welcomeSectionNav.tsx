import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";

export type WelcomeSectionNavItem = {
  id: string;
  labelKey: string;
  defaultLabel: string;
};

export type WelcomeSectionNavProps = {
  items: readonly WelcomeSectionNavItem[];
  activeId: string;
  onNavigate: (sectionId: string) => void;
  isRTL: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function WelcomeSectionNav({
  items,
  activeId,
  onNavigate,
  isRTL,
  className,
  style,
}: WelcomeSectionNavProps) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("welcome.sectionNav.ariaLabel", "Welcome page sections")}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 hidden justify-center px-4 sm:top-0 sm:px-6 xl:flex",
        className,
      )}
      style={style}
    >
      <ul
        className={cn(
          "pointer-events-auto flex max-w-6xl gap-1 overflow-x-auto rounded-2xl border border-border/35 bg-background/60 p-1.5 text-[11px] leading-4 shadow-md backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "hover:border-border/55 hover:bg-background/90 hover:shadow-lg",
          isRTL && "flex-row-reverse",
        )}
      >
        {items.map((item) => {
          const isActive = activeId === item.id;
          const label = t(item.labelKey, item.defaultLabel);

          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={(event) => {
                  onNavigate(item.id);
                  event.currentTarget.blur();
                }}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "flex max-w-[11rem] items-start gap-1.5 rounded-xl px-2.5 py-1.5 text-start transition-colors duration-500 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary/10 font-medium text-foreground"
                    : "bg-transparent font-normal text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    isActive ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 break-words leading-snug">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
