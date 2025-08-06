import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Printer,
  Calendar,
  User,
  ShoppingBag,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Edit,
  Save,
  RotateCcw,
  Trash2,
} from "lucide-react";
import PaymentSummary from "./paymentSummary";
import { useToast } from "../contexts/toastContext";
import { Sale } from "../../types";
import rendererLogger from "../logger/rendererLogger";

interface SaleDetailsModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (sale: Sale) => void;
  onModify?: (sale: Sale) => void;
  onSaleUpdated?: (updatedSale: Sale) => void;
  onSaleDeleted?: (saleId: string) => void;
}

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  sale,
  isOpen,
  onClose,
  onPrint,
  onSaleUpdated,
  onSaleDeleted,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCart, setEditedCart] = useState<any[]>([]);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset edit state when modal opens/closes
  useEffect(() => {
    if (isOpen && sale) {
      // Reset edit mode when modal opens
      setIsEditing(false);
      setEditedCart([]);
      setEditedDiscount(0);
    }
  }, [isOpen, sale]);

  // Initialize edit state when sale changes and editing starts
  useEffect(() => {
    if (sale && isEditing) {
      setEditedCart(
        sale.saleItems.map((item) => ({
          id: item.product?.id || `manual-${item.id}`,
          name:
            item.product?.name ||
            item.manualProduct?.name ||
            t("cashier.manualProduct", "Manual Product"),
          price: item.price,
          qty: item.quantity,
          isManual: !item.product,
          manualProductType: item.manualProduct?.type,
        })),
      );
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
      showToast(
        t(
          "cashier.emptySaleError",
          "Cannot save empty sale. Please add at least one item.",
        ),
        "error",
      );
      return;
    }

    // Validate that all items have valid quantities
    const invalidItems = editedCart.filter((item) => item.qty <= 0);
    if (invalidItems.length > 0) {
      showToast(
        t(
          "cashier.invalidQuantityError",
          "All items must have a quantity greater than 0.",
        ),
        "error",
      );
      return;
    }

    // Calculate subtotal and validate discount
    const subtotal = editedCart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

    const isCashSale = sale.isPaidInCash;
    const maxAllowedDiscount = isCashSale
      ? subtotal
              : subtotal - sale.paidAmount;

    if (editedDiscount > maxAllowedDiscount) {
      showToast(
        t(
          "cashier.invalidDiscountError",
          "Discount cannot exceed the remaining amount to be paid.",
        ),
        "error",
      );
      return;
    }

    setIsSaving(true);
    try {
      const updatedSale = await window.api.database.sales.update(sale.id, {
        clientId: sale.client?.name ? undefined : undefined, // Keep existing client
        items: editedCart.map((item) => ({
          productId: item.isManual ? undefined : item.id,
          quantity: item.qty,
          price: item.price,
          manualProductName: item.isManual ? item.name : undefined,
          manualProductType: item.isManual ? item.manualProductType : undefined,
        })),
        discount: editedDiscount,
      });

      showToast(
        t("cashier.saleUpdated", "Sale updated successfully"),
        "success",
      );
      setIsEditing(false);
      onSaleUpdated?.(updatedSale);
    } catch (error) {
      rendererLogger.error("Error updating sale", "SaleDetailsModal", error);
      showToast(t("cashier.saleUpdateError", "Failed to update sale"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sale) return;

    setIsDeleting(true);
    try {
      await window.api.database.sales.delete(sale.id);
      showToast(
        t("cashier.saleDeleted", "Sale deleted successfully"),
        "success",
      );
      onSaleDeleted?.(sale.id);
      onClose();
    } catch (error) {
      rendererLogger.error("Error deleting sale", "SaleDetailsModal", error);
      showToast(t("cashier.saleDeleteError", "Failed to delete sale"), "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const currentCart = isEditing
    ? editedCart
    : sale.saleItems.map((item) => ({
        id: item.product?.id || `manual-${item.id}`,
        name:
          item.product?.name ||
          item.manualProduct?.name ||
          t("cashier.manualProduct", "Manual Product"),
        price: item.price,
        qty: item.quantity,
      }));

  const currentDiscount = isEditing ? editedDiscount : sale.discount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border/50 rounded-2xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/8 rounded-xl">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing
                  ? t("cashier.editSale", "Edit Sale")
                  : t("cashier.saleDetails", "Sale Details")}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{sale.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={
                    isSaving ||
                    editedCart.length === 0 ||
                    editedCart.some((item) => item.qty <= 0)
                  }
                  className="p-2.5 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    editedCart.length === 0
                      ? t(
                          "cashier.emptySaleError",
                          "Cannot save empty sale. Please add at least one item.",
                        )
                      : editedCart.some((item) => item.qty <= 0)
                        ? t(
                            "cashier.invalidQuantityError",
                            "All items must have a quantity greater than 0.",
                          )
                        : t("cashier.saveChanges", "Save Changes")
                  }
                >
                  <Save className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={handleModify}
                  disabled={isSaving}
                  className="p-2.5 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-200/50"
                  title={t("cashier.cancelEdit", "Cancel Edit")}
                >
                  <RotateCcw className="w-4 h-4 text-orange-600" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleModify}
                  className="p-2.5 hover:bg-muted/50 rounded-lg transition-colors"
                  title={t("cashier.modifySale", "Modify Sale")}
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 hover:bg-red-500/10 rounded-lg transition-colors"
                  title={t("cashier.deleteSale", "Delete Sale")}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              className="p-2.5 hover:bg-muted/50 rounded-lg transition-colors"
              title={t("cashier.printReceipt", "Print Receipt")}
            >
              <Printer className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex h-[calc(95vh-100px)]">
          {/* Left Panel - Sale Info */}
          <div className="w-1/3 p-6 border-r border-border/30">
            <div className="space-y-8">
              {/* Sale Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("cashier.saleInformation", "Sale Information")}
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("cashier.date", "Date")}
                    </div>
                    <div className="text-sm font-medium">
                      {formatFullDate(sale.createdAt)}
                    </div>
                  </div>
                  {sale.client && (
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t("cashier.client", "Client")}
                      </div>
                      <div className="text-sm font-medium">
                        {sale.client.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {t("cashier.paymentInformation", "Payment Information")}
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("cashier.paymentMethod", "Payment Method")}
                    </div>
                    <div className="flex items-center gap-2">
                      {sale.isPaidInCash ? (
                        <Banknote className="w-3 h-3 text-green-600" />
                      ) : (
                        <CreditCard className="w-3 h-3 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">
                        {sale.isPaidInCash
                          ? t("cashier.cash", "Cash")
                          : sale.payment?.type === "VERSEMENT"
                            ? t("cashier.versement", "Versement")
                            : t("cashier.credit", "Credit")}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("cashier.paidAmount", "Paid Amount")}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(sale.paidAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {t("cashier.itemsSummary", "Items Summary")}
                </h3>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("cashier.totalItems", "Total Items")}
                  </div>
                  <div className="text-sm font-medium">
                    {currentCart.reduce((sum, item) => sum + item.qty, 0)}{" "}
                    {t("cashier.items", "items")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Payment Summary */}
          <div className="w-2/3 p-6">
            <div className="h-full flex flex-col">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {isEditing
                  ? t("cashier.editPaymentSummary", "Edit Payment Summary")
                  : t("cashier.paymentSummary", "Payment Summary")}
              </h3>
              <div className="flex-1 border border-border/30 rounded-lg overflow-hidden">
                <PaymentSummary
                  cart={currentCart}
                  clientName={sale.client?.name}
                  paymentAmount={sale.paidAmount}
                  discount={currentDiscount}
                  paymentType={
                    sale.isPaidInCash
                      ? "none"
                      : sale.payment?.type === "VERSEMENT"
                        ? "versement"
                        : "credit"
                  }
                  interactive={isEditing}
                  allowDiscountEdit={isEditing}
                  setCart={isEditing ? setEditedCart : undefined}
                  setDiscount={isEditing ? setEditedDiscount : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-background border border-border/50 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t("cashier.confirmDelete", "Confirm Delete")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "cashier.deleteSaleWarning",
                    "This action cannot be undone",
                  )}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              {t(
                "cashier.deleteSaleMessage",
                "Are you sure you want to delete this sale? This will restore the product quantities to your inventory.",
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("cashier.cancel", "Cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting
                  ? t("cashier.deleting", "Deleting...")
                  : t("cashier.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleDetailsModal;
