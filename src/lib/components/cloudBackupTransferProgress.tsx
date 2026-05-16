import React from "react";
import { useTranslation } from "react-i18next";
import type { CloudBackupTransferProgressPayload } from "../../electron/types/cloudBackup";
import { formatBytes } from "../utils/formatBytes";
import { cn } from "../utils";

type CloudBackupTransferProgressProps = {
  progress: CloudBackupTransferProgressPayload;
  className?: string;
};

export function CloudBackupTransferProgressBar({
  progress,
  className,
}: CloudBackupTransferProgressProps) {
  const { t } = useTranslation();

  const remainingLabel =
    progress.total > 0 &&
    progress.downloaded > 0 &&
    progress.speed > 0 &&
    (() => {
      const remainingBytes = progress.total - progress.downloaded;
      const remainingSeconds = Math.ceil(remainingBytes / progress.speed);
      if (remainingSeconds < 60) {
        return `${remainingSeconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
      }
      if (remainingSeconds < 3600) {
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        return `${minutes}m ${seconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
      }
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      return `${hours}h ${minutes}m ${t("admin.updatesContent.remaining", "remaining")}`;
    })();

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 h-3 w-full rounded-full bg-muted">
        <div
          className="h-3 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress.progress))}%` }}
        />
      </div>
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {Math.round(progress.progress)}% {t("admin.updatesContent.complete", "complete")}
        </span>
        <span>{progress.speed > 0 ? `${formatBytes(progress.speed)}/s` : null}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
        </span>
        <span>{remainingLabel || null}</span>
      </div>
    </div>
  );
}
