import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  Search,
  User,
  Calendar,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
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
import { ScrollArea } from "../../../../lib/components/scrollArea";
import { cn } from "../../../../lib/utils";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

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
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [filterUsername, setFilterUsername] = useState<string | "all">("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  const DETAILS_PREVIEW_LENGTH = 100;

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
      const result = await window.api.activityLog.getList({
        username: filterUsername === "all" ? null : filterUsername,
        dateFrom,
        dateTo,
        search: searchTerm.trim() || null,
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
  }, [page, itemsPerPage, filterUsername, filterDateFrom, filterDateTo, searchTerm, showToast, t]);

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

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

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
      showToast(t("activityLog.retentionSaved", "Retention days saved"), "success");
    } catch (err) {
      showToast(t("activityLog.errorSaveRetention", "Failed to save retention"), "error");
    } finally {
      setSavingRetention(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const deleted = await window.api.activityLog.cleanupOld();
      showToast(
        t("activityLog.cleanupDone", "Cleaned {{count}} old log entries", { count: deleted }),
        "success"
      );
      await loadLogs();
      await loadUsernames();
    } catch (err) {
      showToast(t("activityLog.errorCleanup", "Cleanup failed"), "error");
    } finally {
      setCleaning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
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
          {/* Filters + Rows per page + Refresh in one row */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 flex-1 min-w-0">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {t("activityLog.user", "User")}
                </label>
                <Select
                  value={filterUsername}
                  onValueChange={(v) => { setFilterUsername(v); setPage(1); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("activityLog.allUsers", "All users")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("activityLog.allUsers", "All users")}</SelectItem>
                    {usernames.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("activityLog.dateFrom", "From date")}
                </label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("activityLog.dateTo", "To date")}</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Search className="h-3.5 w-3.5" />
                  {t("activityLog.search", "Search")}
                </label>
                <Input
                  placeholder={t("activityLog.searchPlaceholder", "Search in action or details...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (setPage(1), loadLogs())}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("activityLog.rowsPerPage", "Rows per page:")}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1.5 min-w-[70px]"
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
              <Button size="sm" onClick={() => { setPage(1); loadLogs(); }} disabled={loading}>
                {t("activityLog.applyFilters", "Apply filters")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilterUsername("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setSearchTerm("");
                  setPage(1);
                }}
              >
                {t("activityLog.clearFilters", "Clear")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPage(1); loadLogs(); }}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                {t("activityLog.refresh", "Refresh")}
              </Button>
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
              <ScrollArea className="h-[min(65vh,700px)] min-h-[420px] rounded-md border">
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
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {formatLogTime(entry.createdAt)}
                        </td>
                        <td className="p-3 font-medium">{entry.username}</td>
                        <td className="p-3">{entry.action}</td>
                        <td className="p-3 text-muted-foreground max-w-md align-top">
                          {(() => {
                            const text = entry.details ?? "—";
                            const isLong = text.length > DETAILS_PREVIEW_LENGTH;
                            const isExpanded = expandedDetails.has(entry.id);
                            const preview = isLong && !isExpanded
                              ? text.slice(0, DETAILS_PREVIEW_LENGTH).trim() + "…"
                              : text;
                            return (
                              <div className="space-y-1">
                                <span className={!isExpanded && isLong ? "line-clamp-1" : ""}>
                                  {isExpanded ? (
                                    <span className="whitespace-pre-wrap break-words block">{text}</span>
                                  ) : (
                                    <span className="break-words" title={text}>{preview}</span>
                                  )}
                                </span>
                                {isLong && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary hover:text-primary"
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
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("activityLog.pageInfo", "Page {{page}} of {{total}}", { page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("activityLog.previous", "Previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={!hasNext || loading}
                    >
                      {t("activityLog.next", "Next")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
              <Button size="sm" onClick={handleSaveRetention} disabled={savingRetention}>
                {savingRetention ? t("activityLog.saving", "Saving...") : t("activityLog.save", "Save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCleanup}
                disabled={cleaning}
              >
                <Trash2 className="h-4 w-4" />
                {cleaning ? t("activityLog.cleaning", "Cleaning...") : t("activityLog.cleanup", "Clean old")}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
