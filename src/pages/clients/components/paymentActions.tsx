import React from "react";
import { Button } from "../../../lib/components/button";
import { CheckCircle, X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../lib/components/tooltip";

interface PaymentActionsProps {
  paymentId: string;
  saleId?: string | null;
  isPaid: boolean;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaidConfirm: (paymentId: string) => void;
  onViewSaleDetails?: (saleId: string) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({
  paymentId,
  saleId,
  isPaid,
  onMarkAsPaid,
  onMarkAsUnpaidConfirm,
  onViewSaleDetails,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {/* View Sale Details Button - only show if saleId exists and is not null/undefined */}
      {saleId && saleId !== "null" && saleId !== "undefined" && onViewSaleDetails && (
        <Tooltip
          content={t(
            "clients.viewSaleDetailsTooltip",
            "View sale details for this payment",
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 border-blue-500 hover:bg-blue-50 flex items-center gap-1"
            onClick={() => onViewSaleDetails(saleId)}
          >
            <Eye className="w-4 h-4 text-blue-500" />
            {t("clients.viewSaleDetails", "View Sale")}
          </Button>
        </Tooltip>
      )}

      {/* Mark as Paid/Unpaid Button */}
      {!isPaid ? (
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
      ) : (
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
      )}
    </div>
  );
};

export default PaymentActions;
