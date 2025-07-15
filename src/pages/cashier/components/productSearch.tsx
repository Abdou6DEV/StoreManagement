import React, { useEffect, useRef, useState } from "react";
import { Product } from "@prisma/client";
import { Input } from "../../../lib/components/ui/input";

interface Props {
  onAdd: (product: Product) => void;
}

export default function ProductSearch({ onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all products once
  useEffect(() => {
    window.api.database.products.getAll().then((products) => {
      setAllProducts(products);
    });
  }, []);

  // Hide dropdown when clicking outside
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

  // Handle search input
  useEffect(() => {
    const trimmed = search.trim();

    // Barcode logic
    if (/^\d{6,}$/.test(trimmed)) {
      const match = allProducts.find((p) => p.codebar?.trim() === trimmed);
      if (match) {
        onAdd(match);
        setSearch("");
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
    }

    // Name-based suggestions
    if (trimmed.length > 0) {
      const filtered = allProducts.filter((p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [search, allProducts]);

  const handleSelect = (product: Product) => {
    onAdd(product);
    setSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="relative space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-muted-foreground">
        Search product (by name or barcode)
      </label>
      <Input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type name or scan barcode..."
        className="text-lg px-4 py-2"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-xl animate-fade-in overflow-hidden">
          {suggestions.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full px-4 py-2 text-left hover:bg-muted transition-all text-sm border-b border-muted last:border-none"
            >
              {/* Top line: name with emoji */}
              <div className="font-medium text-foreground">
                {product.name}
              </div>

              {/* Bottom line: type • price — quantity */}
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>
                  {product.categoryName} • price:{" "}
                  {product.selling.toLocaleString()} DA
                </span>
                <span>{product.quantity} in stock</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
