import React from "react";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "../button";
import { useTranslation } from "react-i18next";
import PaymentSummaryCards from "./paymentSummaryCards";
import { SummaryStats } from "../../../types";

interface PaymentSummaryTabProps {
  summaryStats: SummaryStats;
  onViewCredits: () => void;
  onViewVersements: () => void;
}

const PaymentSummaryTab: React.FC<PaymentSummaryTabProps> = ({
  summaryStats,
  onViewCredits,
  onViewVersements,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PaymentSummaryCards summaryStats={summaryStats} />

      {/* Quick Actions */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-3">
          {t("clients.quickActions", "Quick Actions")}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onViewCredits}
            className="flex items-center gap-2 hover:bg-black hover:border-black hover:text-white transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {t("clients.viewCredits", "View Credits")} (
            {summaryStats.creditsCount})
          </Button>
          <Button
            variant="outline"
            onClick={onViewVersements}
            className="flex items-center gap-2 hover:bg-black hover:border-black hover:text-white transition-colors cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            {t("clients.viewVersements", "View Versements")} (
            {summaryStats.versementsCount})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryTab;
