import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, X, Calendar, Package, AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Badge } from "./badge";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "./pagination";
import { useToast } from "../contexts/toastContext";

interface UnusedProduct {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  lastSoldDate: Date | null;
  createdAt: Date;
}

interface CleanUnusedProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type PeriodOption = "1_month" | "3_months" | "1_year";

const PERIOD_OPTIONS: { value: PeriodOption; label: string; months: number }[] = [
  { value: "1_month", label: "1 Month", months: 1 },
  { value: "3_months", label: "3 Months", months: 3 },
  { value: "1_year", label: "1 Year", months: 12 },
];

export const CleanUnusedProductsModal: React.FC<CleanUnusedProductsModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("3_months");
  const [unusedProducts, setUnusedProducts] = useState<UnusedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<UnusedProduct[]>([]);
  const [productsToDelete, setProductsToDelete] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const ITEMS_PER_PAGE = 5;

  // Fetch unused products when period changes or modal opens
  useEffect(() => {
    if (open) {
      fetchUnusedProducts();
    }
  }, [open, selectedPeriod]);

  // Auto-select all products when they're loaded
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const allProductIds = new Set(filteredProducts.map(p => p.id));
      setProductsToDelete(allProductIds);
    }
  }, [filteredProducts]);

  // Update filtered products and pagination when products change
  useEffect(() => {
    setFilteredProducts(unusedProducts);
    setTotalPages(Math.ceil(unusedProducts.length / ITEMS_PER_PAGE));
    setCurrentPage(1);
    setProductsToDelete(new Set());
  }, [unusedProducts]);

  const fetchUnusedProducts = async () => {
    setLoading(true);
    try {
      const periodMonths = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.months || 3;
      const products = await window.api.database.products.getUnusedProducts(periodMonths);
      setUnusedProducts(products);
    } catch (error) {
      console.error("Error fetching unused products:", error);
      showToast(t("stock.fetchUnusedProductsError", "Failed to fetch unused products"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (productId: string) => {
    setProductsToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleRemoveProduct = (productId: string) => {
    setProductsToDelete(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Select ALL products across all pages, not just current page
    const allProductIds = new Set(filteredProducts.map(p => p.id));
    setProductsToDelete(allProductIds);
  };

  const handleDeselectAll = () => {
    // Deselect ALL products across all pages
    setProductsToDelete(new Set());
  };

  const handleDeleteSelected = async () => {
    if (productsToDelete.size === 0) {
      showToast(t("stock.selectProductsToDelete", "Please select products to delete"), "error");
      return;
    }

    setDeleting(true);
    setDeletionProgress({ current: 0, total: productsToDelete.size });
    
    try {
      const productIds = Array.from(productsToDelete);
      
      // Create a custom delete function that reports progress
      const deleteWithProgress = async (ids: string[]) => {
        const BATCH_SIZE = 25;
        let deleted = 0;
        
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          
          // Simulate progress update (in real implementation, this would be called from the backend)
          setDeletionProgress({ current: deleted, total: ids.length });
          
          // Call the actual delete function
          await window.api.database.products.deleteMultipleProducts(batch);
          
          deleted += batch.length;
          setDeletionProgress({ current: deleted, total: ids.length });
        }
      };
      
      await deleteWithProgress(productIds);

      showToast(`${productIds.length} products deleted successfully`, "success");

      // Refresh the list
      await fetchUnusedProducts();
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting products:", error);
      showToast(t("stock.deleteProductsError", "Failed to delete products"), "error");
    } finally {
      setDeleting(false);
      setDeletionProgress({ current: 0, total: 0 });
    }
  };

  const formatDate = (date: Date | null | string | number | bigint) => {
    if (!date) return t("stock.neverSold", "Never sold");
    
    // Handle BigInt values from SQLite
    let dateValue: Date;
    try {
      if (typeof date === 'bigint') {
        dateValue = new Date(Number(date));
      } else if (typeof date === 'string') {
        dateValue = new Date(date);
      } else if (typeof date === 'number') {
        dateValue = new Date(date);
      } else {
        dateValue = new Date(date);
      }
      
      // Check if the date is valid
      if (isNaN(dateValue.getTime())) {
        console.warn('Invalid date value:', date, 'type:', typeof date);
        return t("stock.neverSold", "Never sold");
      }
      
      return new Intl.DateTimeFormat(t("common.locale", "en-US"), {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(dateValue);
    } catch (error) {
      console.warn('Error formatting date:', date, 'error:', error);
      return t("stock.neverSold", "Never sold");
    }
  };

  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const currentPageProducts = getCurrentPageProducts();
  const selectedCount = productsToDelete.size;

  const modalActions = [
    {
      label: t("common.cancel", "Cancel"),
      onClick: () => onOpenChange(false),
      variant: "outline" as const,
      disabled: deleting,
    },
    {
      label: `Delete Selected (${selectedCount})`,
      onClick: handleDeleteSelected,
      variant: "destructive" as const,
      loading: deleting,
      disabled: selectedCount === 0 || deleting,
      icon: <Trash2 className="w-4 h-4" />,
    },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("stock.cleanUnusedProducts", "Clean Unused Products")}
      subtitle={t("stock.cleanUnusedProductsDesc", "Remove products that haven't been sold and have zero quantity")}
      icon={<Trash2 className="w-5 h-5 text-red-600" />}
      size="xl"
      className="max-h-[95vh]"
      actions={modalActions}
      preventClose={deleting}
    >
      <div className="space-y-4">
        {/* Period Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t("stock.selectPeriod", "Select Period")}
          </label>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={selectedPeriod === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(option.value)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {t("stock.unusedProductsFound", "Unused Products Found")}
                </span>
              </div>
              <div className="text-sm ml-7">
                <span className="text-muted-foreground">
                  {t("stock.totalProducts", "Total Products")}:
                </span>
                <span className="ml-2 font-medium">{filteredProducts.length}</span>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-orange-800 dark:text-orange-200 font-medium mb-1">
                    {t("stock.warning", "Warning")}
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    {t("stock.deleteWarning", "This action cannot be undone. Only products with zero quantity will be deleted.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

               {/* Loading State */}
               {loading ? (
                 <div className="flex items-center justify-center py-8">
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                     {t("stock.loadingUnusedProducts", "Loading unused products...")}
                   </div>
                 </div>
               ) : deleting ? (
                 <div className="flex flex-col items-center justify-center py-8 space-y-4">
                   <div className="flex items-center gap-2 text-muted-foreground">
                     <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                     {t("stock.deletingProducts", "Deleting products...")}
                   </div>
                   <div className="w-full max-w-xs">
                     <div className="flex justify-between text-sm text-muted-foreground mb-1">
                       <span>{deletionProgress.current} / {deletionProgress.total}</span>
                       <span>{Math.round((deletionProgress.current / deletionProgress.total) * 100)}%</span>
                     </div>
                     <div className="w-full bg-muted rounded-full h-2">
                       <div 
                         className="bg-red-600 h-2 rounded-full transition-all duration-300"
                         style={{ width: `${(deletionProgress.current / deletionProgress.total) * 100}%` }}
                       />
                     </div>
                   </div>
                 </div>
               ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-medium text-foreground mb-1">
              {t("stock.noUnusedProducts", "No Unused Products")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("stock.noUnusedProductsDesc", "No products found that match the selected criteria")}
            </p>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredProducts.length === 0}
                >
                  {t("stock.selectAll", "Select All")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedCount === 0}
                >
                  {t("stock.deselectAll", "Deselect All")}
                </Button>
              </div>
              <Badge variant="secondary">
                {`${selectedCount} selected`}
              </Badge>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                        {t("stock.product", "Product")}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                        {t("stock.category", "Category")}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                        {t("stock.lastSold", "Last Sold")}
                      </th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-muted-foreground">
                        {t("stock.actions", "Actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border hover:bg-muted/25">
                        <td className="px-4 py-2">
                          <div className="font-medium text-foreground">{product.name}</div>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline">{product.categoryName}</Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">
                          {formatDate(product.lastSoldDate)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleToggleProduct(product.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                productsToDelete.has(product.id)
                                  ? 'bg-red-600 border-red-600 text-white'
                                  : 'border-gray-300 hover:border-red-400 dark:border-gray-600 dark:hover:border-red-500'
                              }`}
                            >
                              {productsToDelete.has(product.id) && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveProduct(product.id)}
                              disabled={!productsToDelete.has(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* Smart pagination - only show limited pages */}
                    {(() => {
                      const maxVisiblePages = 5;
                      const halfVisible = Math.floor(maxVisiblePages / 2);
                      
                      let startPage = Math.max(1, currentPage - halfVisible);
                      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      // Adjust start if we're near the end
                      if (endPage - startPage < maxVisiblePages - 1) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      const pages = [];
                      
                      // Add first page and ellipsis if needed
                      if (startPage > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink
                              onClick={() => setCurrentPage(1)}
                              isActive={currentPage === 1}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        
                        if (startPage > 2) {
                          pages.push(
                            <PaginationItem key="ellipsis-start">
                              <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
                            </PaginationItem>
                          );
                        }
                      }
                      
                      // Add visible pages
                      for (let page = startPage; page <= endPage; page++) {
                        pages.push(
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      // Add ellipsis and last page if needed
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="ellipsis-end">
                              <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
                            </PaginationItem>
                          );
                        }
                        
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              onClick={() => setCurrentPage(totalPages)}
                              isActive={currentPage === totalPages}
                              className="cursor-pointer"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
