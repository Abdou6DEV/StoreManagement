import React, { useEffect, useState } from "react";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import {
  Shield,
  Loader2,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  MessageSquare,
  Eye,
  Plus,
  X,
} from "lucide-react";
import { generateReceiptBarcode } from "../../../lib/utils/barcodeVisual";

export const ReceiptConfig: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [footerMessage, setFooterMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<string>("");
  const [previewOptions, setPreviewOptions] = useState({
    showDiscount: true,
    showCredit: true,
    showVersement: false,
    showClient: true,
  });

  // Generate preview receipt
  const generatePreviewReceipt = () => {
    const sampleCart = [
      { id: "1", name: "Sample Product 1", price: 25.50, qty: 2 },
      { id: "2", name: "Sample Product 2", price: 15.00, qty: 1 },
    ];
    
    const total = sampleCart.reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = previewOptions.showDiscount ? 10 : 0;
    const finalTotal = total - discount;
    const receiptNumber = "PREVIEW-12345678";
    
    // Generate barcode
    const receiptBarcode = generateReceiptBarcode(receiptNumber, {
      format: 'CODE128',
      width: 2.5,
      height: 80,
      displayValue: false,
      fontSize: 12,
      margin: 15,
    });

    const allPhones = [storePhone, ...phoneNumbers].filter(phone => phone.trim() !== "");
    const phoneDisplay = allPhones.length > 0 
      ? allPhones.map(phone => `Phone: ${phone}`).join('<br>')
      : "Phone: +1234567890";

    const storeInfo = {
      name: storeName || "Store Management",
      address: storeAddress ? `Address: ${storeAddress}` : "Address: Your Store Address",
      phone: phoneDisplay,
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt Preview</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
            }
            .receipt {
              width: 80mm;
              max-width: 302px;
              margin: 0 auto;
              background: white;
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
            }
            .store-name {
              font-size: 20px;
              font-weight: 900;
              margin-bottom: 10px;
              color: #000;
              letter-spacing: 0.5px;
            }
            .store-info {
              font-size: 12px;
              margin-bottom: 6px;
              color: #333;
              font-weight: 600;
            }
            .receipt-info {
              font-size: 11px;
              margin-bottom: 10px;
              color: #000;
            }
            .client-info {
              margin-bottom: 10px;
              font-size: 11px;
              color: #000;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 10px 0;
            }
            .items {
              margin-bottom: 10px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 6px;
              font-size: 11px;
              line-height: 1.2;
              min-height: 16px;
            }
            .item-name {
              flex: 1;
              margin-right: 8px;
              word-wrap: break-word;
              word-break: break-word;
              white-space: normal;
              line-height: 1.2;
              color: #000;
            }
            .item-qty {
              text-align: center;
              width: 20px;
              margin-right: 12px;
              font-weight: bold;
              color: #000;
            }
            .item-price {
              text-align: right;
              width: 35px;
              margin-right: 8px;
              color: #000;
            }
            .item-total {
              text-align: right;
              width: 45px;
              font-weight: bold;
              color: #000;
            }
            .items-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 11px;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
              color: #000;
            }
            .header-qty {
              text-align: center;
              width: 20px;
              margin-right: 12px;
            }
            .header-price {
              text-align: right;
              width: 35px;
              margin-right: 8px;
            }
            .header-total {
              text-align: right;
              width: 45px;
            }
            .totals {
              font-size: 12px;
              font-weight: bold;
              color: #000;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .receipt-id {
              text-align: center;
              margin: 8px 0;
              padding: 6px 0;
              border-top: 1px solid #000;
            }
            .receipt-id-text {
              font-size: 10px;
              margin-top: 3px;
              color: #000;
            }
            .welcome {
              text-align: center;
              margin-top: 8px;
              font-size: 12px;
              font-weight: bold;
              color: #000;
            }
            .payment-info {
              margin-top: 10px;
              font-size: 11px;
              color: #000;
            }
            .watermark {
              text-align: center;
              margin-top: 8px;
              padding-top: 4px;
              border-top: 1px dashed #000;
              font-size: 8px;
              color: #000;
              font-weight: bold;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Store Header -->
            <div class="header">
              <div class="store-name">${storeInfo.name}</div>
              <div class="store-info">${storeInfo.address}</div>
              <div class="store-info">${storeInfo.phone}</div>
            </div>

            <!-- Receipt Info -->
            <div class="receipt-info">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
            </div>

            <!-- Client Info -->
            ${previewOptions.showClient ? '<div class="client-info">Client: Sample Customer</div>' : ''}

            <div class="divider"></div>

            <!-- Items -->
            <div class="items">
              <div class="items-header">
                <div class="item-name">ITEM</div>
                <div class="header-qty">QTY</div>
                <div class="header-price">PRICE</div>
                <div class="header-total">TOTAL</div>
              </div>
              ${sampleCart.map(item => `
                <div class="item">
                  <div class="item-name">${item.name}</div>
                  <div class="item-qty">${item.qty}</div>
                  <div class="item-price">${item.price.toLocaleString()}</div>
                  <div class="item-total">${(item.qty * item.price).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>

            <div class="divider"></div>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${total.toLocaleString()} DA</span>
              </div>
              ${discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-${discount.toLocaleString()} DA</span>
                </div>
              ` : ''}
              ${discount > 0 || previewOptions.showCredit || previewOptions.showVersement ? `
                <div class="total-row">
                  <span>New Total:</span>
                  <span>${finalTotal.toLocaleString()} DA</span>
                </div>
              ` : ''}
            </div>

            <!-- Payment Info -->
            ${(previewOptions.showCredit || previewOptions.showVersement) ? `
              <div class="payment-info">
                <div class="divider"></div>
                <div>Payment Type: ${previewOptions.showCredit ? 'Credit' : 'Versement'}</div>
                <div>Amount Paid: 30.00 DA</div>
                <div>Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                <div>Remaining: ${(finalTotal - 30).toLocaleString()} DA</div>
              </div>
            ` : ''}

            <!-- Receipt ID with Barcode -->
            <div class="receipt-id">
              ${receiptBarcode ? `
                <div style="text-align: center; margin-bottom: 8px;">
                  <img src="${receiptBarcode}" alt="Receipt Barcode" style="max-width: 280px; height: 80px;" />
                </div>
              ` : ''}
              <div class="receipt-id-text">ID: ${receiptNumber.substring(0, 8)}</div>
            </div>

            <!-- Welcome Message -->
            <div class="welcome">
              ${footerMessage || "Thank you for your business!"}
            </div>
            
            <!-- Watermark -->
            <div class="watermark">
              <div>Store Management System</div>
              <div>Contact: 0793420745</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Update preview when form values change
  useEffect(() => {
    if (!loading) {
      setPreviewReceipt(generatePreviewReceipt());
    }
  }, [storeName, storeAddress, storePhone, phoneNumbers, footerMessage, loading, previewOptions]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      window.api.database.options.get("storeName"),
      window.api.database.options.get("storeAddress"),
      window.api.database.options.get("storePhone"),
      window.api.database.options.get("storePhoneNumbers"),
      window.api.database.options.get("receiptFooterMessage"),
    ])
      .then(([name, address, phone, phones, footer]) => {
        setStoreName(name || "");
        setStoreAddress(address || "");
        setStorePhone(phone || "");
        setPhoneNumbers(phones ? JSON.parse(phones) : []);
        setFooterMessage(footer || "");
        setLoading(false);
      })
      .catch(() => {
        showToast(t("admin.loadError", "Failed to load receipt settings"), "error");
        setLoading(false);
      });
  }, []);

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ""]);
  };

  const removePhoneNumber = (index: number) => {
    setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        window.api.database.options.set("storeName", storeName),
        window.api.database.options.set("storeAddress", storeAddress),
        window.api.database.options.set("storePhone", storePhone),
        window.api.database.options.set("storePhoneNumbers", JSON.stringify(phoneNumbers)),
        window.api.database.options.set("receiptFooterMessage", footerMessage),
      ]);
      showToast(t("admin.receiptSaved", "Receipt settings saved successfully!"), "success");
    } catch {
      showToast(t("admin.receiptSaveError", "Failed to save receipt settings"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left Side - Configuration Form */}
      <section className="w-2/3 bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-orange-500" />
          <h1 className="text-2xl font-bold">
            {t("admin.receiptConfig", "Receipt Configuration")}
          </h1>
        </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Grid Layout for Store Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Name Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <label
                  className="block text-base font-semibold"
                  htmlFor="storeName"
                >
                  {t("admin.storeName", "Store Name")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storeNameDesc",
                    "The name that appears at the top of receipts"
                  )}
                </p>
              </div>
            </div>
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

          {/* Store Address Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <label
                  className="block text-base font-semibold"
                  htmlFor="storeAddress"
                >
                  {t("admin.storeAddress", "Store Address")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storeAddressDesc",
                    "The address that appears on receipts"
                  )}
                </p>
              </div>
            </div>
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

          {/* Store Phone Numbers Setting */}
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <label className="block text-base font-semibold">
                  {t("admin.storePhones", "Phone Numbers")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.storePhonesDesc",
                    "Phone numbers that appear on receipts"
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhoneNumber}
                disabled={loading || saving}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
{t("admin.addPhone", "Add Phone")}
              </Button>
            </div>
            
            {/* Primary Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("admin.primaryPhone", "Primary Phone")}
              </label>
              <Input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full text-lg"
                placeholder={t("admin.primaryPhonePlaceholder", "Enter primary phone number")}
                disabled={loading || saving}
                aria-label="Primary Phone Number"
              />
            </div>

            {/* Additional Phone Numbers */}
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  className="flex-1 text-lg"
                  placeholder={t("admin.additionalPhonePlaceholder", "Additional phone") + ` ${index + 1}`}
                  disabled={loading || saving}
                  aria-label={`Additional phone number ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removePhoneNumber(index)}
                  disabled={loading || saving}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Message Setting - Full Width */}
        <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <label
                className="block text-base font-semibold"
                htmlFor="footerMessage"
              >
                {t("admin.footerMessage", "Footer Message")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "admin.footerMessageDesc",
                  "Custom message that appears at the bottom of receipts"
                )}
              </p>
            </div>
          </div>
          <textarea
            id="footerMessage"
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            className="w-full text-lg p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t("admin.footerMessagePlaceholder", "Enter footer message")}
            disabled={loading || saving}
            rows={3}
            aria-label={t("admin.footerMessage", "Footer Message")}
          />
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

      {/* Right Side - Live Preview */}
      <section className="w-1/3 bg-card border border-border rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Eye className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold">
            {t("admin.receiptPreview", "Live Preview")}
          </h2>
        </div>
        
        <div className="h-full rounded-lg overflow-auto flex flex-col">
          <div className="flex justify-center">
            {previewReceipt ? (
              <div className="w-fit">
                <iframe
                  srcDoc={previewReceipt}
                  className="border border-border rounded-lg"
                  title="Receipt Preview"
                  style={{ 
                    width: '400px', 
                    height: '600px',
                    transform: 'scale(0.9)', 
                    transformOrigin: 'top center' 
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading preview...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Preview Options */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t("admin.previewOptions", "Preview Options")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewOptions.showClient}
                  onChange={(e) => setPreviewOptions(prev => ({ ...prev, showClient: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">{t("admin.showClient", "Show Client")}</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewOptions.showDiscount}
                  onChange={(e) => setPreviewOptions(prev => ({ ...prev, showDiscount: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">{t("admin.showDiscount", "Show Discount")}</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewOptions.showCredit}
                  onChange={(e) => {
                    setPreviewOptions(prev => ({ 
                      ...prev, 
                      showCredit: e.target.checked,
                      showVersement: e.target.checked ? false : prev.showVersement
                    }));
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{t("admin.showCredit", "Show Credit")}</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewOptions.showVersement}
                  onChange={(e) => {
                    setPreviewOptions(prev => ({ 
                      ...prev, 
                      showVersement: e.target.checked,
                      showCredit: e.target.checked ? false : prev.showCredit
                    }));
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{t("admin.showVersement", "Show Versement")}</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
