import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Package } from "lucide-react";
import { useOrderNotifications } from "../../lib/contexts/orderNotificationsContext";
import { BadgeNotification } from "../../lib/components/badgeNotification";

import { StockTable } from "./components/stockTable";
import AddStockForm from "./components/addStockForm";
import CategorySummaryTable from "./components/categorySummaryTable";
import OrdersSection from "./components/ordersSection";

export default function StockPage() {
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [view] = useState<"product" | "category">("product");
  const [activeTab, setActiveTab] = useState<"stock" | "orders">("stock");
  const [ordersOpened, setOrdersOpened] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { overdueCount, dueSoonCount } = useOrderNotifications();

  // Get notification action from navigation state
  const notificationAction = (location.state as { notificationAction?: string } | null)?.notificationAction;

  useEffect(() => {
    if (notificationAction === "overdueOrders" || notificationAction === "dueSoonOrders") {
      setOrdersOpened(true);
      setActiveTab("orders");
    } else if (notificationAction) setActiveTab("stock");
  }, [notificationAction, location.key]);

  const selectTab = (tab: "stock" | "orders") => {
    if (tab === "orders") setOrdersOpened(true);
    setActiveTab(tab);
  };

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <div className="flex bg-card rounded-t-xl overflow-hidden" role="tablist" aria-label={t("mainMenu.stock", "Stock")}>
        {([
          { value: "stock" as const, label: t("mainMenu.stock", "Stock"), Icon: Package },
          { value: "orders" as const, label: t("orders.tableTitle", "Orders"), Icon: ClipboardList },
        ]).map(({ value, label, Icon }) => (
          <div key={value} role="presentation" className="relative flex-1 min-w-0">
          <button
            id={`stock-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            aria-controls={`stock-panel-${value}`}
            tabIndex={activeTab === value ? 0 : -1}
            onClick={() => selectTab(value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const next = value === "stock" ? "orders" : "stock";
              selectTab(next);
              document.getElementById(`stock-tab-${next}`)?.focus();
            }}
            className={`w-full px-6 py-4 font-medium transition-all duration-200 ${activeTab === value ? "text-green-600 bg-background border-b-2 border-green-600" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
          >
            <span className="flex items-center justify-center gap-2"><Icon className="w-5 h-5" />{label}</span>
          </button>
          {value === "orders" && overdueCount > 0 && <BadgeNotification count={overdueCount} variant="red" className="pointer-events-none top-1 right-1 translate-x-0 translate-y-0 rtl:right-1 rtl:left-auto rtl:translate-x-0" />}
          {value === "orders" && overdueCount === 0 && dueSoonCount > 0 && <BadgeNotification count={dueSoonCount} variant="orange" className="pointer-events-none top-1 right-1 translate-x-0 translate-y-0 rtl:right-1 rtl:left-auto rtl:translate-x-0" />}
          </div>
        ))}
      </div>
      <div id="stock-panel-stock" role="tabpanel" aria-labelledby="stock-tab-stock" hidden={activeTab !== "stock"} className="space-y-4">
        <AddStockForm openPanel={openPanel} setOpenPanel={setOpenPanel} isActive={activeTab === "stock"} />
        {view === "product" ? <StockTable notificationAction={notificationAction} /> : <CategorySummaryTable />}
      </div>
      <div id="stock-panel-orders" role="tabpanel" aria-labelledby="stock-tab-orders" hidden={activeTab !== "orders"} className="space-y-4">{ordersOpened && <OrdersSection isActive={activeTab === "orders"} notificationAction={notificationAction} notificationKey={location.key} />}</div>
    </main>
  );
}
