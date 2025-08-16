import React from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../lib/components/select";
import type { ProductBrowserHeaderProps } from "./productBrowserTypes";

const ProductBrowserHeader: React.FC<ProductBrowserHeaderProps> = ({
  productFilter,
  setProductFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedCategory,
  setSelectedCategory,
  categories,
  filterInputRef,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex gap-2 flex-1">
        <input
          ref={filterInputRef}
          type="text"
          placeholder={t("cashier.filterProducts", "Filter products...")}
          className="flex-1 px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />
        <input
          type="number"
          min={0}
          placeholder={t("cashier.minPrice", "Minimum price")}
          className="w-32 px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={minPrice ?? ""}
          onChange={(e) =>
            setMinPrice(
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
        />
        <input
          type="number"
          min={0}
          placeholder={t("cashier.maxPrice", "Maximum price")}
          className="w-32 px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={maxPrice ?? ""}
          onChange={(e) =>
            setMaxPrice(
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
        />
      </div>
      
      <div className="w-48">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("cashier.selectCategory", "Select category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">
              {t("cashier.all", "All Categories")}
            </SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProductBrowserHeader;
