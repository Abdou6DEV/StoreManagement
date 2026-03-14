import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";

interface AddSupplierFormProps {
  openPanel: "add" | "addPayment" | "addSupplier" | null;
  setOpenPanel: React.Dispatch<
    React.SetStateAction<"add" | "addPayment" | "addSupplier" | null>
  >;
  onSupplierAdded: () => void;
}

const initialForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function AddSupplierForm({
  openPanel,
  setOpenPanel,
  onSupplierAdded,
}: AddSupplierFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      switch (currentField) {
        case "name":
          phoneRef.current?.focus();
          break;
        case "phone":
          emailRef.current?.focus();
          break;
        case "email":
          addressRef.current?.focus();
          break;
        case "address":
          notesRef.current?.focus();
          break;
        case "notes":
          submitButtonRef.current?.click();
          break;
      }
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await window.api.database.sellers.create({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes,
      });
      setForm(initialForm);
      onSupplierAdded();
      const lines = [`Supplier: ${form.name}`];
      if (form.phone?.trim()) lines.push(`Phone: ${form.phone.trim()}`);
      if (form.email?.trim()) lines.push(`Email: ${form.email.trim()}`);
      if (form.address?.trim()) lines.push(`Address: ${form.address.trim()}`);
      if (form.notes?.trim()) lines.push(`Notes: ${form.notes.trim()}`);
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.supplierAdded",
        details: lines.join("\n"),
      }).catch(() => {});
      showToast(
        t("suppliers.addSuccess", "Supplier added successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("suppliers.addError", "Failed to add supplier"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() =>
          setOpenPanel(openPanel === "addSupplier" ? null : "addSupplier")
        }
        aria-expanded={openPanel === "addSupplier"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Users className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t("suppliers.addTitle", "Add Supplier")}
          </h2>
        </div>
        {openPanel === "addSupplier" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "addSupplier" && (
        <form onSubmit={handleAddSupplier} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Legend>
              <label>{t("suppliers.name", "Name")}</label>
              <input
                ref={nameRef}
                type="text"
                placeholder={t("suppliers.name", "Name")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "name")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
                required
              />
            </Legend>
            <Legend>
              <label>{t("suppliers.phone", "Phone")}</label>
              <input
                ref={phoneRef}
                type="text"
                placeholder={t("suppliers.phone", "Phone")}
                value={form.phone}
                onChange={(e) => handleFormChange("phone", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "phone")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("suppliers.email", "Email")}</label>
              <input
                ref={emailRef}
                type="email"
                placeholder={t("suppliers.email", "Email")}
                value={form.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "email")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("suppliers.address", "Address")}</label>
              <input
                ref={addressRef}
                type="text"
                placeholder={t("suppliers.address", "Address")}
                value={form.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "address")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("suppliers.notes", "Notes")}</label>
              <input
                ref={notesRef}
                type="text"
                placeholder={t("suppliers.notes", "Notes")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "notes")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
          </div>
          <hr />
          <div>
            <Button
              ref={submitButtonRef}
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("suppliers.adding", "Adding...")}
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  {t("suppliers.addButton", "Add Supplier")}
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}
