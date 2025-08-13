import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../lib/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../lib/components/select";
import { LogLevel } from "../../../../lib/logger/common";
import { LoggerConfig } from "./types";

interface ConfigurationPanelProps {
  config: LoggerConfig;
  onConfigUpdate: (newConfig: Partial<LoggerConfig>) => void;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onConfigUpdate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {t("admin.logger.configuration")}
      </h3>
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <label className="text-sm font-medium">
            {t("admin.logger.logLevel")}
          </label>
          <Select
            value={config.level}
            onValueChange={(value: string) =>
              onConfigUpdate({ level: value as LogLevel })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LogLevel).map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">
            {t("admin.logger.maxFileSize")}
          </label>
          <Input
            type="number"
            value={config.maxFileSize / (1024 * 1024)}
            onChange={(e) =>
              onConfigUpdate({
                maxFileSize: parseInt(e.target.value) * 1024 * 1024,
              })
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            {t("admin.logger.maxFiles")}
          </label>
          <Input
            type="number"
            value={config.maxFiles}
            onChange={(e) =>
              onConfigUpdate({ maxFiles: parseInt(e.target.value) })
            }
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="logToFile"
            checked={config.logToFile}
            onChange={(e) => onConfigUpdate({ logToFile: e.target.checked })}
          />
          <label htmlFor="logToFile" className="text-sm">
            {t("admin.logger.logToFile")}
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="logToConsole"
            checked={config.logToConsole}
            onChange={(e) => onConfigUpdate({ logToConsole: e.target.checked })}
          />
          <label htmlFor="logToConsole" className="text-sm">
            {t("admin.logger.logToConsole")}
          </label>
        </div>
      </div>
    </div>
  );
};
