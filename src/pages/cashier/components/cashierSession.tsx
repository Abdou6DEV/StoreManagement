import { useState, useMemo, useEffect, useCallback } from "react";
import type { ProductWithSales, CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import PaymentSummary from "../../../lib/components/paymentSummary";
import ActionButtons from "./actionButtons";
import { useToast } from "../../../lib/contexts/toastContext";
import { Client } from "@prisma/client";
import { printReceiptDirectly } from "./receiptModal";

interface CashierSessionProps {
  allProducts: ProductWithSales[];
  productRefreshKey: number;
  setProductRefreshKey: (key: number | ((prev: number) => number)) => void;
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  onOutOfStock: (items: CartItem[]) => void;
  onSaleComplete: (saleId?: string) => void;
  onSaleCompleted: (saleId?: string) => void;
  isActive: boolean;
  discount: string;
  setDiscount: (discount: string) => void;
}

export default function CashierSession({
  allProducts,
  setProductRefreshKey,
  cart,
  setCart,
  onOutOfStock,
  onSaleComplete,
  onSaleCompleted,
  isActive,
  discount,
  setDiscount,
}: CashierSessionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Session-specific state
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<
    "none" | "credit" | "versement"
  >("none");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart],
  );

  // Common sale logic that both regular and receipt sales can use
  const proceedWithSale = useCallback(async (showSuccessMessage = true): Promise<string | undefined> => {
    let saleClientId = clientId;
    try {
      if (clientName.trim() && !clientId) {
        // First try to find an existing client with this name
        const allClients = await window.api.database.clients.getAll();
        const existingClient = allClients.find(
          (c: Client) => c.name === clientName.trim(),
        );

        if (existingClient) {
          saleClientId = existingClient.id;
          setClientId(existingClient.id);
        } else {
          // Only create a new client if one doesn't exist
          const client = await window.api.database.clients.create({
            name: clientName.trim(),
          });
          saleClientId = client.id;
          setClientId(client.id);
        }
      }

      const sale = await window.api.database.sales.create({
        clientId: saleClientId || undefined,
        items: cart.map((item) => ({
          productId: item.isManual || item.isService ? undefined : item.id,
          quantity: item.qty,
          price: item.price,
          manualProductName: item.isManual ? item.name : undefined,
          manualProductType: item.isManual ? item.manualProductType : undefined,
          manualProductCostPrice: item.isManual ? item.manualProductCostPrice : undefined,
          serviceName: item.isService ? item.name : undefined,
          serviceDescription: item.isService ? item.description : undefined,
          serviceCostPrice: item.isService ? item.serviceCostPrice : undefined,
        })),
        discount: Number(discount) || 0,
      });

      // Add payment if payment info is present and valid
      if (
        paymentType !== "none" &&
        paymentAmount > 0 &&
        paymentDate &&
        saleClientId
      ) {
        await window.api.database.payments.create({
          saleId: sale.id,
          clientId: saleClientId,
          givenAmount: paymentAmount,
          dueDate: paymentDate,
          paidDate: undefined, // Do not set paidDate for either credit or versement
          type: paymentType === "credit" ? "CREDIT" : "VERSEMENT",
        });
      }
      setCart([]);
      setClientName("");
      setClientId(null);
      setDiscount("");
      setPaymentAmount(0);
      setPaymentType("none");
      setPaymentDate(undefined);
      setProductRefreshKey((k: number) => k + 1);
      
      if (showSuccessMessage) {
        showToast(
          t("cashier.saleRecorded", "Sale recorded successfully"),
          "success",
        );
      }
      
      return sale.id;
    } catch (err) {
      showToast(t("cashier.saleError", "Failed to record sale"), "error");
      return undefined;
    }
  }, [cart, clientName, clientId, discount, paymentAmount, paymentType, paymentDate, setCart, setClientName, setClientId, setDiscount, setPaymentAmount, setPaymentType, setPaymentDate, setProductRefreshKey, showToast, t]);

  // Clear the cart and reset session state
  const handleClear = () => {
    setCart([]);
    setDiscount("");
    setClientName("");
    setClientId(null);
    setPaymentAmount(0);
    setPaymentType("none");
    setPaymentDate(undefined);
  };

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

    const saleId = await proceedWithSale(false);
    if (saleId) {
      // Show specific success message for regular sales
      showToast(
        t("cashier.saleCompleted", "Sale completed successfully!"),
        "success",
      );
      onSaleCompleted(saleId);
    }
    setPaymentAmount(0);
    setPaymentType("none");
    setPaymentDate(undefined);
  }, [cart, discount, proceedWithSale, showToast, t, onSaleCompleted]);

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

    // Out-of-stock check is now handled when adding products to cart
    // No need to check here as products are validated before being added

    // Proceed with sale and get the sale ID (don't show generic success message)
    const saleId = await proceedWithSale(false);
    
    // Print receipt directly without showing modal
    if (saleId) {
      await printReceiptDirectly(
        [...cart],
        clientName,
        Number(discount) || 0,
        paymentAmount,
        paymentType,
        paymentDate,
        saleId,
        showToast,
        (key: string, fallback?: string) => t(key, fallback)
      );
      
      // Show specific success message for receipt sales
      showToast(
        t("cashier.saleWithReceiptSuccess", "Sale completed and receipt printed successfully!"),
        "success",
      );
      
      onSaleComplete(saleId);
    }
    
    setPaymentAmount(0);
    setPaymentType("none");
    setPaymentDate(undefined);
  }, [cart, discount, proceedWithSale, clientName, paymentAmount, paymentType, paymentDate, showToast, t, onSaleComplete]);

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
          />
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 bg-card border border-border rounded-xl p-3 shadow-sm">
          <ActionButtons
            clientName={clientName}
            setClientName={setClientName}
            onClear={handleClear}
            onFinish={handleFinish}
            onConfirmWithReceipt={handleFinishWithReceipt}
            setClientId={setClientId}
            discount={discount}
            onDiscountChange={setDiscount}
            cartTotal={total}
            cart={cart}
            paymentAmount={paymentAmount}
            setPaymentAmount={setPaymentAmount}
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            paymentDate={paymentDate}
            setPaymentDate={setPaymentDate}
          />
        </div>
      </section>
    </div>
  );
}
