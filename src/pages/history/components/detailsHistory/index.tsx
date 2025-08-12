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

export default function DetailsHistory({ selectedPeriod }: DetailsHistoryProps) {
  const [activeSection, setActiveSection] = useState<"sales" | "payments" | "purchases">("sales");
  
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
  } = useDetailsHistoryData(selectedPeriod);

  if (!selectedPeriod) {
    return <EmptyState />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <DetailsHistoryHeader
        selectedPeriod={selectedPeriod}
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
