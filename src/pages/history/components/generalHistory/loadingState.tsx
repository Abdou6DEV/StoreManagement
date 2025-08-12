import { useTranslation } from "react-i18next";

export default function LoadingState() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span>{t("history.loadingData")}</span>
      </div>
    </div>
  );
}
