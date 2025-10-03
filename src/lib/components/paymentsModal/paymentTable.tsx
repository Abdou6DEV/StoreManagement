import React from "react";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "../button";
import { useTranslation } from "react-i18next";
import type { Payment } from "@prisma/client";
import PaymentActions from "./paymentActions";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../pagination";

interface PaymentTableProps {
  payments: Payment[];
  activeTab: "credits" | "versements";
  editingPayment: string | null;
  editAmount: number;
  currentPage: number;
  totalPages: number;
  onEditStart: (paymentId: string, amount: number) => void;
  onEditCancel: () => void;
  onEditSave: (paymentId: string) => void;
  onEditAmountChange: (amount: number) => void;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaid: (paymentId: string) => void;
  onViewSaleDetails?: (saleId: string) => void;
  onPageChange: (page: number) => void;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  activeTab,
  editingPayment,
  editAmount,
  currentPage,
  totalPages,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditAmountChange,
  onMarkAsPaid,
  onMarkAsUnpaid,
  onViewSaleDetails,
  onPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (payments.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8 border border-dashed rounded-lg">
        {activeTab === "credits"
          ? t("clients.noCredits", "No credits found")
          : t("clients.noVersements", "No versements found")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-lg border border-muted">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("clients.paymentAmount", "Amount")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("clients.paymentDueDate", "Due Date")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("clients.paymentPaidDate", "Paid Date")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("clients.paymentCreatedAt", "Created At")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("clients.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-muted/40 transition">
                <td className="px-4 py-2">
                  <PaymentActions
                    payment={payment}
                    editingPayment={editingPayment}
                    editAmount={editAmount}
                    onEditStart={onEditStart}
                    onEditCancel={onEditCancel}
                    onEditSave={onEditSave}
                    onEditAmountChange={onEditAmountChange}
                    onViewSaleDetails={onViewSaleDetails}
                  />
                </td>
                <td
                  className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {payment.dueDate
                    ? new Date(payment.dueDate).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  {payment.paidDate ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {new Date(payment.paidDate).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-700 font-medium bg-orange-100 px-2 py-1 rounded-full text-xs">
                        {t("clients.pending", "Pending")}
                      </span>
                    </div>
                  )}
                </td>
                <td
                  className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {payment.createdAt
                    ? new Date(payment.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {!payment.paidDate ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-500 hover:bg-green-50 flex items-center gap-1"
                        onClick={() => onMarkAsPaid(payment.id)}
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {t("clients.markAsPaid", "Mark as Paid")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-700 border-orange-500 hover:bg-orange-50 flex items-center gap-1"
                        onClick={() => onMarkAsUnpaid(payment.id)}
                      >
                        <Clock className="w-4 h-4 text-orange-500" />
                        {t("clients.markAsUnpaid", "Mark as Unpaid")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from(
                { length: Math.min(5, totalPages) },
                (_, i) => i + 1,
              ).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PaymentTable;
