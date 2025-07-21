import React, { useEffect, useState } from "react";
import { Input } from "../../lib/components/ui/input";
import { Button } from "../../lib/components/ui/button";
import { useTranslation } from "react-i18next";

export default function AdministratorPage() {
  const { t } = useTranslation();
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.api.database.options.get("lowStockThreshold")
      .then((val) => {
        setLowStock(val ? Number(val) : 0);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load setting");
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await window.api.database.options.set("lowStockThreshold", String(lowStock));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto mt-10 p-6 bg-card rounded-xl border border-border shadow space-y-6">
      <h1 className="text-2xl font-bold mb-4">{t("admin.settings", "Administrator Settings")}</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="lowStock">
            {t("admin.lowStockThreshold", "Low Stock Threshold")}
          </label>
          <Input
            id="lowStock"
            type="number"
            min={0}
            value={lowStock}
            onChange={e => setLowStock(Number(e.target.value))}
            className="w-32"
            disabled={loading || saving}
          />
        </div>
        <Button type="submit" disabled={loading || saving} className="bg-orange-600 hover:bg-orange-700 text-white">
          {saving ? t("admin.saving", "Saving...") : t("admin.save", "Save")}
        </Button>
        {success && <div className="text-green-600 text-sm">{t("admin.saved", "Saved!")}</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>
    </main>
  );
} 