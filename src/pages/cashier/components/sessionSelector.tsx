import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";
import type { Session } from "./sessionManager";

interface SessionSelectorProps {
  sessions: Session[];
  activeSession: number;
  maxSessions: number;
  onSessionChange: (sessionIndex: number) => void;
  onAddSession: () => void;
  onRemoveSession: (sessionIndex: number) => void;
}

export default function SessionSelector({
  sessions,
  activeSession,
  maxSessions,
  onSessionChange,
  onAddSession,
  onRemoveSession,
}: SessionSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="gap-3 bg-background flex justify-center items-center px-4 py-4 flex-shrink-0">
      {sessions.map((session, i) => {
        const isActive = activeSession === i;
        const hasItems = session.cart.length > 0;

        const baseClasses =
          "px-3 py-1 text-xs font-semibold rounded-md transition border";
        const active = "bg-primary text-secondary border-transparent";
        const green = "bg-green-600 text-white hover:bg-green-700";
        const inactive =
          "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground";

        return (
          <div key={i} className="flex items-center gap-1">
            <Tooltip
              content={
                hasItems
                  ? t(
                      "cashier.tooltipSessionWithItems",
                      "Session {{number}} - Has {{count}} items in cart",
                      { number: i + 1, count: session.cart.length },
                    )
                  : t(
                      "cashier.tooltipSessionEmpty",
                      "Session {{number}} - Empty cart, ready for new transaction",
                      { number: i + 1 },
                    )
              }
              position="top"
            >
              <button
                onClick={() => onSessionChange(i)}
                className={`${baseClasses} ${
                  isActive ? active : hasItems ? green : inactive
                }`}
              >
                {t("cashier.page", { number: i + 1 })}
              </button>
            </Tooltip>
            {sessions.length > 1 && (
              <Tooltip
                content={t(
                  "cashier.tooltipRemoveSession",
                  "Remove this session",
                )}
                position="top"
              >
                <button
                  onClick={() => onRemoveSession(i)}
                  className="w-5 h-5 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-100 rounded-full flex items-center justify-center transition"
                >
                  ×
                </button>
              </Tooltip>
            )}
          </div>
        );
      })}

      {/* Add New Session Button */}
      {sessions.length < maxSessions && (
        <Tooltip
          content={t("cashier.tooltipAddSession", "Add new session")}
          position="top"
        >
          <button
            onClick={onAddSession}
            className="px-3 py-1 text-xs font-semibold rounded-md transition border border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            {t("cashier.addSession", "Add")}
          </button>
        </Tooltip>
      )}
    </div>
  );
} 