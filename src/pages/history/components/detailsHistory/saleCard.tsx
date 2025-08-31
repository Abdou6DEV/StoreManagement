import React from "react";
import { useTranslation } from "react-i18next";
import type { SaleForHistory } from "../../../../types";
import SaleHeader from "./saleHeader";
import SaleItemPreview from "./saleItemPreview";
import SaleFooter from "./saleFooter";

interface SaleCardProps {
  sale: SaleForHistory;
  index: number;
  onView: (sale: SaleForHistory) => void;
}

const SaleCard: React.FC<SaleCardProps> = ({ sale, index, onView }) => {
  const { t } = useTranslation();

  const handleCardClick = () => {
    onView(sale);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border border-border rounded-lg p-4 hover:bg-muted/30 hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      <SaleHeader sale={sale} />
      <SaleItemPreview saleItems={sale.saleItems} />
      <SaleFooter sale={sale} onView={onView} />
    </div>
  );
};

export default SaleCard;
