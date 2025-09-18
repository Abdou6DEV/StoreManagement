import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, FileText, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";
import { useToast } from "../../../lib/contexts/toastContext";
import { cn } from "../../../lib/utils";

interface Bill {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  amount: number;
  nextBillDate: Date;
  duration: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AddBillFormProps {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
  editingBill?: Bill | null;
  onBillAdded?: () => void;
  onBillUpdated?: () => void;
}

const initialForm = {
  title: "",
  description: "",
  type: "",
  amount: "",
  duration: "NO_NEXT",
  notes: "",
};

const getDurationOptions = (t: any) => [
  { value: "NO_NEXT", label: t("bills.noNextBill", "No next bill") },
  { value: "1_MONTH", label: t("bills.oneMonth", "1 month") },
  { value: "2_MONTHS", label: t("bills.twoMonths", "2 months") },
  { value: "3_MONTHS", label: t("bills.threeMonths", "3 months") },
  { value: "4_MONTHS", label: t("bills.fourMonths", "4 months") },
  { value: "5_MONTHS", label: t("bills.fiveMonths", "5 months") },
  { value: "6_MONTHS", label: t("bills.sixMonths", "6 months") },
  { value: "7_MONTHS", label: t("bills.sevenMonths", "7 months") },
  { value: "8_MONTHS", label: t("bills.eightMonths", "8 months") },
  { value: "9_MONTHS", label: t("bills.nineMonths", "9 months") },
  { value: "10_MONTHS", label: t("bills.tenMonths", "10 months") },
  { value: "11_MONTHS", label: t("bills.elevenMonths", "11 months") },
  { value: "ANNUALLY", label: t("bills.annually", "Annually") },
];

// Calculate next bill date based on duration
const calculateNextBillDate = (duration: string): Date => {
  const today = new Date();
  
  switch (duration) {
    case "NO_NEXT":
      return today; // No next bill
    case "1_MONTH":
      return new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    case "2_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
    case "3_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    case "4_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 4, today.getDate());
    case "5_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 5, today.getDate());
    case "6_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
    case "7_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 7, today.getDate());
    case "8_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 8, today.getDate());
    case "9_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 9, today.getDate());
    case "10_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 10, today.getDate());
    case "11_MONTHS":
      return new Date(today.getFullYear(), today.getMonth() + 11, today.getDate());
    case "ANNUALLY":
      return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    default:
      return today;
  }
};

