import React, { useEffect, useState } from "react";
import { Users, Loader2, CreditCard, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClientsTable from "./components/clientsTable";
import EditClientDialog from "./components/editClientModal";
import SearchBar from "./components/searchBar";
import AddClientForm from "./components/addClientForm";
import PaymentsModal from "./components/paymentsModal";
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
import type { Client } from "@prisma/client";
import type { ClientWithTotalPurchases } from "../../types";
import { useToast } from "../../lib/contexts/toastContext";
import { ConfirmDialog } from "../../lib/components/confirmDialog";
import { Button } from "../../lib/components/button";
import { cn } from "../../lib/utils";

export default function Clients() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientWithTotalPurchases[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openPanel, setOpenPanel] = useState<"add" | null>(null);
  const [paymentsClient, setPaymentsClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<"clients" | "payments">("clients");
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    clientId: string | null;
    clientName: string;
  }>({ open: false, clientId: null, clientName: "" });

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

  useEffect(() => {
    fetchClients();
  }, []);

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
  };

  const handleEditChange = (key: keyof Client, value: string) => {
    setEditingClient((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setEditLoading(true);
    try {
      await window.api.database.clients.update(editingClient.id, {
        name: editingClient.name,
        phone: editingClient.phone,
        address: editingClient.address,
        notes: editingClient.notes,
      });
      setEditingClient(null);
      await fetchClients();
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

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      (client.phone &&
        client.phone.toLowerCase().includes(search.toLowerCase())) ||
      (client.address &&
        client.address.toLowerCase().includes(search.toLowerCase())),
  );

  // Pagination logic
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / itemsPerPage),
  );
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset to page 1 when search or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  return (
    <main className="px-6 md:px-12 flex-1 space-y-4">
      <AddClientForm
        openPanel={openPanel}
        setOpenPanel={setOpenPanel}
        onClientAdded={fetchClients}
      />
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        {viewMode === "clients" ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-7 h-7 text-red-500" />
                <h1 className="text-2xl font-bold">
                  {t("clients.title", "Clients List")}
                </h1>
              </div>
              <Button
                onClick={() => setViewMode("payments")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {t("clients.viewAllPayments", "View All Payments")}
              </Button>
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
              <SearchBar search={search} setSearch={setSearch} />
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
                />
                {/* Pagination Navigation (bottom, shadcn style) */}
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        {currentPage === 1 || filteredClients.length === 0 ? (
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
                        filteredClients.length === 0 ? (
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
          </>
        ) : (
          <AllPaymentsView onBack={() => setViewMode("clients")} />
        )}
        <EditClientDialog
          client={editingClient}
          onChange={handleEditChange}
          onClose={() => setEditingClient(null)}
          onSubmit={handleEditSubmit}
          loading={editLoading}
        />
        {/* PaymentsModal will be rendered here when paymentsClient is set */}
        {paymentsClient && (
          <PaymentsModal
            client={paymentsClient}
            onClose={() => setPaymentsClient(null)}
          />
        )}
      </section>
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
        cancelText={t("clients.cancel", "Cancel")}
        variant="danger"
        onConfirm={confirmDeleteClient}
        loading={!!deleteLoading}
      />
    </main>
  );
}
