import React, { useState, useEffect, useRef } from "react";
import type { ProductWithSales, CartItem } from "../../types";
import { useTranslation } from "react-i18next";
import { Plus, ShoppingCart, PlusCircle } from "lucide-react";
import ProductBrowser from "./components/productBrowser";
import AddManualProductModal from "./components/addManualProductModal";
import ReceiptModal from "./components/receiptModal";
import CashierSession from "./components/cashierSession";
import TabbedBrowser from "./components/tabbedBrowser";
import ProductSearch from "./components/productSearch";
import { Tooltip } from "../../lib/components/tooltip";
import { ConfirmDialog } from "../../lib/components/confirmDialog";

const MAX_SESSIONS = 5;

export default function CashierPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [activeSession, setActiveSession] = useState(0);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductWithSales[]>([]);
  const productBrowserRef = useRef<{ handleClose: () => void }>(null);
  const [outOfStockItems, setOutOfStockItems] = useState<CartItem[]>([]);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | undefined>(undefined);
  const [receiptData, setReceiptData] = useState<{
    cart: CartItem[];
    clientName: string;
    discount: number;
    paymentAmount: number;
    paymentType: "none" | "credit" | "versement";
    paymentDate?: Date;
  } | null>(null);

  // Track number of active sessions (start with 1)
  const [sessionCount, setSessionCount] = useState(1);

  // State for each session - separate cart for each session
  const [sessionCarts, setSessionCarts] = useState<CartItem[][]>([[]]);

  // State for each session's discount
  const [sessionDiscounts, setSessionDiscounts] = useState<string[]>([""]);

  // Function to add a new session
  const addNewSession = () => {
    if (sessionCount < MAX_SESSIONS) {
      setSessionCount((prev) => prev + 1);
      setSessionCarts((prev) => [...prev, []]);
      setSessionDiscounts((prev) => [...prev, ""]);
      setActiveSession(sessionCount); // Switch to the new session
    }
  };

  // Function to remove a session
  const removeSession = (sessionIndex: number) => {
    if (sessionCount > 1) {
      setSessionCount((prev) => prev - 1);
      setSessionCarts((prev) =>
        prev.filter((_, index) => index !== sessionIndex),
      );
      setSessionDiscounts((prev) =>
        prev.filter((_, index) => index !== sessionIndex),
      );

      // Adjust active session if necessary
      if (activeSession >= sessionIndex) {
        setActiveSession((prev) => Math.max(0, prev - 1));
      }
    }
  };

  // Get the current session's cart and discount
  const currentCart = sessionCarts[activeSession] || [];
  const currentDiscount = sessionDiscounts[activeSession] || "";

  // Calculate total for current session with discount applied
  const subtotal = currentCart.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );
  const total = Math.max(subtotal - Number(currentDiscount) || 0, 0);

  // Animation state for total changes
  const [isTotalAnimating, setIsTotalAnimating] = useState(false);

  // Animate total when it changes
  useEffect(() => {
    setIsTotalAnimating(true);
    const timer = setTimeout(() => setIsTotalAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [total]);

  // Update cart for specific session
  const updateSessionCart = (sessionIndex: number, newCart: CartItem[]) => {
    setSessionCarts((prev) => {
      const updated = [...prev];
      updated[sessionIndex] = newCart;
      return updated;
    });
  };

  // Update discount for specific session
  const updateSessionDiscount = (sessionIndex: number, newDiscount: string) => {
    setSessionDiscounts((prev) => {
      const updated = [...prev];
      updated[sessionIndex] = newDiscount;
      return updated;
    });
  };

  const handleAddManualProduct = (product: CartItem) => {
    updateSessionCart(activeSession, [...currentCart, product]);
  };

  const handleAddProduct = (product: ProductWithSales) => {
    const updated = [...currentCart];
    const exists = updated.find((item) => item.id === product.id);
    if (exists) {
      exists.qty += 1;
    } else {
      updated.push({
        id: product.id,
        name: product.name,
        price: product.sellingPrice,
        qty: 1,
      });
    }
    updateSessionCart(activeSession, updated);
  };

  // Fetch all products with sales counts
  useEffect(() => {
    const fetchProductsWithSales = async () => {
      try {
        const [products, salesCounts] = await Promise.all([
          window.api.database.products.getAll(),
          window.api.database.products.getSalesCounts(),
        ]);

        // Merge salesCounts into products
        const salesMap = new Map(
          salesCounts.map((s) => [s.productId, s.totalSold]),
        );
        const merged = products.map((p) => ({
          ...p,
          totalSold: salesMap.get(p.id) || 0,
        }));

        setAllProducts(merged as ProductWithSales[]);
      } catch (error) {
        console.error("Error fetching products with sales:", error);
        // Fallback to basic products if sales fetch fails
        const products = await window.api.database.products.getAll();
        setAllProducts(
          products.map((p) => ({ ...p, totalSold: 0 })) as ProductWithSales[],
        );
      }
    };

    fetchProductsWithSales();
  }, [productRefreshKey]);

  // Control scrolling behavior for cashier page
  useEffect(() => {
    // Disable scrolling when component mounts
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  const handleOutOfStock = (items: CartItem[]) => {
    setOutOfStockItems(items);
    setShowStockWarning(true);
  };

  const handleReceiptData = (data: {
    cart: CartItem[];
    clientName: string;
    discount: number;
    paymentAmount: number;
    paymentType: "none" | "credit" | "versement";
    paymentDate?: Date;
  }) => {
    setReceiptData(data);
  };

  const handleSaleComplete = (saleId?: string) => {
    if (saleId) {
      setLastSaleId(saleId);
      setShowReceiptModal(true);
    }

    // Refresh sales history when a sale is completed
    setSalesRefreshKey((prev) => prev + 1);
  };

  const handleSaleCompleted = (saleId?: string) => {
    setSalesRefreshKey((prev) => prev + 1);
  };

  // Proceed with sale despite out of stock warning
  const proceedWithOutOfStockSale = async () => {
    setShowStockWarning(false);
    setOutOfStockItems([]);
    // This would need to be handled by the active session component
    // For now, we'll just close the modal
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveSession((prev) => (prev - 1 + sessionCount) % sessionCount);
      } else if (e.key === "ArrowRight") {
        setActiveSession((prev) => (prev + 1) % sessionCount);
      } else if (e.key === "F1") {
        e.preventDefault(); // Prevent browser help
        if (showProductBrowser) {
          productBrowserRef.current?.handleClose();
        } else {
          setShowProductBrowser(true);
        }
      } else if (e.key === "F2") {
        e.preventDefault(); // Prevent browser help
        setShowManualProductModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showProductBrowser, sessionCount]);

  return (
    <main className="h-screen w-full -mt-13 flex flex-col bg-background text-foreground overflow-hidden">
      {/* === Enhanced Total Header === */}
      <header className="z-20 bg-gradient-to-r from-background via-background/95 to-background/90 backdrop-blur-md flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div
            className={`flex items-center ${isRTL ? "flex-row-reverse" : "justify-between"}`}
          >
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-3">
                <div
                  className={`text-xs text-muted-foreground font-medium tracking-wider uppercase bg-muted/50 px-3 py-1 rounded-full border border-border/50 transition-all duration-300 ${currentCart.length > 0 ? "bg-primary/20 border-primary/30 text-primary animate-pulse" : ""}`}
                >
                  {t("cashier.total", "Total")}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-primary drop-shadow-sm transition-all duration-300 ${isTotalAnimating ? "scale-110 text-primary/80" : "scale-100"}`}
                  >
                    {total.toLocaleString()}
                  </span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-muted-foreground">
                    {t("cashier.currency", "DA")}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? "justify-start" : "justify-end"}`}
            >
              <div className="bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                {t("cashier.session", "Page")} {activeSession + 1}
              </div>
              <div className="bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                {currentCart.length} {t("cashier.products", "Products")}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* === Main Content === */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Favorites Browser (2/5) */}
        <div className="w-2/5 flex-shrink-0 flex flex-col gap-2 h-full px-2">
          {/* Search and Browse/Manual Buttons */}
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex-shrink-0">
            <div className="flex items-center justify-center gap-2">
              <ProductSearch
                onAdd={handleAddProduct}
                refreshKey={productRefreshKey}
              />
              <Tooltip
                content={t(
                  "cashier.tooltipBrowseProducts",
                  "Browse Products (F1)",
                )}
                position="top"
              >
                <button
                  onClick={() => setShowProductBrowser(true)}
                  className="flex h-8 w-8 p-1 text-sm font-semibold border-1 border-border items-center justify-center rounded-md bg-muted/40 hover:bg-muted hover:text-primary transition"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </Tooltip>
              <Tooltip
                content={t(
                  "cashier.tooltipAddManualProduct",
                  "Add Products Manually (F2)",
                )}
                position="top"
              >
                <button
                  onClick={() => setShowManualProductModal(true)}
                  className="flex h-8 w-8 p-1 text-sm font-semibold border-1 border-border items-center justify-center rounded-md bg-muted/40 hover:bg-muted hover:text-primary transition"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Tabbed Browser */}
          <div className="flex-1 min-h-0">
            <TabbedBrowser
              allProducts={allProducts}
              cart={currentCart}
              setCart={(
                newCart: CartItem[] | ((prev: CartItem[]) => CartItem[]),
              ) => {
                const cart =
                  typeof newCart === "function"
                    ? newCart(currentCart)
                    : newCart;
                updateSessionCart(activeSession, cart);
              }}
              salesRefreshKey={salesRefreshKey}
            />
          </div>
        </div>

        {/* RIGHT: Session Content (3/5) */}
        <div className="w-3/5 flex flex-col min-h-0 h-full">
          {/* Session Content */}
          {Array.from({ length: sessionCount }).map((_, sessionIndex) => (
            <CashierSession
              key={sessionIndex}
              allProducts={allProducts}
              productRefreshKey={productRefreshKey}
              setProductRefreshKey={setProductRefreshKey}
              cart={sessionCarts[sessionIndex] || []}
              setCart={(newCart) => {
                const cart =
                  typeof newCart === "function"
                    ? newCart(sessionCarts[sessionIndex] || [])
                    : newCart;
                updateSessionCart(sessionIndex, cart);
              }}
              onOutOfStock={handleOutOfStock}
              onReceiptData={handleReceiptData}
              onSaleComplete={handleSaleComplete}
              onSaleCompleted={handleSaleCompleted}
              onShowProductBrowser={() => setShowProductBrowser(true)}
              onShowManualProductModal={() => setShowManualProductModal(true)}
              isActive={activeSession === sessionIndex}
              discount={sessionDiscounts[sessionIndex] || ""}
              setDiscount={(newDiscount: string) =>
                updateSessionDiscount(sessionIndex, newDiscount)
              }
            />
          ))}
        </div>
      </div>

      {/* Session Selector - Full Width */}
      <div className="gap-3 bg-background flex justify-center items-center px-4 py-4 flex-shrink-0">
        {Array.from({ length: sessionCount }).map((_, i) => {
          const isActive = activeSession === i;
          const hasItems = sessionCarts[i]?.length > 0;

          const baseClasses =
            "px-3 py-1 text-xs font-semibold rounded-md transition border";
          const active = "bg-primary text-secondary border-transparent";
          const green = "bg-green-600 text-white hover:bg-green-700";
          const inactive =
            "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground";

          return (
            <div key={i} className="flex items-center gap-1">
              <Tooltip
                content={
                  hasItems
                    ? t(
                        "cashier.tooltipSessionWithItems",
                        "Session {{number}} - Has {{count}} items in cart",
                        { number: i + 1, count: sessionCarts[i]?.length || 0 },
                      )
                    : t(
                        "cashier.tooltipSessionEmpty",
                        "Session {{number}} - Empty cart, ready for new transaction",
                        { number: i + 1 },
                      )
                }
                position="top"
              >
                <button
                  onClick={() => setActiveSession(i)}
                  className={`${baseClasses} ${
                    isActive ? active : hasItems ? green : inactive
                  }`}
                >
                  {t("cashier.page", { number: i + 1 })}
                </button>
              </Tooltip>
              {sessionCount > 1 && (
                <Tooltip
                  content={t(
                    "cashier.tooltipRemoveSession",
                    "Remove this session",
                  )}
                  position="top"
                >
                  <button
                    onClick={() => removeSession(i)}
                    className="w-5 h-5 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-100 rounded-full flex items-center justify-center transition"
                  >
                    ×
                  </button>
                </Tooltip>
              )}
            </div>
          );
        })}

        {/* Add New Session Button */}
        {sessionCount < MAX_SESSIONS && (
          <Tooltip
            content={t("cashier.tooltipAddSession", "Add new session")}
            position="top"
          >
            <button
              onClick={addNewSession}
              className="px-3 py-1 text-xs font-semibold rounded-md transition border border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {t("cashier.addSession", "Add")}
            </button>
          </Tooltip>
        )}
      </div>

      {/* Product Browser as a modal */}
      <ProductBrowser
        ref={productBrowserRef}
        allProducts={allProducts}
        open={showProductBrowser}
        onClose={() => setShowProductBrowser(false)}
        cart={currentCart}
        setCart={(updater) => {
          const result =
            typeof updater === "function" ? updater(currentCart) : updater;
          updateSessionCart(activeSession, result);
        }}
      />

      {/* === Out of Stock Warning Modal === */}
      <ConfirmDialog
        open={showStockWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowStockWarning(false);
            setOutOfStockItems([]);
          }
        }}
        onConfirm={proceedWithOutOfStockSale}
        title={t("cashier.outOfStockTitle", "Out of Stock Warning")}
        message={t(
          "cashier.outOfStockMessage",
          "Some items in your cart are out of stock. Would you like to proceed with the sale despite this?",
        )}
        confirmText={t("cashier.proceedAnyway", "Proceed Anyway")}
        cancelText={t("cashier.cancel", "Cancel")}
        variant="danger"
      />

      <AddManualProductModal
        open={showManualProductModal}
        onClose={() => setShowManualProductModal(false)}
        onAdd={handleAddManualProduct}
      />

      <ReceiptModal
        open={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setReceiptData(null);
          setLastSaleId(undefined);
        }}
        cart={receiptData?.cart || []}
        clientName={receiptData?.clientName || ""}
        discount={receiptData?.discount || 0}
        paymentAmount={receiptData?.paymentAmount || 0}
        paymentType={receiptData?.paymentType || "none"}
        paymentDate={receiptData?.paymentDate}
        saleId={lastSaleId}
      />
    </main>
  );
}
