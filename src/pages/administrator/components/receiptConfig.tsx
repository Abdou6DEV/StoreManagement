import React, { useEffect, useState } from "react";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Loader2,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  MessageSquare,
} from "lucide-react";

export const ReceiptConfig: React.FC = () => {
  const { t } = useTranslation();
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [footerMessage, setFooterMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.database.options.get("storeName"),
      window.api.database.options.get("storeAddress"),
      window.api.database.options.get("storePhone"),
      window.api.database.options.get("receiptFooterMessage"),
    ])
      .then(([name, address, phone, footer]) => {
        setStoreName(name || "");
        setStoreAddress(address || "");
        setStorePhone(phone || "");
        setFooterMessage(footer || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load receipt settings");
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        window.api.database.options.set("storeName", storeName),
        window.api.database.options.set("storeAddress", storeAddress),
        window.api.database.options.set("storePhone", storePhone),
        window.api.database.options.set("receiptFooterMessage", footerMessage),
      ]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to save receipt settings");
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
          {t("admin.receiptConfig", "Receipt Configuration")}
        </h1>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Name Setting */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <Store className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1 w-full">
            <label
              className="block text-base font-semibold mb-2"
              htmlFor="storeName"
            >
              {t("admin.storeName", "Store Name")}
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "admin.storeNameDesc",
                "The name that appears at the top of receipts"
              )}
            </p>
            <Input
              id="storeName"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.storeNamePlaceholder", "Enter store name")}
              disabled={loading || saving}
              aria-label={t("admin.storeName", "Store Name")}
            />
          </div>
        </div>

        {/* Store Address Setting */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 w-full">
            <label
              className="block text-base font-semibold mb-2"
              htmlFor="storeAddress"
            >
              {t("admin.storeAddress", "Store Address")}
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "admin.storeAddressDesc",
                "The address that appears on receipts"
              )}
            </p>
            <Input
              id="storeAddress"
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.storeAddressPlaceholder", "Enter store address")}
              disabled={loading || saving}
              aria-label={t("admin.storeAddress", "Store Address")}
            />
          </div>
        </div>

        {/* Store Phone Setting */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <Phone className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 w-full">
            <label
              className="block text-base font-semibold mb-2"
              htmlFor="storePhone"
            >
              {t("admin.storePhone", "Phone Number")}
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "admin.storePhoneDesc",
                "The phone number that appears on receipts"
              )}
            </p>
            <Input
              id="storePhone"
              type="text"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.storePhonePlaceholder", "Enter phone number")}
              disabled={loading || saving}
              aria-label={t("admin.storePhone", "Phone Number")}
            />
          </div>
        </div>

        {/* Footer Message Setting */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1 w-full">
            <label
              className="block text-base font-semibold mb-2"
              htmlFor="footerMessage"
            >
              {t("admin.footerMessage", "Footer Message")}
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              {t(
                "admin.footerMessageDesc",
                "Custom message that appears at the bottom of receipts"
              )}
            </p>
            <Input
              id="footerMessage"
              type="text"
              value={footerMessage}
              onChange={(e) => setFooterMessage(e.target.value)}
              className="w-full text-lg"
              placeholder={t("admin.footerMessagePlaceholder", "Enter footer message")}
              disabled={loading || saving}
              aria-label={t("admin.footerMessage", "Footer Message")}
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
  );
};
