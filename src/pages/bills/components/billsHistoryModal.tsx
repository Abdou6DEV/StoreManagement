import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock, 
  Tag, 
  ChevronDown,
  History
} from "lucide-react";
import { Modal } from "../../../lib/components/modal";
import { Badge } from "../../../lib/components/badge";

interface Bill {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  amount: number;
  nextBillDate: Date;
  duration: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  payments?: {
    id: string;
    amount: number;
    paidDate: Date;
    notes?: string | null;
  }[];
}

interface BillsHistoryModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

const durationConfig: Record<string, { label: string; color: string }> = {
  NO_NEXT: { label: "No next bill", color: "bg-gray-100 text-gray-800" },
  "1_MONTH": { label: "1 month", color: "bg-blue-100 text-blue-800" },
  "2_MONTHS": { label: "2 months", color: "bg-green-100 text-green-800" },
  "3_MONTHS": { label: "3 months", color: "bg-yellow-100 text-yellow-800" },
  "4_MONTHS": { label: "4 months", color: "bg-orange-100 text-orange-800" },
  "5_MONTHS": { label: "5 months", color: "bg-red-100 text-red-800" },
  "6_MONTHS": { label: "6 months", color: "bg-purple-100 text-purple-800" },
  "7_MONTHS": { label: "7 months", color: "bg-pink-100 text-pink-800" },
  "8_MONTHS": { label: "8 months", color: "bg-indigo-100 text-indigo-800" },
  "9_MONTHS": { label: "9 months", color: "bg-cyan-100 text-cyan-800" },
  "10_MONTHS": { label: "10 months", color: "bg-teal-100 text-teal-800" },
  "11_MONTHS": { label: "11 months", color: "bg-lime-100 text-lime-800" },
  ANNUALLY: { label: "Annually", color: "bg-emerald-100 text-emerald-800" },
};

