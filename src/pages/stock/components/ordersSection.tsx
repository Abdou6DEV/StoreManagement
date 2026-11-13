import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle, ChevronDown, ChevronUp, ClipboardList, CreditCard, Edit, PackageCheck, Plus, Search, TrendingUp, Trash2, Undo2, User, Users, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../lib/components/command";
import { DatePicker } from "../../../lib/components/datePicker";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../../../lib/components/pagination";
import { Tooltip } from "../../../lib/components/tooltip";
import { useToast } from "../../../lib/contexts/toastContext";
import { useOrderNotifications } from "../../../lib/contexts/orderNotificationsContext";
import { BadgeNotification } from "../../../lib/components/badgeNotification";
import type { OrderRecord } from "../../../lib/database/orderTypes";
import { getOrderDueState } from "../../../lib/utils/orderDueDates";
import { refreshOrdersWarmup, subscribeWarmup } from "../../../lib/warmup/appWarmup";
import { cn } from "../../../lib/utils";
import AddClientModal from "../../cashier/components/addClientModal";
import EditOrderModal from "./editOrderModal";

type Client = { id: string | null; name: string; phone?: string | null };
type OrderStatus = "pending" | "stocked" | "completed";
type Order = { id: string; product: string; details: string; quantity: string; client: Client; dueDate: string; upfront: string; status: OrderStatus };
const statusOrder: Record<OrderStatus, number> = { pending: 0, stocked: 1, completed: 2 };

