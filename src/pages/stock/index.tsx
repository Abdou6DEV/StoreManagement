import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import CategorySummaryTable from "./components/categorySummaryTable";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [view] = useState<"product" | "category">("product");
  const location = useLocation();
  const navigate = useNavigate();

  // Get notification action from navigation state
  const notificationAction = (location.state as { notificationAction?: string } | null)?.notificationAction;

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} />

      {view === "product" ? <StockTable notificationAction={notificationAction} /> : <CategorySummaryTable />}
    </main>
  );
}
