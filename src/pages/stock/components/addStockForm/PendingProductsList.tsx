import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../lib/components/command";
// Helper function for safe multiplication with precision
const safeMultiply = (a: number, b: number): number => {
  return parseFloat((a * b).toFixed(2));
};

interface PendingProduct {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number; // current price to apply
  sellingPrice: number;
  codebar: string;
  sellerId: string;
  photo: string | null;
  isNewProduct: boolean;
  existingProductId?: string;
  // Optional fields for change context (present for existing products)
  originalBoughtPrice?: number; // previous price before this purchase
  priceStrategy?: "weighted" | "new"; // chosen strategy
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
  
  const [showSellerDropdown, setShowSellerDropdown] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          {t("stock.pendingProducts", "Products in Purchase")} (
          {pendingProducts.length})
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("stock.totalValue", "Total Value")}:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 font-semibold text-sm">
            {Math.round(
              pendingProducts.reduce(
                (sum, p) => sum + safeMultiply(p.quantity, p.boughtPrice),
                0
              )
            ).toLocaleString()} {t("cashier.currency")}
          </span>
        </div>
      </div>

      <div className="space-y-1 border border-border rounded-lg bg-muted/10 p-2">
        {pendingProducts.map((product) => {
          const hadPrevious = typeof product.originalBoughtPrice === "number";
          const previous = Math.round(Number(product.originalBoughtPrice || 0));
          const current = Math.round(Number(product.boughtPrice));
          const selling = Math.round(Number(product.sellingPrice || 0));
          const changed = hadPrevious && previous !== current;
          const changeUp = changed && current > previous;
          const changeDown = changed && current < previous;

          return (
            <div
              key={product.id}
              className="px-3 py-2 bg-card/50 border-b border-border last:border-b-0 rounded-md"
            >
              {/* Row top: name + badges on left, total on right */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground truncate text-sm md:text-base">{product.name}</span>
                  {product.isNewProduct && (
                    <span className="px-2 py-0.5 text-[11px] bg-green-100 text-green-700 rounded-full whitespace-nowrap">
                      {t("stock.new", "New")}
                    </span>
                  )}
                  {product.priceStrategy && (
                    <span
                      className={
                        product.priceStrategy === "weighted"
                          ? "px-2 py-0.5 text-[11px] rounded bg-blue-100 text-blue-700 whitespace-nowrap"
                          : "px-2 py-0.5 text-[11px] rounded bg-purple-100 text-purple-700 whitespace-nowrap"
                      }
                    >
                      {product.priceStrategy === "weighted"
                        ? t("stock.weighted", "Weighted Avg")
                        : t("stock.newPrice", "New Price")}
                    </span>
                  )}
                </div>
                <div className="shrink-0 inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-sm md:text-base font-semibold">
                    {Math.round(safeMultiply(product.quantity, product.boughtPrice)).toLocaleString()} {t("cashier.currency")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePendingProduct(product.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Row bottom: concise info bar */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                  {product.categoryName}
                </span>
                <span className="whitespace-nowrap">
                  {t("cashier.qty", "Qty")}: <span className="text-foreground font-medium">{product.quantity}</span>
                </span>
                <span className="whitespace-nowrap">
                  {t("stock.costShort", "Cost")}: <span className="text-foreground font-medium">{current} {t("cashier.currency")}</span>
                </span>
                {hadPrevious && (
                  <span className="whitespace-nowrap inline-flex items-center gap-1">
                    <span>{t("stock.oldShort", "Old")}:</span>
                    <span className="font-medium">{previous}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                    <span
                      className={
                        changeUp
                          ? "font-semibold text-green-600"
                          : changeDown
                          ? "font-semibold text-red-600"
                          : "font-semibold text-foreground"
                      }
                    >
                      {t("stock.newShort", "New")}: {current}
                    </span>
                  </span>
                )}
                <span className="whitespace-nowrap">
                  {t("stock.sellingShort", "Selling")}: <span className="text-foreground font-medium">{selling} {t("cashier.currency")}</span>
                </span>
                {product.sellingPrice > 0 && product.sellingPrice < product.boughtPrice && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 text-orange-700 whitespace-nowrap">
                    <AlertTriangle className="w-3 h-3" /> {t("stock.lossWarning", "Loss")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-mode Seller Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("stock.seller", "Seller")} (
            {t("stock.forAllProducts", "for all products")})
          </label>
          <div className="relative">
            <Popover open={showSellerDropdown} onOpenChange={setShowSellerDropdown}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all text-left ${
                    !multiSellerId ? "text-muted-foreground" : ""
                  }`}
                >
                  {multiSellerId
                    ? sellers.find((s) => s.id === multiSellerId)?.name
                    : t("stock.chooseSeller", "Choose seller")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t("stock.searchSeller", "Search seller...")}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>{t("stock.noSellerFound", "No seller found")}</CommandEmpty>
                    <CommandGroup>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.id}
                          onSelect={() => {
                            setMultiSellerId(seller.id);
                            setShowSellerDropdown(false);
                          }}
                        >
                          <span className="flex flex-col">
                            <span className="text-sm font-medium">{seller.name}</span>
                            {seller.phone && (
                              <span className="text-xs text-muted-foreground">
                                {seller.phone}
                              </span>
                            )}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            onClick={onFinishPurchase}
            disabled={finishingPurchase}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
          >
            {finishingPurchase ? (
              <>
                <div className="w-4 h-4 animate-spin mr-2 border-2 border-white border-t-transparent rounded-full" />
                {t("history.loadingPeriodData", "Loading...")}
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t("cashier.confirm", "Confirm")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
