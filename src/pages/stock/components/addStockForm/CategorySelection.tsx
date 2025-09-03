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
import { cn } from "../../../../lib/utils";

interface CategorySelectionProps {
  form: any;
  isExistingProduct: boolean;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (show: boolean) => void;
  filteredCategories: string[];
  setFilteredCategories: (categories: string[]) => void;
  dropdownCategorySearch: string;
  setDropdownCategorySearch: (search: string) => void;
  categories: string[];
  onCategorySelect: (category: string) => void;
  onFormChange: (key: string, value: any) => void;
}

export default function CategorySelection({
  form,
  isExistingProduct,
  showCategoryDropdown,
  setShowCategoryDropdown,
  filteredCategories,
  setFilteredCategories,
  dropdownCategorySearch,
  setDropdownCategorySearch,
  categories,
  onCategorySelect,
  onFormChange,
}: CategorySelectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className={isExistingProduct ? "text-muted-foreground" : ""}>
        {t("stock.type")}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={t("stock.type")}
          value={form.categoryName}
          onChange={(e) => onFormChange("categoryName", e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
          required
          disabled={isExistingProduct}
        />
        <Popover
          open={showCategoryDropdown}
          onOpenChange={(open) => {
            if (!isExistingProduct || !open) {
              setShowCategoryDropdown(open);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
              disabled={isExistingProduct}
              onClick={() => {
                if (!isExistingProduct) {
                  setFilteredCategories(categories);
                  setDropdownCategorySearch("");
                  setShowCategoryDropdown(true);
                }
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
                        onCategorySelect(value);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      {cat}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          form.categoryName === cat
                            ? "opacity-100"
                            : "opacity-0"
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
  );
}
