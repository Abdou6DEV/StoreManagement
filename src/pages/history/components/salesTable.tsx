import React, { useState } from "react";
import { Button } from "../../../lib/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  User,
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type SaleWithDetails = Awaited<
  ReturnType<typeof window.api.database.sales.getAll>
>[0];

interface SalesTableProps {
  sales: SaleWithDetails[];
}

const SalesTable: React.FC<SalesTableProps> = ({ sales }) => {
  const { t } = useTranslation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (saleId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  const getPaymentStatusColor = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
    } else if (sale.remainingAmount <= 0) {
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30";
    } else if (sale.totalPaid > 0) {
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30";
    } else {
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
    }
  };

  const getPaymentStatusText = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return t("history.paidCash", "Paid (Cash)");
    } else if (sale.remainingAmount <= 0) {
      return t("history.paid", "Paid");
    } else if (sale.totalPaid > 0) {
      return t("history.partial", "Partial");
    } else {
      return t("history.pending", "Pending");
    }
  };

  const getPaymentStatusIcon = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return <DollarSign className="w-4 h-4 text-emerald-500" />;
    } else if (sale.remainingAmount <= 0) {
      return <CheckCircle className="w-4 h-4" />;
    } else if (sale.totalPaid > 0) {
      return <AlertCircle className="w-4 h-4" />;
    } else {
      return <Clock className="w-4 h-4" />;
    }
  };

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Receipt className="w-12 h-12 text-cyan-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("history.emptyTitle", "No sales found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "history.emptyDesc",
            "No sales match your search criteria or there are no sales yet.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-8"></th>
            <th className="px-4 py-3">{t("history.date", "Date")}</th>
            <th className="px-4 py-3">{t("history.client", "Client")}</th>
            <th className="px-4 py-3">{t("history.items", "Items")}</th>
            <th className="px-4 py-3">{t("history.total", "Total")}</th>
            <th className="px-4 py-3">{t("history.payment", "Payment")}</th>
            <th className="px-4 py-3">{t("history.status", "Status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((sale) => (
            <React.Fragment key={sale.id}>
              {/* Compact Row */}
              <tr className="hover:bg-muted/40 transition">
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(sale.id)}
                    className="p-1 h-6 w-6"
                  >
                    {expandedRows.has(sale.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatDate(sale.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {sale.client?.name || t("history.guestClient", "Guest")}
                    </span>
                  </div>
                  {sale.client?.phone && (
                    <div className="text-xs text-muted-foreground">
                      {sale.client.phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{sale.totalItems}</span>
                    <span className="text-muted-foreground">
                      {t("history.itemsCount", "items")}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {formatCurrency(sale.totalWithDiscount)}
                    </div>
                    {sale.discount > 0 && (
                      <div className="text-xs text-muted-foreground line-through">
                        {formatCurrency(sale.totalAmount)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {sale.isPaidInCash ? (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-emerald-600">
                        {t("history.cash", "Cash")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatCurrency(sale.totalPaid)}
                      </span>
                    </div>
                  )}
                  {!sale.isPaidInCash && sale.remainingAmount > 0 && (
                    <div className="text-xs text-red-500">
                      {t("history.remaining", "Remaining")}:{" "}
                      {formatCurrency(sale.remainingAmount)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`${getPaymentStatusColor(sale).split(" ")[0]}`}
                    >
                      {getPaymentStatusIcon(sale)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(sale)}`}
                    >
                      {getPaymentStatusText(sale)}
                    </span>
                  </div>
                </td>
              </tr>

              {/* Expanded Details Row */}
              {expandedRows.has(sale.id) && (
                <tr className="bg-muted/20">
                  <td colSpan={7} className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Sale Items */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          {t("history.saleItems", "Sale Items")}
                        </h4>
                        <div className="bg-card rounded-lg border p-3 space-y-2">
                          {sale.saleItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center"
                            >
                              <div className="flex-1">
                                <div className="font-medium">
                                  {item.product.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.product.categoryName}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {item.quantity} x {formatCurrency(item.price)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  = {formatCurrency(item.quantity * item.price)}
                                </div>
                              </div>
                            </div>
                          ))}
                          {sale.discount > 0 && (
                            <div className="pt-2 border-t border-border">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  {t("history.subtotal", "Subtotal")}:
                                </span>
                                <span>{formatCurrency(sale.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between items-center text-green-600">
                                <span>
                                  {t("history.discount", "Discount")}:
                                </span>
                                <span>-{formatCurrency(sale.discount)}</span>
                              </div>
                              <div className="flex justify-between items-center font-semibold pt-1 border-t border-border">
                                <span>{t("history.total", "Total")}:</span>
                                <span>
                                  {formatCurrency(sale.totalWithDiscount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
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
                                <div className="font-medium">
                                  {sale.client.name}
                                </div>
                                {sale.client.phone && (
                                  <div className="text-sm text-muted-foreground">
                                    {t("history.phone", "Phone")}:{" "}
                                    {sale.client.phone}
                                  </div>
                                )}
                                {sale.client.address && (
                                  <div className="text-sm text-muted-foreground">
                                    {t("history.address", "Address")}:{" "}
                                    {sale.client.address}
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
                              /* Cash Payment Display */
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
                                      {t("history.paymentDate", "Payment Date")}
                                      :
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
                                            {formatCurrency(payment.paidAmount)}
                                          </span>
                                          <span
                                            className={`px-2 py-1 rounded text-xs font-medium ${
                                              payment.paidAt
                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                            }`}
                                          >
                                            {payment.paidAt
                                              ? t("history.paid", "Paid")
                                              : t("history.pending", "Pending")}
                                          </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                              {t("history.paymentType", "Type")}
                                              :
                                            </span>
                                            <span
                                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                                payment.type === "CREDIT"
                                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                              }`}
                                            >
                                              <CreditCard className="w-3 h-3" />
                                              {payment.type === "CREDIT"
                                                ? t("history.credit", "Credit")
                                                : t(
                                                    "history.installment",
                                                    "Installment",
                                                  )}
                                            </span>
                                          </div>
                                          {payment.paidAt ? (
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className="w-4 h-4 text-green-500" />
                                              <span>
                                                {t("history.paidOn", "Paid on")}
                                                : {formatDate(payment.paidAt)}
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
                                <div className="border-t pt-3 mt-3">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {t(
                                          "history.totalPayments",
                                          "Total Payments",
                                        )}
                                        :
                                      </span>
                                      <span className="font-medium">
                                        {sale.payments.length}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        {t("history.paidAmount", "Paid Amount")}
                                        :
                                      </span>
                                      <span className="font-medium text-green-600">
                                        {formatCurrency(sale.totalPaid)}
                                      </span>
                                    </div>
                                    {sale.remainingAmount > 0 && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            {t(
                                              "history.outstanding",
                                              "Outstanding",
                                            )}
                                            :
                                          </span>
                                          <span className="font-medium text-red-600">
                                            {formatCurrency(
                                              sale.remainingAmount,
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            {t("history.progress", "Progress")}:
                                          </span>
                                          <span className="font-medium">
                                            {Math.round(
                                              (sale.totalPaid /
                                                sale.totalWithDiscount) *
                                                100,
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
                                          {t(
                                            "history.paymentProgress",
                                            "Payment Progress",
                                          )}
                                        </span>
                                        <span>
                                          {Math.round(
                                            (sale.totalPaid /
                                              sale.totalWithDiscount) *
                                              100,
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
                              </div>
                            ) : (
                              /* No Payments - This should rarely happen as cash sales are handled above */
                              <div className="text-center py-4">
                                <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <div className="text-muted-foreground text-sm">
                                  {t(
                                    "history.noPayments",
                                    "No payments recorded",
                                  )}
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
                              <span className="font-mono text-xs">
                                {sale.id}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {t("history.totalPaid", "Total Paid")}:
                              </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(sale.totalPaid)}
                              </span>
                            </div>
                            {sale.remainingAmount > 0 && (
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
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesTable;
