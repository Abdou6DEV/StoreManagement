import React from "react";
import { Button } from "../../../lib/components/ui/button";
import { Edit, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onEdit,
  onDelete,
  deleteLoading,
}) => {
  const { t } = useTranslation();
  if (clients.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        {t("clients.empty", "No clients found.")}
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("clients.name", "Name")}</th>
            <th className="px-4 py-3">{t("clients.phone", "Phone")}</th>
            <th className="px-4 py-3">{t("clients.address", "Address")}</th>
            <th className="px-4 py-3">{t("clients.notes", "Notes")}</th>
            <th className="px-4 py-3">{t("clients.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="h-[48px] hover:bg-muted/40 transition"
            >
              <td className="px-4 py-2 font-medium">{client.name}</td>
              <td className="px-4 py-2">{client.phone || "-"}</td>
              <td className="px-4 py-2">{client.address || "-"}</td>
              <td className="px-4 py-2">{client.notes || "-"}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => onEdit(client)}
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                  >
                    <Edit className="w-3 h-3" /> {t("clients.edit", "Edit")}
                  </Button>
                  <Button
                    onClick={() => onDelete(client.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                    disabled={deleteLoading === client.id}
                  >
                    {deleteLoading === client.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}{" "}
                    {t("clients.delete", "Delete")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;
