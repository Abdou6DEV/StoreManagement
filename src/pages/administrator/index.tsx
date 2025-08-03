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
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold">
            {t("admin.optionsList", "Options List")}
          </h1>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
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

            {/* Status Messages */}
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
