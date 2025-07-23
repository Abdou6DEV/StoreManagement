import { useState, useEffect, useRef } from "react";
import { CheckCircle, Trash2, UserPlus } from "lucide-react";
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
    <div className="flex flex-col gap-4">
      {/* === Row 1: All controls in a single row, responsive width === */}
      <div className="flex flex-row flex-wrap gap-2 items-center w-full">
        {/* Client input and history button */}
        <div
          className="flex items-center relative min-w-40"
          style={{ flex: 1 }}
        >
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
            className="rounded-md border border-border px-3 py-2 text-sm bg-background min-w-[120px] w-full"
          />
          {/* Suggestions Dropdown (below input) */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 mt-12 w-[250px] bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
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
          className="flex items-center px-3 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border ml-1 flex-shrink min-w-0"
        >
          {t("cashier.addNewClient", "Add New Client")}
          <UserPlus className="w-4 h-4 ml-2" />
        </button>
        {/* Discount Input */}
        <input
          placeholder={t("cashier.discount", "Discount")}
          className={`w-24 rounded-md border px-3 py-2 text-sm bg-background ml-1 flex-shrink min-w-0
            ${Number(draftDiscount) > cartTotal
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-border focus:border-primary focus:ring-primary/50'
            } focus:outline-none focus:ring-1 transition-all'`}
          type="number"
          value={draftDiscount}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) {
              setDraftDiscount(val);
            }
          }}
        />
        {/* Confirm Button */}
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm shadow border border-border ml-1 flex-shrink min-w-0 ${(Number(draftDiscount) > cartTotal || draftDiscount === "") ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          onClick={() => {
            // Validate discount before applying
            if (Number(draftDiscount) > cartTotal || draftDiscount === "") {
              return;
            } else {
              onDiscountChange(draftDiscount);
            }
          }}
          disabled={Number(draftDiscount) > cartTotal || draftDiscount === ""}
        >
          <CheckCircle className="w-5 h-5" />
          <span>{t("cashier.confirm", "Confirm")}</span>
        </button>
      </div>

      {/* === Row 2: Payment === */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-xl bg-blue-500 text-white px-5 py-3 text-base font-medium shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 disabled:bg-blue-300 disabled:text-white/70 disabled:cursor-not-allowed"
          onClick={() => {
            setShowPaymentModal(true);
          }}
          disabled={!clientName.trim()}
        >
          {t("cashier.addPayment", "Add Payment")}
        </button>
      </div>

      {/* === Row 3: Existing Confirm & Clear === */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onFinish}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
        >
          <CheckCircle className="w-6 h-6" />
          <span>{t("cashier.confirmSale", "Confirm Sale")}</span>
        </button>
        <button
          onClick={() => {
            setDraftDiscount("");
            onClear();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-destructive text-white font-semibold text-lg tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 border border-border"
        >
          <Trash2 className="w-6 h-6" />
          <span>{t("cashier.clearCart", "Clear Cart")}</span>
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