export default function BillsHistoryModal({ bill, isOpen, onClose }: BillsHistoryModalProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [paymentLimit, setPaymentLimit] = useState(5);

  if (!bill) return null;

  const formatCurrency = (amount: number) => {
    const value = amount / 100;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} DA`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const durationConfigItem = durationConfig[bill.duration] || { 
    label: bill.duration, 
    color: "bg-gray-100 text-gray-800" 
  };

  const totalPaid = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const averagePayment = bill.payments && bill.payments.length > 0 
    ? totalPaid / bill.payments.length 
    : 0;

  return (
    <Modal
      open={isOpen}
      onOpenChange={onClose}
      title={t("bills.paymentHistory", "Payment History")}
      subtitle={bill.title}
      icon={<History className="w-5 h-5 text-purple-600" />}
      showCloseButton={false}
      size="lg"
      className="min-w-[70%] max-h-[70vh] overflow-y-auto"
      showFooter={false}
    >
      <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
        {/* Bill Details Grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.billType", "Bill Type")}
            </label>
            <p className="text-foreground font-medium">
              {bill.type}
            </p>
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.currentAmount", "Current Amount")}
            </label>
            <p className="text-foreground font-medium text-green-600">
              {formatCurrency(bill.amount)}
            </p>
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.nextDueDate", "Next Due Date")}
            </label>
            <p className="text-foreground">
              {formatDate(bill.nextBillDate)}
            </p>
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.duration", "Duration")}
            </label>
            <Badge className={`text-xs ${durationConfigItem.color}`}>
              {durationConfigItem.label}
            </Badge>
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.totalPayments", "Total Payments")}
            </label>
            <p className="text-foreground font-medium text-blue-600">
              {bill.payments?.length || 0}
            </p>
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <label className="text-sm font-medium text-muted-foreground">
              {t("bills.totalPaid", "Total Paid")}
            </label>
            <p className="text-foreground font-medium text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>

        {/* Payment Analysis */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3
            className={`text-lg font-semibold mb-3 ${isRTL ? "text-right" : "text-left"}`}
          >
            {t("bills.paymentAnalysis", "Payment Analysis")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("bills.averagePayment", "Average Payment")}
              </label>
              <p className="text-foreground font-semibold text-green-600">
                {formatCurrency(averagePayment)}
              </p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("bills.lastPayment", "Last Payment")}
              </label>
              <p className="text-foreground font-semibold text-blue-600">
                {bill.payments && bill.payments.length > 0 
                  ? formatCurrency(bill.payments[0].amount)
                  : t("bills.noPayments", "No payments")
                }
              </p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("bills.paymentFrequency", "Payment Frequency")}
              </label>
              <p className="text-foreground font-semibold text-purple-600">
                {durationConfigItem.label}
              </p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("bills.billStatus", "Bill Status")}
              </label>
              <p className="text-foreground font-semibold text-orange-600">
                {bill.payments && bill.payments.length > 0 
                  ? t("bills.active", "Active")
                  : t("bills.pending", "Pending")
                }
              </p>
            </div>
          </div>
        </div>

        {/* Description and Notes */}
        {(bill.description || bill.notes) && (
          <div>
            <h3
              className={`text-lg font-semibold mb-3 ${isRTL ? "text-right" : "text-left"}`}
            >
              {t("bills.additionalInfo", "Additional Information")}
            </h3>
            <div className="space-y-3">
              {bill.description && (
                <div className={isRTL ? "text-right" : "text-left"}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("bills.description", "Description")}:
                  </label>
                  <p className="text-foreground mt-1">
                    {bill.description}
                  </p>
                </div>
              )}
              {bill.notes && (
                <div className={isRTL ? "text-right" : "text-left"}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("bills.notes", "Notes")}:
                  </label>
                  <p className="text-foreground mt-1">
                    {bill.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Calendar className="w-5 h-5" />
              {t("bills.paymentHistory", "Payment History")}
            </h3>
            {bill.payments && bill.payments.length > 0 && (
              <div
                className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <span>
                  {t("bills.totalPayments", "Total Payments")}: {bill.payments.length}
                </span>
                <span>
                  {t("bills.totalPaid", "Total Paid")}: {formatCurrency(totalPaid)}
                </span>
                <span>
                  {t("bills.averagePayment", "Average")}: {formatCurrency(averagePayment)}
                </span>
              </div>
            )}
          </div>

          {bill.payments && bill.payments.length > 0 ? (
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th
                        className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                      >
                        {t("bills.paymentNumber", "Payment #")}
                      </th>
                      <th
                        className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                      >
                        {t("bills.date", "Date")}
                      </th>
                      <th
                        className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                      >
                        {t("bills.amount", "Amount")}
                      </th>
                      <th
                        className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                      >
                        {t("bills.notes", "Notes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bill.payments.slice(0, paymentLimit).map((payment, index) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-muted/40 transition"
                      >
                        <td
                          className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                        >
                          #{bill.payments!.length - index}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {formatDateTime(payment.paidDate)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium text-green-600 ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {formatCurrency(payment.amount)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {payment.notes || t("bills.noNotes", "No notes")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div
              className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
            >
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">
                {t("bills.noPaymentsYet", "No payments yet")}
              </p>
              <p className="text-sm opacity-70">
                {t("bills.paymentRecordsWillAppear", "Payment records will appear here when payments are made")}
              </p>
            </div>
          )}

          {/* Show More Button for Payments */}
          {bill.payments && bill.payments.length > 5 && (
            <div className="flex justify-center mt-4">
              {paymentLimit < bill.payments.length ? (
                <button
                  onClick={() =>
                    setPaymentLimit((prev) =>
                      Math.min(prev + 5, bill.payments?.length || 0)
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  {t("bills.showMore", "Show More")} (
                  {Math.min(5, bill.payments.length - paymentLimit)}{" "}
                  {t("bills.more", "more")})
                </button>
              ) : (
                <button
                  onClick={() => setPaymentLimit(5)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("bills.showLess", "Show Less")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
