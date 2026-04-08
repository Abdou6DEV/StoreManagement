import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, CreditCard, Repeat2, Ban } from "lucide-react";

interface Bill {
  id: string;
  amount: number;
  duration: string;
  nextBillDate: Date;
  payments?: { amount: number }[];
}

interface BillsTotalsFooterProps {
  filteredBills: Bill[];
}

function isRecurring(bill: Bill) {
  return bill.duration !== "NO_NEXT";
}

export function BillsTotalsFooter({
  filteredBills,
}: BillsTotalsFooterProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let totalPaid = 0;

    for (const bill of filteredBills) {
      const paid = (bill.payments ?? []).reduce((s, p) => s + (p.amount || 0), 0);
      totalPaid += paid;

      if (isRecurring(bill)) {
        active += 1;
      } else {
        inactive += 1;
      }
    }

    return {
      totalBills: filteredBills.length,
      active,
      inactive,
      totalPaid,
    };
  }, [filteredBills]);

  const formatCurrency = (amount: number) => {
    const value = amount / 100;
    const cleanValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${parseFloat(cleanValue).toLocaleString("fr-FR")} ${t("bills.currency", "DA")}`;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("bills.totalBills", "Total Bills")}:
        </span>
        <span className="font-medium text-[0.9375rem]">{stats.totalBills}</span>
      </div>

      <div className="flex items-center gap-2">
        <Repeat2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-muted-foreground">
          {t("bills.footerActiveBills", "Active bills")}:
        </span>
        <span className="font-medium text-[0.9375rem] text-blue-600 dark:text-blue-400">
          {stats.active}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Ban className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("bills.footerInactiveBills", "Inactive bills")}:
        </span>
        <span className="font-medium text-[0.9375rem]">{stats.inactive}</span>
      </div>

      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="text-muted-foreground">
          {t("bills.totalPaidAmount", "Total Paid Amount")}:
        </span>
        <span className="font-medium text-[0.9375rem] text-purple-600 dark:text-purple-400">
          {formatCurrency(stats.totalPaid)}
        </span>
      </div>
    </div>
  );
}
