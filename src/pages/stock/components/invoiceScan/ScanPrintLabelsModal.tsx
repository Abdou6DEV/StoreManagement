import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Printer } from "lucide-react";
import { Modal } from "../../../../lib/components/modal";
import { Button } from "../../../../lib/components/button";
import { Checkbox } from "../../../../lib/components/checkbox";
import { Tooltip } from "../../../../lib/components/tooltip";
import StyledNumberInput from "../../../../lib/components/inputNumber";
import { useToast } from "../../../../lib/contexts/toastContext";
import { cn } from "../../../../lib/utils";
import { printBarcodeLabel, type LabelSize } from "../addStockForm/barcodePrintUtils";

export type ScanLabelItem = {
  key: string;
  productName: string;
  sellingPrice: number;
  codebar: string;
  quantity: number;
};

const SHOW_BARCODE_CACHE_KEY = "barcodePreview_showBarcode";
const SHOW_STORE_NAME_CACHE_KEY = "barcodePreview_showStoreName";
const LABEL_SIZE_CACHE_KEY = "barcodePreview_labelSize";
const VALID_LABEL_SIZES: LabelSize[] = ["20x40", "35x45", "25x50"];

const compactNumberClass =
  "h-8 w-full rounded-md border border-border bg-card px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50";

type Row = ScanLabelItem & {
  selected: boolean;
  copies: number | "";
};

export async function hasAnyLabelPrinter(): Promise<boolean> {
  const [p20, p35, p25, legacy] = await Promise.all([
    window.api?.database?.options?.get?.("labelPrinterName_20x40"),
    window.api?.database?.options?.get?.("labelPrinterName_35x45"),
    window.api?.database?.options?.get?.("labelPrinterName_25x50"),
    window.api?.database?.options?.get?.("labelPrinterName"),
  ]);
  return [p20, p35, p25, legacy].some((name) => (name ?? "").trim() !== "");
}

function readLabelSize(): LabelSize {
  const cached = localStorage.getItem(LABEL_SIZE_CACHE_KEY);
  return cached && VALID_LABEL_SIZES.includes(cached as LabelSize)
    ? (cached as LabelSize)
    : "20x40";
}

