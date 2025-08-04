import React, { useState } from "react";
import { useStock } from "../../../lib/contexts/stockContext";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { Button } from "../../../lib/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";
import { Package, Check, ChevronDown, Folder } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function CategorySummaryTable() {
  const { t } = useTranslation();
  const { products, categories } = useStock();

  // Add search state for category filtering
  const [categorySearch, setCategorySearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Add state for Popover open
  const [itemsPerPagePopoverOpen, setItemsPerPagePopoverOpen] = useState(false);

  // Aggregate data by category
  const summary = categories.map((cat) => {
    const catProducts = products.filter((p) => p.categoryName === cat);
    const totalQuantity = catProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalProfit = catProducts.reduce(
      (sum, p) => sum + (p.sellingPrice - p.boughtPrice) * p.quantity,
      0,
    );

    const totalBought = catProducts.reduce(
      (sum, p) => sum + p.boughtPrice * p.quantity,
      0,
    );

    const totalSelling = catProducts.reduce(
      (sum, p) => sum + p.sellingPrice * p.quantity,
      0,
    );

    return {
      category: cat,
      totalQuantity,
      totalProfit,
      totalBought,
      totalSelling,
    };
  });

  // Filtered summary by category search
  const filteredSummary = summary.filter((row) =>
    row.category.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  // Pagination logic for filtered summary
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSummary.length / itemsPerPage),
  );
  const paginatedSummary = filteredSummary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset page if filtered summary changes and current page is out of range
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredSummary.length, itemsPerPage, totalPages, currentPage]);

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex justify-between text-lg font-bold text-foreground flex-1">
          <span>{t("stock.categorySummary", "Stock by Category")}</span>
          <span>{t("stock.count", { val: filteredSummary.length })}</span>
        </h2>
      </div>
      {/* Controls Row: Items per page selector and search input, same line */}
      <div className="flex flex-wrap items-center gap-4 mb-2">
        {/* Items per page selector (Popover+Command) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("stock.itemsPerPage", "Items per page:")}
          </span>
          <Popover
            open={itemsPerPagePopoverOpen}
            onOpenChange={setItemsPerPagePopoverOpen}
          >
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
                          setCurrentPage(1);
                          setItemsPerPagePopoverOpen(false);
                        }}
                      >
                        {size}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            itemsPerPage === size ? "opacity-100" : "opacity-0",
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
        {/* Category search input */}
        <input
          type="text"
          placeholder={t("stock.searchType", "Search category...")}
          value={categorySearch}
          onChange={(e) => {
            setCategorySearch(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring focus:ring-primary/30 transition max-w-[220px]"
          aria-label={t("stock.searchType", "Search category")}
        />
      </div>
      {categories.length === 0 || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Package className="w-16 h-16 text-green-600 mb-2" />
          <h3 className="text-xl font-semibold text-foreground">
            {t("stock.emptyCategoryTitle")}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {t("stock.emptyCategoryDesc")}
          </p>
        </div>
      ) : filteredSummary.length === 0 ? (
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
          <div className="overflow-auto rounded-lg border border-grey-200 mt-5">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("stock.type")}</th>
                  <th className="px-4 py-3">{t("stock.quantity")}</th>
                  <th className="px-4 py-3">
                    {t("stock.totalBought", "Total Bought")}
                  </th>
                  <th className="px-4 py-3">
                    {t("stock.totalSelling", "Total Selling")}
                  </th>
                  <th className="px-4 py-3">
                    {t("stock.totalProfit", "Total Profit")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSummary.map((row) => (
                  <tr
                    key={row.category}
                    className="h-[48px] hover:bg-muted/40 transition"
                  >
                    <td className="px-4">{row.category}</td>
                    <td className="px-4">{row.totalQuantity}</td>
                    <td className="px-4">{row.totalBought}</td>
                    <td className="px-4">{row.totalSelling}</td>
                    <td className="px-4 text-green-700 font-medium">
                      {row.totalProfit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Total Summary Card (separated from table) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6 p-4 bg-muted/60 rounded-lg border border-border">
            <span className="font-semibold text-foreground text-base">
              {t("stock.total", "Total (All)")}:
            </span>
            <div className="flex flex-wrap gap-6 text-sm">
              <span>
                <span className="text-muted-foreground">
                  {t("stock.quantity")}:{" "}
                </span>
                <span className="font-medium">
                  {summary.reduce((sum, row) => sum + row.totalQuantity, 0)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">
                  {t("stock.totalBought", "Total Bought")}:{" "}
                </span>
                <span className="font-medium">
                  {summary.reduce((sum, row) => sum + row.totalBought, 0)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">
                  {t("stock.totalSelling", "Total Selling")}:{" "}
                </span>
                <span className="font-medium">
                  {summary.reduce((sum, row) => sum + row.totalSelling, 0)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">
                  {t("stock.totalProfit", "Total Profit")}:{" "}
                </span>
                <span className="font-bold text-green-900">
                  {summary.reduce((sum, row) => sum + row.totalProfit, 0)}
                </span>
              </span>
            </div>
          </div>
          {/* Pagination controls at the bottom, centered */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  {currentPage === 1 || filteredSummary.length === 0 ? (
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
                  {currentPage === totalPages ||
                  filteredSummary.length === 0 ? (
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
        </>
      )}
    </section>
  );
}
