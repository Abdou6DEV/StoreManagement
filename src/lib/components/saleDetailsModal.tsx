import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { ConfirmDialog } from "./confirmDialog";
import { Modal } from "./modal";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  printReturnSupplierLabels,
  type ServiceLabelSize,
} from "../../pages/services/utils/serviceLabelPrintUtils";

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
  type SupplierReturnCandidate = { productId: string; name: string; deletedQty: number };
  type SupplierOption = { sellerId: string; sellerName: string; lastPrice: number; lastDate?: string };
  const [supplierReturnConfirmOpen, setSupplierReturnConfirmOpen] = useState(false);
  const [supplierReturnModalOpen, setSupplierReturnModalOpen] = useState(false);
  const [supplierReturnCandidates, setSupplierReturnCandidates] = useState<SupplierReturnCandidate[]>([]);
  const [supplierReturnSelected, setSupplierReturnSelected] = useState<Record<string, boolean>>({});
  const [supplierReturnQty, setSupplierReturnQty] = useState<Record<string, number>>({});
  const [supplierOptionsByProduct, setSupplierOptionsByProduct] = useState<Record<string, SupplierOption[]>>({});
  const [selectedSupplierByProduct, setSelectedSupplierByProduct] = useState<Record<string, string>>({});
  const [manualSupplierByProduct, setManualSupplierByProduct] = useState<Record<string, string>>({});
  const [returnIssueByProduct, setReturnIssueByProduct] = useState<Record<string, string>>({});
  const [lastPurchaseByProduct, setLastPurchaseByProduct] = useState<
    Record<string, { lastPrice: number; lastDate?: string }>
  >({});
  const [returnLabelSize, setReturnLabelSize] = useState<ServiceLabelSize>(() => {
    try {
      const cached = typeof localStorage !== "undefined" ? localStorage.getItem("supplierReturn_labelSize") : null;
      return cached === "20x40" || cached === "35x45" || cached === "25x50" ? (cached as ServiceLabelSize) : "20x40";
    } catch {
      return "20x40";
    }
  });
  const [isPrintingReturnLabels, setIsPrintingReturnLabels] = useState(false);
  const [editDeleteConfirmOpen, setEditDeleteConfirmOpen] = useState(false);
  const [pendingEditDeletedCandidates, setPendingEditDeletedCandidates] = useState<SupplierReturnCandidate[]>([]);
  const [pendingAction, setPendingAction] = useState<null | (() => Promise<boolean>)>(null);
  const [pendingSaleDeletedId, setPendingSaleDeletedId] = useState<string | null>(null);
  const advancingToReturnModalRef = useRef(false);
  const wasOpenRef = useRef(false);
  type UnsavedSalePrompt = "closeModal" | "cancelEdit" | null;
  const [unsavedSalePrompt, setUnsavedSalePrompt] =
    useState<UnsavedSalePrompt>(null);

  const isNormalProductId = useCallback((id: string) => {
    if (!id) return false;
    if (id.startsWith("manual-")) return false;
    // Services use their own IDs (uuid) too; we rely on CartItem flags where possible.
    return true;
  }, []);

  const computeDeletedNormalProductsForEdit = useCallback((): SupplierReturnCandidate[] => {
    const displaySale = currentSale || sale;
    if (!displaySale) return [];

    const originalQty = new Map<string, { qty: number; name: string }>();
    displaySale.saleItems.forEach((si) => {
      const pid = si.product?.id;
      if (!pid) return;
      const prev = originalQty.get(pid);
      originalQty.set(pid, {
        qty: (prev?.qty ?? 0) + si.quantity,
        name: si.product?.name ?? prev?.name ?? "?",
      });
    });

    const newQty = new Map<string, number>();
    editedCart.forEach((c) => {
      // Only “normal products”: not manual, not service.
      if (c.isManual || c.isService) return;
      if (!isNormalProductId(c.id)) return;
      newQty.set(c.id, (newQty.get(c.id) ?? 0) + c.qty);
    });

    const candidates: SupplierReturnCandidate[] = [];
    for (const [pid, orig] of originalQty.entries()) {
      const after = newQty.get(pid) ?? 0;
      const deletedQty = Math.max(0, orig.qty - after);
      if (deletedQty > 0) {
        candidates.push({ productId: pid, name: orig.name, deletedQty });
      }
    }
    return candidates;
  }, [currentSale, sale, editedCart, isNormalProductId]);

  const computeDeletedNormalProductsForDeleteSale = useCallback((): SupplierReturnCandidate[] => {
    const displaySale = currentSale || sale;
    if (!displaySale) return [];
    const map = new Map<string, SupplierReturnCandidate>();
    displaySale.saleItems.forEach((si) => {
      const pid = si.product?.id;
      if (!pid) return;
      const prev = map.get(pid);
      map.set(pid, {
        productId: pid,
        name: si.product?.name ?? prev?.name ?? "?",
        deletedQty: (prev?.deletedQty ?? 0) + si.quantity,
      });
    });
    return Array.from(map.values()).filter((c) => c.deletedQty > 0);
  }, [currentSale, sale]);

  const startSupplierReturnUi = useCallback((candidates: SupplierReturnCandidate[]) => {
    if (candidates.length === 0) return;
    setSupplierReturnCandidates(candidates);
    const initialSelected: Record<string, boolean> = {};
    const initialQty: Record<string, number> = {};
    const initialIssues: Record<string, string> = {};
    candidates.forEach((c) => {
      initialSelected[c.productId] = true;
      initialQty[c.productId] = c.deletedQty;
      initialIssues[c.productId] = "";
    });
    setSupplierReturnSelected(initialSelected);
    setSupplierReturnQty(initialQty);
    setReturnIssueByProduct(initialIssues);
    setSupplierReturnConfirmOpen(true);
  }, []);

  // Load supplier options from purchase history when return modal opens
  useEffect(() => {
    if (!supplierReturnModalOpen) return;
    if (supplierReturnCandidates.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        supplierReturnCandidates.map(async (c) => {
          // If we don't have a real product id (history fallback), we can't load suppliers.
          if (!c.productId || c.productId.startsWith("name:")) {
            return [c.productId, [] as SupplierOption[]] as const;
          }
          try {
            const productWithHistory = await window.api.database.products.getWithPurchaseHistory(
              c.productId,
            );
            const purchaseItems: any[] = productWithHistory?.PurchaseItems ?? [];

            // PurchaseItems are ordered desc in DB. For each seller, the first hit is the latest price.
            const seen = new Set<string>();
            const options: SupplierOption[] = [];
            for (const pi of purchaseItems) {
              const seller = pi?.purchase?.seller;
              const sellerId: string | undefined = seller?.id;
              const sellerName: string | undefined = seller?.name;
              if (!sellerId || !sellerName) continue;
              if (seen.has(sellerId)) continue;
              seen.add(sellerId);
              const dateVal: unknown = pi?.purchase?.createdAt ?? pi?.createdAt;
              options.push({
                sellerId,
                sellerName,
                lastPrice: Number(pi?.price ?? 0),
                lastDate: dateVal ? new Date(dateVal as string | number | Date).toISOString() : undefined,
              });
            }
            const overallDateVal: unknown =
              purchaseItems?.[0]?.purchase?.createdAt ?? purchaseItems?.[0]?.createdAt;
            const overall = purchaseItems?.[0]
              ? {
                  lastPrice: Number(purchaseItems?.[0]?.price ?? 0),
                  lastDate: overallDateVal
                    ? new Date(overallDateVal as string | number | Date).toISOString()
                    : undefined,
                }
              : ({ lastPrice: 0 } as { lastPrice: number; lastDate?: string });
            return [c.productId, options, overall] as const;
          } catch {
            return [c.productId, [] as SupplierOption[], { lastPrice: 0 } as { lastPrice: number; lastDate?: string }] as const;
          }
        }),
      );

      if (cancelled) return;
      const map: Record<string, SupplierOption[]> = {};
      const selected: Record<string, string> = {};
      const overallByProduct: Record<string, { lastPrice: number; lastDate?: string }> = {};
      for (const [productId, opts, overall] of entries as any) {
        map[productId] = opts;
        if (opts.length > 0) {
          selected[productId] = opts[0].sellerId;
        }
        overallByProduct[productId] = overall;
      }
      setSupplierOptionsByProduct(map);
      setSelectedSupplierByProduct((prev) => ({ ...selected, ...prev }));
      setLastPurchaseByProduct(overallByProduct);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [supplierReturnModalOpen, supplierReturnCandidates]);

  const resetSupplierReturnState = useCallback(() => {
    setSupplierReturnConfirmOpen(false);
    setSupplierReturnModalOpen(false);
    setSupplierReturnCandidates([]);
    setSupplierReturnSelected({});
    setSupplierReturnQty({});
    setSupplierOptionsByProduct({});
    setSelectedSupplierByProduct({});
    setManualSupplierByProduct({});
    setReturnIssueByProduct({});
    setLastPurchaseByProduct({});
  }, []);

  const finalizeDeleteIfNeeded = useCallback(() => {
    if (!pendingSaleDeletedId) return;
    onSaleDeleted?.(pendingSaleDeletedId);
    setPendingSaleDeletedId(null);
    onClose();
  }, [onClose, onSaleDeleted, pendingSaleDeletedId]);

  // (kept here intentionally; other flows use pendingAction in edit confirm)

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
    // Only reset when the modal transitions closed -> open.
    // When `sale` changes while open (e.g. after saving edits), we must NOT reset state,
    // otherwise we can wipe the supplier-return flow right after save.
    const isOpeningNow = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (isOpeningNow && sale) {
      // Reset edit mode when modal opens
      setIsEditing(false);
      setEditedCart([]);
      setEditedDiscount(0);
      setShowCategoryInfoModal(false);
      setPendingPrintAction(null);
      setCartItemsForPrint([]);
      // Reset supplier-return flow when modal opens
      resetSupplierReturnState();
      setPendingAction(null);
      setPendingSaleDeletedId(null);
      setEditDeleteConfirmOpen(false);
      setPendingEditDeletedCandidates([]);
      setPendingAction(null);
      
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
    } else if (!isOpen) {
      setCurrentSale(null);
    }
  }, [isOpen, sale, resetSupplierReturnState]);

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

  const displaySale = currentSale || sale;

  const saleEditHasUnsavedChanges = useMemo(() => {
    if (!isEditing || !displaySale) return false;
    const origDiscount = displaySale.discount ?? 0;
    if (editedDiscount !== origDiscount) return true;
    const items = displaySale.saleItems ?? [];
    if (editedCart.length !== items.length) return true;
    const lineSig = (id: string, price: number, qty: number) =>
      `${id}|${price}|${qty}`;
    const editedSigs = editedCart
      .map((c) => lineSig(String(c.id), c.price, c.qty))
      .sort();
    const origSigs = items
      .map((item) => {
        const id =
          item.product?.id || item.service?.id || `manual-${item.id}`;
        return lineSig(String(id), item.price, item.quantity);
      })
      .sort();
    return editedSigs.join(";") !== origSigs.join(";");
  }, [isEditing, displaySale, editedCart, editedDiscount]);

  const requestCloseSaleModal = useCallback(() => {
    if (showCategoryInfoModal) return;
    if (isEditing && saleEditHasUnsavedChanges) {
      setUnsavedSalePrompt("closeModal");
      return;
    }
    onClose();
  }, [
    showCategoryInfoModal,
    isEditing,
    saleEditHasUnsavedChanges,
    onClose,
  ]);

  useEffect(() => {
    if (!isOpen || showCategoryInfoModal || showDeleteConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      requestCloseSaleModal();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    isOpen,
    showCategoryInfoModal,
    showDeleteConfirm,
    requestCloseSaleModal,
  ]);

  // Early return after all hooks
  if (!isOpen || !displaySale) return null;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatFullDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const handleModify = () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    if (saleEditHasUnsavedChanges) {
      setUnsavedSalePrompt("cancelEdit");
      return;
    }
    setIsEditing(false);
    setEditedCart([]);
    setEditedDiscount(0);
  };

  const handleSave = async () => {
    if (!displaySale) return;

    const performSave = async (): Promise<boolean> => {
    // Validate that the cart is not empty
    if (editedCart.length === 0) {
      showToast(
        t(
          "cashier.emptySaleError",
          "Cannot save empty sale. Please add at least one item.",
        ),
        "error",
      );
      return false;
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
      return false;
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
      return false;
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
      return true;
    } catch (error) {
      rendererLogger.error("Error updating sale", "SaleDetailsModal", error);
      showToast(t("cashier.saleUpdateError", "Failed to update sale"), "error");
      return false;
    } finally {
      setIsSaving(false);
    }
    };

    const deletedCandidates = computeDeletedNormalProductsForEdit();
    if (deletedCandidates.length > 0) {
      setPendingEditDeletedCandidates(deletedCandidates);
      setPendingAction(() => performSave);
      setEditDeleteConfirmOpen(true);
      return;
    }
    await performSave();
  };

  const handleDelete = async () => {
    if (!displaySale) return;

    const performDelete = async (): Promise<boolean> => {
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
      // Wait to notify parent/close until supplier-return flow ends.
      setPendingSaleDeletedId(displaySale.id);
      return true;
    } catch (error) {
      rendererLogger.error("Error deleting sale", "SaleDetailsModal", error);
      showToast(t("cashier.saleDeleteError", "Failed to delete sale"), "error");
      return false;
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
    };

    const deletedCandidates = computeDeletedNormalProductsForDeleteSale();
    const ok = await performDelete();
    if (!ok) return;
    if (deletedCandidates.length > 0) {
      // Show supplier return flow AFTER deletion (as requested).
      startSupplierReturnUi(deletedCandidates);
    } else {
      // No return flow: close & notify immediately.
      onSaleDeleted?.(displaySale.id);
      onClose();
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
        if (
          !showCategoryInfoModal &&
          !showDeleteConfirm &&
          !editDeleteConfirmOpen &&
          !supplierReturnConfirmOpen &&
          !supplierReturnModalOpen &&
          e.target === e.currentTarget
        ) {
          requestCloseSaleModal();
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
              type="button"
              onClick={requestCloseSaleModal}
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

      {/* Edit Sale - Confirm deleted products */}
      <ConfirmDialog
        open={editDeleteConfirmOpen}
        onOpenChange={(open) => {
          setEditDeleteConfirmOpen(open);
          if (!open) {
            setPendingEditDeletedCandidates([]);
            setPendingAction(null);
          }
        }}
        title={t("supplierReturn.editConfirmTitle")}
        message={t("supplierReturn.editConfirmMessage")}
        confirmText={t("cashier.saveChanges", "Save Changes")}
        cancelText={t("common.cancel", "Cancel")}
        variant="danger"
        onConfirm={async () => {
          const candidates = pendingEditDeletedCandidates;
          const action = pendingAction;
          setPendingEditDeletedCandidates([]);
          setPendingAction(null);
          setEditDeleteConfirmOpen(false);
          if (!action) return;
          // Save first (remove products), then show supplier-return flow.
          const ok = await action();
          if (!ok) return;
          startSupplierReturnUi(candidates);
        }}
      />

      {/* Supplier Return Confirm */}
      <ConfirmDialog
        open={supplierReturnConfirmOpen}
        onOpenChange={(open) => {
          setSupplierReturnConfirmOpen(open);
          // If dismissed via outside click / Esc, finalize deletion.
          if (!open) {
            if (advancingToReturnModalRef.current) {
              advancingToReturnModalRef.current = false;
              return;
            }
            resetSupplierReturnState();
            finalizeDeleteIfNeeded();
          }
        }}
        title={t("supplierReturn.confirmTitle")}
        message={t("supplierReturn.confirmMessage")}
        confirmText={t("supplierReturn.yes")}
        cancelText={t("supplierReturn.no")}
        variant="warning"
        onConfirm={() => {
          advancingToReturnModalRef.current = true;
          setSupplierReturnConfirmOpen(false);
          // Ensure modal opens after confirm fully closes
          setTimeout(() => setSupplierReturnModalOpen(true), 0);
        }}
        onCancel={() => {
          resetSupplierReturnState();
          finalizeDeleteIfNeeded();
        }}
      />

      {/* Supplier Return Selection Modal */}
      <Modal
        open={supplierReturnModalOpen}
        onOpenChange={(open) => {
          setSupplierReturnModalOpen(open);
          // If dismissed via outside click / Esc, finalize deletion.
          if (!open) {
            resetSupplierReturnState();
            finalizeDeleteIfNeeded();
          }
        }}
        title={t("supplierReturn.modalTitle")}
        subtitle={t("supplierReturn.modalDesc")}
        size="xl"
        showFooter={false}
      >
        <div className="space-y-4">
          {/* Label size (same sizes as service labels) */}
          <div className="space-y-2 flex flex-col items-center">
            <span className="text-sm font-medium text-foreground block">
              {t("supplierReturn.labelSize", "Label size")}
            </span>
            <div className="flex flex-wrap gap-3 justify-center">
              {(["20x40", "35x45", "25x50"] as ServiceLabelSize[]).map((size) => (
                <Checkbox
                  key={size}
                  checked={returnLabelSize === size}
                  onChange={(checked) => {
                    if (checked) {
                      setReturnLabelSize(size);
                      try {
                        localStorage.setItem("supplierReturn_labelSize", size);
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  label={`${size.replace("x", "×")} mm`}
                  color="cyan"
                />
              ))}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-20 gap-2 px-4 py-2 bg-muted/40 text-sm font-medium">
              <div className="col-span-5">{t("supplierReturn.product")}</div>
              <div className="col-span-5">{t("supplierReturn.supplier", "Supplier")}</div>
              <div className="col-span-5">{t("supplierReturn.issue", "Issue/Problem")}</div>
              <div className="col-span-2 text-center">{t("supplierReturn.deletedQty")}</div>
              <div className="col-span-3 text-center">{t("supplierReturn.returnQty")}</div>
            </div>
            <div className="divide-y">
              {supplierReturnCandidates.map((c) => {
                const checked = supplierReturnSelected[c.productId] ?? false;
                const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                const min = 1;
                const max = c.deletedQty;
                const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                const selectedSupplier = supplierOptions.find((o) => o.sellerId === selectedSupplierId);
                return (
                  <div key={c.productId} className="grid grid-cols-20 gap-2 px-4 py-3 items-center">
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={checked}
                        onChange={(v) =>
                          setSupplierReturnSelected((prev) => ({ ...prev, [c.productId]: v }))
                        }
                        color="orange"
                      />
                      <div className="truncate">
                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                      </div>
                    </div>
                    <div className="col-span-5">
                      {checked ? (
                        <div className="space-y-1">
                          {supplierOptions.length > 0 ? (
                            <Select
                              value={selectedSupplierId}
                              onValueChange={(value) =>
                                setSelectedSupplierByProduct((prev) => ({
                                  ...prev,
                                  [c.productId]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t("supplierReturn.supplier", "Supplier")} />
                              </SelectTrigger>
                              <SelectContent>
                                {supplierOptions.map((o) => (
                                  <SelectItem key={o.sellerId} value={o.sellerId}>
                                    {o.sellerName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={manualSupplierByProduct[c.productId] ?? ""}
                              onChange={(e) =>
                                setManualSupplierByProduct((prev) => ({
                                  ...prev,
                                  [c.productId]: e.target.value,
                                }))
                              }
                              placeholder={t(
                                "supplierReturn.manualSupplierPlaceholder",
                                "Enter supplier name",
                              )}
                              className="h-10"
                            />
                          )}
                          {selectedSupplier ? (
                            <div className="text-xs text-muted-foreground">
                              {t("supplierReturn.lastPurchasePrice", "Last purchase")}:{" "}
                              {`${Number(selectedSupplier.lastPrice).toLocaleString()} ${t("currency")}`}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>
                    <div className="col-span-5">
                      {checked ? (
                        <Input
                          value={returnIssueByProduct[c.productId] ?? ""}
                          onChange={(e) =>
                            setReturnIssueByProduct((prev) => ({
                              ...prev,
                              [c.productId]: e.target.value,
                            }))
                          }
                          placeholder={t("supplierReturn.issuePlaceholder", "Type the issue")}
                          className="h-10"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>
                    <div className="col-span-2 text-center text-sm">{c.deletedQty}</div>
                    <div className="col-span-3 flex items-center justify-center">
                      {checked && c.deletedQty > 1 ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          min={min}
                          max={max}
                          value={Math.min(Math.max(qty, min), max)}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const clamped = Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min;
                            setSupplierReturnQty((prev) => ({ ...prev, [c.productId]: clamped }));
                          }}
                          className="w-24 px-3 py-2 rounded-md border border-border bg-background text-sm text-center"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {checked ? 1 : "-"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Skip printing -> just finalize delete for now.
                resetSupplierReturnState();
                finalizeDeleteIfNeeded();
              }}
              disabled={isPrintingReturnLabels}
            >
              {t("supplierReturn.skipPrinting")}
            </Button>
            <Button
              disabled={isPrintingReturnLabels}
              onClick={async () => {
                try {
                  setIsPrintingReturnLabels(true);
                  const compactReturnTo = t("supplierReturn.returnTo", "Return To");
                  const titleFull = t("supplierReturn.labelTitle", "Return To Supplier");
                  const dateLabel = t("supplierReturn.date", "Date");
                  const priceLabel = t("supplierReturn.price", "Price");
                  const labels: Array<{
                    title: string;
                    productName: string;
                    supplierName: string;
                    boughtPrice: number | string;
                    dateLabel: string;
                    priceLabel: string;
                    purchaseDate?: string;
                    issue?: string;
                  }> = [];

                  for (const c of supplierReturnCandidates) {
                    const checked = supplierReturnSelected[c.productId] ?? false;
                    if (!checked) continue;
                    const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                    const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                    const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                    const selectedSupplier = supplierOptions.find((o) => o.sellerId === selectedSupplierId);
                    const manualSupplier = (manualSupplierByProduct[c.productId] ?? "").trim();
                    const fallback = lastPurchaseByProduct[c.productId];

                    const supplierName = selectedSupplier?.sellerName ?? manualSupplier ?? "";
                    const boughtPrice = selectedSupplier?.lastPrice ?? fallback?.lastPrice ?? 0;
                    const purchaseDate =
                      selectedSupplier?.lastDate ?? fallback?.lastDate ?? undefined;
                    const issue = (returnIssueByProduct[c.productId] ?? "").trim();

                    const count = Math.max(1, Number.isFinite(qty) ? Math.floor(qty) : 1);
                    for (let i = 0; i < count; i++) {
                      labels.push({
                        title:
                          returnLabelSize === "20x40"
                            ? `${compactReturnTo}: ${supplierName || "—"}`
                            : titleFull,
                        productName: c.name,
                        supplierName: supplierName || "—",
                        boughtPrice,
                        dateLabel: `${dateLabel}:`,
                        priceLabel: `${priceLabel}:`,
                        purchaseDate,
                        issue: issue || undefined,
                      });
                    }
                  }

                  if (labels.length > 0) {
                    await printReturnSupplierLabels(labels, returnLabelSize);
                  }

                  resetSupplierReturnState();
                  finalizeDeleteIfNeeded();
                } catch (e) {
                  showToast(
                    t("supplierReturn.printError", "Failed to print return labels"),
                    "error",
                  );
                } finally {
                  setIsPrintingReturnLabels(false);
                }
              }}
            >
              {t("supplierReturn.printReturnLabel")}
            </Button>
          </div>
        </div>
      </Modal>

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

      <ConfirmDialog
        open={unsavedSalePrompt !== null}
        onOpenChange={(open) => {
          if (!open) setUnsavedSalePrompt(null);
        }}
        title={t("common.unsavedChangesTitle", "Discard changes?")}
        message={t(
          "common.unsavedChangesMessage",
          "You have unsaved changes. If you continue, they will be lost.",
        )}
        cancelText={t("common.cancel", "Cancel")}
        confirmText={t("common.discardChanges", "Discard changes")}
        variant="warning"
        onConfirm={() => {
          const mode = unsavedSalePrompt;
          setIsEditing(false);
          setEditedCart([]);
          setEditedDiscount(0);
          if (mode === "closeModal") {
            onClose();
          }
        }}
      />
    </div>
  );
};

export default SaleDetailsModal;
