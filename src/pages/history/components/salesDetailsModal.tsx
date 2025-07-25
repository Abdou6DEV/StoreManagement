import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "../../../lib/components/ui/dialog";
import {
  User,
  Package,
  CreditCard,
  Receipt,
  DollarSign,
  CheckCircle,
  Clock,
} from "lucide-react";
import PaymentSummary from "../../../lib/components/paymentSummary";
import { useTranslation } from "react-i18next";

type SaleWithDetails = Awaited<
  ReturnType<typeof window.api.database.sales.getAll>
>[0];

interface SalesDetailsModalProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onClose: () => void;
}

const SalesDetailsModal: React.FC<SalesDetailsModalProps> = ({
  sale,
  open,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (!sale) return null;

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  // Determine if all payments of sale are paid
  const allPaymentsPaid = sale.payments.length > 0 && sale.payments.every((p) => p.paidAt);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="overflow-y-auto"
        style={{ maxWidth: "90vw", width: "90vw" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center text-center w-full">
            <Receipt className="w-6 h-6 text-cyan-500" />
            {t("history.saleDetails", "Sale Details")}
          </DialogTitle>
          <DialogClose asChild>
            <button className="absolute right-4 top-4 text-muted-foreground text-2xl font-bold">
              ×
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Sale Items & Summary */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("history.saleItems", "Sale Items")}
            </h4>
            <PaymentSummary
              cart={sale.saleItems.map((item) => ({
                id: item.product.id,
                name: item.product.name,
                price: item.price,
                qty: item.quantity,
              }))}
              clientName={sale.client?.name}
              discount={sale.discount}
              paymentAmount={sale.totalPaid}
              paymentType={
                sale.isPaidInCash
                  ? "none"
                  : sale.payments.length > 0 &&
                      sale.payments[0].type === "VERSEMENT"
                    ? "versement"
                    : "credit"
              }
            />
          </div>
          {/* Payments & Client Info */}
          <div className="space-y-3">
            {/* Client Details */}
            {sale.client && (
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t("history.clientDetails", "Client Details")}
                </h4>
                <div className="bg-card rounded-lg border p-3 mt-2">
                  <div className="space-y-1">
                    <div className="font-medium">{sale.client.name}</div>
                    {sale.client.phone && (
                      <div className="text-sm text-muted-foreground">
                        {t("history.phone", "Phone")}: {sale.client.phone}
                      </div>
                    )}
                    {sale.client.address && (
                      <div className="text-sm text-muted-foreground">
                        {t("history.address", "Address")}: {sale.client.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Payment Details */}
            <div>
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t("history.paymentDetails", "Payment Details")}
              </h4>
              <div className="bg-card rounded-lg border p-3 mt-2">
                {sale.isPaidInCash ? (
                  <div className="text-center py-6">
                    <div className="flex justify-center mb-4">
                      <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 p-4 rounded-full shadow-lg">
                        <DollarSign className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                      {t("history.paidInCash", "Paid in Cash")}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                      {t(
                        "history.cashPaymentDesc",
                        "This sale was completed with cash payment at the time of purchase",
                      )}
                    </p>
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("history.amountPaid", "Amount Paid")}:
                        </span>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(sale.totalWithDiscount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("history.paymentDate", "Payment Date")}:
                        </span>
                        <span className="text-sm font-semibold">
                          {formatDate(sale.createdAt)}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">
                            {t("history.fullyPaid", "Fully Paid")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : sale.payments.length > 0 ? (
                  <div className="space-y-3">
                    {sale.payments.map((payment, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 bg-muted/30"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">
                                {formatCurrency(sale.remainingAmount)}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${payment.paidAt ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"}`}
                              >
                                {payment.paidAt
                                  ? t("history.paid", "Paid")
                                  : t("history.pending", "Pending")}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {t("history.paymentType", "Type")}:
                                </span>
                                <span
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${payment.type === "CREDIT" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"}`}
                                >
                                  {isRTL ? (
                                    <>
                                      {payment.type === "CREDIT"
                                        ? t("history.credit", "Credit")
                                        : t(
                                            "history.installment",
                                            "Installment",
                                          )}
                                      <CreditCard className="w-3 h-3 ml-1" />
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="w-3 h-3 mr-1" />
                                      {payment.type === "CREDIT"
                                        ? t("history.credit", "Credit")
                                        : t(
                                            "history.installment",
                                            "Installment",
                                          )}
                                    </>
                                  )}
                                </span>
                              </div>
                              {payment.paidAt ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span>
                                    {t("history.paidOn", "Paid on")}:{" "}
                                    {formatDate(payment.paidAt)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-yellow-500" />
                                  <span>
                                    {t("history.dueDate", "Due")}:{" "}
                                    {formatDate(payment.dueAt)}
                                  </span>
                                </div>
                              )}
                              <div className="text-xs opacity-75">
                                {t("history.createdOn", "Created")}:{" "}
                                {formatDate(payment.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Payment Summary */}
                    {!allPaymentsPaid && (
                      <div className="border-t pt-3 mt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {/* Only show Paid Amount if not allPaymentsPaid */}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t("history.paidAmount", "Paid Amount")}:
                            </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(sale.totalPaid)}
                            </span>
                          </div>
                          {/* Only show outstanding and progress if not fully paid */}
                          {sale.remainingAmount > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("history.outstanding", "Outstanding")}:
                                </span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(sale.remainingAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {t("history.progress", "Progress")}:
                                </span>
                                <span className="font-medium">
                                  {Math.round(
                                    (sale.totalPaid / sale.totalWithDiscount) * 100,
                                  )}
                                  %
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Progress Bar */}
                        {sale.remainingAmount > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>
                                {t("history.paymentProgress", "Payment Progress")}
                              </span>
                              <span>
                                {Math.round(
                                  (sale.totalPaid / sale.totalWithDiscount) * 100,
                                )}
                                %
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min((sale.totalPaid / sale.totalWithDiscount) * 100, 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <div className="text-muted-foreground text-sm">
                      {t("history.noPayments", "No payments recorded")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t(
                        "history.noPaymentHistory",
                        "This sale has no payment history yet",
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Sale Summary */}
            <div>
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                {t("history.saleSummary", "Sale Summary")}
              </h4>
              <div className="bg-card rounded-lg border p-3 mt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("history.saleId", "Sale ID")}:
                  </span>
                  <span className="font-mono text-xs">{sale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("history.totalPaid", "Total Paid")}:
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(sale.totalAmount - sale.discount)}
                  </span>
                </div>
                {sale.payments[0]?.paidAt == null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("history.remaining", "Remaining")}:
                    </span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(sale.remainingAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesDetailsModal;