export default function OrdersSection({ isActive = true, notificationAction, notificationKey }: { isActive?: boolean; notificationAction?: string; notificationKey?: string }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { overdueCount, dueSoonCount, overdueIds, dueSoonIds, dueSoonThresholdDays, markSeen } = useOrderNotifications();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [product, setProduct] = useState("");
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [upfront, setUpfront] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "overdue" | "dueSoon">("all");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [highlightedOrders, setHighlightedOrders] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "delete" | "complete" } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const clientButtonRef = useRef<HTMLButtonElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const paidAmountRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const focusOnEnter = (event: React.KeyboardEvent<HTMLInputElement>, next: HTMLElement | null) => {
    if (event.key === "Enter") {
      event.preventDefault();
      next?.focus();
    }
  };

  const toOrder = (record: OrderRecord): Order => ({
    id: record.id, product: record.productName, details: record.details, quantity: String(record.quantity),
    client: { id: record.clientId, name: record.clientName, phone: record.clientPhone },
    dueDate: record.dueDate, upfront: record.paidAmount === null ? "" : String(record.paidAmount / 100), status: record.status,
  });

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const records = await window.api.database.orders.getAll();
      setOrders(records.map(toOrder));
      setLoadError(false);
    } catch (error) {
      console.error("Error loading orders:", error);
      setLoadError(true);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  useEffect(() => subscribeWarmup(({ key, snapshot }) => {
    if (key === "orders" && snapshot.orders) setOrders(snapshot.orders.map(toOrder));
  }), []);

  useEffect(() => {
    if (notificationAction === "overdueOrders" || notificationAction === "dueSoonOrders") {
      setDateFilter(notificationAction === "overdueOrders" ? "overdue" : "dueSoon");
      setStatusFilter("all");
      setSearch("");
    }
  }, [notificationAction, notificationKey]);

  useEffect(() => {
    if (!isActive || dateFilter === "all" || loadingOrders || loadError) return;
    const ids = dateFilter === "overdue" ? overdueIds : dueSoonIds;
    if (ids.size > 0) {
      setHighlightedOrders(new Set(ids));
      markSeen(dateFilter);
    }
  }, [isActive, dateFilter, overdueIds, dueSoonIds, markSeen, loadingOrders, loadError]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    window.api.database.clients.getAll().then((result) => {
      if (active) setClients(result);
    }).catch((error) => { console.error("Error loading clients:", error); if (active) showToast(t("orders.clientLoadError", "Could not load clients."), "error"); });
    return () => { active = false; };
  }, [open]);

  const addClient = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const client = await window.api.database.clients.create({ name: clientName.trim(), phone: clientPhone.trim() || undefined, address: clientAddress.trim() || undefined, notes: clientNotes.trim() || undefined });
      setClients((current) => [...current, client]);
      setSelectedClient(client);
      setShowAddClient(false);
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientNotes("");
      showToast(t("clients.addSuccess", "Client added successfully"), "success");
      setTimeout(() => dateFieldRef.current?.querySelector("button")?.focus(), 0);
    } catch (error) {
      console.error("Error adding client:", error);
      showToast(t("clients.addError", "Failed to add client"), "error");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const resetForm = () => {
    setProduct("");
    setDetails("");
    setQuantity("");
    setSelectedClient(null);
    setDueDate("");
    setUpfront("");
    setFormKey((current) => current + 1);
  };

  const addOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current || !product.trim() || !selectedClient || !dueDate) return;
    const paidAmount = upfront.trim() === "" ? null : Math.round(Number(upfront) * 100);
    if (upfront && (!/^\d+(?:\.\d{1,2})?$/.test(upfront) || paidAmount === null || !Number.isSafeInteger(paidAmount) || paidAmount > 2147483647)) {
      showToast(t("orders.invalidAmount", "Enter a valid paid amount with at most two decimal places."), "error");
      return;
    }
    const values = { productName: product, details, quantity: Number(quantity), clientId: selectedClient.id, dueDate, paidAmount };
    busyRef.current = true;
    setBusy(true);
    try {
      const saved = await window.api.database.orders.create(values);
      setOrders((current) => [toOrder(saved), ...current]);
      void refreshOrdersWarmup();
      resetForm();
      showToast(t("orders.saved", "Order saved."), "success");
    } catch (error) {
      console.error("Error saving order:", error);
      showToast(t("orders.saveError", "Could not save the order. Please try again."), "error");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const changeOrder = async (id: string, action: "stocked" | "complete" | "cancelCompletion" | "cancelStocked" | "delete") => {
    if (busyRef.current) throw new Error("An order operation is already in progress");
    busyRef.current = true;
    setBusy(true);
    try {
      if (action === "delete") {
        await window.api.database.orders.delete(id);
        setOrders((current) => current.filter((order) => order.id !== id));
      } else {
        const status = action === "complete" ? "completed" : action === "cancelStocked" ? "pending" : "stocked";
        if (action === "cancelCompletion") await window.api.database.orders.cancelCompletion(id);
        else if (action === "cancelStocked") await window.api.database.orders.cancelStocked(id);
        else await window.api.database.orders.setStatus(id, status);
        setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
      }
      void refreshOrdersWarmup();
    } catch (error) {
      console.error("Error updating order:", error);
      showToast(t("orders.actionError", "Could not update the order. Please try again."), "error");
      await loadOrders();
      throw error;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const filteredClients = clients.filter((client) => `${client.name} ${client.phone || ""}`.toLowerCase().includes(clientSearch.toLowerCase()));
  const filteredOrders = orders
    .filter((order) => (statusFilter === "all" || order.status === statusFilter) && (dateFilter === "all" || getOrderDueState(order.dueDate, order.status, dueSoonThresholdDays) === dateFilter) && `${order.product} ${order.client.name} ${order.client.phone || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((first, second) => statusOrder[first.status] - statusOrder[second.status]);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const visibleOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageNumbers: number[] = [];
  let pageStart = Math.max(1, currentPage - 2);
  let pageEnd = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 3) pageEnd = Math.min(5, totalPages);
  else if (currentPage >= totalPages - 2) pageStart = Math.max(1, totalPages - 4);
  for (let page = pageStart; page <= pageEnd; page += 1) pageNumbers.push(page);
  const statusOptions: { value: "all" | OrderStatus; label: string }[] = [
    { value: "all", label: t("orders.allStatuses", "All statuses") },
    { value: "pending", label: t("orders.pending", "Pending") },
    { value: "stocked", label: t("orders.stocked", "Stocked") },
    { value: "completed", label: t("orders.completed", "Completed") },
  ];
  const dateOptions = [
    { value: "all" as const, label: t("services.allDates", "All Dates") },
    { value: "overdue" as const, label: t("services.overdue", "Overdue") },
    { value: "dueSoon" as const, label: t("services.dueSoon", "Due Soon") },
  ];
  const changePage = (page: number) => setCurrentPage(Math.max(1, Math.min(totalPages, page)));

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, dateFilter, itemsPerPage]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <>
      <section className="bg-card border border-border rounded-xl shadow-sm">
        <button type="button" disabled={busy} className="w-full flex items-center justify-between p-6 border-b border-border text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="flex items-center gap-3"><ClipboardList className="w-5 h-5 text-green-600" /><span className="text-lg font-bold text-foreground">{t("orders.addTitle", "Add Order")}</span></span>
          <ChevronUp className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && <div className="p-6 space-y-6">
          <form onSubmit={addOrder} className="space-y-6">
            <fieldset disabled={busy} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="space-y-2"><label htmlFor="order-product">{t("stock.product", "Product Name")}</label><input id="order-product" className={inputClass} value={product} onChange={(event) => setProduct(event.target.value)} onKeyDown={(event) => focusOnEnter(event, document.getElementById("order-details"))} placeholder={t("stock.product", "Product Name")} required /></div>
              <div className="space-y-2"><label htmlFor="order-details">{t("orders.details", "Details")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label><input id="order-details" className={inputClass} value={details} onChange={(event) => setDetails(event.target.value)} onKeyDown={(event) => focusOnEnter(event, document.getElementById("order-quantity"))} placeholder={t("orders.detailsPlaceholder", "Color, size, etc.")} /></div>
              <div className="space-y-2"><label htmlFor="order-quantity">{t("stock.quantity", "Quantity")}</label><input id="order-quantity" type="number" min="1" step="1" className={inputClass} value={quantity} onChange={(event) => setQuantity(event.target.value)} onKeyDown={(event) => focusOnEnter(event, clientButtonRef.current)} placeholder={t("stock.quantity", "Quantity")} required /></div>
              <div className="space-y-2"><label>{t("services.client", "Client")}</label><div className="flex min-w-0 gap-2">
                <Popover open={clientPopoverOpen} onOpenChange={(value) => { setClientPopoverOpen(value); if (value) setClientSearch(""); }}>
                  <PopoverTrigger asChild><Button ref={clientButtonRef} type="button" variant="outline" className="h-12 min-w-0 flex-1 justify-start px-4 py-3 text-sm" aria-label={t("services.client", "Client")}><span className="truncate">{selectedClient?.name || t("services.searchClient", "Search for client")}</span><ChevronDown className="ml-auto h-4 w-4 shrink-0" /></Button></PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50"><Command shouldFilter={false}>
                    <div className="flex w-full items-center border-b [&>[data-slot=command-input-wrapper]]:min-w-0 [&>[data-slot=command-input-wrapper]]:flex-1 [&>[data-slot=command-input-wrapper]]:border-b-0"><CommandInput placeholder={t("services.searchClient", "Search for client")} className="h-9 border-0" value={clientSearch} onValueChange={setClientSearch} /><Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0 mr-1" title={t("cashier.addNewClient", "Add New Client")} onClick={() => { setClientPopoverOpen(false); setShowAddClient(true); }}><Plus className="w-4 h-4" /></Button></div>
                    <CommandList><CommandGroup>{filteredClients.map((client) => <CommandItem key={client.id} value={client.name} onSelect={() => { setSelectedClient(client); setClientPopoverOpen(false); setTimeout(() => dateFieldRef.current?.querySelector("button")?.focus(), 0); }}><User className="w-4 h-4 mr-2" /><div className="flex-1"><div className="font-medium">{client.name}</div>{client.phone && <div className="text-sm text-muted-foreground">{client.phone}</div>}</div><Check className={cn("ml-auto h-4 w-4", selectedClient?.id === client.id ? "opacity-100" : "opacity-0")} /></CommandItem>)}</CommandGroup></CommandList>
                  </Command></PopoverContent>
                </Popover>
                <Button type="button" variant="outline" className="h-12 shrink-0 px-3 flex items-center justify-center gap-1" title={t("cashier.addNewClient", "Add New Client")} aria-label={t("cashier.addNewClient", "Add New Client")} onClick={() => setShowAddClient(true)}><Users className="w-4 h-4" /><Plus className="w-4 h-4" /></Button>
              </div></div>
              <div ref={dateFieldRef} className="space-y-2"><label>{t("services.dueDate", "Due Date")}</label><DatePicker key={formKey} value={dueDate} onChange={(date) => { setDueDate(date); setTimeout(() => paidAmountRef.current?.focus(), 0); }} min={today} placeholder={t("orders.selectDueDate", "Select due date")} className={`${inputClass} h-12`} /></div>
              <div className="space-y-2"><label htmlFor="order-upfront">{t("orders.upfrontPayment", "Paid Amount")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label><input ref={paidAmountRef} id="order-upfront" type="number" min="0" step="0.01" className={inputClass} value={upfront} onChange={(event) => setUpfront(event.target.value)} onKeyDown={(event) => focusOnEnter(event, submitButtonRef.current)} placeholder={t("orders.paidAmountPlaceholder", "Enter paid amount")} /></div>
            </div>
            <div className="flex gap-2"><Button ref={submitButtonRef} type="submit" disabled={busy || loadError || loadingOrders || !selectedClient || !dueDate} className="gap-2 bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4" />{t("orders.addTitle", "Add Order")}</Button></div>
            </fieldset>
          </form>
        </div>}
      </section>
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3"><div className="flex items-center gap-3"><ClipboardList className="w-7 h-7 text-green-600" /><h2 className="text-2xl font-bold">{t("orders.tableTitle", "Orders")}</h2></div></div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full max-w-[350px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" /><input className="w-full pl-9 pr-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("orders.search", "Search by product or client...")} aria-label={t("orders.search", "Search by product or client...")} /></div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("stock.itemsPerPage", "Items per page:")}</span>
            <Popover open={pageSizeOpen} onOpenChange={setPageSizeOpen}>
              <PopoverTrigger asChild><Button variant="outline" className="px-3 py-1.5 min-w-[70px]" aria-label={t("stock.selectItemsPerPage", "Select items per page")}>{itemsPerPage}<ChevronDown className="ml-2 w-4 h-4" /></Button></PopoverTrigger>
              <PopoverContent className="w-[120px] p-0 z-50"><Command shouldFilter={false}><CommandList><CommandGroup>{[5, 10, 25, 50, 100].map((size) => <CommandItem key={size} value={String(size)} onSelect={() => { setItemsPerPage(size); setPageSizeOpen(false); }} >{size}<Check className={cn("ml-auto h-4 w-4", itemsPerPage === size ? "opacity-100" : "opacity-0")} /></CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
            </Popover>
          </div>
          <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="px-3 py-1.5" aria-label={t("orders.filterStatus", "Filter by status")}>
                {statusOptions.find((option) => option.value === statusFilter)?.label}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[160px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    {statusOptions.map((option) => (
                      <CommandItem key={option.value} value={option.value} onSelect={() => { setStatusFilter(option.value); setStatusDropdownOpen(false); }}>
                        {option.label}
                        <Check className={cn("ml-auto h-4 w-4", statusFilter === option.value ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Popover open={dateDropdownOpen} onOpenChange={setDateDropdownOpen}>
            <div className="relative inline-block">
              <PopoverTrigger asChild><Button variant="outline" className="px-3 py-1.5" aria-label={t("services.filterByDate", "Filter by date")}>{dateOptions.find((option) => option.value === dateFilter)?.label}<ChevronDown className="ml-2 w-4 h-4" /></Button></PopoverTrigger>
              {overdueCount > 0 && <BadgeNotification count={overdueCount} variant="red" className="pointer-events-none -top-1 -right-1 translate-x-0 translate-y-0 rtl:right-auto rtl:-left-1 rtl:translate-x-0" />}
              {overdueCount === 0 && dueSoonCount > 0 && <BadgeNotification count={dueSoonCount} variant="orange" className="pointer-events-none -top-1 -right-1 translate-x-0 translate-y-0 rtl:right-auto rtl:-left-1 rtl:translate-x-0" />}
            </div>
            <PopoverContent className="w-[160px] p-0 z-50"><Command shouldFilter={false}><CommandList><CommandGroup>{dateOptions.map((option) => <CommandItem key={option.value} value={option.value} className={cn(((option.value === "overdue" && overdueCount > 0) || (option.value === "dueSoon" && dueSoonCount > 0)) && "pr-12")} onSelect={() => { setDateFilter(option.value); setHighlightedOrders(new Set()); setDateDropdownOpen(false); }}><span className="flex-1">{option.label}</span><Check className={cn("h-4 w-4", dateFilter === option.value ? "opacity-100" : "opacity-0")} />{option.value === "overdue" && overdueCount > 0 && <BadgeNotification count={overdueCount} variant="red" className="pointer-events-none top-0 right-1 translate-x-0 translate-y-0 rtl:right-1 rtl:left-auto rtl:translate-x-0" />}{option.value === "dueSoon" && dueSoonCount > 0 && <BadgeNotification count={dueSoonCount} variant="orange" className="pointer-events-none top-0 right-1 translate-x-0 translate-y-0 rtl:right-1 rtl:left-auto rtl:translate-x-0" />}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent>
          </Popover>
        </div>
        <div className="table-container relative overflow-auto rounded-lg border border-muted">
          <table className={`min-w-full text-sm ${i18n.language === "ar" ? "text-right" : "text-left"}`}>
            <thead className="bg-muted text-muted-foreground"><tr>{[t("stock.product", "Product Name"), t("orders.details", "Details"), t("stock.quantity", "Quantity"), t("services.client", "Client"), t("services.status", "Status"), t("services.dueDate", "Due Date"), t("orders.upfrontPayment", "Paid Amount"), t("services.actions", "Actions")].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {loadingOrders || loadError ? <tr><td colSpan={8} className="px-4 py-12 text-center"><p>{loadingOrders ? t("common.loading", "Loading...") : t("orders.loadError", "Could not load orders.")}</p>{loadError && <Button type="button" variant="outline" className="mt-3" onClick={() => void loadOrders()}>{t("common.retry", "Retry")}</Button>}</td></tr> : filteredOrders.length === 0 ? <tr><td colSpan={8} className="p-0 text-center align-middle"><div className="flex flex-col items-center justify-center gap-3 px-4 py-16"><ClipboardList className="w-12 h-12 text-green-600 mb-1" /><h3 className="text-xl font-semibold text-foreground">{t("orders.empty", "No orders found")}</h3></div></td></tr> : visibleOrders.map((order) => {
                const dueState = getOrderDueState(order.dueDate, order.status, dueSoonThresholdDays);
                const statusClass = order.status === "pending" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" : order.status === "stocked" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
                return <tr key={order.id} className={`min-h-[48px] hover:bg-muted/40 transition ${highlightedOrders.has(order.id) && dateFilter !== "all" ? dueState === "overdue" ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500" : "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500" : ""}`}>
                  <td className="px-4 py-2 align-top font-medium"><div className="max-w-[180px] whitespace-normal break-words [overflow-wrap:anywhere]" title={order.product}>{order.product}</div></td>
                  <td className="px-4 py-2 align-top"><div className="max-w-[220px] whitespace-normal break-words [overflow-wrap:anywhere]" title={order.details}>{order.details || "-"}</div></td>
                  <td className="px-4 py-2 align-top whitespace-nowrap">{order.quantity}</td>
                  <td className="px-4 py-2 align-top"><div className="max-w-[150px] whitespace-normal break-words [overflow-wrap:anywhere] font-medium" title={order.client.name}>{order.client.name}</div>{order.client.phone && <div className="max-w-[150px] whitespace-normal break-words [overflow-wrap:anywhere] text-sm text-muted-foreground" title={order.client.phone}>{order.client.phone}</div>}</td>
                  <td className="px-4 py-2 align-top"><span className={`inline-flex whitespace-nowrap text-xs px-2 py-1 rounded-full ${statusClass}`}>{t(`orders.${order.status}`, order.status)}</span></td>
                  <td className="px-4 py-2 align-top whitespace-nowrap"><div className="flex items-center gap-2"><span>{order.dueDate.split("-").reverse().join("/")}</span>{dueState === "overdue" && <span className="inline-flex whitespace-nowrap text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{t("services.overdue", "Overdue")}</span>}{dueState === "dueSoon" && <span className="inline-flex whitespace-nowrap text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">{t("services.dueSoon", "Due Soon")}</span>}</div></td>
                  <td className="px-4 py-2 align-top whitespace-nowrap">{order.upfront && Number(order.upfront) > 0 ? <span className="font-bold text-blue-600 dark:text-blue-400">{Number(order.upfront).toLocaleString("fr-FR")} {t("common.currency", "DA")}</span> : "-"}</td>
                  <td className="px-4 py-2 align-top whitespace-nowrap"><div className="flex flex-nowrap gap-2">
                    {order.status === "pending" && <Tooltip content={t("orders.markStocked", "Mark as stocked")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("orders.markStocked", "Mark as stocked")} className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30" onClick={() => void changeOrder(order.id, "stocked").catch((): void => undefined)}><PackageCheck className="w-3 h-3" /></Button></Tooltip>}
                    {order.status === "stocked" && <Tooltip content={t("orders.cancelStocked", "Cancel stocked status")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("orders.cancelStocked", "Cancel stocked status")} className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30" onClick={() => void changeOrder(order.id, "cancelStocked").catch((): void => undefined)}><Undo2 className="w-3 h-3" /></Button></Tooltip>}
                    {order.status === "stocked" && <Tooltip content={t("orders.markCompleted", "Mark as completed")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("orders.markCompleted", "Mark as completed")} className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30" onClick={() => setConfirmAction({ id: order.id, action: "complete" })}><CheckCircle className="w-3 h-3" /></Button></Tooltip>}
                    {order.status === "completed" && <Tooltip content={t("services.cancelCompletionTooltip", "Cancel completion")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("services.cancelCompletionTooltip", "Cancel completion")} className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30" onClick={() => void changeOrder(order.id, "cancelCompletion").catch((): void => undefined)}><XCircle className="w-3 h-3" /></Button></Tooltip>}
                    {order.status !== "completed" && <Tooltip content={t("orders.editTitle", "Edit Order")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("orders.editTitle", "Edit Order")} className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30" onClick={() => setEditingOrder(order)}><Edit className="w-3 h-3" /></Button></Tooltip>}
                    <Tooltip content={t("orders.deleteTitle", "Delete Order")}><Button type="button" variant="outline" size="sm" disabled={busy} aria-label={t("orders.deleteTitle", "Delete Order")} className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30" onClick={() => setConfirmAction({ id: order.id, action: "delete" })}><Trash2 className="w-3 h-3" /></Button></Tooltip>
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <Pagination className="mt-6"><PaginationContent>
          <PaginationItem>{currentPage === 1 ? <span className="opacity-50 pointer-events-none select-none"><PaginationPrevious href="#" /></span> : <PaginationPrevious href="#" onClick={(event) => { event.preventDefault(); changePage(currentPage - 1); }} />}</PaginationItem>
          {pageStart > 1 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
          {pageNumbers.map((page) => <PaginationItem key={page}><PaginationLink href="#" isActive={page === currentPage} onClick={(event) => { event.preventDefault(); changePage(page); }}>{page}</PaginationLink></PaginationItem>)}
          {pageEnd < totalPages && <PaginationItem><PaginationEllipsis /></PaginationItem>}
          <PaginationItem>{currentPage === totalPages ? <span className="opacity-50 pointer-events-none select-none"><PaginationNext href="#" /></span> : <PaginationNext href="#" onClick={(event) => { event.preventDefault(); changePage(currentPage + 1); }} />}</PaginationItem>
        </PaginationContent></Pagination>}
        {!loadingOrders && !loadError && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-10 text-sm">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("orders.totalOrders", "Total Orders")}:</span>
              <span className="font-medium text-[0.9375rem]">{filteredOrders.length.toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("stock.totalQuantity", "Total Quantity")}:</span>
              <span className="font-medium text-[0.9375rem]">{filteredOrders.reduce((sum, order) => sum + Number(order.quantity), 0).toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("orders.totalPaidAmount", "Total Paid Amount")}:</span>
              <span className="font-medium text-[0.9375rem]">{(filteredOrders.reduce((sum, order) => sum + Math.round(Number(order.upfront || 0) * 100), 0) / 100).toLocaleString("fr-FR")} {t("cashier.currency", "DA")}</span>
            </div>
          </div>
        )}
      </section>
      <ConfirmDialog open={confirmAction !== null} onOpenChange={(value) => { if (!value && !busy) setConfirmAction(null); }} title={confirmAction?.action === "delete" ? t("orders.deleteTitle", "Delete Order") : t("orders.completeTitle", "Complete Order")} message={confirmAction?.action === "delete" ? t("orders.deleteConfirm", "Delete this order?") : t("orders.completeConfirm", "Confirm that the client collected this order?")} confirmText={confirmAction?.action === "delete" ? t("common.delete", "Delete") : t("orders.completed", "Completed")} variant={confirmAction?.action === "delete" ? "danger" : "success"} loading={busy} onConfirm={async () => { if (confirmAction) await changeOrder(confirmAction.id, confirmAction.action); }} />
      {editingOrder && <EditOrderModal order={editingOrder} onClose={() => setEditingOrder(null)} onSaved={(saved) => { setOrders((current) => current.map((order) => order.id === saved.id ? toOrder(saved) : order)); setEditingOrder(null); void refreshOrdersWarmup(); }} />}
      <AddClientModal open={showAddClient} onClose={() => { if (!busy) setShowAddClient(false); }} clientName={clientName} setClientName={setClientName} clientPhone={clientPhone} setClientPhone={setClientPhone} clientAddress={clientAddress} setClientAddress={setClientAddress} clientNotes={clientNotes} setClientNotes={setClientNotes} t={t} onConfirm={() => void addClient()} />
    </>
  );
}