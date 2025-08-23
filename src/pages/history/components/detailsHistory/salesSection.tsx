import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { SaleForHistory, Sale } from "../../../../types";
import SaleCard from "./saleCard";
import SharedPagination from "../sharedPagination";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";

interface SalesSectionProps {
  sales: SaleForHistory[];
  currentSales: SaleForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function SalesSection({
  sales,
  currentSales,
  currentPage,
  totalPages,
  onPageChange,
}: SalesSectionProps) {
  const { t } = useTranslation();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Transform SaleForHistory to Sale format that the modal expects
  const transformSaleForHistory = (saleForHistory: SaleForHistory): Sale => {
    const totalAmount = saleForHistory.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalAmountWithDiscount = totalAmount - saleForHistory.discount;
    const totalItems = saleForHistory.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      ...saleForHistory,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount: totalAmountWithDiscount, // Assume full payment for history
      remainingAmount: 0, // No remaining amount for completed sales
      totalItems,
      isPaidInCash: true, // Assume cash payment for history
      payment: undefined, // No payment object for history
    };
  };

  const handleViewSale = (sale: SaleForHistory) => {
    const transformedSale = transformSaleForHistory(sale);
    setSelectedSale(transformedSale);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  const handlePrintReceipt = (sale: Sale) => {
    // TODO: Implement print functionality
    console.log("Printing receipt for sale:", sale.id);
  };

  const handleModifySale = (sale: Sale) => {
    // This is handled in the modal
    console.log("Modifying sale:", sale.id);
  };

  const handleSaleUpdated = (updatedSale: Sale) => {
    // Handle sale updates if needed
    console.log("Sale updated:", updatedSale.id);
  };

  const handleSaleDeleted = (saleId: string) => {
    // Handle sale deletion if needed
    console.log("Sale deleted:", saleId);
    handleCloseModal();
  };

  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>{t("history.noSalesFoundForPeriod")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {currentSales.map((sale, index) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            index={index}
            onView={handleViewSale}
          />
        ))}
      </div>
      <SharedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      {/* Sale Details Modal - Same as cashier history browser */}
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showModal}
        onClose={handleCloseModal}
        onPrint={handlePrintReceipt}
        onModify={handleModifySale}
        onSaleUpdated={handleSaleUpdated}
        onSaleDeleted={handleSaleDeleted}
      />
    </div>
  );
}
