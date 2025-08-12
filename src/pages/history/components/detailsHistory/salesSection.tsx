import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import type { SaleForHistory } from "../../../../types";
import { formatCurrency, formatDateTime } from "./detailsHistoryUtils";
import DetailsHistoryPagination from "./detailsHistoryPagination";

interface SalesSectionProps {
  sales: SaleForHistory[];
  currentSales: SaleForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function SalesSection({
  sales,
  currentSales,
  currentPage,
  totalPages,
  onPageChange,
}: SalesSectionProps) {
  const { t } = useTranslation();

  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>{t("history.noSalesFoundForPeriod")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentSales.map((sale) => (
          <div key={sale.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(sale.createdAt)}
                </span>
                {sale.client && (
                  <span className="text-sm font-medium">
                    {t("history.client")}: {sale.client.name}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(
                  sale.saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) - sale.discount
                )}
              </span>
            </div>
            <div className="space-y-2">
              {sale.saleItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>
                    {item.product?.name || item.manualProduct?.name || item.service?.name} x {item.quantity}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              {sale.discount > 0 && (
                <div className="flex items-center justify-between text-sm text-red-600">
                  <span>{t("history.discount")}</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <DetailsHistoryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
