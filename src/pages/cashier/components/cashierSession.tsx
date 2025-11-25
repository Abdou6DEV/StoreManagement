import { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import type { ProductWithSales, CartItem, CategoryInfo } from "../../../types";
import { useTranslation } from "react-i18next";
import PaymentSummary from "../../../lib/components/paymentSummary";
import ActionButtons from "./actionButtons";
import CategoryInfoModal from "./categoryInfoModal";
import { useToast } from "../../../lib/contexts/toastContext";
// import { useStock } from "../../../lib/contexts/stockContext"; // Removed - was causing performance issues
import { printReceiptDirectly } from "./receiptModal";

interface CashierSessionProps {
  allProducts: ProductWithSales[];
  productRefreshKey: number;
  setProductRefreshKey: (key: number | ((prev: number) => number)) => void;
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  onProductOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  onSaleComplete: (saleId?: string, soldItems?: CartItem[]) => void;
  onSaleCompleted: (saleId?: string, soldItems?: CartItem[]) => void;
  isActive: boolean;
  discount: string;
  setDiscount: (discount: string) => void;
  outOfStockConfirmed: boolean;
  // Session navigation props
  sessions: Array<{ id: number; cart: CartItem[]; discount: string; clientName: string; clientId: string | null; paymentAmount: number; paymentType: "none" | "credit" | "versement"; paymentDate: Date | undefined }>;
  activeSession: number;
  onSessionChange: (sessionIndex: number) => void;
  onUpdateSessionClient: (sessionIndex: number, clientName: string, clientId: string | null) => void;
  onUpdateSessionPayment: (sessionIndex: number, paymentAmount: number, paymentType: "none" | "credit" | "versement", paymentDate: Date | undefined) => void;
}

const CashierSession = memo(function CashierSession({
  allProducts,
  setProductRefreshKey,
  cart,
  setCart,
  onProductOutOfStock,
  onSaleComplete,
  onSaleCompleted,
  isActive,
  discount,
  setDiscount,
  outOfStockConfirmed,
  sessions,
  activeSession,
  onSessionChange,
  onUpdateSessionClient,
  onUpdateSessionPayment,
}: CashierSessionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  // const { refetchProducts } = useStock(); // Removed - was causing performance issues

  // Get current session data
  const currentSession = sessions[activeSession] || sessions[0];
  
  const clientName = currentSession?.clientName || "";
  const clientId = currentSession?.clientId || null;
  const paymentAmount = currentSession?.paymentAmount || 0;
  const paymentType: "none" | "credit" | "versement" =
    currentSession?.paymentType || "none";
  const paymentDate = currentSession?.paymentDate || undefined;

  // Use refs to track cart and other values so they can be accessed in closures without stale closures
  const cartRef = useRef<CartItem[]>(cart);
  const clientNameRef = useRef<string>(clientName);
  const discountRef = useRef<string>(discount);
  const paymentAmountRef = useRef<number>(paymentAmount);
  const paymentTypeRef = useRef<"none" | "credit" | "versement">(paymentType);
  const paymentDateRef = useRef<Date | undefined>(paymentDate);
  const clientNameDraftRef = useRef<string>(clientName);
  const clientIdDraftRef = useRef<string | null>(clientId);
  const paymentAmountDraftRef = useRef<number>(paymentAmount);
  const paymentTypeDraftRef = useRef<"none" | "credit" | "versement">(paymentType);
  const paymentDateDraftRef = useRef<Date | undefined>(paymentDate);
  
  // Category validation state
  const [categoriesRequiringInfo, setCategoriesRequiringInfo] = useState<string[]>([]);
  const [showCategoryInfoModal, setShowCategoryInfoModal] = useState(false);
  const [pendingSaleAction, setPendingSaleAction] = useState<(() => void) | null>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    clientNameRef.current = clientName;
    clientNameDraftRef.current = clientName;
  }, [clientName]);

  useEffect(() => {
    clientIdDraftRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    discountRef.current = discount;
  }, [discount]);

  useEffect(() => {
    paymentAmountRef.current = paymentAmount;
    paymentAmountDraftRef.current = paymentAmount;
  }, [paymentAmount]);

  useEffect(() => {
    paymentTypeRef.current = paymentType;
    paymentTypeDraftRef.current = paymentType;
  }, [paymentType]);

  useEffect(() => {
    paymentDateRef.current = paymentDate;
    paymentDateDraftRef.current = paymentDate;
  }, [paymentDate]);

  const handleSetClientName = useCallback(
    (name: string) => {
      clientNameDraftRef.current = name;
      onUpdateSessionClient(activeSession, name, clientIdDraftRef.current);
    },
    [activeSession, onUpdateSessionClient],
  );

  const handleSetClientId = useCallback(
    (id: string | null) => {
      clientIdDraftRef.current = id;
      onUpdateSessionClient(activeSession, clientNameDraftRef.current, id);
    },
    [activeSession, onUpdateSessionClient],
  );

  const handleSetPaymentAmount = useCallback(
    (amount: number) => {
      paymentAmountDraftRef.current = amount;
      onUpdateSessionPayment(
        activeSession,
        amount,
        paymentTypeDraftRef.current,
        paymentDateDraftRef.current,
      );
    },
    [activeSession, onUpdateSessionPayment],
  );

  const handleSetPaymentType = useCallback(
    (type: "none" | "credit" | "versement") => {
      paymentTypeDraftRef.current = type;
      onUpdateSessionPayment(
        activeSession,
        paymentAmountDraftRef.current,
        type,
        paymentDateDraftRef.current,
      );
    },
    [activeSession, onUpdateSessionPayment],
  );

  const handleSetPaymentDate = useCallback(
    (date: Date | undefined) => {
      paymentDateDraftRef.current = date;
      onUpdateSessionPayment(
        activeSession,
        paymentAmountDraftRef.current,
        paymentTypeDraftRef.current,
        date,
      );
    },
    [activeSession, onUpdateSessionPayment],
  );

  const resetClientSession = useCallback(() => {
    clientNameDraftRef.current = "";
    clientIdDraftRef.current = null;
    onUpdateSessionClient(activeSession, "", null);
  }, [activeSession, onUpdateSessionClient]);

  const resetPaymentSession = useCallback(() => {
    paymentAmountDraftRef.current = 0;
    paymentTypeDraftRef.current = "none";
    paymentDateDraftRef.current = undefined;
    onUpdateSessionPayment(activeSession, 0, "none", undefined);
  }, [activeSession, onUpdateSessionPayment]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart],
  );

  // Common sale logic that both regular and receipt sales can use
  const proceedWithSale = useCallback(async (showSuccessMessage = true): Promise<{ saleId?: string; soldItems: CartItem[] }> => {
    let saleClientId = clientId;
    // Save cart before clearing it, so we can pass it to callbacks for quantity updates
    const soldItems = [...cart];
    
    try {
      if (clientName.trim() && !clientId) {
        // Search for existing client by name directly (much faster than getAll)
        try {
          const existingClient = await window.api.database.clients.findByName(clientName.trim());
          if (existingClient) {
            saleClientId = existingClient.id;
            onUpdateSessionClient(activeSession, clientName.trim(), existingClient.id);
          } else {
            // Create a new client if not found
            const client = await window.api.database.clients.create({
              name: clientName.trim(),
            });
            saleClientId = client.id;
            onUpdateSessionClient(activeSession, clientName.trim(), client.id);
          }
        } catch (error) {
          // If findByName doesn't exist, create directly (fallback)
          const client = await window.api.database.clients.create({
            name: clientName.trim(),
          });
          saleClientId = client.id;
          onUpdateSessionClient(activeSession, clientName.trim(), client.id);
        }
      }

      let sale = null;
      
      // For CREDIT: Create sale immediately (client takes products)
      // For VERSEMENT: Don't create sale yet (you keep products until fully paid)
      if (paymentType !== "versement") {
        sale = await window.api.database.sales.create({
          clientId: saleClientId || undefined,
          items: cart.map((item) => ({
            productId: item.isManual || item.isService ? undefined : item.id,
            quantity: item.qty,
            price: item.price,
            boughtPrice: item.boughtPrice, // Pass the boughtPrice captured when adding to cart
            manualProductName: item.isManual ? item.name : undefined,
            manualProductType: item.isManual ? item.manualProductType : undefined,
            manualProductCostPrice: item.isManual ? item.manualProductCostPrice : undefined,
            serviceName: item.isService ? item.name : undefined,
            serviceDescription: item.isService ? item.description : undefined,
            serviceCostPrice: item.isService ? item.serviceCostPrice : undefined,
            serviceAppointmentId: item.isService ? item.serviceId : undefined, // Pass the ServiceAppointment ID
          })),
          discount: Number(discount) || 0,
        });
      }

      // Add payment if payment info is present and valid
      if (
        paymentType !== "none" &&
        paymentDate &&
        saleClientId
      ) {
        // Calculate the total amount owed (for credit) or total amount we owe (for versement)
        const totalSaleAmount = total - (Number(discount) || 0);
        const creditAmount = paymentType === "credit" ? totalSaleAmount : paymentAmount;
        
        await window.api.database.payments.create({
          saleId: sale?.id, // Will be null for VERSEMENT until marked as paid
          clientId: saleClientId,
          givenAmount: paymentAmount, // What the client paid
          creditAmount: creditAmount, // Total amount owed (for credit) or amount we owe (for versement)
          dueDate: paymentDate,
          paidDate: undefined, // Do not set paidDate for either credit or versement
          type: paymentType === "credit" ? "CREDIT" : "VERSEMENT",
          pendingSaleItems: paymentType === "versement" ? JSON.stringify(cart.map((item) => {
            console.log("Cart item for versement:", item);
            return {
              productId: item.isManual || item.isService ? undefined : item.id,
              quantity: item.qty,
              price: item.price,
              boughtPrice: item.boughtPrice,
              manualProductName: item.isManual ? item.name : undefined,
              manualProductType: item.isManual ? item.manualProductType : undefined,
              manualProductCostPrice: item.isManual ? item.manualProductCostPrice : undefined,
              serviceName: item.isService ? item.name : undefined,
              serviceDescription: item.isService ? item.description : undefined,
              serviceCostPrice: item.isService ? item.serviceCostPrice : undefined,
              serviceAppointmentId: item.isService ? item.serviceId : undefined,
            };
          })) : undefined,
          discount: paymentType === "versement" ? Number(discount) || 0 : undefined,
        });
      }
      setCart([]);
      setDiscount("");
      resetClientSession();
      resetPaymentSession();
      // Refresh products only when needed (e.g., when product browser opens)
      // This prevents UI pause after every sale
      // setProductRefreshKey((k: number) => k + 1);
      
      if (showSuccessMessage) {
        if (paymentType === "credit") {
          showToast(
            t("cashier.creditAdded", "Credit recorded successfully"),
            "success",
          );
        } else if (paymentType === "versement") {
          showToast(
            t("cashier.versementAdded", "Versement recorded successfully"),
            "success",
          );
        } else if (sale) {
          showToast(
            t("cashier.saleRecorded", "Sale recorded successfully"),
            "success",
          );
        }
      }
      
      return { saleId: sale?.id, soldItems };
    } catch (err) {
      showToast(t("cashier.saleError", "Failed to record sale"), "error");
      return { soldItems };
    }
  }, [
    cart,
    clientName,
    clientId,
    discount,
    paymentAmount,
    paymentType,
    paymentDate,
    total,
    setCart,
    setDiscount,
    resetClientSession,
    resetPaymentSession,
    showToast,
    t,
    activeSession,
    onUpdateSessionClient,
  ]);

  // Clear the cart and reset session state
  const handleClear = () => {
    setCart([]);
    setDiscount("");
    resetClientSession();
    resetPaymentSession();
  };

  // Check if any products in cart require additional information
  const checkCategoryInfoRequired = useCallback(() => {
    if (categoriesRequiringInfo.length === 0) return false;
    
    return cart.some((item) => {
      if (item.isManual || item.isService) return false;
      const product = allProducts.find((p) => p.id === item.id);
      return product && categoriesRequiringInfo.includes(product.categoryName || "");
    });
  }, [cart, allProducts, categoriesRequiringInfo]);

  // Handle category info modal actions
  const handleCategoryInfoSubmit = useCallback((infoMap: Record<string, CategoryInfo[]>) => {
    // Close modal first to prevent re-renders
    setShowCategoryInfoModal(false);
    
    // Attach categoryInfo to cart items
    setCart((prevCart) => {
      return prevCart.map((item) => {
        const categoryInfo = infoMap[item.id];
        if (categoryInfo && categoryInfo.length > 0) {
          return { ...item, categoryInfo };
        }
        return item;
      });
    });
    
    // Execute the pending sale action after state update completes
    // Use requestAnimationFrame to ensure React has finished updating state
    const action = pendingSaleAction;
    setPendingSaleAction(null);
    
    if (action) {
      requestAnimationFrame(() => {
        // Use setTimeout to ensure cart state update is complete
        setTimeout(() => {
          action();
        }, 0);
      });
    }
  }, [pendingSaleAction, setCart]);

  const handleCategoryInfoSkip = useCallback(() => {
    setShowCategoryInfoModal(false);
    setPendingSaleAction(null);
    // Execute the pending sale action
    if (pendingSaleAction) {
      pendingSaleAction();
    }
  }, [pendingSaleAction]);

  const handleCategoryInfoCancel = useCallback(() => {
    setShowCategoryInfoModal(false);
    setPendingSaleAction(null);
  }, []);

  const handleFinish = useCallback(async () => {
    if (cart.length === 0) return;
    const cartTotal = cart.reduce(
      (sum, item) => sum + item.qty * item.price,
      0,
    );
    if (Number(discount) > cartTotal) {
      return;
    }

    // Out-of-stock check is now handled when adding products to cart
    // No need to check here as products are validated before being added

    const result = await proceedWithSale(true);
    if (result.saleId) {
      onSaleCompleted(result.saleId, result.soldItems);
    }
    resetPaymentSession();
  }, [cart, discount, proceedWithSale, onSaleCompleted, resetPaymentSession]);

  const handleFinishWithReceipt = useCallback(async () => {
    if (cart.length === 0) {
      return;
    }

    const cartTotal = cart.reduce(
      (sum, item) => sum + item.qty * item.price,
      0,
    );
    if (Number(discount) > cartTotal) {
      return;
    }

    // Check if category information is required
    if (checkCategoryInfoRequired()) {
      setPendingSaleAction(() => async () => {
        // Proceed with sale and get the sale ID (will use current cart from state via proceedWithSale)
        const result = await proceedWithSale(false);
        
        // Print receipt directly without showing modal - use refs to get latest values
        // For versements, saleId will be undefined, but we still want to print
        if (result.saleId || paymentTypeRef.current === "versement" || paymentTypeRef.current === "credit") {
          const receiptDueDate =
            paymentTypeRef.current === "versement" || paymentTypeRef.current === "credit"
              ? paymentDateRef.current
              : undefined;
          await printReceiptDirectly(
            [...cartRef.current],
            clientNameRef.current,
            Number(discountRef.current) || 0,
            paymentAmountRef.current,
            paymentTypeRef.current,
            paymentDateRef.current,
            result.saleId,
            showToast,
            receiptDueDate
          );
          
          // Show specific success message for receipt sales based on payment type
          if (paymentTypeRef.current === "credit") {
            showToast(
              t("cashier.creditAdded", "Credit recorded successfully"),
              "success",
            );
          } else if (paymentTypeRef.current === "versement") {
            showToast(
              t("cashier.versementAdded", "Versement recorded successfully"),
              "success",
            );
          } else {
            showToast(
              t("cashier.saleWithReceiptSuccess", "Sale completed and receipt printed successfully!"),
              "success",
            );
          }
          
          if (result.saleId) {
            onSaleComplete(result.saleId, result.soldItems);
          }
        }
        
        resetPaymentSession();
      });
      setShowCategoryInfoModal(true);
      return;
    }

    // Out-of-stock check is now handled when adding products to cart
    // No need to check here as products are validated before being added

    // Proceed with sale and get the sale ID
    const result = await proceedWithSale(false);
    
    // Print receipt directly without showing modal
    // For versements, saleId will be undefined, but we still want to print
    if (result.saleId || paymentType === "versement" || paymentType === "credit") {
      const receiptDueDate =
        paymentType === "versement" || paymentType === "credit" ? paymentDate : undefined;
      await printReceiptDirectly(
        [...cart],
        clientName,
        Number(discount) || 0,
        paymentAmount,
        paymentType,
        paymentDate,
        result.saleId,
        showToast,
        receiptDueDate
      );
      
      // Show specific success message for receipt sales based on payment type
      if (paymentType === "credit") {
        showToast(
          t("cashier.creditAdded", "Credit recorded successfully"),
          "success",
        );
      } else if (paymentType === "versement") {
        showToast(
          t("cashier.versementAdded", "Versement recorded successfully"),
          "success",
        );
      } else {
        showToast(
          t("cashier.saleWithReceiptSuccess", "Sale completed and receipt printed successfully!"),
          "success",
        );
      }
      
      if (result.saleId) {
        onSaleComplete(result.saleId, result.soldItems);
      }
    }
    
    resetPaymentSession();
  }, [cart, discount, proceedWithSale, clientName, paymentAmount, paymentType, paymentDate, showToast, t, onSaleComplete, checkCategoryInfoRequired, resetPaymentSession]);

  // Listen for global ENTER key to finish sale
  useEffect(() => {
    const handleGlobalFinish = () => {
      if (cart.length > 0) {
        handleFinish();
      }
    };
    
    const handleGlobalFinishWithReceipt = () => {
      if (cart.length > 0) {
        handleFinishWithReceipt();
      }
    };
    
    // Use capture phase for faster event handling
    window.addEventListener('cashier-finish-sale', handleGlobalFinish, { capture: true });
    window.addEventListener('cashier-finish-with-receipt', handleGlobalFinishWithReceipt, { capture: true });
    
    return () => {
      window.removeEventListener('cashier-finish-sale', handleGlobalFinish, { capture: true });
      window.removeEventListener('cashier-finish-with-receipt', handleGlobalFinishWithReceipt, { capture: true });
    };
  }, [cart.length, handleFinish, handleFinishWithReceipt]);

  // Load categories requiring additional information
  useEffect(() => {
    const loadCategoriesRequiringInfo = async () => {
      try {
        const categoriesData = await window.api.database.options.get("categoriesRequiringInfo");
        if (categoriesData) {
          setCategoriesRequiringInfo(JSON.parse(categoriesData));
        }
      } catch (error) {
        console.error("Failed to load categories requiring info:", error);
      }
    };
    
    loadCategoriesRequiringInfo();
  }, []);

  // Listen for arrow keys to navigate between sessions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys when this session is active
      if (!isActive) return;
      
      // Only handle left and right arrow keys for session navigation
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      
      // Don't handle if user is typing in an input field (except when search is empty)
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        const input = event.target as HTMLInputElement;
        // Allow navigation if the search input is empty
        if (input.value.trim() !== '') {
          return;
        }
      }
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevSession = activeSession - 1;
        if (prevSession >= 0) {
          onSessionChange(prevSession);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextSession = activeSession + 1;
        if (nextSession < sessions.length) {
          onSessionChange(nextSession);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, activeSession, sessions.length, onSessionChange]);


  // Out-of-stock handling is now done at product addition time
  // No need for this useEffect anymore

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-2 overflow-hidden ${isActive ? "flex-1 h-full" : "hidden"}`}
    >
      {/* Payment Summary + Action Buttons */}
      <section className="flex-1 flex flex-col gap-2 overflow-hidden">
        {/* Payment Summary (Cart + Summary) */}
        <div className="flex-1 bg-card shadow-sm rounded-xl overflow-hidden">
          <PaymentSummary
            cart={cart}
            clientName={clientName}
            paymentAmount={paymentAmount}
            discount={Number(discount) || 0}
            paymentType={paymentType}
            className="h-full"
            interactive={true}
            allowDiscountEdit={false}
            setCart={setCart}
            allProducts={allProducts}
            onOutOfStock={onProductOutOfStock}
            outOfStockConfirmed={outOfStockConfirmed}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 bg-card border border-border rounded-xl p-3 shadow-sm">
          <ActionButtons
            clientName={clientName}
            setClientName={handleSetClientName}
            onClear={handleClear}
            onFinish={handleFinish}
            onConfirmWithReceipt={handleFinishWithReceipt}
            setClientId={handleSetClientId}
            discount={discount}
            onDiscountChange={setDiscount}
            cartTotal={total}
            cart={cart}
            paymentAmount={paymentAmount}
            setPaymentAmount={handleSetPaymentAmount}
            paymentType={paymentType}
            setPaymentType={handleSetPaymentType}
            paymentDate={paymentDate}
            setPaymentDate={handleSetPaymentDate}
          />
        </div>
      </section>
      
      {/* Category Information Modal */}
      <CategoryInfoModal
        open={showCategoryInfoModal}
        onClose={handleCategoryInfoCancel}
        onSkip={handleCategoryInfoSkip}
        onSubmit={handleCategoryInfoSubmit}
        cartItems={cart}
        categoriesRequiringInfo={categoriesRequiringInfo}
        allProducts={allProducts}
      />
    </div>
  );
});

export default CashierSession;
