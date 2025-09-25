import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../../lib/components/badge";
import { LogEntry } from "./types";
import { LogLevel } from "../../../../lib/logger/common";

interface LogEntryItemProps {
  entry: LogEntry;
  index: number;
}

export const LogEntryItem: React.FC<LogEntryItemProps> = ({ entry, index }) => {
  const { t } = useTranslation();

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR:
        return "bg-red-500";
      case LogLevel.WARN:
        return "bg-yellow-500";
      case LogLevel.INFO:
        return "bg-blue-500";
      case LogLevel.DEBUG:
        return "bg-purple-500";
      case LogLevel.TRACE:
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div key={`${entry.timestamp}-${index}`} className="p-3 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge className={getLevelColor(entry.level)}>{entry.level}</Badge>
          <Badge variant="outline">{entry.process}</Badge>
          {entry.context && <Badge variant="secondary">{entry.context}</Badge>}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimestamp(entry.timestamp)}
        </span>
      </div>
      <p className="text-sm mb-2">{entry.message}</p>
      {entry.data && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
            {t("admin.logger.additionalData")}
          </summary>
          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto select-text">
            {JSON.stringify(entry.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
