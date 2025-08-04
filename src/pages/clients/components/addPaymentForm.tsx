import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Loader2, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../../lib/contexts/toastContext";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";

interface AddPaymentFormProps {
  openPanel: "add" | "addPayment" | "addSupplier" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | "addPayment" | "addSupplier" | null>>;
  onPaymentAdded: () => void;
  selectedClientId?: string;
  selectedClientName?: string;
}

const initialForm = {
  clientId: "",
  clientName: "",
  givenAmount: "",
  dueDate: "",
  type: "CREDIT" as "CREDIT" | "VERSEMENT",
};

export default function AddPaymentForm({
  openPanel,
  setOpenPanel,
  onPaymentAdded,
  selectedClientId,
  selectedClientName,
}: AddPaymentFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [clientSearch, setClientSearch] = useState("");

  // Initialize form with selected client if provided
  React.useEffect(() => {
    if (selectedClientId && selectedClientName) {
      setForm(prev => ({
        ...prev,
        clientId: selectedClientId,
        clientName: selectedClientName,
      }));
    }
  }, [selectedClientId, selectedClientName]);

  // Load clients for dropdown
  React.useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await window.api.database.clients.getAll();
        setClients(data);
      } catch (err) {
        console.error("Failed to load clients:", err);
      }
    };
    loadClients();
  }, []);

  const handleFormChange = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.givenAmount || !form.dueDate) {
      showToast(t("clients.fillRequiredFields", "Please fill all required fields"), "error");
      return;
    }

    setLoading(true);
    try {
      // Create payment without a sale
      await window.api.database.payments.create({
        clientId: form.clientId,
        givenAmount: Number(form.givenAmount),
        dueDate: new Date(form.dueDate),
        type: form.type,
      });

      setForm(initialForm);
      onPaymentAdded();
      showToast(
        t("clients.paymentAddSuccess", "Payment added successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("clients.paymentAddError", "Failed to add payment"), "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (client.phone && client.phone.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "addPayment" ? null : "addPayment")}
        aria-expanded={openPanel === "addPayment"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <CreditCard className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t("clients.addPaymentTitle", "Add Payment")}
          </h2>
        </div>
        {openPanel === "addPayment" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "addPayment" && (
        <form onSubmit={handleAddPayment} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Client Selection */}
            <Legend>
              <label>{t("clients.client", "Client")} *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                    aria-label={t("clients.selectClient", "Select client")}
                  >
                    {form.clientName || t("clients.selectClient", "Select client")}
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 z-50">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandGroup>
                        <input
                          placeholder={t("clients.searchClients", "Search clients...")}
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border-b border-border focus:outline-none focus:ring-1 focus:ring-red-500/50"
                        />
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => {
                              handleFormChange("clientId", client.id);
                              handleFormChange("clientName", client.name);
                              setClientSearch("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{client.name}</span>
                              {client.phone && (
                                <span className="text-sm text-muted-foreground">{client.phone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Legend>

            {/* Payment Type */}
            <Legend>
              <label>{t("clients.paymentType", "Payment Type")} *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                    aria-label={t("clients.selectPaymentType", "Select payment type")}
                  >
                    {form.type === "CREDIT" 
                      ? t("clients.credits", "Credits") 
                      : t("clients.versements", "Versements")}
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 z-50">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          value="CREDIT"
                          onSelect={() => handleFormChange("type", "CREDIT")}
                        >
                          {t("clients.credits", "Credits")}
                        </CommandItem>
                        <CommandItem
                          value="VERSEMENT"
                          onSelect={() => handleFormChange("type", "VERSEMENT")}
                        >
                          {t("clients.versements", "Versements")}
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Legend>

            {/* Amount */}
            <Legend>
              <label>{t("clients.amount", "Amount")} *</label>
              <input
                type="number"
                placeholder={t("clients.amount", "Amount")}
                value={form.givenAmount}
                onChange={(e) => handleFormChange("givenAmount", e.target.value)}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
                required
                min="0"
                step="0.01"
              />
            </Legend>

            {/* Due Date */}
            <Legend>
              <label>{t("clients.dueDate", "Due Date")} *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleFormChange("dueDate", e.target.value)}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
                required
              />
            </Legend>

            
          </div>
          <hr />
          <div>
            <Button
              type="submit"
              disabled={loading || !form.clientId || !form.givenAmount || !form.dueDate}
              className="bg-red-600 hover:bg-red-700 text-white h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("clients.addingPayment", "Adding...")}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  {t("clients.addPaymentButton", "Add Payment")}
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