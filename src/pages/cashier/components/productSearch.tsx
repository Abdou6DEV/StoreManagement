import React, { useEffect, useRef, useState } from "react";
import { Product } from "@prisma/client";
import { Input } from "../../../lib/components/input";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
    
    // Auto-focus on mount and after refresh
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [refreshKey]);

  // Debounce search input to prevent excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  // Focus search input when user starts typing anywhere on the page (but not in modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle printable characters and ignore when already focused on an input
      const target = e.target as HTMLElement;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      // Ignore if already in an input element, in a modal, or if it's a special key
      if (isInputElement || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Don't steal focus if user is in a modal
      const isInModal = target.closest('[role="dialog"]') || target.closest('.modal');
      if (isInModal) {
        return;
      }

      // Check if it's a printable character (letters, numbers, symbols)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          // Set the search value to the typed character
          setSearch(e.key);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    
    // Only refocus when clicking on empty page areas (not on inputs or interactive elements)
    const handlePageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't refocus if clicking on any interactive element
      if (target.closest('input') || 
          target.closest('textarea') || 
          target.closest('select') || 
          target.closest('button') || 
          target.closest('a') || 
          target.closest('[role="dialog"]') || 
          target.closest('.modal') ||
          target.closest('[data-interactive]')) {
        return;
      }
      
      // Only refocus if clicking on empty page area and no suggestions are open
      if (!showSuggestions && inputRef.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handlePageClick);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handlePageClick);
    };
  }, [showSuggestions]);

  const grouped = React.useMemo((): GroupedSuggestions => {
    const trimmed = debouncedSearch.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) return []; // Only search after 2+ characters

    // Use a more efficient search with early termination
    const matches: Product[] = [];
    const maxResults = 50;
    
    for (const p of allProducts) {
      if (matches.length >= maxResults) break;
      if (p.name.toLowerCase().includes(trimmed)) {
        matches.push(p);
      }
    }

    const groups: Record<string, Product[]> = {};
    for (const p of matches) {
      const cat = p.categoryName || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }

    return Object.entries(groups).map(([category, items]) => ({
      category,
      items: items.slice(0, 10),
    }));
  }, [debouncedSearch, allProducts]);

  useEffect(() => {
    setShowSuggestions(grouped.length > 0);
    setHighlight({ catIdx: 0, itemIdx: 0 });
  }, [grouped]);

  const handleSelect = React.useCallback((product: Product) => {
    onAdd(product);
    setSearch("");
    setShowSuggestions(false);
    
    // Ensure focus returns to search input for next scan
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });
  }, [onAdd]);

  const moveHighlight = React.useCallback((deltaCat: number, deltaItem: number) => {
    const { catIdx, itemIdx } = highlight;
    const newCat = Math.min(Math.max(0, catIdx + deltaCat), grouped.length - 1);
    const itemsLen = grouped[newCat]?.items.length || 0;
    const newItem =
      deltaCat !== 0
        ? 0
        : Math.min(Math.max(0, itemIdx + deltaItem), itemsLen - 1);
    setHighlight({ catIdx: newCat, itemIdx: newItem });
    scrollIntoView(newCat, newItem);
  }, [highlight, grouped]);

  const scrollIntoView = React.useCallback((catIdx: number, itemIdx: number) => {
    const selector = `#group-${catIdx}-item-${itemIdx}`;
    const el = dropdownRef.current?.querySelector(selector) as HTMLElement;
    if (el) {
      // Use requestAnimationFrame to prevent forced reflow
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // First, try to find exact barcode match
      const exactBarcodeMatch = allProducts.find(p => 
        p.codebar && p.codebar === search.trim()
      );
      
      if (exactBarcodeMatch) {
        // Direct barcode match - add product
        handleSelect(exactBarcodeMatch);
        return;
      }
      
      // If no exact barcode match, show suggestions for text search
      if (showSuggestions) {
        const prod = grouped[highlight.catIdx]?.items[highlight.itemIdx];
        if (prod) handleSelect(prod);
      }
      return;
    }

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
    }
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
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
                        {product.sellingPrice.toLocaleString()}{" "}
                        {t("cashier.currency", "DA")}
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
