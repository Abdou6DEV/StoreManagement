import React, { useState, useMemo, useEffect } from "react";
import type { Product } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import ProductSearch from "./components/productSearch";
import CartTable from "./components/cartTable";
import PaymentSummary from "./components/paymentSummary";
import ActionButtons from "./components/actionButtons";
import OutOfStockWarningModal from "./components/outOfStockWarningModal";
import ProductBrowser from "./components/productBrowser";
import DiscountErrorModal from "./components/discountErrorModal";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const MAX_SESSIONS = 5;

export default function CashierPage() {
  const { t } = useTranslation();
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [activeSession, setActiveSession] = useState(0);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<CartItem[]>([]);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [sessions, setSessions] = useState<CartItem[][]>(
    Array.from({ length: MAX_SESSIONS }, (): CartItem[] => []),
  );
  const [discounts, setDiscounts] = useState<string[]>(Array.from({ length: MAX_SESSIONS }, () => ""));
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Ensure cart always exists
  const cart: CartItem[] = useMemo(() => {
    return Array.isArray(sessions[activeSession])
      ? sessions[activeSession]
      : [];
  }, [sessions, activeSession]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart],
  );

  const updateSession = (newCart: CartItem[]) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[activeSession] = newCart ?? [];
      return updated;
    });
  };

  const handleAddProduct = (product: Product) => {
    const updated = [...cart];
    const exists = updated.find((item) => item.id === product.id);
    if (exists) {
      exists.qty += 1;
    } else {
      updated.push({
        id: product.id,
        name: product.name,
        price: product.selling,
        qty: 1,
      });
    }
    updateSession(updated);
  };

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const discount = discounts[activeSession];

  // Fetch all products
  useEffect(() => {
    window.api.database.products.getAll().then((products) => {
      setAllProducts(products);
    });
  }, [productRefreshKey]);

  // Alerts
  const handleAddClient = async (
    name: string,
    phone?: string,
    address?: string,
    notes?: string,
  ) => {
    try {
      const client = await window.api.database.clients.create({
        name,
        phone,
        address,
        notes,
      });
      setClientName(name);
      setClientId(client.id);
    } catch (err) {
      alert(t("cashier.failedAddClient", "Failed to add client"));
    }
  };

  // Clear the cart
  const handleClear = () => {
    updateSession([]);
    setDiscounts((prev) => {
      const updated = [...prev];
      updated[activeSession] = "";
      return updated;
    });
    setClientName("");
    setClientId(null);
  };

  const handleFinish = async () => {
    if (cart.length === 0) return;
    const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    if (Number(discount) > cartTotal) {
      setDiscountError(t("cashier.discountError", "Discount cannot exceed total amount"));
      return;
    } else {
      setDiscountError(null);
    }
    // Check for out-of-stock items
    const outOfStock = cart.filter((item) => {
      const product = allProducts.find((p) => p.id === item.id);
      return product && item.qty > product.quantity;
    });

    if (outOfStock.length > 0) {
      setOutOfStockItems(outOfStock);
      setShowStockWarning(true);
      return;
    }
    await proceedWithSale();
  };

  // Extracted sale logic for reuse
  const proceedWithSale = async () => {
    let saleClientId = clientId;
    try {
      if (clientName.trim() && !clientId) {
        const client = await window.api.database.clients.create({
          name: clientName.trim(),
        });
        saleClientId = client.id;
        setClientId(client.id);
      }
      await window.api.database.sales.create({
        clientId: saleClientId || undefined,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.qty,
          price: item.price,
        })),
        discount: Number(discount) || 0,
      });
      updateSession([]);
      setClientName("");
      setClientId(null);
      setDiscounts((prev) => {
        const updated = [...prev];
        updated[activeSession] = "";
        return updated;
      });
      setProductRefreshKey((k) => k + 1);
      alert(t("cashier.saleRecorded", "Sale recorded successfully"));
    } catch (err) {
      alert(t("cashier.failedRecordSale", "Failed to record sale"));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveSession((prev) => (prev - 1 + MAX_SESSIONS) % MAX_SESSIONS);
      } else if (e.key === "ArrowRight") {
        setActiveSession((prev) => (prev + 1) % MAX_SESSIONS);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <main className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden -mt-13">
      {/* === Sticky Total Header === */}
      <header className="shrink-0 sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border pb-2">
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
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-2 sm:px-4 lg:px-6 py-3 overflow-hidden">
        {/* LEFT: Product + Cart */}
        <section className="w-full lg:w-2/5 flex flex-col gap-3 overflow-hidden">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm h-full flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <ProductSearch
                onAdd={handleAddProduct}
                refreshKey={productRefreshKey}
              />
              <button
                onClick={() => setShowProductBrowser(!showProductBrowser)}
                className="flex h-8 p-1 mt-6 text-sm font-semibold border-1 border-border items-center rounded-md bg-muted/40 hover:bg-muted hover:text-primary transition"
              >
                {showProductBrowser ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Product Browser as a separate component */}
            <ProductBrowser
              allProducts={allProducts}
              show={showProductBrowser}
              onClose={() => setShowProductBrowser(false)}
              onAddSelectedProducts={(selectedProductIds) => {
                // Add selected products to cart
                const updatedCart = [...cart];
                selectedProductIds.forEach((productId) => {
                  const product = allProducts.find((p) => p.id === productId);
                  if (product) {
                    const existingItem = updatedCart.find((item) => item.id === product.id);
                    if (existingItem) {
                      existingItem.qty += 1;
                    } else {
                      updatedCart.push({
                        id: product.id,
                        name: product.name,
                        price: product.selling,
                        qty: 1,
                      });
                    }
                  }
                });
                updateSession(updatedCart);
              }}
            />

            <div
              className={`flex-1 overflow-auto min-h-[0px] transition-all duration-300 ${
                showProductBrowser ? "max-h-[0vh]" : "max-h-[70vh]"
              }`}
            >
              <CartTable
                cart={cart}
                setCart={(updater) => {
                  const result =
                    typeof updater === "function" ? updater(cart) : updater;
                  updateSession(result);
                }}
              />
            </div>
          </div>
        </section>

        {/* RIGHT: Summary + Actions */}
        <section className="w-full lg:w-3/5 flex flex-col gap-3 overflow-hidden">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm h-full flex flex-col gap-3 overflow-hidden">
            <div className="flex-1 overflow-auto min-h-[100px]">
              <PaymentSummary
                cart={cart}
                clientName={clientName}
                creditAmount={15000}
                versementAmount={20000}
                discount={Number(discount) || 0}
              />
            </div>
            <ActionButtons
              clientName={clientName}
              setClientName={setClientName}
              onAddClient={handleAddClient}
              onClear={handleClear}
              onFinish={handleFinish}
              setClientId={setClientId}
              discount={discount}
              onDiscountChange={(val) => {
                setDiscounts((prev) => {
                  const updated = [...prev];
                  updated[activeSession] = val;
                  return updated;
                });
              }}
              cartTotal={total}
            />
          </div>
        </section>
      </div>

      {/* === Session Selector === */}
      <div className="h-[40px] gap-3 bg-background flex justify-center items-center px-4">
        {Array.from({ length: MAX_SESSIONS }).map((_, i) => {
          const isActive = activeSession === i;
          const hasItems = sessions[i]?.length > 0;

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
              className={`-mt-6 ${baseClasses} ${
                isActive ? active : hasItems ? green : inactive
              }`}
            >
              {t("cashier.page", { number: i + 1 })}
            </button>
          );
        })}
      </div>

      {/* === Out of Stock Warning Modal === */}
      <OutOfStockWarningModal
        open={showStockWarning}
        items={outOfStockItems}
        allProducts={allProducts}
        onCancel={() => {
          setShowStockWarning(false);
          setOutOfStockItems([]);
        }}
        onProceed={async () => {
          setShowStockWarning(false);
          setOutOfStockItems([]);
          await proceedWithSale();
        }}
      />
    </main>
  );
}
