import { useState, useEffect, useCallback, useRef } from "react";
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
import { cn } from "../../lib/utils";

const BACKUP_ENTER_ANIM_CLASSES = [
  "animate-in",
  "fade-in",
  "slide-in-from-bottom-2",
  "duration-200",
] as const;

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
  // Keep Backup mounted after first visit so re-entering the tab does not flash empty/loading UI.
  const [backupTabVisited, setBackupTabVisited] = useState(activeTab === "backup");
  const backupSectionRef = useRef<HTMLElement | null>(null);
  const backupEnterAnimSeenRef = useRef(false);
  const { state: updateState } = useUpdateContext();

  // Same enter motion as FadeUp, without remounting BackupManagement.
  useEffect(() => {
    if (activeTab !== "backup") return;
    const el = backupSectionRef.current;
    if (!el) return;
    if (!backupEnterAnimSeenRef.current) {
      backupEnterAnimSeenRef.current = true;
      return;
    }
    el.classList.remove(...BACKUP_ENTER_ANIM_CLASSES);
    void el.offsetWidth;
    el.classList.add(...BACKUP_ENTER_ANIM_CLASSES);
  }, [activeTab]);

  const validTabs = [
    "settings",
    "receipt",
    "logs",
    "accounts",
    "backup",
    "license",
    "updates",
  ] as const;

  type AdminTab = (typeof validTabs)[number];

  const selectTab = useCallback(
    (tab: AdminTab) => {
      setActiveTab(tab);
      if (tab === "backup") setBackupTabVisited(true);
      const next: Record<string, string> = { tab };
      if (tab === "receipt" && subTabFromUrl === "configurePrinters") {
        next.subTab = "configurePrinters";
      }
      setSearchParams(next);
    },
    [subTabFromUrl, setSearchParams],
  );

  // External navigation (links, bookmarks): apply ?tab= to state only.
  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
      if (tabFromUrl === "backup") setBackupTabVisited(true);
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
          onClick={() => selectTab("settings")}
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
          onClick={() => selectTab("receipt")}
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
          onClick={() => selectTab("accounts")}
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
          onClick={() => selectTab("logs")}
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
          onClick={() => selectTab("backup")}
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
          onClick={() => selectTab("updates")}
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
        <button
          onClick={() => selectTab("license")}
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
      </div>

      {backupTabVisited ? (
        <section
          ref={backupSectionRef}
          className={cn(
            "bg-card border border-border rounded-xl shadow-sm p-6",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            activeTab !== "backup" && "hidden",
          )}
          aria-hidden={activeTab !== "backup"}
        >
          <BackupManagement onOpenLicenseTab={() => selectTab("license")} />
        </section>
      ) : null}

      {activeTab !== "backup" ? (
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

          {activeTab === "updates" && (
            <section className="bg-card border border-border rounded-xl shadow-sm p-6">
              <UpdateManagement />
            </section>
          )}

          {activeTab === "license" && (
            <section className="bg-card border border-border rounded-xl shadow-sm p-6">
              <LicenseManagement />
            </section>
          )}
        </FadeUp>
      ) : null}
    </main>
  );
}
