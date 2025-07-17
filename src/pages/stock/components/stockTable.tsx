import { useTranslation } from "react-i18next";
import { useStock } from "../../../lib/contexts/stockContext";

import {
  Edit,
  X,
  Check,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
} from "lucide-react";

import React, { useState } from "react";

import { cn } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../lib/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/ui/popover";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../lib/components/ui/toggleGroup";
import { Button } from "../../../lib/components/ui/button";
import EditStockForm from "./editStockForm";
import { Product } from "@prisma/client";

export const StockTable = () => {
  const { t } = useTranslation();
  const { categories, products, refetchProducts } = useStock();

  const [filters, setFilters] = useState({
    lowStock: false,
    bestSelling: false,
    worstSelling: false,
    search: "",
    category: "", // <-- add category filter
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingProductID, setEditingProductID] = useState<string | null>(null);
  
  // Add state for category search input and dropdown open
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await window.api.database.products.delete(productId);
      refetchProducts();
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  // Filter products based on search input and category
  const filteredList = products.filter((product) => {
    const search = filters.search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      product.categoryName.toLowerCase().includes(search) ||
      (product.codebar && product.codebar.toLowerCase().includes(search));
    const matchesCategory =
      !filters.category || product.categoryName === filters.category;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedProducts = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const StockRow = React.memo(function StockRow({
    product,
    setEditingProductID,
    handleDeleteProduct,
    t,
  }: {
    product: Product;
    setEditingProductID: (id: string) => void;
    handleDeleteProduct: (id: string) => void;
    t: any;
  }) {
    const profit = product.selling - product.bought;
    const totalBought = product.bought * product.quantity;
    const totalProfit = profit * product.quantity;
    return (
      <tr key={product.id} className="h-[48px] hover:bg-muted/40 transition">
        <td className="px-4">{product.name}</td>
        <td className="px-4">{product.categoryName}</td>
        <td className="px-4">{product.quantity}</td>
        <td className="px-4">{product.bought}</td>
        <td className="px-4">{product.selling}</td>
        <td className="px-4 text-green-700">{profit}</td>
        <td className="px-4">{totalBought}</td>
        <td className="px-4 text-green-700 font-medium">{totalProfit}</td>
        <td className="px-4">
          <div className="flex gap-2">
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
          <span>{t("stock.tableTitle", "Stock List")}</span>
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
          <Popover open={categoryDropdownOpen} onOpenChange={(open) => {
            setCategoryDropdownOpen(open);
            if (open) setCategorySearch(""); // Reset search when opening
          }}>
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
                        cat.toLowerCase().includes(categorySearch.toLowerCase())
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
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={Object.entries(filters)
            .filter(([, v]) => typeof v === "boolean" && v)
            .map(([k]) => k)}
          onValueChange={(values) => {
            // Build new state preserving search and category
            const newFilters = {
              ...filters, // preserves search and category
              lowStock: values.includes("lowStock"),
              bestSelling: values.includes("bestSelling"),
              worstSelling: values.includes("worstSelling"),
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
          }}
          className="gap-1"
        >
          <ToggleGroupItem
            value="lowStock"
            aria-label={t("stock.lowStock")}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              filters.lowStock &&
                "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700",
            )}
          >
            <AlertTriangle
              className={cn(
                "w-4 h-4",
                filters.lowStock ? "text-yellow-500" : "text-muted-foreground",
              )}
            />
            {t("stock.lowStock")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bestSelling"
            aria-label={t("stock.bestSelling")}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              filters.bestSelling &&
                "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700",
            )}
          >
            <TrendingUp
              className={cn(
                "w-4 h-4",
                filters.bestSelling
                  ? "text-green-600"
                  : "text-muted-foreground",
              )}
            />
            {t("stock.bestSelling")}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="worstSelling"
            aria-label={t("stock.worstSelling")}
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              filters.worstSelling &&
                "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700",
            )}
          >
            <TrendingDown
              className={cn(
                "w-4 h-4",
                filters.worstSelling ? "text-red-600" : "text-muted-foreground",
              )}
            />
            {t("stock.worstSelling")}
          </ToggleGroupItem>
        </ToggleGroup>
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
        <div className="overflow-auto rounded-lg border border-muted">
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
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6 pt-4">
          <button
            disabled={currentPage === 1 || products.length === 0}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
          >
            {t("stock.prev", "Previous")}
          </button>

          <span className="text-sm text-muted-foreground">
            {t("stock.page")} {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages || products.length === 0}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
          >
            {t("stock.next", "Next")}
          </button>
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog modal open={!!editingProductID}>
        <DialogContent className="min-w-1/2" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Edit className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {t("stock.editTitle", "Edit Product")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Editing{" "}
                    {products.find((product) => product.id === editingProductID)
                      ?.name || "Unknown"}
                  </p>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <EditStockForm
            productID={editingProductID}
            setProductID={setEditingProductID}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};
