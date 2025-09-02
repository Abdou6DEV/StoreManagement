import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, TrendingUp, TrendingDown, Package, User } from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../lib/components/dialog";
import { Input } from "../../../lib/components/input";

interface PurchaseHistoryItem {
  id: string;
  quantity: number;
  price: number;
  createdAt: string;
  purchase: {
    id: string;
    seller: {
      name: string;
    } | null;
  };
}

interface PriceConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newPrice: number;
  previousPrice: number;
  newSellingPrice: number;
  previousSellingPrice: number;
  sellerName: string | null;
  purchaseHistory?: PurchaseHistoryItem[];
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
  purchaseHistory,
  onCalculateWeightedAverage,
  onKeepNewPrice,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  // State for remembering user choice
  const [rememberChoice, setRememberChoice] = useState(false);

  // Calculate best price and supplier
  const bestPrice = purchaseHistory && purchaseHistory.length > 0 
    ? Math.min(...purchaseHistory.map(item => item.price))
    : previousPrice;
  
  const bestPriceSupplier = purchaseHistory && purchaseHistory.length > 0 
    ? purchaseHistory.find(item => item.price === bestPrice)?.purchase.seller?.name || t("stock.noSeller", "No Seller")
    : null;

  // Check if new price is higher than previous
  const isPriceIncrease = newPrice > previousPrice;
  
  // Get previous purchase details
  const previousPurchase = purchaseHistory && purchaseHistory.length > 0 ? purchaseHistory[0] : null;

  // Handle action with remember choice logic
  const handleAction = (action: 'weighted' | 'new') => {
    if (rememberChoice) {
      localStorage.setItem('priceConfirmationChoice', action);
    }
    
    if (action === 'weighted') {
      onCalculateWeightedAverage();
    } else {
      onKeepNewPrice();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            {t("stock.differentPriceDetected", "You have entered a different bought price")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("stock.priceConfirmationDescription", "Review the price differences and choose how to handle the new purchase. You can calculate a weighted average price or keep the new price.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Current Price Comparison */}
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">
              {t("stock.priceComparison", "Price Comparison")}
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("stock.newBoughtPrice", "New Bought Price")}
                </p>
                <p className={`text-2xl font-bold ${isPriceIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {newPrice.toLocaleString()} {t("cashier.currency", "DA")}
                  {isPriceIncrease && <TrendingUp className="inline w-5 h-5 ml-2" />}
                  {!isPriceIncrease && <TrendingDown className="inline w-5 h-5 ml-2" />}
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("stock.previousBoughtPrice", "Previous Bought Price")}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {previousPrice.toLocaleString()} {t("cashier.currency", "DA")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("stock.newSellingPrice", "New Selling Price")}
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {newSellingPrice.toLocaleString()} {t("cashier.currency", "DA")}
                </p>
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("stock.previousSellingPrice", "Previous Selling Price")}
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {previousSellingPrice.toLocaleString()} {t("cashier.currency", "DA")}
                </p>
              </div>
            </div>

            {sellerName && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("stock.currentSupplier", "Current Supplier")}
                </p>
                <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {sellerName}
                </p>
              </div>
            )}
          </div>

          {/* Purchase History Summary */}
                      {purchaseHistory && purchaseHistory.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t("stock.purchaseHistory", "Purchase History")}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Best Price */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium">
                    {t("stock.bestPrice", "Best Price")}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {bestPrice.toLocaleString()} {t("cashier.currency", "DA")}
                  </p>
                  {bestPriceSupplier && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {bestPriceSupplier}
                    </p>
                  )}
                </div>

                {/* Previous Purchase */}
                {previousPurchase && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("stock.lastPurchase", "Last Purchase")}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {previousPurchase.price.toLocaleString()} {t("cashier.currency", "DA")}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {previousPurchase.purchase.seller?.name || t("stock.noSeller", "No Seller")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(previousPurchase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Total Purchases */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium">
                    {t("stock.totalPurchases", "Total Purchases")}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {purchaseHistory ? purchaseHistory.length : 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("stock.uniqueSuppliers", "Unique Suppliers")}: {purchaseHistory ? new Set(purchaseHistory.map(item => item.purchase.seller?.name).filter(Boolean)).size : 0}
                  </p>
                </div>
              </div>

              {/* Price Warning */}
              {isPriceIncrease && (
                <div className="mt-4 p-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    {t("stock.priceIncreaseWarning", "The new price is higher than your previous purchase. Consider negotiating with suppliers or finding alternative sources.")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Remember Choice Checkbox */}
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Input
                id="rememberChoice"
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="rememberChoice"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t("stock.rememberChoice", "Remember my choice and apply it automatically in the future")}
              </label>
            </div>
            {rememberChoice && (
              <p className="text-xs text-muted-foreground mt-2 ml-6">
                {t("stock.rememberChoiceNote", "Your choice will be saved and automatically applied when similar price differences are detected.")}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <p className="text-base text-muted-foreground text-center font-medium">
              {t("stock.calculateBestPrice", "Do you want to calculate the best bought price")}{" "}
              {t("stock.orKeepNewPrice", "or just keep the new bought price?")}
            </p>

            <div className={`flex gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Button
                onClick={() => handleAction('weighted')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-base py-3"
                size="lg"
              >
                {t("stock.calculateWeightedAverage", "Calculate Weighted Average")}
              </Button>
              <Button
                onClick={() => handleAction('new')}
                variant="outline"
                className="flex-1 text-base py-3"
                size="lg"
              >
                {t("stock.keepNewPrice", "Keep New Price")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
