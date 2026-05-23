import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Users, Loader2, Check, Calculator, AlertTriangle } from "lucide-react";
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

/** Local calendar YYYY-MM-DD (matches DatePicker). */
const toLocalYyyyMmDd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getTodayStr = () => toLocalYyyyMmDd(new Date());



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
  mode: "FIXED" as "FIXED" | "PERCENT",
  percentage: "",
  amount: "",
  forDate: getTodayStr(),
});

const inputClass =
  "w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all";

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-sm [&>label]:font-medium [&>label]:min-h-[1.25rem] [&>label]:flex [&>label]:items-center">
      {children}
    </div>
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
  // Prevents the profit useEffect from overwriting an amount the user typed manually
  const skipAmountUpdateRef = useRef(false);
  // Forces auto-calculation to re-run on reselecting the same employee.
  const [recalcSalt, setRecalcSalt] = useState(0);

  const [employeePayments, setEmployeePayments] = useState<any[]>([]);
  const [duplicatePayment, setDuplicatePayment] = useState<any | null>(null);

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

  const applyEmployeeFromBill = async (bill: SalaryBill) => {
    // Switching/reselecting an employee should allow auto-calculation again.
    skipAmountUpdateRef.current = false;
    setRecalcSalt((s) => s + 1);
    const parsed = parseSalaryBillNotes(bill.notes);
    setIsExistingEmployee(true);
    setExistingBillId(bill.id);

    const baseFields = {
      name: bill.title,
      period: (parsed?.period === "DAILY" ? "DAILY" : "MONTHLY") as "DAILY" | "MONTHLY",
      mode: "FIXED" as const,
      percentage: "",
      amount: "",
    };

    // Clear stale amount/mode immediately so the previous employee never "sticks".
    setForm((prev) => ({ ...prev, ...baseFields }));
    setCalculatedAmountDA(null);

    // Fetch last payment to pre-fill mode + value, and store all payments for duplicate check
    try {
      const billWithPayments = await window.api.database.bills.getBillWithPayments(bill.id);
      const payments: any[] = billWithPayments?.payments ?? [];
      setEmployeePayments(payments);
      if (payments.length > 0) {
        const last = payments.sort(
          (a: any, b: any) =>
            new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
        )[0];

        const pctMatch = last.notes?.match(/(\d+(?:\.\d+)?)%/);
        if (pctMatch) {
          const pct = parseFloat(pctMatch[1]);
          setForm((prev) => ({
            ...prev,
            ...baseFields,
            mode: "PERCENT",
            percentage: pctMatch[1],
            amount: "",
          }));
          // Amount filled when profit loads (recalcSalt + profitDA effect).
          return;
        }

        const amountDA = last.amount / 100;
        setForm((prev) => ({
          ...prev,
          ...baseFields,
          mode: "FIXED",
          percentage: "",
          amount:
            amountDA % 1 === 0
              ? amountDA.toFixed(0)
              : amountDA.toFixed(2),
        }));
        return;
      }

      // Bill exists but no payment rows — use stored bill amount if any
      const billAmountCentimes = (billWithPayments as { amount?: number })?.amount;
      if (billAmountCentimes && billAmountCentimes > 0) {
        const amountDA = billAmountCentimes / 100;
        setForm((prev) => ({
          ...prev,
          ...baseFields,
          amount:
            amountDA % 1 === 0
              ? amountDA.toFixed(0)
              : amountDA.toFixed(2),
        }));
      }
      return;
    } catch (e) {
      console.error("Error fetching last payment:", e);
    }
  };

  const handleNameChange = async (value: string) => {
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
      await applyEmployeeFromBill(exact);
    } else {
      setIsExistingEmployee(false);
      setExistingBillId(null);
      setEmployeePayments([]);
      setDuplicatePayment(null);
      skipAmountUpdateRef.current = false;
      setCalculatedAmountDA(null);
      setForm((prev) => ({
        ...prev,
        name: value,
        mode: "FIXED",
        percentage: "",
        amount: "",
      }));
    }
  };

  const selectFromDropdown = async (bill: SalaryBill) => {
    await applyEmployeeFromBill(bill);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setFilteredNames([]);
  };

  // Fetch profit whenever % mode is active (debounced).
  useEffect(() => {
    if (form.mode !== "PERCENT") {
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
          startDate = new Date(form.forDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(form.forDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          const d = new Date(form.forDate);
          startDate = new Date(d.getFullYear(), d.getMonth(), 1);
          endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        const summary = await window.api.database.sales.getSummary(startDate, endDate);
        const profit = summary?.totalProfit ?? 0;
        setProfitDA(profit);
      } catch {
        setProfitDA(null);
        setCalculatedAmountDA(null);
      } finally {
        setFetchingProfit(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.mode, form.period, form.forDate]);

  // Auto-calculate amount when we have a profit and a valid percentage,
  // unless the user manually overrode the amount field.
  useEffect(() => {
    if (form.mode !== "PERCENT") return;
    if (profitDA === null) return;

    const pct = parseFloat(form.percentage);
    if (skipAmountUpdateRef.current) return;
    if (Number.isNaN(pct) || pct <= 0) {
      setCalculatedAmountDA(null);
      setForm((prev) => ({ ...prev, amount: "" }));
      return;
    }

    const calc = Math.max(0, Math.round((profitDA * pct) / 100));
    setCalculatedAmountDA(calc);
    setForm((prev) => ({ ...prev, amount: calc.toFixed(0) }));
  }, [form.mode, form.percentage, profitDA, recalcSalt]);

  // Duplicate payment check
  useEffect(() => {
    if (!existingBillId || !form.forDate || employeePayments.length === 0) {
      setDuplicatePayment(null);
      return;
    }
    const forD = new Date(form.forDate);
    const found = employeePayments.find((p: any) => {
      const d = new Date(p.paidDate);
      if (form.period === "DAILY") {
        return (
          d.getFullYear() === forD.getFullYear() &&
          d.getMonth() === forD.getMonth() &&
          d.getDate() === forD.getDate()
        );
      }
      // Monthly: same month & year
      return d.getFullYear() === forD.getFullYear() && d.getMonth() === forD.getMonth();
    });
    setDuplicatePayment(found ?? null);
  }, [existingBillId, form.forDate, form.period, employeePayments]);

  const buildPaymentNotes = (): string => {
    const periodLabel = form.period === "DAILY"
      ? t("bills.daily", "Daily")
      : t("bills.monthly", "Monthly");
    const modeLabel = form.mode === "PERCENT"
      ? `${form.percentage}% ${t("bills.ofProfit", "of profit")}`
      : t("bills.byAmount", "By Amount");
    return `${t("bills.salary", "Salary")} | ${periodLabel} | ${form.forDate} | ${modeLabel}`;
  };

  const buildPaidDate = (): Date => {
    const now = new Date();
    if (form.forDate === toLocalYyyyMmDd(now)) {
      return now;
    }
    const parts = form.forDate.split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      const [y, mo, day] = parts;
      return new Date(y, mo - 1, day, 12, 0, 0, 0);
    }
    const d = new Date(form.forDate);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const buildBillNotes = (): string => {
    return form.period === "DAILY" ? "SALARY_RULE|period=DAILY" : "SALARY_RULE|period=MONTHLY";
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setIsExistingEmployee(false);
    setExistingBillId(null);
    setProfitDA(null);
    setCalculatedAmountDA(null);
    setFilteredNames([]);
    setShowDropdown(false);
    setEmployeePayments([]);
    setDuplicatePayment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName = form.name.trim().toLowerCase();
    const existingByName = salaryBills.find((b) => b.title.trim().toLowerCase() === normalizedName);
    if (!isExistingEmployee && existingByName) {
      showToast(
        t(
          "bills.employeeNameAlreadyExists",
          "This employee name already exists. Please select it from the suggestions."
        ),
        "error"
      );
      return;
    }

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
      const paidDate = buildPaidDate();

      if (isExistingEmployee && existingBillId) {
        const salaryDuration = form.period === "DAILY" ? "1_DAY" : "1_MONTH";
        await window.api.database.bills.recordPayment(
          existingBillId,
          amountCentimes,
          paymentNotes,
          paidDate,
          salaryDuration,
        );
        const currentBill = salaryBills.find((b) => b.id === existingBillId);
        if (currentBill && currentBill.notes !== billNotes) {
          await window.api.database.bills.update(existingBillId, { notes: billNotes });
        }
      } else {
        const salaryDuration = form.period === "DAILY" ? "1_DAY" : "1_MONTH";
        const today = new Date();
        let salaryNextDate: Date;
        if (form.period === "DAILY") {
          salaryNextDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        } else {
          const lastDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
          salaryNextDate = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(today.getDate(), lastDayOfNextMonth));
        }
        await window.api.database.bills.create({
          title: form.name.trim(),
          type: "SALARY",
          amount: amountCentimes,
          nextBillDate: salaryNextDate,
          duration: salaryDuration,
          notes: billNotes,
          firstPaymentNotes: paymentNotes,
          firstPaymentPaidDate: paidDate,
        });
      }

      window.api?.activityLog
        ?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.billPaymentRecorded",
          details: `Salary | ${form.name.trim()} | ${amountNum.toFixed(0)} DA`,
        })
        .catch((): undefined => undefined);

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-end">
            {/* Employee name */}
            <Field>
              <label>
                {t("bills.employeeName", "Employee Name")}
                {form.name.trim() &&
                  (isExistingEmployee ? (
                    <Badge className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-normal">
                      {t("bills.existing", "Existing")}
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-normal">
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
            </Field>

            {/* Salary period */}
            <Field>
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
            </Field>

            {/* For date */}
            <Field>
              <label>{t("bills.forDate", "For Date")}</label>
              <DatePicker
                value={form.forDate}
                onChange={(v) => setField("forDate", v)}
                max={new Date().toISOString().slice(0, 10)}
                className="h-12 px-4 rounded-lg border border-border bg-card text-sm"
              />
            </Field>

          </div>

          {/* Duplicate payment warning */}
          {duplicatePayment && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {form.period === "DAILY"
                  ? t("bills.duplicateDailyPayment", "A payment was already recorded for this day ({{date}})", {
                      date: new Date(duplicatePayment.paidDate).toLocaleDateString(),
                    })
                  : t("bills.duplicateMonthlyPayment", "A payment was already recorded this month ({{date}})", {
                      date: new Date(duplicatePayment.paidDate).toLocaleDateString(),
                    })}
              </span>
            </div>
          )}

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-end">
            {/* Payment mode — two mutually exclusive checkboxes */}
            <Field>
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
                  onChange={() => {
                    skipAmountUpdateRef.current = false;
                    setForm((prev) => ({
                      ...prev,
                      mode: "PERCENT",
                      amount: "",
                    }));
                  }}
                  label={t("bills.byPercentage", "By %")}
                  color="purple"
                />
              </div>
            </Field>

            {/* Percentage — PERCENT mode only */}
            {form.mode === "PERCENT" && (
              <Field>
                <label>{t("bills.percentage", "Percentage (%)")}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder={t("bills.enterPercentage", "Enter percentage")}
                  value={form.percentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setField("percentage", value);
                    if (profitDA !== null && profitDA > 0) {
                      const pct = parseFloat(value);
                      if (!isNaN(pct) && pct > 0) {
                        const calc = Math.max(0, Math.round((profitDA * pct) / 100));
                        setCalculatedAmountDA(calc);
                        setField("amount", calc.toFixed(0));
                      } else {
                        setCalculatedAmountDA(null);
                        setField("amount", "");
                      }
                    }
                  }}
                  className={inputClass}
                />
              </Field>
            )}

            {/* Amount */}
            <Field>
              <label>
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
                placeholder={t("bills.enterAmount", "0.00")}
                value={form.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setField("amount", value);
                  if (form.mode === "PERCENT" && profitDA !== null && profitDA > 0) {
                    skipAmountUpdateRef.current = true;
                    const amt = parseFloat(value);
                    if (!isNaN(amt) && amt > 0) {
                      const newPct = Math.min(100, (amt / profitDA) * 100);
                      setField("percentage", parseFloat(newPct.toFixed(2)).toString());
                    } else {
                      setField("percentage", "");
                    }
                  }
                }}
                className={inputClass}
                required
              />
            </Field>

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
