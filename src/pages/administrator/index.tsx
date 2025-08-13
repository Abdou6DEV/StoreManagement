import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import LoggerAdmin from "./components/loggerAdmin";
import { OptionsList } from "./components/optionsList";

export default function AdministratorPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState<"settings" | "logs">("settings");

  return (
    <main
      className="px-6 md:px-12 flex-1 space-y-4 ml-7"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "settings"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("admin.settings")}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "logs"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {t("admin.logs")}
          </div>
        </button>
      </div>

      {activeTab === "settings" && <OptionsList />}

      {activeTab === "logs" && (
        <section className="bg-card border border-border rounded-xl shadow-sm p-6">
          <LoggerAdmin />
        </section>
      )}
    </main>
  );
}
