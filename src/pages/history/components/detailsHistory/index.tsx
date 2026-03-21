import { useState } from "react";
import type { SelectedPeriod } from "../../../../types";
import { useDetailsHistoryData } from "./useDetailsHistoryData";
import DetailsHistoryHeader from "./detailsHistoryHeader";
import DetailsHistoryTabs from "./detailsHistoryTabs";
import SalesSection from "./salesSection";
import PurchasesSection from "./purchasesSection";
import BillsPaymentsSection from "./billsPaymentsSection";
import EmptyState from "./emptyState";
import LoadingState from "./loadingState";

interface DetailsHistoryProps {
  selectedPeriod: SelectedPeriod | null;
}

export default function DetailsHistory({
  selectedPeriod,
}: DetailsHistoryProps) {
  const [activeSection, setActiveSection] = useState<
    "sales" | "purchases" | "billsPayments"
  >("sales");

  // Memoize today's period to prevent unnecessary recalculations
  const todayPeriod = useState<SelectedPeriod>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return {
      period: "day",
      periodValue: `${year}-${month}-${day}`,
    };
  })[0];

  // Use today's date if no period is selected
  const effectivePeriod = selectedPeriod || todayPeriod;

  const {
    sales,
    billsPayments,
    purchases,
    loading,
    salesPage,
    billsPaymentsPage,
    purchasesPage,
    setSalesPage,
    setBillsPaymentsPage,
    setPurchasesPage,
    salesTotalPages,
    billsPaymentsTotalPages,
    purchasesTotalPages,
    currentSales,
    currentBillsPayments,
    currentPurchases,
    salesTotal,
    salesProfit,
    purchasesTotal,
    billsPaymentsTotal,
    previousPeriodRevenue,
    previousPeriodProfit,
    growthBaselineAvailable,
    comparisonPeriod,
    refreshData,
  } = useDetailsHistoryData(effectivePeriod);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <DetailsHistoryHeader
        selectedPeriod={effectivePeriod}
        salesCount={sales.length}
        purchasesCount={purchases.length}
        billsPaymentsCount={billsPayments.length}
        billsPaymentsTotal={billsPaymentsTotal}
        salesTotal={salesTotal}
        salesProfit={salesProfit}
        purchasesTotal={purchasesTotal}
        previousPeriodRevenue={previousPeriodRevenue}
        previousPeriodProfit={previousPeriodProfit}
        growthBaselineAvailable={growthBaselineAvailable}
        comparisonPeriod={comparisonPeriod}
      />

      <DetailsHistoryTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        salesCount={sales.length}
        purchasesCount={purchases.length}
        billsPaymentsCount={billsPayments.length}
      />

      <div className="min-h-[400px]">
        {activeSection === "sales" && (
          <SalesSection
            sales={sales}
            currentSales={currentSales}
            currentPage={salesPage}
            totalPages={salesTotalPages}
            onPageChange={setSalesPage}
            onRefresh={refreshData}
          />
        )}

        {activeSection === "billsPayments" && (
          <BillsPaymentsSection
            billsPayments={billsPayments}
            currentBillsPayments={currentBillsPayments}
            currentPage={billsPaymentsPage}
            totalPages={billsPaymentsTotalPages}
            onPageChange={setBillsPaymentsPage}
          />
        )}

        {activeSection === "purchases" && (
          <PurchasesSection
            purchases={purchases}
            currentPurchases={currentPurchases}
            currentPage={purchasesPage}
            totalPages={purchasesTotalPages}
            onPageChange={setPurchasesPage}
          />
        )}
      </div>
    </div>
  );
}
