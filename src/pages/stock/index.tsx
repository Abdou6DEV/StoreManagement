import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import { Button } from "../../lib/components/button";
import CategorySummaryTable from "./components/categorySummaryTable";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [view, setView] = useState<"product" | "category">("product");
  const { t } = useTranslation();

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} />

      <div className="flex gap-2 mb-4 items-center">
        <Button
          variant={view === "product" ? "default" : "outline"}
          onClick={() => setView("product")}
        >
          {t("stock.viewByProduct", "View by Product")}
        </Button>
        <Button
          variant={view === "category" ? "default" : "outline"}
          onClick={() => setView("category")}
        >
          {t("stock.viewByCategory", "View by Category")}
        </Button>
      </div>

      {view === "product" ? <StockTable /> : <CategorySummaryTable />}
    </main>
  );
}
