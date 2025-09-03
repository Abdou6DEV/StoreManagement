import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import { Skeleton } from "../../../../lib/components/skeleton";
import { cn } from "../../../../lib/utils";
import { Product } from "@prisma/client";

interface ProductSelectionProps {
  form: any;
  showProductDropdown: boolean;
  setShowProductDropdown: (show: boolean) => void;
  filteredProducts: Product[];
  setFilteredProducts: (products: Product[]) => void;
  dropdownProductSearch: string;
  setDropdownProductSearch: (search: string) => void;
  products: Product[];
  paginatedProducts: Product[];
  loadingMoreProducts: boolean;
  hasMoreProducts: boolean;
  handleLoadMoreProducts: () => void;
  onProductSelect: (product: Product) => void;
  onFormChange: (key: string, value: any) => void;
}

export default function ProductSelection({
  form,
  showProductDropdown,
  setShowProductDropdown,
  filteredProducts,
  setFilteredProducts,
  dropdownProductSearch,
  setDropdownProductSearch,
  products,
  paginatedProducts,
  loadingMoreProducts,
  hasMoreProducts,
  handleLoadMoreProducts,
  onProductSelect,
  onFormChange,
}: ProductSelectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label>{t("stock.product")}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={t("stock.product")}
          value={form.name}
          onChange={(e) => onFormChange("name", e.target.value)}
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
                setFilteredProducts(products);
                setDropdownProductSearch("");
                setShowProductDropdown(true);
              }}
              title={t(
                "stock.chooseProductTooltip",
                "Choose a product to auto-fill all fields"
              )}
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
              />
              <CommandList
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (
                    el.scrollTop + el.clientHeight >= el.scrollHeight - 10 &&
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
                      onSelect={() => onProductSelect(p)}
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
    </div>
  );
}
