import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Calendar,
  User,
  ShoppingBag,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
} from "lucide-react";
import PaymentSummary from "./paymentSummary";
import { useToast } from "../contexts/toastContext";
import type { PaymentWithClient } from "../types";

interface VersementDetailsModalProps {
  payment: PaymentWithClient | null;
  isOpen: boolean;
  onClose: () => void;
}

const VersementDetailsModal: React.FC<VersementDetailsModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Build cart from pending sale items
  useEffect(() => {
    if (!isOpen || !payment) {
      setCart([]);
      return;
    }

    let pendingSaleItems = [];
    try {
      pendingSaleItems = payment.pendingSaleItems 
        ? JSON.parse(payment.pendingSaleItems) 
        : [];
      console.log("Parsed pendingSaleItems:", pendingSaleItems);
    } catch (error) {
      console.error("Error parsing pendingSaleItems:", error);
      setCart([]);
      return;
    }

    if (pendingSaleItems.length === 0) {
      setCart([]);
      return;
    }

    // Build cart with async product name fetching
    const buildCart = async () => {
      setLoading(true);
      try {
        const cartItems = await Promise.all(
          pendingSaleItems.map(async (item: any) => {
            let name = "Unknown Item";
            
            if (item.manualProductName) {
              name = item.manualProductName;
            } else if (item.serviceName) {
              name = item.serviceName;
            } else if (item.productId) {
              // Fetch product name from database
              try {
                console.log("Fetching product with ID:", item.productId);
                const products = await window.api.database.products.getAll();
                const product = products.find((p: any) => p.id === item.productId);
                console.log("Fetched product:", product);
                name = product?.name || `Product #${item.productId.slice(-4)}`;
              } catch (error) {
                console.error("Error fetching product:", error);
                name = `Product #${item.productId.slice(-4)}`;
              }
            }

            return {
              id: item.productId || `manual-${item.id}`,
              name,
              price: item.price,
              qty: item.quantity,
              isManual: !item.productId && !item.serviceAppointmentId,
              isService: !!item.serviceAppointmentId,
              manualProductType: item.manualProductType,
              description: item.serviceDescription,
            };
          })
        );
        setCart(cartItems);
      } catch (error) {
        console.error("Error building cart:", error);
        setCart([]);
      } finally {
        setLoading(false);
      }
    };

    buildCart();
  }, [isOpen, payment?.id]);

  if (!isOpen || !payment) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  // Calculate totals
  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
  const discount = payment.discount || 0;
  const total = subtotal - discount;
  const paidAmount = payment.givenAmount;
  const remainingAmount = total - paidAmount;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border/50 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-purple-500/8 rounded-xl">
              <Receipt className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("clients.versementDetails", "Versement Details")}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("clients.paymentId", "Payment ID")}: {payment.id.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-100px)]">
          {/* Left Panel - Payment Info */}
          <div className="w-1/3 p-4 border-r border-border/30 overflow-y-auto">
            <div className="space-y-4">
              {/* Payment Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("clients.paymentInformation", "Payment Information")}
                </h3>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("clients.date", "Date")}
                    </div>
                    <div className="text-sm font-medium">
                      {formatFullDate(payment.createdAt)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {t("clients.client", "Client")}
                    </div>
                    <div className="text-sm font-medium">
                      {payment.client.name}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("clients.dueDate", "Due Date")}
                    </div>
                    <div className="text-sm font-medium">
                      {payment.dueDate ? formatFullDate(payment.dueDate) : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {t("clients.paymentStatus", "Payment Status")}
                </h3>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("clients.paymentMethod", "Payment Method")}
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3 h-3 text-purple-600" />
                      <span className="text-sm font-medium">
                        {t("clients.versement", "Versement")}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("clients.paidAmount", "Paid Amount")}
                    </div>
                    <div className="text-lg font-bold text-purple-600">
                      {formatCurrency(paidAmount)}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("clients.remainingAmount", "Remaining Amount")}
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {t("clients.itemsSummary", "Items Summary")}
                </h3>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("clients.totalItems", "Total Items")}
                  </div>
                  <div className="text-sm font-medium">
                    {loading ? "..." : cart.reduce((sum: number, item: any) => sum + item.qty, 0)}{" "}
                    {t("clients.items", "items")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Payment Summary */}
          <div className="w-2/3 p-4">
            <div className="h-full flex flex-col">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t("clients.paymentSummary", "Payment Summary")}
              </h3>
              <div className="flex-1 border border-border/30 rounded-lg overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">
                      {t("common.loading", "Loading...")}
                    </div>
                  </div>
                ) : (
                  <PaymentSummary
                    cart={cart}
                    clientName={payment.client.name}
                    paymentAmount={paidAmount}
                    discount={discount}
                    paymentType="versement"
                    interactive={false}
                    allowDiscountEdit={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersementDetailsModal;
