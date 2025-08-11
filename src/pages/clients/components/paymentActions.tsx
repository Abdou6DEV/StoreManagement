import React from "react";
import { Button } from "../../../lib/components/button";
import { CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../lib/components/tooltip";

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
      <Tooltip
        content={t(
          "clients.markAsPaidTooltip",
          "Mark this payment as completed",
        )}
      >
        <Button
          size="sm"
          variant="outline"
          className="text-green-700 border-green-500 hover:bg-green-50 flex items-center gap-1"
          onClick={() => onMarkAsPaid(paymentId)}
        >
          <CheckCircle className="w-4 h-4 text-green-500" />
          {t("clients.markAsPaid", "Mark as Paid")}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={t(
        "clients.markAsUnpaidTooltip",
        "Revert this payment to unpaid status",
      )}
    >
      <Button
        size="sm"
        variant="outline"
        className="text-orange-700 border-orange-500 hover:bg-orange-50 flex items-center gap-1"
        onClick={() => onMarkAsUnpaidConfirm(paymentId)}
      >
        <X className="w-4 h-4 text-orange-500" />
        {t("clients.markAsUnpaid", "Mark as Unpaid")}
      </Button>
    </Tooltip>
  );
};

export default PaymentActions;
