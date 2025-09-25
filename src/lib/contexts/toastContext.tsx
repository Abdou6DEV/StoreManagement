import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { ToastType, Toast } from "../../types";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<{ [id: number]: NodeJS.Timeout }>({});
  const pauseTimes = useRef<{ [id: number]: number }>({});
  const startTimes = useRef<{ [id: number]: number }>({});

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
    (message: string, type: ToastType = "success") => {
      const id = ++toastId;
      const startTime = Date.now();
      startTimes.current[id] = startTime;
      setToasts((toasts) => [...toasts, { id, message, type }]);
      timeoutRefs.current[id] = setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  const getToastIcon = (type: ToastType) => {
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
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toasts rendered here for global access */}
      <div className="fixed z-[60] flex flex-col gap-3 p-4 top-16 right-4 max-w-sm w-full">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <div
              key={toast.id}
              className={`relative rounded-xl ${styles.bg} ${styles.shadow} text-card-foreground animate-slide-in-right transition-all duration-300 hover:shadow-md group overflow-hidden`}
              role="alert"
              tabIndex={0}
              data-toast-id={toast.id}
              onMouseEnter={(e) => {
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
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-muted rounded-b-xl overflow-hidden">
                <div 
                  className={`h-[3px] bg-gradient-to-r ${styles.progress} opacity-80 toast-progress`}
                  style={{
                    animation: 'toast-progress-shrink 4s linear forwards'
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="relative flex items-start gap-3 p-4">
                <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
                  {getToastIcon(toast.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-relaxed ${styles.text} break-words`}>
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
            </div>
          );
        })}
      </div>
      
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
