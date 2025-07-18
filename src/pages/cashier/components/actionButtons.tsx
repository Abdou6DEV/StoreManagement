import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, Trash2, Users, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

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
}

export default function ActionButtons({
  clientName,
  setClientName,
  onAddClient,
  onClear,
  onFinish,
  setClientId,
}: Props) {
  const { t } = useTranslation();
  const [showPopup, setShowPopup] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddresse, setNewClientAddress] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.api.database.clients.getAll().then(setClientSuggestions);
  }, []);

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
          onClick={() => setShowPopup(true)}
          className="flex items-centered px-3 py-2 rounded-md bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition text-sm border border-border"
        >
          {t("cashier.addNewClient", "Add New Client")}
          <UserPlus className="w-4 h-4 ml-2" />
        </button>

        {/* Optional discount input */}
        <input
          placeholder={t("cashier.discount", "Discount (DA)")}
          className="w-36 rounded-md border border-border px-3 py-2 text-sm bg-background"
        />

        <button
          onClick={onFinish}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 border border-border"
        >
          <CheckCircle className="w-5 h-5" />
          {t("cashier.confirm", "Confirm")}
        </button>
      </div>

      {/* === Row 2: Credit / Versement === */}
      <div className="flex gap-3">
        <button className="flex-1 rounded-md bg-muted hover:bg-accent px-3 py-2 text-sm font-medium border border-border">
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
          onClick={onClear}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-destructive text-white font-semibold text-lg tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50 border border-border"
        >
          <Trash2 className="w-6 h-6" />
          <span>{t("cashier.clearCart", "Clear Cart")}</span>
        </button>
      </div>

      {/* === Popup Modal === */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-sm space-y-4">
            {/* Title Row with Icon */}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="text-lg font-semibold text-foreground">
                {t("cashier.addNewClient", "Add New Client")}
              </h2>
            </div>

            {/* Inputs */}
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder={t("cashier.clientName", "Client Name")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder={t("cashier.phoneOptional", "Phone Number (optional)")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientAddresse}
              onChange={(e) => setNewClientAddress(e.target.value)}
              placeholder={t("cashier.addressOptional", "Address (optional)")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />
            <input
              value={newClientNotes}
              onChange={(e) => setNewClientNotes(e.target.value)}
              placeholder={t("cashier.notesOptional", "Notes (optional)")}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
            />

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPopup(false)}
                className="px-3 py-2 text-sm bg-muted rounded-md hover:bg-muted/60 border border-border"
              >
                {t("cashier.cancel", "Cancel")}
              </button>
              <button
                onClick={() => {
                  if (newClientName.trim()) {
                    onAddClient(
                      newClientName.trim(),
                      newClientPhone.trim(),
                      newClientAddresse.trim(),
                      newClientNotes.trim(),
                    );
                    setShowPopup(false);
                    setNewClientName("");
                    setNewClientPhone("");
                    setNewClientAddress("");
                    setNewClientNotes("");
                  }
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 border border-border"
              >
                {t("cashier.addClient", "Add Client")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
