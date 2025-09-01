import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../lib/components/dialog";

interface PriceConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPrice: number;
  previousPrice: number;
  newSellingPrice: number;
  previousSellingPrice: number;
  sellerName: string | null;
  onCalculateWeightedAverage: () => void;
  onKeepNewPrice: () => void;
}

export const PriceConfirmationDialog: React.FC<PriceConfirmationDialogProps> = ({
  open,
  onOpenChange,
  newPrice,
  previousPrice,
  newSellingPrice,
  previousSellingPrice,
  sellerName,
  onCalculateWeightedAverage,
  onKeepNewPrice,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {t("stock.differentPriceDetected", "You have entered a different bought price")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center space-y-2">
                         <p className="text-sm text-muted-foreground">
               {t("stock.differentPriceDetected", "You have entered a different bought price")}{" "}
               <span className="font-semibold text-foreground">
                 {newPrice.toLocaleString()} {t("cashier.currency", "DA")}
               </span>{" "}
               {t("stock.previousPrice", "which you bought before for")}{" "}
               <span className="font-semibold text-foreground">
                 {previousPrice.toLocaleString()} {t("cashier.currency", "DA")}
               </span>
             </p>
             
             <p className="text-sm text-muted-foreground">
               {t("stock.sellingPrice", "Selling price")}:{" "}
               <span className="font-semibold text-foreground">
                 {newSellingPrice.toLocaleString()} {t("cashier.currency", "DA")}
               </span>{" "}
               {t("stock.previousSellingPrice", "(was")}{" "}
               <span className="font-semibold text-foreground">
                 {previousSellingPrice.toLocaleString()} {t("cashier.currency", "DA")}
               </span>)
             </p>
            
            {sellerName && (
              <p className="text-sm text-muted-foreground">
                {t("stock.fromSeller", "from")} <span className="font-semibold">{sellerName}</span>
              </p>
            )}
            
            <p className="text-sm text-muted-foreground">
              {t("stock.calculateBestPrice", "Do you want to calculate the best bought price")}{" "}
              {t("stock.orKeepNewPrice", "or just keep the new bought price?")}
            </p>
          </div>

          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Button
              onClick={onCalculateWeightedAverage}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {t("stock.calculateWeightedAverage", "Calculate Weighted Average")}
            </Button>
            <Button
              onClick={onKeepNewPrice}
              variant="outline"
              className="flex-1"
            >
              {t("stock.keepNewPrice", "Keep New Price")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
