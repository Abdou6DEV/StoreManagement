import React, { useState, useEffect } from "react";
import { FileText, Loader2, UserMinus, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Modal, useModalRequestClose } from "../../../lib/components/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../lib/components/dialog";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";

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
  payments?: {
    id: string;
    amount: number;
    paidDate: Date;
    notes?: string | null;
  }[];
}

interface EditBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  onBillUpdated: () => void;
}

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

// Adds months while clamping the day to the last valid day of the target month.
const addMonths = (d: Date, months: number): Date => {
  const targetMonth = d.getMonth() + months;
  const lastDay = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(d.getFullYear(), targetMonth, Math.min(d.getDate(), lastDay));
};

// Calculate next bill date based on duration
const calculateNextBillDate = (duration: string): Date => {
  const today = new Date();

  switch (duration) {
    case "NO_NEXT":   return today;
    case "1_DAY":     return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    case "1_MONTH":   return addMonths(today, 1);
    case "2_MONTHS":  return addMonths(today, 2);
    case "3_MONTHS":  return addMonths(today, 3);
    case "4_MONTHS":  return addMonths(today, 4);
    case "5_MONTHS":  return addMonths(today, 5);
    case "6_MONTHS":  return addMonths(today, 6);
    case "7_MONTHS":  return addMonths(today, 7);
    case "8_MONTHS":  return addMonths(today, 8);
    case "9_MONTHS":  return addMonths(today, 9);
    case "10_MONTHS": return addMonths(today, 10);
    case "11_MONTHS": return addMonths(today, 11);
    case "ANNUALLY":  return addMonths(today, 12);
    default:          return today;
  }
};

/** Must render under `<Modal>` so `useModalRequestClose` sees `ModalCloseContext`. */
function EditBillCancelButton({ loading }: { loading: boolean }) {
  const { t } = useTranslation();
  const requestClose = useModalRequestClose();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => requestClose()}
      disabled={loading}
    >
      {t("common.cancel", "Cancel")}
    </Button>
  );
}

