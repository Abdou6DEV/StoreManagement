import { useRef, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { FormModal } from "../../../lib/components/modal";
import type { TFunction } from "i18next";

export default function AddClientModal({
  open,
  onClose,
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  clientAddress,
  setClientAddress,
  clientNotes,
  setClientNotes,
  t,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  clientName: string;
  setClientName: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  clientAddress: string;
  setClientAddress: (val: string) => void;
  clientNotes: string;
  setClientNotes: (val: string) => void;
  t: TFunction;
  onConfirm: () => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);

  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
    // Reset warning when modal closes
    if (!open) {
      setNameExists(false);
    }
  }, [open]);

  // Check for duplicate name with debounce
  useEffect(() => {
    if (!clientName.trim()) {
      setNameExists(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingName(true);
      try {
        const existingClient = await window.api.database.clients.findByName(clientName.trim());
        setNameExists(existingClient !== null);
      } catch (error) {
        console.error("Error checking client name:", error);
        // On error, don't block submission but show warning
        // User can still proceed if they want
        setNameExists(false);
      } finally {
        setCheckingName(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [clientName]);

  // Keyboard navigation between fields
  const handleFieldKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Navigate to next field or submit
      switch (currentField) {
        case "name":
          phoneInputRef.current?.focus();
          break;
        case "phone":
          addressInputRef.current?.focus();
          break;
        case "address":
          notesInputRef.current?.focus();
          break;
        case "notes":
          // Submit form if on last field (only if no duplicate and not checking)
          if (clientName.trim() && !nameExists && !checkingName) {
            handleSubmit(e as React.FormEvent);
          }
          break;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent submission if name is empty, duplicate exists, or check is in progress
    if (!clientName.trim() || nameExists || checkingName) {
      return;
    }
    onConfirm();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t("cashier.addNewClient", "Add New Client")}
      subtitle={t(
        "cashier.addClientDesc",
        "Enter client information to add them to your database",
      )}
      icon={<Users className="w-5 h-5 text-blue-600" />}
      size="lg"
      className="max-w-lg"
      onSubmit={handleSubmit}
      submitText={t("cashier.addClient", "Add Client")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={!clientName.trim() || nameExists || checkingName}
    >
      <div className="space-y-4 -mx-1 px-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.clientName", "Client Name")} *
          </label>
          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("cashier.enterClientName", "Enter client name")}
              onKeyDown={(e) => handleFieldKeyDown(e, "name")}
              className={`w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground focus:border-primary/30 transition-all pr-10 ${
                nameExists ? "border-red-500 focus:border-red-500" : "border-border"
              }`}
              required
              aria-invalid={nameExists}
              aria-describedby={nameExists || checkingName ? "name-status" : undefined}
            />
            {checkingName && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <div id="name-status" className="mt-1 min-h-[16px]">
            {checkingName && (
              <p className="text-xs text-muted-foreground">
                {t("cashier.checkingName", "Checking name...")}
              </p>
            )}
            {nameExists && !checkingName && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {t("cashier.clientNameExists", "A client with this name already exists")}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.phoneNumber", "Phone Number")}
          </label>
          <input
            ref={phoneInputRef}
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder={t("cashier.phoneOptional", "Phone Number (optional)")}
            onKeyDown={(e) => handleFieldKeyDown(e, "phone")}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.address", "Address")}
          </label>
          <input
            ref={addressInputRef}
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder={t("cashier.addressOptional", "Address (optional)")}
            onKeyDown={(e) => handleFieldKeyDown(e, "address")}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:border-primary/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.notes", "Notes")}
          </label>
          <textarea
            ref={notesInputRef}
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder={t("cashier.notesOptional", "Notes (optional)")}
            onKeyDown={(e) => {
              // Shift+Enter creates a new line (default behavior)
              // Enter submits (handled by handleFieldKeyDown)
              if (e.key === "Enter" && !e.shiftKey) {
                handleFieldKeyDown(e, "notes");
              }
            }}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground resize-none focus:border-primary/30 transition-all"
            rows={3}
          />
        </div>
      </div>
    </FormModal>
  );
}
