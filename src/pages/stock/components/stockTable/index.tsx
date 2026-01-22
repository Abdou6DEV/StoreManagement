import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Package, Folder } from "lucide-react";
import { useStock } from "../../../../lib/contexts/stockContext";
import { useLowStock } from "../../../../lib/contexts/lowStockContext";
import { useOutOfStock } from "../../../../lib/contexts/outOfStockContext";
import { useToast } from "../../../../lib/contexts/toastContext";
import { ConfirmModal } from "../../../../lib/components/modal";
import { ProductInfoModal } from "../productInfoModal";
import { EditProductModal } from "../editProductModal";
import { CleanUnusedProductsModal } from "../../../../lib/components/cleanUnusedProductsModal";
import { StockRow } from "./stockRow";
import { TableHeader } from "./tableHeader";
import { Filters } from "./filters";
import { StockPagination } from "./pagination";
import { TotalsFooter } from "./totalsFooter";
import type {
  StockTableFilters,
  ConfirmDeleteState,
  ProductInfoState,
  CategorySummary,
} from "./types";

export const StockTable = ({ notificationAction }: { notificationAction?: string }) => {
  const { t } = useTranslation();
  const { categories, products, refetchProducts } = useStock();
  const { unseenLowStockCount, lowStockThreshold: contextThreshold, markLowStockAsSeen } = useLowStock();
  const { markOutOfStockAsSeen } = useOutOfStock();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<StockTableFilters>({
    lowStock: false,
    outOfStock: false,
    bestSelling: false,
    worstSelling: false,
    noBarcode: false,
    search: "",
    category: "",
  });
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingProductID, setEditingProductID] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    open: false,
    productId: null,
    productName: "",
  });
  const [productInfo, setProductInfo] = useState<ProductInfoState>({
    open: false,
    productId: null,
    data: null,
    loading: false,
  });
  const [viewMode, setViewMode] = useState<"product" | "category">("product");
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const hasMarkedAsSeenRef = useRef(false);
  const hasMarkedOutOfStockAsSeenRef = useRef(false);

  useEffect(() => {
    window.api.database.options
      .get("lowStockThreshold")
      .then((val) => setLowStockThreshold(val ? Number(val) : 0));
  }, []);

  useEffect(() => {
    // Reset to first page whenever view mode changes
    setCurrentPage(1);
  }, [viewMode]);

  // Handle notification actions
  useEffect(() => {
    if (notificationAction === 'outOfStock') {
      setFilters((prev) => ({ ...prev, outOfStock: true }));
    } else if (notificationAction === 'lowStock') {
      setFilters((prev) => ({ ...prev, lowStock: true }));
    }
  }, [notificationAction]);

  const handleChange = (
    key: keyof StockTableFilters,
    value: boolean | string,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    
    // Reset pagination to page 1 when search or category filters change
    if (key === "search" || key === "category") {
      setCurrentPage(1);
    }
  };

  // Helper function to get active filters summary
  const getActiveFiltersSummary = () => {
    const activeFilters = [];

    if (filters.lowStock) {
      activeFilters.push(t("stock.lowStock"));
    }
    if (filters.outOfStock) {
      activeFilters.push(t("stock.outOfStock", "Out of Stock"));
    }
    if (filters.bestSelling) {
      activeFilters.push(t("stock.bestSelling"));
    }
    if (filters.worstSelling) {
      activeFilters.push(t("stock.worstSelling"));
    }
    if (filters.noBarcode) {
      activeFilters.push(t("stock.noBarcode"));
    }

    if (filters.category) {
      activeFilters.push(filters.category);
    }
    if (filters.search) {
      activeFilters.push(`${t("stock.search")}: "${filters.search}"`);
    }

    return activeFilters;
  };

  // Helper function to get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.lowStock) count++;
    if (filters.outOfStock) count++;
    if (filters.bestSelling) count++;
    if (filters.worstSelling) count++;
    if (filters.noBarcode) count++;

    return count;
  };

  // Helper function to toggle a filter
  const toggleFilter = (
    filterKey: "lowStock" | "outOfStock" | "bestSelling" | "worstSelling" | "noBarcode",
  ) => {
    const newFilters = {
      ...filters,
      [filterKey]: !filters[filterKey],
    };

    // Enforce best/worst selling exclusivity
    if (newFilters.bestSelling && newFilters.worstSelling) {
      if (!filters.bestSelling) {
        newFilters.worstSelling = false;
      } else {
        newFilters.bestSelling = false;
      }
    }

    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Helper function to remove a filter by name
  const removeFilter = (filterName: string) => {
    const newFilters = { ...filters };

    if (filterName === t("stock.lowStock")) {
      newFilters.lowStock = false;
    } else if (filterName === t("stock.outOfStock", "Out of Stock")) {
      newFilters.outOfStock = false;
    } else if (filterName === t("stock.bestSelling")) {
      newFilters.bestSelling = false;
    } else if (filterName === t("stock.worstSelling")) {
      newFilters.worstSelling = false;
    } else if (filterName === t("stock.noBarcode")) {
      newFilters.noBarcode = false;
    }

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setConfirmDelete({
      open: true,
      productId,
      productName: product.name,
    });
  };

  const handleViewProductInfo = async (productId: string) => {
    setProductInfo({
      open: true,
      productId,
      data: null,
      loading: true,
    });

    try {
      const productData =
        await window.api.database.products.getWithPurchaseHistory(productId);
      setProductInfo((prev) => ({
        ...prev,
        data: productData,
        loading: false,
      }));
    } catch (error) {
      showToast(
        t("stock.toastInfoError", "Failed to load product information"),
        "error",
      );
      setProductInfo((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  };

  const confirmDeleteProduct = async () => {
    if (!confirmDelete.productId) return;

    try {
      await window.api.database.products.delete(confirmDelete.productId);
      showToast(
        t("stock.toastDeleteSuccess", "Product deleted successfully!"),
        "success",
      );
      refetchProducts();
    } catch (err) {
      showToast(
        t("stock.toastDeleteError", "Failed to delete product"),
        "error",
      );
    }
  };

  // Filter products based on search input, category, low stock, out of stock, and barcode
  const filteredList = products.filter((product) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      (product.codebar && product.codebar.toLowerCase().includes(search));
    const matchesCategory =
      !filters.category || product.categoryName === filters.category;
    const threshold = lowStockThreshold;
    const matchesLowStock = !filters.lowStock || (product.quantity > 0 && product.quantity <= threshold);
    const matchesOutOfStock = !filters.outOfStock || product.quantity === 0;
    const matchesNoBarcode =
      !filters.noBarcode || !product.codebar || product.codebar.trim() === "";
    return (
      matchesSearch && matchesCategory && matchesLowStock && matchesOutOfStock && matchesNoBarcode
    );
  });

  // Identify newly low stock products (products that are low stock but haven't been seen)
  // We need to capture this BEFORE the filter is applied to avoid timing issues
  // Exclude products with quantity = 0 (those are out of stock, not low stock)
  const getNewlyLowStockProductIds = () => {
    if (!products.length || lowStockThreshold === 0) return new Set();
    
    const lowStockProducts = products.filter(product => product.quantity > 0 && product.quantity <= lowStockThreshold);
    const seenProducts = JSON.parse(localStorage.getItem('seenLowStockProducts') || '[]');
    const seenSet = new Set(seenProducts);
    
    const newlyLowStockIds = lowStockProducts
      .filter(product => !seenSet.has(product.id))
      .map(product => product.id);
    
    return new Set(newlyLowStockIds);
  };

  // Identify newly out of stock products (products that are out of stock but haven't been seen)
  const getNewlyOutOfStockProductIds = () => {
    if (!products.length) return new Set();
    
    const outOfStockProducts = products.filter(product => product.quantity === 0);
    const seenProducts = JSON.parse(localStorage.getItem('seenOutOfStockProducts') || '[]');
    const seenSet = new Set(seenProducts);
    
    const newlyOutOfStockIds = outOfStockProducts
      .filter(product => !seenSet.has(product.id))
      .map(product => product.id);
    
    return new Set(newlyOutOfStockIds);
  };

  // Capture newly low stock and out of stock products BEFORE any filtering/sorting happens
  const newlyLowStockProductIds = getNewlyLowStockProductIds();
  const newlyOutOfStockProductIds = getNewlyOutOfStockProductIds();

  // Mark low stock products as seen when the low stock filter is deactivated
  useEffect(() => {
    // When low stock filter is turned OFF, mark all current low stock products as seen
    if (!filters.lowStock && hasMarkedAsSeenRef.current) {
      markLowStockAsSeen();
      hasMarkedAsSeenRef.current = false;
    }
  }, [filters.lowStock, markLowStockAsSeen]);

  // Mark low stock products as seen when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // When component unmounts, mark all current low stock products as seen
      if (filters.lowStock && hasMarkedAsSeenRef.current) {
        markLowStockAsSeen();
      }
    };
  }, [filters.lowStock, markLowStockAsSeen]);

  // Track when we start viewing low stock products
  useEffect(() => {
    if (filters.lowStock && newlyLowStockProductIds.size > 0) {
      hasMarkedAsSeenRef.current = true;
    }
  }, [filters.lowStock, newlyLowStockProductIds.size]);

  // Mark out of stock products as seen when the out of stock filter is deactivated
  useEffect(() => {
    // When out of stock filter is turned OFF, mark all current out of stock products as seen
    if (!filters.outOfStock && hasMarkedOutOfStockAsSeenRef.current) {
      markOutOfStockAsSeen();
      hasMarkedOutOfStockAsSeenRef.current = false;
    }
  }, [filters.outOfStock, markOutOfStockAsSeen]);

  // Mark out of stock products as seen when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // When component unmounts, mark all current out of stock products as seen
      if (filters.outOfStock && hasMarkedOutOfStockAsSeenRef.current) {
        markOutOfStockAsSeen();
      }
    };
  }, [filters.outOfStock, markOutOfStockAsSeen]);

  // Track when we start viewing out of stock products
  useEffect(() => {
    if (filters.outOfStock && newlyOutOfStockProductIds.size > 0) {
      hasMarkedOutOfStockAsSeenRef.current = true;
    }
  }, [filters.outOfStock, newlyOutOfStockProductIds.size]);

  // Sort the filtered list
  const sortedList = [...filteredList];
  
  if (filters.bestSelling) {
    sortedList.sort((a, b) => {
      const soldA = a.totalSold ?? 0;
      const soldB = b.totalSold ?? 0;
      return soldB - soldA;
    });
  } else if (filters.worstSelling) {
    sortedList.sort((a, b) => {
      const soldA = a.totalSold ?? 0;
      const soldB = b.totalSold ?? 0;
      return soldA - soldB;
    });
  } else if (filters.outOfStock) {
    // When out of stock filter is active, prioritize newly out of stock products first
    sortedList.sort((a, b) => {
      const aIsNewlyOutOfStock = newlyOutOfStockProductIds.has(a.id);
      const bIsNewlyOutOfStock = newlyOutOfStockProductIds.has(b.id);
      
      // Newly out of stock products come first
      if (aIsNewlyOutOfStock && !bIsNewlyOutOfStock) return -1;
      if (!aIsNewlyOutOfStock && bIsNewlyOutOfStock) return 1;
      
      // Within each group, sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
  } else if (filters.lowStock) {
    // When low stock filter is active, prioritize newly low stock products first
    sortedList.sort((a, b) => {
      const aIsNewlyLowStock = newlyLowStockProductIds.has(a.id);
      const bIsNewlyLowStock = newlyLowStockProductIds.has(b.id);
      
      // Newly low stock products come first
      if (aIsNewlyLowStock && !bIsNewlyLowStock) return -1;
      if (!aIsNewlyLowStock && bIsNewlyLowStock) return 1;
      
      // Within each group, sort by quantity (lowest first for low stock)
      return a.quantity - b.quantity;
    });
  } else {
    // Default sorting by quantity (highest to lowest)
    sortedList.sort((a, b) => b.quantity - a.quantity);
  }

  const totalPages = Math.max(1, Math.ceil(sortedList.length / itemsPerPage));
  const paginatedProducts = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const getCategorySummaries = (): CategorySummary[] => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryName === cat);
      const totalQuantity = catProducts.reduce((sum, p) => sum + p.quantity, 0);
      const totalBought = catProducts.reduce(
        (sum, p) => sum + p.boughtPrice * p.quantity,
        0,
      );
      const totalSelling = catProducts.reduce(
        (sum, p) => sum + p.sellingPrice * p.quantity,
        0,
      );
      const totalProfit = totalSelling - totalBought;

      return {
        category: cat,
        totalQuantity,
        totalBought,
        totalSelling,
        totalProfit,
      };
    });
  };

  // Filter category summaries based on search
  const filteredCategorySummaries = getCategorySummaries().filter((row) =>
    row.category.toLowerCase().includes(filters.search.toLowerCase()),
  );

  const handleViewModeChange = () => {
    setViewMode(viewMode === "product" ? "category" : "product");
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCleanUnusedProducts = () => {
    setCleanupModalOpen(true);
  };

  const handleCleanupSuccess = () => {
    refetchProducts();
    showToast(t("stock.toastDeleteSuccess", "Products cleaned up successfully"), "success");
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <TableHeader
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onCleanUnusedProducts={handleCleanUnusedProducts}
      />

      <Filters
        filters={filters}
        viewMode={viewMode}
        categories={categories}
        itemsPerPage={itemsPerPage}
        onFilterChange={handleChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        onToggleFilter={toggleFilter}
        onRemoveFilter={removeFilter}
        getActiveFilterCount={getActiveFilterCount}
        getActiveFiltersSummary={getActiveFiltersSummary}
      />

      {/* Table or Empty State */}
      {viewMode === "product" ? (
        paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Package className="w-16 h-16 text-green-600 mb-2" />
            <h3 className="text-xl font-semibold text-foreground">
              {t("stock.emptyProductTitle")}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {t("stock.emptyProductDesc")}
            </p>
          </div>
        ) : (
          <div className="table-container overflow-auto rounded-lg border border-muted">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("stock.product")}</th>
                  <th className="px-4 py-3">{t("stock.type")}</th>
                  <th className="px-4 py-3">{t("stock.quantity")}</th>
                  <th className="px-4 py-3">{t("stock.boughtPrice")}</th>
                  <th className="px-4 py-3">{t("stock.sellingPrice")}</th>
                  <th className="px-4 py-3">{t("stock.profit", "Profit")}</th>
                  <th className="px-4 py-3">
                    {t("stock.totalSold", "Total Sold")}
                  </th>
                  <th className="px-4 py-3">
                    {t("stock.totalProfit", "Total Profit")}
                  </th>
                  <th className="px-4 py-3">{t("stock.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProducts.map((product) => (
                  <StockRow
                    key={product.id}
                    product={product}
                    setEditingProductID={setEditingProductID}
                    handleDeleteProduct={handleDeleteProduct}
                    handleViewProductInfo={handleViewProductInfo}
                    isNewlyLowStock={newlyLowStockProductIds.has(product.id)}
                    isNewlyOutOfStock={newlyOutOfStockProductIds.has(product.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : filteredCategorySummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Folder className="w-16 h-16 text-green-600 mb-2" />
          <h3 className="text-xl font-semibold text-foreground">
            {t("stock.emptyCategoryTitle")}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {t("stock.emptyCategoryDesc")}
          </p>
        </div>
      ) : (
        <>
          <div className="table-container overflow-auto rounded-lg border border-muted">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("stock.category")}</th>
                  <th className="px-4 py-3">
                    {t("stock.productCount", "Products")}
                  </th>
                  <th className="px-4 py-3">{t("stock.totalQuantity")}</th>
                  <th className="px-4 py-3">{t("stock.totalBought")}</th>
                  <th className="px-4 py-3">{t("stock.totalSelling")}</th>
                  <th className="px-4 py-3">{t("stock.totalProfit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategorySummaries
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage,
                  )
                  .map((row) => {
                    const categoryProducts = products.filter(
                      (p) => p.categoryName === row.category,
                    );
                    return (
                      <tr
                        key={row.category}
                        className="h-[48px] hover:bg-muted/40 transition"
                      >
                        <td className="px-4">{row.category}</td>
                        <td className="px-4"><span className="text-[0.9375rem]">{categoryProducts.length}</span></td>
                        <td className="px-4"><span className="text-[0.9375rem]">{row.totalQuantity.toLocaleString('fr-FR')}</span></td>
                        <td className="px-4 whitespace-nowrap">
                          <span className="text-[0.9375rem]">{row.totalBought.toLocaleString('fr-FR')} {t("cashier.currency")}</span>
                        </td>
                        <td className="px-4 whitespace-nowrap">
                          <span className="text-[0.9375rem]">{row.totalSelling.toLocaleString('fr-FR')} {t("cashier.currency")}</span>
                        </td>
                        <td className="px-4 text-green-700 font-medium whitespace-nowrap">
                          <span className="text-[0.9375rem]">{row.totalProfit.toLocaleString('fr-FR')} {t("cashier.currency")}</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination - works for both views */}
      <StockPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        viewMode={viewMode}
        filteredCategorySummaries={filteredCategorySummaries}
        itemsPerPage={itemsPerPage}
      />

      {/* Simplified Totals Footer */}
      <TotalsFooter filteredList={filteredList} />

      {/* Edit Product Modal */}
      <EditProductModal
        open={!!editingProductID}
        onOpenChange={(open) => !open && setEditingProductID(null)}
        productId={editingProductID}
        setProductId={setEditingProductID}
        products={products}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, open: false }))}
        title={t("stock.confirmDeleteTitle", "Delete Product")}
        message={t(
          "stock.confirmDeleteMessage",
          "Are you sure you want to delete '{{name}}'? This will also delete all sales records related to this product. This action cannot be undone.",
          { name: confirmDelete.productName },
        )}
        confirmText={t("stock.delete", "Delete")}
                    cancelText={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDeleteProduct}
      />

      {/* Product Info Modal */}
      <ProductInfoModal
        open={productInfo.open}
        onOpenChange={(open) =>
          !open &&
          setProductInfo({
            open: false,
            productId: null,
            data: null,
            loading: false,
          })
        }
        productData={productInfo.data}
        loading={productInfo.loading}
      />

      <CleanUnusedProductsModal
        open={cleanupModalOpen}
        onOpenChange={setCleanupModalOpen}
        onSuccess={handleCleanupSuccess}
      />
    </section>
  );
};
