import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FileText, Printer, Users, Settings, Database, Download, Shield } from "lucide-react";
import ActivityLogs from "./components/activityLogs";
import { OptionsList } from "./components/optionsList";
import { ReceiptConfig } from "./components/receiptConfig";
import { BackupManagement } from "./components/backupManagement";
import AccountsManagement from "./components/accountsManagement";
import UpdateManagement from "./components/updateManagement";
import { LicenseManagement } from "./components/licenseManagement";
import { useUpdateContext } from "../../lib/contexts/updateContext";
import { FadeUp } from "../../lib/components/fadeUp";

export default function AdministratorPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as
    | "settings"
    | "receipt"
    | "logs"
    | "accounts"
    | "backup"
    | "license"
    | "updates"
    | null;
  const subTabFromUrl = searchParams.get("subTab") as string | null;
  const [activeTab, setActiveTab] = useState<
    "settings" | "receipt" | "logs" | "accounts" | "backup" | "license" | "updates"
  >(
    tabFromUrl &&
      ["settings", "receipt", "logs", "accounts", "backup", "license", "updates"].includes(tabFromUrl)
      ? tabFromUrl
      : "settings",
  );
  const { state: updateState } = useUpdateContext();

  // Update URL when tab changes (preserve subTab for receipt tab)
  useEffect(() => {
    if (activeTab !== tabFromUrl) {
      const next: Record<string, string> = { tab: activeTab };
      if (activeTab === "receipt" && subTabFromUrl === "configurePrinters") next.subTab = "configurePrinters";
      setSearchParams(next);
    }
  }, [activeTab, tabFromUrl, subTabFromUrl, setSearchParams]);

  // Update tab when URL changes
  useEffect(() => {
    if (
      tabFromUrl &&
      ["settings", "receipt", "logs", "accounts", "backup", "license", "updates"].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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
            <Printer className="w-4 h-4" />
            {t("admin.configurePrinting", "Configure Printing")}
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
          onClick={() => setActiveTab("license")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "license"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {t("admin.licenseTab", "License")}
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
        <button
          onClick={() => setActiveTab("updates")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "updates"
              ? "border-b-2 border-orange-500 text-orange-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2 relative">
            <Download className="w-4 h-4" />
            {t("admin.updates", "Updates")}
            {updateState.updateInfo?.available && (
              <span className="bg-orange-500 text-white text-xs font-bold px-1.5 h-[18px] flex items-center justify-center min-w-[16px] rounded-sm ml-1">
                1
              </span>
            )}
          </div>
        </button>
      </div>

      <FadeUp contentKey={`${activeTab}:${subTabFromUrl ?? ""}`}>
        {activeTab === "settings" && <OptionsList />}

        {activeTab === "receipt" && (
          <ReceiptConfig
            subTabFromUrl={subTabFromUrl}
            setSearchParams={setSearchParams}
          />
        )}

        {activeTab === "accounts" && (
          <section className="bg-card border border-border rounded-xl shadow-sm p-6">
            <AccountsManagement />
          </section>
        )}

        {activeTab === "logs" && (
          <section className="bg-card border border-border rounded-xl shadow-sm p-6">
            <ActivityLogs />
          </section>
        )}

        {activeTab === "license" && (
          <section className="bg-card border border-border rounded-xl shadow-sm p-6">
            <LicenseManagement />
          </section>
        )}

        {activeTab === "backup" && (
          <section className="bg-card border border-border rounded-xl shadow-sm p-6">
            <BackupManagement />
          </section>
        )}

        {activeTab === "updates" && (
          <section className="bg-card border border-border rounded-xl shadow-sm p-6">
            <UpdateManagement />
          </section>
        )}
      </FadeUp>
    </main>
  );
}
