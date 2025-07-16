import { useStock } from "../../../lib/contexts/stockContext";
import { useTranslation } from "react-i18next";

export default function CategorySummaryTable() {
  const { t } = useTranslation();
  const { products, categories } = useStock();

  // Aggregate data by category
  const summary = categories.map((cat) => {
    const catProducts = products.filter((p) => p.categoryName === cat);
    const totalQuantity = catProducts.reduce((sum, p) => sum + p.quantity, 0);
    const totalProfit = catProducts.reduce(
      (sum, p) => sum + (p.selling - p.bought) * p.quantity,
      0
    );

    const totalBought = catProducts.reduce(
      (sum, p) => sum + p.bought * p.quantity,
      0
    );

    const totalSelling = catProducts.reduce(
      (sum, p) => sum + p.selling * p.quantity,
      0
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
      <div className="overflow-auto rounded-lg border border-muted">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("stock.type")}</th>
              <th className="px-4 py-3">{t("stock.quantity")}</th>
              <th className="px-4 py-3">{t("stock.totalBought", "Total Bought")}</th>
              <th className="px-4 py-3">{t("stock.totalSelling", "Total Selling")}</th>
              <th className="px-4 py-3">{t("stock.totalProfit", "Total Profit")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.category} className="h-[48px] hover:bg-muted/40 transition">
                <td className="px-4">{row.category}</td>
                <td className="px-4">{row.totalQuantity}</td>
                <td className="px-4">{row.totalBought}</td>
                <td className="px-4">{row.totalSelling}</td>
                <td className="px-4 text-green-700 font-medium">{row.totalProfit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
} 