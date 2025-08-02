import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, Clock } from "lucide-react";
import FavoritesBrowser from "./favoritesBrowser";
import HistoryBrowser from "./historyBrowser";
import type { ProductWithSales, CartItem } from "../../../types";

interface TabbedBrowserProps {
  allProducts: ProductWithSales[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  salesRefreshKey?: number;
}

type TabType = "favorites" | "history";

const TabbedBrowser: React.FC<TabbedBrowserProps> = ({
  allProducts,
  cart,
  setCart,
  salesRefreshKey,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("favorites");

  const tabs = [
    {
      id: "favorites" as TabType,
      label: t("cashier.favorites", "Favorites"),
      icon: Star,
      count: 0, // Will be updated by FavoritesBrowser
    },
    {
      id: "history" as TabType,
      label: t("cashier.history", "History"),
      icon: Clock,
      count: 0, // Will be updated by HistoryBrowser
    },
  ];

  const handleSaleSelect = (sale: any) => {
    // Optional: Handle sale selection (e.g., show details modal)
    console.log("Selected sale:", sale);
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "text-primary bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <div
          className={`h-full ${activeTab === "favorites" ? "block" : "hidden"}`}
        >
          <FavoritesBrowser
            allProducts={allProducts}
            cart={cart}
            setCart={setCart}
          />
        </div>

        <div
          className={`h-full p-3 overflow-y-auto ${activeTab === "history" ? "block" : "hidden"}`}
        >
          <HistoryBrowser
            onSaleSelect={handleSaleSelect}
            salesRefreshKey={salesRefreshKey}
          />
        </div>
      </div>
    </div>
  );
};

export default TabbedBrowser;
