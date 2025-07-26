import { useState, useEffect, useRef } from "react";
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
import PaymentsModal from "../../clients/components/paymentsModal";

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
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

  const filteredSuggestions =
    clientName.length > 0
      ? clientSuggestions.filter((c) =>
          c.name.toLowerCase().includes(clientName.toLowerCase()),
        )
      : [];

  const handleSuggestionClick = (name: string, id: string) => {
    setClientName(name);
    setClientId(id);
    setSelectedClientId(id);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredSuggestions.length > 0) {
      const firstSuggestion = filteredSuggestions[0];
      handleSuggestionClick(firstSuggestion.name, firstSuggestion.id);
    }
  };

  const handleAddClient = async () => {
    if (!paymentClientName.trim()) return;

    try {
      const newClient = await window.api.database.clients.create({
        name: paymentClientName,
        phone: paymentClientPhone || undefined,
        address: clientAddress || undefined,
        notes: clientNotes || undefined,
      });

      setClientName(newClient.name);
      setClientId(newClient.id);
      setSelectedClientId(newClient.id);
      setShowAddClientModal(false);
      setPaymentClientName("");
      setPaymentClientPhone("");
      setClientAddress("");
      setClientNotes("");
      refreshClientSuggestions();
    } catch (error) {
      console.error("Failed to create client:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border-t border-border">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-muted-foreground">
            {t("cashier.client", "Client")}
          </label>
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              setClientId(null);
              setSelectedClientId(null);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={t("cashier.clientPlaceholder", "Enter client name...")}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSuggestionClick(client.name, client.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <div className="font-medium">{client.name}</div>
                  {client.phone && (
                    <div className="text-sm text-muted-foreground">
                      {client.phone}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedClientId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition"
            >
              <Clock className="w-3 h-3" />
              {t("cashier.viewHistory", "View History")}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("cashier.discount", "Discount")}
          </span>
        </div>
        <input
          type="number"
          value={draftDiscount}
          onChange={(e) => setDraftDiscount(e.target.value)}
          onBlur={() => onDiscountChange(draftDiscount)}
          placeholder="0"
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">
            {t("cashier.total", "Total")}
          </span>
          <span className="text-lg font-bold">
            {cartTotal - parseFloat(draftDiscount || "0")} DA
          </span>
        </div>
        <button
          onClick={() => {
            setShowPaymentModal(true);
          }}
          disabled={!clientName.trim()}
        >
          <span className="whitespace-nowrap">
            {t("cashier.addPayment", "Add Payment")}
          </span>
        </button>
      </div>
      <div className="flex flex-row gap-2 w-full">
        <button
          onClick={onFinish}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-blue-500 bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.confirmSale", "Confirm Sale")}
          </span>
        </button>
        <button
          onClick={() => {
            console.log("Receipt button clicked", { cart, onConfirmWithReceipt: !!onConfirmWithReceipt });
            onConfirmWithReceipt?.();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-blue-500 bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0"
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
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-blue-500 bg-destructive text-white font-semibold text-base tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 min-w-0"
        >
          <Trash2 className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.clearCart", "Clear Cart")}
          </span>
        </button>
        <button
          onClick={() => setShowCalculatorModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-blue-500 bg-blue-500 text-white text-base font-medium shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 disabled:bg-blue-300 disabled:text-white/70 disabled:cursor-not-allowed max-w-10"
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
        <PaymentsModal
          client={clientSuggestions.find((c) => c.id === selectedClientId)!}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
