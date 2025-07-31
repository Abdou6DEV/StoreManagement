import { useTranslation } from "react-i18next";
import { useStock } from "../../../lib/contexts/stockContext";
import { useToast } from "../../../lib/contexts/toastContext";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";

import {
  Edit,
  Info,
  X,
  Check,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  QrCode,
  Filter,
} from "lucide-react";

import React, { useState, useEffect } from "react";

import { cn } from "../../../lib/utils";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";

import { Button } from "../../../lib/components/button";
import { ProductInfoModal } from "./productInfoModal";
import { EditProductModal } from "./editProductModal";
import type { ProductWithSales } from "../../../types";
import { Tooltip } from "../../../lib/components/tooltip";
import {
  handleTooltipEnter,
  handleTooltipLeave,
} from "../../../lib/utils/tooltipUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";

export const StockTable = () => {
  const { t } = useTranslation();
  const { categories, products, refetchProducts } = useStock();
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    lowStock: false,
    bestSelling: false,
    worstSelling: false,
    noBarcode: false,
    search: "",
    category: "",
  });
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(0); // Now a number, from DB
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingProductID, setEditingProductID] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    productId: string | null;
    productName: string;
  }>({ open: false, productId: null, productName: "" });
  const [productInfo, setProductInfo] = useState<{
    open: boolean;
    productId: string | null;
    data: any | null;
    loading: boolean;
  }>({ open: false, productId: null, data: null, loading: false });

  useEffect(() => {
    window.api.database.options
      .get("lowStockThreshold")
      .then((val) => setLowStockThreshold(val ? Number(val) : 0));
  }, []);

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Helper function to get active filters summary
  const getActiveFiltersSummary = () => {
    const activeFilters = [];

    if (filters.lowStock) {
      activeFilters.push(t("stock.lowStock"));
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
    if (filters.bestSelling) count++;
    if (filters.worstSelling) count++;
    if (filters.noBarcode) count++;
    return count;
  };

  // Helper function to toggle a filter
  const toggleFilter = (
    filterKey: "lowStock" | "bestSelling" | "worstSelling" | "noBarcode",
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

  // Filter products based on search input, category, low stock, and barcode
  const filteredList = products.filter((product) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      product.categoryName.toLowerCase().includes(search) ||
      (product.codebar && product.codebar.toLowerCase().includes(search));
    const matchesCategory =
      !filters.category || product.categoryName === filters.category;
    const threshold = lowStockThreshold;
    const matchesLowStock = !filters.lowStock || product.quantity <= threshold;
    const matchesNoBarcode =
      !filters.noBarcode || !product.codebar || product.codebar.trim() === "";
    return (
      matchesSearch && matchesCategory && matchesLowStock && matchesNoBarcode
    );
  });

  // Sort for bestSelling or worstSelling
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
  }

  const totalPages = Math.max(1, Math.ceil(sortedList.length / itemsPerPage));
  const paginatedProducts = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const StockRow = React.memo(function StockRow({
    product,
    setEditingProductID,
    handleDeleteProduct,
    handleViewProductInfo,
  }: {
    product: ProductWithSales;
    setEditingProductID: (id: string) => void;
    handleDeleteProduct: (id: string) => void;
    handleViewProductInfo: (id: string) => void;
  }) {
    const { t } = useTranslation();
    const profit = product.selling - product.bought;
    const totalBought = product.bought * product.quantity;
    const totalProfit = profit * (product.totalSold ?? 0);

    return (
      <tr key={product.id} className="h-[48px] hover:bg-muted/40 transition">
        <td className="px-4">{product.name}</td>
        <td className="px-4">{product.categoryName}</td>
        <td className="px-4">{product.quantity}</td>
        <td className="px-4">{product.bought}</td>
        <td className="px-4">{product.selling}</td>
        <td className="px-4 text-green-700 font-medium">{profit}</td>
        <td className="px-4">{totalBought}</td>
        <td className="px-4">{product.totalSold ?? 0}</td>
        <td className="px-4 text-green-700 font-medium">{totalProfit}</td>
        <td className="px-4">
          <div className="flex gap-2">
            <Button
              onClick={() => handleViewProductInfo(product.id)}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
            >
              <Info className="w-3 h-3" />
              {t("stock.view", "View")}
            </Button>
            <Button
              onClick={() => setEditingProductID(product.id)}
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
            >
              <Edit className="w-3 h-3" />
              {t("stock.edit", "Edit")}
            </Button>
            <Button
              onClick={() => handleDeleteProduct(product.id)}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              <X className="w-3 h-3" />
              {t("stock.delete", "Delete")}
            </Button>
          </div>
        </td>
      </tr>
    );
  });

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex justify-between text-lg font-bold text-foreground flex-1">
          <span>{t("stock.tableTitle", "Stock by Product")}</span>
          <span>{t("stock.count", { val: filteredList.length })}</span>
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("stock.itemsPerPage", "Items per page:")}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="px-3 py-1.5 min-w-[70px]"
                  aria-label={t(
                    "stock.selectItemsPerPage",
                    "Select items per page",
                  )}
                >
                  {itemsPerPage}
                  <ChevronDown className="ml-2 w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[120px] p-0 z-50">
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandGroup>
                      {[5, 10, 25, 50, 100].map((size) => (
                        <CommandItem
                          key={size}
                          value={size.toString()}
                          onSelect={() => {
                            setItemsPerPage(size);
                            setCurrentPage(1); // Reset to first page
                          }}
                        >
                          {size}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              itemsPerPage === size
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <input
            type="text"
            placeholder={t("stock.search")}
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring focus:ring-primary/30 transition max-w-[220px]"
            aria-label={t("stock.search")}
          />
          {/* Category Filter Dropdown */}
          <Popover
            open={categoryDropdownOpen}
            onOpenChange={(open) => {
              setCategoryDropdownOpen(open);
              if (open) setCategorySearch(""); // Reset search when opening
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-1.5"
                aria-label={t("stock.filterByCategory", "Filter by category")}
              >
                {filters.category
                  ? filters.category
                  : t("stock.allCategories", "All Categories")}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t("stock.searchType")}
                  className="h-9"
                  value={categorySearch}
                  onValueChange={setCategorySearch}
                />
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      key="all"
                      value=""
                      onSelect={() => handleChange("category", "")}
                    >
                      {t("stock.allCategories", "All Categories")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          !filters.category ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    {categories
                      .filter((cat) =>
                        cat
                          .toLowerCase()
                          .includes(categorySearch.toLowerCase()),
                      )
                      .map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => handleChange("category", cat)}
                        >
                          {cat}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              filters.category === cat
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Filters Section */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="relative inline-block">
              <Button
                variant="outline"
                className="px-3 py-1.5 min-w-[120px] justify-start"
                aria-label={t("stock.filters", "Filters")}
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}
              >
                <Filter className="w-4 h-4 mr-2" />
                {getActiveFilterCount() > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {getActiveFiltersSummary()
                      .slice(0, 2)
                      .map((filter, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {filter}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter(filter);
                            }}
                            className="ml-1 hover:bg-primary/20 rounded-full w-3 h-3 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2 h-2" />
                          </span>
                        </span>
                      ))}
                    {getActiveFilterCount() > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{getActiveFilterCount() - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  t("stock.filters", "Filters")
                )}
                <ChevronDown className="ml-auto w-4 h-4" />
              </Button>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full z-[9999] whitespace-nowrap px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black text-xs opacity-0 scale-95 transition-all duration-200">
                {t(
                  "stock.filtersTooltip",
                  "Filter products by various criteria",
                )}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 z-50">
            <div className="py-1">
              <Tooltip
                content={t(
                  "stock.lowStockTooltip",
                  "Show products with quantity below threshold",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => toggleFilter("lowStock")}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4",
                      filters.lowStock
                        ? "text-yellow-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.lowStock")}</span>
                  {filters.lowStock && (
                    <Check className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.bestSellingTooltip",
                  "Show products with highest sales",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => toggleFilter("bestSelling")}
                >
                  <TrendingUp
                    className={cn(
                      "w-4 h-4",
                      filters.bestSelling
                        ? "text-green-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.bestSelling")}</span>
                  {filters.bestSelling && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.worstSellingTooltip",
                  "Show products with lowest sales",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => toggleFilter("worstSelling")}
                >
                  <TrendingDown
                    className={cn(
                      "w-4 h-4",
                      filters.worstSelling
                        ? "text-red-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.worstSelling")}</span>
                  {filters.worstSelling && (
                    <Check className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.noBarcodeTooltip",
                  "Show products without barcode",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "200px" }}
                  onClick={() => toggleFilter("noBarcode")}
                >
                  <QrCode
                    className={cn(
                      "w-4 h-4",
                      filters.noBarcode
                        ? "text-orange-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.noBarcode")}</span>
                  {filters.noBarcode && (
                    <Check className="w-4 h-4 text-orange-600" />
                  )}
                </div>
              </Tooltip>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table or Empty State */}
      {paginatedProducts.length === 0 ? (
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
                <th className="px-4 py-3">{t("stock.bought")}</th>
                <th className="px-4 py-3">{t("stock.selling")}</th>
                <th className="px-4 py-3">{t("stock.profit", "Profit")}</th>
                <th className="px-4 py-3">
                  {t("stock.totalBought", "Total Bought")}
                </th>
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              {currentPage === 1 || products.length === 0 ? (
                <span className="opacity-50 pointer-events-none select-none">
                  <PaginationPrevious href="#" />
                </span>
              ) : (
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(currentPage - 1);
                  }}
                  href="#"
                />
              )}
            </PaginationItem>
            {/* Page numbers with ellipsis if needed */}
            {(() => {
              const items = [];
              let start = Math.max(1, currentPage - 2);
              let end = Math.min(totalPages, currentPage + 2);
              if (currentPage <= 3) {
                end = Math.min(5, totalPages);
              } else if (currentPage >= totalPages - 2) {
                start = Math.max(1, totalPages - 4);
              }
              if (start > 1) {
                items.push(
                  <PaginationItem key="start-ellipsis">
                    <PaginationEllipsis />
                  </PaginationItem>,
                );
              }
              for (let i = start; i <= end; i++) {
                items.push(
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={i === currentPage}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i);
                      }}
                    >
                      {i}
                    </PaginationLink>
                  </PaginationItem>,
                );
              }
              if (end < totalPages) {
                items.push(
                  <PaginationItem key="end-ellipsis">
                    <PaginationEllipsis />
                  </PaginationItem>,
                );
              }
              return items;
            })()}
            <PaginationItem>
              {currentPage === totalPages || products.length === 0 ? (
                <span className="opacity-50 pointer-events-none select-none">
                  <PaginationNext href="#" />
                </span>
              ) : (
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(currentPage + 1);
                  }}
                  href="#"
                />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        open={!!editingProductID}
        onOpenChange={(open) => !open && setEditingProductID(null)}
        productId={editingProductID}
        setProductId={setEditingProductID}
        products={products}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title={t("stock.confirmDeleteTitle", "Delete Product")}
        message={t(
          "stock.confirmDeleteMessage",
          "Are you sure you want to delete '{{name}}'? This will also delete all sales records related to this product. This action cannot be undone.",
          { name: confirmDelete.productName },
        )}
        confirmText={t("stock.delete", "Delete")}
        cancelText={t("stock.cancel", "Cancel")}
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
    </section>
  );
};
