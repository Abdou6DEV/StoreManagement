import { useState } from "react";
import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | "edit" | null>(null);

  return (
    <main className="px-6 md:px-12 flex-1 space-y-10">
      <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} />
      <StockTable />
    </main>
  );
}
