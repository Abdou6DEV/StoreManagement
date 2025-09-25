import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Receipt, Users, Settings, Database } from "lucide-react";
import LoggerAdmin from "./components/loggerAdmin";
import { OptionsList } from "./components/optionsList";
import { ReceiptConfig } from "./components/receiptConfig";
import { BackupManagement } from "./components/backupManagement";
import AccountsManagement from "./components/accountsManagement";

export default function AdministratorPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [activeTab, setActiveTab] = useState<"settings" | "receipt" | "logs" | "accounts" | "backup">("settings");

  return (
    <main
      className="px-6 md:px-12 flex-1 space-y-4"
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
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {t("admin.settings")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("receipt")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "receipt"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t("admin.receipt")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "accounts"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("admin.accounts.title", "Accounts")}
          </div>
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
        <button
          onClick={() => setActiveTab("backup")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "backup"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            {t("admin.backup", "Backup")}
          </div>
        </button>
      </div>

      {activeTab === "settings" && <OptionsList />}

      {activeTab === "receipt" && <ReceiptConfig />}

      {activeTab === "accounts" && (
        <section className="bg-card border border-border rounded-xl shadow-sm p-6">
          <AccountsManagement />
        </section>
      )}

      {activeTab === "logs" && (
        <section className="bg-card border border-border rounded-xl shadow-sm p-6">
          <LoggerAdmin />
        </section>
      )}

      {activeTab === "backup" && (
        <section className="bg-card border border-border rounded-xl shadow-sm p-6">
          <BackupManagement />
        </section>
      )}
    </main>
  );
}
