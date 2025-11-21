import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Edit, Info, Trash2 } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Tooltip } from "../../../../lib/components/tooltip";
import type { StockRowProps } from "./types";
import type { SaleItem, Sale, Client } from "@prisma/client";

export const StockRow = React.memo(function StockRow({
  product,
  setEditingProductID,
  handleDeleteProduct,
  handleViewProductInfo,
  isNewlyLowStock = false,
}: StockRowProps) {
  const { t } = useTranslation();
  const [actualProfit, setActualProfit] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const profit = product.sellingPrice - product.boughtPrice;

  // Fetch actual profit using the same logic as InfoProductModal
  useEffect(() => {
    const fetchActualProfit = async () => {
      if (!product.totalSold || product.totalSold === 0) {
        setActualProfit(0);
        return;
      }

      setLoading(true);
      try {
        const productData =
          await window.api.database.products.getWithPurchaseHistory(product.id);
        if (productData?.saleItems && productData.saleItems.length > 0) {
          const calculatedProfit = productData.saleItems.reduce(
            (
              sum: number,
              item: SaleItem & {
                sale: Sale & { client: Client | null };
              }
            ) => {
              // Use stored bought price if available, otherwise fallback to current bought price
              const boughtPrice =
                (item as { boughtPrice?: number }).boughtPrice ||
                product.boughtPrice;
              const profit = (item.price - boughtPrice) * item.quantity;
              return sum + profit;
            },
            0
          );
          setActualProfit(calculatedProfit);
        } else {
          setActualProfit(0);
        }
      } catch (error) {
        console.error("Error fetching actual profit:", error);
        setActualProfit(0);
      } finally {
        setLoading(false);
      }
    };

    fetchActualProfit();
  }, [product.id, product.boughtPrice, product.totalSold]);

  return (
    <tr 
      key={product.id} 
      className={`h-[48px] hover:bg-muted/40 transition ${
        isNewlyLowStock 
          ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500" 
          : ""
      }`}
    >
      <td className="px-4">{product.name}</td>
      <td className="px-4">{product.categoryName}</td>
      <td className="px-4"><span className="text-[0.9375rem]">{product.quantity.toLocaleString('fr-FR')}</span></td>
      <td className="px-4 whitespace-nowrap">
        <span className="text-[0.9375rem]">{product.boughtPrice.toLocaleString('fr-FR')} {t("cashier.currency", "DA")}</span>
      </td>
      <td className="px-4 whitespace-nowrap">
        <span className="text-[0.9375rem]">{product.sellingPrice.toLocaleString('fr-FR')} {t("cashier.currency", "DA")}</span>
      </td>
      <td className="px-4 text-green-700 font-medium whitespace-nowrap">
        <span className="text-[0.9375rem]">{profit.toLocaleString('fr-FR')} {t("cashier.currency", "DA")}</span>
      </td>
      <td className="px-4"><span className="text-[0.9375rem]">{(product.totalSold ?? 0).toLocaleString('fr-FR')}</span></td>
      <td className="px-4 text-green-700 font-medium whitespace-nowrap">
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-[0.9375rem]">{actualProfit.toLocaleString('fr-FR')} {t("cashier.currency", "DA")}</span>
        )}
      </td>
      <td className="px-4">
        <div className="flex gap-2">
          <Tooltip content={t("stock.viewInfo", "View product info")}>
            <Button
              onClick={() => handleViewProductInfo(product.id)}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <Info className="w-3 h-3" />
            </Button>
          </Tooltip>
          <Tooltip content={t("stock.editProduct", "Edit product")}>
            <Button
              onClick={() => setEditingProductID(product.id)}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </Tooltip>
          <Tooltip content={t("stock.deleteProduct", "Delete product")}>
            <Button
              onClick={() => handleDeleteProduct(product.id)}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
});
