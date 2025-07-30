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
import { useToast } from "../../../lib/contexts/toastContext";
import { Tooltip } from "../../../lib/components/tooltip";

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
  setPaymentAmount,
  paymentType,
  setPaymentType,
  paymentDate,
  setPaymentDate,
  onConfirmWithReceipt,
}: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
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
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100);
  };

  useEffect(() => {
    const match = clientSuggestions.find((c) => c.name === clientName);
    if (!match) {
      setClientId(null);
      setSelectedClientId(null);
    }
  }, [clientName, clientSuggestions, setClientId]);

  useEffect(() => {
    if (clientName && clientSuggestions.length > 0) {
      const match = clientSuggestions.find((c) => c.name === clientName);
      if (match) {
        setPaymentClientPhone(match.phone || "");
      } else {
        setPaymentClientPhone("");
      }
    } else {
      setPaymentClientPhone("");
    }
  }, [clientName, clientSuggestions, showPaymentModal]);

  useEffect(() => {
    setPaymentDateLocal(paymentDate);
  }, [paymentDate]);

  useEffect(() => {
    setPaymentDate(paymentDateLocal);
  }, [paymentDateLocal, setPaymentDate]);

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
      refreshClientSuggestions();
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
              className="flex-1 flex items-center justify-center px-2 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border min-w-0 w-full"
            >
              <Clock
                className={`w-4 h-4 mr-1 ml-1 flex-shrink-0 ${i18n.language === "ar" ? " scale-x-[-1]" : ""}`}
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
              className="flex-1 flex items-center justify-center px-2 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border min-w-0 w-full"
            >
              <UserPlus
                className={`w-4 h-4 mr-1 ml-1 ${i18n.language === "ar" ? " scale-x-[-1]" : ""}`}
              />
              <span className="hidden sm:inline whitespace-nowrap truncate max-w-[150px]">
                {t("cashier.addNewClient", "Add New Client")}
              </span>
            </button>
          </Tooltip>
        )}
        <input
          placeholder={t("cashier.discount", "Discount")}
          className={`flex-1 w-28 rounded-md border px-3 py-2 text-sm bg-background border-border focus:border-primary focus:ring-primary/50 focus:outline-none focus:ring-1 transition-all min-w-0 ${Number(draftDiscount) > cartTotal ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
          type="number"
          value={draftDiscount}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) {
              setDraftDiscount(val);
              if (val === "") {
                onDiscountChange("0");
              } else if (Number(val) <= cartTotal) {
                onDiscountChange(val);
              }
            }
          }}
        />
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
            className="flex-1 flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-base font-medium shadow-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition duration-150 disabled:bg-primary/50 disabled:text-primary-foreground/70 disabled:cursor-not-allowed min-w-0 w-full"
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
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
        >
          <CheckCircle className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.confirmSale", "Confirm Sale")}
          </span>
        </button>
        <button
          onClick={() => {
            console.log("Receipt button clicked", {
              cart,
              onConfirmWithReceipt: !!onConfirmWithReceipt,
            });
            onConfirmWithReceipt?.();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-0 w-full"
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
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-destructive text-white font-semibold text-base tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 min-w-0 w-full"
        >
          <Trash2 className="w-6 h-6" />
          <span className="hidden sm:inline whitespace-nowrap">
            {t("cashier.clearCart", "Clear Cart")}
          </span>
        </button>
        <button
          onClick={() => setShowCalculatorModal(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500 text-white text-base font-medium shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 disabled:bg-blue-300 disabled:text-white/70 disabled:cursor-not-allowed max-w-10 w-full"
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
          client={clientSuggestions.find((c) => c.id === selectedClientId)}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
