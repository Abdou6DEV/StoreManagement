import React, { useState, useEffect, useRef } from "react";
import type { Product } from "@prisma/client";

interface Props {
  onAdd: (product: Product) => void;
}

export default function ProductSearch({ onAdd }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.api.database.products.getAll().then(setProducts);
  }, []);

  useEffect(() => {
    const search = query.trim().toLowerCase();
    const results = products.filter((p) =>
      p.name.toLowerCase().includes(search),
    );
    setFiltered(results);
    setSelectedIndex(0); // reset selection
  }, [query, products]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev === 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onAdd(filtered[selectedIndex]);
      setQuery("");
      setFiltered([]);
    } else if (e.key === "Escape") {
      setFiltered([]);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={query}
        type="text"
        placeholder="Search product..."
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full text-lg px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
      />

      {filtered.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-auto animate-fade-in">
          {filtered.map((product, index) => (
            <li
              key={product.id}
              onClick={() => {
                onAdd(product);
                setQuery("");
                setFiltered([]);
              }}
              className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-colors
                ${
                  index === selectedIndex
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">
                  {product.quantity} in stock
                </span>
              </div>
              <span className="text-sm font-semibold">
                {product.selling.toLocaleString()} DZD
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
