import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Users, Loader2, Check, Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Badge } from "../../../lib/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../lib/components/select";
import { DatePicker } from "../../../lib/components/datePicker";
import { MonthPicker } from "../../../lib/components/monthPicker";
import { Checkbox } from "../../../lib/components/checkbox";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import { cn } from "../../../lib/utils";

interface SalaryBill {
  id: string;
  title: string;
  notes?: string | null;
}

interface AddSalaryFormProps {
  openPanel: "salary" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"salary" | null>>;
  onSalaryPaymentRecorded?: () => void;
}

const getTodayStr = () => new Date().toISOString().split("T")[0];

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const parseSalaryBillNotes = (notes?: string | null): Record<string, string> | null => {
  if (!notes?.startsWith("SALARY_RULE|")) return null;
  const result: Record<string, string> = {};
  notes
    .split("|")
    .slice(1)
    .forEach((part) => {
      const eq = part.indexOf("=");
      if (eq > 0) result[part.substring(0, eq)] = part.substring(eq + 1);
    });
  return result;
};

const getInitialForm = () => ({
  name: "",
  period: "MONTHLY" as "DAILY" | "MONTHLY",
  startingDate: getTodayStr(),
  mode: "FIXED" as "FIXED" | "PERCENT",
  percentage: "",
  amount: "",
  forDate: getTodayStr(),
  forMonth: getCurrentMonthStr(),
  userNotes: "",
});

const inputClass =
  "w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all";

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">{children}</legend>
  );
}

