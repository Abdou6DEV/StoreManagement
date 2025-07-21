import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Trash2, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import DiscountErrorModal from "./discountErrorModal";
import { enUS, fr, arDZ } from "date-fns/locale";
import type { Locale } from "date-fns/locale";
import type { CartItem } from "../../cashier";
import AddCreditModal from "./AddCreditModal";
import AddClientModal from "./AddClientModal";

// Define a type for client suggestions
interface ClientSuggestion {
  id: string;
  name: string;
  phone?: string;
}

interface Props {
  clientName: string;
  setClientName: (val: string) => void;
  onAddClient: (
    name: string,
    phone?: string,
    address?: string,
    notes?: string,
  ) => void;
  onClear: () => void;
  onFinish?: () => void;
  setClientId: (id: string | null) => void;
  discount: string;
  onDiscountChange: (val: string) => void;
  cartTotal: number;
  cart: CartItem[];
  paymentAmount: number;
  setPaymentAmount: (val: number) => void;
}

export default function ActionButtons({
  clientName,
  setClientName,
  onAddClient,
  onClear,
  onFinish,
  setClientId,
  discount,
  onDiscountChange,
  cartTotal,
  cart,
  paymentAmount,
  setPaymentAmount,
}: Props) {
  const { t, i18n } = useTranslation();
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [draftDiscount, setDraftDiscount] = useState(discount);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditClientName, setCreditClientName] = useState("");
  const [creditClientPhone, setCreditClientPhone] = useState("");
  const [modalPaymentAmount, setModalPaymentAmount] = useState(0);
  const [creditDate, setCreditDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Add state for AddClientModal
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [addClientName, setAddClientName] = useState("");
  const [addClientPhone, setAddClientPhone] = useState("");
  const [addClientAddress, setAddClientAddress] = useState("");
  const [addClientNotes, setAddClientNotes] = useState("");

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
    if (!match) setClientId(null);
  }, [clientName, clientSuggestions, setClientId]);

  // Helper to auto-fill client info if selected
  useEffect(() => {
    if (clientName && clientSuggestions.length > 0) {
      const match = clientSuggestions.find((c) => c.name === clientName);
      if (match) {
        setCreditClientName(match.name);
        setCreditClientPhone(match.phone || "");
      } else {
        setCreditClientName(clientName);
        setCreditClientPhone("");
      }
    } else {
      setCreditClientName("");
      setCreditClientPhone("");
    }
  }, [clientName, clientSuggestions, showCreditModal]);

  // Locale mapping for calendar
  const localeMap: Record<string, Locale> = {
    en: enUS,
    fr: fr,
    ar: arDZ,
  };
  const calendarLocale = localeMap[i18n.language] || enUS;

  return (
    <div className="flex flex-col gap-4">
      {/* === Row 1: Client Name + Add Client + Discount + Confirm === */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          ref={inputRef}
          value={clientName}
          onChange={(e) => {
            setClientName(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={t("cashier.customerName", "Customer name")}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-12 w-[250px] bg-card border border-border rounded shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.map((c) => (
              <div
                key={c.id}
                className="px-4 py-2 cursor-pointer hover:bg-muted text-sm"
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
        <button
          onClick={() => setShowAddClientModal(true)}
          className="flex items-centered px-3 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border"
        >
          {t("cashier.addNewClient", "Add New Client")}
          <UserPlus className="w-4 h-4 ml-2" />
        </button>

        {/* Optional discount input */}
        <div className="flex items-center gap-2">
          <input
            placeholder={t("cashier.discount", "Discount")}
            className="w-36 rounded-md border border-border px-3 py-2 text-sm bg-background"
            type="number"
            value={draftDiscount}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*$/.test(val)) {
                setDraftDiscount(val);
              }
            }}
          />
        </div>

        <button
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 border border-border"
          onClick={() => {
            // Validate discount before applying
            if (Number(draftDiscount) > cartTotal) {
              setDiscountError(t("cashier.discountError", "Discount cannot exceed total amount"));
              return;
            } else {
              setDiscountError(null);
              onDiscountChange(draftDiscount);
            }
          }}
        >
          <CheckCircle className="w-5 h-5" />
          <span>{t("cashier.confirm", "Confirm")}</span>
        </button>
      </div>

      {/* === Row 2: Credit / Versement === */}
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-md bg-muted hover:bg-accent px-3 py-2 text-sm font-medium border border-border"
          onClick={() => setShowCreditModal(true)}
        >
          {t("cashier.addCredit", "Add Credit")}
        </button>
        <button className="flex-1 rounded-md bg-muted hover:bg-accent px-3 py-2 text-sm font-medium border border-border">
          {t("cashier.addVersement", "Add Versement")}
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

      {/* === Add Client Modal === */}
      <AddClientModal
        open={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        clientName={addClientName}
        setClientName={setAddClientName}
        clientPhone={addClientPhone}
        setClientPhone={setAddClientPhone}
        clientAddress={addClientAddress}
        setClientAddress={setAddClientAddress}
        clientNotes={addClientNotes}
        setClientNotes={setAddClientNotes}
        t={t as typeof t}
        onConfirm={async () => {
          if (addClientName.trim()) {
            await onAddClient(
              addClientName.trim(),
              addClientPhone.trim(),
              addClientAddress.trim(),
              addClientNotes.trim(),
            );
            setShowAddClientModal(false);
            setAddClientName("");
            setAddClientPhone("");
            setAddClientAddress("");
            setAddClientNotes("");
            refreshClientSuggestions();
          }
        }}
      />

      {/* === Add Credit Modal === */}
      <AddCreditModal
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        clientName={creditClientName}
        setClientName={setCreditClientName}
        clientPhone={creditClientPhone}
        setClientPhone={setCreditClientPhone}
        paymentAmount={modalPaymentAmount}
        setPaymentAmount={setModalPaymentAmount}
        creditDate={creditDate}
        setCreditDate={setCreditDate}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        cart={cart}
        cartTotal={cartTotal}
        t={t as typeof t}
        calendarLocale={calendarLocale}
        onConfirm={() => {
          setPaymentAmount(modalPaymentAmount);
          setShowCreditModal(false);
        }}
      />

      <DiscountErrorModal
        open={!!discountError}
        message={discountError || ""}
        onClose={() => setDiscountError(null)}
      />
    </div>
  );
}
