import { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle,
  Trash2,
  UserPlus,
  Printer,
  Calculator,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CartItem, ClientSuggestion } from "../../../types";
import AddPaymentModal from "./addPaymentModal";
import AddClientModal from "./addClientModal";
import CalculatorModal from "./calculatorModal";
import ClientDetailsModal from "../../../lib/components/clientDetailsModal";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import { Tooltip } from "../../../lib/components/tooltip";
import rendererLogger from "../../../lib/logger/rendererLogger";
import { useDebounce } from "../../../lib/hooks/useDebounce";

interface Props {
  clientName: string;
  setClientName: (val: string) => void;
  onClear: () => void;
  onFinish?: () => void;
  setClientId: (id: string | null) => void;
  discount: string;
  onDiscountChange: (val: string) => void;
  cartTotal: number;
  cart: CartItem[];
  paymentAmount: number;
  setPaymentAmount: (val: number) => void;
  paymentType: "none" | "credit" | "versement";
  setPaymentType: (type: "none" | "credit" | "versement") => void;
  paymentDate: Date | undefined;
  setPaymentDate: (val: Date | undefined) => void;
  onConfirmWithReceipt?: () => void;
}

export default function ActionButtons({
  clientName,
  setClientName,
  onClear,
  onFinish,
  setClientId,
  discount,
  onDiscountChange,
  cartTotal,
  cart,
  paymentAmount,
  setPaymentAmount,
  paymentType,
  setPaymentType,
  paymentDate,
  setPaymentDate,
  onConfirmWithReceipt,
}: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [clientSuggestions, setClientSuggestions] = useState<
    ClientSuggestion[]
  >([]);
  const [draftDiscount, setDraftDiscount] = useState(discount);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTypeLocal, setPaymentTypeLocal] = useState<
    "credit" | "versement"
  >(paymentType === "versement" ? "versement" : "credit");
  const [paymentClientPhone, setPaymentClientPhone] = useState("");
  const [modalPaymentAmount, setModalPaymentAmount] = useState(0);
  const [paymentDateLocal, setPaymentDateLocal] = useState<Date | undefined>(
    paymentDate,
  );
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Debounce the discount input to avoid calculations on every keystroke
  const debouncedDiscount = useDebounce(draftDiscount, 300);

  useEffect(() => {
    setDraftDiscount(discount);
  }, [discount]);

  // Handle debounced discount changes
  useEffect(() => {
    if (debouncedDiscount !== discount) {
      if (debouncedDiscount === "") {
        onDiscountChange("");
      } else {
        const maxAllowedDiscount = paymentType === "none" ? cartTotal : cartTotal - paymentAmount;
        if (Number(debouncedDiscount) <= maxAllowedDiscount) {
          onDiscountChange(debouncedDiscount);
        }
      }
    }
  }, [debouncedDiscount, discount, paymentType, cartTotal, paymentAmount, onDiscountChange]);

  // Calculate total profit
  const totalProfit = useMemo(() => {
    return cart.reduce((profit, item) => {
      if (item.isManual || item.isService) {
        // For manual products and services, profit is price - costPrice
        return profit + (item.price - (item.manualProductCostPrice || item.serviceCostPrice || 0)) * item.qty;
      } else {
        // For regular products, profit is price - boughtPrice
        return profit + (item.price - (item.boughtPrice || 0)) * item.qty;
      }
    }, 0);
  }, [cart]);

  // Memoize validation logic to avoid recalculating on every render
  const validationState = useMemo(() => {
    const discountValue = Number(debouncedDiscount) || 0;
    const maxAllowed = paymentType === "none" ? cartTotal : cartTotal - paymentAmount;
    const exceedsTotal = discountValue > maxAllowed;
    const exceedsProfit = discountValue > totalProfit && totalProfit > 0;
    
    return {
      exceedsTotal,
      exceedsProfit,
      discountValue,
      maxAllowed
    };
  }, [debouncedDiscount, paymentType, cartTotal, paymentAmount, totalProfit]);


  // Lazy load clients only when user starts typing (with error handling and cleanup)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    if (clientName.length > 0 && clientSuggestions.length === 0) {
      // Small delay to prevent multiple calls if user types quickly
      timeoutId = setTimeout(() => {
        window.api.database.clients
          .getAll()
          .then((clients) => {
            if (isMounted) {
              setClientSuggestions(clients);
            }
          })
          .catch((error) => {
            console.error("Error loading client suggestions:", error);
            // Don't crash - just log the error
          });
      }, 100);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [clientName, clientSuggestions.length]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Debounce client name for filtering suggestions
  const debouncedClientName = useDebounce(clientName, 300);

  // Memoize filtered suggestions to avoid recalculating on every render
  const filteredSuggestions = useMemo(() => {
    if (debouncedClientName.length === 0) return [];
    
    const searchLower = debouncedClientName.toLowerCase();
    return clientSuggestions.filter((c) =>
      c.name.toLowerCase().includes(searchLower),
    );
  }, [clientSuggestions, debouncedClientName]);

  const handleSuggestionClick = (name: string, id: string) => {
    setClientName(name);
    setClientId(id);
    setSelectedClientId(id);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100);
  };

  // Use debounced client name for matching to avoid checking on every keystroke
  useEffect(() => {
    if (debouncedClientName.trim() && clientSuggestions.length > 0) {
      const match = clientSuggestions.find((c) => c.name === debouncedClientName.trim());
      if (match) {
        setClientId(match.id);
        setSelectedClientId(match.id);
      } else {
        setClientId(null);
        setSelectedClientId(null);
      }
    } else if (debouncedClientName.trim() === "") {
      setClientId(null);
      setSelectedClientId(null);
    }
  }, [debouncedClientName, clientSuggestions, setClientId]);

  // Use debounced client name for phone lookup to avoid checking on every keystroke
  useEffect(() => {
    if (debouncedClientName.trim() && clientSuggestions.length > 0) {
      const match = clientSuggestions.find((c) => c.name === debouncedClientName.trim());
      if (match) {
        setPaymentClientPhone(match.phone || "");
      } else {
        setPaymentClientPhone("");
      }
    } else {
      setPaymentClientPhone("");
    }
  }, [debouncedClientName, clientSuggestions, showPaymentModal]);

  useEffect(() => {
    setPaymentDateLocal(paymentDate);
  }, [paymentDate]);

  useEffect(() => {
    setPaymentDate(paymentDateLocal);
  }, [paymentDateLocal, setPaymentDate]);

  // Listen for F6 key to clear cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F6") {
        e.preventDefault();
        setDraftDiscount("");
        onClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClear]);

  const handleAddClient = async () => {
    if (!clientName.trim()) return;
    try {
      const client = await window.api.database.clients.create({
        name: clientName.trim(),
        phone: paymentClientPhone.trim() || undefined,
        address: clientAddress.trim() || undefined,
        notes: clientNotes.trim() || undefined,
      });
      setClientName(client.name);
      setClientId(client.id);
      const lines = [`Client: ${client.name}`];
      if (client.phone?.trim()) lines.push(`Phone: ${client.phone.trim()}`);
      if (client.address?.trim()) lines.push(`Address: ${client.address.trim()}`);
      if (client.notes?.trim()) lines.push(`Notes: ${client.notes.trim()}`);
      lines.unshift("From cashier:");
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.clientAdded",
        details: lines.join("\n"),
      }).catch(() => {});
      // Safely refresh client suggestions with error handling
      window.api.database.clients
        .getAll()
        .then(setClientSuggestions)
        .catch((error) => {
          console.error("Error refreshing client suggestions:", error);
        });
      setShowAddClientModal(false);
      showToast(
        t("cashier.clientAdded", "Client added successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("cashier.clientError", "Failed to add client"), "error");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2 w-full">
        <div className="relative flex items-center min-w-[180px] max-w-[220px] flex-1">
          <input
            ref={inputRef}
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder={t("cashier.clientName", "Client name")}
            className="rounded-md border border-border px-3 py-2 text-sm bg-background w-full min-w-0"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 z-50 w-full min-w-[180px] max-w-[320px] bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
              {filteredSuggestions.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-2 cursor-pointer hover:bg-accent text-sm"
                  onMouseDown={() => handleSuggestionClick(c.name, c.id)}
                >
                  {c.name}
                  {c.phone && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      {c.phone}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedClientId ? (
          <Tooltip
            content={t(
              "cashier.tooltipShowHistory",
              "View client's payment history and past transactions",
            )}
          >
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
            >
              <Clock
                className={`w-4 h-4 ${i18n.language === "ar" ? " scale-x-[-1]" : ""}`}
              />
              <span className="hidden sm:inline whitespace-nowrap truncate max-w-[150px]">
                {t("cashier.showHistory", "Show History")}
              </span>
            </button>
          </Tooltip>
        ) : (
          <Tooltip
            content={t(
              "cashier.tooltipAddNewClient",
              "Create a new client profile with contact information",
            )}
          >
            <button
              onClick={() => setShowAddClientModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
            >
              <UserPlus
                className={`w-4 h-4 ${i18n.language === "ar" ? " scale-x-[-1]" : ""}`}
              />
              <span className="hidden sm:inline whitespace-nowrap truncate max-w-[150px]">
                {t("cashier.addNewClient", "Add New Client")}
              </span>
            </button>
          </Tooltip>
        )}
        <div className="flex-1 w-28">
          <input
            placeholder={t("cashier.discount", "Discount")}
            className={`w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 transition-all min-w-0 ${
              validationState.exceedsTotal
                ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
                : validationState.exceedsProfit
                ? "border-orange-500 focus:border-orange-500 focus:ring-orange-500"
                : "border-border focus:border-primary focus:ring-primary/50"
            }`}
            type="number"
            value={draftDiscount}
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty string, digits, and single decimal point
              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                setDraftDiscount(val);
                // Let the debounced effect handle parent state updates
              }
            }}
          />
          {validationState.exceedsTotal && (
            <div className="text-xs text-red-500 mt-1">
              {paymentType === "none" 
                ? t("cashier.discountTooHigh", "Discount cannot exceed total")
                : t("cashier.discountTooHighCredit", "Max discount: {amount} DA", { amount: validationState.maxAllowed.toLocaleString() })
              }
            </div>
          )}
          {validationState.exceedsProfit && !validationState.exceedsTotal && (
            <div className="text-xs text-orange-500 mt-1">
              {t("cashier.discountNotRecommended", "Discount is not recommended - exceeds profit")}
            </div>
          )}
        </div>
        <Tooltip
          content={
            !clientName.trim()
              ? t(
                  "cashier.tooltipAddPaymentDisabled",
                  "Choose a client to add a payment",
                )
              : t(
                  "cashier.tooltipAddPaymentEnabled",
                  "Add a credit or versement or by facility",
                )
          }
        >
          <button
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-primary/50 disabled:text-primary-foreground/70 disabled:cursor-not-allowed min-w-0 w-full"
            onClick={() => {
              setShowPaymentModal(true);
            }}
            disabled={!clientName.trim()}
          >
            <span className="whitespace-nowrap">
              {t("cashier.addPayment", "Add Payment")}
            </span>
          </button>
        </Tooltip>
      </div>
      <div className="flex flex-row gap-2 w-full">
        <button
          onClick={onFinish}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.confirmSale", "Confirm Sale")}
          </span>
        </button>
        <button
          onClick={() => {
            rendererLogger.debug("Receipt button clicked", "ActionButtons", {
              cart,
              onConfirmWithReceipt: !!onConfirmWithReceipt,
            });
            onConfirmWithReceipt?.();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
        >
          <Printer className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.confirmWithReceipt", "Receipt")}
          </span>
        </button>
        <button
          onClick={() => {
            setDraftDiscount("");
            onClear();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-destructive text-white font-semibold text-base tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 min-w-0 w-full"
        >
          <Trash2 className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.clearCart", "Clear Cart")}
          </span>
        </button>
        <button
          onClick={() => setShowCalculatorModal(true)}
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-md bg-primary text-primary-foreground text-base font-medium shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition duration-150 disabled:bg-primary/50 disabled:text-primary-foreground/70 disabled:cursor-not-allowed"
          title={t("cashier.calculator", "Calculator")}
        >
          <Calculator className="w-5 h-5" />
        </button>
      </div>
      <AddPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentType={paymentTypeLocal}
        setPaymentType={setPaymentTypeLocal}
        paymentAmount={modalPaymentAmount}
        setPaymentAmount={setModalPaymentAmount}
        paymentDate={paymentDateLocal}
        setPaymentDate={setPaymentDateLocal}
        cart={cart}
        cartTotal={cartTotal}
        discount={Number(discount) || 0}
        t={t as typeof t}
        onConfirm={() => {
          setPaymentType(paymentTypeLocal);
          setPaymentAmount(modalPaymentAmount);
          setPaymentDate(paymentDateLocal);
          setShowPaymentModal(false);
        }}
      />
      <AddClientModal
        open={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        clientName={clientName}
        setClientName={setClientName}
        clientPhone={paymentClientPhone}
        setClientPhone={setPaymentClientPhone}
        clientAddress={clientAddress}
        setClientAddress={setClientAddress}
        clientNotes={clientNotes}
        setClientNotes={setClientNotes}
        t={t as typeof t}
        onConfirm={handleAddClient}
      />
      <CalculatorModal
        open={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />
      {selectedClientId && showHistoryModal && (
        <ClientDetailsModal
          open={showHistoryModal}
          onOpenChange={setShowHistoryModal}
          client={clientSuggestions.find((c) => c.id === selectedClientId) || null}
        />
      )}
    </div>
  );
}
