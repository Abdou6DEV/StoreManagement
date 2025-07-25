import { useRef, useEffect } from "react";
import { Users } from "lucide-react";
import { Button } from "../../../lib/components/button";
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
  useEffect(() => {
    if (open && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${!open ? "hidden" : ""}`}
    >
      <div className="flex-1 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h2 className="text-lg font-semibold text-foreground">
            {t("cashier.addNewClient", "Add New Client")}
          </h2>
        </div>
        <input
          ref={nameInputRef}
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder={t("cashier.clientName", "Client Name")}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder={t("cashier.phoneOptional", "Phone Number (optional)")}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        <input
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder={t("cashier.addressOptional", "Address (optional)")}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        <input
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
          placeholder={t("cashier.notesOptional", "Notes (optional)")}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("cashier.cancel", "Cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!clientName.trim()}>
            {t("cashier.addClient", "Add Client")}
          </Button>
        </div>
      </div>
    </div>
  );
}
