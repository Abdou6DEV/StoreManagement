import React, { useState } from "react";
import { useStock } from "../../../lib/contexts/stockContext";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";

export default function CategorySummaryTable() {
  const { t } = useTranslation();
  const { products, categories } = useStock();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Aggregate data by category
  const summary = categories.map((cat) => {
    const catProducts = products.filter((p) => p.categoryName === cat);
    const totalQuantity = catProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalProfit = catProducts.reduce(
      (sum, p) => sum + (p.selling - p.bought) * p.quantity,
      0,
    );

    const totalBought = catProducts.reduce(
      (sum, p) => sum + p.bought * p.quantity,
      0,
    );

    const totalSelling = catProducts.reduce(
      (sum, p) => sum + p.selling * p.quantity,
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

  // Pagination logic for summary
  const totalPages = Math.max(1, Math.ceil(summary.length / itemsPerPage));
  const paginatedSummary = summary.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset page if categories change and current page is out of range
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [summary.length, itemsPerPage, totalPages, currentPage]);

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {t("stock.categorySummary", "Stock by Category")}
      </h2>
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
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">
              {t("stock.itemsPerPage", "Items per page:")}
            </span>
            <select
              className="px-2 py-1 border rounded text-sm bg-card"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label={t("stock.selectItemsPerPage", "Select items per page")}
            >
              {[5, 10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-auto rounded-lg border border-muted">
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
                {/* Total Row (always visible) */}
                <tr className="h-[48px] bg-muted/60 font-medium border-t border-border transition-colors duration-200 hover:bg-muted">
                  <td className="px-4 text-foreground">
                    {t("stock.total", "Total")}
                  </td>
                  <td className="px-4">
                    {summary.reduce((sum, row) => sum + row.totalQuantity, 0)}
                  </td>
                  <td className="px-4">
                    {summary.reduce((sum, row) => sum + row.totalBought, 0)}
                  </td>
                  <td className="px-4">
                    {summary.reduce((sum, row) => sum + row.totalSelling, 0)}
                  </td>
                  <td className="px-4 text-green-800">
                    {summary.reduce((sum, row) => sum + row.totalProfit, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Pagination controls at the bottom, centered */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 pt-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
              >
                {t("stock.prev", "Previous")}
              </button>
              <span className="text-sm text-muted-foreground">
                {t("stock.page")} {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
              >
                {t("stock.next", "Next")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
