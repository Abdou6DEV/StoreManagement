import { useState } from "react";
import { useTranslation } from "react-i18next";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Button } from "../../../lib/components/button";
import { Save, X, Loader2, Package } from "lucide-react";
import { useStock } from "../../../lib/contexts/stockContext";
import { BarcodeGeneratorButton } from "./barcodeGeneratorButton";
import { BarcodePrintModal } from "./barcodePrintModal";
import { generateUniqueBarcode, printBarcodeLabel } from "../../../lib/utils/barcodeUtils";

export default function EditStockForm({
  productID,
  setProductID,
}: {
  productID: string | null;
  setProductID: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const { t } = useTranslation();
  const { products, refetchProducts } = useStock();

  const product = products.find((p) => p.id === productID);

  const [loading, setLoading] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [form, setForm] = useState(() => {
    if (!product) return null;
    // Only include editable fields, exclude totalSold and other computed fields
    const { totalSold, ...editableFields } = product;
    return editableFields;
  });

  const handleEditFormChange = (
    key: keyof typeof form,
    value: string | number,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Generate unique EAN-13 barcode for stock items
  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      const existingBarcodes = products.map(p => p.codebar);
      const newBarcode = await generateUniqueBarcode(existingBarcodes);
      setForm(prev => ({ ...prev, codebar: newBarcode }));
    } catch (error) {
      console.error("Error generating barcode:", error);
    } finally {
      setGeneratingBarcode(false);
    }
  };

  // Handle print barcode
  const handlePrintBarcode = () => {
    printBarcodeLabel(form.name, form.selling, form.codebar);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form || !product) return;

    setLoading(true);
    try {
      // Ensure category exists, create if not exists
      await window.api.database.categories.ensure(form.categoryName);

      const { name, categoryName, quantity, bought, selling, codebar } = form;

      await window.api.database.products.update(product.id, {
        name,
        categoryName,
        quantity: Number(quantity),
        bought: Number(bought),
        selling: Number(selling),
        codebar,
      });
      setProductID(null);
    } catch (err) {
      alert("Failed to update product");
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
              onChange={(val) => handleEditFormChange("quantity", val)}
              placeholder={t("stock.quantity")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.bought")}
            </label>
            <StyledNumberInput
              value={form.bought}
              onChange={(val) => handleEditFormChange("bought", val)}
              placeholder={t("stock.bought")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground mb-3">
              {t("stock.selling")}
            </label>
            <StyledNumberInput
              value={form.selling}
              onChange={(val) => handleEditFormChange("selling", val)}
              placeholder={t("stock.selling")}
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
                onChange={(e) => handleEditFormChange("codebar", e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
              />
              <BarcodeGeneratorButton
                codebar={form.codebar}
                onGenerate={handleGenerateBarcode}
                onPrint={() => setShowPrintModal(true)}
                generatingBarcode={generatingBarcode}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-border mt-6">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setProductID(null)}
            className="flex-1"
          >
            <X className="w-4 h-4" />
            {t("stock.cancelButton", "Cancel")}
          </Button>
        </div>
      </form>

      {/* Print Barcode Modal */}
      <BarcodePrintModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        productName={form.name}
        productPrice={form.selling}
        codebar={form.codebar}
        onPrint={handlePrintBarcode}
      />
    </>
  );
}
