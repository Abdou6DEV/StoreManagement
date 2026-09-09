import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import SellerSelection from "./SellerSelection";

const safeMultiply = (a: number, b: number): number => {
  return parseFloat((a * b).toFixed(2));
};

interface PendingProduct {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
  sellerId: string;
  photo: string | null;
  isNewProduct: boolean;
  existingProductId?: string;
  originalBoughtPrice?: number;
  priceStrategy?: "weighted" | "new";
}

interface Seller {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface PendingProductsListProps {
  pendingProducts: PendingProduct[];
  removePendingProduct: (id: string) => void;
  multiSellerId: string;
  setMultiSellerId: (sellerId: string) => void;
  multiSellerName: string;
  setMultiSellerName: (sellerName: string) => void;
  sellers: Seller[];
  finishingPurchase: boolean;
  onFinishPurchase: () => void;
}

export default function PendingProductsList({
  pendingProducts,
  removePendingProduct,
  multiSellerId,
  setMultiSellerId,
  multiSellerName,
  setMultiSellerName,
  sellers,
  finishingPurchase,
  onFinishPurchase,
}: PendingProductsListProps) {
  const { t } = useTranslation();
  const currency = t("cashier.currency");

  const [showSellerDropdown, setShowSellerDropdown] = React.useState(false);
  const [filteredSellers, setFilteredSellers] = React.useState(sellers);
  const [dropdownSellerSearch, setDropdownSellerSearch] = React.useState("");

  React.useEffect(() => {
    setFilteredSellers(sellers);
  }, [sellers]);

  const sellerForm = {
    sellerId: multiSellerId,
    sellerName: multiSellerName,
  };

  const totalValue = Math.round(
    pendingProducts.reduce(
      (sum, p) => sum + safeMultiply(p.quantity, p.boughtPrice),
      0,
    ),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {t("stock.pendingProducts", "Products in Purchase")}
          <span className="ml-2 font-normal text-muted-foreground">
            ({pendingProducts.length})
          </span>
        </h3>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Column headers — desktop */}
        <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_6.5rem_4.5rem_7rem_6.5rem_2.5rem] md:items-center md:gap-3">
          <span>{t("stock.product", "Product Name")}</span>
          <span>{t("stock.category", "Category")}</span>
          <span className="text-right">{t("stock.boughtPrice", "Bought Price")}</span>
          <span className="text-right">{t("cashier.qty", "Qty")}</span>
          <span className="text-right">{t("stock.lineTotal", "Line Total")}</span>
          <span className="text-right">{t("stock.sellingPrice", "Selling Price")}</span>
          <span className="sr-only">{t("common.actions", "Actions")}</span>
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {pendingProducts.map((product) => {
            const cost = Math.round(Number(product.boughtPrice));
            const selling = Math.round(Number(product.sellingPrice || 0));
            const lineTotal = Math.round(
              safeMultiply(product.quantity, product.boughtPrice),
            );
            const isLoss =
              product.sellingPrice > 0 &&
              product.sellingPrice < product.boughtPrice;

            return (
              <div
                key={product.id}
                className="border-b border-border px-4 py-2.5 last:border-b-0 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_6.5rem_4.5rem_7rem_6.5rem_2.5rem] md:items-center md:gap-3"
              >
                {/* Product */}
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[15px] font-medium leading-snug text-foreground">
                      {product.name}
                    </span>
                    {product.isNewProduct ? (
                      <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        {t("stock.new", "New")}
                      </span>
                    ) : null}
                  </p>
                  {isLoss ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("stock.lossWarning", "Loss")}
                    </p>
                  ) : null}

                  {/* Mobile meta */}
                  <div className="mt-2 space-y-2 md:hidden">
                    <p className="truncate text-sm text-foreground">
                      {product.categoryName}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("stock.boughtPrice", "Bought Price")}
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums text-foreground">
                          {cost.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("cashier.qty", "Qty")}
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums text-foreground">
                          {product.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("stock.lineTotal", "Line Total")}
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums text-foreground">
                          {lineTotal.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("stock.sellingPrice", "Selling Price")}
                        </p>
                        <p className="text-[15px] font-semibold tabular-nums text-foreground">
                          {selling.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop columns: category · bought · qty · total · selling */}
                <p className="hidden truncate text-[15px] text-foreground md:block">
                  {product.categoryName}
                </p>
                <p className="hidden text-right text-base font-semibold tabular-nums text-foreground md:block">
                  {cost.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {currency}
                  </span>
                </p>
                <p className="hidden text-right text-base font-semibold tabular-nums text-foreground md:block">
                  {product.quantity}
                </p>
                <p className="hidden text-right text-base font-semibold tabular-nums text-foreground md:block">
                  {lineTotal.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {currency}
                  </span>
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 md:mt-0 md:contents">
                  <p className="text-base font-semibold tabular-nums text-foreground md:text-right">
                    <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">
                      {t("stock.sellingPrice", "Selling Price")}
                    </span>
                    {selling.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {currency}
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePendingProduct(product.id)}
                    className="h-9 w-9 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                    aria-label={t("stock.deleteProduct", "Delete product")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {t("stock.totalValue", "Total Value")}
          </span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {totalValue.toLocaleString()} {currency}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SellerSelection
          form={sellerForm}
          showSellerDropdown={showSellerDropdown}
          setShowSellerDropdown={setShowSellerDropdown}
          sellers={sellers}
          filteredSellers={filteredSellers}
          setFilteredSellers={setFilteredSellers}
          dropdownSellerSearch={dropdownSellerSearch}
          setDropdownSellerSearch={setDropdownSellerSearch}
          label={`${t("stock.seller", "Seller")} (${t("stock.forAllProducts", "for all products")})`}
          onSellerSelect={(sellerId) => setMultiSellerId(sellerId)}
          onFormChange={(key, value) => {
            if (key !== "sellerName") return;
            const name = String(value ?? "");
            setMultiSellerName(name);
            const match = sellers.find(
              (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
            );
            setMultiSellerId(match?.id ?? "");
          }}
        />

        <div className="flex items-end">
          <Button
            type="button"
            onClick={onFinishPurchase}
            disabled={finishingPurchase}
            className="h-11 w-full bg-green-600 text-white hover:bg-green-700"
          >
            {finishingPurchase ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("history.loadingPeriodData", "Loading...")}
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t("cashier.confirm", "Confirm")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
