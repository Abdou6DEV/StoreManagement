import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, Clock, Lock } from "lucide-react";
import FavoritesBrowser from "./favoritesBrowser";
import HistoryBrowser from "./historyBrowser";
import type { ProductWithSales, CartItem } from "../../../types";
import rendererLogger from "../../../lib/logger/rendererLogger";
import { useCashierHistory } from "../../../lib/contexts/cashierHistoryContext";

interface TabbedBrowserProps {
  allProducts: ProductWithSales[];
  productsInitialFetchDone: boolean;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  salesRefreshKey?: number;
  addProductToCart: (cart: CartItem[], product: ProductWithSales, allProducts: ProductWithSales[], onOutOfStock: (product: ProductWithSales, currentQty: number) => void) => CartItem[] | null;
  onOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  outOfStockConfirmed: boolean;
}

type TabType = "favorites" | "history";

const TabbedBrowser: React.FC<TabbedBrowserProps> = ({
  allProducts,
  productsInitialFetchDone,
  cart,
  setCart,
  salesRefreshKey,
  addProductToCart,
  onOutOfStock,
  outOfStockConfirmed,
}) => {
  const { t } = useTranslation();
  const { isEnabled: isHistoryEnabled, isLoading: isHistoryLoading } = useCashierHistory();
  const [activeTab, setActiveTab] = useState<TabType>("favorites");
  /** Once true, History stays mounted (hidden on Favorites) so switching back does not refetch. */
  const [historyTabWasOpened, setHistoryTabWasOpened] = useState(false);

  const tabs = [
    {
      id: "favorites" as TabType,
      label: t("cashier.favorites", "Favorites"),
      icon: Star,
      count: 0, // Will be updated by FavoritesBrowser
      disabled: false,
    },
    {
      id: "history" as TabType,
      label: t("cashier.history", "History"),
      icon: isHistoryEnabled ? Clock : Lock,
      count: 0, // Will be updated by HistoryBrowser
      disabled: !isHistoryEnabled || isHistoryLoading,
    },
  ];

  const handleSaleSelect = (sale: any) => {
    // Optional: Handle sale selection (e.g., show details modal)
    rendererLogger.debug("Selected sale", "TabbedBrowser", { saleId: sale.id });
  };

  const handleTabClick = (tabId: TabType) => {
    const tab = tabs.find((x) => x.id === tabId);
    if (tab && !tab.disabled) {
      if (tabId === "history") {
        setHistoryTabWasOpened(true);
      }
      setActiveTab(tabId);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm h-full overflow-hidden flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-muted/20">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={tab.disabled}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                tab.disabled
                  ? "text-muted-foreground/50 cursor-not-allowed opacity-50"
                  : isActive
                  ? "text-primary bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && !tab.disabled && (
                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Both panels stay mounted after first shown (hidden when inactive) so tab switches do not remount — no reload spinner or stagger replay. */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          className={`min-h-0 flex-1 flex flex-col ${activeTab !== "favorites" ? "hidden" : ""}`}
          aria-hidden={activeTab !== "favorites"}
        >
          <FavoritesBrowser
            allProducts={allProducts}
            productsInitialFetchDone={productsInitialFetchDone}
            cart={cart}
            setCart={setCart}
            addProductToCart={addProductToCart}
            onOutOfStock={onOutOfStock}
            outOfStockConfirmed={outOfStockConfirmed}
          />
        </div>

        {historyTabWasOpened && (
          <div
            className={`min-h-0 flex-1 flex flex-col overflow-y-auto p-3 ${activeTab !== "history" ? "hidden" : ""}`}
            aria-hidden={activeTab !== "history"}
          >
            <HistoryBrowser
              onSaleSelect={handleSaleSelect}
              salesRefreshKey={salesRefreshKey}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TabbedBrowser;
