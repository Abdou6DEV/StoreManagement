import React, { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClientsTable from "./components/clientsTable";
import EditClientDialog from "./components/editClientDialog";
import SearchBar from "./components/searchBar";
import AddClientForm from "./components/addClientForm";

interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  totalPurchases?: number;
}

export default function Customers() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openPanel, setOpenPanel] = useState<"add" | "edit" | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.clients.getAllWithTotalPurchases();
      setClients(data as any);
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
    if (
      !window.confirm(
        t(
          "clients.deleteConfirm",
          "Are you sure you want to delete this client?",
        ),
      )
    )
      return;
    setDeleteLoading(id);
    try {
      await window.api.database.clients.delete(id);
      await fetchClients();
    } catch (err) {
      alert(t("clients.deleteError", "Failed to delete client"));
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
    } catch (err) {
      alert(t("clients.updateError", "Failed to update client"));
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
      <AddClientForm openPanel={openPanel} setOpenPanel={setOpenPanel} onClientAdded={fetchClients} />
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-7 h-7 text-red-500" />
          <h1 className="text-2xl font-bold">{t("clients.title", "Clients List")}</h1>
        </div>
        {/* Items per page selector and search bar in the same row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("clients.itemsPerPage", "Items per page:")}
            </span>
            <select
              className="px-2 py-1 border rounded text-sm bg-card"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label={t(
                "clients.selectItemsPerPage",
                "Select items per page",
              )}
            >
              {[5, 10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          {/* Search bar inline */}
          <SearchBar search={search} setSearch={setSearch} />
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1 || filteredClients.length === 0}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
              >
                {t("clients.prev", "Previous")}
              </button>
              <span className="text-sm text-muted-foreground">
                {t("clients.page", "Page")} {currentPage} / {totalPages}
              </span>
              <button
                disabled={
                  currentPage === totalPages || filteredClients.length === 0
                }
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="text-sm px-4 py-2 border-1 rounded-md hover:bg-muted transition disabled:opacity-50 disabled:bg-card"
              >
                {t("clients.next", "Next")}
              </button>
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" />{" "}
            {t("clients.loading", "Loading clients...")}
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <ClientsTable
            clients={paginatedClients}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deleteLoading={deleteLoading}
          />
        )}
        <EditClientDialog
          client={editingClient}
          onChange={handleEditChange}
          onClose={() => setEditingClient(null)}
          onSubmit={handleEditSubmit}
          loading={editLoading}
        />
      </section>
    </main>
  );
}
