import React, { useEffect, useState } from "react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import {
  Loader2,
  CreditCard,
  ArrowUpCircle,
  CheckCircle,
  Edit,
  Save,
  Clock,
  Filter,
  Calendar,
  User,
  Search,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import type { Payment } from "@prisma/client";

interface AllPaymentsViewProps {
  onBack: () => void;
}

interface PaymentWithClient extends Payment {
  client: {
    id: string;
    name: string;
    phone?: string;
  };
  sale: {
    id: string;
    createdAt: Date;
  };
}

const AllPaymentsView: React.FC<AllPaymentsViewProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "CREDIT" | "VERSEMENT">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "overdue" | "dueSoon" | "paid">("all");
  const [confirmUnpaidDialog, setConfirmUnpaidDialog] = useState<{
    open: boolean;
    paymentId: string | null;
  }>({ open: false, paymentId: null });

  const credits = payments.filter((p) => p.type === "CREDIT");
  const versements = payments.filter((p) => p.type === "VERSEMENT");

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
      const data = await window.api.database.payments.getAllWithClientInfo();
      setPayments(data as PaymentWithClient[]);
    } catch (err) {
      setError(t("clients.paymentsError", "Failed to fetch payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPayments();
  }, []);

  const isOverdue = (dueDate: Date) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).getTime() !== 0;
  };

  const isDueSoon = (dueDate: Date) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const getFilteredPayments = (payments: PaymentWithClient[]) => {
    return payments.filter((payment) => {
      // Search filter
      const matchesSearch = 
        payment.client.name.toLowerCase().includes(search.toLowerCase()) ||
        (payment.client.phone && payment.client.phone.includes(search));

      // Status filter
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "paid" && payment.paidDate) ||
        (statusFilter === "unpaid" && !payment.paidDate);

      // Type filter
      const matchesType = 
        typeFilter === "all" || payment.type === typeFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter === "overdue") {
        matchesDate = isOverdue(payment.dueDate);
      } else if (dateFilter === "dueSoon") {
        matchesDate = isDueSoon(payment.dueDate);
      } else if (dateFilter === "paid") {
        matchesDate = !!payment.paidDate;
      }

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  };

  const filteredCredits = getFilteredPayments(credits);
  const filteredVersements = getFilteredPayments(versements);

  const PaymentTable = ({
    payments,
    type,
  }: {
    payments: PaymentWithClient[];
    type: "CREDIT" | "VERSEMENT";
  }) => (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3">
              {t("clients.clientName", "Client")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentAmount", "Amount")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentDueDate", "Due Date")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentPaidDate", "Paid Date")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentCreatedAt", "Created At")}
            </th>
            <th className="px-4 py-3">{t("clients.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-muted/40 transition">
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{payment.client.name}</div>
                    {payment.client.phone && (
                      <div className="text-xs text-muted-foreground">
                        {payment.client.phone}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2">
                {editingPayment === payment.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
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
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {payment.dueDate
                    ? new Date(payment.dueDate).toLocaleDateString()
                    : "-"}
                  {isOverdue(payment.dueDate) && (
                    <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">
                      {t("clients.overdue", "Overdue")}
                    </span>
                  )}
                  {isDueSoon(payment.dueDate) && !isOverdue(payment.dueDate) && (
                    <span className="text-orange-600 text-xs font-medium bg-orange-100 px-2 py-1 rounded-full">
                      {t("clients.dueSoon", "Due Soon")}
                    </span>
                  )}
                </div>
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
              <td className="px-4 py-2">
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-red-500" />
          <h1 className="text-2xl font-bold">
            {t("clients.allPaymentsTitle", "All Credits & Versements")}
          </h1>
        </div>
        <Button onClick={onBack} variant="outline">
          {t("clients.backToClients", "Back to Clients")}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">{t("clients.filters", "Filters")}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("clients.search", "Search")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("clients.searchPayments", "Search by client name or phone...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("clients.status", "Status")}
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-card"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">{t("clients.allStatus", "All Status")}</option>
              <option value="paid">{t("clients.paid", "Paid")}</option>
              <option value="unpaid">{t("clients.unpaid", "Unpaid")}</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("clients.type", "Type")}
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-card"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">{t("clients.allTypes", "All Types")}</option>
              <option value="CREDIT">{t("clients.credits", "Credits")}</option>
              <option value="VERSEMENT">{t("clients.versements", "Versements")}</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("clients.dateFilter", "Date Filter")}
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-card"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">{t("clients.allDates", "All Dates")}</option>
              <option value="overdue">{t("clients.overdue", "Overdue")}</option>
              <option value="dueSoon">{t("clients.dueSoon", "Due Soon")}</option>
              <option value="paid">{t("clients.paid", "Paid")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" />{" "}
          {t("clients.paymentsLoading", "Loading payments...")}
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : payments.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">
          {t("clients.noPayments", "No payments found.")}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Credits Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">
                {t("clients.credits", "Credits")} ({filteredCredits.length})
              </h3>
            </div>
            {filteredCredits.length > 0 ? (
              <PaymentTable payments={filteredCredits} type="CREDIT" />
            ) : (
              <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                {t("clients.noCredits", "No credits found")}
              </div>
            )}
          </div>

          {/* Versements Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">
                {t("clients.versements", "Versements")} ({filteredVersements.length})
              </h3>
            </div>
            {filteredVersements.length > 0 ? (
              <PaymentTable payments={filteredVersements} type="VERSEMENT" />
            ) : (
              <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                {t("clients.noVersements", "No versements found")}
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default AllPaymentsView; 