import { useEffect, useState, type CSSProperties } from "react";
import { User } from "lucide-react";
import { Badge } from "@/lib/components/ui/badge";
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@/lib/components/ui/status";
import { cn } from "@/lib/utils";

type LicenseKind = "trial" | "premium" | "standard" | "";

type TitleBarUpdate = {
  theme?: "light" | "dark";
  appName?: string;
  pageTitle?: string;
  dir?: "ltr" | "rtl";
  visible?: boolean;
  statusUser?: string;
  statusUserRole?: "admin" | "user" | "";
  statusLicense?: string;
  statusLicenseKind?: LicenseKind;
  statusOnline?: string;
  statusOnlineKind?: "online" | "offline" | "";
};

function licenseBadgeClass(kind: LicenseKind): string {
  if (kind === "trial") {
    return "border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  if (kind === "premium") {
    return "premium-gradient-bg gap-1 border-[#8b5cf6]/35 text-[#8b5cf6]";
  }
  // Light secondary tokens wash out on the title bar — use a clearer slate chip.
  return "border-slate-300/90 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100";
}

const dragStyle = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragStyle = { WebkitAppRegion: "no-drag" } as CSSProperties;

export function TitleBarApp() {
  const [state, setState] = useState<TitleBarUpdate>(() => {
    let theme: "light" | "dark" = "light";
    try {
      const saved = localStorage.getItem("theme");
      const dark =
        saved === "dark" ||
        (saved !== "light" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      theme = dark ? "dark" : "light";
    } catch {
      // ignore
    }
    return {
      theme,
      appName: "Reda Tech POS",
      pageTitle: "",
      statusUser: "",
      statusUserRole: "",
      statusLicense: "",
      statusLicenseKind: "",
      statusOnline: "",
      statusOnlineKind: "",
      dir: "ltr",
      visible: true,
    };
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  useEffect(() => {
    const unsubscribe = window.api?.app?.onTitleBarUpdate?.((payload) => {
      setState((prev) => ({ ...prev, ...payload }));
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  const loggedIn = Boolean(state.statusUser);
  const onlineStatus =
    state.statusOnlineKind === "online" || state.statusOnlineKind === "offline"
      ? state.statusOnlineKind
      : null;

  const logoSrc =
    state.theme === "dark" ? "./myapp.ico" : "./myapp_black.ico";

  if (state.visible === false) {
    return null;
  }

  return (
    <div
      className={cn(
        "box-border flex h-8 w-full items-center overflow-visible pr-0 pl-3 text-[12px]",
        "bg-[#f0f0f1] text-[#1c1c1e] dark:bg-[#0e0d0d] dark:text-[#f2f2f4]",
      )}
      style={dragStyle}
    >
      <div className="flex min-w-0 flex-1 items-center" dir="ltr" style={dragStyle}>
        <div className="flex shrink-0 items-center gap-2 opacity-90">
          <img
            src={logoSrc}
            alt=""
            width={20}
            height={20}
            draggable={false}
            className="pointer-events-none relative top-[-3px] size-[23px] object-contain"
          />
          <span className="h-5 leading-5 font-semibold whitespace-nowrap">
            {state.appName || "Reda Tech POS"}
          </span>
        </div>

        {(state.pageTitle ||
          loggedIn ||
          state.statusLicense ||
          onlineStatus) && (
          <div className="ml-3 flex min-w-0 items-center border-l border-current/20 pl-3">
            {state.pageTitle ? (
              <span
                className="h-5 max-w-[22vw] truncate leading-5 font-medium opacity-80"
                dir={state.dir}
              >
                {state.pageTitle}
              </span>
            ) : null}

            {loggedIn ? (
              <div
                className={cn(
                  "flex shrink-0 items-center gap-1.5 pr-3.5",
                  state.pageTitle && "ml-0 border-l border-current/20 pl-2.5",
                )}
              >
                <User
                  className={cn(
                    "size-3.5 shrink-0",
                    state.statusUserRole === "admin"
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-primary",
                  )}
                  aria-hidden
                />
                <span
                  className="h-5 whitespace-nowrap leading-5 font-medium opacity-80"
                  dir={state.dir}
                >
                  {state.statusUser}
                </span>
              </div>
            ) : null}

            {state.statusLicense ? (
              <div
                className="ml-1 flex items-center border-l border-current/20 px-3.5"
                style={noDragStyle}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 rounded-md px-2 py-0 text-[11px] font-medium",
                    licenseBadgeClass(state.statusLicenseKind ?? ""),
                  )}
                  dir={state.dir}
                >
                  {state.statusLicense}
                </Badge>
              </div>
            ) : null}

            {onlineStatus ? (
              <div
                className="ml-1 flex items-center border-l border-current/20 px-3.5"
                style={noDragStyle}
              >
                <Status
                  status={onlineStatus}
                  className="h-5 gap-1.5 rounded-md border border-slate-300/90 bg-slate-200 px-1.5 py-0 text-[11px] font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100"
                >
                  <StatusIndicator className="h-1.5 w-1.5 [&_span]:h-1.5 [&_span]:w-1.5" />
                  <StatusLabel className="text-[11px] text-current/80">
                    {state.statusOnline}
                  </StatusLabel>
                </Status>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="h-full w-[140px] shrink-0" style={noDragStyle} aria-hidden />
    </div>
  );
}
