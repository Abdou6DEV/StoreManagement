import { useState } from "react";
import type { SelectedPeriod } from "../../../../types";
import { useDetailsHistoryData } from "./useDetailsHistoryData";
import DetailsHistoryHeader from "./detailsHistoryHeader";
import DetailsHistoryTabs from "./detailsHistoryTabs";
import SalesSection from "./salesSection";
import PaymentsSection from "./paymentsSection";
import PurchasesSection from "./purchasesSection";
import EmptyState from "./emptyState";
import LoadingState from "./loadingState";

interface DetailsHistoryProps {
  selectedPeriod: SelectedPeriod | null;
}

export default function DetailsHistory({
  selectedPeriod,
}: DetailsHistoryProps) {
  const [activeSection, setActiveSection] = useState<
    "sales" | "payments" | "purchases"
  >("sales");

  // Memoize today's period to prevent unnecessary recalculations
  const todayPeriod = useState<SelectedPeriod>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return {
      period: "day",
      periodValue: `${year}-${month}-${day}`
    };
  })[0];

  // Use today's date if no period is selected
  const effectivePeriod = selectedPeriod || todayPeriod;

  const {
    sales,
    payments,
    purchases,
    loading,
    salesPage,
    paymentsPage,
    purchasesPage,
    setSalesPage,
    setPaymentsPage,
    setPurchasesPage,
    salesTotalPages,
    paymentsTotalPages,
    purchasesTotalPages,
    currentSales,
    currentPayments,
    currentPurchases,
  } = useDetailsHistoryData(effectivePeriod);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <DetailsHistoryHeader
        selectedPeriod={effectivePeriod}
        salesCount={sales.length}
        paymentsCount={payments.length}
        purchasesCount={purchases.length}
      />

      <DetailsHistoryTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        salesCount={sales.length}
        paymentsCount={payments.length}
        purchasesCount={purchases.length}
      />

      <div className="min-h-[400px]">
        {activeSection === "sales" && (
          <SalesSection
            sales={sales}
            currentSales={currentSales}
            currentPage={salesPage}
            totalPages={salesTotalPages}
            onPageChange={setSalesPage}
          />
        )}

        {activeSection === "payments" && (
          <PaymentsSection
            payments={payments}
            currentPayments={currentPayments}
            currentPage={paymentsPage}
            totalPages={paymentsTotalPages}
            onPageChange={setPaymentsPage}
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
