import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Product } from "@prisma/client";
import StyledNumberInput from "../../lib/components/ui/inputNumber";
import { Button } from "../../lib/components/ui/button";
import { Edit, Save, X, Loader2, Package } from "lucide-react";
import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../lib/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../lib/components/ui/popover"
import { Check, ChevronDown } from "lucide-react"

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
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [dropdownProductSearch, setDropdownProductSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [dropdownCategorySearch, setDropdownCategorySearch] = useState("");
  const itemsPerPage = 10;
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paddingRows = itemsPerPage - paginatedProducts.length;

  // Edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [editLoading, setEditLoading] = useState(false);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const [filteredEditCategories, setFilteredEditCategories] = useState<
    string[]
  >([]);
  const editCategoryInputRef = useRef<HTMLInputElement>(null);

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
  useEffect(() => {
    setFilteredCategories(categories);
  }, [categories]);

  const handleChange = (key: keyof typeof filters, value: boolean | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormChange = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "categoryName" && typeof value === "string") {
      const val = value.toLowerCase();
      setFilteredCategories(
        categories.filter((cat) => cat.toLowerCase().includes(val)),
      );
      setShowSuggestions(val.length > 0 && filteredCategories.length > 0);
    }
  };

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

  const handleCategorySelect = (cat: string) => {
    setForm((prev) => ({ ...prev, categoryName: cat }));
    setShowSuggestions(false);
    if (categoryInputRef.current) categoryInputRef.current.blur();
  };

  const handleEditCategorySelect = (cat: string) => {
    setEditForm((prev) => ({ ...prev, categoryName: cat }));
    setShowEditSuggestions(false);
    if (editCategoryInputRef.current) editCategoryInputRef.current.blur();
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

  const [dropdownSearch, setDropdownSearch] = useState("")
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
      {/* === Add Stock Section === */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {t("stock.addTitle", "Add Stock")}
            </h2>
          </div>
        </header>

        <form onSubmit={handleAddProduct}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("stock.product")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t("stock.product")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="w-full flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                required
              />
              <Popover open={showProductDropdown} onOpenChange={setShowProductDropdown}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-2"
                    onClick={() => {
                      setFilteredProducts(products);
                      setDropdownProductSearch("");
                      setShowProductDropdown(true);
                    }}
                  >
                    {t("stock.chooseProduct", "Choose")}
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 z-50">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("stock.searchProduct")}
                      value={dropdownProductSearch}
                      onValueChange={(value) => {
                        setDropdownProductSearch(value);
                        setFilteredProducts(
                          products.filter((p) =>
                            p.name.toLowerCase().includes(value.toLowerCase())
                          )
                        );
                      }}
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>{t("stock.noProduct", "No product found.")}</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.name}
                            onSelect={() => {
                              setForm({
                                name: p.name,
                                categoryName: p.categoryName,
                                quantity: p.quantity,
                                bought: p.bought,
                                selling: p.selling,
                                codebar: p.codebar || "",
                              });
                              setShowProductDropdown(false);
                            }}
                          >
                            {p.name}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                form.name === p.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("stock.type")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("stock.type")}
                  value={form.categoryName}
                  onChange={(e) => handleFormChange("categoryName", e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  required
                />
                <Popover open={showCategoryDropdown} onOpenChange={setShowCategoryDropdown}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2"
                      onClick={() => {
                        setFilteredCategories(categories);
                        setDropdownCategorySearch("");
                        setShowCategoryDropdown(true);
                      }}
                    >
                      {t("stock.chooseType", "Choose")}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t("stock.searchType")}
                        value={dropdownCategorySearch}
                        onValueChange={(value) => {
                          setDropdownCategorySearch(value);
                          setFilteredCategories(
                            categories.filter((cat) =>
                              cat.toLowerCase().includes(value.toLowerCase())
                            )
                          );
                        }}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>{t("stock.noMatch", "No type found.")}</CommandEmpty>
                        <CommandGroup>
                          {filteredCategories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={(value) => {
                                handleFormChange("categoryName", value);
                                setShowCategoryDropdown(false);
                              }}
                            >
                              {cat}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  form.categoryName === cat ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("stock.quantity")}
              </label>
              <StyledNumberInput
                value={form.quantity}
                onChange={(val) => handleFormChange("quantity", val)}
                placeholder={t("stock.quantity")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("stock.bought")}
              </label>
              <StyledNumberInput
                value={form.bought}
                onChange={(val) => handleFormChange("bought", val)}
                placeholder={t("stock.bought")}
                step={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("stock.selling")}
              </label>
              <StyledNumberInput
                value={form.selling}
                onChange={(val) => handleFormChange("selling", val)}
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
                value={form.codebar}
                onChange={(e) => handleFormChange("codebar", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border mt-6">
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("stock.adding", "Adding...")}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  {t("stock.addButton", "Add Product")}
                </>
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* === Edit Stock Section === */}
      {editingProduct && (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg p-6 space-y-6 relative">
          {/* Background pattern for visual interest */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl pointer-events-none" />

          <header className="flex items-center justify-between relative z-10">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </header>

          <form onSubmit={handleUpdateProduct} className="relative z-10">
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
                  onChange={(e) => handleEditFormChange("name", e.target.value)}
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
        </section>
      )}

      {/* === Stock Table + Filters Combined === */}
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {t("stock.tableTitle", "Stock List")}
          </h2>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center">
          {[
            { key: "lowStock", label: t("stock.lowStock") },
            { key: "bestSelling", label: t("stock.bestSelling") },
            { key: "worstSelling", label: t("stock.worstSelling") },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters[key as keyof typeof filters] as boolean}
                onChange={(e) =>
                  handleChange(key as keyof typeof filters, e.target.checked)
                }
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
            className="px-3 py-1.5 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring focus:ring-primary/30 transition max-w-[220px]"
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
                <th className="px-4 py-3">{t("stock.profit", "Profit")}</th>
                <th className="px-4 py-3">{t("stock.totalBought", "Total Bought")}</th>
                <th className="px-4 py-3">{t("stock.totalProfit", "Total Profit")}</th>
                <th className="px-4 py-3">{t("stock.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedProducts.map((product) => {
                const profit = product.selling - product.bought;
                const totalBought = product.bought * product.quantity;
                const totalProfit = profit * product.quantity;
            
                return (
                  <tr key={product.id} className="h-[48px] hover:bg-muted/40 transition">
                    <td className="px-4">{product.name}</td>
                    <td className="px-4">{product.categoryName}</td>
                    <td className="px-4">{product.quantity}</td>
                    <td className="px-4">{product.bought}</td>
                    <td className="px-4">{product.selling}</td>
                    <td className="px-4 text-green-700">{profit}</td>
                    <td className="px-4">{totalBought}</td>
                    <td className="px-4 text-green-700 font-medium">{totalProfit}</td>
                    <td className="px-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEditProduct(product)}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
                      >
                        <Edit className="w-3 h-3" />
                        {t("stock.edit", "Edit")}
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                      >
                        <X className="w-3 h-3" />
                        {t("stock.delete", "Delete")}
                      </Button>
                    </div>
                  </td>
                  </tr>
                );
              })}
            
              {/* ✅ Padding rows here — outside the product map */}
              {Array.from({ length: paddingRows }).map((_, index) => (
                <tr key={`pad-${index}`} className="h-[48px] hover:bg-transparent transition">
                  <td className="px-4" colSpan={9}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
          >
            {t("stock.prev", "Previous")}
          </button>
        
          <span className="text-sm text-muted-foreground">
            {t("stock.page")} {currentPage} / {totalPages}
          </span>
        
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
          >
            {t("stock.next", "Next")}
          </button>
        </div>
      </section>
    </main>
  );
}
