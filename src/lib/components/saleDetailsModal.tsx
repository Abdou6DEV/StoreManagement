import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer, Eye, Calendar, User, ShoppingBag, DollarSign, Receipt, Tag, CreditCard, Banknote, Edit } from "lucide-react";
import PaymentSummary from "./paymentSummary";

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
}

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ 
  sale, 
  isOpen, 
  onClose, 
  onPrint,
  onModify
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen || !sale) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const handlePrint = () => {
    onPrint?.(sale);
  };

  const handleModify = () => {
    setIsEditing(!isEditing);
  };

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
                {t("cashier.saleDetails", "Sale Details")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("cashier.saleId", "Sale ID")}: {sale.id}
              </p>
            </div>
          </div>
                     <div className="flex items-center gap-2">
                           <button
                onClick={handleModify}
                className={`p-3 hover:bg-muted rounded-lg transition-colors group ${
                  isEditing ? 'bg-blue-500/10' : ''
                }`}
                title={isEditing ? t("cashier.cancelEdit", "Cancel Edit") : t("cashier.modifySale", "Modify Sale")}
              >
                <Edit className={`w-5 h-5 transition-colors ${
                  isEditing 
                    ? 'text-blue-500' 
                    : 'text-muted-foreground group-hover:text-blue-500'
                }`} />
              </button>
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
                      {formatCurrency(sale.discount)}
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
                    {sale.totalItems} {t("cashier.items", "items")}
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
                       cart={sale.saleItems.map(item => ({
                         id: item.id,
                         name: item.product.name,
                         price: item.price,
                         qty: item.quantity
                       }))}
                       clientName={sale.client?.name}
                       paymentAmount={sale.totalPaid}
                       discount={sale.discount}
                       paymentType={sale.isPaidInCash ? "none" : (sale.totalPaid < sale.totalWithDiscount ? "versement" : "credit")}
                       interactive={isEditing}
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