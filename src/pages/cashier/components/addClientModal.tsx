import { useRef, useEffect } from "react";
import { Users } from "lucide-react";
import { FormModal } from "../../../lib/components/Modal";
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
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName.trim()) {
      onConfirm();
    }
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
      size="sm"
      className="max-w-sm"
      onSubmit={handleSubmit}
      submitText={t("cashier.addClient", "Add Client")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={!clientName.trim()}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.clientName", "Client Name")} *
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t("cashier.enterClientName", "Enter client name")}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.phoneNumber", "Phone Number")}
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder={t("cashier.phoneOptional", "Phone Number (optional)")}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.address", "Address")}
          </label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder={t("cashier.addressOptional", "Address (optional)")}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            {t("cashier.notes", "Notes")}
          </label>
          <textarea
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            placeholder={t("cashier.notesOptional", "Notes (optional)")}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            rows={3}
          />
        </div>
      </div>
    </FormModal>
  );
}
