import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import type { PaymentForHistory } from "../../../../types";
import { formatCurrency, formatDateTime, formatDate } from "./detailsHistoryUtils";
import DetailsHistoryPagination from "./detailsHistoryPagination";

interface PaymentsSectionProps {
  payments: PaymentForHistory[];
  currentPayments: PaymentForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaymentsSection({
  payments,
  currentPayments,
  currentPage,
  totalPages,
  onPageChange,
}: PaymentsSectionProps) {
  const { t } = useTranslation();

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>{t("history.noPaymentsFoundForPeriod")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentPayments.map((payment) => (
          <div key={payment.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(payment.createdAt)}
                </span>
                <span className="text-sm font-medium">
                  {payment.client.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {payment.type}
                </span>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(payment.givenAmount)}
                </span>
              </div>
            </div>
            {payment.sale && (
              <div className="text-sm text-muted-foreground">
                {t("history.relatedToSale")}: {payment.sale.id} ({formatDate(payment.sale.createdAt)})
              </div>
            )}
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
