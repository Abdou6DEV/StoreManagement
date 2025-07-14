import { useState, useEffect } from "react";
import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import { useStock } from "../../lib/contexts/stockContext";

const initialForm = {
  name: "",
  categoryName: "",
  quantity: 0,
  bought: 0,
  selling: 0,
  codebar: "",
};

export default function StockPage() {
  const { products, refetchProducts } = useStock();
  const [form, setForm] = useState(initialForm);

  const [openPanel, setOpenPanel] = useState<"add" | "edit" | null>(null);

  // When the name changes and matches an existing product, set the type to match the existing product
  useEffect(() => {
    const existing = products.find(
      (p) => p.name.toLowerCase().trim() === form.name.toLowerCase().trim(),
    );
    if (form.name === "") {
      if (form.categoryName !== "") {
        setForm((prev) => ({ ...prev, categoryName: "" }));
      }
    } else if (existing && form.categoryName !== existing.categoryName) {
      setForm((prev) => ({ ...prev, categoryName: existing.categoryName }));
    }
  }, [form.name, products]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await window.api.database.products.delete(productId);
      refetchProducts();
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  return (
    <main className="px-6 md:px-12 flex-1 space-y-10">
      {/* === Add Stock Section (Collapsible) === */}
      <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} />
      {/* === Edit Stock Section (Collapsible) === */}
      <StockTable handleDeleteProduct={handleDeleteProduct} />
    </main>
  );
}
