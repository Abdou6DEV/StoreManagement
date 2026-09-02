import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { ToastType, Toast } from "../../types";
import { CheckCircle, XCircle, Info, X, Play } from "lucide-react";
import { playToastSound } from "../utils/soundUtils";

export type ToastAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "primary";
};

export type ShowToastOptions = {
  sticky?: boolean;
  actions?: ToastAction[];
  /** Override the default type icon (e.g. install-ready sticky toast). */
  icon?: "install";
};

/** Toasts when a daily local backup is created or auto-uploaded to cloud (IPC from main). */
function BackupToastListener(): React.ReactElement | null {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const autoBackupMessage = t(
    "admin.backup.autoBackupCreatedSuccess",
    "Automatic backup created successfully",
  );
  const autoCloudUploadMessage = t(
    "admin.backup.autoCloudUploadSuccess",
    "Automatic backup was uploaded to the cloud.",
  );

  useEffect(() => {
    const onLocalCreated = () => showToast(autoBackupMessage, "success");
    const onCloudUploaded = () => showToast(autoCloudUploadMessage, "success");

    const onCustomCreated = () => onLocalCreated();
    window.addEventListener("backup:created", onCustomCreated);

    let unsubLocal: (() => void) | undefined;
    let unsubCloud: (() => void) | undefined;
    if (typeof window !== "undefined" && window.api?.backup) {
      if (window.api.backup.onAutoBackupSuccess) {
        unsubLocal = window.api.backup.onAutoBackupSuccess(onLocalCreated);
      }
      if (window.api.backup.onAutoCloudUploadSuccess) {
        unsubCloud = window.api.backup.onAutoCloudUploadSuccess(onCloudUploaded);
      }
    }
    return () => {
      window.removeEventListener("backup:created", onCustomCreated);
      unsubLocal?.();
      unsubCloud?.();
    };
  }, [showToast, autoBackupMessage, autoCloudUploadMessage]);
  return null;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
  /**
   * Resolves when no auto-dismiss toasts are visible (sticky action toasts are ignored),
   * or when `timeoutMs` elapses — whichever comes first.
   */
  waitForToastQuiet: (options?: { timeoutMs?: number; pollMs?: number }) => Promise<void>;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef<Toast[]>([]);
  const timeoutRefs = useRef<{ [id: number]: NodeJS.Timeout }>({});
  const pauseTimes = useRef<{ [id: number]: number }>({});
  const startTimes = useRef<{ [id: number]: number }>({});

  toastsRef.current = toasts;

  const removeToast = useCallback((id: number) => {
    setToasts((toasts) => toasts.filter((t) => t.id !== id));
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    delete pauseTimes.current[id];
    delete startTimes.current[id];
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", options?: ShowToastOptions) => {
      const id = ++toastId;
      const sticky = options?.sticky === true;
      const actions = options?.actions;
      const icon = options?.icon;
      const startTime = Date.now();
      startTimes.current[id] = startTime;
      
      // Play sound for the toast
      playToastSound(type);
      
      setToasts((toasts) => [...toasts, { id, message, type, sticky, actions, icon }]);
      if (!sticky) {
        timeoutRefs.current[id] = setTimeout(() => removeToast(id), 4000);
      }
    },
    [removeToast],
  );

  const waitForToastQuiet = useCallback(
    (options?: { timeoutMs?: number; pollMs?: number }) => {
      const timeoutMs = options?.timeoutMs ?? 12_000;
      const pollMs = options?.pollMs ?? 200;
      const startedAt = Date.now();

      return new Promise<void>((resolve) => {
        const tick = () => {
          const hasAutoDismissToast = toastsRef.current.some((toast) => toast.sticky !== true);
          if (!hasAutoDismissToast || Date.now() - startedAt >= timeoutMs) {
            resolve();
            return;
          }
          window.setTimeout(tick, pollMs);
        };
        tick();
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const getToastIcon = (type: ToastType, icon?: Toast["icon"]) => {
    if (icon === "install") {
      return <Play className="w-5 h-5" />;
    }
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-card",
          border: "border-l-4 border-l-green-500",
          text: "text-card-foreground",
          icon: "text-green-500",
          progress: "from-green-500 to-green-400",
          shadow: "shadow-sm",
        };
      case "error":
        return {
          bg: "bg-card",
          border: "border-l-4 border-l-destructive",
          text: "text-card-foreground",
          icon: "text-destructive",
          progress: "from-destructive to-red-500",
          shadow: "shadow-sm",
        };
      default:
        return {
          bg: "bg-card",
          border: "border-l-4 border-l-primary",
          text: "text-card-foreground",
          icon: "text-primary",
          progress: "from-primary to-blue-500",
          shadow: "shadow-sm",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, waitForToastQuiet }}>
      {children}
      <BackupToastListener />
      {/* Toasts rendered here for global access */}
      {toasts.length > 0 && (
        <div className="fixed z-[60] flex flex-col gap-3 p-4 top-4 right-4 max-w-sm w-full">
          {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          const isSticky = toast.sticky === true;
          const hasActions = Boolean(toast.actions && toast.actions.length > 0);
          return (
            <div
              key={toast.id}
              className={`relative rounded-xl border border-border/80 ${styles.bg} text-card-foreground animate-slide-in-right transition-all duration-300 group overflow-hidden ${
                hasActions
                  ? "shadow-lg shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10"
                  : `${styles.shadow} hover:shadow-md`
              }`}
              role="alert"
              tabIndex={0}
              data-toast-id={toast.id}
              onMouseEnter={(e) => {
                if (isSticky) return;
                const progressBar = e.currentTarget.querySelector('.toast-progress') as HTMLElement;
                if (progressBar) {
                  progressBar.style.animationPlayState = 'paused';
                }
                // Pause the timeout and record pause time
                if (timeoutRefs.current[toast.id]) {
                  clearTimeout(timeoutRefs.current[toast.id]);
                  pauseTimes.current[toast.id] = Date.now();
                }
              }}
              onMouseLeave={(e) => {
                if (isSticky) return;
                const progressBar = e.currentTarget.querySelector('.toast-progress') as HTMLElement;
                if (progressBar) {
                  progressBar.style.animationPlayState = 'running';
                }
                // Resume the timeout with remaining time
                if (pauseTimes.current[toast.id] && startTimes.current[toast.id]) {
                  const elapsed = pauseTimes.current[toast.id] - startTimes.current[toast.id];
                  const remaining = Math.max(0, 4000 - elapsed);
                  if (remaining > 0) {
                    timeoutRefs.current[toast.id] = setTimeout(() => removeToast(toast.id), remaining);
                  } else {
                    removeToast(toast.id);
                  }
                }
              }}
            >
              {/* Simple progress bar at bottom */}
              {!isSticky ? (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-muted rounded-b-xl overflow-hidden">
                  <div 
                    className={`h-[3px] bg-gradient-to-r ${styles.progress} opacity-80 toast-progress`}
                    style={{
                      animation: 'toast-progress-shrink 4s linear forwards'
                    }}
                  />
                </div>
              ) : null}
              
              {/* Content */}
              <div className={`relative flex items-start gap-3 ${hasActions ? "p-4 pb-3" : "p-4"}`}>
                <div
                  className={`flex-shrink-0 ${
                    toast.icon === "install"
                      ? "text-blue-700"
                      : styles.icon
                  } ${
                    hasActions
                      ? `mt-0 flex h-9 w-9 items-center justify-center rounded-full ${
                          toast.icon === "install"
                            ? "bg-blue-700/10"
                            : toast.type === "error"
                              ? "bg-destructive/10"
                              : toast.type === "info"
                                ? "bg-primary/10"
                                : "bg-green-500/10"
                        }`
                      : "mt-0.5"
                  }`}
                >
                  {getToastIcon(toast.type, toast.icon)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-relaxed ${styles.text} break-words text-pretty ${hasActions ? "pt-1.5" : ""}`}>
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent`}
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {hasActions ? (
                <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-3 py-2.5">
                  {toast.actions!.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        action.onClick();
                        removeToast(toast.id);
                      }}
                      className={
                        action.variant === "primary"
                          ? "inline-flex h-8 items-center justify-center rounded-md bg-blue-700 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                          : action.variant === "outline"
                            ? "inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            : "inline-flex h-8 items-center justify-center rounded-md bg-muted px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      )}
      
      {/* Add custom CSS for the progress animation */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes toast-progress-shrink {
              0% {
                width: 100%;
              }
              100% {
                width: 0%;
              }
            }
            
            
            @keyframes slide-in-right {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            
            .animate-slide-in-right {
              animation: slide-in-right 0.3s ease-out;
            }
          `
        }} />
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
