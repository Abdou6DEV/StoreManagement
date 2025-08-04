import React, { useEffect, useState } from "react";
import type { Payment } from "@prisma/client";
import { Modal } from "../../../lib/components/Modal";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import {
  Loader2,
  X,
  CreditCard,
  ArrowUpCircle,
  CheckCircle,
  Edit,
  Save,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { ClientSuggestion } from "../../../types";

interface PaymentsModalProps {
  client: ClientSuggestion;
  onClose: () => void;
}

const PaymentsModal: React.FC<PaymentsModalProps> = ({ client, onClose }) => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
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

  const PaymentTable = ({
    payments,
  }: {
    payments: Payment[];
    type: "CREDIT" | "VERSEMENT";
  }) => {
    const isRTL = i18n.language === "ar";

    return (
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
    );
  };

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
      className="max-w-[60vw] max-h-[80vh]"
      showFooter={false}
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
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
            {/* Credits Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold">
                  {t("clients.credits", "Credits")} ({credits.length})
                </h3>
              </div>
              {credits.length > 0 ? (
                <PaymentTable payments={credits} type="CREDIT" />
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
                  {t("clients.versements", "Versements")} ({versements.length})
                </h3>
              </div>
              {versements.length > 0 ? (
                <PaymentTable payments={versements} type="VERSEMENT" />
              ) : (
                <div className="text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  {t("clients.noVersements", "No versements found")}
                </div>
              )}
            </div>
          </>
        )}
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
