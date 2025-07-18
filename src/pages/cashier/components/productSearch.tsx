import React, { useEffect, useRef, useState } from "react";
import { Product } from "@prisma/client";
import { Input } from "../../../lib/components/ui/input";
import { useTranslation } from "react-i18next";

interface Props {
  onAdd: (product: Product) => void;
  refreshKey: number;
}

type GroupedSuggestions = {
  category: string;
  items: Product[];
}[];

export default function ProductSearch({ onAdd, refreshKey }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState<{
    catIdx: number;
    itemIdx: number;
  }>({ catIdx: 0, itemIdx: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.api.database.products.getAll().then((products) => {
      setAllProducts(products);
    });
  }, [refreshKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const grouped = React.useMemo((): GroupedSuggestions => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return [];

    const matches = allProducts.filter((p) =>
      p.name.toLowerCase().includes(trimmed),
    );
    const sliced = matches.slice(0, 50);
    const groups: Record<string, Product[]> = {};

    for (const p of sliced) {
      const cat = p.categoryName || "Other";
      groups[cat] = groups[cat] || [];
      groups[cat].push(p);
    }

    return Object.entries(groups).map(([category, items]) => ({
      category,
      items: items.slice(0, 10),
    }));
  }, [search, allProducts]);

  useEffect(() => {
    setShowSuggestions(grouped.length > 0);
    setHighlight({ catIdx: 0, itemIdx: 0 });
  }, [grouped]);

  const handleSelect = (product: Product) => {
    onAdd(product);
    setSearch("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const moveHighlight = (deltaCat: number, deltaItem: number) => {
    const { catIdx, itemIdx } = highlight;
    const newCat = Math.min(Math.max(0, catIdx + deltaCat), grouped.length - 1);
    const itemsLen = grouped[newCat]?.items.length || 0;
    const newItem =
      deltaCat !== 0
        ? 0
        : Math.min(Math.max(0, itemIdx + deltaItem), itemsLen - 1);
    setHighlight({ catIdx: newCat, itemIdx: newItem });
    scrollIntoView(newCat, newItem);
  };

  const scrollIntoView = (catIdx: number, itemIdx: number) => {
    const selector = `#group-${catIdx}-item-${itemIdx}`;
    const el = dropdownRef.current?.querySelector(selector) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const { catIdx, itemIdx } = highlight;
      const groupItems = grouped[catIdx]?.items.length || 0;
      if (itemIdx + 1 < groupItems) {
        moveHighlight(0, 1);
      } else if (catIdx + 1 < grouped.length) {
        moveHighlight(1, 0);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const { catIdx, itemIdx } = highlight;
      if (itemIdx > 0) {
        moveHighlight(0, -1);
      } else if (catIdx > 0) {
        const prevLen = grouped[catIdx - 1]?.items.length || 0;
        moveHighlight(-1, prevLen - 1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const prod = grouped[highlight.catIdx]?.items[highlight.itemIdx];
      if (prod) handleSelect(prod);
    }
  };

  return (
    <div className="w-full relative space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-muted-foreground mb-1">
        {t("cashier.addProducts", "Add Products")}
      </label>
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("cashier.typeOrScan", "Type name or scan barcode...")}
        className="text-lg px-5 py-3 rounded-xl border-muted shadow focus:ring-2 focus:ring-primary bg-background"
      />

      {showSuggestions && grouped.length > 0 && (
        <div
          className="absolute z-20 w-full max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl animate-fade-in
                         scrollbar-thin scrollbar-thumb-muted scrollbar-thumb-rounded scrollbar-track-transparent"
        >
          {grouped.map((g, gi) => (
            <div key={g.category}>
              <div className="px-4 py-2 bg-muted text-muted-foreground text-xs uppercase">
                {g.category}
              </div>
              {g.items.map((product, ii) => {
                return (
                  <button
                    key={product.id}
                    id={`group-${gi}-item-${ii}`}
                    onClick={() => handleSelect(product)}
                    className={
                      "w-full px-4 py-2 text-left hover:bg-muted/80 transition-all text-sm border-b border-muted last:border-none focus:outline-none"
                    }
                  >
                    <div className="font-semibold text-foreground truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between mt-1">
                      <span>
                        {product.categoryName} • {t("cashier.price", "price")}:{" "}
                        {product.selling.toLocaleString()} DA
                      </span>
                      <span>
                        {product.quantity} {t("cashier.inStock", "in stock")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
