import React, { useEffect, useState, useMemo } from "react";
import type { Payment } from "@prisma/client";
import { Modal } from "./Modal";
import { Button } from "./button";
import { Input } from "./input";
import { ConfirmDialog } from "./confirmDialog";
import {
  Loader2,
  X,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  Edit,
  Save,
  Clock,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/toastContext";
import { ClientSuggestion } from "../../types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

interface PaymentsModalProps {
  client: ClientSuggestion;
  onClose: () => void;
}

type TabType = "summary" | "credits" | "versements";

const PaymentsModal: React.FC<PaymentsModalProps> = ({ client, onClose }) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmUnpaidDialog, setConfirmUnpaidDialog] = useState<{
    open: boolean;
    paymentId: string | null;
  }>({ open: false, paymentId: null });

  const itemsPerPage = 5;

  // Filter payments by type and search
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    if (activeTab === "credits") {
      filtered = payments.filter((p) => p.type === "CREDIT");
    } else if (activeTab === "versements") {
      filtered = payments.filter((p) => p.type === "VERSEMENT");
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.givenAmount.toString().includes(searchLower) ||
          (p.dueDate &&
            new Date(p.dueDate)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)) ||
          (p.createdAt &&
            new Date(p.createdAt)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)) ||
          (p.paidDate &&
            new Date(p.paidDate)
              .toLocaleDateString()
              .toLowerCase()
              .includes(searchLower)),
      );
    }

    return filtered;
  }, [payments, activeTab, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredPayments.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const credits = payments.filter((p) => p.type === "CREDIT");
    const versements = payments.filter((p) => p.type === "VERSEMENT");

    const totalCredits = credits.reduce((sum, p) => sum + p.givenAmount, 0);
    const totalVersements = versements.reduce(
      (sum, p) => sum + p.givenAmount,
      0,
    );
    const pendingCredits = credits
      .filter((p) => !p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const pendingVersements = versements
      .filter((p) => !p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const paidCredits = credits
      .filter((p) => p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);
    const paidVersements = versements
      .filter((p) => p.paidDate)
      .reduce((sum, p) => sum + p.givenAmount, 0);

    return {
      totalCredits,
      totalVersements,
      pendingCredits,
      pendingVersements,
      paidCredits,
      paidVersements,
      balance: totalCredits - totalVersements,
      creditsCount: credits.length,
      versementsCount: versements.length,
      pendingCreditsCount: credits.filter((p) => !p.paidDate).length,
      pendingVersementsCount: versements.filter((p) => !p.paidDate).length,
      paidCreditsCount: credits.filter((p) => p.paidDate).length,
      paidVersementsCount: versements.filter((p) => p.paidDate).length,
    };
  }, [payments]);

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await window.api.database.payments.markAsPaid(paymentId, new Date());

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId
            ? { ...payment, paidDate: new Date() }
            : payment,
        ),
      );

      showToast(
        t("clients.paymentMarkedAsPaid", "Payment marked as paid"),
        "success",
      );
    } catch (err) {
      showToast(
        t("clients.paymentMarkError", "Failed to mark payment as paid"),
        "error",
      );
    }
  };

  const handleMarkAsUnpaid = async (paymentId: string) => {
    try {
      await window.api.database.payments.markAsPaid(paymentId, null);

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId ? { ...payment, paidDate: null } : payment,
        ),
      );

      showToast(
        t("clients.paymentMarkedAsUnpaid", "Payment marked as unpaid"),
        "success",
      );
    } catch (err) {
      showToast(
        t("clients.paymentUnmarkError", "Failed to mark payment as unpaid"),
        "error",
      );
    }
  };

  const handleMarkAsUnpaidConfirm = (paymentId: string) => {
    setConfirmUnpaidDialog({ open: true, paymentId });
  };

  const handleConfirmMarkAsUnpaid = async () => {
    if (confirmUnpaidDialog.paymentId) {
      await handleMarkAsUnpaid(confirmUnpaidDialog.paymentId);
      setConfirmUnpaidDialog({ open: false, paymentId: null });
    }
  };

  const handleUpdateAmount = async (paymentId: string) => {
    try {
      await window.api.database.payments.updateAmount(paymentId, editAmount);
      setEditingPayment(null);

      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId
            ? { ...payment, givenAmount: editAmount }
            : payment,
        ),
      );

      showToast(
        t("clients.paymentAmountUpdated", "Payment amount updated"),
        "success",
      );
    } catch (err) {
      showToast(
        t("clients.paymentAmountError", "Failed to update payment amount"),
        "error",
      );
    }
  };

  const refreshPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.payments.getByClient(client.id);
      setPayments(data);
    } catch (err) {
      setError(t("clients.paymentsError", "Failed to fetch payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
  }, [client.id]);

  const PaymentTable = ({ payments }: { payments: Payment[] }) => {
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
                <th
                  className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("clients.paymentAmount", "Amount")}
                </th>
                <th
                  className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("clients.paymentDueDate", "Due Date")}
                </th>
                <th
                  className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("clients.paymentPaidDate", "Paid Date")}
                </th>
                <th
                  className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("clients.paymentCreatedAt", "Created At")}
                </th>
                <th
                  className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("clients.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/40 transition">
                  <td className="px-4 py-2">
                    {editingPayment === payment.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editAmount}
                          onChange={(e) =>
                            setEditAmount(Number(e.target.value))
                          }
                          className="w-20 h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateAmount(payment.id)}
                          className="h-8 px-2"
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingPayment(null)}
                          className="h-8 px-2"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {payment.givenAmount.toLocaleString()}{" "}
                          {t("cashier.currency", "DA")}
                        </span>
                        {!payment.paidDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPayment(payment.id);
                              setEditAmount(payment.givenAmount);
                            }}
                            className="h-6 px-1"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
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
                          onClick={() => handleMarkAsPaid(payment.id)}
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {t("clients.markAsPaid", "Mark as Paid")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-700 border-orange-500 hover:bg-orange-50 flex items-center gap-1"
                          onClick={() => handleMarkAsUnpaidConfirm(payment.id)}
                        >
                          <X className="w-4 h-4 text-orange-500" />
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
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                      onClick={() => setCurrentPage(page)}
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
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
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

  const SummaryTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowUpCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">
                {t("clients.totalCredits", "Total Credits")}
              </p>
              <p className="text-lg font-bold text-red-900">
                {summaryStats.totalCredits.toLocaleString()}{" "}
                {t("cashier.currency", "DA")}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-red-600">
            {summaryStats.creditsCount} {t("clients.payments", "payments")}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">
                {t("clients.totalVersements", "Total Versements")}
              </p>
              <p className="text-lg font-bold text-red-900">
                {Math.abs(summaryStats.totalVersements).toLocaleString()}{" "}
                {t("cashier.currency", "DA")}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-red-600">
            {summaryStats.versementsCount} {t("clients.payments", "payments")}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">
                {t("clients.paidCredits", "Paid Credits")}
              </p>
              <p className="text-lg font-bold text-green-900">
                {summaryStats.paidCredits.toLocaleString()}{" "}
                {t("cashier.currency", "DA")}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600">
            {summaryStats.paidCreditsCount} {t("clients.paid", "paid")}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">
                {t("clients.paidVersements", "Paid Versements")}
              </p>
              <p className="text-lg font-bold text-green-900">
                {summaryStats.paidVersements.toLocaleString()}{" "}
                {t("cashier.currency", "DA")}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600">
            {summaryStats.paidVersementsCount} {t("clients.paid", "paid")}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="font-medium mb-3">
          {t("clients.quickActions", "Quick Actions")}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab("credits")}
            className="flex items-center gap-2 hover:bg-black hover:border-black hover:text-white transition-colors cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {t("clients.viewCredits", "View Credits")} (
            {summaryStats.creditsCount})
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("versements")}
            className="flex items-center gap-2 hover:bg-black hover:border-black hover:text-white transition-colors cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            {t("clients.viewVersements", "View Versements")} (
            {summaryStats.versementsCount})
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t("clients.paymentsTitle", {
        name: client.name,
        defaultValue: "Payments for {{name}}",
      })}
      subtitle={t(
        "clients.paymentsDesc",
        "View and manage all credits and versements for this client.",
      )}
      icon={<CreditCard className="w-5 h-5 text-red-500" />}
      size="full"
      className="max-w-[80vw] max-h-[85vh]"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("summary")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "summary"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {t("clients.summary", "Summary")}
            </button>
            <button
              onClick={() => setActiveTab("credits")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "credits"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {t("clients.credits", "Credits")} ({summaryStats.creditsCount})
            </button>
            <button
              onClick={() => setActiveTab("versements")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "versements"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {t("clients.versements", "Versements")} (
              {summaryStats.versementsCount})
            </button>
          </nav>
        </div>

        {/* Search and Controls */}
        {(activeTab === "credits" || activeTab === "versements") && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by amount, due date, paid date, or created date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" />{" "}
              {t("clients.paymentsLoading", "Loading payments...")}
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : payments.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {t("clients.noPayments", "No payments found for this client.")}
            </div>
          ) : (
            <>
              {activeTab === "summary" && <SummaryTab />}
              {activeTab === "credits" && (
                <PaymentTable payments={currentData} />
              )}
              {activeTab === "versements" && (
                <PaymentTable payments={currentData} />
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmUnpaidDialog.open}
        onOpenChange={(open) =>
          setConfirmUnpaidDialog({ open, paymentId: null })
        }
        title={t("clients.confirmMarkAsUnpaid", "Confirm Mark as Unpaid")}
        message={t(
          "clients.confirmMarkAsUnpaidMessage",
          "Are you sure you want to mark this payment as unpaid? This action cannot be undone.",
        )}
        confirmText={t("clients.markAsUnpaid", "Mark as Unpaid")}
        cancelText={t("clients.cancel", "Cancel")}
        variant="warning"
        onConfirm={handleConfirmMarkAsUnpaid}
      />
    </Modal>
  );
};

export default PaymentsModal;
