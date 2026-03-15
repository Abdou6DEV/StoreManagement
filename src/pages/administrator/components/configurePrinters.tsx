import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import { Button } from "../../../lib/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../lib/components/select";
import { Printer, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type PrinterInfo = { name: string; displayName: string; status: number };

export function ConfigurePrinters() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const initialPrintersRef = useRef<{ receipt: string; label: string } | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receiptPrinterName, setReceiptPrinterName] = useState("");
  const [labelPrinterName, setLabelPrinterName] = useState("");

  const loadPrinters = async () => {
    if (typeof window.api?.app?.getPrinters !== "function") {
      setPrinters([]);
      setLoading(false);
      return;
    }
    try {
      const list = await window.api.app.getPrinters();
      setPrinters(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("getPrinters failed", e);
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [receipt, label] = await Promise.all([
        window.api.database.options.get("receiptPrinterName"),
        window.api.database.options.get("labelPrinterName"),
      ]);
      setReceiptPrinterName(receipt || "");
      setLabelPrinterName(label || "");
      initialPrintersRef.current = { receipt: receipt || "", label: label || "" };
    } catch {
      setReceiptPrinterName("");
      setLabelPrinterName("");
      initialPrintersRef.current = null;
    }
  };

  useEffect(() => {
    loadPrinters();
    loadOptions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        window.api.database.options.set("receiptPrinterName", receiptPrinterName),
        window.api.database.options.set("labelPrinterName", labelPrinterName),
      ]);
      const initial = initialPrintersRef.current;
      const changeLines: string[] = [];
      if (initial) {
        if (initial.receipt !== receiptPrinterName) {
          changeLines.push(`receipt.receiptPrinterName: ${initial.receipt || "(none)"} → ${receiptPrinterName || "(none)"}`);
        }
        if (initial.label !== labelPrinterName) {
          changeLines.push(`receipt.labelPrinterName: ${initial.label || "(none)"} → ${labelPrinterName || "(none)"}`);
        }
      }
      if (changeLines.length > 0) {
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.printersConfigUpdated",
          details: changeLines.join("\n"),
        }).catch(() => {});
      }
      initialPrintersRef.current = { receipt: receiptPrinterName, label: labelPrinterName };
      showToast(t("admin.printersSaved", "Printer settings saved"), "success");
    } catch {
      showToast(t("admin.printersSaveError", "Failed to save printer settings"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Windows: PRINTER_STATUS_OFFLINE=0x80, NOT_AVAILABLE=0x1000, ERROR=0x02. Electron may return 0 for all (OS bug); Refresh helps get updated list.
  const isPrinterConnected = (name: string) => {
    if (!name) return false;
    const found = printers.find((p) => p.name === name);
    if (!found) return false;
    const s = found.status;
    if (s === 0) return true;
    const OFFLINE = 0x80;
    const NOT_AVAILABLE = 0x1000;
    const ERROR = 0x02;
    return !(s & OFFLINE) && !(s & NOT_AVAILABLE) && !(s & ERROR);
  };

  const receiptConnected = isPrinterConnected(receiptPrinterName);
  const labelConnected = isPrinterConnected(labelPrinterName);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-muted-foreground flex-1 min-w-0">
          {t(
            "admin.configurePrintersDesc",
            "Choose which printer to use for receipts and service tickets, and which for barcode labels. The app will remember your choice."
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            loadPrinters();
          }}
          disabled={loading}
          className="flex items-center gap-2 shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t("admin.refreshPrinters", "Refresh")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("admin.refreshPrintersHint", "Click Refresh after turning a printer on or off to update connection status.")}
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Printer className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <label className="block text-base font-semibold">
                  {t("admin.receiptAndServiceTicketPrinter", "Receipt & Service Ticket printer")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t("admin.receiptPrinterDesc", "Printer for receipts and service tickets")}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("admin.loadingPrinters", "Loading printers...")}</span>
              </div>
            ) : (
              <>
                <Select value={receiptPrinterName || "_none"} onValueChange={(v) => setReceiptPrinterName(v === "_none" ? "" : v)}>
                  <SelectTrigger className="w-full text-foreground" aria-label={t("admin.receiptAndServiceTicketPrinter", "Receipt & Service Ticket printer")}>
                    <SelectValue placeholder={t("admin.noPrinter", "Aucune imprimante")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("admin.noPrinter", "Aucune imprimante")}</SelectItem>
                    {printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm">
                  {!receiptPrinterName ? (
                    <span className="text-amber-600">{t("admin.notChosen", "Not chosen")}</span>
                  ) : receiptConnected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">{t("admin.connected", "Connected")}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">{t("admin.disconnected", "Disconnected")}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 bg-muted/40 border border-border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Printer className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <label className="block text-base font-semibold">
                  {t("admin.labelPrinter", "Label printer")}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t("admin.labelPrinterDesc", "Printer for barcode labels")}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("admin.loadingPrinters", "Loading printers...")}</span>
              </div>
            ) : (
              <>
                <Select value={labelPrinterName || "_none"} onValueChange={(v) => setLabelPrinterName(v === "_none" ? "" : v)}>
                  <SelectTrigger className="w-full text-foreground" aria-label={t("admin.labelPrinter", "Label printer")}>
                    <SelectValue placeholder={t("admin.noPrinter", "Aucune imprimante")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t("admin.noPrinter", "Aucune imprimante")}</SelectItem>
                    {printers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.displayName || p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm">
                  {!labelPrinterName ? (
                    <span className="text-amber-600">{t("admin.notChosen", "Not chosen")}</span>
                  ) : labelConnected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">{t("admin.connected", "Connected")}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">{t("admin.disconnected", "Disconnected")}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 px-8 py-3 text-base rounded-lg shadow"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("admin.saving", "Saving...")}
              </>
            ) : (
              t("admin.save", "Save Settings")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
