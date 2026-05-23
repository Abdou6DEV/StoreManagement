import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  Search,
  User,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Input } from "../../../../lib/components/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../lib/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../lib/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../../../lib/components/command";
import { useToast } from "../../../../lib/contexts/toastContext";
import { useAuth } from "../../../../lib/contexts/authContext";
import { DatePicker } from "../../../../lib/components/datePicker";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../../lib/components/pagination";
import { cn } from "../../../../lib/utils";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";
import type { Sale } from "../../../../types";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

/** Extract sale ID from raw log details (e.g. "Sale ID: abc-123" -> "abc-123"). */
function extractSaleIdFromDetails(details: string | null): string | null {
  if (!details?.trim()) return null;
  const m = details.match(/Sale ID:\s*([^\s\n]+)/);
  return m ? m[1].trim() : null;
}

/** Extract service ID from raw log details (e.g. "Service ID: abc-123" -> "abc-123"). */
function extractServiceIdFromDetails(details: string | null): string | null {
  if (!details?.trim()) return null;
  const m = details.match(/Service ID:\s*([^\s\n]+)/);
  return m ? m[1].trim() : null;
}

/** True if this log action is for a sale (recorded or updated). */
function isSaleLogAction(action: string): boolean {
  return (
    action === "activityLog.actions.saleRecorded" ||
    action === "activityLog.actions.saleUpdated" ||
    action === "Recorded a sale"
  );
}

/** True if this log action is for a service (created, updated, or deleted). */
function isServiceLogAction(action: string): boolean {
  return (
    action === "activityLog.actions.serviceCreated" ||
    action === "activityLog.actions.serviceUpdated" ||
    action === "activityLog.actions.serviceDeleted"
  );
}

/** All known action keys (for translated action search). */
const ACTIVITY_LOG_ACTION_KEYS = [
  "activityLog.actions.loggedIn",
  "activityLog.actions.loggedInActivationKey",
  "activityLog.actions.loggedOut",
  "activityLog.actions.userCreated",
  "activityLog.actions.userUpdated",
  "activityLog.actions.userDeleted",
  "activityLog.actions.passwordUpdated",
  "activityLog.actions.permissionsUpdated",
  "activityLog.actions.clientAdded",
  "activityLog.actions.clientUpdated",
  "activityLog.actions.clientDeleted",
  "activityLog.actions.supplierAdded",
  "activityLog.actions.supplierUpdated",
  "activityLog.actions.supplierDeleted",
  "activityLog.actions.saleRecorded",
  "activityLog.actions.saleUpdated",
  "activityLog.actions.saleDeleted",
  "activityLog.actions.versementRecorded",
  "activityLog.actions.creditRecorded",
  "activityLog.actions.paymentAdded",
  "activityLog.actions.paymentMarkedAsPaid",
  "activityLog.actions.paymentMarkedAsUnpaid",
  "activityLog.actions.paymentAmountUpdated",
  "activityLog.actions.versementCancelled",
  "activityLog.actions.productAdded",
  "activityLog.actions.productUpdated",
  "activityLog.actions.quantityAdded",
  "activityLog.actions.productDeleted",
  "activityLog.actions.billCreated",
  "activityLog.actions.billUpdated",
  "activityLog.actions.billDeleted",
  "activityLog.actions.billPaymentRecorded",
  "activityLog.actions.billPaymentDeleted",
  "activityLog.actions.serviceCreated",
  "activityLog.actions.serviceUpdated",
  "activityLog.actions.serviceDeleted",
  "activityLog.actions.backupCreated",
  "activityLog.actions.backupRestored",
  "activityLog.actions.cloudBackupUploaded",
  "activityLog.actions.cloudBackupDownloaded",
  "activityLog.actions.cloudBackupChecked",
  "activityLog.actions.cloudBackupAutoUploaded",
  "activityLog.actions.autoCloudBackupEnabled",
  "activityLog.actions.autoCloudBackupDisabled",
  "activityLog.actions.settingsUpdated",
  "activityLog.actions.receiptConfigUpdated",
  "activityLog.actions.printersConfigUpdated",
  "activityLog.actions.logRetentionUpdated",
  "activityLog.actions.logCleanupRun",
  "activityLog.actions.updateDownloadStarted",
  "activityLog.actions.updateDownloadCompleted",
  "activityLog.actions.updateDownloadCancelled",
  "activityLog.actions.updateInstallStarted",
];

