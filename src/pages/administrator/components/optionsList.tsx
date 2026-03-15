import React, { useEffect, useRef, useState } from "react";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { Switch } from "../../../lib/components/switch";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { useCompletedServices } from "../../../lib/contexts/completedServicesContext";
import { useAuth } from "../../../lib/contexts/authContext";
import {
  Shield,
  Loader2,
  AlertCircle,
  Package,
  Bell,
  Users,
  ShoppingCart,
  History,
  FileText,
  Wrench,
  CheckSquare,
  Square,
  ChevronDown,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../lib/components/dropdownMenu";

const OPTION_KEYS = [
  "lowStockThreshold", "enableLowStockBadge", "enableOutOfStockBadge",
  "enableOverduePaymentsBadge", "enableDueSoonPaymentsBadge", "enableOverdueBillsBadge",
  "enableDueSoonBillsBadge", "enableOverdueServicesBadge", "enableDueSoonServicesBadge",
  "dueSoonThresholdDays", "dueSoonBillsThresholdDays", "dueSoonServicesThresholdDays",
  "cashierSalesHistoryDays", "enableCashierHistory", "enableCompletedServicesBadge",
  "categoriesRequiringInfo",
] as const;

export const OptionsList: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refreshCompletedServicesCount } = useCompletedServices();
  const { user } = useAuth();
  const initialValuesRef = useRef<Record<string, string> | null>(null);
  const [lowStock, setLowStock] = useState(0);
  const [enableLowStockBadge, setEnableLowStockBadge] = useState(true);
  const [enableOutOfStockBadge, setEnableOutOfStockBadge] = useState(true);
  const [enableOverduePaymentsBadge, setEnableOverduePaymentsBadge] = useState(true);
  const [enableDueSoonPaymentsBadge, setEnableDueSoonPaymentsBadge] = useState(true);
  const [enableOverdueBillsBadge, setEnableOverdueBillsBadge] = useState(true);
  const [enableDueSoonBillsBadge, setEnableDueSoonBillsBadge] = useState(true);
  const [enableOverdueServicesBadge, setEnableOverdueServicesBadge] = useState(true);
  const [enableDueSoonServicesBadge, setEnableDueSoonServicesBadge] = useState(true);
  const [dueSoonThresholdDays, setDueSoonThresholdDays] = useState(2);
  const [dueSoonBillsThresholdDays, setDueSoonBillsThresholdDays] = useState(2);
  const [dueSoonServicesThresholdDays, setDueSoonServicesThresholdDays] = useState(2);
  const [cashierSalesHistoryDays, setCashierSalesHistoryDays] = useState(7);
  const [enableCashierHistory, setEnableCashierHistory] = useState(true);
  const [enableCompletedServicesBadge, setEnableCompletedServicesBadge] = useState(true);
  const [categoriesRequiringInfo, setCategoriesRequiringInfo] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Array<{name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.database.options.get("lowStockThreshold"),
      window.api.database.options.get("enableLowStockBadge"),
      window.api.database.options.get("enableOutOfStockBadge"),
      window.api.database.options.get("enableOverduePaymentsBadge"),
      window.api.database.options.get("enableDueSoonPaymentsBadge"),
      window.api.database.options.get("enableOverdueBillsBadge"),
      window.api.database.options.get("enableDueSoonBillsBadge"),
      window.api.database.options.get("enableOverdueServicesBadge"),
      window.api.database.options.get("enableDueSoonServicesBadge"),
      window.api.database.options.get("dueSoonThresholdDays"),
      window.api.database.options.get("dueSoonBillsThresholdDays"),
      window.api.database.options.get("dueSoonServicesThresholdDays"),
      window.api.database.options.get("cashierSalesHistoryDays"),
      window.api.database.options.get("enableCashierHistory"),
      window.api.database.options.get("enableCompletedServicesBadge"),
      window.api.database.options.get("categoriesRequiringInfo"),
      window.api.database.categories.getAll(),
    ])
      .then(([lowStockVal, enableBadgeVal, enableOutOfStockBadgeVal, enableOverdueVal, enableDueSoonVal, enableOverdueBillsVal, enableDueSoonBillsVal, enableOverdueServicesVal, enableDueSoonServicesVal, dueSoonThresholdVal, dueSoonBillsThresholdVal, dueSoonServicesThresholdVal, cashierSalesHistoryDaysVal, enableCashierHistoryVal, enableCompletedServicesBadgeVal, categoriesRequiringInfoVal, categoriesData]) => {
        setLowStock(lowStockVal ? Number(lowStockVal) : 0);
        setEnableLowStockBadge(enableBadgeVal !== "false"); // Default to true if not set
        setEnableOutOfStockBadge(enableOutOfStockBadgeVal !== "false"); // Default to true if not set
        setEnableOverduePaymentsBadge(enableOverdueVal !== "false"); // Default to true if not set
        setEnableDueSoonPaymentsBadge(enableDueSoonVal !== "false"); // Default to true if not set
        setEnableOverdueBillsBadge(enableOverdueBillsVal !== "false"); // Default to true if not set
        setEnableDueSoonBillsBadge(enableDueSoonBillsVal !== "false"); // Default to true if not set
        setEnableOverdueServicesBadge(enableOverdueServicesVal !== "false"); // Default to true if not set
        setEnableDueSoonServicesBadge(enableDueSoonServicesVal !== "false"); // Default to true if not set
        setDueSoonThresholdDays(dueSoonThresholdVal ? Number(dueSoonThresholdVal) : 2); // Default to 2 days
        setDueSoonBillsThresholdDays(dueSoonBillsThresholdVal ? Number(dueSoonBillsThresholdVal) : 2); // Default to 2 days
        setDueSoonServicesThresholdDays(dueSoonServicesThresholdVal ? Number(dueSoonServicesThresholdVal) : 2); // Default to 2 days
        setCashierSalesHistoryDays(cashierSalesHistoryDaysVal ? Number(cashierSalesHistoryDaysVal) : 7); // Default to 7 days
        setEnableCashierHistory(enableCashierHistoryVal !== "false"); // Default to true if not set
        setEnableCompletedServicesBadge(enableCompletedServicesBadgeVal !== "false"); // Default to true if not set
        setCategoriesRequiringInfo(categoriesRequiringInfoVal ? JSON.parse(categoriesRequiringInfoVal) : []);
        setAllCategories(categoriesData || []);
        initialValuesRef.current = {
          lowStockThreshold: String(lowStockVal ?? 0),
          enableLowStockBadge: enableBadgeVal !== "false" ? "true" : "false",
          enableOutOfStockBadge: enableOutOfStockBadgeVal !== "false" ? "true" : "false",
          enableOverduePaymentsBadge: enableOverdueVal !== "false" ? "true" : "false",
          enableDueSoonPaymentsBadge: enableDueSoonVal !== "false" ? "true" : "false",
          enableOverdueBillsBadge: enableOverdueBillsVal !== "false" ? "true" : "false",
          enableDueSoonBillsBadge: enableDueSoonBillsVal !== "false" ? "true" : "false",
          enableOverdueServicesBadge: enableOverdueServicesVal !== "false" ? "true" : "false",
          enableDueSoonServicesBadge: enableDueSoonServicesVal !== "false" ? "true" : "false",
          dueSoonThresholdDays: String(dueSoonThresholdVal ?? 2),
          dueSoonBillsThresholdDays: String(dueSoonBillsThresholdVal ?? 2),
          dueSoonServicesThresholdDays: String(dueSoonServicesThresholdVal ?? 2),
          cashierSalesHistoryDays: String(cashierSalesHistoryDaysVal ?? 7),
          enableCashierHistory: enableCashierHistoryVal !== "false" ? "true" : "false",
          enableCompletedServicesBadge: enableCompletedServicesBadgeVal !== "false" ? "true" : "false",
          categoriesRequiringInfo: categoriesRequiringInfoVal ?? "[]",
        };
        setLoading(false);
      })
      .catch(() => {
        showToast(t("admin.loadError", "Failed to load settings"), "error");
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newValues: Record<string, string> = {
        lowStockThreshold: String(lowStock),
        enableLowStockBadge: String(enableLowStockBadge),
        enableOutOfStockBadge: String(enableOutOfStockBadge),
        enableOverduePaymentsBadge: String(enableOverduePaymentsBadge),
        enableDueSoonPaymentsBadge: String(enableDueSoonPaymentsBadge),
        enableOverdueBillsBadge: String(enableOverdueBillsBadge),
        enableDueSoonBillsBadge: String(enableDueSoonBillsBadge),
        enableOverdueServicesBadge: String(enableOverdueServicesBadge),
        enableDueSoonServicesBadge: String(enableDueSoonServicesBadge),
        dueSoonThresholdDays: String(dueSoonThresholdDays),
        dueSoonBillsThresholdDays: String(dueSoonBillsThresholdDays),
        dueSoonServicesThresholdDays: String(dueSoonServicesThresholdDays),
        cashierSalesHistoryDays: String(cashierSalesHistoryDays),
        enableCashierHistory: String(enableCashierHistory),
        enableCompletedServicesBadge: String(enableCompletedServicesBadge),
        categoriesRequiringInfo: JSON.stringify(categoriesRequiringInfo),
      };
      await Promise.all([
        window.api.database.options.set("lowStockThreshold", newValues.lowStockThreshold),
        window.api.database.options.set("enableLowStockBadge", newValues.enableLowStockBadge),
        window.api.database.options.set("enableOutOfStockBadge", newValues.enableOutOfStockBadge),
        window.api.database.options.set("enableOverduePaymentsBadge", newValues.enableOverduePaymentsBadge),
        window.api.database.options.set("enableDueSoonPaymentsBadge", newValues.enableDueSoonPaymentsBadge),
        window.api.database.options.set("enableOverdueBillsBadge", newValues.enableOverdueBillsBadge),
        window.api.database.options.set("enableDueSoonBillsBadge", newValues.enableDueSoonBillsBadge),
        window.api.database.options.set("enableOverdueServicesBadge", newValues.enableOverdueServicesBadge),
        window.api.database.options.set("enableDueSoonServicesBadge", newValues.enableDueSoonServicesBadge),
        window.api.database.options.set("dueSoonThresholdDays", newValues.dueSoonThresholdDays),
        window.api.database.options.set("dueSoonBillsThresholdDays", newValues.dueSoonBillsThresholdDays),
        window.api.database.options.set("dueSoonServicesThresholdDays", newValues.dueSoonServicesThresholdDays),
        window.api.database.options.set("cashierSalesHistoryDays", newValues.cashierSalesHistoryDays),
        window.api.database.options.set("enableCashierHistory", newValues.enableCashierHistory),
        window.api.database.options.set("enableCompletedServicesBadge", newValues.enableCompletedServicesBadge),
        window.api.database.options.set("categoriesRequiringInfo", newValues.categoriesRequiringInfo),
      ]);

      const initial = initialValuesRef.current;
      const changeLines: string[] = [];
      if (initial) {
        for (const key of OPTION_KEYS) {
          const oldVal = initial[key];
          const newVal = newValues[key];
          if (oldVal !== newVal) {
            changeLines.push(`option.${key}: ${oldVal} → ${newVal}`);
          }
        }
      }
      if (changeLines.length > 0) {
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.settingsUpdated",
          details: changeLines.join("\n"),
        }).catch(() => {});
      }
      initialValuesRef.current = newValues;

      // Refresh completed services count immediately if the setting changed
      refreshCompletedServicesCount();

      showToast(t("admin.saved", "Settings saved successfully!"), "success");
    } catch {
      showToast(t("admin.saveError", "Failed to save settings"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-orange-500" />
        <h1 className="text-2xl font-bold">
          {t("admin.optionsList", "Options List")}
        </h1>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Stock Management Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.stockManagement", "Stock Management")}
            </h3>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Threshold Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 w-full">
              <label
                className="block text-base font-semibold mb-2"
                htmlFor="lowStock"
              >
                {t("admin.lowStockThreshold", "Low Stock Threshold")}
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                {t(
                  "admin.lowStockDesc",
                  "Set the minimum quantity before a product is considered low in stock",
                )}
              </p>
              <Input
                id="lowStock"
                type="number"
                min={0}
                value={lowStock}
                onChange={(e) => setLowStock(Number(e.target.value))}
                className="w-40 text-lg"
                disabled={loading || saving}
                aria-label={t("admin.lowStockThreshold", "Low Stock Threshold")}
              />
            </div>
          </div>

          {/* Low Stock Notification Badge Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1 w-full">
              <label
                className="block text-base font-semibold mb-2"
                htmlFor="enableBadge"
              >
                {t("admin.enableLowStockBadge", "Enable Low Stock Notification Badge")}
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("admin.enableBadgeDesc", "Show notification badge on stock menu item when products are low in stock")}
              </p>
              <div className="flex items-center gap-3">
                <Switch
                  id="enableBadge"
                  checked={enableLowStockBadge}
                  onCheckedChange={setEnableLowStockBadge}
                  disabled={loading || saving}
                  aria-label={t("admin.enableLowStockBadge", "Enable Low Stock Notification Badge")}
                />
                <span className="text-sm font-medium">
                  {enableLowStockBadge 
                    ? t("admin.enabled", "Enabled") 
                    : t("admin.disabled", "Disabled")
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Out of Stock Notification Badge Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 w-full">
              <label
                className="block text-base font-semibold mb-2"
                htmlFor="enableOutOfStockBadge"
              >
                {t("admin.enableOutOfStockBadge", "Enable Out of Stock Notification Badge")}
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("admin.enableOutOfStockBadgeDesc", "Show notification badge on stock menu item when products are out of stock")}
              </p>
              <div className="flex items-center gap-3">
                <Switch
                  id="enableOutOfStockBadge"
                  checked={enableOutOfStockBadge}
                  onCheckedChange={setEnableOutOfStockBadge}
                  disabled={loading || saving}
                  aria-label={t("admin.enableOutOfStockBadge", "Enable Out of Stock Notification Badge")}
                />
                <span className="text-sm font-medium">
                  {enableOutOfStockBadge 
                    ? t("admin.enabled", "Enabled") 
                    : t("admin.disabled", "Disabled")
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Payment Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.paymentNotifications", "Payment Notifications")}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Payments Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableOverdueBadge"
                >
                  {t("admin.enableOverduePaymentsBadge", "Enable Overdue Payments Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableOverdueBadgeDesc", "Show notification badge on clients menu item when there are overdue credits and versements")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableOverdueBadge"
                    checked={enableOverduePaymentsBadge}
                    onCheckedChange={setEnableOverduePaymentsBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableOverduePaymentsBadge", "Enable Overdue Payments Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableOverduePaymentsBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Payments Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableDueSoonBadge"
                >
                  {t("admin.enableDueSoonPaymentsBadge", "Enable Due Soon Payments Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableDueSoonBadgeDesc", "Show notification badge on clients menu item when there are credits and versements due soon")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableDueSoonBadge"
                    checked={enableDueSoonPaymentsBadge}
                    onCheckedChange={setEnableDueSoonPaymentsBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableDueSoonPaymentsBadge", "Enable Due Soon Payments Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableDueSoonPaymentsBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Payments Threshold Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="dueSoonThreshold"
                >
                  {t("admin.dueSoonThreshold", "Due Soon Payments Threshold (Days)")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t(
                    "admin.dueSoonThresholdDesc",
                    "Number of days before due date to consider a payment as 'due soon'",
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="dueSoonThreshold"
                    type="number"
                    min={1}
                    max={30}
                    value={dueSoonThresholdDays}
                    onChange={(e) => setDueSoonThresholdDays(Number(e.target.value))}
                    className="w-20"
                    disabled={loading || saving}
                    aria-label={t("admin.dueSoonThreshold", "Due Soon Payments Threshold (Days)")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("admin.days", "days")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bills Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.billsNotifications", "Bills Notifications")}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Bills Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableOverdueBillsBadge"
                >
                  {t("admin.enableOverdueBillsBadge", "Enable Overdue Bills Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableOverdueBillsBadgeDesc", "Show notification badge on bills menu item when there are overdue bills")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableOverdueBillsBadge"
                    checked={enableOverdueBillsBadge}
                    onCheckedChange={setEnableOverdueBillsBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableOverdueBillsBadge", "Enable Overdue Bills Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableOverdueBillsBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Bills Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableDueSoonBillsBadge"
                >
                  {t("admin.enableDueSoonBillsBadge", "Enable Due Soon Bills Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableDueSoonBillsBadgeDesc", "Show notification badge on bills menu item when there are bills due soon")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableDueSoonBillsBadge"
                    checked={enableDueSoonBillsBadge}
                    onCheckedChange={setEnableDueSoonBillsBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableDueSoonBillsBadge", "Enable Due Soon Bills Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableDueSoonBillsBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Bills Threshold Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="dueSoonBillsThreshold"
                >
                  {t("admin.dueSoonBillsThreshold", "Due Soon Bills Threshold (Days)")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.dueSoonBillsThresholdDesc", "Number of days before due date to show 'due soon' notification for bills")}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="dueSoonBillsThreshold"
                    type="number"
                    min={1}
                    max={30}
                    value={dueSoonBillsThresholdDays}
                    onChange={(e) => setDueSoonBillsThresholdDays(Number(e.target.value))}
                    disabled={loading || saving}
                    className="w-20"
                    aria-label={t("admin.dueSoonBillsThreshold", "Due Soon Bills Threshold (Days)")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("admin.days", "days")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.servicesNotifications", "Services Notifications")}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Services Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableOverdueServicesBadge"
                >
                  {t("admin.enableOverdueServicesBadge", "Enable Overdue Services Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableOverdueServicesBadgeDesc", "Show notification badge on services menu item when there are overdue services")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableOverdueServicesBadge"
                    checked={enableOverdueServicesBadge}
                    onCheckedChange={setEnableOverdueServicesBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableOverdueServicesBadge", "Enable Overdue Services Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableOverdueServicesBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Services Notification Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableDueSoonServicesBadge"
                >
                  {t("admin.enableDueSoonServicesBadge", "Enable Due Soon Services Notification Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableDueSoonServicesBadgeDesc", "Show notification badge on services menu item when there are services due soon")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableDueSoonServicesBadge"
                    checked={enableDueSoonServicesBadge}
                    onCheckedChange={setEnableDueSoonServicesBadge}
                    disabled={loading || saving}
                    aria-label={t("admin.enableDueSoonServicesBadge", "Enable Due Soon Services Notification Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableDueSoonServicesBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Due Soon Services Threshold Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="dueSoonServicesThreshold"
                >
                  {t("admin.dueSoonServicesThreshold", "Due Soon Services Threshold (Days)")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.dueSoonServicesThresholdDesc", "Number of days before due date to show 'due soon' notification for services")}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="dueSoonServicesThreshold"
                    type="number"
                    min={1}
                    max={30}
                    value={dueSoonServicesThresholdDays}
                    onChange={(e) => setDueSoonServicesThresholdDays(Number(e.target.value))}
                    disabled={loading || saving}
                    className="w-20"
                    aria-label={t("admin.dueSoonServicesThreshold", "Due Soon Services Threshold (Days)")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("admin.days", "days")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cashier Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.cashierSettings", "Cashier Settings")}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Enable Cashier History Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableCashierHistory"
                >
                  {t("admin.enableCashierHistory", "Enable Cashier History")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableCashierHistoryDesc", "Allow users to access the history tab in the cashier interface")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableCashierHistory"
                    checked={enableCashierHistory}
                    onCheckedChange={setEnableCashierHistory}
                    disabled={loading || saving}
                    aria-label={t("admin.enableCashierHistory", "Enable Cashier History")}
                  />
                  <span className="text-sm font-medium">
                    {enableCashierHistory 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Cashier Sales History Days Setting */}
            <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6 ${!enableCashierHistory ? 'opacity-60' : ''}`}>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="cashierSalesHistoryDays"
                >
                  {t("admin.cashierSalesHistoryDays", "Cashier Sales History Days")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t(
                    "admin.cashierSalesHistoryDaysDesc",
                    "Number of previous days the cashier page can fetch sales from (affects performance). Only applies when history is enabled.",
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="cashierSalesHistoryDays"
                    type="number"
                    min={1}
                    max={365}
                    value={cashierSalesHistoryDays}
                    onChange={(e) => setCashierSalesHistoryDays(Number(e.target.value))}
                    className="w-20"
                    disabled={loading || saving || !enableCashierHistory}
                    aria-label={t("admin.cashierSalesHistoryDays", "Cashier Sales History Days")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("admin.days", "days")}
                  </span>
                </div>
              </div>
            </div>

            {/* Enable Completed Services Badge Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 w-full">
                <label
                  className="block text-base font-semibold mb-2"
                  htmlFor="enableCompletedServicesBadge"
                >
                  {t("admin.enableCompletedServicesBadge", "Enable Completed Services Badge")}
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("admin.enableCompletedServicesBadgeDesc", "Show notification badge on cashier menu item when there are completed services")}
                </p>
                <div className="flex items-center gap-3">
                  <Switch
                    id="enableCompletedServicesBadge"
                    checked={enableCompletedServicesBadge}
                    onCheckedChange={(checked) => {
                      setEnableCompletedServicesBadge(checked);
                      // Immediately refresh the context to show/hide badge
                      setTimeout(() => refreshCompletedServicesCount(), 100);
                    }}
                    disabled={loading || saving}
                    aria-label={t("admin.enableCompletedServicesBadge", "Enable Completed Services Badge")}
                  />
                  <span className="text-sm font-medium">
                    {enableCompletedServicesBadge 
                      ? t("admin.enabled", "Enabled") 
                      : t("admin.disabled", "Disabled")
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Categories Requiring Additional Information Setting */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 w-full">
              <label
                className="block text-base font-semibold mb-2"
                htmlFor="categoriesRequiringInfo"
              >
                {t("admin.categoriesRequiringInfo", "Categories Requiring Additional Information")}
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                {t("admin.categoriesRequiringInfoDesc", "Select categories that require additional information before recording a sale and printing a receipt")}
              </p>
              
              {/* Category Selection Dropdown */}
              <div className="space-y-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={loading || saving || allCategories.length === 0}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-left truncate">
                        {categoriesRequiringInfo.length === 0
                          ? t("admin.selectCategories", "Select Categories")
                          : categoriesRequiringInfo.length === 1
                          ? categoriesRequiringInfo[0]
                          : `${categoriesRequiringInfo.length} ${t("admin.categoriesSelected", "categories selected")}`
                        }
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                    {allCategories.length === 0 ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        {t("admin.noCategoriesAvailable", "No categories available")}
                      </div>
                    ) : (
                      allCategories.map((category) => {
                        const isSelected = categoriesRequiringInfo.includes(category.name);
                        return (
                          <DropdownMenuItem
                            key={category.name}
                            onSelect={(e) => {
                              e.preventDefault();
                              if (isSelected) {
                                setCategoriesRequiringInfo(prev => 
                                  prev.filter(name => name !== category.name)
                                );
                              } else {
                                setCategoriesRequiringInfo(prev => 
                                  [...prev, category.name]
                                );
                              }
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                            <span>{category.name}</span>
                          </DropdownMenuItem>
                        );
                      })
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Selected Categories Display */}
                {categoriesRequiringInfo.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">
                      {t("admin.selectedCategories", "Selected Categories")}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoriesRequiringInfo.map((categoryName) => (
                        <span
                          key={categoryName}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary text-sm rounded-md border border-primary/20"
                        >
                          <span>{categoryName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoriesRequiringInfo(prev => 
                                prev.filter(name => name !== categoryName)
                              );
                            }}
                            disabled={loading || saving}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5"
                            aria-label={t("admin.removeCategory", "Remove category")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button and Feedback */}
        <div className="flex flex-col md:flex-row items-center gap-4 pt-6 border-t border-border">
          <Button
            type="submit"
            disabled={loading || saving}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 px-8 py-3 text-base rounded-lg shadow"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("admin.saving", "Saving...")}
              </>
            ) : (
              <>{t("admin.save", "Save Settings")}</>
            )}
          </Button>

          {/* Loading indicator */}
          {loading && (
            <span className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("admin.loading", "Loading settings...")}
            </span>
          )}
        </div>
      </form>
    </section>
  );
};
