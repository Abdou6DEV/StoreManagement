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
import { Product } from "@prisma/client";

const MAX_SESSIONS = 5;

// Cart utility functions
function addProductToCart(
  cart: CartItem[],
  product: ProductWithSales
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
  product: CartItem
): CartItem[] {
  return [...cart, product];
}

export default function CashierPage() {
  const { t, i18n } = useTranslation();
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
  const [outOfStockConfirmed, setOutOfStockConfirmed] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);

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
          salesCounts.map((s: { productId: string; totalSold: number }) => [s.productId, s.totalSold])
        );
        const merged = products.map((p: Product) => ({
          ...p,
          totalSold: salesMap.get(p.id) || 0,
        }));

        setAllProducts(merged as ProductWithSales[]);
      } catch (error) {
        rendererLogger.error(
          "Error fetching products with sales",
          "CashierPage",
          error
        );
        // Fallback to basic products if sales fetch fails
        const products = await window.api.database.products.getAll();
        setAllProducts(
          products.map((p: Product) => ({
            ...p,
            totalSold: 0,
          })) as ProductWithSales[]
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
      // Don't show receipt modal - printing is handled directly in cashier session
    }

    // Refresh sales history when a sale is completed
    setSalesRefreshKey((prev) => prev + 1);
  };

  const handleSaleCompleted = () => {
    setSalesRefreshKey((prev) => prev + 1);
  };

  // Proceed with sale despite out of stock warning
  const proceedWithOutOfStockSale = async () => {
    // Set the flag to allow the sale to proceed
    setOutOfStockConfirmed(true);
    setShowStockWarning(false);

    // Automatically proceed with the sale after a brief delay
    setTimeout(() => {
      // Reset the flag after the sale completes
      setOutOfStockConfirmed(false);
    }, 1000);
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

  // Optimized ENTER key handler for finishing sales
  useEffect(() => {
    let enterPressStartTime: number | null = null;
    let enterPressTimer: NodeJS.Timeout | null = null;
    let isEnterPressed = false;
    let hasTriggeredLongPress = false;
    let lastEventTime = 0;
    const DEBOUNCE_TIME = 50; // 50ms debounce - reduced for better responsiveness

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle ENTER key
      if (e.key !== "Enter") return;
      
      console.log('🔍 KeyDown detected:', {
        target: e.target,
        isEnterPressed,
        hasTriggeredLongPress,
        timeSinceLastEvent: Date.now() - lastEventTime
      });
      
      // Debounce rapid key presses
      const now = Date.now();
      if (now - lastEventTime < DEBOUNCE_TIME) {
        console.log('⏱️ Debounced - too soon');
        return;
      }
      lastEventTime = now;
      
      // Check if we should handle this key press
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSearchInput = target instanceof HTMLInputElement && 
        target.placeholder && 
        (target.placeholder.includes('Type name or scan barcode') ||
         target.placeholder.includes('Tapez le nom ou scannez le code-barres') ||
         target.placeholder.includes('اكتب الاسم أو امسح الباركود'));
      
      console.log('🎯 Target analysis:', {
        tagName: target.tagName,
        isInputField,
        isSearchInput,
        placeholder: target instanceof HTMLInputElement ? target.placeholder : 'N/A'
      });
      
      // Skip input fields except search input
      if (isInputField && !isSearchInput) {
        console.log('❌ Skipped - not search input');
        return;
      }
      
      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // If already pressed, ignore repeated keydown events
      if (isEnterPressed) {
        console.log('⚠️ Already pressed - ignoring');
        return;
      }
      
      // Reset state
      isEnterPressed = true;
      hasTriggeredLongPress = false;
      enterPressStartTime = now;
      
      console.log('✅ Starting long press detection');
      
      // Show visual indicator immediately
      setIsLongPressing(true);
      
      // Start timer for long press (0.6 seconds)
      enterPressTimer = setTimeout(() => {
        console.log('⏰ Long press timer fired:', {
          isEnterPressed,
          hasTriggeredLongPress,
          timeElapsed: Date.now() - enterPressStartTime
        });
        
        if (isEnterPressed && !hasTriggeredLongPress) {
          hasTriggeredLongPress = true;
          console.log('🎉 Long press confirmed - triggering receipt');
          // Long press detected - trigger receipt
          requestAnimationFrame(() => {
            const event = new CustomEvent('cashier-finish-with-receipt');
            window.dispatchEvent(event);
            setIsLongPressing(false);
          });
        }
      }, 600);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !isEnterPressed) {
        return;
      }
      
      console.log('🔍 KeyUp detected:', {
        isEnterPressed,
        hasTriggeredLongPress,
        timeElapsed: enterPressStartTime ? Date.now() - enterPressStartTime : 0
      });
      
      // Prevent default behavior and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Reset state
      isEnterPressed = false;
      
      // Hide visual indicator
      setIsLongPressing(false);
      
      // Clear timer
      if (enterPressTimer) {
        clearTimeout(enterPressTimer);
        enterPressTimer = null;
        console.log('⏰ Timer cleared');
      }
      
      // If it was a short press (less than 0.6 seconds) and no long press was triggered
      if (enterPressStartTime && 
          Date.now() - enterPressStartTime < 600 && 
          !hasTriggeredLongPress) {
        console.log('⚡ Short press detected - triggering normal finish');
        // Use requestAnimationFrame for smoother execution
        requestAnimationFrame(() => {
          const event = new CustomEvent('cashier-finish-sale');
          window.dispatchEvent(event);
        });
      } else if (hasTriggeredLongPress) {
        console.log('✅ Long press was already triggered');
      } else {
        console.log('❌ No action - conditions not met');
      }
      
      // Reset tracking variables
      enterPressStartTime = null;
      hasTriggeredLongPress = false;
    };
    
    // Use capture phase for better event handling and prevent conflicts
    // Add with high priority to ensure we handle the event first
    document.addEventListener("keydown", handleKeyDown, { capture: true, passive: false });
    document.addEventListener("keyup", handleKeyUp, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("keyup", handleKeyUp, { capture: true });
      if (enterPressTimer) {
        clearTimeout(enterPressTimer);
      }
    };
  }, []);

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
                product
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
            onAddManualProduct={(product: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                product
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
            outOfStockConfirmed={outOfStockConfirmed}
            maxSessions={MAX_SESSIONS}
            isLongPressing={isLongPressing}
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
              }
            }}
            onConfirm={proceedWithOutOfStockSale}
            title={t("cashier.outOfStockTitle")}
            message={t("cashier.outOfStockMessage")}
            confirmText={t("cashier.proceedAnyway")}
            cancelText={t("common.cancel")}
            variant="danger"
          />

          <AddManualProductModal
            open={showManualProductModal}
            onClose={() => setShowManualProductModal(false)}
            onAdd={(product: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                product
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
                service
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
