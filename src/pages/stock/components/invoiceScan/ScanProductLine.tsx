import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@prisma/client";
import { Check, Plus } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { Button } from "../../../../lib/components/button";
import StyledNumberInput from "../../../../lib/components/inputNumber";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import { rankNameMatches } from "../../../../lib/invoiceScan/fuzzyMatch";
import type { WizardLine } from "./wizardTypes";

const fieldClass =
  "w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all";

type Mode = "choose" | "preview" | "create" | "pick";

export default function ScanProductLine({
  line,
  products,
  categories,
  onSkip,
  onChange,
  onConfirmExisting,
  onConfirmNew,
}: {
  line: WizardLine;
  products: Product[];
  categories: string[];
  onSkip: () => void;
  onChange: () => void;
  onConfirmExisting: (
    product: Product,
    sellingPrice: number,
    codebar: string,
    boughtPrice: number,
  ) => void;
  onConfirmNew: (data: {
    name: string;
    categoryName: string;
    sellingPrice: number;
    codebar: string;
    boughtPrice: number;
  }) => void;
}) {
  const { t } = useTranslation();
  const currency = t("cashier.currency", "DA");

  const [mode, setMode] = useState<Mode>("choose");
  const [preview, setPreview] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState<number | "">("");
  const [boughtPrice, setBoughtPrice] = useState<number | "">(line.boughtPrice || "");
  const [codebar, setCodebar] = useState("");
  const [newName, setNewName] = useState(line.aiName);
  const [categoryName, setCategoryName] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState("");

  const matches = useMemo(
    () => rankNameMatches(line.aiName, products, 5),
    [line.aiName, products],
  );

  const pickResults = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => product.name.toLowerCase().includes(q));
  }, [pickSearch, products]);

  const filteredCategories = useMemo(() => {
    const q = categoryName.trim().toLowerCase();
    if (!q) return [];
    return categories.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [categories, categoryName]);

  const enterPreview = (product: Product) => {
    setPreview(product);
    setSellingPrice(product.sellingPrice || "");
    setBoughtPrice(line.boughtPrice || "");
    setCodebar(product.codebar || "");
    setMode("preview");
    setPickOpen(false);
  };

  const enterCreate = () => {
    setPreview(null);
    setNewName(line.aiName);
    setCategoryName("");
    setSellingPrice("");
    setBoughtPrice(line.boughtPrice || "");
    setCodebar("");
    setMode("create");
    setPickOpen(false);
  };

  const backToMatches = () => {
    setPreview(null);
    setMode("choose");
    setPickOpen(false);
  };

  const confirmPreview = () => {
    if (!preview) return;
    const selling = typeof sellingPrice === "number" ? sellingPrice : 0;
    const bought = typeof boughtPrice === "number" ? boughtPrice : line.boughtPrice;
    onConfirmExisting(preview, selling, codebar.trim(), bought);
  };

  const confirmCreate = () => {
    const selling = typeof sellingPrice === "number" ? sellingPrice : 0;
    const bought = typeof boughtPrice === "number" ? boughtPrice : line.boughtPrice;
    if (!newName.trim() || !categoryName.trim() || selling <= 0 || bought <= 0) return;
    onConfirmNew({
      name: newName.trim(),
      categoryName: categoryName.trim(),
      sellingPrice: selling,
      codebar: codebar.trim(),
      boughtPrice: bought,
    });
  };

  if (line.skipped) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 opacity-60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">
              {line.aiName}
              <span className="mx-2">·</span>
              {t("stock.quantity", "Quantity")}: {line.quantity}
              <span className="mx-2">·</span>
              {t("stock.boughtPrice", "Bought Price")}: {line.boughtPrice || "—"} {currency}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("stock.invoiceScan.skippedLine", "Skipped")}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            {t("stock.invoiceScan.include", "Include")}
          </Button>
        </div>
      </div>
    );
  }

  if (line.confirmed) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
              <Check className="h-4 w-4 text-green-600" />
              <span>{line.productName}</span>
              <span>·</span>
              <span>
                {t("stock.quantity", "Quantity")}: {line.quantity}
              </span>
              <span>·</span>
              <span>
                {t("stock.boughtPrice", "Bought Price")}: {line.boughtPrice} {currency}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {line.categoryName}
              {" · "}
              {line.isNewProduct
                ? t("stock.invoiceScan.newProduct", "New product")
                : t("stock.invoiceScan.existingProduct", "Existing")}
              {" · "}
              {t("stock.sellingPrice", "Selling Price")}: {line.sellingPrice} {currency}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMode("choose");
                setPreview(null);
                onChange();
              }}
            >
              {t("stock.invoiceScan.changeMatch", "Change")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
              {t("stock.invoiceScan.skip", "Skip")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const showMatches = mode === "choose" || mode === "pick";
  const displayName = mode === "preview" && preview ? preview.name : line.aiName;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {displayName}
            <span className="mx-2">·</span>
            {t("stock.quantity", "Quantity")}: {line.quantity}
            {showMatches ? (
              <>
                <span className="mx-2">·</span>
                {t("stock.boughtPrice", "Bought Price")}: {line.boughtPrice || "—"} {currency}
              </>
            ) : null}
            {mode === "preview" && preview ? (
              <span className="text-muted-foreground">
                <span className="mx-2">·</span>
                {preview.categoryName}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {mode === "preview" || mode === "create" ? (
            <Button type="button" variant="ghost" size="sm" onClick={backToMatches}>
              {t("stock.invoiceScan.changeMatch", "Change")}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            {t("stock.invoiceScan.skip", "Skip")}
          </Button>
        </div>
      </div>

      {mode === "preview" && preview ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm">{t("stock.boughtPrice", "Bought Price")}</label>
              <StyledNumberInput
                value={boughtPrice}
                onChange={(v: number | "") => setBoughtPrice(v)}
                placeholder={t("stock.boughtPrice", "Bought Price")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t("stock.sellingPrice", "Selling Price")}</label>
              <StyledNumberInput
                value={sellingPrice}
                onChange={(v: number | "") => setSellingPrice(v)}
                placeholder={t("stock.sellingPrice", "Selling Price")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t("stock.codebar", "Codebar")}</label>
              <input
                type="text"
                value={codebar}
                onChange={(e) => setCodebar(e.target.value)}
                className={fieldClass}
                placeholder={t("stock.codebar", "Codebar")}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={confirmPreview}
              disabled={typeof boughtPrice !== "number" || boughtPrice <= 0}
            >
              {t("cashier.confirm", "Confirm")}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-2">
            <label className="text-sm">{t("stock.type", "Product Type")}</label>
            <div className="relative">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => {
                  if (categoryName.trim()) setShowCategoryDropdown(true);
                }}
                className={fieldClass}
                placeholder={t("stock.type", "Product Type")}
              />
              {showCategoryDropdown && filteredCategories.length > 0 ? (
                <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredCategories.map((category) => (
                    <div
                      key={category}
                      className="cursor-pointer px-4 py-2 hover:bg-accent/50"
                      onClick={() => {
                        setCategoryName(category);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      <span className="text-sm font-medium">{category}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm">{t("stock.boughtPrice", "Bought Price")}</label>
              <StyledNumberInput
                value={boughtPrice}
                onChange={(v: number | "") => setBoughtPrice(v)}
                placeholder={t("stock.boughtPrice", "Bought Price")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t("stock.sellingPrice", "Selling Price")}</label>
              <StyledNumberInput
                value={sellingPrice}
                onChange={(v: number | "") => setSellingPrice(v)}
                placeholder={t("stock.sellingPrice", "Selling Price")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t("stock.codebar", "Codebar")}</label>
              <input
                type="text"
                value={codebar}
                onChange={(e) => setCodebar(e.target.value)}
                className={fieldClass}
                placeholder={t("stock.codebar", "Codebar")}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={confirmCreate}
              disabled={
                !categoryName.trim() ||
                typeof sellingPrice !== "number" ||
                sellingPrice <= 0 ||
                typeof boughtPrice !== "number" ||
                boughtPrice <= 0
              }
            >
              <Plus className="h-4 w-4" />
              {t("stock.invoiceScan.createProduct", "Create product")}
            </Button>
          </div>
        </div>
      ) : null}

      {showMatches ? (
        <div className="space-y-2 border-t border-border pt-3">
          {matches.length > 0 ? (
            <>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stock.invoiceScan.possibleMatches", "Possible matches")}
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                {matches.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    className={cn(
                      "flex w-full flex-col px-4 py-2 text-left hover:bg-accent/50",
                      index > 0 ? "border-t border-border" : "",
                    )}
                    onClick={() => enterPreview(product)}
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.categoryName}
                      {typeof product.quantity === "number"
                        ? ` · ${product.quantity}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("stock.invoiceScan.noProductMatches", "No matching products.")}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={enterCreate}>
              {t("stock.invoiceScan.addNewProduct", "Add new product")}
            </Button>
            <Popover
              open={pickOpen}
              onOpenChange={(open) => {
                setPickOpen(open);
                setPickSearch("");
                if (open) setMode("pick");
              }}
            >
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  {t("stock.invoiceScan.pickProduct", "Pick product")}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(360px,calc(100vw-2rem))] p-0"
                align="start"
              >
                <div className="p-2">
                  <input
                    type="text"
                    value={pickSearch}
                    onChange={(e) => setPickSearch(e.target.value)}
                    placeholder={t("stock.searchProduct", "Search product...")}
                    className={fieldClass}
                    autoFocus
                  />
                </div>
                <div className="scrollbar-themed max-h-80 overflow-y-auto">
                  {pickResults.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {t("stock.noProduct", "No product found")}
                    </p>
                  ) : (
                    pickResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full flex-col px-4 py-2 text-left hover:bg-accent/50"
                        onClick={() => enterPreview(product)}
                      >
                        <span className="text-sm font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.categoryName}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ) : null}
    </div>
  );
}