export default function AddBillForm({
  openPanel,
  setOpenPanel,
  editingBill,
  onBillAdded,
  onBillUpdated,
}: AddBillFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [billTypes, setBillTypes] = useState<string[]>([]);
  const [billTitles, setBillTitles] = useState<{ title: string; type: string; amount: number; duration: string }[]>([]);
  const [isExistingBill, setIsExistingBill] = useState(false);
  
  // Enhanced dropdown states
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [filteredTitles, setFilteredTitles] = useState<{ title: string; type: string; amount: number; duration: string }[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<string[]>([]);
  const [titleSearch, setTitleSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(-1);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(-1);
  
  // Refs for dropdown management
  const titleInputRef = useRef<HTMLInputElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  
  const durationOptions = getDurationOptions(t);

  useEffect(() => {
    if (editingBill) {
      setForm({
        title: editingBill.title,
        description: editingBill.description || "",
        type: editingBill.type,
        amount: (editingBill.amount / 100) % 1 === 0 
          ? (editingBill.amount / 100).toFixed(0) 
          : (editingBill.amount / 100).toFixed(2), // Convert from centimes to DA
        duration: editingBill.duration,
        notes: editingBill.notes || "",
      });
      setIsExistingBill(true);
    } else {
      setForm(initialForm);
      setIsExistingBill(false);
    }
  }, [editingBill, openPanel]);

  useEffect(() => {
    if (openPanel) {
      loadBillData();
    }
  }, [openPanel]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is on a dropdown item (don't close if clicking on dropdown items)
      if (
        target.closest("[data-title-dropdown]") ||
        target.closest("[data-type-dropdown]")
      ) {
        return;
      }
      
      // Close all dropdowns if clicking anywhere else
      setShowTitleDropdown(false);
      setShowTypeDropdown(false);
      setSelectedTitleIndex(-1);
      setSelectedTypeIndex(-1);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadBillData = async () => {
    try {
      const [types, titles] = await Promise.all([
        window.api.database.bills.getBillTypes(),
        window.api.database.bills.getBillTitles()
      ]);
      setBillTypes(types);
      setBillTitles(titles);
    } catch (error) {
      console.error("Error loading bill data:", error);
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Enhanced title search with filtering
  const handleTitleSearch = (value: string) => {
    setForm((prev) => ({ ...prev, title: value }));
    setTitleSearch(value);
    
    if (value.trim()) {
      const filtered = billTitles.filter((bill) =>
        bill.title.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTitles(filtered);
      setShowTitleDropdown(true);
      setSelectedTitleIndex(-1);
    } else {
      setFilteredTitles([]);
      setShowTitleDropdown(false);
      setSelectedTitleIndex(-1);
    }
  };

  // Enhanced type search with filtering
  const handleTypeSearch = (value: string) => {
    setForm((prev) => ({ ...prev, type: value }));
    setTypeSearch(value);
    
    if (value.trim()) {
      const filtered = billTypes.filter((type) =>
        type.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTypes(filtered);
      setShowTypeDropdown(true);
      setSelectedTypeIndex(-1);
    } else {
      setFilteredTypes([]);
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
    }
  };


  // Keyboard navigation for title dropdown
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showTitleDropdown || filteredTitles.length === 0) return;
        e.preventDefault();
        setSelectedTitleIndex(prev => 
          prev < filteredTitles.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showTitleDropdown || filteredTitles.length === 0) return;
        e.preventDefault();
        setSelectedTitleIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showTitleDropdown && selectedTitleIndex >= 0 && selectedTitleIndex < filteredTitles.length) {
          selectTitle(filteredTitles[selectedTitleIndex]);
        }
        break;
      case "Escape":
        setShowTitleDropdown(false);
        setSelectedTitleIndex(-1);
        break;
    }
  };

  // Keyboard navigation for type dropdown
  const handleTypeKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => 
          prev < filteredTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showTypeDropdown && selectedTypeIndex >= 0 && selectedTypeIndex < filteredTypes.length) {
          selectType(filteredTypes[selectedTypeIndex]);
        }
        break;
      case "Escape":
        setShowTypeDropdown(false);
        setSelectedTypeIndex(-1);
        break;
    }
  };


  // Select title and pre-fill form
  const selectTitle = async (bill: { title: string; type: string; amount: number; duration: string }) => {
    setForm(prev => ({
      ...prev,
      title: bill.title,
      type: bill.type,
      amount: (bill.amount / 100) % 1 === 0 
        ? (bill.amount / 100).toFixed(0) 
        : (bill.amount / 100).toFixed(2),
      duration: bill.duration,
    }));
    setShowTitleDropdown(false);
    setSelectedTitleIndex(-1);
    setIsExistingBill(true);
    
    // Focus on amount field after selection
    setTimeout(() => {
      const amountInput = document.querySelector('[data-field="bill-amount"]') as HTMLInputElement;
      if (amountInput) {
        amountInput.focus();
      }
    }, 100);
  };

  // Select type
  const selectType = (type: string) => {
    setForm(prev => ({ ...prev, type }));
    setShowTypeDropdown(false);
    setSelectedTypeIndex(-1);
  };


  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBill) {
        // Update existing bill
        const nextBillDate = calculateNextBillDate(form.duration);
        
        const billData = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          type: form.type.trim(),
          amount: Math.round(parseFloat(form.amount) * 100), // Convert DA to centimes
          nextBillDate,
          duration: form.duration,
          notes: form.notes.trim() || undefined,
        };

        await window.api.database.bills.update(editingBill.id, billData);
        onBillUpdated?.();
        showToast(t("bills.billUpdatedSuccessfully", "Bill updated successfully"), "success");
      } else if (isExistingBill) {
        // Record payment for existing bill
        const existingBill = await window.api.database.bills.getBillByTitle(form.title.trim());
        if (existingBill) {
          await window.api.database.bills.recordPayment(
            existingBill.id, 
            Math.round(parseFloat(form.amount) * 100),
            form.notes.trim() || undefined
          );
          onBillAdded?.();
          showToast(t("bills.paymentRecordedSuccessfully", "Payment recorded successfully"), "success");
        }
      } else {
        // Create new bill
        const nextBillDate = calculateNextBillDate(form.duration);
        
        const billData = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          type: form.type.trim(),
          amount: Math.round(parseFloat(form.amount) * 100), // Convert DA to centimes
          nextBillDate,
          duration: form.duration,
          notes: form.notes.trim() || undefined,
        };

        await window.api.database.bills.create(billData);
        onBillAdded?.();
        showToast(t("bills.billAddedSuccessfully", "Bill added successfully"), "success");
      }
      
      setForm(initialForm);
      setIsExistingBill(false);
    } catch (err) {
      showToast(t("bills.failedToSaveBill", "Failed to save bill"), "error");
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
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {editingBill ? t("bills.editBill", "Edit Bill") : isExistingBill ? t("bills.payBill", "Pay Bill") : t("bills.addBill", "Add Bill")}
          </h2>
        </div>
        {openPanel === "add" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "add" && (
        <form onSubmit={handleAddBill} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Legend>
              <label>{t("bills.title", "Title")}</label>
              <div className="relative">
                <input
                  ref={titleInputRef}
                  data-field="bill-title"
                  type="text"
                  placeholder={t("bills.enterBillTitle", "Enter bill title")}
                  value={form.title}
                  onChange={(e) => handleTitleSearch(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onFocus={() => {
                    if (form.title.trim()) {
                      setShowTitleDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  required
                />
                
                {/* Enhanced title dropdown */}
                {showTitleDropdown && filteredTitles.length > 0 && (
                  <div 
                    data-title-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredTitles.map((bill, index) => (
                      <div
                        key={bill.title}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                          selectedTitleIndex === index && "bg-muted/50"
                        )}
                        onMouseDown={() => selectTitle(bill)}
                        onMouseEnter={() => setSelectedTitleIndex(index)}
                      >
                        <div>
                          <div className="font-medium text-foreground">{bill.title}</div>
                          <div className="text-sm text-muted-foreground">{bill.type}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(bill.amount / 100) % 1 === 0 
                            ? (bill.amount / 100).toFixed(0) 
                            : (bill.amount / 100).toFixed(2)} {t("bills.currency", "DA")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Legend>
              <Legend>
                <label>{t("bills.type", "Type")}</label>
              <div className="relative">
                <input
                  ref={typeInputRef}
                  data-field="bill-type"
                  type="text"
                  placeholder={t("bills.enterBillType", "Enter bill type")}
                  value={form.type}
                  onChange={(e) => handleTypeSearch(e.target.value)}
                  onKeyDown={handleTypeKeyDown}
                  onFocus={() => {
                    if (form.type.trim()) {
                      setShowTypeDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  required
                />
                
                {/* Enhanced type dropdown */}
                {showTypeDropdown && filteredTypes.length > 0 && (
                  <div 
                    data-type-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredTypes.map((type, index) => (
                      <div
                        key={type}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                          selectedTypeIndex === index && "bg-muted/50"
                        )}
                        onMouseDown={() => selectType(type)}
                        onMouseEnter={() => setSelectedTypeIndex(index)}
                      >
                        <div className="font-medium text-foreground">{type}</div>
                        {selectedTypeIndex === index && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Legend>
            <Legend>
              <label>{t("bills.amountLabel", "Amount")} ({t("bills.currency", "DA")})</label>
              <input
                data-field="bill-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("bills.enterAmount", "Enter amount")}
                value={form.amount}
                onChange={(e) => handleFormChange("amount", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                required
              />
            </Legend>
            <Legend>
              <label>{t("bills.nextBill", "Next Bill")}</label>
              <Select
                value={form.duration}
                onValueChange={(value) => handleFormChange("duration", value)}
              >
                <SelectTrigger className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all">
                  <SelectValue placeholder={t("bills.selectDuration", "Select duration")} />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Legend>
            <Legend>
              <label>{t("bills.description", "Description")}</label>
              <input
                type="text"
                placeholder={t("bills.enterDescriptionOptional", "Enter description (optional)")}
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("bills.notes", "Notes")}</label>
              <input
                type="text"
                placeholder={t("bills.enterNotesOptional", "Enter notes (optional)")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
              />
            </Legend>
          </div>
          <hr />
          <div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingBill ? t("bills.updating", "Updating...") : isExistingBill ? t("bills.recordingPayment", "Recording Payment...") : t("bills.adding", "Adding...")}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {editingBill ? t("bills.updateBill", "Update Bill") : isExistingBill ? t("bills.recordPayment", "Record Payment") : t("bills.addBill", "Add Bill")}
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