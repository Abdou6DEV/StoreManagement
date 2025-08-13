import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../../lib/components/badge";

interface LogFilesPanelProps {
  logFiles: string[];
  selectedFile: string;
  onFileSelect: (file: string) => void;
}

export const LogFilesPanel: React.FC<LogFilesPanelProps> = ({
  logFiles,
  selectedFile,
  onFileSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t("admin.logger.logFiles")}</h3>
      <div className="space-y-2">
        {logFiles.map((file, index) => (
          <div
            key={index}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedFile === file
                ? "border-blue-500 bg-blue-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-medium truncate cursor-help"
                title={file}
              >
                {file.split("/").pop() || file.split("\\").pop()}
              </span>
              <Badge variant="secondary">Log File</Badge>
            </div>
          </div>
        ))}
        {logFiles.length === 0 && (
          <p className="text-sm text-gray-500">
            {t("admin.logger.noLogFiles")}
          </p>
        )}
      </div>
    </div>
  );
};
