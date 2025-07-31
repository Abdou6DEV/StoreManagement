import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer, Calendar, User, ShoppingBag, DollarSign, Receipt, CreditCard, Banknote, Edit, Save, X as CancelIcon } from "lucide-react";
import PaymentSummary from "./paymentSummary";
import { useToast } from "../contexts/toastContext";

interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
}

interface Sale {
  id: string;
  createdAt: Date;
  client?: {
    name: string;
  } | null;
  saleItems: SaleItem[];
  totalAmount: number;
  totalWithDiscount: number;
  totalPaid: number;
  totalItems: number;
  discount: number;
  isPaidInCash: boolean;
}

interface SaleDetailsModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (sale: Sale) => void;
  onModify?: (sale: Sale) => void;
  onSaleUpdated?: (updatedSale: Sale) => void;
}

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ 
  sale, 
  isOpen, 
  onClose, 
  onPrint,
  onModify,
  onSaleUpdated
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCart, setEditedCart] = useState<any[]>([]);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edit state when sale changes
  useEffect(() => {
    if (sale && isEditing) {
      setEditedCart(sale.saleItems.map(item => ({
        id: item.productId,
        name: item.product.name,
        price: item.price,
        qty: item.quantity
      })));
      setEditedDiscount(sale.discount);
    }
  }, [sale, isEditing]);

  if (!isOpen || !sale) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const handlePrint = () => {
    onPrint?.(sale);
  };

  const handleModify = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setEditedCart([]);
      setEditedDiscount(0);
    } else {
      // Start editing
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!sale) return;

    // Validate that the cart is not empty
    if (editedCart.length === 0) {
      showToast(t("cashier.emptySaleError", "Cannot save empty sale. Please add at least one item."), "error");
      return;
    }

    // Validate that all items have valid quantities
    const invalidItems = editedCart.filter(item => item.qty <= 0);
    if (invalidItems.length > 0) {
      showToast(t("cashier.invalidQuantityError", "All items must have a quantity greater than 0."), "error");
      return;
    }

    setIsSaving(true);
    try {
      const updatedSale = await window.api.database.sales.update(sale.id, {
        clientId: sale.client?.name ? undefined : undefined, // Keep existing client
        items: editedCart.map(item => ({
          productId: item.id,
          quantity: item.qty,
          price: item.price
        })),
        discount: editedDiscount
      });

      showToast(t("cashier.saleUpdated", "Sale updated successfully"), "success");
      setIsEditing(false);
      onSaleUpdated?.(updatedSale);
    } catch (error) {
      console.error("Error updating sale:", error);
      showToast(t("cashier.saleUpdateError", "Failed to update sale"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const currentCart = isEditing ? editedCart : sale.saleItems.map(item => ({
    id: item.productId,
    name: item.product.name,
    price: item.price,
    qty: item.quantity
  }));

  const currentDiscount = isEditing ? editedDiscount : sale.discount;

  return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
       <div className="bg-background border border-border rounded-xl shadow-2xl max-w-6xl w-full max-h-[98vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {isEditing ? t("cashier.editSale", "Edit Sale") : t("cashier.saleDetails", "Sale Details")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("cashier.saleId", "Sale ID")}: {sale.id}
              </p>
            </div>
          </div>
                     <div className="flex items-center gap-2">
                           {isEditing ? (
                             <>
                               <button
                                 onClick={handleSave}
                                 disabled={isSaving || editedCart.length === 0 || editedCart.some(item => item.qty <= 0)}
                                 className="p-3 hover:bg-muted rounded-lg transition-colors group bg-green-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                 title={
                                   editedCart.length === 0 
                                     ? t("cashier.emptySaleError", "Cannot save empty sale. Please add at least one item.")
                                     : editedCart.some(item => item.qty <= 0)
                                     ? t("cashier.invalidQuantityError", "All items must have a quantity greater than 0.")
                                     : t("cashier.saveChanges", "Save Changes")
                                 }
                               >
                                 <Save className="w-5 h-5 text-green-500" />
                               </button>
                               <button
                                 onClick={handleModify}
                                 disabled={isSaving}
                                 className="p-3 hover:bg-muted rounded-lg transition-colors group"
                                 title={t("cashier.cancelEdit", "Cancel Edit")}
                               >
                                 <CancelIcon className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                               </button>
                             </>
                           ) : (
                             <button
                               onClick={handleModify}
                               className="p-3 hover:bg-muted rounded-lg transition-colors group"
                               title={t("cashier.modifySale", "Modify Sale")}
                             >
                               <Edit className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                             </button>
                           )}
             <button
               onClick={handlePrint}
               className="p-3 hover:bg-muted rounded-lg transition-colors group"
               title={t("cashier.printReceipt", "Print Receipt")}
             >
               <Printer className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
             </button>
             <button
               onClick={onClose}
               className="p-3 hover:bg-muted rounded-lg transition-colors group"
             >
               <X className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
             </button>
           </div>
        </div>

                 {/* Modal Content */}
         <div className="flex h-[calc(98vh-120px)]">
           {/* Left Side - Sale Info */}
           <div className="w-1/3 p-6 border-r border-border">
            <div className="space-y-6">
              {/* Sale Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {t("cashier.saleInformation", "Sale Information")}
                </h3>
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("cashier.date", "Date")}
                    </div>
                    <div className="font-medium">{formatFullDate(sale.createdAt)}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("cashier.saleId", "Sale ID")}
                    </div>
                    <div className="font-mono font-medium text-sm">{sale.id}</div>
                  </div>
                  {sale.client && (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {t("cashier.client", "Client")}
                      </div>
                      <div className="font-medium">{sale.client.name}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t("cashier.paymentInformation", "Payment Information")}
                </h3>
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("cashier.paymentMethod", "Payment Method")}
                    </div>
                                         <div className="flex items-center gap-2">
                       {sale.isPaidInCash ? (
                         <Banknote className="w-4 h-4 text-green-500" />
                       ) : (
                         <CreditCard className="w-4 h-4 text-blue-500" />
                       )}
                       <span className="font-medium">
                         {sale.isPaidInCash 
                           ? t("cashier.cash", "Cash") 
                           : t("cashier.credit", "Credit")
                         }
                       </span>
                     </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("cashier.discount", "Discount")}
                    </div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(currentDiscount)}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      {t("cashier.totalPaid", "Total Paid")}
                    </div>
                    <div className="font-bold text-lg text-primary">
                      {formatCurrency(sale.totalPaid)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  {t("cashier.itemsSummary", "Items Summary")}
                </h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {t("cashier.totalItems", "Total Items")}
                  </div>
                  <div className="font-medium text-lg">
                    {currentCart.reduce((sum, item) => sum + item.qty, 0)} {t("cashier.items", "items")}
                  </div>
                </div>
              </div>
            </div>
          </div>

                                           {/* Right Side - Payment Summary */}
            <div className="w-2/3 p-6">
              <div className="h-full">
                {/* Payment Summary - Full Height */}
                <div className="space-y-4 h-full flex flex-col">
                                     <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                     <DollarSign className="w-5 h-5 text-primary" />
                     {isEditing ? t("cashier.editPaymentSummary", "Edit Payment Summary") : t("cashier.paymentSummary", "Payment Summary")}
                   </h3>
                                     <div className="flex-1 border border-border/30 rounded-lg overflow-hidden bg-transparent">
                     <PaymentSummary
                       cart={currentCart}
                       clientName={sale.client?.name}
                       paymentAmount={sale.totalPaid}
                       discount={currentDiscount}
                       paymentType={sale.isPaidInCash ? "none" : (sale.totalPaid < sale.totalWithDiscount ? "versement" : "credit")}
                       interactive={isEditing}
                       setCart={isEditing ? setEditedCart : undefined}
                     />
                   </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal; 