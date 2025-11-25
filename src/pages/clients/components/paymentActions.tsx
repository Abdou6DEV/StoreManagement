import React from "react";
import { Button } from "../../../lib/components/button";
import { CheckCircle, X, Eye, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "../../../lib/components/tooltip";

interface PaymentActionsProps {
  paymentId: string;
  saleId?: string | null;
  isPaid: boolean;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaidConfirm: (paymentId: string) => void;
  onViewSaleDetails?: (saleId: string) => void;
  onViewVersementDetails?: (paymentId: string) => void;
  isCreditPaymentSale?: boolean; // New prop to indicate if this is a dummy credit payment sale
  hasPendingSaleItems?: boolean; // New prop to indicate if this VERSEMENT has pending sale items
  canCancelVersement?: boolean;
  onCancelVersement?: (paymentId: string) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({
  paymentId,
  saleId,
  isPaid,
  onMarkAsPaid,
  onMarkAsUnpaidConfirm,
  onViewSaleDetails,
  onViewVersementDetails,
  isCreditPaymentSale = false,
  hasPendingSaleItems = false,
  canCancelVersement = false,
  onCancelVersement,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {/* View Sale Details Button - only show if saleId exists and is not a dummy credit payment sale */}
      {saleId && saleId !== "null" && saleId !== "undefined" && onViewSaleDetails && !isCreditPaymentSale && (
        <Tooltip
          content={t(
            "clients.viewSaleDetailsTooltip",
            "View sale details for this payment",
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className="text-blue-700 border-blue-500 hover:bg-blue-50 h-8 w-8 p-0"
            onClick={() => onViewSaleDetails(saleId)}
          >
            <Eye className="w-4 h-4 text-blue-500" />
          </Button>
        </Tooltip>
      )}

      {/* View Versement Details Button - show for VERSEMENT payments with pending sale items */}
      {hasPendingSaleItems && onViewVersementDetails && (
        <Tooltip
          content={t(
            "clients.viewVersementDetailsTooltip",
            "View versement details and products",
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className="text-purple-700 border-purple-500 hover:bg-purple-50 h-8 w-8 p-0"
            onClick={() => onViewVersementDetails(paymentId)}
          >
            <Eye className="w-4 h-4 text-purple-500" />
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
            className="text-green-700 border-green-500 hover:bg-green-50 h-8 w-8 p-0"
            onClick={() => onMarkAsPaid(paymentId)}
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
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
            className="text-orange-700 border-orange-500 hover:bg-orange-50 h-8 w-8 p-0"
            onClick={() => onMarkAsUnpaidConfirm(paymentId)}
          >
            <X className="w-4 h-4 text-orange-500" />
          </Button>
        </Tooltip>
      )}

      {canCancelVersement && onCancelVersement && (
        <Tooltip
          content={t(
            "clients.cancelVersementTooltip",
            "Cancel this versement and restore product quantities",
          )}
        >
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-500 hover:bg-red-50 h-8 w-8 p-0"
            onClick={() => onCancelVersement(paymentId)}
          >
            <Ban className="w-4 h-4 text-red-500" />
          </Button>
        </Tooltip>
      )}
    </div>
  );
};

export default PaymentActions;
