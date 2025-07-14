import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Category, Product } from "@prisma/client";
import StyledNumberInput from "../../lib/components/ui/inputNumber";
import { Button } from "../../lib/components/ui/button";
import {
  Edit,
  Save,
  X,
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StockTable } from "./components/StockTable";
import AddStockForm from "./components/addStockForm";

const initialForm = {
  name: "",
  categoryName: "",
  quantity: 0,
  bought: 0,
  selling: 0,
  codebar: "",
};

export default function StockPage() {
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState<string[]>([]);

  // Edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editLoading, setEditLoading] = useState(false);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [filteredEditCategories, setFilteredEditCategories] = useState<
    string[]
  >([]);
  const editCategoryInputRef = useRef<HTMLInputElement>(null);

  const [openPanel, setOpenPanel] = useState<"add" | "edit" | null>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);

  const fetchProducts = () => {
    window.api.database.products.getAll().then(setProducts);
  };

  const fetchCategories = () => {
    window.api.database.categories.getAll().then((cats) => {
      setCategories(cats.map((c: Category) => c.name));
    });
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

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

  const handleEditFormChange = (
    key: keyof typeof editForm,
    value: string | number,
  ) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    if (key === "categoryName" && typeof value === "string") {
      const val = value.toLowerCase();
      setFilteredEditCategories(
        categories.filter((cat) => cat.toLowerCase().includes(val)),
      );
      setShowEditSuggestions(
        val.length > 0 && filteredEditCategories.length > 0,
      );
    }
  };

  const handleEditCategorySelect = (cat: string) => {
    setEditForm((prev) => ({ ...prev, categoryName: cat }));
    setShowEditSuggestions(false);
    if (editCategoryInputRef.current) editCategoryInputRef.current.blur();
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      categoryName: product.categoryName,
      quantity: product.quantity,
      bought: product.bought,
      selling: product.selling,
      codebar: product.codebar || "",
    });
    setOpenPanel("edit");
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await window.api.database.products.delete(productId);
      fetchProducts();
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditForm(initialForm);
    setShowEditSuggestions(false);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditLoading(true);
    try {
      // Ensure category exists
      await window.api.database.categories.ensure(editForm.categoryName);
      await window.api.database.products.update(editingProduct.id, {
        ...editForm,
        quantity: Number(editForm.quantity),
        bought: Number(editForm.bought),
        selling: Number(editForm.selling),
      });
      handleCancelEdit();
      fetchProducts();
      fetchCategories();
    } catch (err) {
      alert("Failed to update product");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <main className="px-6 md:px-12 flex-1 space-y-10">
      {/* === Add Stock Section (Collapsible) === */}
      <AddStockForm
        products={products}
        categories={categories}
        fetchCategories={fetchCategories}
        fetchProducts={fetchProducts}
        openPanel={openPanel}
        setOpenPanel={setOpenPanel}
      />
      {/* === Edit Stock Section (Collapsible) === */}
      {editingProduct && (
        <section
          ref={editSectionRef}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg"
        >
          <header
            className="flex items-center justify-between p-6 cursor-pointer select-none relative z-10"
            onClick={() => setOpenPanel(openPanel === "edit" ? null : "edit")}
            aria-expanded={openPanel === "edit"}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("stock.editTitle", "Edit Product")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Editing: {editingProduct.name}
                </p>
              </div>
            </div>
            {openPanel === "edit" ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </header>
          {openPanel === "edit" && (
            <form
              onSubmit={handleUpdateProduct}
              className="p-6 pt-0 relative z-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {t("stock.product")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("stock.product")}
                    value={editForm.name}
                    onChange={(e) =>
                      handleEditFormChange("name", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div className="space-y-3 relative">
                  <label className="text-sm font-medium text-foreground">
                    {t("stock.type")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("stock.type")}
                    value={editForm.categoryName}
                    onChange={(e) =>
                      handleEditFormChange("categoryName", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    required
                    autoComplete="off"
                    ref={editCategoryInputRef}
                    onFocus={() =>
                      setShowEditSuggestions(filteredEditCategories.length > 0)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowEditSuggestions(false), 100)
                    }
                  />
                  {showEditSuggestions && filteredEditCategories.length > 0 && (
                    <ul className="absolute z-20 bg-card border border-border rounded-lg mt-1 w-full max-h-40 overflow-auto shadow-xl">
                      {filteredEditCategories.map((cat) => (
                        <li
                          key={cat}
                          className="px-4 py-2 cursor-pointer hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onMouseDown={() => handleEditCategorySelect(cat)}
                        >
                          {cat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("stock.quantity")}
                  </label>
                  <StyledNumberInput
                    value={editForm.quantity}
                    onChange={(val) => handleEditFormChange("quantity", val)}
                    placeholder={t("stock.quantity")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("stock.bought")}
                  </label>
                  <StyledNumberInput
                    value={editForm.bought}
                    onChange={(val) => handleEditFormChange("bought", val)}
                    placeholder={t("stock.bought")}
                    step={100}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground mb-3">
                    {t("stock.selling")}
                  </label>
                  <StyledNumberInput
                    value={editForm.selling}
                    onChange={(val) => handleEditFormChange("selling", val)}
                    placeholder={t("stock.selling")}
                    step={100}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t("stock.codebar")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("stock.codebar")}
                    value={editForm.codebar}
                    onChange={(e) =>
                      handleEditFormChange("codebar", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("stock.updating", "Updating...")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t("stock.updateButton", "Update Product")}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  <X className="w-4 h-4" />
                  {t("stock.cancelButton", "Cancel")}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      <StockTable
        products={products}
        categories={categories}
        handleDeleteProduct={handleDeleteProduct}
        handleEditProduct={handleEditProduct}
      />
    </main>
  );
}
