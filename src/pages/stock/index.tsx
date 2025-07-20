import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import { Button } from "../../lib/components/ui/button";
import CategorySummaryTable from "./components/categorySummaryTable";
import { useStock } from "../../lib/contexts/stockContext";
import { Loader2 } from "lucide-react";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | "edit" | null>(null);
  const [view, setView] = useState<"product" | "category">("product");
  const { t } = useTranslation();
  const { refetchProducts, refetchCategories } = useStock();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTestProducts = async () => {
    setIsGenerating(true);
    try {
      const categories = ["Electronics", "Clothing", "Food", "Furniture", "Books"];
      
      // Ensure categories exist
      await Promise.all(categories.map(cat => window.api.database.categories.ensure(cat)));
      
      // Generate 10,000 test products
      for (let i = 0; i < 10000; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const boughtPrice = Math.floor(Math.random() * 900) + 100;
        
        await window.api.database.products.add({
          name: `TestProduct${i + 1}`,
          categoryName: category,
          quantity: Math.floor(Math.random() * 100) + 1,
          bought: boughtPrice,
          selling: Math.floor(boughtPrice * (1.1 + Math.random() * 0.4)), // 10-50% markup
          codebar: `TEST${Math.floor(Math.random() * 900000000) + 100000000}`
        });

        // Update progress every 500 products
        if (i % 500 === 0) {
          console.log(`Generated ${i} products...`);
        }
      }

      await refetchProducts();
      await refetchCategories();
      alert("Successfully generated 10,000 test products!");
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate test products");
    } finally {
      setIsGenerating(false);
    }
  };

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

        <Button
          onClick={generateTestProducts}
          disabled={isGenerating}
          variant="secondary"
          className="ml-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Test Products"
          )}
        </Button>
      </div>

      {view === "product" ? <StockTable /> : <CategorySummaryTable />}
    </main>
  );
}