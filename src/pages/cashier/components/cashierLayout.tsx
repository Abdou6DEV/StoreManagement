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
  onAddProduct: (product: ProductWithSales) => void;
  onAddManualProduct: (product: CartItem) => void;
  onSessionChange: (sessionIndex: number) => void;
  onAddSession: () => void;
  onRemoveSession: (sessionIndex: number) => void;
  onUpdateSessionCart: (sessionIndex: number, newCart: CartItem[]) => void;
  onUpdateSessionDiscount: (sessionIndex: number, newDiscount: string) => void;
  onOutOfStock: (items: CartItem[]) => void;
  onReceiptData: (data: any) => void;
  onSaleComplete: (saleId?: string) => void;
  onSaleCompleted: (saleId?: string) => void;
  maxSessions: number;
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
  onOutOfStock,
  onReceiptData,
  onSaleComplete,
  onSaleCompleted,
  maxSessions,
}: CashierLayoutProps) {
  const currentSession = sessions[activeSession] || sessions[0];

  return (
    <main className="h-screen w-full -mt-13 flex flex-col bg-background text-foreground overflow-hidden">
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
            />
          </div>
        </div>

        {/* RIGHT: Session Content (3/5) */}
        <div className="w-3/5 flex flex-col min-h-0 h-full">
          {/* Session Content */}
          {sessions.map((session, sessionIndex) => (
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
              onOutOfStock={onOutOfStock}
              onReceiptData={onReceiptData}
              onSaleComplete={onSaleComplete}
              onSaleCompleted={onSaleCompleted}
              onShowProductBrowser={onShowProductBrowser}
              onShowManualProductModal={onShowManualProductModal}
              isActive={activeSession === sessionIndex}
              discount={session.discount}
              setDiscount={(newDiscount: string) =>
                onUpdateSessionDiscount(sessionIndex, newDiscount)
              }
            />
          ))}
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
