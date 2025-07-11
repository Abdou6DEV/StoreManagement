import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Product } from "@prisma/client";

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

  const [filters, setFilters] = useState({
    lowStock: false,
    bestSelling: false,
    worstSelling: false,
    search: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const totalPages = 5; // Replace with dynamic value if needed

  const fetchProducts = () => {
    window.api.database.products.getAll().then(setProducts);
  };

  const fetchCategories = () => {
    window.api.database.categories.getAll().then((cats) => {
      setCategories(cats.map((c: any) => c.name));
    });
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormChange = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "categoryName" && typeof value === "string") {
      const val = value.toLowerCase();
      setFilteredCategories(
        categories.filter((cat) => cat.toLowerCase().includes(val))
      );
      setShowSuggestions(val.length > 0 && filteredCategories.length > 0);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setForm((prev) => ({ ...prev, categoryName: cat }));
    setShowSuggestions(false);
    if (categoryInputRef.current) categoryInputRef.current.blur();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure category exists
      await window.api.database.categories.ensure(form.categoryName);
      await window.api.database.products.add({
        ...form,
        quantity: Number(form.quantity),
        bought: Number(form.bought),
        selling: Number(form.selling),
      });
      setForm(initialForm);
      fetchProducts();
      fetchCategories();
    } catch (err) {
      alert("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="py-10 px-6 md:px-12 ml-20 flex-1 space-y-10">
      {/* === Add Stock Section === */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("stock.addTitle", "Add Stock")}</h2>
        </header>

        <form onSubmit={handleAddProduct}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.product")}</label>
              <input
                type="text"
                placeholder={t("stock.product")}
                value={form.name}
                onChange={e => handleFormChange("name", e.target.value)}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
                required
              />
            </div>
            <div className="flex flex-col gap-1 max-w-[220px] relative">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.type")}</label>
              <input
                type="text"
                placeholder={t("stock.type")}
                value={form.categoryName}
                onChange={e => handleFormChange("categoryName", e.target.value)}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
                required
                autoComplete="off"
                ref={categoryInputRef}
                onFocus={() => setShowSuggestions(filteredCategories.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              />
              {showSuggestions && filteredCategories.length > 0 && (
                <ul className="absolute z-10 bg-white border border-border rounded-md mt-1 w-full max-h-32 overflow-auto shadow-lg">
                  {filteredCategories.map((cat) => (
                    <li
                      key={cat}
                      className="px-3 py-1 cursor-pointer hover:bg-muted"
                      onMouseDown={() => handleCategorySelect(cat)}
                    >
                      {cat}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.quantity")}</label>
              <input
                type="number"
                placeholder={t("stock.quantity")}
                value={form.quantity}
                onChange={e => handleFormChange("quantity", Number(e.target.value))}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
                required
              />
            </div>
            <div className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.bought")}</label>
              <input
                type="number"
                placeholder={t("stock.bought")}
                value={form.bought}
                onChange={e => handleFormChange("bought", Number(e.target.value))}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
                required
              />
            </div>
            <div className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.selling")}</label>
              <input
                type="number"
                placeholder={t("stock.selling")}
                value={form.selling}
                onChange={e => handleFormChange("selling", Number(e.target.value))}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
                required
              />
            </div>
            <div className="flex flex-col gap-1 max-w-[220px]">
              <label className="text-sm text-muted-foreground font-medium">{t("stock.codebar")}</label>
              <input
                type="text"
                placeholder={t("stock.codebar")}
                value={form.codebar}
                onChange={e => handleFormChange("codebar", e.target.value)}
                className="px-3 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring focus:ring-primary/40 transition"
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="bg-primary hover:bg-primary/90 transition px-5 py-2 mt-4 text-sm rounded-md text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? t("stock.adding", "Adding...") : t("stock.addButton", "Add Product")}
            </button>
          </div>
        </form>
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
                onChange={(e) => handleChange(key as keyof typeof filters, e.target.checked)}
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
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/40 transition">
                  <td className="px-4 py-3">{product.name}</td>
                  <td className="px-4 py-3">{product.categoryName}</td>
                  <td className="px-4 py-3">{product.quantity}</td>
                  <td className="px-4 py-3">{product.bought}</td>
                  <td className="px-4 py-3">{product.selling}</td>
                  <td className="px-4 py-3">{product.codebar}</td>
                </tr>
              ))}
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
