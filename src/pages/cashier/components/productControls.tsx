import { useTranslation } from "react-i18next";
import { ShoppingCart, PlusCircle, Wrench } from "lucide-react";
import ProductSearch from "./productSearch";
import { Tooltip } from "../../../lib/components/tooltip";
import { BadgeNotification } from "../../../lib/components/badgeNotification";
import { useCompletedServices } from "../../../lib/contexts/completedServicesContext";

interface ProductControlsProps {
  onShowProductBrowser: () => void;
  onShowManualProductModal: () => void;
  onShowServiceModal: () => void;
  onAddProduct: (product: any) => void;
  productRefreshKey: number;
}

export default function ProductControls({
  onShowProductBrowser,
  onShowManualProductModal,
  onShowServiceModal,
  onAddProduct,
  productRefreshKey,
}: ProductControlsProps) {
  const { t } = useTranslation();
  const { completedServicesCount } = useCompletedServices();

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-center gap-2">
        <ProductSearch onAdd={onAddProduct} refreshKey={productRefreshKey} />
        <Tooltip
          content={t("cashier.tooltipBrowseProducts", "Browse Products (F1)")}
          position="top"
        >
          <button
            onClick={onShowProductBrowser}
            className="flex h-8 w-8 p-1 text-sm font-semibold border-1 border-border items-center justify-center rounded-md bg-muted/40 hover:bg-muted hover:text-primary transition"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </Tooltip>
        <Tooltip
          content={t(
            "cashier.tooltipAddManualProduct",
            "Add Products Manually (F2)",
          )}
          position="top"
        >
          <button
            onClick={onShowManualProductModal}
            className="flex h-8 w-8 p-1 text-sm font-semibold border-1 border-border items-center justify-center rounded-md bg-muted/40 hover:bg-muted hover:text-primary transition"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip
          content={t("cashier.tooltipAddService", "Add Service (F3)")}
          position="top"
        >
          <button
            onClick={onShowServiceModal}
            className="flex h-8 w-8 p-1 text-sm font-semibold border-1 border-border items-center justify-center rounded-md bg-muted/40 hover:bg-muted hover:text-blue-500 transition relative"
          >
            <Wrench className="w-4 h-4" />
            {completedServicesCount > 0 && (
              <BadgeNotification 
                count={completedServicesCount} 
                variant="green"
                className="absolute -top-1 -right-1 h-4 text-xs"
              />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
