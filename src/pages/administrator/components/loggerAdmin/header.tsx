import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../lib/components/button";

interface HeaderProps {
  onRefresh: () => void;
  onClearLogs: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onClearLogs,
  isLoading,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">{t("admin.logger.title")}</h2>
      <div className="flex gap-2">
        <Button onClick={onRefresh} disabled={isLoading}>
          {t("admin.logger.refresh")}
        </Button>
        <Button variant="destructive" onClick={onClearLogs}>
          {t("admin.logger.clearAllLogs")}
        </Button>
      </div>
    </div>
  );
};
