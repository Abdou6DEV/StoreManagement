import React from "react";
import { CheckCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentStatusProps {
  paidDate: Date | null;
  dueDate: Date;
  isOverdue: boolean;
  isDueSoon: boolean;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({
  paidDate,
  dueDate,
  isOverdue,
  isDueSoon,
}) => {
  const { t } = useTranslation();

  if (paidDate) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        {new Date(paidDate).toLocaleDateString()}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-orange-600" />
      <span className="text-orange-700 font-medium bg-orange-100 px-2 py-1 rounded-full text-xs">
        {t("clients.pending", "Pending")}
      </span>
    </div>
  );
};

export default PaymentStatus; 