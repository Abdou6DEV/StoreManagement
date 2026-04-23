import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Loader2, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
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
import { DatePicker } from "../../../lib/components/datePicker";
import rendererLogger from "../../../lib/logger/rendererLogger";
import { cn } from "../../../lib/utils";

interface AddPaymentFormProps {
  openPanel: "add" | "addPayment" | "addSupplier" | null;
  setOpenPanel: React.Dispatch<
    React.SetStateAction<"add" | "addPayment" | "addSupplier" | null>
  >;
  onPaymentAdded: () => void;
  onClientAdded?: () => void; // New prop to refresh client list
  selectedClientId?: string;
  selectedClientName?: string;
}

const initialForm = {
  clientId: "",
  clientName: "",
  givenAmount: "",
  dueDate: "",
  type: "CREDIT" as "CREDIT" | "VERSEMENT",
  reason: "",
};

export default function AddPaymentForm({
  openPanel,
  setOpenPanel,
  onPaymentAdded,
  onClientAdded,
  selectedClientId,
  selectedClientName,
}: AddPaymentFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<
    Array<{ id: string; name: string; phone?: string }>
  >([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [reasonSuggestions, setReasonSuggestions] = useState<string[]>([]);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [filteredReasons, setFilteredReasons] = useState<string[]>([]);
  const [selectedReasonIndex, setSelectedReasonIndex] = useState(-1);

  useEffect(() => {
    if (openPanel !== "addPayment") return;
    if (form.type !== "CREDIT") return;
    window.api.database.payments
      .getReasonSuggestions()
      .then(setReasonSuggestions)
      .catch(() => setReasonSuggestions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPanel, form.type]);

  const handleReasonChange = (value: string) => {
    handleFormChange("reason", value);
    const q = value.toLowerCase().trim();
    const filtered = !q
      ? reasonSuggestions
      : reasonSuggestions.filter((r) => r.toLowerCase().includes(q));
    setFilteredReasons(filtered);
    setShowReasonDropdown(filtered.length > 0);
    setSelectedReasonIndex(-1);
  };

  const handleReasonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showReasonDropdown || filteredReasons.length === 0) return;
        e.preventDefault();
        setSelectedReasonIndex((prev) =>
          prev < filteredReasons.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        if (!showReasonDropdown || filteredReasons.length === 0) return;
        e.preventDefault();
        setSelectedReasonIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (showReasonDropdown && selectedReasonIndex >= 0) {
          e.preventDefault();
          const picked = filteredReasons[selectedReasonIndex];
          handleFormChange("reason", picked);
          setShowReasonDropdown(false);
          setSelectedReasonIndex(-1);
        } else {
          // Move forward in the form when user presses Enter with no selection.
          handleKeyDown(e as unknown as React.KeyboardEvent<HTMLInputElement>, "reason");
        }
        break;
      case "Escape":
        if (!showReasonDropdown) return;
        e.preventDefault();
        setShowReasonDropdown(false);
        setSelectedReasonIndex(-1);
        break;
    }
  };
  
  // Refs for keyboard navigation
  const amountRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize form with selected client if provided
  React.useEffect(() => {
    if (selectedClientId && selectedClientName) {
      setForm((prev) => ({
        ...prev,
        clientId: selectedClientId,
        clientName: selectedClientName,
      }));
    }
  }, [selectedClientId, selectedClientName]);


  // Function to refresh clients list
  const refreshClients = React.useCallback(async () => {
    try {
      const data = await window.api.database.clients.getAll();
      setClients(data);
    } catch (err) {
      rendererLogger.error("Failed to refresh clients", "AddPaymentForm", err);
    }
  }, []);

  // Refresh clients when the component mounts or when onClientAdded changes
  React.useEffect(() => {
    refreshClients();
  }, [refreshClients, onClientAdded]);

  const handleFormChange = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing
    if (value === "") {
      handleFormChange("givenAmount", "");
      return;
    }
    
    // Only allow numbers, decimal point, and minus sign
    if (!/^-?[\d.]*$/.test(value)) {
      return;
    }
    
    // Prevent multiple decimal points
    if ((value.match(/\./g) || []).length > 1) {
      return;
    }
    
    // Limit to 2 decimal places
    const parts = value.split('.');
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    // Convert to number and check if it's valid
    const numValue = parseFloat(value);
    
    // Check for valid number
    if (isNaN(numValue)) {
      return;
    }
    
    // Check for reasonable limits (max 999,999,999.99)
    if (Math.abs(numValue) > 999999999.99) {
      showToast(
        t("clients.amountTooLarge", "Amount is too large. Maximum allowed: 999,999,999.99"),
        "error"
      );
      return;
    }
    
    handleFormChange("givenAmount", value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      switch (currentField) {
        case "amount":
          if (form.type === "CREDIT") {
            reasonRef.current?.focus();
          } else {
            dueDateRef.current?.focus();
          }
          break;
        case "reason":
          dueDateRef.current?.focus();
          break;
        case "dueDate":
          submitButtonRef.current?.click();
          break;
      }
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.givenAmount || !form.dueDate) {
      showToast(
        t("clients.fillRequiredFields", "Please fill all required fields"),
        "error",
      );
      return;
    }

    // Validate amount
    const amount = parseFloat(form.givenAmount as string);
    if (isNaN(amount) || amount <= 0) {
      showToast(
        t("clients.invalidAmount", "Please enter a valid amount greater than 0"),
        "error",
      );
      return;
    }

    if (amount > 999999999.99) {
      showToast(
        t("clients.amountTooLarge", "Amount is too large. Maximum allowed: 999,999,999.99"),
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      if (form.type === "CREDIT") {
        if (!form.reason.trim()) {
          showToast(
            t("clients.creditReasonRequired", "Please enter a reason for this credit"),
            "error",
          );
          return;
        }
        // For CREDIT: Create a standalone payment without a sale
        // The amount typed is what we owe the client (remaining amount)
        await window.api.database.payments.create({
          clientId: form.clientId,
          givenAmount: 0, // Client paid 0, we owe them the full amount
          creditAmount: Number(form.givenAmount), // Store the credit amount
          reason: form.reason.trim(),
          dueDate: new Date(form.dueDate),
          type: "CREDIT",
        });
      } else {
        // For VERSEMENT: This doesn't make sense without a sale, so skip for now
        showToast(
          t("clients.versementRequiresSale", "Versement requires a sale"),
          "error",
        );
        return;
      }

      setForm(initialForm);
      onPaymentAdded();
      onClientAdded?.(); // Refresh clients list to update totals
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.paymentAdded",
        details: form.clientName ? `Client: ${form.clientName}, Credit amount: ${form.givenAmount}` : String(form.givenAmount),
      }).catch(() => {});
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

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.phone &&
          client.phone.toLowerCase().includes(clientSearch.toLowerCase())),
    )
    .slice(0, 100);


  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() =>
          setOpenPanel(openPanel === "addPayment" ? null : "addPayment")
        }
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
              <label>{t("clients.client", "Client")}</label>
              <Popover
                open={clientPopoverOpen}
                onOpenChange={(open) => {
                  setClientPopoverOpen(open);
                  if (open) setClientSearch(""); // Reset search when opening
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                    aria-label={t("clients.selectClient", "Select client")}
                  >
                    {form.clientName ||
                      t("clients.selectClient", "Select client")}
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 z-50">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandGroup>
                        <input
                          placeholder={t(
                            "clients.searchClients",
                            "Search clients...",
                          )}
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border-b focus:outline-none"
                        />
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id}
                            onSelect={() => {
                              handleFormChange("clientId", client.id);
                              handleFormChange("clientName", client.name);
                              setClientSearch("");
                              setClientPopoverOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{client.name}</span>
                              {client.phone && (
                                <span className="text-sm text-muted-foreground">
                                  {client.phone}
                                </span>
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
              <label>{t("clients.paymentType", "Payment Type")}</label>
              <Popover
                open={typePopoverOpen}
                onOpenChange={setTypePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-10"
                    aria-label={t(
                      "clients.selectPaymentType",
                      "Select payment type",
                    )}
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
                          onSelect={() => {
                            handleFormChange("type", "CREDIT");
                            setTypePopoverOpen(false);
                          }}
                        >
                          {t("clients.credits", "Credits")}
                        </CommandItem>
                        <CommandItem
                          value="VERSEMENT"
                          onSelect={() => {
                            handleFormChange("type", "VERSEMENT");
                            setTypePopoverOpen(false);
                          }}
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
              <label>
                {form.type === "CREDIT" 
                  ? t("clients.creditAmount", "Credit Amount") 
                  : t("clients.amount", "Amount")
                }
              </label>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder={
                  form.type === "CREDIT" 
                    ? t("clients.creditAmountPlaceholder", "Amount you owe client") 
                    : t("clients.amount", "Amount")
                }
                value={form.givenAmount}
                onChange={handleAmountChange}
                onKeyDown={(e) => handleKeyDown(e, "amount")}
                className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
                required
              />
            </Legend>

            {/* Reason (standalone credit only) */}
            {form.type === "CREDIT" && (
              <Legend>
                <label>{t("clients.creditReason", "Reason")}</label>
                <div className="relative">
                  <input
                    ref={reasonRef}
                    type="text"
                    placeholder={t("clients.creditReasonPlaceholder", "Why is this credit created?")}
                    value={form.reason}
                    onChange={(e) => handleReasonChange(e.target.value)}
                    onKeyDown={handleReasonKeyDown}
                    onFocus={() => {
                      // Show suggestions immediately on focus (like AddStockForm seller field).
                      setFilteredReasons(reasonSuggestions);
                      setShowReasonDropdown(reasonSuggestions.length > 0);
                      setSelectedReasonIndex(-1);
                    }}
                    onBlur={() => window.setTimeout(() => setShowReasonDropdown(false), 120)}
                    className="w-full px-4 h-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    required
                  />

                  {showReasonDropdown && filteredReasons.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
                      {filteredReasons.map((r, index) => (
                        <div
                          key={`${r}-${index}`}
                          className={cn(
                            "px-4 py-2 cursor-pointer",
                            index === selectedReasonIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50",
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleFormChange("reason", r);
                            setShowReasonDropdown(false);
                            setSelectedReasonIndex(-1);
                          }}
                        >
                          <span className="text-sm font-medium">{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Legend>
            )}

            {/* Due Date */}
            <Legend>
              <label>{t("clients.dueDate", "Due Date")}</label>
              <div
                ref={dueDateRef}
                onKeyDown={(e) => handleKeyDown(e, "dueDate")}
                tabIndex={0}
                className="focus:outline-none"
              >
                <DatePicker
                  value={form.dueDate}
                  onChange={(date) => handleFormChange("dueDate", date)}
                  placeholder={t("clients.dueDate", "Due Date")}
                  className="w-full h-10"
                />
              </div>
            </Legend>
          </div>
          <hr />
          <div>
            <Button
              ref={submitButtonRef}
              type="submit"
              disabled={
                loading ||
                !form.clientId ||
                !form.givenAmount ||
                !form.dueDate ||
                (form.type === "CREDIT" && !form.reason.trim())
              }
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
