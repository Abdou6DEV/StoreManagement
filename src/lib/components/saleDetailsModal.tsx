import React, { useState, useEffect, useCallback } from "react";
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
  Copy,
} from "lucide-react";
import PaymentSummary from "./paymentSummary";
import { useToast } from "../contexts/toastContext";
import { Sale, CartItem, CategoryInfo } from "../../types";
import rendererLogger from "../logger/rendererLogger";
import { printReceiptDirectly } from "../../pages/cashier/components/receiptModal";
import CategoryInfoModal from "../../pages/cashier/components/categoryInfoModal";
import { useStock } from "../contexts/stockContext";
import { useAuth } from "../contexts/authContext";

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
  const { user } = useAuth();
  const { products: allProducts } = useStock();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCart, setEditedCart] = useState<CartItem[]>([]);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryInfoModal, setShowCategoryInfoModal] = useState(false);
  const [categoriesRequiringInfo, setCategoriesRequiringInfo] = useState<string[]>([]);
  const [pendingPrintAction, setPendingPrintAction] = useState<(() => Promise<void>) | null>(null);
  const [cartItemsForPrint, setCartItemsForPrint] = useState<CartItem[]>([]);

  const [currentSale, setCurrentSale] = useState<Sale | null>(null);

  // Load categories requiring additional information
  useEffect(() => {
    const loadCategoriesRequiringInfo = async () => {
      try {
        const categoriesData = await window.api.database.options.get("categoriesRequiringInfo");
        if (categoriesData) {
          setCategoriesRequiringInfo(JSON.parse(categoriesData));
        }
      } catch (error) {
        console.error("Failed to load categories requiring info:", error);
      }
    };
    
    if (isOpen) {
      loadCategoriesRequiringInfo();
    }
  }, [isOpen]);

  // Reset edit state when modal opens/closes and refresh sale data
  useEffect(() => {
    if (isOpen && sale) {
      // Reset edit mode when modal opens
      setIsEditing(false);
      setEditedCart([]);
      setEditedDiscount(0);
      setShowCategoryInfoModal(false);
      setPendingPrintAction(null);
      setCartItemsForPrint([]);
      
      // Refresh sale data to get latest payment information
      const refreshSaleData = async () => {
        try {
          const refreshedSale = await window.api.database.sales.getById(sale.id);
          if (refreshedSale) {
            setCurrentSale(refreshedSale);
          } else {
            setCurrentSale(sale);
          }
        } catch (error) {
          console.error("Error refreshing sale data:", error);
          // Fallback to original sale data if refresh fails
          setCurrentSale(sale);
        }
      };
      
      refreshSaleData();
    } else {
      setCurrentSale(null);
    }
  }, [isOpen, sale]);

  // Initialize edit state when sale changes and editing starts
  useEffect(() => {
    const saleToUse = currentSale || sale;
    if (saleToUse && isEditing) {
      setEditedCart(
        saleToUse.saleItems.map((item) => ({
          id: item.product?.id || item.service?.id || `manual-${item.id}`,
          name:
            item.product?.name ||
            item.manualProduct?.name ||
            item.service?.name ||
            (item.service
              ? t("cashier.service", "Service")
              : t("cashier.manualProduct", "Manual Product")),
          price: item.price,
          qty: item.quantity,
          isManual: !item.product && !item.service,
          isService: !!item.service,
          manualProductType: item.manualProduct?.type,
          description: item.service?.description,
          serviceAppointmentId: item.service?.serviceAppointmentId,
          serviceCostPrice: item.service ? (item.boughtPrice || item.service?.costPrice) : undefined,
          boughtPrice: item.product ? item.boughtPrice : undefined,
        })),
      );
      setEditedDiscount(saleToUse.discount);
    }
  }, [currentSale, sale, isEditing, t]);

  // Use currentSale if available, otherwise fallback to sale prop
  const displaySale = currentSale || sale;

  // Check if any products in cart require additional information
  const checkCategoryInfoRequired = useCallback((cartItems: CartItem[]) => {
    if (categoriesRequiringInfo.length === 0) return false;
    
    return cartItems.some((item) => {
      if (item.isManual || item.isService) return false;
      const product = allProducts.find((p) => p.id === item.id);
      return product && categoriesRequiringInfo.includes(product.categoryName || "");
    });
  }, [allProducts, categoriesRequiringInfo]);

  // Actual print function
  const executePrint = useCallback(async (cartItems: CartItem[]) => {
    const saleToUse = currentSale || sale;
    if (!saleToUse) return;

    try {
      // Determine payment type from the actual sale payment information
      const paymentType: "none" | "credit" | "versement" = saleToUse.isPaidInCash
        ? "none"
        : saleToUse.payment?.type === "VERSEMENT"
          ? "versement"
          : "credit";

      // Get payment date from the actual sale payment information
      const paymentDate = saleToUse.payment?.paidDate
        ? new Date(saleToUse.payment.paidDate)
        : undefined;

      // Get due date from the actual sale payment information (for credit/versement sales)
      const dueDate = saleToUse.payment?.dueDate
        ? new Date(saleToUse.payment.dueDate)
        : undefined;

      // Get payment amount from the actual sale
      const paymentAmount = saleToUse.paidAmount || 0;

      // Call print function directly with the actual payment information
      await printReceiptDirectly(
        cartItems,
        saleToUse.client?.name || "",
        saleToUse.discount,
        paymentAmount,
        paymentType,
        paymentDate,
        saleToUse.id,
        (message, type) => showToast(message, type || "info"),
        dueDate,
        new Date(saleToUse.createdAt) // Pass the sale date
      );
    } catch (error) {
      console.error("Failed to print receipt:", error);
      showToast(
        t("cashier.printError", "Failed to print receipt"),
        "error"
      );
    }
  }, [currentSale, sale, showToast, t]);

  const handlePrint = async () => {
    const saleToUse = currentSale || sale;
    if (!saleToUse) return;

    // Convert saleItems to CartItem format
    const cartItems: CartItem[] = saleToUse.saleItems.map((item) => ({
      id: item.product?.id || item.service?.id || `manual-${item.id}`,
      name:
        item.product?.name ||
        item.manualProduct?.name ||
        item.service?.name ||
        "",
      price: item.price,
      qty: item.quantity,
      boughtPrice: item.boughtPrice || undefined,
      isManual: !item.product && !item.service,
      isService: !!item.service,
      manualProductType: item.manualProduct?.type,
      description: item.service?.description,
      serviceCostPrice: item.service ? (item.boughtPrice || item.service?.costPrice) : undefined,
      serviceAppointmentId: item.service?.serviceAppointmentId || undefined,
    }));

    // Check if category information is required
    if (checkCategoryInfoRequired(cartItems)) {
      // Check if categoryInfo is already present for all required items
      const productsRequiringInfo = cartItems.filter((item) => {
        if (item.isManual || item.isService) return false;
        const product = allProducts.find((p) => p.id === item.id);
        return product && categoriesRequiringInfo.includes(product.categoryName || "");
      });

      // Check if all required items have complete categoryInfo (one per unit)
      const allHaveCategoryInfo = productsRequiringInfo.every((item) => {
        return item.categoryInfo && Array.isArray(item.categoryInfo) && item.categoryInfo.length === item.qty;
      });

      if (!allHaveCategoryInfo) {
        // Show category info modal
        setCartItemsForPrint(cartItems);
        setPendingPrintAction(() => async () => {
          await executePrint(cartItems);
        });
        setShowCategoryInfoModal(true);
        return;
      }
    }

    // If no category info required or all items already have categoryInfo, print directly
    await executePrint(cartItems);
  };

  // Handle category info modal actions
  const handleCategoryInfoSubmit = useCallback((infoMap: Record<string, CategoryInfo[]>) => {
    // Close modal first
    setShowCategoryInfoModal(false);
    
    // Attach categoryInfo to cart items
    const updatedCartItems = cartItemsForPrint.map((item) => {
      const categoryInfo = infoMap[item.id];
      if (categoryInfo && categoryInfo.length > 0) {
        return { ...item, categoryInfo };
      }
      return item;
    });
    
    // Execute print with updated cart items
    setPendingPrintAction(null);
    setCartItemsForPrint([]);
    
    // Print with updated cart items
    executePrint(updatedCartItems);
  }, [cartItemsForPrint, executePrint]);

  const handleCategoryInfoSkip = useCallback(() => {
    setShowCategoryInfoModal(false);
    const action = pendingPrintAction;
    setPendingPrintAction(null);
    setCartItemsForPrint([]);
    
    // Execute print without category info
    if (action) {
      action();
    }
  }, [pendingPrintAction]);

  const handleCategoryInfoCancel = useCallback(() => {
    setShowCategoryInfoModal(false);
    setPendingPrintAction(null);
    setCartItemsForPrint([]);
  }, []);

  // Early return after all hooks
  if (!isOpen || !displaySale) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleString();
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
    if (!displaySale) return;

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

    const isCashSale = displaySale.isPaidInCash;
    const maxAllowedDiscount = isCashSale
      ? subtotal
      : subtotal - displaySale.paidAmount;

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
      const updatedSale = await window.api.database.sales.update(displaySale.id, {
        clientId: displaySale.client?.name ? undefined : undefined, // Keep existing client
        items: editedCart.map((item) => ({
          productId: item.isManual || item.isService ? undefined : item.id,
          quantity: item.qty,
          price: item.price,
          boughtPrice: !item.isManual && !item.isService ? item.boughtPrice : undefined,
          manualProductName: item.isManual ? item.name : undefined,
          manualProductType: item.isManual ? item.manualProductType : undefined,
          serviceName: item.isService ? item.name : undefined,
          serviceDescription: item.isService ? item.description : undefined,
          serviceCostPrice: item.isService ? item.serviceCostPrice : undefined,
          serviceAppointmentId: item.isService ? item.serviceAppointmentId : undefined,
        })),
        discount: editedDiscount,
      });
      // Build "what changed" description for the log
      const changeLines: string[] = [];
      const oldDiscount = displaySale.discount ?? 0;
      if (editedDiscount !== oldDiscount) {
        if (oldDiscount === 0) changeLines.push(`Discount added: ${editedDiscount}`);
        else if (editedDiscount === 0) changeLines.push("Discount removed");
        else changeLines.push(`Discount changed from ${oldDiscount} to ${editedDiscount}`);
      }
      const SEP = "\u0001";
      const getItemKey = (name: string, price: number) => `${name}${SEP}${price}`;
      const oldItems = displaySale.saleItems ?? [];
      const oldMap = new Map<string, number>();
      oldItems.forEach((s) => {
        const name = s.product?.name ?? s.manualProduct?.name ?? s.service?.name ?? "?";
        const key = getItemKey(name, s.price);
        oldMap.set(key, (oldMap.get(key) ?? 0) + s.quantity);
      });
      const newMap = new Map<string, number>();
      editedCart.forEach((c) => {
        const key = getItemKey(c.name, c.price);
        newMap.set(key, (newMap.get(key) ?? 0) + c.qty);
      });
      const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
      allKeys.forEach((key) => {
        const name = key.split(SEP)[0] ?? "?";
        const oldQty = oldMap.get(key) ?? 0;
        const newQty = newMap.get(key) ?? 0;
        if (newQty > oldQty) changeLines.push(`Added: ${name} x${newQty - oldQty}`);
        else if (newQty < oldQty) changeLines.push(`Removed: ${name} x${oldQty - newQty}`);
      });
      const detailsStr = changeLines.length > 0
        ? `Sale ID: ${displaySale.id}\n${changeLines.join("\n")}`
        : `Sale ID: ${displaySale.id} (no item or discount changes)`;
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.saleUpdated",
        details: detailsStr,
      }).catch(() => {});
      showToast(
        t("cashier.saleUpdated", "Sale updated successfully"),
        "success",
      );
      setIsEditing(false);
      setCurrentSale(updatedSale);
      onSaleUpdated?.(updatedSale);
    } catch (error) {
      rendererLogger.error("Error updating sale", "SaleDetailsModal", error);
      showToast(t("cashier.saleUpdateError", "Failed to update sale"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!displaySale) return;

    setIsDeleting(true);
    try {
      await window.api.database.sales.delete(displaySale.id);
      const saleItemsCount = displaySale.saleItems?.length ?? 0;
      const saleClient = displaySale.client?.name ? ` Client: ${displaySale.client.name}` : "";
      const saleDetailsStr = `Sale ID: ${displaySale.id}. Items: ${saleItemsCount}.${saleClient}`;
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.saleDeleted",
        details: saleDetailsStr,
      }).catch(() => {});
      showToast(
        t("cashier.saleDeleted", "Sale deleted successfully"),
        "success",
      );
      onSaleDeleted?.(displaySale.id);
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
    : displaySale.saleItems.map((item) => ({
        id: item.product?.id || item.service?.id || `manual-${item.id}`,
        name:
          item.product?.name ||
          item.manualProduct?.name ||
          item.service?.name ||
          (item.service
            ? t("cashier.service", "Service")
            : t("cashier.manualProduct", "Manual Product")),
        price: item.price,
        qty: item.quantity,
        isService: !!item.service,
        description: item.service?.description,
      }));

  const currentDiscount = isEditing ? editedDiscount : displaySale.discount;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (!showCategoryInfoModal && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-background border border-border/50 rounded-2xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground">{displaySale.id}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(displaySale.id).then(
                      () => showToast(t("common.copied", "Copied to clipboard"), "success"),
                      () => showToast(t("common.copyFailed", "Failed to copy"), "error")
                    );
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t("common.copy", "Copy")}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
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
                      {formatFullDate(displaySale.createdAt)}
                    </div>
                  </div>
                  {displaySale.client && (
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t("cashier.client", "Client")}
                      </div>
                      <div className="text-sm font-medium">
                        {displaySale.client.name}
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
                      {displaySale.isPaidInCash ? (
                        <Banknote className="w-3 h-3 text-green-600" />
                      ) : (
                        <CreditCard className="w-3 h-3 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">
                        {displaySale.isPaidInCash
                          ? t("cashier.cash", "Cash")
                          : displaySale.payment?.type === "VERSEMENT"
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
                      {formatCurrency(displaySale.paidAmount)}
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
                  clientName={displaySale.client?.name}
                  paymentAmount={displaySale.paidAmount}
                  discount={currentDiscount}
                  paymentType={
                    displaySale.isPaidInCash
                      ? "none"
                      : displaySale.payment?.type === "VERSEMENT"
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

      {/* Category Info Modal - Rendered outside to prevent click propagation */}
      {showCategoryInfoModal && (
        <CategoryInfoModal
          open={showCategoryInfoModal}
          onClose={handleCategoryInfoCancel}
          onSkip={handleCategoryInfoSkip}
          onSubmit={handleCategoryInfoSubmit}
          cartItems={cartItemsForPrint}
          categoriesRequiringInfo={categoriesRequiringInfo}
          allProducts={allProducts}
        />
      )}
    </div>
  );
};

export default SaleDetailsModal;
