import { useState, useEffect } from "react";
import { Clock, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProductWithSales, CartItem } from "../../../types";
import type { Session } from "./sessionManager";
import TotalHeader from "./totalHeader";
import ProductControls from "./productControls";
import TabbedBrowser from "./tabbedBrowser";
import CashierSession from "./cashierSession";
import SessionSelector from "./sessionSelector";

interface CashierLayoutProps {
  sessions: Session[];
  activeSession: number;
  allProducts: ProductWithSales[];
  isRTL: boolean;
  productRefreshKey: number;
  setProductRefreshKey: (key: number | ((prev: number) => number)) => void;
  salesRefreshKey: number;
  onShowProductBrowser: () => void;
  onShowManualProductModal: () => void;
  onShowServiceModal: () => void;
  onAddProduct: (product: ProductWithSales | CartItem) => void;
  onAddManualProduct: (product: CartItem) => void;
  onSessionChange: (sessionIndex: number) => void;
  onAddSession: () => void;
  onRemoveSession: (sessionIndex: number) => void;
  onUpdateSessionCart: (sessionIndex: number, newCart: CartItem[]) => void;
  onUpdateSessionDiscount: (sessionIndex: number, newDiscount: string) => void;
  onUpdateSessionClient: (sessionIndex: number, clientName: string, clientId: string | null) => void;
  onUpdateSessionPayment: (sessionIndex: number, paymentAmount: number, paymentType: "none" | "credit" | "versement", paymentDate: Date | undefined) => void;
  onOutOfStock: (items: CartItem[]) => void;
  onReceiptData: (data: any) => void;
  onSaleComplete: (saleId?: string, soldItems?: CartItem[]) => void;
  onSaleCompleted: (saleId?: string, soldItems?: CartItem[]) => void;
  maxSessions: number;
  addProductToCart: (cart: CartItem[], product: ProductWithSales, allProducts: ProductWithSales[], onOutOfStock: (product: ProductWithSales, currentQty: number) => void) => CartItem[] | null;
  onProductOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  outOfStockConfirmed: boolean;
}

export default function CashierLayout({
  sessions,
  activeSession,
  allProducts,
  isRTL,
  productRefreshKey,
  setProductRefreshKey,
  salesRefreshKey,
  onShowProductBrowser,
  onShowManualProductModal,
  onShowServiceModal,
  onAddProduct,
  onAddManualProduct,
  onSessionChange,
  onAddSession,
  onRemoveSession,
  onUpdateSessionCart,
  onUpdateSessionDiscount,
  onUpdateSessionClient,
  onUpdateSessionPayment,
  onOutOfStock,
  onReceiptData,
  onSaleComplete,
  onSaleCompleted,
  maxSessions,
  addProductToCart,
  onProductOutOfStock,
  outOfStockConfirmed,
}: CashierLayoutProps) {
  const { t } = useTranslation();
  const currentSession = sessions[activeSession] || sessions[0];
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update date/time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="h-screen w-full -mt-13 flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Date and Time Display - Top Left Corner */}
      <div className={`fixed top-0 ${isRTL ? "right-0" : "left-0"} z-50 p-4`}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Calendar className="w-4 h-4 text-primary" />
          <span>
            {t(`datePicker.dayNames.${currentDateTime.getDay()}`, currentDateTime.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }))} - {currentDateTime.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-lg font-bold text-foreground mt-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono">
            {currentDateTime.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* Enhanced Total Header */}
      <TotalHeader
        cart={currentSession.cart}
        discount={currentSession.discount}
        isRTL={isRTL}
      />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Favorites Browser (2/5) */}
        <div className="w-2/5 flex-shrink-0 flex flex-col gap-2 h-full px-2">
          {/* Search and Browse/Manual Buttons */}
          <ProductControls
            onShowProductBrowser={onShowProductBrowser}
            onShowManualProductModal={onShowManualProductModal}
            onShowServiceModal={onShowServiceModal}
            onAddProduct={onAddProduct}
            productRefreshKey={productRefreshKey}
            cart={currentSession.cart}
            onClientSelect={(clientId, clientName) => 
              onUpdateSessionClient(activeSession, clientName, clientId)
            }
          />

          {/* Tabbed Browser */}
          <div className="flex-1 min-h-0">
            <TabbedBrowser
              allProducts={allProducts}
              cart={currentSession.cart}
              setCart={(
                newCart: CartItem[] | ((prev: CartItem[]) => CartItem[]),
              ) => {
                const cart =
                  typeof newCart === "function"
                    ? newCart(currentSession.cart)
                    : newCart;
                onUpdateSessionCart(activeSession, cart);
              }}
              salesRefreshKey={salesRefreshKey}
              addProductToCart={addProductToCart}
              onOutOfStock={onProductOutOfStock}
              outOfStockConfirmed={outOfStockConfirmed}
            />
          </div>
        </div>

        {/* RIGHT: Session Content (3/5) */}
        <div className="w-3/5 flex flex-col min-h-0 h-full">
          {/* Session Content - Only render active session for performance */}
          {sessions.map((session, sessionIndex) => {
            // Only render the active session to improve performance
            if (activeSession !== sessionIndex) {
              return null;
            }
            
            return (
              <CashierSession
                key={sessionIndex}
                allProducts={allProducts}
                productRefreshKey={productRefreshKey}
                setProductRefreshKey={setProductRefreshKey}
                cart={session.cart}
                setCart={(newCart) => {
                  const cart =
                    typeof newCart === "function"
                      ? newCart(session.cart)
                      : newCart;
                  onUpdateSessionCart(sessionIndex, cart);
                }}
                onProductOutOfStock={onProductOutOfStock}
                onSaleComplete={onSaleComplete}
                onSaleCompleted={onSaleCompleted}
                isActive={true} // Always true since we only render active session
                discount={session.discount}
                setDiscount={(newDiscount: string) =>
                  onUpdateSessionDiscount(sessionIndex, newDiscount)
                }
                outOfStockConfirmed={outOfStockConfirmed}
                sessions={sessions}
                activeSession={activeSession}
                onSessionChange={onSessionChange}
                onUpdateSessionClient={onUpdateSessionClient}
                onUpdateSessionPayment={onUpdateSessionPayment}
              />
            );
          })}
        </div>
      </div>

      {/* Session Selector - Full Width */}
      <SessionSelector
        sessions={sessions}
        activeSession={activeSession}
        maxSessions={maxSessions}
        onSessionChange={onSessionChange}
        onAddSession={onAddSession}
        onRemoveSession={onRemoveSession}
      />
    </main>
  );
}
