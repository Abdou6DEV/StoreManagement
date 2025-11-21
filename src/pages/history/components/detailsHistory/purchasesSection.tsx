import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import type { PurchaseForHistory } from "../../../../types";
import { formatCurrency, formatDateTime } from "./detailsHistoryUtils";
import SharedPagination from "../sharedPagination";

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
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-16 h-16 mx-auto mb-6 opacity-40" />
        <p className="text-lg font-medium">{t("history.noPurchasesFoundForPeriod")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentPurchases.map((purchase) => (
          <div
            key={purchase.id}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-base text-muted-foreground font-medium">
                  {formatDateTime(purchase.createdAt)}
                </span>
                {purchase.seller && (
                  <span className="text-base font-semibold text-foreground">
                    {t("history.seller")}: {purchase.seller.name}
                  </span>
                )}
              </div>
              <span className="text-[0.9375rem] font-bold text-green-600">
                {formatCurrency(
                  purchase.PurchaseItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0,
                  ),
                )}
              </span>
            </div>
            <div className="space-y-3">
              {purchase.PurchaseItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-base py-2 px-3 bg-muted/30 rounded-md"
                >
                  <span className="font-medium text-foreground">
                    {item.product.name} ({item.product.categoryName}) x{" "}
                    <span className="font-bold text-[0.9375rem] text-primary">{item.quantity}</span>
                  </span>
                  <span className="text-[0.9375rem] font-bold text-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SharedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