export default function ScanPrintLabelsModal({
  open,
  items,
  onDone,
}: {
  open: boolean;
  items: ScanLabelItem[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [rows, setRows] = useState<Row[]>([]);
  const [bulkCopies, setBulkCopies] = useState<number | "">(1);
  const [printing, setPrinting] = useState(false);
  const [showBarcode, setShowBarcode] = useState(() => {
    const cached = localStorage.getItem(SHOW_BARCODE_CACHE_KEY);
    return cached !== null ? cached === "true" : true;
  });
  const [showStoreName, setShowStoreName] = useState(() => {
    const cached = localStorage.getItem(SHOW_STORE_NAME_CACHE_KEY);
    return cached !== null ? cached === "true" : true;
  });
  const [labelSize, setLabelSize] = useState<LabelSize>(readLabelSize);
  const [storeName, setStoreName] = useState("");
  const [storeNameFetched, setStoreNameFetched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(
      items.map((item) => ({
        ...item,
        selected: true,
        copies: Math.max(1, item.quantity),
      })),
    );
    setBulkCopies(1);
    setPrinting(false);
    setLabelSize(readLabelSize());
    const barcodePref = localStorage.getItem(SHOW_BARCODE_CACHE_KEY);
    const preferBarcode = barcodePref !== null ? barcodePref === "true" : true;
    setShowBarcode(preferBarcode && items.some((item) => item.codebar.trim() !== ""));
    const storePref = localStorage.getItem(SHOW_STORE_NAME_CACHE_KEY);
    setShowStoreName(storePref !== null ? storePref === "true" : true);
    setStoreNameFetched(false);
    void window.api?.database?.options?.get?.("storeName").then((name: string | undefined) => {
      setStoreName(name ?? "");
      setStoreNameFetched(true);
    });
  }, [open, items]);

  const hasStoreName = storeName.trim() !== "";
  const anyBarcode = items.some((item) => item.codebar.trim() !== "");

  useEffect(() => {
    if (storeNameFetched && !hasStoreName && showStoreName) setShowStoreName(false);
  }, [storeNameFetched, hasStoreName, showStoreName]);

  const selectedRows = rows.filter((row) => row.selected);
  const totalLabels = selectedRows.reduce((sum, row) => {
    const copies = typeof row.copies === "number" ? row.copies : 0;
    return sum + Math.max(0, Math.floor(copies));
  }, 0);

  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const applyCopiesToSelected = () => {
    const copies = typeof bulkCopies === "number" && bulkCopies > 0 ? Math.floor(bulkCopies) : 1;
    setRows((current) =>
      current.map((row) => (row.selected ? { ...row, copies } : row)),
    );
  };

  const resetCopiesToAddedQty = () => {
    setRows((current) =>
      current.map((row) => ({ ...row, copies: Math.max(1, row.quantity) })),
    );
  };

  const copiesDifferFromAddedQty = rows.some(
    (row) => (typeof row.copies === "number" ? row.copies : 0) !== Math.max(1, row.quantity),
  );

  const handleShowBarcodeChange = (checked: boolean) => {
    setShowBarcode(checked);
    localStorage.setItem(SHOW_BARCODE_CACHE_KEY, String(checked));
  };

  const handleShowStoreNameChange = (checked: boolean) => {
    setShowStoreName(checked);
    localStorage.setItem(SHOW_STORE_NAME_CACHE_KEY, String(checked));
  };

  const handleLabelSizeChange = (size: LabelSize) => {
    setLabelSize(size);
    localStorage.setItem(LABEL_SIZE_CACHE_KEY, size);
  };

  const handlePrint = async () => {
    const toPrint = selectedRows.filter((row) => typeof row.copies === "number" && row.copies > 0);
    if (toPrint.length === 0) return;
    setPrinting(true);
    try {
      for (const row of toPrint) {
        const copies = Math.max(1, Math.floor(row.copies as number));
        const hasCode = row.codebar.trim() !== "";
        await printBarcodeLabel(
          {
            productName: row.productName,
            price: row.sellingPrice,
            barcode: row.codebar,
          },
          copies,
          showBarcode && hasCode,
          showStoreName && hasStoreName,
          undefined,
          labelSize,
        );
      }
      showToast(
        t("stock.invoiceScan.printLabelsDone", "Labels sent to the printer."),
        "success",
      );
      onDone();
    } catch {
      showToast(t("stock.barcodePrintError", "Failed to print barcode"), "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next && !printing) onDone();
      }}
      title={t("stock.invoiceScan.printLabelsTitle", "Print labels")}
      subtitle={t(
        "stock.invoiceScan.printLabelsHint",
        "Stock was added. Choose which labels to print, then skip or print.",
      )}
      size="xl"
      showFooter={false}
      preventClose={printing}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <div className="grid min-h-0 grid-cols-1 gap-4 lg:h-[min(28rem,52dvh)] lg:grid-cols-[18.75rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("stock.invoiceScan.labelContent", "On the label")}
              </h3>
              <div className="space-y-2">
                <OptionCheck
                  enabled={anyBarcode}
                  checked={showBarcode}
                  onChange={handleShowBarcodeChange}
                  label={t("stock.showBarcode", "Show Barcode")}
                  disabledReason={t(
                    "stock.invoiceScan.noBarcodeOnLabel",
                    "No barcode — name and price only",
                  )}
                />
                <OptionCheck
                  enabled={hasStoreName}
                  checked={showStoreName}
                  onChange={handleShowStoreNameChange}
                  label={t("stock.showStoreNameOnLabel", "Show store name on label")}
                  disabledReason={t(
                    "stock.storeNameRequiredForLabelTooltip",
                    "Enter the store name in Admin → Receipt & Service Ticket to show it on labels.",
                  )}
                />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("stock.labelSize", "Label size")}
              </h3>
              <div className="flex flex-col gap-2">
                {VALID_LABEL_SIZES.map((size) => (
                  <Checkbox
                    key={size}
                    checked={labelSize === size}
                    onChange={(checked) => checked && handleLabelSizeChange(size)}
                    label={`${size.replace("x", "×")} mm`}
                    color="green"
                  />
                ))}
              </div>
            </section>

            <section className="mt-auto space-y-2 border-t border-border pt-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("stock.invoiceScan.copiesForAll", "Copies for all selected")}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-20">
                  <StyledNumberInput
                    value={bulkCopies}
                    onChange={setBulkCopies}
                    min={1}
                    max={999}
                    className={compactNumberClass}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={selectedRows.length === 0}
                  onClick={applyCopiesToSelected}
                >
                  {t("stock.invoiceScan.applyCopies", "Apply")}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                disabled={!copiesDifferFromAddedQty}
                onClick={resetCopiesToAddedQty}
              >
                {t("stock.invoiceScan.resetCopies", "Reset to added qty")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("stock.invoiceScan.labelsToPrint", "{{count}} labels to print", {
                  count: totalLabels,
                })}
              </p>
            </section>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
              <h3 className="text-sm font-medium">
                {t("stock.invoiceScan.printLabelsProducts", "Products")}
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {selectedRows.length}/{rows.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-muted text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="w-10 px-2.5 py-1.5 text-start font-medium">
                      <Checkbox
                        checked={allSelected}
                        onChange={(checked) =>
                          setRows((current) =>
                            current.map((row) => ({ ...row, selected: checked })),
                          )
                        }
                        color="green"
                      />
                    </th>
                    <th className="px-2.5 py-1.5 text-start font-medium">
                      {t("stock.invoiceScan.productName", "Product name")}
                    </th>
                    <th className="w-16 px-2.5 py-1.5 text-end font-medium">
                      {t("stock.quantity", "Quantity")}
                    </th>
                    <th className="w-24 px-2.5 py-1.5 text-end font-medium">
                      {t("stock.invoiceScan.printCopies", "Labels")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const nameCell = (
                      <span
                        className={cn(
                          "block truncate font-medium",
                          !row.selected && "text-muted-foreground",
                        )}
                      >
                        {row.productName}
                      </span>
                    );
                    return (
                      <tr key={row.key} className={!row.selected ? "opacity-60" : undefined}>
                        <td className="border-t border-border px-2.5 py-1">
                          <Checkbox
                            checked={row.selected}
                            onChange={(checked) => updateRow(row.key, { selected: checked })}
                            color="green"
                          />
                        </td>
                        <td className="border-t border-border px-2.5 py-1">
                          {!row.codebar.trim() ? (
                            <Tooltip
                              content={t(
                                "stock.invoiceScan.noBarcodeOnLabel",
                                "No barcode — name and price only",
                              )}
                              position="top"
                            >
                              {nameCell}
                            </Tooltip>
                          ) : (
                            nameCell
                          )}
                        </td>
                        <td className="border-t border-border px-2.5 py-1 text-end tabular-nums text-muted-foreground">
                          {row.quantity}
                        </td>
                        <td className="border-t border-border px-2.5 py-1">
                          <div className="ms-auto w-[4.5rem]">
                            <StyledNumberInput
                              value={row.copies}
                              onChange={(copies: number | "") => updateRow(row.key, { copies })}
                              min={1}
                              max={999}
                              disabled={!row.selected}
                              className={compactNumberClass}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2">
          <Button type="button" variant="outline" disabled={printing} onClick={onDone}>
            {t("stock.invoiceScan.skipLabels", "Skip")}
          </Button>
          <Button
            type="button"
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={printing || totalLabels <= 0}
            onClick={() => void handlePrint()}
          >
            {printing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {printing
              ? t("stock.invoiceScan.printingLabels", "Printing…")
              : `${t("stock.printBarcode", "Print")}${totalLabels > 0 ? ` (${totalLabels})` : ""}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function OptionCheck({
  enabled,
  checked,
  onChange,
  label,
  disabledReason,
}: {
  enabled: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabledReason: string;
}) {
  const box = (
    <Checkbox
      checked={enabled ? checked : false}
      onChange={enabled ? onChange : () => undefined}
      label={label}
      color="green"
      disabled={!enabled}
    />
  );
  if (enabled) return box;
  return (
    <Tooltip content={disabledReason} position="top">
      <span className="inline-flex">{box}</span>
    </Tooltip>
  );
}
