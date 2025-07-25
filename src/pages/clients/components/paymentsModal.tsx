import React, { useEffect, useState } from "react";
import type { Payment, Client } from "../../../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../lib/components/ui/dialog";
import { Button } from "../../../lib/components/ui/button";
import {
  Loader2,
  X,
  CreditCard,
  ArrowUpCircle,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentsModalProps {
  client: Client;
  onClose: () => void;
}

const PaymentsModal: React.FC<PaymentsModalProps> = ({ client, onClose }) => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAsPaid = async (saleId: string, clientId: string) => {
    await window.api.database.payments.markAsPaid(saleId, clientId, new Date());
    setLoading(true);
    window.api.database.payments
      .getByClient(client.id)
      .then((data) => setPayments(data as any))
      .catch(() =>
        setError(t("clients.paymentsError", "Failed to fetch payments")),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    window.api.database.payments
      .getByClient(client.id)
      .then((data) => setPayments(data as any))
      .catch(() =>
        setError(t("clients.paymentsError", "Failed to fetch payments")),
      )
      .finally(() => setLoading(false));
  }, [client.id, t]);

  return (
    <Dialog modal open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} style={{ maxWidth: "60vw" }}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>
                {t("clients.paymentsTitle", {
                  name: client.name,
                  defaultValue: "Payments for {{name}}",
                })}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {t(
              "clients.paymentsDesc",
              "View all credits and versements for this client.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="mt-4">
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
            <div className="overflow-auto rounded-lg border border-muted">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      {t("clients.paymentType", "Type")}
                    </th>
                    <th className="px-4 py-3">
                      {t("clients.paymentAmount", "Amount")}
                    </th>
                    <th className="px-4 py-3">
                      {t("clients.paymentDueAt", "Due At")}
                    </th>
                    <th className="px-4 py-3">
                      {t("clients.paymentPaidAt", "Paid At")}
                    </th>
                    <th className="px-4 py-3">
                      {t("clients.paymentCreatedAt", "Created At")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p, i) => (
                    <tr key={i} className="hover:bg-muted/40 transition">
                      <td className="px-4 py-2 font-medium flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-red-500" />
                        {t(
                          `clients.paymentType_${p.type.toLowerCase()}`,
                          p.type,
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.paidAmount.toLocaleString()} DA
                      </td>
                      <td className="px-4 py-2">
                        {p.dueAt ? new Date(p.dueAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {p.paidAt ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />{" "}
                            {new Date(p.paidAt).toLocaleDateString()}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-500 hover:bg-green-50 flex items-center gap-1"
                            onClick={() =>
                              handleMarkAsPaid(p.saleId, p.clientId)
                            }
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {t("clients.markAsPaid", "Mark as Paid")}
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsModal;
