// Force refresh - React import fix
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import type { SaleForHistory, Sale } from "../../../../types";
import SaleCard from "./saleCard";
import SharedPagination from "../sharedPagination";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";
import SectionControls from "./sectionControls";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";
import { useToast } from "../../../../lib/contexts/toastContext";

interface SalesSectionProps {
  sales: SaleForHistory[];
  currentSales: SaleForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
}

export default function SalesSection({
  sales,
  currentSales,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
}: SalesSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [saleToDelete, setSaleToDelete] = useState<SaleForHistory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filteredPage, setFilteredPage] = useState(1);

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

    // Handle credit sales properly
    const hasPayment = saleForHistory.payment !== null && saleForHistory.payment !== undefined;
    const paidAmount = hasPayment ? (saleForHistory.payment?.givenAmount || 0) : totalAmountWithDiscount;
    const remainingAmount = totalAmountWithDiscount - paidAmount;
    const isPaidInCash = !hasPayment;



    return {
      ...saleForHistory,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount,
      remainingAmount,
      totalItems,
      isPaidInCash,
      payment: saleForHistory.payment,
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

  const handleDeleteSale = (sale: SaleForHistory) => {
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log("Attempting to delete sale with ID:", saleToDelete.id);
      console.log("Sale object:", saleToDelete);
      
      // Delete the sale using the API
      await window.api.database.sales.delete(saleToDelete.id);
      
      // Close the dialog
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
      
      // Refresh the data after successful deletion
      if (onRefresh) {
        onRefresh();
      }
      
      // Show success message
      showToast(t("cashier.saleDeleted", "Sale deleted successfully"), "success");
      console.log("Sale deleted successfully:", saleToDelete.id);
    } catch (error) {
      console.error("Failed to delete sale:", error);
      console.error("Sale ID that failed:", saleToDelete.id);
      console.error("Full error details:", error);
      
      // Show error message
      showToast(t("cashier.saleDeleteError", "Failed to delete sale"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter sales based on search term - search through ALL sales data
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    return sales.filter((sale) => {
      // Search by sale ID
      if (sale.id.toLowerCase().includes(searchLower)) return true;
      
      // Search by client name
      if (sale.client?.name.toLowerCase().includes(searchLower)) return true;
      
      // Search by product names
      const hasMatchingProduct = sale.saleItems.some((item) => {
        const productName = item.product?.name || 
                           item.manualProduct?.name || 
                           item.service?.name || "";
        return productName.toLowerCase().includes(searchLower);
      });
      
      return hasMatchingProduct;
    });
  }, [sales, searchTerm]);

  // Pagination for filtered results
  const itemsPerPage = 10; // Same as the original pagination
  const filteredTotalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentFilteredSales = filteredSales.slice(
    (filteredPage - 1) * itemsPerPage,
    filteredPage * itemsPerPage
  );

  // Reset filtered page when search term changes
  useEffect(() => {
    setFilteredPage(1);
  }, [searchTerm]);

  // Determine what to display
  const isSearching = searchTerm.trim().length > 0;
  const displaySales = isSearching ? currentFilteredSales : currentSales;
  const displayTotalPages = isSearching ? filteredTotalPages : totalPages;
  const displayCurrentPage = isSearching ? filteredPage : currentPage;
  const displayOnPageChange = isSearching ? setFilteredPage : onPageChange;





  return (
    <div className="space-y-4">
      <SectionControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder={t("history.searchSales", "Search by products, clients, or sale ID...")}
      />
      
             {displaySales.length === 0 ? (
         <div className="text-center py-8 text-muted-foreground">
           <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-40" />
           <p>
             {isSearching 
               ? t("history.noSalesFoundForSearch", "No sales found matching your search")
               : t("history.noSalesFoundForPeriod", "No sales found for this period")
             }
           </p>
         </div>
       ) : (
         <div className={viewMode === "grid" 
           ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
           : "space-y-3"
         }>
           {displaySales.map((sale, index) => (
             <SaleCard
               key={sale.id}
               sale={sale}
               index={index}
               onView={handleViewSale}
               onDelete={handleDeleteSale}
             />
           ))}
         </div>
       )}
             <SharedPagination
         currentPage={displayCurrentPage}
         totalPages={displayTotalPages}
         onPageChange={displayOnPageChange}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) {
            setSaleToDelete(null);
          }
        }}
        title={t("cashier.confirmDelete", "Confirm Delete")}
        message={t(
          "cashier.deleteSaleMessage",
          "Are you sure you want to delete this sale? This will restore the product quantities to your inventory.",
        )}
        confirmText={t("cashier.delete", "Delete")}
        cancelText={t("cashier.cancel", "Cancel")}
        variant="danger"
        onConfirm={confirmDeleteSale}
        loading={isDeleting}
      />
    </div>
  );
}