function formatLogTime(createdAt: Date | string): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default function ActivityLogs() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  const [entries, setEntries] = useState<Array<{ id: string; username: string; action: string; details: string | null; createdAt: Date }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [retentionInput, setRetentionInput] = useState("90");
  const [savingRetention, setSavingRetention] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterUsername, setFilterUsername] = useState<string | "all">("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchAction, setSearchAction] = useState("");
  const [searchDetails, setSearchDetails] = useState("");
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [saleForModal, setSaleForModal] = useState<Sale | null>(null);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const didInitialCleanupRef = useRef(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const DETAILS_PREVIEW_LENGTH = 100;

  const handleSaleIdClick = async (saleId: string) => {
    if (!window.api?.database?.sales?.getById) return;
    setLoadingSale(true);
    try {
      const sale = await window.api.database.sales.getById(saleId);
      if (sale) {
        setSaleForModal(sale);
        setShowSaleDetailsModal(true);
      } else {
        showToast(t("activityLog.saleNotFound", "Sale not found"), "error");
      }
    } catch {
      showToast(t("activityLog.saleLoadFailed", "Failed to load sale"), "error");
    } finally {
      setLoadingSale(false);
    }
  };

  const handleServiceIdClick = (serviceId: string) => {
    navigate("/services", { state: { search: serviceId } });
  };

  /** Map legacy English action strings (stored in DB before we used keys) to translation keys so they display in current language */
  const getActionKey = (action: string) => {
    const legacy: Record<string, string> = {
      "Logged in": "activityLog.actions.loggedIn",
      "Logged in via activation key": "activityLog.actions.loggedInActivationKey",
      "Added client": "activityLog.actions.clientAdded",
      "Edited client": "activityLog.actions.clientUpdated",
      "Client deleted": "activityLog.actions.clientDeleted",
      "Supplier added": "activityLog.actions.supplierAdded",
      "Edited supplier": "activityLog.actions.supplierUpdated",
      "Supplier deleted": "activityLog.actions.supplierDeleted",
      "Recorded a sale": "activityLog.actions.saleRecorded",
      "Recorded a versement": "activityLog.actions.versementRecorded",
      "Created user": "activityLog.actions.userCreated",
      "Created manual backup": "activityLog.actions.backupCreated",
    };
    return legacy[action] ?? action;
  };

  /** Replace English (or stored) labels in details with translated labels for current language */
  const translateDetails = (raw: string | null): string => {
    if (raw == null || raw === "") return "—";
    let s = raw;
    const k = (key: string) => t(`activityLog.detailsLabels.${key}`, key);
    // Replace longer phrases first to avoid partial matches
    s = s.replace(/Payment: Versement \| Amount:/g, k("paymentVersementAmount"));
    s = s.replace(/Payment: Credit/g, k("paymentCredit"));
    s = s.replace(/Sale ID: /g, k("saleId") + " ");
    s = s.replace(/Service ID: /g, k("serviceId") + " ");
    s = s.replace(/Items \((\d+)\): /g, (_, n) => k("itemsCount") + "(" + n + "): ");
    s = s.replace(/Items: /g, k("items") + " ");
    s = s.replace(/^Items:\s*$/gm, k("items"));
    s = s.replace(/ Client: /g, " " + k("client") + " ");
    s = s.replace(/Client: /g, k("client") + " ");
    s = s.replace(/Subtotal: /g, k("subtotal") + " ");
    s = s.replace(/Discount: /g, k("discount") + " ");
    s = s.replace(/Total: /g, k("total") + " ");
    s = s.replace(/From cashier: /g, k("fromCashier") + " ");
    s = s.replace(/From cashier:\n/g, k("fromCashier") + "\n");
    s = s.replace(/From service form: /g, k("fromServiceForm") + " ");
    s = s.replace(/From service form:\n/g, k("fromServiceForm") + "\n");
    s = s.replace(/From stock form: /g, k("fromStockForm") + " ");
    s = s.replace(/From stock form:\n/g, k("fromStockForm") + "\n");
    s = s.replace(/During checkout: /g, k("duringCheckout") + " ");
    s = s.replace(/During checkout:\n/g, k("duringCheckout") + "\n");
    s = s.replace(/Credit amount: /g, k("creditAmount") + " ");
    // Sale-edit change descriptions (what the user did)
    s = s.replace(/Discount changed from (\d+(?:\.\d+)?) to (\d+(?:\.\d+)?)/g, (_, from, to) =>
      t("activityLog.detailsLabels.discountChangedFromTo", { from, to }));
    s = s.replace(/Discount added: /g, k("discountAdded") + ": ");
    s = s.replace(/Discount removed/g, k("discountRemoved"));
    s = s.replace(/^Added: /gm, k("itemAdded") + ": ");
    s = s.replace(/^Removed: /gm, k("itemRemoved") + ": ");
    s = s.replace(/\(no item or discount changes\)/g, `(${t("activityLog.detailsLabels.noItemOrDiscountChanges")})`);
    // Entity and field labels (edit details)
    s = s.replace(/^Supplier: /gm, k("supplier") + " ");
    s = s.replace(/^Bill: /gm, k("bill") + " ");
    s = s.replace(/^Service: /gm, k("service") + " ");
    s = s.replace(/^Product: /gm, k("product") + " ");
    s = s.replace(/^User: /gm, k("user") + " ");
    s = s.replace(/^Client: /gm, k("client") + " ");
    s = s.replace(/^Username: /gm, k("username") + " ");
    s = s.replace(/^Name: /gm, k("name") + " ");
    s = s.replace(/^Phone: /gm, k("phone") + " ");
    s = s.replace(/^Address: /gm, k("address") + " ");
    s = s.replace(/^Notes: /gm, k("notes") + " ");
    s = s.replace(/^Email: /gm, k("email") + " ");
    s = s.replace(/^Title: /gm, k("title") + " ");
    s = s.replace(/^Type: /gm, k("type") + " ");
    s = s.replace(/^Duration: /gm, k("duration") + " ");
    s = s.replace(/^Description: /gm, k("description") + " ");
    s = s.replace(/^Quantity: /gm, k("quantity") + " ");
    s = s.replace(/^Quantity added: /gm, k("quantityAdded") + " ");
    s = s.replace(/^New total quantity: /gm, k("newTotalQuantity") + " ");
    s = s.replace(/^Bought price: /gm, k("boughtPrice") + " ");
    s = s.replace(/^Selling price: /gm, k("sellingPrice") + " ");
    s = s.replace(/^Barcode: /gm, k("codebar") + " ");
    s = s.replace(/^Category: /gm, k("category") + " ");
    s = s.replace(/^Cost price: /gm, k("costPrice") + " ");
    s = s.replace(/^Service price: /gm, k("servicePrice") + " ");
    s = s.replace(/^Due date: /gm, k("dueDate") + " ");
    s = s.replace(/^Service type: /gm, k("serviceType") + " ");
    s = s.replace(/^Credit: /gm, k("credit") + " ");
    s = s.replace(/^Amount: /gm, k("amount") + " ");
    s = s.replace(/^Marked as paid$/gm, k("markedAsPaid"));
    s = s.replace(/^Marked as unpaid$/gm, k("markedAsUnpaid"));
    s = s.replace(/^Versement cancelled$/gm, k("versementCancelledLabel"));
    // Service payment status changes
    s = s.replace(/Payment: Unpaid → Paid/g, k("payment") + " " + t("activityLog.detailsLabels.paymentUnpaidToPaid", "Unpaid → Paid"));
    s = s.replace(/Payment: Paid → Unpaid/g, k("payment") + " " + t("activityLog.detailsLabels.paymentPaidToUnpaid", "Paid → Unpaid"));
    s = s.replace(/^Payment: Paid$/gm, k("payment") + " " + k("paid"));
    s = s.replace(/^Payment: Unpaid$/gm, k("payment") + " " + k("unpaid"));
    // Translate payment type values (Credit/Versement) when they appear at end of a line
    s = s.replace(/ Credit$/gm, " " + t("activityLog.detailsLabels.creditLabel", "Credit"));
    s = s.replace(/ Versement$/gm, " " + t("activityLog.detailsLabels.versementLabel", "Versement"));
    // Admin: settings option keys (option.lowStockThreshold -> translated label)
    const optionKeys = ["lowStockThreshold", "enableLowStockBadge", "enableOutOfStockBadge", "enableOverduePaymentsBadge", "enableDueSoonPaymentsBadge", "enableOverdueBillsBadge", "enableDueSoonBillsBadge", "enableOverdueServicesBadge", "enableDueSoonServicesBadge", "dueSoonThresholdDays", "dueSoonBillsThresholdDays", "dueSoonServicesThresholdDays", "cashierSalesHistoryDays", "enableCashierHistory", "enableCompletedServicesBadge", "categoriesRequiringInfo"];
    optionKeys.forEach((key) => {
      const labelKey = "option" + key.charAt(0).toUpperCase() + key.slice(1);
      s = s.replace(new RegExp("option\\." + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), t("activityLog.detailsLabels." + labelKey, key));
    });
    // Admin: receipt/store keys (receipt.storeName -> translated label)
    const receiptKeyToLabel: Record<string, string> = {
      storeName: "receiptStoreName", storeAddress: "receiptStoreAddress", storePhone: "receiptStorePhone",
      phoneNumbers: "receiptPhoneNumbers", footerMessage: "receiptFooterMessage", serviceTicketFooterMessage: "receiptServiceTicketFooterMessage",
      receiptLanguage: "receiptLanguage", storeLogo: "receiptStoreLogo", logoNeedsInversion: "receiptLogoInversion",
      logoSize: "receiptLogoSize", receiptPrinterName: "receiptReceiptPrinterName", labelPrinterName: "receiptLabelPrinterName",
    };
    Object.entries(receiptKeyToLabel).forEach(([key, labelKey]) => {
      s = s.replace(new RegExp("receipt\\." + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), t("activityLog.detailsLabels." + labelKey, key));
    });
    // Admin: permission keys in account details
    const permissionKeys = ["canAccessCashier", "canAccessStock", "canAccessClients", "canAccessBills", "canAccessHistory", "canAccessServices", "canAccessDashboard", "canManageUsers", "canViewLogs", "canManageSettings"];
    permissionKeys.forEach((key) => {
      const labelKey = "permission" + key.charAt(0).toUpperCase() + key.slice(1);
      s = s.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), t("activityLog.detailsLabels." + labelKey, key));
    });
    // Admin: log retention, cleanup, update details
    s = s.replace(/^Retention: /gm, k("retentionDays") + " ");
    s = s.replace(/^Entries removed: /gm, k("entriesRemoved") + " ");
    s = s.replace(/^Version: /gm, k("version") + " ");
    s = s.replace(/^Path: /gm, k("updateDownloadPath") + " ");
    s = s.replace(/ → /g, " " + t("activityLog.detailsLabels.previousToNew", " → ") + " ");
    return s;
  };

  const toggleDetails = (entryId: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const loadLogs = useCallback(async () => {
    if (!window.api?.activityLog?.getList) return;
    setLoading(true);
    try {
      const dateFrom = filterDateFrom ? `${filterDateFrom}T00:00:00` : null;
      const dateTo = filterDateTo ? `${filterDateTo}T23:59:59` : null;
      const actionTerm = searchAction.trim();
      const detailsTerm = searchDetails.trim();
      const actionKeys =
        actionTerm.length > 0
          ? ACTIVITY_LOG_ACTION_KEYS.filter((key) =>
              t(key).toLowerCase().includes(actionTerm.toLowerCase())
            )
          : undefined;
      const result = await window.api.activityLog.getList({
        username: filterUsername === "all" ? null : filterUsername,
        dateFrom,
        dateTo,
        searchAction: actionTerm || null,
        searchDetails: detailsTerm || null,
        actionKeys: actionKeys?.length ? actionKeys : undefined,
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      console.error("Load activity logs error", err);
      showToast(t("activityLog.errorLoad", "Failed to load logs"), "error");
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, filterUsername, filterDateFrom, filterDateTo, searchAction, searchDetails, showToast, t]);

  useEffect(() => {
    setPage(1);
  }, [itemsPerPage]);

  const loadUsernames = useCallback(async () => {
    if (!window.api?.activityLog?.getUsernames) return;
    try {
      const list = await window.api.activityLog.getUsernames();
      setUsernames(list);
    } catch {
      setUsernames([]);
    }
  }, []);

  const loadRetention = useCallback(async () => {
    if (!window.api?.activityLog?.getRetentionDays) return;
    try {
      const days = await window.api.activityLog.getRetentionDays();
      setRetentionDays(days);
      setRetentionInput(String(days));
    } catch {
      setRetentionDays(90);
      setRetentionInput("90");
    }
  }, []);

  useEffect(() => {
    loadUsernames();
    loadRetention();
  }, [loadUsernames, loadRetention]);

  // On entry: run retention cleanup once, then load data.
  useEffect(() => {
    if (didInitialCleanupRef.current) return;
    didInitialCleanupRef.current = true;
    if (!window.api?.activityLog?.cleanupOld) return;
    let cancelled = false;
    (async () => {
      setCleaning(true);
      try {
        const count = await window.api.activityLog.cleanupOld();
        const currentUser = userRef.current;
        if (!cancelled && count > 0 && currentUser?.username) {
          window.api?.activityLog?.log({
            username: currentUser.username,
            action: "activityLog.actions.logCleanupRun",
            details: `Entries removed: ${count}`,
          }).catch((): undefined => undefined);
        }
      } catch {
        showToast(t("activityLog.errorCleanup", "Cleanup failed"), "error");
      } finally {
        if (!cancelled) setCleaning(false);
      }
      if (cancelled) return;
      await loadRetention();
      await loadUsernames();
      await loadLogs();
      setHasInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRetention, loadUsernames, loadLogs, showToast, t]);

  useEffect(() => {
    if (!hasInitialized) return;
    loadLogs();
  }, [hasInitialized, loadLogs]);

  const handleSaveRetention = async () => {
    const num = parseInt(retentionInput, 10);
    if (!Number.isFinite(num) || num < 1 || num > 3650) {
      showToast(t("activityLog.invalidRetention", "Enter a number between 1 and 3650"), "error");
      return;
    }
    setSavingRetention(true);
    try {
      await window.api.activityLog.setRetentionDays(num);
      setRetentionDays(num);
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.logRetentionUpdated",
        details: `Retention: ${num} days`,
      }).catch((): undefined => undefined);
      showToast(t("activityLog.retentionSaved", "Retention days saved"), "success");
    } catch (err) {
      showToast(t("activityLog.errorSaveRetention", "Failed to save retention"), "error");
    } finally {
      setSavingRetention(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-500" />
            {t("activityLog.title", "Activity Logs")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("activityLog.description", "Every action in the app is recorded here. Filter by user, date, or search.")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {t("activityLog.entries", "Entries")} ({total})
          </CardTitle>
          <CardDescription>
            {t("activityLog.filtersDesc", "Filter by account, date range, or search in action and details.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleaning && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>
                {t("activityLog.cleanupOnEntryMessage", "Removing logs older than retention period. Please wait…")}
              </span>
            </div>
          )}

          {/* All filters inline, same height */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filterUsername}
                onValueChange={(v) => { setFilterUsername(v); setPage(1); }}
              >
                <SelectTrigger className="h-9 w-[180px] text-left [&>span:first-child]:text-left [&>span:first-child]:min-w-0" dir="ltr">
                  <SelectValue placeholder={t("activityLog.allUsers", "All users")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("activityLog.allUsers", "All users")}</SelectItem>
                  {usernames.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder={t("activityLog.searchActionPlaceholder", "Search action...")}
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadLogs())}
                className="h-9 w-[160px]"
              />
              <Input
                placeholder={t("activityLog.searchDetailsPlaceholder", "Search details...")}
                value={searchDetails}
                onChange={(e) => setSearchDetails(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadLogs())}
                className="h-9 w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t("history.from", "From")}:</span>
              <DatePicker
                value={filterDateFrom}
                onChange={(date) => { setFilterDateFrom(date); setPage(1); }}
                placeholder={t("history.from", "From")}
                className="h-9 w-[150px] text-sm"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t("history.to", "To")}:</span>
              <DatePicker
                value={filterDateTo}
                onChange={(date) => { setFilterDateTo(date); setPage(1); }}
                placeholder={t("history.to", "To")}
                className="h-9 w-[150px] text-sm"
                min={filterDateFrom || undefined}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("activityLog.rowsPerPage", "Rows per page:")}
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-3 min-w-[70px]"
                    aria-label={t("activityLog.selectRowsPerPage", "Select rows per page")}
                  >
                    {itemsPerPage}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[120px] p-0 z-50" align="end">
                  <Command shouldFilter={false}>
                    <CommandList>
                      <CommandGroup>
                        {ROWS_PER_PAGE_OPTIONS.map((size) => (
                          <CommandItem
                            key={size}
                            value={size.toString()}
                            onSelect={() => setItemsPerPage(size)}
                          >
                            {size}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                itemsPerPage === size ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Table */}
          {loading && entries.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {t("activityLog.noEntries", "No activity log entries match your filters.")}
            </p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                    <tr className="border-b">
                      <th className="text-left font-medium p-3 w-[160px]">{t("activityLog.time", "Time")}</th>
                      <th className="text-left font-medium p-3 w-[120px]">{t("activityLog.user", "User")}</th>
                      <th className="text-left font-medium p-3 w-[180px]">{t("activityLog.action", "Action")}</th>
                      <th className="text-left font-medium p-3">{t("activityLog.details", "Details")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-2 text-muted-foreground whitespace-nowrap">
                          {formatLogTime(entry.createdAt)}
                        </td>
                        <td className="p-2 font-medium">{entry.username}</td>
                        <td className="p-2">{t(getActionKey(entry.action), entry.action)}</td>
                        <td className="p-2 text-muted-foreground max-w-md align-top select-text">
                          {(() => {
                            const text = translateDetails(entry.details);
                            const isLong = text.length > DETAILS_PREVIEW_LENGTH;
                            const isExpanded = expandedDetails.has(entry.id);
                            const preview = isLong && !isExpanded
                              ? text.slice(0, DETAILS_PREVIEW_LENGTH).trim() + "…"
                              : text;
                            const saleId = extractSaleIdFromDetails(entry.details);
                            const serviceId = extractServiceIdFromDetails(entry.details);
                            const showSaleLink = saleId && isSaleLogAction(entry.action);
                            const showServiceLink = serviceId && isServiceLogAction(entry.action);
                            const linkId = showSaleLink ? saleId : showServiceLink ? serviceId : null;
                            const handleLinkClick = showSaleLink
                              ? () => handleSaleIdClick(saleId!)
                              : showServiceLink
                                ? () => handleServiceIdClick(serviceId!)
                                : undefined;
                            const renderContent = (content: string) => {
                              if (!linkId || !handleLinkClick) return content;
                              const i = content.indexOf(linkId);
                              if (i === -1) return content;
                              const before = content.slice(0, i);
                              const after = content.slice(i + linkId.length);
                              return (
                                <>
                                  {before}
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-primary underline hover:no-underline font-mono text-inherit"
                                    onClick={handleLinkClick}
                                    disabled={showSaleLink && loadingSale}
                                  >
                                    {linkId}
                                  </Button>
                                  {after}
                                </>
                              );
                            };
                            const displayText = isExpanded ? text : preview;
                            return (
                              <div className="flex items-start gap-2 min-w-0 select-text">
                                <span className={cn("break-words min-w-0 flex-1 select-text", !isExpanded && isLong && "line-clamp-1")}>
                                  {isExpanded ? (
                                    <span className="whitespace-pre-wrap block">{renderContent(text)}</span>
                                  ) : (
                                    <span title={text}>{renderContent(preview)}</span>
                                  )}
                                </span>
                                {isLong && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary hover:text-primary shrink-0"
                                    onClick={() => toggleDetails(entry.id)}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        {t("activityLog.hide", "Hide")}
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        {t("activityLog.viewFull", "View full")}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (() => {
                const renderPageNumbers = () => {
                  const items = [];
                  let start = Math.max(1, page - 2);
                  let end = Math.min(totalPages, page + 2);
                  if (page <= 3) {
                    end = Math.min(5, totalPages);
                  } else if (page >= totalPages - 2) {
                    start = Math.max(1, totalPages - 4);
                  }
                  if (start > 1) {
                    items.push(
                      <PaginationItem key="start-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>,
                    );
                  }
                  for (let i = start; i <= end; i++) {
                    items.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={i === page}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!loading) setPage(i);
                          }}
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>,
                    );
                  }
                  if (end < totalPages) {
                    items.push(
                      <PaginationItem key="end-ellipsis">
                        <PaginationEllipsis />
                      </PaginationItem>,
                    );
                  }
                  return items;
                };
                const isFirstPage = page === 1;
                const isLastPage = page === totalPages;
                const hasNoData = total === 0;
                return (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        {isFirstPage || hasNoData || loading ? (
                          <span className="opacity-50 pointer-events-none select-none">
                            <PaginationPrevious href="#" />
                          </span>
                        ) : (
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page - 1);
                            }}
                            href="#"
                          />
                        )}
                      </PaginationItem>
                      {renderPageNumbers()}
                      <PaginationItem>
                        {isLastPage || hasNoData || loading ? (
                          <span className="opacity-50 pointer-events-none select-none">
                            <PaginationNext href="#" />
                          </span>
                        ) : (
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(page + 1);
                            }}
                            href="#"
                          />
                        )}
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">{t("activityLog.retention", "Log retention")}</CardTitle>
              <CardDescription>
                {t("activityLog.retentionDesc", "Keep activity logs for this many days. Older entries are removed when you run cleanup.")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={3650}
                className="w-24"
                value={retentionInput}
                onChange={(e) => setRetentionInput(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">{t("activityLog.days", "days")}</span>
              <Button
                size="sm"
                onClick={handleSaveRetention}
                disabled={savingRetention}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {savingRetention ? t("activityLog.saving", "Saving...") : t("activityLog.save", "Save")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <SaleDetailsModal
        sale={saleForModal}
        isOpen={showSaleDetailsModal}
        onClose={() => {
          setShowSaleDetailsModal(false);
          setSaleForModal(null);
        }}
      />
    </div>
  );
}
