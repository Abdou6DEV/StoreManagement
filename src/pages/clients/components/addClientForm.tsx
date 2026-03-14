import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";

interface AddClientFormProps {
  openPanel: "add" | "addPayment" | "addSupplier" | null;
  setOpenPanel: React.Dispatch<
    React.SetStateAction<"add" | "addPayment" | "addSupplier" | null>
  >;
  onClientAdded: () => void;
}

const initialForm = {
  name: "",
  phone: "",
  address: "",
  notes: "",
};

export default function AddClientForm({
  openPanel,
  setOpenPanel,
  onClientAdded,
}: AddClientFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [nameExists, setNameExists] = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  
  // Refs for keyboard navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Check for duplicate name with debounce
  useEffect(() => {
    if (!form.name.trim()) {
      setNameExists(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingName(true);
      try {
        const existingClient = await window.api.database.clients.findByName(form.name.trim());
        setNameExists(existingClient !== null);
      } catch (error) {
        console.error("Error checking client name:", error);
        setNameExists(false);
      } finally {
        setCheckingName(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [form.name]);

  // Reset warning when panel closes
  useEffect(() => {
    if (openPanel !== "add") {
      setNameExists(false);
    }
  }, [openPanel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      switch (currentField) {
        case "name":
          phoneRef.current?.focus();
          break;
        case "phone":
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

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await window.api.database.clients.create({
        name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      });
      setForm(initialForm);
      onClientAdded();
      const lines = [`Client: ${form.name}`];
      if (form.phone?.trim()) lines.push(`Phone: ${form.phone.trim()}`);
      if (form.address?.trim()) lines.push(`Address: ${form.address.trim()}`);
      if (form.notes?.trim()) lines.push(`Notes: ${form.notes.trim()}`);
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.clientAdded",
        details: lines.join("\n"),
      }).catch(() => {});
      showToast(
        t("clients.addSuccess", "Client added successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("clients.addError", "Failed to add client"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "add" ? null : "add")}
        aria-expanded={openPanel === "add"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Users className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t("clients.addTitle", "Add Client")}
          </h2>
        </div>
        {openPanel === "add" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "add" && (
        <form onSubmit={handleAddClient} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Legend>
              <label>{t("clients.name", "Name")}</label>
              <input
                ref={nameRef}
                type="text"
                placeholder={t("clients.name", "Name")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "name")}
                className={`w-full px-4 h-10 rounded-lg border bg-card text-sm focus:outline-none focus:ring-1 transition-all ${
                  nameExists 
                    ? "border-red-500 focus:ring-red-500/50 focus:border-red-500" 
                    : "border-border focus:ring-red-500/50 focus:border-red-500"
                }`}
                required
              />
              {nameExists && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {t("clients.clientNameExists", "A client with this name already exists")}
                </p>
              )}
            </Legend>
            <Legend>
              <label>{t("clients.phone", "Phone")}</label>
              <input
                ref={phoneRef}
                type="text"
                placeholder={t("clients.phone", "Phone")}
                value={form.phone}
                onChange={(e) => handleFormChange("phone", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "phone")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("clients.address", "Address")}</label>
              <input
                ref={addressRef}
                type="text"
                placeholder={t("clients.address", "Address")}
                value={form.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "address")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("clients.notes", "Notes")}</label>
              <input
                ref={notesRef}
                type="text"
                placeholder={t("clients.notes", "Notes")}
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
                  {t("clients.adding", "Adding...")}
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  {t("clients.addButton", "Add Client")}
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
