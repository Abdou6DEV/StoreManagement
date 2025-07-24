import { useState, useEffect, useRef } from "react";
import { CheckCircle, Trash2, UserPlus, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CartItem } from "../../cashier";
import AddPaymentModal from "./addPaymentModal";
import AddClientModal from "./addClientModal";

// Define a type for client suggestions
interface ClientSuggestion {
  id: string;
  name: string;
  phone?: string;
}

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
  const { t } = useTranslation();
  const [clientSuggestions, setClientSuggestions] = useState<
    ClientSuggestion[]
  >([]);
  const [draftDiscount, setDraftDiscount] = useState(discount);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTypeLocal, setPaymentTypeLocal] = useState<
    "credit" | "versement"
  >(paymentType === "versement" ? "versement" : "credit");
  const [paymentClientName, setPaymentClientName] = useState("");
  const [paymentClientPhone, setPaymentClientPhone] = useState("");
  const [modalPaymentAmount, setModalPaymentAmount] = useState(0);
  const [paymentDateLocal, setPaymentDateLocal] = useState<Date | undefined>(
    paymentDate,
  );
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Keep draftDiscount in sync with prop when session changes
  useEffect(() => {
    setDraftDiscount(discount);
  }, [discount]);

  const refreshClientSuggestions = () => {
    window.api.database.clients.getAll().then(setClientSuggestions);
  };

  useEffect(() => {
    refreshClientSuggestions();
  }, []);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Filter suggestions based on input
  const filteredSuggestions =
    clientName.length > 0
      ? clientSuggestions.filter((c) =>
          c.name.toLowerCase().includes(clientName.toLowerCase()),
        )
      : [];

  // Handle suggestion click
  const handleSuggestionClick = (name: string, id: string) => {
    setClientName(name);
    setClientId(id);
    setSelectedClientId(id);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Hide suggestions on blur
  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100);
  };

  // Clear clientId if input doesn't match any client
  useEffect(() => {
    const match = clientSuggestions.find((c) => c.name === clientName);
    if (!match) {
      setClientId(null);
      setSelectedClientId(null);
    }
  }, [clientName, clientSuggestions, setClientId]);

  // Helper to auto-fill client info if selected
  useEffect(() => {
    if (clientName && clientSuggestions.length > 0) {
      const match = clientSuggestions.find((c) => c.name === clientName);
      if (match) {
        setPaymentClientName(match.name);
        setPaymentClientPhone(match.phone || "");
      } else {
        setPaymentClientName(clientName);
        setPaymentClientPhone("");
      }
    } else {
      setPaymentClientName("");
      setPaymentClientPhone("");
    }
  }, [clientName, clientSuggestions, showPaymentModal]);

  // Keep local payment date in sync with prop
  useEffect(() => {
    setPaymentDateLocal(paymentDate);
  }, [paymentDate]);

  // When local payment date changes (from modal), update parent
  useEffect(() => {
    setPaymentDate(paymentDateLocal);
  }, [paymentDateLocal, setPaymentDate]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* === Row 1: All controls in a single row, responsive width === */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {/* Client input and history button */}
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
          {/* Suggestions Dropdown (below input) */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 z-50 mt-1 w-full min-w-[180px] max-w-[320px] bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
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
        {/* Add Client Button */}
        <button
          onClick={() => setShowAddClientModal(true)}
          className="flex items-center px-2 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border min-w-[40px]"
          style={{ flexShrink: 0 }}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline whitespace-nowrap">{t("cashier.addNewClient", "Add New Client")}</span>
        </button>
        {/* Discount Input */}
        <input
          placeholder={t("cashier.discount", "Discount")}
          className={`w-20 rounded-md border px-3 py-2 text-sm bg-background border-border focus:border-primary focus:ring-primary/50 focus:outline-none focus:ring-1 transition-all min-w-0 ${Number(draftDiscount) > cartTotal ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          type="number"
          value={draftDiscount}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) {
              setDraftDiscount(val);
            }
          }}
          style={{ flexShrink: 0 }}
        />
        {/* Confirm Button */}
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-md font-semibold text-sm shadow border border-border bg-primary text-primary-foreground hover:bg-primary/90 transition min-w-[40px] ${Number(draftDiscount) > cartTotal || draftDiscount === "" ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (Number(draftDiscount) > cartTotal || draftDiscount === "") {
              return;
            } else {
              onDiscountChange(draftDiscount);
            }
          }}
          disabled={Number(draftDiscount) > cartTotal || draftDiscount === ""}
          style={{ flexShrink: 0 }}
        >
          <CheckCircle className="w-5 h-5" />
        </button>
        {/* Add Payment Button (moved here) */}
        <button
          className="flex items-center rounded-xl bg-blue-500 text-white px-4 py-2 text-base font-medium shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 disabled:bg-blue-300 disabled:text-white/70 disabled:cursor-not-allowed min-w-0"
          onClick={() => {
            setShowPaymentModal(true);
          }}
          disabled={!clientName.trim()}
          style={{ flexShrink: 0 }}
        >
          <span className="whitespace-nowrap">{t("cashier.addPayment", "Add Payment")}</span>
        </button>
      </div>

      {/* === Row 2: Confirm Sale, Confirm with Receipt, Clear Cart === */}
      <div className="flex flex-row gap-2 w-full">
        <button
          onClick={onFinish}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border min-w-0"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">{t("cashier.confirmSale", "Confirm Sale")}</span>
        </button>
        <button
          onClick={onConfirmWithReceipt}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border min-w-0"
        >
          <Printer className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">{t("cashier.confirmWithReceipt", "Receipt")}</span>
        </button>
        <button
          onClick={() => {
            setDraftDiscount("");
            onClear();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive text-white font-semibold text-base tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 border border-border min-w-0"
        >
          <Trash2 className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">{t("cashier.clearCart", "Clear Cart")}</span>
        </button>
      </div>

      {/* === Add Payment Modal === */}
      <AddPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentType={paymentTypeLocal}
        setPaymentType={setPaymentTypeLocal} // Only update local state
        paymentAmount={modalPaymentAmount}
        setPaymentAmount={setModalPaymentAmount} // Only update local state
        paymentDate={paymentDateLocal}
        setPaymentDate={setPaymentDateLocal} // Only update local state
        cart={cart}
        cartTotal={cartTotal}
        t={t as typeof t}
        onConfirm={() => {
          setPaymentType(paymentTypeLocal);
          setPaymentAmount(modalPaymentAmount);
          setPaymentDate(paymentDateLocal);
          setShowPaymentModal(false);
        }}
      />

      {/* === Add Client Modal === */}
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
        onConfirm={() => setShowAddClientModal(false)}
      />
    </div>
  );
}
