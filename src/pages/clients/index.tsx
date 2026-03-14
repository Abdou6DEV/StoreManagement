import React, { useEffect, useState } from "react";
import {
  Users,
  Loader2,
  CreditCard,
  ChevronDown,
  Check,
  Package,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import ClientsTable from "./components/clientsTable";
import EditClientDialog from "./components/editClientModal";
import AddClientForm from "./components/addClientForm";
import AddPaymentForm from "./components/addPaymentForm";
import AddSupplierForm from "./components/addSupplierForm";
import SuppliersTable from "./components/suppliersTable";
import EditSupplierModal from "./components/editSupplierModal";
import SupplierSearchBar from "./components/supplierSearchBar";
import SupplierPurchasesModal from "./components/supplierPurchasesModal";
import ClientDetailsModal from "../../lib/components/clientDetailsModal";
import AllPaymentsView from "./components/allPaymentsView";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../lib/components/pagination";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../lib/components/popover";
import type { Client, Seller } from "@prisma/client";
import type { ClientWithTotalPurchases, PaymentWithClient } from "../../types";
import { useToast } from "../../lib/contexts/toastContext";
import { useAuth } from "../../lib/contexts/authContext";
import { useOverduePayments } from "../../lib/contexts/overduePaymentsContext";
import { useDueSoonPayments } from "../../lib/contexts/dueSoonPaymentsContext";
import { BadgeNotification } from "../../lib/components/badgeNotification";
import { ConfirmDialog } from "../../lib/components/confirmDialog";
import { Button } from "../../lib/components/button";
import { cn } from "../../lib/utils";
import { Tooltip } from "../../lib/components/tooltip";
import ClientSearchInput from "./components/clientSearchInput";

export default function Clients() {
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount, markOverdueCreditsAsSeen, markOverdueVersementsAsSeen } = useOverduePayments();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount, markDueSoonCreditsAsSeen, markDueSoonVersementsAsSeen } = useDueSoonPayments();
  const notificationAction = (location.state as { notificationAction?: string } | null)?.notificationAction;
  const [clients, setClients] = useState<ClientWithTotalPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingClientOriginal, setEditingClientOriginal] = useState<Client | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openPanel, setOpenPanel] = useState<
    "add" | "addPayment" | "addSupplier" | null
  >(null);
  const [paymentsClient, setPaymentsClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"clients" | "payments">("clients");
  const [activeTab, setActiveTab] = useState<"clients" | "suppliers">(
    "clients",
  );
  const [selectedClientFilter, setSelectedClientFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [pendingPaymentsFilter, setPendingPaymentsFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Payments state
  const [payments, setPayments] = useState<PaymentWithClient[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Seller[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [suppliersSearch, setSuppliersSearch] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Seller | null>(null);
  const [editingSupplierOriginal, setEditingSupplierOriginal] = useState<Seller | null>(null);
  const [editSupplierLoading, setEditSupplierLoading] = useState(false);
  const [deleteSupplierLoading, setDeleteSupplierLoading] = useState<
    string | null
  >(null);
  const [suppliersCurrentPage, setSuppliersCurrentPage] = useState(1);
  const [suppliersItemsPerPage, setSuppliersItemsPerPage] = useState(10);
  
  // Supplier purchases modal state
  const [viewingPurchasesFor, setViewingPurchasesFor] = useState<Seller | null>(null);
  const [showPurchasesModal, setShowPurchasesModal] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    clientId: string | null;
    clientName: string;
  }>({ open: false, clientId: null, clientName: "" });

  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState<{
    open: boolean;
    supplierId: string | null;
    supplierName: string;
  }>({ open: false, supplierId: null, supplierName: "" });

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.clients.getAllWithTotalPurchases();
      setClients(data as unknown as ClientWithTotalPurchases[]);
    } catch (err) {
      setError(t("clients.fetchError", "Failed to fetch clients"));
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const data = await window.api.database.payments.getAllWithClientInfo();
      setPayments(data as PaymentWithClient[]);
    } catch (err) {
      setPaymentsError(t("clients.paymentsError", "Failed to fetch payments"));
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    setSuppliersError(null);
    try {
      const data = await window.api.database.sellers.getAll();
      setSuppliers(data);
    } catch (err) {
      setSuppliersError(t("suppliers.fetchError", "Failed to fetch suppliers"));
    } finally {
      setSuppliersLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchSuppliers();
    fetchPayments();
  }, []);

  // Handle notification actions - switch to payments view
  useEffect(() => {
    if (notificationAction && (
      notificationAction === 'overdueCredits' ||
      notificationAction === 'overdueVersements' ||
      notificationAction === 'dueSoonCredits' ||
      notificationAction === 'dueSoonVersements'
    )) {
      setViewMode("payments");
    }
  }, [notificationAction]);

  useEffect(() => {
    if (
      selectedClientFilter &&
      !clients.some((client) => client.id === selectedClientFilter.id)
    ) {
      setSelectedClientFilter(null);
      setSearch("");
    }
  }, [clients, selectedClientFilter]);

  // Note: Overdue payments are now marked as seen only when the overdue filter is applied
  // This allows users to see which payments are newly overdue before they are marked as seen

  const handleDelete = async (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;

    setConfirmDelete({
      open: true,
      clientId: id,
      clientName: client.name,
    });
  };

  const confirmDeleteClient = async () => {
    if (!confirmDelete.clientId) return;

    setDeleteLoading(confirmDelete.clientId);
    try {
      await window.api.database.clients.delete(confirmDelete.clientId);
      await fetchClients();
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.clientDeleted",
        details: confirmDelete.clientName ?? null,
      }).catch(() => {});
      showToast(
        t("clients.deleteSuccess", "Client deleted successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("clients.deleteError", "Failed to delete client"), "error");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setEditingClientOriginal(client);
  };

  const handleEditChange = (key: keyof Client, value: string) => {
    setEditingClient((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClientOriginal) return;
    setEditLoading(true);
    try {
      const changeLines: string[] = [];
      if (editingClient.name !== editingClientOriginal.name) changeLines.push(`Name: ${editingClientOriginal.name ?? ""} → ${editingClient.name ?? ""}`);
      if ((editingClient.phone ?? "") !== (editingClientOriginal.phone ?? "")) changeLines.push(`Phone: ${editingClientOriginal.phone ?? ""} → ${editingClient.phone ?? ""}`);
      if ((editingClient.address ?? "") !== (editingClientOriginal.address ?? "")) changeLines.push(`Address: ${editingClientOriginal.address ?? ""} → ${editingClient.address ?? ""}`);
      if ((editingClient.notes ?? "") !== (editingClientOriginal.notes ?? "")) changeLines.push(`Notes: ${editingClientOriginal.notes ?? ""} → ${editingClient.notes ?? ""}`);
      const detailsStr = changeLines.length > 0
        ? `Client: ${editingClient.name}\n${changeLines.join("\n")}`
        : `Client: ${editingClient.name}`;
      await window.api.database.clients.update(editingClient.id, {
        name: editingClient.name,
        phone: editingClient.phone,
        address: editingClient.address,
        notes: editingClient.notes,
      });
      setEditingClient(null);
      setEditingClientOriginal(null);
      await fetchClients();
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.clientUpdated",
        details: detailsStr,
      }).catch(() => {});
      showToast(
        t("clients.updateSuccess", "Client updated successfully"),
        "success",
      );
    } catch (err) {
      showToast(t("clients.updateError", "Failed to update client"), "error");
    } finally {
      setEditLoading(false);
    }
  };

  // Suppliers handlers
  const handleDeleteSupplier = async (id: string) => {
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) return;

    setConfirmDeleteSupplier({
      open: true,
      supplierId: id,
      supplierName: supplier.name,
    });
  };

  const handleViewPurchases = (supplier: Seller) => {
    setViewingPurchasesFor(supplier);
    setShowPurchasesModal(true);
  };

  const confirmDeleteSupplierAction = async () => {
    if (!confirmDeleteSupplier.supplierId) return;

    setDeleteSupplierLoading(confirmDeleteSupplier.supplierId);
    try {
      await window.api.database.sellers.delete(
        confirmDeleteSupplier.supplierId,
      );
      await fetchSuppliers();
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.supplierDeleted",
        details: confirmDeleteSupplier.supplierName ?? null,
      }).catch(() => {});
      showToast(
        t("suppliers.deleteSuccess", "Supplier deleted successfully"),
        "success",
      );
    } catch (err) {
      showToast(
        t("suppliers.deleteError", "Failed to delete supplier"),
        "error",
      );
    } finally {
      setDeleteSupplierLoading(null);
    }
  };

  const handleEditSupplier = (supplier: Seller) => {
    setEditingSupplier(supplier);
    setEditingSupplierOriginal(supplier);
  };

  const handleEditSupplierChange = (key: keyof Seller, value: string) => {
    setEditingSupplier((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleEditSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplierOriginal) return;
    setEditSupplierLoading(true);
    try {
      const changeLines: string[] = [];
      if (editingSupplier.name !== editingSupplierOriginal.name) changeLines.push(`Name: ${editingSupplierOriginal.name ?? ""} → ${editingSupplier.name ?? ""}`);
      if ((editingSupplier.phone ?? "") !== (editingSupplierOriginal.phone ?? "")) changeLines.push(`Phone: ${editingSupplierOriginal.phone ?? ""} → ${editingSupplier.phone ?? ""}`);
      if ((editingSupplier.email ?? "") !== (editingSupplierOriginal.email ?? "")) changeLines.push(`Email: ${editingSupplierOriginal.email ?? ""} → ${editingSupplier.email ?? ""}`);
      if ((editingSupplier.address ?? "") !== (editingSupplierOriginal.address ?? "")) changeLines.push(`Address: ${editingSupplierOriginal.address ?? ""} → ${editingSupplier.address ?? ""}`);
      if ((editingSupplier.notes ?? "") !== (editingSupplierOriginal.notes ?? "")) changeLines.push(`Notes: ${editingSupplierOriginal.notes ?? ""} → ${editingSupplier.notes ?? ""}`);
      const detailsStr = changeLines.length > 0
        ? `Supplier: ${editingSupplier.name}\n${changeLines.join("\n")}`
        : `Supplier: ${editingSupplier.name}`;
      await window.api.database.sellers.update(editingSupplier.id, {
        name: editingSupplier.name,
        phone: editingSupplier.phone,
        email: editingSupplier.email,
        address: editingSupplier.address,
        notes: editingSupplier.notes,
      });
      setEditingSupplier(null);
      setEditingSupplierOriginal(null);
      await fetchSuppliers();
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.supplierUpdated",
        details: detailsStr,
      }).catch(() => {});
      showToast(
        t("suppliers.updateSuccess", "Supplier updated successfully"),
        "success",
      );
    } catch (err) {
      showToast(
        t("suppliers.updateError", "Failed to update supplier"),
        "error",
      );
    } finally {
      setEditSupplierLoading(false);
    }
  };

  const handleQuickFilterPayments = (client: ClientWithTotalPurchases) => {
    setPendingPaymentsFilter({ id: client.id, name: client.name });
    setViewMode("payments");
  };

  const handleUpdateCredit = async (supplierId: string, credit: number) => {
    try {
      const supplier = suppliers.find((s) => s.id === supplierId);
      const oldCredit = supplier?.email ? Number(supplier.email) : 0;
      await window.api.database.sellers.update(supplierId, {
        email: credit.toString(),
      });
      await fetchSuppliers();
      const detailsStr = `Supplier: ${supplier?.name ?? supplierId}\nCredit: ${oldCredit} → ${credit}`;
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.supplierUpdated",
        details: detailsStr,
      }).catch(() => {});
      showToast(
        t("suppliers.creditUpdateSuccess", "Credit updated successfully"),
        "success",
      );
    } catch (err) {
      showToast(
        t("suppliers.creditUpdateError", "Failed to update credit"),
        "error",
      );
      throw err;
    }
  };

  const filteredClients = selectedClientFilter
    ? clients.filter((client) => client.id === selectedClientFilter.id)
    : clients.filter(
        (client) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          (client.phone &&
            client.phone.toLowerCase().includes(search.toLowerCase())) ||
          (client.address &&
            client.address.toLowerCase().includes(search.toLowerCase())),
      );

  // Sort by credit (descending - highest first), then by versement
  const sortedClients = [...filteredClients].sort((a, b) => {
    const creditA = a.totalCredit || 0;
    const creditB = b.totalCredit || 0;
    
    // First sort by credit (descending)
    if (creditB !== creditA) {
      return creditB - creditA;
    }
    
    // If credits are equal, sort by versement (descending)
    const versementA = a.totalVersement || 0;
    const versementB = b.totalVersement || 0;
    return versementB - versementA;
  });

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(sortedClients.length / itemsPerPage),
  );
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when search or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  // Suppliers filtering and pagination
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(suppliersSearch.toLowerCase()) ||
      (supplier.phone &&
        supplier.phone.toLowerCase().includes(suppliersSearch.toLowerCase())) ||
      (supplier.email &&
        supplier.email.toLowerCase().includes(suppliersSearch.toLowerCase())) ||
      (supplier.address &&
        supplier.address.toLowerCase().includes(suppliersSearch.toLowerCase())),
  );

  // Sort by credit (descending - highest first)
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    const creditA = parseFloat(a.email || "0") || 0;
    const creditB = parseFloat(b.email || "0") || 0;
    return creditB - creditA; // Descending order
  });

  const suppliersTotalPages = Math.max(
    1,
    Math.ceil(sortedSuppliers.length / suppliersItemsPerPage),
  );
  const paginatedSuppliers = sortedSuppliers.slice(
    (suppliersCurrentPage - 1) * suppliersItemsPerPage,
    suppliersCurrentPage * suppliersItemsPerPage,
  );

  // Reset suppliers page when search or itemsPerPage changes
  React.useEffect(() => {
    setSuppliersCurrentPage(1);
  }, [suppliersSearch, suppliersItemsPerPage]);

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      {/* Tab Navigation */}
      <div className="flex bg-card rounded-t-xl overflow-hidden">
        <button
          onClick={() => setActiveTab("clients")}
          className={`flex-1 px-6 py-4 font-medium transition-all duration-200 ${
            activeTab === "clients"
              ? "text-red-600 bg-background border-b-2 border-red-600"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            {t("clients.title", "Clients")}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`flex-1 px-6 py-4 font-medium transition-all duration-200 ${
            activeTab === "suppliers"
              ? "text-red-600 bg-background border-b-2 border-red-600"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Package className="w-5 h-5" />
            {t("suppliers.title", "Suppliers")}
          </div>
        </button>
      </div>

      {/* Clients Tab Content */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          <AddClientForm
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
            onClientAdded={fetchClients}
          />
          <AddPaymentForm
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
            onPaymentAdded={fetchPayments}
            onClientAdded={fetchClients}
          />

          {viewMode === "clients" ? (
            <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <Users className="w-7 h-7 text-red-500" />
                  <h1 className="text-2xl font-bold">
                    {t("clients.title", "Clients List")}
                  </h1>
                </div>
                <Tooltip
                  content={t(
                    "clients.paymentsViewTooltip",
                    "View Client's Credits & Versements and manage them",
                  )}
                >
                  <Button
                    onClick={() => setViewMode("payments")}
                    variant="outline"
                    className="flex items-center gap-2 relative"
                  >
                    <CreditCard className="w-4 h-4" />
                    {t("clients.viewAllPayments", "View All Payments")}
                    {(() => {
                      const hasRedBadge = (unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0);
                      const hasOrangeBadge = (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0);
                      
                      if (hasRedBadge) {
                        return <BadgeNotification count={unseenOverdueCreditsCount + unseenOverdueVersementsCount} variant="red" />;
                      } else if (hasOrangeBadge) {
                        return <BadgeNotification count={unseenDueSoonCreditsCount + unseenDueSoonVersementsCount} variant="orange" />;
                      }
                      return null;
                    })()}
                  </Button>
                </Tooltip>
              </div>

              {/* Items per page selector and search bar in the same row */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("clients.itemsPerPage", "Items per page:")}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 min-w-[70px]"
                        aria-label={t(
                          "clients.selectItemsPerPage",
                          "Select items per page",
                        )}
                      >
                        {itemsPerPage}
                        <ChevronDown className="ml-2 w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[120px] p-0 z-50">
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandGroup>
                            {[5, 10, 25, 50, 100].map((size) => (
                              <CommandItem
                                key={size}
                                value={size.toString()}
                                onSelect={() => {
                                  setItemsPerPage(size);
                                  setCurrentPage(1); // Reset to first page
                                }}
                              >
                                {size}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    itemsPerPage === size
                                      ? "opacity-100"
                                      : "opacity-0",
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
                {/* Search bar inline */}
                <ClientSearchInput
                  value={search}
                  onChange={(value) => {
                    if (selectedClientFilter) {
                      setSelectedClientFilter(null);
                    }
                    setSearch(value);
                  }}
                  clients={clients}
                  selectedClientId={selectedClientFilter?.id ?? null}
                  onSelectClient={(client) => {
                    setSelectedClientFilter({ id: client.id, name: client.name });
                    setSearch(client.name);
                  }}
                  onClearSelection={() => {
                    setSelectedClientFilter(null);
                    setSearch("");
                  }}
                />
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin" />{" "}
                  {t("clients.loading", "Loading clients...")}
                </div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : (
                <>
                  <ClientsTable
                    clients={paginatedClients}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    deleteLoading={deleteLoading}
                    onViewPayments={setPaymentsClient}
                    onQuickFilterPayments={handleQuickFilterPayments}
                  />
                  {/* Pagination Navigation (bottom, shadcn style) */}
                  {totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          {currentPage === 1 || sortedClients.length === 0 ? (
                            <span className="opacity-50 pointer-events-none select-none">
                              <PaginationPrevious href="#" />
                            </span>
                          ) : (
                            <PaginationPrevious
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(currentPage - 1);
                              }}
                              href="#"
                            />
                          )}
                        </PaginationItem>
                        {/* Page numbers with ellipsis if needed */}
                        {(() => {
                          const items = [];
                          let start = Math.max(1, currentPage - 2);
                          let end = Math.min(totalPages, currentPage + 2);
                          if (currentPage <= 3) {
                            end = Math.min(5, totalPages);
                          } else if (currentPage >= totalPages - 2) {
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
                                  isActive={i === currentPage}
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(i);
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
                        })()}
                        <PaginationItem>
                          {currentPage === totalPages ||
                          sortedClients.length === 0 ? (
                            <span className="opacity-50 pointer-events-none select-none">
                              <PaginationNext href="#" />
                            </span>
                          ) : (
                            <PaginationNext
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(currentPage + 1);
                              }}
                              href="#"
                            />
                          )}
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-10 text-sm">
                {/* Total Clients */}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("clients.totalClients", "Total Clients")}:
                  </span>
                  <span className="font-medium text-[0.9375rem]">{sortedClients.length}</span>
                </div>

                {/* Total Purchases */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("clients.totalPurchases", "Total Purchases")}:
                  </span>
                  <span className="font-medium text-[0.9375rem]">
                    {sortedClients
                      .reduce(
                        (sum, client) => sum + (client.totalPurchases || 0),
                        0,
                      )
                      .toLocaleString('fr-FR')}{" "}
                    {t("cashier.currency", "DA")}
                  </span>
                </div>

                {/* Total Credits */}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-muted-foreground">
                    {t("clients.totalCredits", "Total Credits")}:
                  </span>
                  <span className="font-medium text-[0.9375rem] text-orange-600 dark:text-orange-400">
                    {sortedClients
                      .reduce(
                        (sum, client) => sum + Math.max(0, client.totalCredit || 0),
                        0,
                      )
                      .toLocaleString('fr-FR')}{" "}
                    {t("cashier.currency", "DA")}
                  </span>
                </div>

                {/* Total Versements */}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-muted-foreground">
                    {t("clients.totalVersements", "Total Versements")}:
                  </span>
                  <span className="font-medium text-[0.9375rem] text-blue-600 dark:text-blue-400">
                    {sortedClients
                      .reduce(
                        (sum, client) => sum + Math.max(0, client.totalVersement || 0),
                        0,
                      )
                      .toLocaleString('fr-FR')}{" "}
                    {t("cashier.currency", "DA")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <AllPaymentsView
              onBack={() => setViewMode("clients")}
              payments={payments}
              loading={paymentsLoading}
              error={paymentsError}
              onRefresh={fetchPayments}
              onClientsRefresh={fetchClients}
              initialClientFilter={pendingPaymentsFilter}
              onConsumeInitialClientFilter={() => setPendingPaymentsFilter(null)}
              notificationAction={notificationAction}
            />
          )}
        </div>
      )}

      {/* Suppliers Tab Content */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <AddSupplierForm
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
            onSupplierAdded={fetchSuppliers}
          />

          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7 text-red-500" />
                <h1 className="text-2xl font-bold">
                  {t("suppliers.title", "Suppliers List")}
                </h1>
              </div>
            </div>
            {/* Items per page selector and search bar in the same row */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("suppliers.itemsPerPage", "Items per page:")}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 min-w-[70px]"
                      aria-label={t(
                        "suppliers.selectItemsPerPage",
                        "Select items per page",
                      )}
                    >
                      {suppliersItemsPerPage}
                      <ChevronDown className="ml-2 w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[120px] p-0 z-50">
                    <Command shouldFilter={false}>
                      <CommandList>
                        <CommandGroup>
                          {[5, 10, 25, 50, 100].map((size) => (
                            <CommandItem
                              key={size}
                              value={size.toString()}
                              onSelect={() => {
                                setSuppliersItemsPerPage(size);
                                setSuppliersCurrentPage(1);
                              }}
                            >
                              {size}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  suppliersItemsPerPage === size
                                    ? "opacity-100"
                                    : "opacity-0",
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
              {/* Search bar inline */}
              <SupplierSearchBar
                search={suppliersSearch}
                setSearch={setSuppliersSearch}
              />
            </div>
            {suppliersLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" />{" "}
                {t("suppliers.loading", "Loading suppliers...")}
              </div>
            ) : suppliersError ? (
              <div className="text-red-500">{suppliersError}</div>
            ) : (
              <>
                <SuppliersTable
                  suppliers={paginatedSuppliers}
                  onEdit={handleEditSupplier}
                  onDelete={handleDeleteSupplier}
                  onViewPurchases={handleViewPurchases}
                  deleteLoading={deleteSupplierLoading}
                  onUpdateCredit={handleUpdateCredit}
                />
                {/* Pagination Navigation for suppliers */}
                {suppliersTotalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        {suppliersCurrentPage === 1 ||
                        filteredSuppliers.length === 0 ? (
                          <span className="opacity-50 pointer-events-none select-none">
                            <PaginationPrevious href="#" />
                          </span>
                        ) : (
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              setSuppliersCurrentPage(suppliersCurrentPage - 1);
                            }}
                            href="#"
                          />
                        )}
                      </PaginationItem>
                      {/* Page numbers with ellipsis if needed */}
                      {(() => {
                        const items = [];
                        let start = Math.max(1, suppliersCurrentPage - 2);
                        let end = Math.min(
                          suppliersTotalPages,
                          suppliersCurrentPage + 2,
                        );
                        if (suppliersCurrentPage <= 3) {
                          end = Math.min(5, suppliersTotalPages);
                        } else if (
                          suppliersCurrentPage >=
                          suppliersTotalPages - 2
                        ) {
                          start = Math.max(1, suppliersTotalPages - 4);
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
                                isActive={i === suppliersCurrentPage}
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSuppliersCurrentPage(i);
                                }}
                              >
                                {i}
                              </PaginationLink>
                            </PaginationItem>,
                          );
                        }
                        if (end < suppliersTotalPages) {
                          items.push(
                            <PaginationItem key="end-ellipsis">
                              <PaginationEllipsis />
                            </PaginationItem>,
                          );
                        }
                        return items;
                      })()}
                      <PaginationItem>
                        {suppliersCurrentPage === suppliersTotalPages ||
                        filteredSuppliers.length === 0 ? (
                          <span className="opacity-50 pointer-events-none select-none">
                            <PaginationNext href="#" />
                          </span>
                        ) : (
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              setSuppliersCurrentPage(suppliersCurrentPage + 1);
                            }}
                            href="#"
                          />
                        )}
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <EditClientDialog
        client={editingClient}
        onChange={handleEditChange}
        onClose={() => { setEditingClient(null); setEditingClientOriginal(null); }}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />
      <EditSupplierModal
        supplier={editingSupplier}
        onChange={handleEditSupplierChange}
        onClose={() => { setEditingSupplier(null); setEditingSupplierOriginal(null); }}
        onSubmit={handleEditSupplierSubmit}
        loading={editSupplierLoading}
      />
      <SupplierPurchasesModal
        open={showPurchasesModal}
        onOpenChange={setShowPurchasesModal}
        supplier={viewingPurchasesFor}
      />
      {/* ClientDetailsModal will be rendered here when paymentsClient is set */}
      {paymentsClient && (
        <ClientDetailsModal
          open={!!paymentsClient}
          onOpenChange={(open) => !open && setPaymentsClient(null)}
          client={paymentsClient}
        />
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
        title={t("clients.confirmDeleteTitle", "Delete Client")}
        message={t(
          "clients.confirmDeleteMessage",
          "Are you sure you want to delete '{{name}}'? Warning: Deleting this client will also delete all related payments and sales. This action cannot be undone.",
          { name: confirmDelete.clientName },
        )}
        confirmText={t("clients.delete", "Delete")}
                  cancelText={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDeleteClient}
        loading={!!deleteLoading}
      />
      {/* Confirm Delete Supplier Dialog */}
      <ConfirmDialog
        open={confirmDeleteSupplier.open}
        onOpenChange={(open) =>
          setConfirmDeleteSupplier((prev) => ({ ...prev, open }))
        }
        title={t("suppliers.confirmDeleteTitle", "Delete Supplier")}
        message={t(
          "suppliers.confirmDeleteMessage",
          "Are you sure you want to delete '{{name}}'? Warning: Deleting this supplier will also delete all related purchases. This action cannot be undone.",
          { name: confirmDeleteSupplier.supplierName },
        )}
        confirmText={t("suppliers.delete", "Delete")}
                  cancelText={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDeleteSupplierAction}
        loading={!!deleteSupplierLoading}
      />
    </main>
  );
}


