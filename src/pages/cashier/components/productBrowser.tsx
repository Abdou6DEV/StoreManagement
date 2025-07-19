import React, { useState, useMemo } from "react";
import type { Product } from "@prisma/client";
import { useTranslation } from "react-i18next";

interface ProductBrowserProps {
  allProducts: Product[];
  onAddSelectedProducts: (selectedProductIds: string[]) => void;
  show: boolean;
  onClose: () => void;
}

const ProductBrowser: React.FC<ProductBrowserProps> = ({
  allProducts,
  onAddSelectedProducts,
  show,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState("");

  const filteredProducts = useMemo(() => {
    let products = allProducts;
    
    if (productFilter) {
      products = allProducts.filter((product) =>
        product.name.toLowerCase().includes(productFilter.toLowerCase())
      );
    }
    
    // Sort products: those without barcode first, then those with barcode
    return products.sort((a, b) => {
      const aHasBarcode = a.codebar && a.codebar.trim() !== '';
      const bHasBarcode = b.codebar && b.codebar.trim() !== '';
      
      if (aHasBarcode && !bHasBarcode) return 1;  // b comes first
      if (!aHasBarcode && bHasBarcode) return -1; // a comes first
      return 0; // both have same barcode status, maintain original order
    });
  }, [allProducts, productFilter]);

  const handleAddSelectedProducts = () => {
    if (selectedProducts.length === 0) return;
    onAddSelectedProducts(selectedProducts);
    setSelectedProducts([]);
    onClose();
  };

  if (!show) return null;

  return (
    <div
      className={`h-full transition-all duration-500 ease-in-out overflow-hidden ${
        show ? "max-h-full" : "max-h-0"
      }`}
    >
      <div className="border border-border rounded-lg p-3 bg-background h-full flex flex-col">
        <input
          type="text"
          placeholder={t("cashier.filterProducts", "Filter products...")}
          className="w-full px-3 py-2 mb-3 rounded-md border border-border bg-card text-foreground"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />

        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => {
                setSelectedProducts((prev) =>
                  prev.includes(product.id)
                    ? prev.filter((id) => id !== product.id)
                    : [...prev, product.id]
                );
              }}
              className={`p-2 border rounded-md h-20 cursor-pointer transition-all flex flex-col ${
                selectedProducts.includes(product.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary"
              }`}
            >
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-sm text-muted-foreground">
                {product.selling.toLocaleString()} DA
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("cashier.stock", "Stock")}: {product.quantity}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddSelectedProducts}
          disabled={selectedProducts.length === 0}
          className={`mt-3 py-2 px-4 rounded-md font-medium ${
            selectedProducts.length === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {t("cashier.addToCart", { count: selectedProducts.length })}
        </button>
      </div>
    </div>
  );
};

export default ProductBrowser; 