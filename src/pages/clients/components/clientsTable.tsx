import React from "react";
import { Button } from "../../../lib/components/button";
import { Edit, Loader2, Trash2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ClientWithTotalPurchases } from "../../../types";
import { Tooltip } from "../../../lib/components/tooltip";

interface ClientsTableProps {
  clients: ClientWithTotalPurchases[];
  onEdit: (client: ClientWithTotalPurchases) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
  onViewPayments: (client: ClientWithTotalPurchases) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onEdit,
  onDelete,
  deleteLoading,
  onViewPayments,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Info className="w-12 h-12 text-red-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("clients.emptyTitle", "No clients found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "clients.emptyDesc",
            "You have not added any clients yet. Add a client to get started.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table
        className={`min-w-full text-sm ${isRTL ? "text-right" : "text-left"}`}
      >
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.name", "Name")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.phone", "Phone")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.address", "Address")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.notes", "Notes")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.totalPurchases", "Total Purchases")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"} whitespace-nowrap`}>
              {t("clients.credit", "Credit")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"} whitespace-nowrap`}>
              {t("clients.versement", "Versement")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="h-[48px] hover:bg-muted/40 transition"
            >
              <td
                className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}
              >
                {client.name}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {client.phone || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {client.address || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {client.notes || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"} whitespace-nowrap`}>
                <span className="text-[0.9375rem]">{client.totalPurchases?.toLocaleString() || 0} {t("cashier.currency", "DA")}</span>
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"} font-medium whitespace-nowrap ${(client.totalCredit || 0) > 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                <span className="text-[0.9375rem]">{(Math.max(0, client.totalCredit || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, " ")} {t("cashier.currency", "DA")}</span>
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"} font-medium whitespace-nowrap ${(client.totalVersement || 0) > 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                <span className="text-[0.9375rem]">{(Math.max(0, client.totalVersement || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, " ")} {t("cashier.currency", "DA")}</span>
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                <div
                  className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Tooltip
                    content={t(
                      "clients.viewClientInfoTooltip",
                      "View Client's Informations",
                    )}
                  >
                    <Button
                      onClick={() => onViewPayments(client)}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  </Tooltip>

                  <Tooltip content={t("clients.editTooltip", "Edit client")}>
                    <Button
                      onClick={() => onEdit(client)}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </Tooltip>

                  <Tooltip
                    content={t("clients.deleteTooltip", "Delete client")}
                  >
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
                      )}
                    </Button>
                  </Tooltip>
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
