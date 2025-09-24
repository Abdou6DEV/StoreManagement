import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { formatDateTime } from "./detailsHistoryUtils";
import SharedPagination from "../sharedPagination";

interface BillsPaymentsSectionProps {
  billsPayments: any[];
  currentBillsPayments: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function BillsPaymentsSection({
  billsPayments,
  currentBillsPayments,
  currentPage,
  totalPages,
  onPageChange,
}: BillsPaymentsSectionProps) {
  const { t } = useTranslation();

  // Format currency for bills payments (stored in centimes)
  const formatBillsCurrency = (amount: number) => {
    const value = amount / 100;
    const roundedValue = Math.round(value * 100) / 100;
    return `${roundedValue % 1 === 0 ? roundedValue.toFixed(0) : roundedValue.toFixed(2)} ${t("bills.currency", "DA")}`;
  };

  if (billsPayments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="w-16 h-16 mx-auto mb-6 opacity-40" />
        <p className="text-lg font-medium">{t("history.noBillsPayments", "No bills payments found")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentBillsPayments.map((payment) => (
          <div
            key={payment.id}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-base text-muted-foreground font-medium">
                  {formatDateTime(payment.paidDate)}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {payment.bill.title}
                </span>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatBillsCurrency(payment.amount)}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-base py-2 px-3 bg-muted/30 rounded-md">
                <span className="font-medium text-foreground">
                  {t("history.type", "Type")}: <span className="font-bold text-blue-600">{payment.bill.type}</span>
                </span>
                <span className="text-muted-foreground font-medium">
                  {payment.bill.description || ""}
                </span>
              </div>
              {payment.notes && (
                <div className="flex items-center justify-between text-base py-2 px-3 bg-muted/20 rounded-md">
                  <span className="font-medium text-muted-foreground">
                    {t("history.notes", "Notes")}:
                  </span>
                  <span className="font-medium text-foreground">
                    {payment.notes}
                  </span>
                </div>
              )}
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
