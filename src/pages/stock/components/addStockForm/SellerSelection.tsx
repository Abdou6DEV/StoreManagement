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

interface Seller {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface SellerSelectionProps {
  form: any;
  showSellerDropdown: boolean;
  setShowSellerDropdown: (show: boolean) => void;
  sellers: Seller[];
  filteredSellers: Seller[];
  setFilteredSellers: (sellers: Seller[]) => void;
  dropdownSellerSearch: string;
  setDropdownSellerSearch: (search: string) => void;
  onSellerSelect: (sellerId: string) => void;
  onFormChange: (key: string, value: any) => void;
}

export default function SellerSelection({
  form,
  showSellerDropdown,
  setShowSellerDropdown,
  sellers,
  filteredSellers,
  setFilteredSellers,
  dropdownSellerSearch,
  setDropdownSellerSearch,
  onSellerSelect,
  onFormChange,
}: SellerSelectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label>{t("stock.seller", "Seller")}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={t("stock.seller", "Seller")}
          value={
            form.sellerName ||
            sellers.find((s) => s.id === form.sellerId)?.name ||
            ""
          }
          onChange={(e) => {
            const value = e.target.value;
            setDropdownSellerSearch(value);
            setFilteredSellers(
              sellers.filter((s) =>
                s.name.toLowerCase().includes(value.toLowerCase())
              )
            );

            // Update sellerName for manual input
            onFormChange("sellerName", value);

            // If exact match found, set sellerId
            const matchingSeller = sellers.find(
              (s) => s.name.toLowerCase() === value.toLowerCase()
            );
            if (matchingSeller) {
              onSellerSelect(matchingSeller.id);
              onFormChange("sellerName", ""); // Clear sellerName when ID is set
            } else {
              onSellerSelect(""); // Clear sellerId for new names
            }
          }}
          className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
        />
        <Popover open={showSellerDropdown} onOpenChange={setShowSellerDropdown}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="px-3 py-2"
              onClick={() => {
                setFilteredSellers(sellers);
                setDropdownSellerSearch("");
                setShowSellerDropdown(true);
              }}
            >
              {t("stock.chooseSeller", "Choose")}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0 z-50">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("stock.searchSeller", "Search seller...")}
                value={dropdownSellerSearch}
                onValueChange={(value) => {
                  setDropdownSellerSearch(value);
                  setFilteredSellers(
                    sellers.filter((s) =>
                      s.name.toLowerCase().includes(value.toLowerCase())
                    )
                  );
                }}
              />
              <CommandList style={{ maxHeight: 200, overflowY: "auto" }}>
                <CommandEmpty>
                  {t("stock.noSeller", "No seller found.")}
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => {
                      onSellerSelect("");
                      onFormChange("sellerName", "");
                      setShowSellerDropdown(false);
                    }}
                  >
                    {t("stock.noSeller", "No Seller")}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        !form.sellerId ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                  {filteredSellers.map((seller) => (
                    <CommandItem
                      key={seller.id}
                      value={seller.name}
                      onSelect={() => {
                        onSellerSelect(seller.id);
                        onFormChange("sellerName", "");
                        setShowSellerDropdown(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{seller.name}</span>
                        {seller.phone && (
                          <span className="text-xs text-muted-foreground">
                            {seller.phone}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          form.sellerId === seller.id
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
