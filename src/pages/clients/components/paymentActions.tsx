import React from "react";
import { Button } from "../../../lib/components/button";
import { CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentActionsProps {
  paymentId: string;
  isPaid: boolean;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaidConfirm: (paymentId: string) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({
  paymentId,
  isPaid,
  onMarkAsPaid,
  onMarkAsUnpaidConfirm,
}) => {
  const { t } = useTranslation();

  if (!isPaid) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-green-700 border-green-500 hover:bg-green-50 flex items-center gap-1"
        onClick={() => onMarkAsPaid(paymentId)}
      >
        <CheckCircle className="w-4 h-4 text-green-500" />
        {t("clients.markAsPaid", "Mark as Paid")}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-orange-700 border-orange-500 hover:bg-orange-50 flex items-center gap-1"
      onClick={() => onMarkAsUnpaidConfirm(paymentId)}
    >
      <X className="w-4 h-4 text-orange-500" />
      {t("clients.markAsUnpaid", "Mark as Unpaid")}
    </Button>
  );
};

export default PaymentActions;
