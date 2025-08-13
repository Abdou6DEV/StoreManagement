import React from "react";
import { useTranslation } from "react-i18next";
import { SaleItemPreviewProps } from "./types";

const SaleItemPreview: React.FC<SaleItemPreviewProps> = ({ saleItems }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-3">
      <div className="text-sm font-medium text-foreground line-clamp-1">
        {saleItems
          .slice(0, 2)
          .map((item) => {
            const name =
              item.product?.name ||
              item.manualProduct?.name ||
              item.service?.name ||
              (item.service
                ? t("cashier.service", "Service")
                : t("cashier.manualProduct", "Manual Product"));
            return item.service ? `🔧 ${name}` : name;
          })
          .join(", ")}
        {saleItems.length > 2 &&
          ` +${saleItems.length - 2} ${t("cashier.more", "more")}`}
      </div>
    </div>
  );
};

export default SaleItemPreview;
