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
} from "lucide-react";

import { useState } from "react";

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

export const StockTable = ({
  handleDeleteProduct,
}: {
  handleDeleteProduct: (productId: string) => void;
}) => {
  const { t } = useTranslation();
  const { categories, products } = useStock();

  const [filters, setFilters] = useState({
    lowStock: false,
    bestSelling: false,
    worstSelling: false,
    search: "",
    category: "", // <-- add category filter
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProductID, setEditingProductID] = useState<string | null>(null);

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const itemsPerPage = 10;
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
  const paddingRows = itemsPerPage - paginatedProducts.length;

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-bold text-foreground">
          {t("stock.tableTitle", "Stock List")}
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder={t("stock.search")}
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring focus:ring-primary/30 transition max-w-[220px]"
            aria-label={t("stock.search")}
          />
          {/* Category Filter Dropdown */}
          <Popover>
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
                    {categories.map((cat) => (
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

      {/* Table */}
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
            {paginatedProducts.map((product) => {
              const profit = product.selling - product.bought;
              const totalBought = product.bought * product.quantity;
              const totalProfit = profit * product.quantity;

              return (
                <tr
                  key={product.id}
                  className="h-[48px] hover:bg-muted/40 transition"
                >
                  <td className="px-4">{product.name}</td>
                  <td className="px-4">{product.categoryName}</td>
                  <td className="px-4">{product.quantity}</td>
                  <td className="px-4">{product.bought}</td>
                  <td className="px-4">{product.selling}</td>
                  <td className="px-4 text-green-700">{profit}</td>
                  <td className="px-4">{totalBought}</td>
                  <td className="px-4 text-green-700 font-medium">
                    {totalProfit}
                  </td>
                  <td className="px-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditingProductID(product.id)}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
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
            })}

            {/* ✅ Padding rows here — outside the product map */}
            {Array.from({ length: paddingRows }).map((_, index) => (
              <tr
                key={`pad-${index}`}
                className="h-[48px] hover:bg-transparent transition"
              >
                <td className="px-4" colSpan={9}>
                  &nbsp;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Edit Product Dialog */}
      <Dialog modal open={!!editingProductID}>
        <DialogContent className="min-w-1/2" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {t("stock.editTitle", "Edit Product")}
                  </h2>
                  <p className="text-sm text-muted-foreground">Editing</p>
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