export default function EditBillModal({
  isOpen,
  onClose,
  bill,
  onBillUpdated,
}: EditBillModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    type: "",
    duration: "NO_NEXT",
    description: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const durationOptions = getDurationOptions(t);

  const hasUnsavedChanges =
    !!bill &&
    (form.title !== (bill.title || "") ||
      form.type !== (bill.type || "") ||
      form.duration !== (bill.duration || "NO_NEXT") ||
      form.description !== (bill.description || "") ||
      form.notes !== (bill.notes || ""));

  useEffect(() => {
    if (bill) {
      setForm({
        title: bill.title || "",
        type: bill.type || "",
        duration: bill.duration || "NO_NEXT",
        description: bill.description || "",
        notes: bill.notes || "",
      });
    }
  }, [bill]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeactivateConfirm = async () => {
    if (!bill) return;
    setStatusLoading(true);
    try {
      await window.api.database.bills.update(bill.id, { duration: "NO_NEXT" });
      showToast(t("bills.employeeDeactivated", "Employee deactivated — no more payment reminders"), "success");
      setDeactivateDialogOpen(false);
      onBillUpdated();
      onClose();
    } catch {
      showToast(t("bills.failedToSaveBill", "Failed to save bill"), "error");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!bill) return;
    setStatusLoading(true);
    try {
      const period = bill.notes?.match(/period=(DAILY|MONTHLY)/)?.[1] ?? "MONTHLY";
      const duration = period === "DAILY" ? "1_DAY" : "1_MONTH";
      const today = new Date();
      const nextBillDate = period === "DAILY"
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        : addMonths(today, 1);
      await window.api.database.bills.update(bill.id, { duration, nextBillDate });
      showToast(t("bills.employeeReactivated", "Employee reactivated — payment reminders resumed"), "success");
      onBillUpdated();
      onClose();
    } catch {
      showToast(t("bills.failedToSaveBill", "Failed to save bill"), "error");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bill) return;

    setLoading(true);
    try {
      const nextBillDate = calculateNextBillDate(form.duration);
      
      const billData = {
        title: form.title.trim(),
        type: form.type.trim(),
        duration: form.duration,
        nextBillDate: nextBillDate,
        description: form.description.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      await window.api.database.bills.update(bill.id, billData);
      const changeLines: string[] = [];
      if (billData.title !== (bill.title ?? "")) changeLines.push(`Title: ${bill.title ?? ""} → ${billData.title}`);
      if (billData.type !== (bill.type ?? "")) changeLines.push(`Type: ${bill.type ?? ""} → ${billData.type}`);
      if (billData.duration !== (bill.duration ?? "")) changeLines.push(`Duration: ${bill.duration ?? ""} → ${billData.duration}`);
      if ((billData.description ?? "") !== (bill.description ?? "")) changeLines.push(`Description: ${bill.description ?? ""} → ${billData.description ?? ""}`);
      if ((billData.notes ?? "") !== (bill.notes ?? "")) changeLines.push(`Notes: ${bill.notes ?? ""} → ${billData.notes ?? ""}`);
      const detailsStr = changeLines.length > 0
        ? `Bill: ${billData.title}\n${changeLines.join("\n")}`
        : `Bill: ${billData.title}`;
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.billUpdated",
        details: detailsStr,
      }).catch(() => {});
      onBillUpdated();
      showToast(t("bills.billUpdatedSuccessfully", "Bill updated successfully"), "success");
      onClose();
    } catch (err) {
      showToast(t("bills.failedToSaveBill", "Failed to save bill"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!bill) return null;

  const isSalary = bill.type === "SALARY";

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      size="lg"
      title={t("bills.editBill", "Edit Bill")}
      icon={<FileText className="w-5 h-5 text-purple-600" />}
      showCloseButton={true}
      hasUnsavedChanges={hasUnsavedChanges}
      onDiscard={onClose}
    >
      <div className="p-6">

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("bills.title", "Title")} *
              </label>
              <input
                type="text"
                placeholder={t("bills.enterBillTitle", "Enter bill title")}
                value={form.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("bills.type", "Type")} *
              </label>
              <input
                type="text"
                placeholder={t("bills.enterBillType", "Enter bill type")}
                value={form.type}
                onChange={(e) => handleFormChange("type", e.target.value)}
                disabled={isSalary}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("bills.duration", "Duration")} *
              </label>
              <Select
                value={form.duration}
                onValueChange={(value) => handleFormChange("duration", value)}
                disabled={isSalary}
              >
                <SelectTrigger className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed">
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
            </div>

            {/* Current Amount (Read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("bills.currentAmount", "Current Amount")}
              </label>
              <div className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
                {(() => {
                  const value = bill.amount / 100;
                  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} ${t("bills.currency", "DA")}`;
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("bills.amountCannotBeChanged", "Amount cannot be changed as payments have been recorded")}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("bills.description", "Description")}
            </label>
            <input
              type="text"
              placeholder={t("bills.enterDescriptionOptional", "Enter description (optional)")}
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("bills.notes", "Notes")}
            </label>
            <input
              type="text"
              placeholder={t("bills.enterNotesOptional", "Enter notes (optional)")}
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              disabled={isSalary}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            />
            {isSalary && (
              <p className="text-xs text-muted-foreground">
                {t("bills.salaryFieldsLocked", "These fields are managed automatically by the salary system")}
              </p>
            )}
          </div>

          {/* Salary employee status toggle */}
          {isSalary && (() => {
            const isActive = bill.duration !== "NO_NEXT";
            return (
              <>
                <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-border bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">
                        {isActive
                          ? t("bills.employeeActive", "Employee Active")
                          : t("bills.employeeInactive", "Employee Inactive")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isActive
                          ? t("bills.employeeActiveDesc", "Payment reminders are enabled for this employee")
                          : t("bills.employeeInactiveDesc", "No payment reminders — employee no longer active")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={isActive ? () => setDeactivateDialogOpen(true) : handleReactivate}
                    disabled={statusLoading || loading}
                    className={isActive
                      ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 shrink-0"
                      : "border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30 shrink-0"
                    }
                  >
                    {statusLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isActive ? (
                      <UserMinus className="w-4 h-4 mr-2" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2" />
                    )}
                    {isActive
                      ? t("bills.deactivateEmployee", "Deactivate Employee")
                      : t("bills.reactivateEmployee", "Reactivate Employee")}
                  </Button>
                </div>

                {/* Deactivation confirmation dialog */}
                <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                  <DialogContent showCloseButton>
                    <DialogHeader>
                      <DialogTitle>{t("bills.confirmDeactivate", "Confirm Deactivation")}</DialogTitle>
                      <DialogDescription>
                        {t("bills.confirmDeactivateDesc", "This will stop all payment reminders for {{name}}. You can reactivate them at any time.", { name: bill.title })}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} disabled={statusLoading}>
                        {t("common.cancel", "Cancel")}
                      </Button>
                      <Button
                        onClick={handleDeactivateConfirm}
                        disabled={statusLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {statusLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserMinus className="w-4 h-4 mr-2" />}
                        {t("bills.deactivateEmployee", "Deactivate Employee")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            );
          })()}

          {/* Action Buttons — Cancel uses useModalRequestClose inside Modal subtree */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <EditBillCancelButton loading={loading} />
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("bills.updating", "Updating...")}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("bills.updateBill", "Update Bill")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
