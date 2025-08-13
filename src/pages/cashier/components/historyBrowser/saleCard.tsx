import React from "react";
import { SaleCardProps } from "./types";
import SaleHeader from "./saleHeader";
import SaleItemPreview from "./saleItemPreview";
import SaleFooter from "./saleFooter";

const SaleCard: React.FC<SaleCardProps> = ({
  sale,
  index,
  refreshing,
  onClick,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-4 hover:bg-muted/30 hover:shadow-md transition-all duration-300 cursor-pointer ${
        refreshing && index === 0 ? "animate-pulse bg-primary/5" : ""
      }`}
    >
      <SaleHeader sale={sale} />
      <SaleItemPreview saleItems={sale.saleItems} />
      <SaleFooter sale={sale} onDelete={onDelete} />
    </div>
  );
};

export default SaleCard;
