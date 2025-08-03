import React, { useEffect, useState } from "react";
import { Button } from "../../../lib/components/button";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import {
  Loader2,
  CreditCard,
  ArrowUpCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import type { PaymentWithClient } from "../../../types";
import PaymentFilters from "./paymentFilters";
import PaymentTable from "./paymentTable";
import { isOverdue, isDueSoon, getFilteredPayments } from "../utils/paymentUtils";

interface AllPaymentsViewProps {
  onBack: () => void;
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
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "CREDIT" | "VERSEMENT">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<
    "all" | "overdue" | "dueSoon" | "paid"
  >("all");
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

  const filteredCredits = getFilteredPayments(credits, search, statusFilter, typeFilter, dateFilter);
  const filteredVersements = getFilteredPayments(versements, search, statusFilter, typeFilter, dateFilter);



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
      <PaymentFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

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
              <PaymentTable
                payments={filteredCredits}
                type="CREDIT"
                editingPayment={editingPayment}
                editAmount={editAmount}
                setEditingPayment={setEditingPayment}
                setEditAmount={setEditAmount}
                handleUpdateAmount={handleUpdateAmount}
                onMarkAsPaid={handleMarkAsPaid}
                onMarkAsUnpaidConfirm={handleMarkAsUnpaidConfirm}
                isOverdue={isOverdue}
                isDueSoon={isDueSoon}
              />
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
                {t("clients.versements", "Versements")} (
                {filteredVersements.length})
              </h3>
            </div>
            {filteredVersements.length > 0 ? (
              <PaymentTable
                payments={filteredVersements}
                type="VERSEMENT"
                editingPayment={editingPayment}
                editAmount={editAmount}
                setEditingPayment={setEditingPayment}
                setEditAmount={setEditAmount}
                handleUpdateAmount={handleUpdateAmount}
                onMarkAsPaid={handleMarkAsPaid}
                onMarkAsUnpaidConfirm={handleMarkAsUnpaidConfirm}
                isOverdue={isOverdue}
                isDueSoon={isDueSoon}
              />
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
