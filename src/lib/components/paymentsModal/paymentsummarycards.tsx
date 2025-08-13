import React from "react";
import { ArrowUpCircle, ArrowDownCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SummaryStats } from "../../../types";

interface PaymentSummaryCardsProps {
  summaryStats: SummaryStats;
}

const PaymentSummaryCards: React.FC<PaymentSummaryCardsProps> = ({
  summaryStats,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <ArrowUpCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">
              {t("clients.totalCredits", "Total Credits")}
            </p>
            <p className="text-lg font-bold text-red-900">
              {summaryStats.totalCredits.toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </p>
          </div>
        </div>
        <div className="mt-2 text-xs text-red-600">
          {summaryStats.creditsCount} {t("clients.payments", "payments")}
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <ArrowDownCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700">
              {t("clients.totalVersements", "Total Versements")}
            </p>
            <p className="text-lg font-bold text-red-900">
              {Math.abs(summaryStats.totalVersements).toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </p>
          </div>
        </div>
        <div className="mt-2 text-xs text-red-600">
          {summaryStats.versementsCount} {t("clients.payments", "payments")}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">
              {t("clients.paidCredits", "Paid Credits")}
            </p>
            <p className="text-lg font-bold text-green-900">
              {summaryStats.paidCredits.toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </p>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-600">
          {summaryStats.paidCreditsCount} {t("clients.paid", "paid")}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">
              {t("clients.paidVersements", "Paid Versements")}
            </p>
            <p className="text-lg font-bold text-green-900">
              {summaryStats.paidVersements.toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </p>
          </div>
        </div>
        <div className="mt-2 text-xs text-green-600">
          {summaryStats.paidVersementsCount} {t("clients.paid", "paid")}
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCards;
