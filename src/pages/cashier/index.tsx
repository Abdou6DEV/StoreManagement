import { useState, useEffect, useRef } from "react";
import type { ProductWithSales, CartItem } from "../../types";
import { useTranslation } from "react-i18next";
import ProductBrowser from "./components/productBrowser";
import AddManualProductModal from "./components/addManualProductModal";
import AddServiceModal from "./components/addServiceModal";
import ReceiptModal from "./components/receiptModal";
import CashierLayout from "./components/cashierLayout";
import SessionManager from "./components/sessionManager";
import { ConfirmDialog } from "../../lib/components/confirmDialog";
import rendererLogger from "../../lib/logger/rendererLogger";

const MAX_SESSIONS = 5;

// Cart utility functions
function addProductToCart(
  cart: CartItem[],
  product: ProductWithSales,
): CartItem[] {
  const updated = [...cart];
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

  return updated;
}

function addManualProductToCart(
  cart: CartItem[],
  product: CartItem,
): CartItem[] {
  return [...cart, product];
}

export default function CashierPage() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductWithSales[]>([]);
  const productBrowserRef = useRef<{ handleClose: () => void }>(null);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
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
          salesCounts.map((s: any) => [s.productId, s.totalSold]),
        );
        const merged = products.map((p: any) => ({
          ...p,
          totalSold: salesMap.get(p.id) || 0,
        }));

        setAllProducts(merged as ProductWithSales[]);
      } catch (error) {
        rendererLogger.error(
          "Error fetching products with sales",
          "CashierPage",
          error,
        );
        // Fallback to basic products if sales fetch fails
        const products = await window.api.database.products.getAll();
        setAllProducts(
          products.map((p: any) => ({
            ...p,
            totalSold: 0,
          })) as ProductWithSales[],
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

  const handleOutOfStock = () => {
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

  const handleSaleCompleted = () => {
    setSalesRefreshKey((prev) => prev + 1);
  };

  // Proceed with sale despite out of stock warning
  const proceedWithOutOfStockSale = async () => {
    setShowStockWarning(false);
    // This would need to be handled by the active session component
    // For now, we'll just close the modal
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") {
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
  }, [showProductBrowser]);

  return (
    <SessionManager maxSessions={MAX_SESSIONS}>
      {(sessions, activeSession, sessionActions) => (
        <>
          <CashierLayout
            sessions={sessions}
            activeSession={activeSession}
            allProducts={allProducts}
            isRTL={isRTL}
            productRefreshKey={productRefreshKey}
            setProductRefreshKey={setProductRefreshKey}
            salesRefreshKey={salesRefreshKey}
            onShowProductBrowser={() => setShowProductBrowser(true)}
            onShowManualProductModal={() => setShowManualProductModal(true)}
            onShowServiceModal={() => setShowServiceModal(true)}
            onAddProduct={(product: ProductWithSales) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addProductToCart(
                currentSession.cart,
                product,
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
            onAddManualProduct={(product: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                product,
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
            onSessionChange={sessionActions.setActiveSession}
            onAddSession={sessionActions.addSession}
            onRemoveSession={sessionActions.removeSession}
            onUpdateSessionCart={sessionActions.updateSessionCart}
            onUpdateSessionDiscount={sessionActions.updateSessionDiscount}
            onOutOfStock={handleOutOfStock}
            onReceiptData={handleReceiptData}
            onSaleComplete={handleSaleComplete}
            onSaleCompleted={handleSaleCompleted}
            maxSessions={MAX_SESSIONS}
          />

          {/* Product Browser as a modal */}
          <ProductBrowser
            ref={productBrowserRef}
            allProducts={allProducts}
            open={showProductBrowser}
            onClose={() => setShowProductBrowser(false)}
            cart={sessionActions.getCurrentSession().cart}
            setCart={(updater) => {
              const currentCart = sessionActions.getCurrentSession().cart;
              const result =
                typeof updater === "function" ? updater(currentCart) : updater;
              sessionActions.updateSessionCart(activeSession, result);
            }}
          />

          {/* Out of Stock Warning Modal */}
          <ConfirmDialog
            open={showStockWarning}
            onOpenChange={(open) => {
              if (!open) {
                setShowStockWarning(false);
                setOutOfStockItems([]);
              }
            }}
            onConfirm={proceedWithOutOfStockSale}
            title="Out of Stock Warning"
            message="Some items in your cart are out of stock. Would you like to proceed with the sale despite this?"
            confirmText="Proceed Anyway"
            cancelText="Cancel"
            variant="danger"
          />

          <AddManualProductModal
            open={showManualProductModal}
            onClose={() => setShowManualProductModal(false)}
            onAdd={(product: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                product,
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
          />

          <AddServiceModal
            open={showServiceModal}
            onClose={() => setShowServiceModal(false)}
            onAdd={(service: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                service,
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
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
        </>
      )}
    </SessionManager>
  );
}
