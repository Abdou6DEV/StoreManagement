import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function StockPage() {
  const { t } = useTranslation();

  const [filters, setFilters] = useState({
    lowStock: false,
    bestSelling: false,
    worstSelling: false,
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5; // Replace with dynamic value if needed

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <main className="py-10 px-6 md:px-12 ml-20 flex-1 space-y-10">
        <div className="text-sm text-muted-foreground mb-2">
         ⚠ louled eda w example brk. haka tkoun la structure ta3 lpaga.
        </div>

      {/* === Add Stock Section === */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("stock.addTitle", "Add Stock")}</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            { key: "product", type: "text" },
            { key: "type", type: "text" },
            { key: "quantity", type: "number" },
            { key: "bought", type: "number" },
            { key: "selling", type: "number" },
            { key: "codebar", type: "text" },
          ].map(({ key, type }) => (
            <div key={key} className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t(`stock.${key}`)}</label>
              <input
                type={type}
                placeholder={t(`stock.${key}`)}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
              />
            </div>
          ))}
        </div>

        <div className="pt-1">
          <button className="bg-primary hover:bg-primary/90 transition px-5 py-2 text-sm rounded-md text-primary-foreground font-semibold">
            {t("stock.addButton", "Add Product")}
          </button>
        </div>
      </section>

      {/* === Stock Table + Filters Combined === */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-bold text-foreground">{t("stock.tableTitle", "Stock List")}</h2>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center">
          {[
            { key: "lowStock", label: t("stock.lowStock") },
            { key: "bestSelling", label: t("stock.bestSelling") },
            { key: "worstSelling", label: t("stock.worstSelling") },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key as keyof typeof filters] as boolean}
                onChange={(e) => handleChange(key as any, e.target.checked)}
                className="h-4 w-4 rounded-sm border border-border accent-red-500"
              />
              {label}
            </label>
          ))}

          <input
            type="text"
            placeholder={t("stock.search")}
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/30 transition max-w-[220px]"
          />
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
                <th className="px-4 py-3">{t("stock.codebar")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/40 transition">
                <td className="px-4 py-3">iPhone 13</td>
                <td className="px-4 py-3">Phone</td>
                <td className="px-4 py-3">12</td>
                <td className="px-4 py-3">$500</td>
                <td className="px-4 py-3">$699</td>
                <td className="px-4 py-3">123456789</td>
              </tr>
              {/* More rows... */}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <button className="text-sm px-3 py-1 bg-muted rounded-md hover:bg-secondary transition">
            {t("stock.prev", "Previous")}
          </button>
          <span className="text-sm text-muted-foreground">{t("stock.page")} {currentPage} / {totalPages}</span>
          <button className="text-sm px-3 py-1 bg-muted rounded-md hover:bg-secondary transition">
            {t("stock.next", "Next")}
          </button>
        </div>
      </section>
    </main>
  );
}
