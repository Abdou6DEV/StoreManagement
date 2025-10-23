import React, { useEffect, useState } from "react";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { Switch } from "../../../lib/components/switch";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { useCompletedServices } from "../../../lib/contexts/completedServicesContext";
import {
  Shield,
  Loader2,
  AlertCircle,
  DollarSign,
  Package,
  Bell,
  Users,
  ShoppingCart,
  History,
  FileText,
  Wrench,
  CheckSquare,
  Square,
} from "lucide-react";

export const OptionsList: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refreshCompletedServicesCount } = useCompletedServices();
  const [lowStock, setLowStock] = useState(0);
  const [storeCash, setStoreCash] = useState(0);
  const [enableLowStockBadge, setEnableLowStockBadge] = useState(true);
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
      window.api.database.options.get("storeCash"),
      window.api.database.options.get("enableLowStockBadge"),
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
      .then(([lowStockVal, storeCashVal, enableBadgeVal, enableOverdueVal, enableDueSoonVal, enableOverdueBillsVal, enableDueSoonBillsVal, enableOverdueServicesVal, enableDueSoonServicesVal, dueSoonThresholdVal, dueSoonBillsThresholdVal, dueSoonServicesThresholdVal, cashierSalesHistoryDaysVal, enableCashierHistoryVal, enableCompletedServicesBadgeVal, categoriesRequiringInfoVal, categoriesData]) => {
        setLowStock(lowStockVal ? Number(lowStockVal) : 0);
        setStoreCash(storeCashVal ? Number(storeCashVal) : 0);
        setEnableLowStockBadge(enableBadgeVal !== "false"); // Default to true if not set
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
      await Promise.all([
        window.api.database.options.set("lowStockThreshold", String(lowStock)),
        window.api.database.options.set("storeCash", String(storeCash)),
        window.api.database.options.set("enableLowStockBadge", String(enableLowStockBadge)),
        window.api.database.options.set("enableOverduePaymentsBadge", String(enableOverduePaymentsBadge)),
        window.api.database.options.set("enableDueSoonPaymentsBadge", String(enableDueSoonPaymentsBadge)),
        window.api.database.options.set("enableOverdueBillsBadge", String(enableOverdueBillsBadge)),
        window.api.database.options.set("enableDueSoonBillsBadge", String(enableDueSoonBillsBadge)),
        window.api.database.options.set("enableOverdueServicesBadge", String(enableOverdueServicesBadge)),
        window.api.database.options.set("enableDueSoonServicesBadge", String(enableDueSoonServicesBadge)),
        window.api.database.options.set("dueSoonThresholdDays", String(dueSoonThresholdDays)),
        window.api.database.options.set("dueSoonBillsThresholdDays", String(dueSoonBillsThresholdDays)),
        window.api.database.options.set("dueSoonServicesThresholdDays", String(dueSoonServicesThresholdDays)),
        window.api.database.options.set("cashierSalesHistoryDays", String(cashierSalesHistoryDays)),
        window.api.database.options.set("enableCashierHistory", String(enableCashierHistory)),
        window.api.database.options.set("enableCompletedServicesBadge", String(enableCompletedServicesBadge)),
        window.api.database.options.set("categoriesRequiringInfo", JSON.stringify(categoriesRequiringInfo)),
      ]);
      
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
        {/* Store Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t("admin.storeSettings", "Store Settings")}
            </h3>
          </div>

        {/* Store Cash Setting */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 w-full">
            <label
              className="block text-base font-semibold mb-2"
              htmlFor="storeCash"
            >
              {t("admin.storeCash", "Store Cash")}
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              {t("admin.storeCashDesc", "Default cash amount in store")}
            </p>
            <Input
              id="storeCash"
              type="number"
              min={0}
              value={storeCash}
              onChange={(e) => setStoreCash(Number(e.target.value))}
              className="w-40 text-lg"
              disabled={loading || saving}
              aria-label={t("admin.storeCash", "Store Cash")}
            />
          </div>
        </div>
        </div>

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
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-red-600" />
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
        </div>

          {/* Due Soon Payments Threshold Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-red-600" />
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
              <Input
                id="dueSoonThreshold"
                type="number"
                min={1}
                max={30}
                value={dueSoonThresholdDays}
                onChange={(e) => setDueSoonThresholdDays(Number(e.target.value))}
                className="w-40 text-lg"
                disabled={loading || saving}
                aria-label={t("admin.dueSoonThreshold", "Due Soon Payments Threshold (Days)")}
              />
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
          </div>

          {/* Due Soon Bills Threshold Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
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
                  min="1"
                  max="30"
                  value={dueSoonBillsThresholdDays}
                  onChange={(e) => setDueSoonBillsThresholdDays(Number(e.target.value))}
                  disabled={loading || saving}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.days", "days")}
                </span>
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
          </div>

          {/* Due Soon Services Threshold Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600" />
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
                  min="1"
                  max="30"
                  value={dueSoonServicesThresholdDays}
                  onChange={(e) => setDueSoonServicesThresholdDays(Number(e.target.value))}
                  disabled={loading || saving}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {t("admin.days", "days")}
                </span>
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
              <Input
                id="cashierSalesHistoryDays"
                type="number"
                min={1}
                max={365}
                value={cashierSalesHistoryDays}
                onChange={(e) => setCashierSalesHistoryDays(Number(e.target.value))}
                className="w-40 text-lg"
                disabled={loading || saving || !enableCashierHistory}
                aria-label={t("admin.cashierSalesHistoryDays", "Cashier Sales History Days")}
              />
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
              
              {/* Category Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("admin.selectCategories", "Select Categories")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {categoriesRequiringInfo.length} {t("admin.selected", "selected")}
                  </span>
                </div>
                
                {allCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    {t("admin.noCategoriesAvailable", "No categories available")}
                  </div>
                ) : (
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3"
                    onWheel={(e) => {
                      e.currentTarget.scrollTop += e.deltaY;
                      e.preventDefault();
                    }}
                    style={{
                      scrollBehavior: 'smooth',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
                    }}
                  >
                      {allCategories.map((category) => {
                      const isSelected = categoriesRequiringInfo.includes(category.name);
                      return (
                        <button
                          key={category.name}
                          type="button"
                          onClick={() => {
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
                          disabled={loading || saving}
                          className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          } ${loading || saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          <span className="truncate">{category.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {categoriesRequiringInfo.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("admin.selectedCategories", "Selected Categories")}:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {categoriesRequiringInfo.map((categoryName) => (
                        <span
                          key={categoryName}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                        >
                          {categoryName}
                          <button
                            type="button"
                            onClick={() => {
                              setCategoriesRequiringInfo(prev => 
                                prev.filter(name => name !== categoryName)
                              );
                            }}
                            disabled={loading || saving}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                          >
                            ×
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
