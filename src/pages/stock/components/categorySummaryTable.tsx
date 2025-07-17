import { useStock } from "../../../lib/contexts/stockContext";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";

export default function CategorySummaryTable() {
  const { t } = useTranslation();
  const { products, categories } = useStock();

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

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <h2 className="text-lg font-bold text-foreground mb-4">
        {t("stock.categorySummary", "Stock by Category")}
      </h2>
      {(categories.length === 0 || products.length === 0) ? (
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
              {summary.map((row) => (
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
              {/* Total Row */}
              <tr className="h-[48px] bg-muted/60 font-medium border-t border-border transition-colors duration-200 hover:bg-muted">
                <td className="px-4 text-foreground">{t("stock.total", "Total")}</td>
                <td className="px-4">{summary.reduce((sum, row) => sum + row.totalQuantity, 0)}</td>
                <td className="px-4">{summary.reduce((sum, row) => sum + row.totalBought, 0)}</td>
                <td className="px-4">{summary.reduce((sum, row) => sum + row.totalSelling, 0)}</td>
                <td className="px-4 text-green-800">{summary.reduce((sum, row) => sum + row.totalProfit, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
