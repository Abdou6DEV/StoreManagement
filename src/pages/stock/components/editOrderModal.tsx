import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Edit, Plus, User, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../lib/components/command";
import { DatePicker } from "../../../lib/components/datePicker";
import { FormModal } from "../../../lib/components/modal";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { useToast } from "../../../lib/contexts/toastContext";
import type { OrderRecord } from "../../../lib/database/orderTypes";
import { cn } from "../../../lib/utils";
import AddClientModal from "../../cashier/components/addClientModal";

type Client = { id: string | null; name: string; phone?: string | null };
type EditableOrder = { id: string; product: string; details: string; quantity: string; client: Client; dueDate: string; upfront: string };

export default function EditOrderModal({ order, onClose, onSaved }: { order: EditableOrder; onClose: () => void; onSaved: (order: OrderRecord) => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [product, setProduct] = useState(order.product);
  const [details, setDetails] = useState(order.details);
  const [quantity, setQuantity] = useState(order.quantity);
  const [client, setClient] = useState<Client>(order.client);
  const [dueDate, setDueDate] = useState(order.dueDate);
  const [upfront, setUpfront] = useState(order.upfront);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const busyRef = useRef(false);
  const clientButtonRef = useRef<HTMLButtonElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);
  const paidAmountRef = useRef<HTMLInputElement>(null);
  const focusOnEnter = (event: React.KeyboardEvent<HTMLInputElement>, next: HTMLElement | null) => {
    if (event.key === "Enter") {
      event.preventDefault();
      next?.focus();
    }
  };
  const dirty = product !== order.product || details !== order.details || quantity !== order.quantity || client.id !== order.client.id || dueDate !== order.dueDate || upfront !== order.upfront;
  const inputClass = "w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    let active = true;
    window.api.database.clients.getAll().then((result) => { if (active) setClients(result); }).catch((error) => {
      console.error("Error loading clients:", error);
      if (active) showToast(t("orders.clientLoadError", "Could not load clients."), "error");
    });
    return () => { active = false; };
  }, []);

  const addClient = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const created = await window.api.database.clients.create({ name: clientName.trim(), phone: clientPhone.trim() || undefined, address: clientAddress.trim() || undefined, notes: clientNotes.trim() || undefined });
      setClients((current) => [...current, created]);
      setClient(created);
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientNotes("");
      setShowAddClient(false);
      showToast(t("clients.addSuccess", "Client added successfully"), "success");
      setTimeout(() => dateFieldRef.current?.querySelector("button")?.focus(), 0);
    } catch (error) {
      console.error("Error adding client:", error);
      showToast(t("clients.addError", "Failed to add client"), "error");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const save = async () => {
    if (busyRef.current || !product.trim() || !dueDate || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 2147483647) return;
    const paidAmount = upfront.trim() === "" ? null : Math.round(Number(upfront) * 100);
    if (upfront && (!/^\d+(?:\.\d{1,2})?$/.test(upfront) || !Number.isSafeInteger(paidAmount) || paidAmount > 2147483647)) {
      showToast(t("orders.invalidAmount", "Enter a valid paid amount with at most two decimal places."), "error");
      return;
    }
    busyRef.current = true;
    setLoading(true);
    try {
      const saved = await window.api.database.orders.update(order.id, { productName: product, details, quantity: Number(quantity), clientId: client.id, dueDate, paidAmount });
      showToast(t("orders.saved", "Order saved."), "success");
      onSaved(saved);
    } catch (error) {
      console.error("Error saving order:", error);
      showToast(t("orders.saveError", "Could not save the order. Please try again."), "error");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((item) => `${item.name} ${item.phone || ""}`.toLowerCase().includes(clientSearch.toLowerCase()));

  return <>
    <FormModal open onClose={onClose} title={t("orders.editTitle", "Edit Order")} subtitle={order.product} icon={<Edit className="w-5 h-5 text-green-600" />} size="lg" className="min-w-[85%]" showCloseButton={false} hasUnsavedChanges={dirty} loading={loading} submitDisabled={!product.trim() || !dueDate || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 2147483647} onSubmit={() => void save()} submitText={t("orders.saveChanges", "Save Changes")} submitButtonClassName="bg-green-600 hover:bg-green-700 text-white" cancelText={t("common.cancel", "Cancel")}>
      <p className="text-sm text-muted-foreground">{t("orders.paymentReminder", "Paid amount is a reminder only. It is not recorded as a payment or deducted at checkout.")}</p>
      <fieldset disabled={loading} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="space-y-2"><label htmlFor="edit-order-product">{t("stock.product", "Product Name")}</label><input id="edit-order-product" className={inputClass} value={product} onChange={(event) => setProduct(event.target.value)} onKeyDown={(event) => focusOnEnter(event, document.getElementById("edit-order-details"))} required /></div>
        <div className="space-y-2"><label htmlFor="edit-order-details">{t("orders.details", "Details")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label><input id="edit-order-details" className={inputClass} value={details} onChange={(event) => setDetails(event.target.value)} onKeyDown={(event) => focusOnEnter(event, document.getElementById("edit-order-quantity"))} placeholder={t("orders.detailsPlaceholder", "Color, size, etc.")} /></div>
        <div className="space-y-2"><label htmlFor="edit-order-quantity">{t("stock.quantity", "Quantity")}</label><input id="edit-order-quantity" type="number" min="1" max="2147483647" step="1" className={inputClass} value={quantity} onChange={(event) => setQuantity(event.target.value)} onKeyDown={(event) => focusOnEnter(event, clientButtonRef.current)} required /></div>
        <div className="space-y-2"><label>{t("services.client", "Client")}</label><div className="flex min-w-0 gap-2">
          <Popover open={clientPopoverOpen} onOpenChange={(value) => { setClientPopoverOpen(value); if (value) setClientSearch(""); }}>
            <PopoverTrigger asChild><Button ref={clientButtonRef} type="button" variant="outline" className="h-12 min-w-0 flex-1 justify-start px-4 py-3 text-sm" aria-label={t("services.client", "Client")}><span className="truncate">{client.name}</span><ChevronDown className="ml-auto h-4 w-4 shrink-0" /></Button></PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50"><Command shouldFilter={false}>
              <div className="flex w-full items-center border-b [&>[data-slot=command-input-wrapper]]:min-w-0 [&>[data-slot=command-input-wrapper]]:flex-1 [&>[data-slot=command-input-wrapper]]:border-b-0"><CommandInput placeholder={t("services.searchClient", "Search for client")} className="h-9 border-0" value={clientSearch} onValueChange={setClientSearch} /><Button type="button" variant="ghost" size="sm" className="h-9 w-9 shrink-0 p-0 mr-1" title={t("cashier.addNewClient", "Add New Client")} aria-label={t("cashier.addNewClient", "Add New Client")} onClick={() => { setClientPopoverOpen(false); setShowAddClient(true); }}><Plus className="w-4 h-4" /></Button></div>
              <CommandList><CommandGroup>{filteredClients.map((item) => <CommandItem key={item.id} value={item.name} onSelect={() => { setClient(item); setClientPopoverOpen(false); setTimeout(() => dateFieldRef.current?.querySelector("button")?.focus(), 0); }}><User className="w-4 h-4 mr-2" /><div className="flex-1"><div className="font-medium">{item.name}</div>{item.phone && <div className="text-sm text-muted-foreground">{item.phone}</div>}</div><Check className={cn("ml-auto h-4 w-4", client.id === item.id ? "opacity-100" : "opacity-0")} /></CommandItem>)}</CommandGroup></CommandList>
            </Command></PopoverContent>
          </Popover>
          <Button type="button" variant="outline" className="h-12 shrink-0 px-3 flex items-center justify-center gap-1" title={t("cashier.addNewClient", "Add New Client")} aria-label={t("cashier.addNewClient", "Add New Client")} onClick={() => setShowAddClient(true)}><Users className="w-4 h-4" /><Plus className="w-4 h-4" /></Button>
        </div></div>
        <div ref={dateFieldRef} className="space-y-2"><label>{t("services.dueDate", "Due Date")}</label><DatePicker value={dueDate} onChange={(date) => { setDueDate(date); setTimeout(() => paidAmountRef.current?.focus(), 0); }} min={today} placeholder={t("orders.selectDueDate", "Select due date")} className={`${inputClass} h-12`} /></div>
        <div className="space-y-2"><label htmlFor="edit-order-upfront">{t("orders.upfrontPayment", "Paid Amount")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label><input ref={paidAmountRef} id="edit-order-upfront" type="number" min="0" step="0.01" className={inputClass} value={upfront} onChange={(event) => setUpfront(event.target.value)} placeholder={t("orders.paidAmountPlaceholder", "Enter paid amount")} /></div>
      </fieldset>
    </FormModal>
    <AddClientModal open={showAddClient} onClose={() => { if (!loading) setShowAddClient(false); }} clientName={clientName} setClientName={setClientName} clientPhone={clientPhone} setClientPhone={setClientPhone} clientAddress={clientAddress} setClientAddress={setClientAddress} clientNotes={clientNotes} setClientNotes={setClientNotes} t={t} onConfirm={() => void addClient()} />
  </>;
}