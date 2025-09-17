import React, { useState, useEffect } from "react";
import { Button } from "../../../lib/components/button";
import { Edit, Loader2, Trash2, History, CreditCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";
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
import { Tooltip } from "../../../lib/components/tooltip";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import { Badge } from "../../../lib/components/badge";
import BillsHistoryModal from "./billsHistoryModal";

interface BillsTableProps {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
  onViewPayments: () => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
}

const BillsTable: React.FC<BillsTableProps> = ({
  bills,
  onEdit,
  onDelete,
  deleteLoading,
  onViewPayments,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    const value = amount / 100;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} DA`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isDueSoon = (date: Date) => {
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const getTotalPaidAmount = (payments: any[]) => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const loadPaymentHistory = async (billId: string) => {
    try {
      const billWithPayments = await window.api.database.bills.getBillWithPayments(billId);
      setSelectedBill(billWithPayments);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error loading payment history:", error);
    }
  };

  const renderPageNumbers = () => {
    const items = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(5, totalPages);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(1, totalPages - 4);
    }

    if (start > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (end < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    return items;
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoData = bills.length === 0;

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CreditCard className="w-12 h-12 text-purple-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("bills.emptyTitle", "No bills found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "bills.emptyDesc",
            "You have not added any bills yet. Add a bill to get started.",
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-lg border border-muted">
        <table
          className={`min-w-full text-sm ${isRTL ? "text-right" : "text-left"}`}
        >
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.name", "Name")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.type", "Type")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.totalPaidAmount", "Total Paid Amount")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.nextPaymentDate", "Next Payment Date")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bills.map((bill) => (
              <tr
                key={bill.id}
                className="h-[48px] hover:bg-muted/40 transition"
              >
                <td
                  className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}
                >
                  {bill.title}
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  {bill.type}
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(getTotalPaidAmount(bill.payments || []))}
                  </span>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <span>{formatDate(bill.nextBillDate)}</span>
                    {isDueSoon(bill.nextBillDate) && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs hover:bg-orange-100">
                        Due Soon
                      </Badge>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div
                    className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <Tooltip
                      content={t(
                        "bills.viewPaymentsTooltip",
                        "View payments history",
                      )}
                    >
                      <Button
                        onClick={() => loadPaymentHistory(bill.id)}
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
                      >
                        <History className="w-3 h-3" />
                      </Button>
                    </Tooltip>

                    <Tooltip content={t("bills.editTooltip", "Edit bill")}>
                      <Button
                        onClick={() => onEdit(bill)}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </Tooltip>

                    <Tooltip
                      content={t("bills.deleteTooltip", "Delete bill")}
                    >
                      <Button
                        onClick={() => setDeleteConfirmId(bill.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                        disabled={deleteLoading === bill.id}
                      >
                        {deleteLoading === bill.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("pagination.itemsPerPage", "Items per page")}:
            </span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {isFirstPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationPrevious href="#" />
                  </span>
                ) : (
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>

              {renderPageNumbers()}

              <PaginationItem>
                {isLastPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationNext href="#" />
                  </span>
                ) : (
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <BillsHistoryModal
        bill={selectedBill}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Bill"
        message="Are you sure you want to delete this bill? This action cannot be undone."
        onConfirm={() => {
          if (deleteConfirmId) {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        variant="danger"
      />
    </>
  );
};

export default BillsTable;