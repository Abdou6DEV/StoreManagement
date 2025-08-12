import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import type { PurchaseForHistory } from "../../../../types";
import { formatCurrency, formatDateTime } from "./detailsHistoryUtils";
import DetailsHistoryPagination from "./detailsHistoryPagination";

interface PurchasesSectionProps {
  purchases: PurchaseForHistory[];
  currentPurchases: PurchaseForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PurchasesSection({
  purchases,
  currentPurchases,
  currentPage,
  totalPages,
  onPageChange,
}: PurchasesSectionProps) {
  const { t } = useTranslation();

  if (purchases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>{t("history.noPurchasesFoundForPeriod")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentPurchases.map((purchase) => (
          <div key={purchase.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(purchase.createdAt)}
                </span>
                {purchase.seller && (
                  <span className="text-sm font-medium">
                    {t("history.seller")}: {purchase.seller.name}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(
                  purchase.PurchaseItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
                )}
              </span>
            </div>
            <div className="space-y-2">
              {purchase.PurchaseItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>
                    {item.product.name} ({item.product.categoryName}) x {item.quantity}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
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
