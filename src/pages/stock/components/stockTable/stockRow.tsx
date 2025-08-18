import React from "react";
import { useTranslation } from "react-i18next";
import { Edit, Info, Trash2 } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Tooltip } from "../../../../lib/components/tooltip";
import type { StockRowProps } from "./types";

export const StockRow = React.memo(function StockRow({
  product,
  setEditingProductID,
  handleDeleteProduct,
  handleViewProductInfo,
}: StockRowProps) {
  const { t } = useTranslation();
  const profit = product.sellingPrice - product.boughtPrice;
  const totalProfit = profit * (product.totalSold ?? 0);

  return (
    <tr key={product.id} className="h-[48px] hover:bg-muted/40 transition">
      <td className="px-4">{product.name}</td>
      <td className="px-4">{product.categoryName}</td>
      <td className="px-4">{product.quantity}</td>
      <td className="px-4">{product.boughtPrice}</td>
      <td className="px-4">{product.sellingPrice}</td>
      <td className="px-4 text-green-700 font-medium">{profit}</td>
      <td className="px-4">{product.totalSold ?? 0}</td>
      <td className="px-4 text-green-700 font-medium">{totalProfit}</td>
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
