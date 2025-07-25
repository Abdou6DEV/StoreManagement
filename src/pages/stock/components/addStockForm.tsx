import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStock } from "../../../lib/contexts/stockContext";
import { Product } from "@prisma/client";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Button } from "../../../lib/components/button";
import { Loader2, Package, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { Skeleton } from "../../../lib/components/skeleton";
import type { AddStockFormState } from "../../../types";

const initialForm: AddStockFormState = {
  name: "",
  categoryName: "",
  quantity: "",
  bought: "",
  selling: "",
  codebar: "",
};

export default function AddStockForm({
  openPanel,
  setOpenPanel,
}: {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
}) {
  const { t } = useTranslation();
  const { products, categories, refetchCategories, refetchProducts } =
    useStock();

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [dropdownProductSearch, setDropdownProductSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] =
    useState<string[]>(categories);
  const [dropdownCategorySearch, setDropdownCategorySearch] = useState("");
  const [form, setForm] = useState<AddStockFormState>(initialForm);
  const [loading, setLoading] = useState(false);

  // For infinite scroll in product dropdown
  const PAGE_SIZE = 50;
  const [productPage, setProductPage] = useState(1);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Reset product dropdown paging when opening or searching
  React.useEffect(() => {
    setProductPage(1);
    setHasMoreProducts(true);
  }, [showProductDropdown, dropdownProductSearch]);

  // Compute paginated products
  const paginatedProducts = filteredProducts.slice(0, productPage * PAGE_SIZE);
  React.useEffect(() => {
    setHasMoreProducts(filteredProducts.length > paginatedProducts.length);
  }, [filteredProducts, paginatedProducts]);

  // Handler for loading more products
  const handleLoadMoreProducts = () => {
    if (!hasMoreProducts || loadingMoreProducts) return;
    setLoadingMoreProducts(true);
    setTimeout(() => {
      setProductPage((prev) => prev + 1);
      setLoadingMoreProducts(false);
    }, 500); // Simulate async load
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await window.api.database.categories.ensure(form.categoryName);

      // Check if product already exists
      const existingProduct = products.find(
        (p) =>
          p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
          p.categoryName.toLowerCase() ===
            form.categoryName.toLowerCase().trim(),
      );

      if (existingProduct) {
        // If exists, update quantity
        await window.api.database.products.update(existingProduct.id, {
          name: existingProduct.name,
          categoryName: existingProduct.categoryName,
          quantity: existingProduct.quantity + Number(form.quantity || 0),
          bought: Number(form.bought || 0), // optional: update bought/selling price
          selling: Number(form.selling || 0),
          codebar: form.codebar,
        });
      } else {
        // If not exists, create new product
        await window.api.database.products.add({
          ...form,
          quantity: Number(form.quantity || 0),
          bought: Number(form.bought || 0),
          selling: Number(form.selling || 0),
        });
      }

      setForm(initialForm);
      refetchProducts();
      refetchCategories();
    } catch (err) {
      alert("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string | number) => {
    // For number fields, allow empty string
    if (["quantity", "bought", "selling"].includes(key)) {
      setForm((prev) => ({
        ...prev,
        [key]:
          value === "" ? "" : typeof value === "string" ? Number(value) : value,
      }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === "categoryName" && typeof value === "string") {
        const val = value.toLowerCase();
        setFilteredCategories(
          categories.filter((cat) => cat.toLowerCase().includes(val)),
        );
      }
    }
  };

  // Helper to check if form matches an existing product (by name only)
  const isExistingProduct = products.some(
    (p) => p.name.toLowerCase().trim() === form.name.toLowerCase().trim(),
  );

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "add" ? null : "add")}
        aria-expanded={openPanel === "add"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t("stock.addTitle", "Add Stock")}
          </h2>
        </div>
        {openPanel ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "add" && (
        <form onSubmit={handleAddProduct} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Legend>
              <label>{t("stock.product")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("stock.product")}
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="w-full flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  required
                />
                <Popover
                  open={showProductDropdown}
                  onOpenChange={setShowProductDropdown}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 py-2"
                      onClick={() => {
                        setFilteredProducts(products as any);
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
                              p.name
                                .toLowerCase()
                                .includes(value.toLowerCase()),
                            ) as any,
                          );
                        }}
                        className="h-9"
                      />
                      <CommandList
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (
                            el.scrollTop + el.clientHeight >=
                              el.scrollHeight - 10 &&
                            hasMoreProducts &&
                            !loadingMoreProducts
                          ) {
                            handleLoadMoreProducts();
                          }
                        }}
                        style={{ maxHeight: 350, overflowY: "auto" }}
                      >
                        <CommandEmpty>
                          {t("stock.noProduct", "No product found.")}
                        </CommandEmpty>
                        <CommandGroup>
                          {paginatedProducts.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => {
                                setForm({
                                  name: p.name,
                                  categoryName: p.categoryName,
                                  quantity: "", // empty for user input
                                  bought: p.bought ?? "",
                                  selling: p.selling ?? "",
                                  codebar: p.codebar || "",
                                });
                                setShowProductDropdown(false);
                              }}
                            >
                              {p.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  form.name === p.name
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                          {loadingMoreProducts &&
                            Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="px-4 py-2">
                                <Skeleton className="h-5 w-full" />
                              </div>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </Legend>
            <Legend>
              <label>{t("stock.type")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t("stock.type")}
                  value={form.categoryName}
                  onChange={(e) =>
                    handleFormChange("categoryName", e.target.value)
                  }
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                  required
                  disabled={isExistingProduct}
                />
                <Popover
                  open={showCategoryDropdown}
                  onOpenChange={setShowCategoryDropdown}
                >
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
                              cat.toLowerCase().includes(value.toLowerCase()),
                            ),
                          );
                        }}
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t("stock.noMatch", "No type found.")}
                        </CommandEmpty>
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
                                  form.categoryName === cat
                                    ? "opacity-100"
                                    : "opacity-0",
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
            </Legend>
            <Legend>
              <label>{t("stock.quantity")}</label>
              <StyledNumberInput
                value={form.quantity === "" ? "" : Number(form.quantity)}
                onChange={(val) => handleFormChange("quantity", val)}
                placeholder={t("stock.quantity")}
              />
            </Legend>
            <Legend>
              <label>{t("stock.bought")}</label>
              <StyledNumberInput
                value={form.bought === "" ? "" : Number(form.bought)}
                onChange={(val) => handleFormChange("bought", val)}
                placeholder={t("stock.bought")}
                disabled={isExistingProduct}
              />
            </Legend>
            <Legend>
              <label>{t("stock.selling")}</label>
              <StyledNumberInput
                value={form.selling === "" ? "" : Number(form.selling)}
                onChange={(val) => handleFormChange("selling", val)}
                placeholder={t("stock.selling")}
                disabled={isExistingProduct}
              />
            </Legend>
            <Legend>
              <label>{t("stock.codebar")}</label>
              <input
                type="text"
                placeholder={t("stock.codebar")}
                value={form.codebar}
                onChange={(e) => handleFormChange("codebar", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                disabled={isExistingProduct}
              />
            </Legend>
          </div>

          {/* Note for existing product */}
          {isExistingProduct && (
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {(() => {
                const existing = products.find(
                  (p) =>
                    p.name.toLowerCase().trim() ===
                    form.name.toLowerCase().trim(),
                );
                return existing
                  ? `This product is in stock | Current quantity: ${existing.quantity}`
                  : null;
              })()}
            </div>
          )}

          <hr />

          <div>
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
      )}
    </section>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}
