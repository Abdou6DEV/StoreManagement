import { useState, useEffect } from "react";
import type { Product } from "@prisma/client";
import type { CartItem } from "../../types";
import { useTranslation } from "react-i18next";
import OutOfStockWarningModal from "./components/outOfStockWarningModal";
import ProductBrowser from "./components/productBrowser";
import AddManualProductModal from "./components/addManualProductModal";
import ReceiptModal from "./components/receiptModal";
import CashierSession from "./components/cashierSession";

const MAX_SESSIONS = 5;

export default function CashierPage() {
  const { t } = useTranslation();
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [activeSession, setActiveSession] = useState(0);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
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

  // State for each session - separate cart for each session
  const [sessionCarts, setSessionCarts] = useState<CartItem[][]>(
    Array.from({ length: MAX_SESSIONS }, (): CartItem[] => []),
  );

  // Get the current session's cart
  const currentCart = sessionCarts[activeSession] || [];

  // Calculate total for current session
  const total = currentCart.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );

  // Update cart for specific session
  const updateSessionCart = (sessionIndex: number, newCart: CartItem[]) => {
    setSessionCarts((prev) => {
      const updated = [...prev];
      updated[sessionIndex] = newCart;
      return updated;
    });
  };

  const handleAddManualProduct = (product: CartItem) => {
    updateSessionCart(activeSession, [...currentCart, product]);
  };

  // Fetch all products
  useEffect(() => {
    window.api.database.products.getAll().then((products) => {
      setAllProducts(products as any);
    });
  }, [productRefreshKey]);

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
        setActiveSession((prev) => (prev - 1 + MAX_SESSIONS) % MAX_SESSIONS);
      } else if (e.key === "ArrowRight") {
        setActiveSession((prev) => (prev + 1) % MAX_SESSIONS);
      } else if (e.key === "F1") {
        e.preventDefault(); // Prevent browser help
        setShowProductBrowser((prev) => !prev);
      } else if (e.key === "F2") {
        e.preventDefault(); // Prevent browser help
        setShowManualProductModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <main className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* === Sticky Total Hader === */}
      <header className="z-20 bg-background/80 backdrop-blur pb-2">
        <div className="max-w-5xl mx-auto text-center leading-none py-1">
          <div className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
            {t("cashier.total", "Total")}
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary drop-shadow-sm">
            {total.toLocaleString()} DA
          </div>
        </div>
      </header>

      {/* === Main Content === */}
      <div className="flex-1 flex flex-col">
        {/* Session Content */}
        {Array.from({ length: MAX_SESSIONS }).map((_, sessionIndex) => (
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
            onShowProductBrowser={() => setShowProductBrowser(true)}
            onShowManualProductModal={() => setShowManualProductModal(true)}
            isActive={activeSession === sessionIndex}
          />
        ))}
        {/* === Session Selector === */}
        <div className="gap-3 bg-background flex justify-center items-center px-4">
          {Array.from({ length: MAX_SESSIONS }).map((_, i) => {
            const isActive = activeSession === i;
            const hasItems = sessionCarts[i]?.length > 0;

            const baseClasses =
              "px-3 py-1 text-xs font-semibold rounded-md transition border";
            const active = "bg-primary text-secondary border-transparent";
            const green = "bg-green-600 text-white hover:bg-green-700";
            const inactive =
              "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground";

            return (
              <button
                key={i}
                onClick={() => setActiveSession(i)}
                className={`${baseClasses} ${
                  isActive ? active : hasItems ? green : inactive
                }`}
              >
                {t("cashier.page", { number: i + 1 })}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Browser as a modal */}
      <ProductBrowser
        allProducts={allProducts as any}
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
      <OutOfStockWarningModal
        open={showStockWarning}
        items={outOfStockItems}
        allProducts={allProducts as any}
        onCancel={() => {
          setShowStockWarning(false);
          setOutOfStockItems([]);
        }}
        onProceed={proceedWithOutOfStockSale}
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
