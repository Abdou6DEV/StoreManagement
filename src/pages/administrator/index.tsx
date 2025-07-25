import React, { useEffect, useState } from "react";
import { Input } from "../../lib/components/input";
import { Button } from "../../lib/components/button";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Loader2,
  AlertCircle,
  DollarSign,
  Package,
} from "lucide-react";

export default function AdministratorPage() {
  const { t } = useTranslation();
  const [lowStock, setLowStock] = useState(0);
  const [storeCash, setStoreCash] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.database.options.get("lowStockThreshold"),
      window.api.database.options.get("storeCash"),
    ])
      .then(([lowStockVal, storeCashVal]) => {
        setLowStock(lowStockVal ? Number(lowStockVal) : 0);
        setStoreCash(storeCashVal ? Number(storeCashVal) : 0);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        window.api.database.options.set("lowStockThreshold", String(lowStock)),
        window.api.database.options.set("storeCash", String(storeCash)),
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-2 md:px-0">
      <section className="bg-card border border-border rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 space-y-8">
        {/* Header with icon and subtitle */}
        <div className="flex items-center gap-4 border-b border-border pb-5 mb-2">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Shield className="w-7 h-7 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("admin.optionsList", "Options List")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t(
                "admin.settingsDesc",
                "Manage your store's operational settings below.",
              )}
            </p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-0">
          {/* Low Stock Threshold Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-muted/40 border border-border rounded-lg py-6 px-5 mb-6 mt-6">
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
              <p className="text-xs text-muted-foreground mb-3">
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
          {/* Store Cash Setting */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-muted/40 border border-border rounded-lg py-6 px-5 mb-6">
            <div className="p-2 pl bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 w-full">
              <label
                className="block text-base font-semibold mb-2"
                htmlFor="storeCash"
              >
                {t("admin.storeCash", "Store Cash")}
              </label>
              <p className="text-xs text-muted-foreground mb-3">
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
          {/* Save Button and Feedback */}
          <div className="flex flex-col md:flex-row items-center gap-4 pt-6 mt-2 border-t border-border">
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
            {loading && (
              <span className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("admin.loading", "Loading settings...")}
              </span>
            )}
            {success && (
              <span className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <Shield className="w-4 h-4" />
                {t("admin.saved", "Settings saved!")}
              </span>
            )}
            {error && (
              <span className="flex items-center gap-2 text-red-600 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {error}
              </span>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
