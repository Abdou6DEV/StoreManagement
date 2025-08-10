import React from "react";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, Package, Loader2 } from "lucide-react";
import { Button } from "../../../lib/components/button";
import type { Seller } from "@prisma/client";

interface SuppliersTableProps {
  suppliers: Seller[];
  onEdit: (supplier: Seller) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
}

export default function SuppliersTable({
  suppliers,
  onEdit,
  onDelete,
  deleteLoading,
}: SuppliersTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Package className="w-12 h-12 text-red-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("suppliers.emptyTitle", "No suppliers found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "suppliers.emptyDesc",
            "You have not added any suppliers yet. Add a supplier to get started.",
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
              {t("suppliers.name", "Name")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.phone", "Phone")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.email", "Email")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.address", "Address")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.notes", "Notes")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id}
              className="h-[48px] hover:bg-muted/40 transition"
            >
              <td
                className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}
              >
                {supplier.name}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {supplier.phone || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {supplier.email || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {supplier.address || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {supplier.notes || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                <div
                  className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Button
                    onClick={() => onEdit(supplier)}
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => onDelete(supplier.id)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                    disabled={deleteLoading === supplier.id}
                  >
                    {deleteLoading === supplier.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
