import { useState, useMemo } from "react";
import type { ProductWithSales } from "../../../types";
import type { CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import PaymentSummary from "../../../lib/components/paymentSummary";
import ActionButtons from "./actionButtons";
import { useToast } from "../../../lib/contexts/toastContext";

interface CashierSessionProps {
  allProducts: ProductWithSales[];
  productRefreshKey: number;
  setProductRefreshKey: (key: number | ((prev: number) => number)) => void;
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  onOutOfStock: (items: CartItem[]) => void;
  onReceiptData: (data: {
    cart: CartItem[];
    clientName: string;
    discount: number;
    paymentAmount: number;
    paymentType: "none" | "credit" | "versement";
    paymentDate?: Date;
  }) => void;
  onSaleComplete: (saleId?: string) => void;
  onSaleCompleted: (saleId?: string) => void;
  onShowProductBrowser: () => void;
  onShowManualProductModal: () => void;
  isActive: boolean;
  discount: string;
  setDiscount: (discount: string) => void;
}

export default function CashierSession({
  allProducts,
  productRefreshKey,
  setProductRefreshKey,
  cart,
  setCart,
  onOutOfStock,
  onReceiptData,
  onSaleComplete,
  onSaleCompleted,
  onShowProductBrowser,
  onShowManualProductModal,
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

  const handleFinish = async () => {
    if (cart.length === 0) return;
    const cartTotal = cart.reduce(
      (sum, item) => sum + item.qty * item.price,
      0,
    );
    if (Number(discount) > cartTotal) {
      return;
    }

    // Check for out-of-stock items
    const outOfStock = cart.filter((item) => {
      const product = allProducts.find((p) => p.id === item.id);
      return product && item.qty > product.quantity;
    });

    if (outOfStock.length > 0) {
      onOutOfStock(outOfStock);
      return;
    }

    const saleId = await proceedWithSale();
    if (saleId) {
      onSaleCompleted(saleId);
    }
    setPaymentAmount(0);
    setPaymentType("none");
    setPaymentDate(undefined);
  };

  const handleFinishWithReceipt = async () => {
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

    // Check for out-of-stock items
    const outOfStock = cart.filter((item) => {
      const product = allProducts.find((p) => p.id === item.id);
      return product && item.qty > product.quantity;
    });

    if (outOfStock.length > 0) {
      onOutOfStock(outOfStock);
      return;
    }

    // Store receipt data before clearing cart
    onReceiptData({
      cart: [...cart],
      clientName,
      discount: Number(discount) || 0,
      paymentAmount,
      paymentType,
      paymentDate,
    });

    // Proceed with sale and get the sale ID
    const saleId = await proceedWithSaleWithReceipt();
    if (saleId) {
      onSaleComplete(saleId);
    }
    setPaymentAmount(0);
    setPaymentType("none");
    setPaymentDate(undefined);
  };

  // Extracted sale logic for reuse
  const proceedWithSale = async () => {
    let saleClientId = clientId;
    try {
      if (clientName.trim() && !clientId) {
        // First try to find an existing client with this name
        const allClients = await window.api.database.clients.getAll();
        const existingClient = allClients.find(
          (c) => c.name === clientName.trim(),
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
          productId: item.id,
          quantity: item.qty,
          price: item.price,
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
      showToast(
        t("cashier.saleRecorded", "Sale recorded successfully"),
        "success",
      );
      return sale.id;
    } catch (err) {
      showToast(t("cashier.saleError", "Failed to record sale"), "error");
      return undefined;
    }
  };

  // Sale logic that returns the sale ID for receipt
  const proceedWithSaleWithReceipt = async (): Promise<string | undefined> => {
    let saleClientId = clientId;
    try {
      if (clientName.trim() && !clientId) {
        // First try to find an existing client with this name
        const allClients = await window.api.database.clients.getAll();
        const existingClient = allClients.find(
          (c) => c.name === clientName.trim(),
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
          productId: item.id,
          quantity: item.qty,
          price: item.price,
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
      showToast(
        t("cashier.saleRecorded", "Sale recorded successfully"),
        "success",
      );
      return sale.id;
    } catch (err) {
      showToast(t("cashier.saleError", "Failed to record sale"), "error");
      return undefined;
    }
  };

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
