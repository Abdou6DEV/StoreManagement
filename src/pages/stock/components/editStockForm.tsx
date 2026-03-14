import { useState } from "react";
import { useTranslation } from "react-i18next";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Button } from "../../../lib/components/button";
import { Save, X, Loader2, Package, QrCode, Eye, Printer } from "lucide-react";
import { useStock } from "../../../lib/contexts/stockContext";
import { ImageUpload } from "../../../lib/components/imageUpload";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import { BarcodePreviewModal } from "./addStockForm/BarcodePreviewModal";
import { printBarcodeLabel } from "./addStockForm/barcodePrintUtils";
import { Tooltip } from "../../../lib/components/tooltip";

export default function EditStockForm({
  productID,
  setProductID,
}: {
  productID: string | null;
  setProductID: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products, refetchProducts } = useStock();
  const { showToast } = useToast();

  const product = products.find((p) => p.id === productID);

  const [loading, setLoading] = useState(false);
  const [showBarcodePreviewModal, setShowBarcodePreviewModal] = useState(false);
  const [form, setForm] = useState(() => {
    if (!product) return null;
    // Only include editable fields, exclude totalSold and other computed fields
    const { totalSold, ...editableFields } = product;
    return editableFields;
  });

  const handleEditFormChange = (
    key: keyof typeof form,
    value: string | number | string | null,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBarcodeAction = async () => {
    if (!form) return;
    
    if (form.codebar && form.codebar.trim()) {
      // Show preview modal if barcode exists
      setShowBarcodePreviewModal(true);
    } else {
      // Generate new barcode if input is empty
      try {
        const barcode = await window.api.database.products.generateUniqueBarcode();
        handleEditFormChange("codebar", barcode);
        showToast(t("stock.barcodeGenerated", "Barcode generated successfully"), "success");
      } catch (error) {
        showToast(t("stock.barcodeGenerationError", "Failed to generate barcode"), "error");
      }
    }
  };

  const handlePrintBarcode = async (
    quantity: number = 1,
    showBarcode: boolean = true,
    showStoreName: boolean = true,
    showPreviousPrice: boolean = false
  ) => {
    if (!form || !product) return;

    try {
      const shouldShowBarcode = showBarcode === true;
      const shouldShowStoreName = showStoreName === true;
      const previousPrice =
        showPreviousPrice && form.sellingPrice !== product.sellingPrice ? product.sellingPrice : undefined;
      await printBarcodeLabel(
        {
          productName: form.name,
          price: form.sellingPrice,
          barcode: form.codebar || "",
        },
        quantity,
        shouldShowBarcode,
        shouldShowStoreName,
        showPreviousPrice ? previousPrice : undefined
      );
      showToast(t("stock.barcodePrinted", "Barcode printed successfully"), "success");
    } catch (error) {
      showToast(t("stock.barcodePrintError", "Failed to print barcode"), "error");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !product) return;

    setLoading(true);
    try {
      // Ensure category exists, create if not exists
      await window.api.database.categories.ensure(form.categoryName);

      const {
        name,
        categoryName,
        quantity,
        boughtPrice,
        sellingPrice,
        codebar,
        photo,
      } = form;

      await window.api.database.products.update(product.id, {
        name,
        categoryName,
        quantity: Number(quantity),
        boughtPrice: Number(boughtPrice),
        sellingPrice: Number(sellingPrice),
        codebar,
        photo,
      }, user?.username ?? "unknown");
      const changeLines: string[] = [];
      if (String(name) !== String(product.name)) changeLines.push(`Name: ${product.name ?? ""} → ${name ?? ""}`);
      if (String(categoryName) !== String(product.categoryName ?? "")) changeLines.push(`Category: ${product.categoryName ?? ""} → ${categoryName ?? ""}`);
      if (Number(quantity) !== Number(product.quantity)) changeLines.push(`Quantity: ${product.quantity} → ${quantity}`);
      if (Number(boughtPrice) !== Number(product.boughtPrice ?? 0)) changeLines.push(`Bought price: ${product.boughtPrice ?? 0} → ${boughtPrice}`);
      if (Number(sellingPrice) !== Number(product.sellingPrice)) changeLines.push(`Selling price: ${product.sellingPrice} → ${sellingPrice}`);
      if ((codebar ?? "") !== (product.codebar ?? "")) changeLines.push(`Barcode: ${product.codebar ?? ""} → ${codebar ?? ""}`);
      const detailsStr = changeLines.length > 0
        ? `Product: ${name}\n${changeLines.join("\n")}`
        : `Product: ${name}`;
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.productUpdated",
        details: detailsStr,
      }).catch(() => {});
      showToast(
        t("stock.toastUpdateSuccess", "Product updated successfully!"),
        "success",
      );
      setProductID(null);
    } catch (err) {
      // Handle barcode conflict specifically
      if (err instanceof Error && err.message.includes("already exists")) {
        showToast(
          t("stock.barcodeExists", `Barcode conflict: ${err.message}`),
          "error"
        );
      } else {
        showToast(
          t("stock.toastUpdateError", "Failed to update product"),
          "error",
        );
      }
    } finally {
      setLoading(false);
      refetchProducts();
    }
  };

  if (!form || !product) {
    return null;
  }

  return (
    <>
      <form onSubmit={handleUpdateProduct} className="p-6 pt-0 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              {t("stock.product")}
            </label>
            <input
              type="text"
              placeholder={t("stock.product")}
              value={form.name}
              onChange={(e) => handleEditFormChange("name", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
              required
            />
          </div>

          <div className="space-y-3 relative">
            <label className="text-sm font-medium text-foreground">
              {t("stock.type")}
            </label>
            <input
              type="text"
              placeholder={t("stock.type")}
              value={form.categoryName}
              onChange={(e) =>
                handleEditFormChange("categoryName", e.target.value)
              }
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.quantity")}
            </label>
            <StyledNumberInput
              value={form.quantity}
              onChange={(val: number | "") => handleEditFormChange("quantity", val)}
              placeholder={t("stock.quantity")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.boughtPrice")}
            </label>
            <StyledNumberInput
              value={form.boughtPrice}
              onChange={(val: number | "") => handleEditFormChange("boughtPrice", val)}
              placeholder={t("stock.boughtPrice")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground mb-3">
              {t("stock.sellingPrice")}
            </label>
            <StyledNumberInput
              value={form.sellingPrice}
              onChange={(val: number | "") => handleEditFormChange("sellingPrice", val)}
              placeholder={t("stock.sellingPrice")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.codebar")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t("stock.codebar")}
                value={form.codebar}
                onChange={(e) =>
                  handleEditFormChange("codebar", e.target.value)
                }
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
              />
              <Tooltip
                content={
                  form.codebar && form.codebar.trim()
                    ? t("stock.previewBarcodeLabelTooltip", "Preview barcode label")
                    : t("stock.generateBarcodeTooltip", "Generate a new unique barcode")
                }
                position="top"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBarcodeAction}
                  className="shrink-0 h-12 px-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {form.codebar && form.codebar.trim() 
                        ? t("stock.previewBarcode", "Preview")
                        : t("stock.generateBarcode", "Generate")
                      }
                    </span>
                    {form.codebar && form.codebar.trim() ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                  </div>
                </Button>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.photo", "Product Photo")}
            </label>
            <ImageUpload
              value={form.photo}
              onChange={(value) => handleEditFormChange("photo", value)}
              placeholder={t("stock.uploadPhoto")}
              maxWidth={200}
              maxHeight={200}
              quality={0.8}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-6 border-t border-border mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("stock.updating", "Updating...")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("stock.updateButton", "Update Product")}
              </>
            )}
          </Button>
          <Tooltip
            content={
              form.name?.trim()
                ? t("stock.printBarcodeTooltip", "Print barcode label(s)")
                : t("stock.productNameRequiredForLabel", "Product name is required to print a label")
            }
            position="top"
          >
            <Button
              type="button"
              disabled={!form.name?.trim()}
              onClick={() => setShowBarcodePreviewModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:pointer-events-none"
            >
              <Printer className="w-4 h-4 mr-2" />
              {t("stock.printLabel", "Print Label")}
            </Button>
          </Tooltip>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProductID(null)}
            className="w-full"
          >
            <X className="w-4 h-4" />
            {t("stock.cancelButton", "Cancel")}
          </Button>
        </div>
      </form>

      {/* Barcode Preview Modal */}
      <BarcodePreviewModal
        open={showBarcodePreviewModal}
        onOpenChange={setShowBarcodePreviewModal}
        productName={form.name}
        price={form.sellingPrice}
        previousPrice={form.sellingPrice !== product.sellingPrice ? product.sellingPrice : undefined}
        barcode={form.codebar || ""}
        onPrint={handlePrintBarcode}
      />
    </>
  );
}
