import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Hash, Repeat2, Ban, HelpCircle } from "lucide-react";

interface Payment {
  id: string;
  billId: string;
  amount: number;
}

interface BillRef {
  duration: string;
}

interface BillsPaymentsTotalsFooterProps {
  filteredPayments: Payment[];
  /** Resolve bill duration for active vs inactive split; missing = unknown bill */
  billsById: Map<string, BillRef>;
}

export function BillsPaymentsTotalsFooter({
  filteredPayments,
  billsById,
}: BillsPaymentsTotalsFooterProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    let totalPayments = 0;
    let totalAmount = 0;
    let activeCount = 0;
    let activeSum = 0;
    let inactiveCount = 0;
    let inactiveSum = 0;
    let unknownCount = 0;
    let unknownSum = 0;

    for (const p of filteredPayments) {
      totalPayments += 1;
      const amt = p.amount || 0;
      totalAmount += amt;

      const bill = billsById.get(p.billId);
      if (!bill) {
        unknownCount += 1;
        unknownSum += amt;
        continue;
      }
      if (bill.duration === "NO_NEXT") {
        inactiveCount += 1;
        inactiveSum += amt;
      } else {
        activeCount += 1;
        activeSum += amt;
      }
    }

    return {
      totalPayments,
      totalAmount,
      activeCount,
      activeSum,
      inactiveCount,
      inactiveSum,
      unknownCount,
      unknownSum,
    };
  }, [filteredPayments, billsById]);

  const formatCurrency = (amount: number) => {
    const value = amount / 100;
    const cleanValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${parseFloat(cleanValue).toLocaleString("fr-FR")} ${t("bills.currency", "DA")}`;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
      <div className="flex items-center gap-2">
        <Hash className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("bills.footerPaymentCount", "Total payments")}:
        </span>
        <span className="font-medium text-[0.9375rem]">{stats.totalPayments}</span>
      </div>

      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="text-muted-foreground">
          {t("bills.footerSumPaymentAmounts", "Total payments amount")}:
        </span>
        <span className="font-medium text-[0.9375rem] text-purple-600 dark:text-purple-400">
          {formatCurrency(stats.totalAmount)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Repeat2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-muted-foreground">
          {t("bills.footerPaymentsOnActiveBills", "On active bills")}:
        </span>
        <span className="font-medium text-[0.9375rem] text-blue-600 dark:text-blue-400">
          {stats.activeCount} · {formatCurrency(stats.activeSum)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Ban className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("bills.footerPaymentsOnInactiveBills", "On inactive bills")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {stats.inactiveCount} · {formatCurrency(stats.inactiveSum)}
        </span>
      </div>

      {stats.unknownCount > 0 ? (
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-muted-foreground">
            {t("bills.footerPaymentsUnknownBill", "Unknown bill")}:
          </span>
          <span className="font-medium text-[0.9375rem] text-amber-600 dark:text-amber-400">
            {stats.unknownCount} · {formatCurrency(stats.unknownSum)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
