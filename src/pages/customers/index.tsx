import React, { useEffect, useState } from "react";
import { Users, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ClientsTable from "./components/clientsTable";
import EditClientDialog from "./components/editClientDialog";
import SearchBar from "./components/searchBar";

interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.database.clients.getAll();
      setClients(data);
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

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-7 h-7 text-red-500" />
        <h1 className="text-2xl font-bold">{t("clients.title", "Clients")}</h1>
      </div>
      <SearchBar search={search} setSearch={setSearch} />
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" />{" "}
          {t("clients.loading", "Loading clients...")}
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <ClientsTable
          clients={filteredClients}
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
  );
}
