import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Trash2 } from "lucide-react";
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
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
  sellerId: string;
  photo: string | null;
  isNewProduct: boolean;
  existingProductId?: string;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          {t("stock.pendingProducts", "Products in Purchase")} (
          {pendingProducts.length})
        </h3>
        <div className="text-sm text-muted-foreground">
          {t("stock.totalValue", "Total Value")}:{" "}
          {pendingProducts
            .reduce(
              (sum, p) => sum + safeMultiply(p.quantity, p.boughtPrice),
              0
            )
            .toLocaleString()}{" "}
          {t("cashier.currency")}
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
        {pendingProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-3 bg-muted/20 border-b border-border last:border-b-0"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{product.name}</span>
                {product.isNewProduct && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    {t("stock.new", "New")}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {product.categoryName} • {product.quantity} units @{" "}
                {product.boughtPrice} ={" "}
                {safeMultiply(
                  product.quantity,
                  product.boughtPrice
                ).toLocaleString()}{" "}
                {t("cashier.currency")}
                {product.sellingPrice > 0 &&
                  product.sellingPrice < product.boughtPrice && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                      ⚠️ {t("stock.lossWarning", "Loss")}
                    </span>
                  )}
              </div>
            </div>
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
        ))}
      </div>

      {/* Multi-mode Seller Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("stock.seller", "Seller")} (
            {t("stock.forAllProducts", "for all products")})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t("stock.seller", "Seller")}
              value={
                multiSellerName ||
                sellers.find((s) => s.id === multiSellerId)?.name ||
                ""
              }
              onChange={(e) => {
                const value = e.target.value;
                setMultiSellerName(value);

                // If exact match found, set sellerId
                const matchingSeller = sellers.find(
                  (s) => s.name.toLowerCase() === value.toLowerCase()
                );
                if (matchingSeller) {
                  setMultiSellerId(matchingSeller.id);
                  setMultiSellerName(""); // Clear sellerName when ID is set
                } else {
                  setMultiSellerId(""); // Clear sellerId for new names
                }
              }}
              className="flex-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {t("stock.choose", "Choose")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput
                    placeholder={t("stock.searchSeller", "Search seller...")}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t("stock.noSeller", "No seller found.")}
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setMultiSellerId("");
                          setMultiSellerName("");
                        }}
                      >
                        {t("stock.noSeller", "No Seller")}
                      </CommandItem>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          onSelect={() => {
                            setMultiSellerId(seller.id);
                            setMultiSellerName("");
                          }}
                        >
                          {seller.name}
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
                {t("stock.completing", "Completing...")}
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t("stock.finishPurchase", "Finish Purchase")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
