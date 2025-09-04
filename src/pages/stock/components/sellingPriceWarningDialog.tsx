import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../lib/components/dialog";

interface SellingPriceWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellingPrice: number;
  boughtPrice: number;
  onConfirm: () => void;
  onCancel: () => void;
  isMultiMode?: boolean;
  productCount?: number;
}

export const SellingPriceWarningDialog: React.FC<SellingPriceWarningDialogProps> = ({
  open,
  onOpenChange,
  sellingPrice,
  boughtPrice,
  onConfirm,
  onCancel,
  isMultiMode = false,
  productCount = 0,
}) => {
  const { t } = useTranslation();

  // Format prices for display
  const formattedSellingPrice = sellingPrice.toLocaleString();
  const formattedBoughtPrice = boughtPrice.toLocaleString();
  const currency = t("cashier.currency", "DA");

  // Get the base message without interpolation
  const baseMessage = t("stock.sellingPriceWarning", {
    sellingPrice: `{sellingPrice}`,
    boughtPrice: `{boughtPrice}`,
    currency: `{currency}`
  });

  // Replace placeholders with colored spans
  const renderColoredMessage = () => {
    const parts = baseMessage.split(/(\{sellingPrice\}|\{boughtPrice\}|\{currency\})/);
    
    return parts.map((part, index) => {
      if (part === '{sellingPrice}') {
        return (
          <span key={index} className="font-semibold text-orange-600 dark:text-orange-400">
            {formattedSellingPrice}
          </span>
        );
      } else if (part === '{boughtPrice}') {
        return (
          <span key={index} className="font-semibold text-green-600 dark:text-green-400">
            {formattedBoughtPrice}
          </span>
        );
      } else if (part === '{currency}') {
        return currency;
      }
      return part;
    });
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {t("stock.sellingPriceWarningTitle", "Price Warning")}
          </DialogTitle>
          <DialogDescription>
            {isMultiMode 
              ? t("stock.multiModeLossWarning", {
                  count: productCount
                })
              : renderColoredMessage()
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="text-muted-foreground"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {t("stock.proceedAnyway")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
