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
import EditBillModal from "./editBillModal";

interface BillsTableProps {
  bills: Bill[];
  loading?: boolean;
  onEdit: (bill: Bill) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
  onViewPayments: () => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  dueFilter?: string;
  dueSoonThresholdDays?: number;
  newlyOverdueBillsIds?: Set<string>;
  newlyDueSoonBillsIds?: Set<string>;
  onMarkOverdueAsSeen?: () => void;
  onMarkDueSoonAsSeen?: () => void;
}

const BillsTable: React.FC<BillsTableProps> = ({
  bills,
  loading = false,
  onEdit,
  onDelete,
  deleteLoading,
  onViewPayments,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  dueFilter = "all",
  dueSoonThresholdDays = 7,
  newlyOverdueBillsIds = new Set(),
  newlyDueSoonBillsIds = new Set(),
  onMarkOverdueAsSeen,
  onMarkDueSoonAsSeen,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    // Bills are stored in centimes, so always divide by 100
    const value = amount / 100;
    const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
    return `${parseFloat(formatted).toLocaleString('fr-FR')} ${t("bills.currency", "DA")}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isDueSoon = (date: Date, duration: string) => {
    // One-time bills (NO_NEXT) should never show as due soon
    if (duration === "NO_NEXT") return false;
    
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= dueSoonThresholdDays && diffDays >= 0;
  };

  const isOverdue = (date: Date, duration: string) => {
    // One-time bills (NO_NEXT) should never show as overdue
    if (duration === "NO_NEXT") return false;
    
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0;
  };

  const getBillStatus = (duration: string) => {
    if (duration === "NO_NEXT") {
      return t("bills.notActive", "Not Active");
    }
    return t("bills.active", "Active");
  };

  const getTotalPaidAmount = (payments: any[]) => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getLastPaymentDate = (payments: any[]) => {
    if (!payments || payments.length === 0) return null;
    // Sort payments by date (most recent first) and get the first one
    const sortedPayments = payments.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
    return sortedPayments[0].paidDate;
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

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingBill(null);
  };

  const handleBillUpdated = () => {
    onEdit(editingBill!); // This will trigger a refresh in the parent component
  };

  // Mark bills as seen when viewing filtered tables
  useEffect(() => {
    if (dueFilter === "overdue" && newlyOverdueBillsIds.size > 0 && onMarkOverdueAsSeen) {
      onMarkOverdueAsSeen();
    } else if (dueFilter === "dueSoon" && newlyDueSoonBillsIds.size > 0 && onMarkDueSoonAsSeen) {
      onMarkDueSoonAsSeen();
    }
  }, [dueFilter, newlyOverdueBillsIds.size, newlyDueSoonBillsIds.size, onMarkOverdueAsSeen, onMarkDueSoonAsSeen]);

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

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 gap-3 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="mb-1 size-12 shrink-0 rounded-full border-[3px] border-purple-600/20 border-t-purple-600 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <h3 className="text-xl font-semibold text-foreground">
          {t("bills.loadingTitle", "Loading bills...")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "bills.loadingDesc",
            "Please wait while your bills are loaded.",
          )}
        </p>
      </div>
    );
  }

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
                {t("bills.status", "Status")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.totalPaidAmount", "Total Paid Amount")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("bills.lastPaymentDate", "Last Payment Date")}
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
            {bills.map((bill) => {
              const isNewlyOverdue = newlyOverdueBillsIds.has(bill.id);
              const isNewlyDueSoon = newlyDueSoonBillsIds.has(bill.id);
              const shouldHighlight = isNewlyOverdue || isNewlyDueSoon;
              
              
              return (
              <tr
                key={bill.id}
                className={`h-[48px] hover:bg-muted/40 transition ${
                  shouldHighlight
                    ? isNewlyOverdue
                      ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                      : "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500"
                    : ""
                }`}
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
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bill.duration === "NO_NEXT" 
                      ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" 
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  }`}>
                    {getBillStatus(bill.duration)}
                  </span>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <span className="text-[0.9375rem] font-medium text-purple-600 dark:text-purple-400">
                    {formatCurrency(getTotalPaidAmount(bill.payments || []))}
                  </span>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  {(() => {
                    const lastPaymentDate = getLastPaymentDate(bill.payments || []);
                    return lastPaymentDate ? (
                      <span className="text-primary">
                        {formatDate(lastPaymentDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        {t("bills.noPaymentsYet", "No payments yet")}
                      </span>
                    );
                  })()}
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  {bill.duration === "NO_NEXT" ? (
                    <span className="text-muted-foreground italic">
                      {t("bills.noNextPayment", "No next payment")}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{formatDate(bill.nextBillDate)}</span>
                      {isOverdue(bill.nextBillDate, bill.duration) ? (
                        <Badge className="bg-red-100 text-red-800 text-xs hover:bg-red-100">
                          {t("bills.overdue", "Overdue")}
                        </Badge>
                      ) : isDueSoon(bill.nextBillDate, bill.duration) && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs hover:bg-orange-100">
                          {t("bills.dueSoon", "Due Soon")}
                        </Badge>
                      )}
                    </div>
                  )}
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
                        onClick={() => handleEditBill(bill)}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {bills.length > 0 && (
        <div className="flex justify-center mt-6">
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

      <EditBillModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        bill={editingBill}
        onBillUpdated={handleBillUpdated}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title={t("bills.deleteBill", "Delete Bill")}
        message={t("bills.deleteBillConfirm", "Are you sure you want to delete this bill? This action cannot be undone.")}
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