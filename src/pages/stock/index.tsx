import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import CategorySummaryTable from "./components/categorySummaryTable";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [view] = useState<"product" | "category">("product");

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} />

      {view === "product" ? <StockTable /> : <CategorySummaryTable />}
    </main>
  );
}