export default function AddSalaryForm({
  openPanel,
  setOpenPanel,
  onSalaryPaymentRecorded,
}: AddSalaryFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState(getInitialForm);
  const [loading, setLoading] = useState(false);
  const [salaryBills, setSalaryBills] = useState<SalaryBill[]>([]);
  const [isExistingEmployee, setIsExistingEmployee] = useState(false);
  const [existingBillId, setExistingBillId] = useState<string | null>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredNames, setFilteredNames] = useState<SalaryBill[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [profitDA, setProfitDA] = useState<number | null>(null);
  const [calculatedAmountDA, setCalculatedAmountDA] = useState<number | null>(null);
  const [fetchingProfit, setFetchingProfit] = useState(false);

  const loadSalaryBills = async () => {
    try {
      const all: any[] = await window.api.database.bills.getFiltered({ type: "SALARY" });
      const byTitle = new Map<string, SalaryBill>();
      for (const b of all) {
        if (b.type !== "SALARY") continue;
        if (!byTitle.has(b.title)) {
          byTitle.set(b.title, { id: b.id, title: b.title, notes: b.notes });
        }
      }
      setSalaryBills(Array.from(byTitle.values()));
    } catch (e) {
      console.error("Error loading salary bills:", e);
    }
  };

  useEffect(() => {
    if (openPanel === "salary") loadSalaryBills();
  }, [openPanel]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-salary-dropdown]")) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const setField = <K extends keyof ReturnType<typeof getInitialForm>>(
    key: K,
    value: ReturnType<typeof getInitialForm>[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyEmployeeFromBill = (bill: SalaryBill) => {
    const parsed = parseSalaryBillNotes(bill.notes);
    setIsExistingEmployee(true);
    setExistingBillId(bill.id);
    setForm((prev) => ({
      ...prev,
      name: bill.title,
      ...(parsed
        ? {
            period: parsed.period === "DAILY" ? "DAILY" : "MONTHLY",
            startingDate: parsed.start ?? getTodayStr(),
          }
        : {}),
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
    const filtered = salaryBills.filter((b) =>
      b.title.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredNames(filtered);
    setShowDropdown(value.trim().length > 0 && filtered.length > 0);
    setSelectedIndex(-1);

    const exact = salaryBills.find(
      (b) => b.title.toLowerCase() === value.trim().toLowerCase()
    );
    if (exact) {
      applyEmployeeFromBill(exact);
    } else {
      setIsExistingEmployee(false);
      setExistingBillId(null);
    }
  };

  const selectFromDropdown = (bill: SalaryBill) => {
    applyEmployeeFromBill(bill);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setFilteredNames([]);
  };

  // Debounced profit calculation
  useEffect(() => {
    if (form.mode !== "PERCENT") {
      setProfitDA(null);
      setCalculatedAmountDA(null);
      return;
    }
    const pct = parseFloat(form.percentage);
    if (!pct || pct <= 0) {
      setProfitDA(null);
      setCalculatedAmountDA(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setFetchingProfit(true);
        let startDate: Date;
        let endDate: Date;

        if (form.period === "DAILY") {
          const d = form.forDate || getTodayStr();
          startDate = new Date(d);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(d);
          endDate.setHours(23, 59, 59, 999);
        } else {
          const [y, m] = (form.forMonth || getCurrentMonthStr()).split("-").map(Number);
          startDate = new Date(y, m - 1, 1);
          endDate = new Date(y, m, 0, 23, 59, 59, 999);
        }

        const summary = await window.api.database.sales.getSummary(startDate, endDate);
        const profit = summary?.totalProfit ?? 0;
        setProfitDA(profit);
        const calc = Math.max(0, Math.round((profit * pct) / 100));
        setCalculatedAmountDA(calc);
        setForm((prev) => ({ ...prev, amount: calc.toFixed(0) }));
      } catch {
        setProfitDA(null);
        setCalculatedAmountDA(null);
      } finally {
        setFetchingProfit(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.mode, form.percentage, form.period, form.forDate, form.forMonth]);

  const buildPaymentNotes = (): string => {
    const periodLabel = form.period === "DAILY" ? "Daily" : "Monthly";
    const forLabel = form.period === "DAILY" ? form.forDate : form.forMonth;
    const modeLabel =
      form.mode === "PERCENT" ? `${form.percentage}% of profit` : "Fixed";
    let notes = `Salary | ${periodLabel} | ${forLabel} | ${modeLabel}`;
    if (form.userNotes.trim()) notes += ` | ${form.userNotes.trim()}`;
    return notes;
  };

  const buildBillNotes = (): string => {
    if (form.period === "DAILY") return "SALARY_RULE|period=DAILY";
    return `SALARY_RULE|period=MONTHLY|start=${form.startingDate || getTodayStr()}`;
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setIsExistingEmployee(false);
    setExistingBillId(null);
    setProfitDA(null);
    setCalculatedAmountDA(null);
    setFilteredNames([]);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) {
      showToast(t("bills.amountRequired", "Amount must be greater than 0"), "error");
      return;
    }

    setLoading(true);
    try {
      const amountCentimes = Math.round(amountNum * 100);
      const paymentNotes = buildPaymentNotes();
      const billNotes = buildBillNotes();

      if (isExistingEmployee && existingBillId) {
        await window.api.database.bills.recordPayment(
          existingBillId,
          amountCentimes,
          paymentNotes
        );
        const currentBill = salaryBills.find((b) => b.id === existingBillId);
        if (currentBill && currentBill.notes !== billNotes) {
          await window.api.database.bills.update(existingBillId, { notes: billNotes });
        }
      } else {
        await window.api.database.bills.create({
          title: form.name.trim(),
          type: "SALARY",
          amount: amountCentimes,
          nextBillDate: new Date(),
          duration: "NO_NEXT",
          notes: billNotes,
          firstPaymentNotes: paymentNotes,
        });
      }

      window.api?.activityLog
        ?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.billPaymentRecorded",
          details: `Salary | ${form.name.trim()} | ${amountNum.toFixed(0)} DA`,
        })
        .catch(() => {});

      showToast(
        t("bills.salaryPaymentRecorded", "Salary payment recorded successfully"),
        "success"
      );
      resetForm();
      setOpenPanel(null);
      onSalaryPaymentRecorded?.();
    } catch (err) {
      console.error("Error recording salary payment:", err);
      showToast(
        t("bills.failedToRecordSalary", "Failed to record salary payment"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "salary" ? null : "salary")}
        aria-expanded={openPanel === "salary"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t("bills.addSalaryPayment", "Add Salary Payment")}
          </h2>
        </div>
        {openPanel === "salary" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>

      {openPanel === "salary" && (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1 */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-6 items-end",
            form.period === "MONTHLY" ? "xl:grid-cols-4" : "xl:grid-cols-3"
          )}>
            {/* Employee name */}
            <Legend>
              <label className="flex items-center gap-2">
                {t("bills.employeeName", "Employee Name")}
                {form.name.trim() &&
                  (isExistingEmployee ? (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-normal">
                      {t("bills.existing", "Existing")}
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-normal">
                      {t("bills.newEmployee", "New Employee")}
                    </Badge>
                  ))}
              </label>
              <div className="relative" data-salary-dropdown>
                <input
                  type="text"
                  placeholder={t("bills.enterEmployeeName", "Enter employee name")}
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    if (form.name.trim() && filteredNames.length > 0)
                      setShowDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedIndex((i) => Math.min(i + 1, filteredNames.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedIndex((i) => Math.max(i - 1, 0));
                    } else if (e.key === "Enter" && showDropdown && selectedIndex >= 0) {
                      e.preventDefault();
                      selectFromDropdown(filteredNames[selectedIndex]);
                    } else if (e.key === "Escape") {
                      setShowDropdown(false);
                    }
                  }}
                  className={inputClass}
                  required
                />
                {showDropdown && filteredNames.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredNames.map((bill, i) => (
                      <div
                        key={bill.id}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                          selectedIndex === i && "bg-muted/50"
                        )}
                        onMouseDown={() => selectFromDropdown(bill)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <span className="font-medium text-foreground">{bill.title}</span>
                        {selectedIndex === i && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Legend>

            {/* Salary period */}
            <Legend>
              <label>{t("bills.salaryPeriod", "Salary Period")}</label>
              <Select
                value={form.period}
                onValueChange={(v) => setField("period", v as "DAILY" | "MONTHLY")}
              >
                <SelectTrigger className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t("bills.daily", "Daily")}</SelectItem>
                  <SelectItem value="MONTHLY">{t("bills.monthly", "Monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </Legend>

            {/* Starting date — monthly only, no empty placeholder */}
            {form.period === "MONTHLY" && (
              <Legend>
                <label>{t("bills.startingDate", "Starting Date")}</label>
                <DatePicker
                  value={form.startingDate}
                  onChange={(v) => setField("startingDate", v)}
                  className="h-12 px-4 rounded-lg border border-border bg-card text-sm"
                />
              </Legend>
            )}

            {/* For date / for month */}
            <Legend>
              <label>
                {form.period === "DAILY"
                  ? t("bills.forDate", "For Date")
                  : t("bills.forMonth", "For Month")}
              </label>
              {form.period === "DAILY" ? (
                <DatePicker
                  value={form.forDate}
                  onChange={(v) => setField("forDate", v)}
                  className="h-12 px-4 rounded-lg border border-border bg-card text-sm"
                />
              ) : (
                <MonthPicker
                  value={form.forMonth}
                  onChange={(v) => setField("forMonth", v)}
                  className="h-12 px-4 rounded-lg border border-border bg-card text-sm"
                />
              )}
            </Legend>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-end">
            {/* Payment mode — two mutually exclusive checkboxes */}
            <Legend>
              <label>{t("bills.paymentMode", "Payment Mode")}</label>
              <div className="h-12 flex items-center gap-6">
                <Checkbox
                  checked={form.mode === "FIXED"}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      mode: "FIXED",
                      percentage: "",
                      amount: "",
                    }))
                  }
                  label={t("bills.byAmount", "By Amount")}
                  color="purple"
                />
                <Checkbox
                  checked={form.mode === "PERCENT"}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      mode: "PERCENT",
                      amount: "",
                    }))
                  }
                  label={t("bills.byPercentage", "By %")}
                  color="purple"
                />
              </div>
            </Legend>

            {/* Percentage — PERCENT mode only */}
            {form.mode === "PERCENT" && (
              <Legend>
                <label>{t("bills.percentage", "Percentage (%)")}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="30"
                  value={form.percentage}
                  onChange={(e) => setField("percentage", e.target.value)}
                  className={inputClass}
                />
              </Legend>
            )}

            {/* Amount */}
            <Legend>
              <label className="flex items-center gap-2">
                {t("bills.amount", "Amount")} ({t("bills.currency", "DA")})
                {form.mode === "PERCENT" &&
                  calculatedAmountDA !== null &&
                  !fetchingProfit && (
                    <span className="font-normal text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      {t("bills.calculated", "calculated")}
                    </span>
                  )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                className={inputClass}
                required
              />
            </Legend>

            {/* Notes */}
            <Legend>
              <label>{t("bills.notes", "Notes")}</label>
              <input
                type="text"
                placeholder={t("bills.enterNotesOptional", "Enter notes (optional)")}
                value={form.userNotes}
                onChange={(e) => setField("userNotes", e.target.value)}
                className={inputClass}
              />
            </Legend>
          </div>

          {/* Profit hint — outside grid so it never affects input alignment */}
          {form.mode === "PERCENT" && (fetchingProfit || profitDA !== null) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 -mt-2">
              {fetchingProfit ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("bills.calculatingProfit", "Calculating...")}
                </>
              ) : (
                <>
                  {t("bills.profitForPeriod", "Profit")}:{" "}
                  {profitDA!.toLocaleString()} {t("bills.currency", "DA")}
                  {" · "}
                  {t("bills.calculatedAmount", "Suggested")}:{" "}
                  {calculatedAmountDA?.toLocaleString() ?? "-"}{" "}
                  {t("bills.currency", "DA")}
                </>
              )}
            </p>
          )}

          <hr />

          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white h-10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("bills.recordingSalary", "Recording...")}
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                {t("bills.recordSalaryPayment", "Record Salary Payment")}
              </>
            )}
          </Button>
        </form>
      )}
    </section>
  );
}
