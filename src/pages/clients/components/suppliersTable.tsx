import React from "react";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, Package } from "lucide-react";
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
  const { t } = useTranslation();

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t("suppliers.noSuppliers", "No suppliers found")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium">
              {t("suppliers.name", "Name")}
            </th>
            <th className="text-left py-3 px-4 font-medium">
              {t("suppliers.phone", "Phone")}
            </th>
            <th className="text-left py-3 px-4 font-medium">
              {t("suppliers.email", "Email")}
            </th>
            <th className="text-left py-3 px-4 font-medium">
              {t("suppliers.address", "Address")}
            </th>
            <th className="text-left py-3 px-4 font-medium">
              {t("suppliers.notes", "Notes")}
            </th>
            <th className="text-right py-3 px-4 font-medium">
              {t("suppliers.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="font-medium">{supplier.name}</div>
              </td>
              <td className="py-3 px-4">
                {supplier.phone || (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                {supplier.email || (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                {supplier.address || (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                {supplier.notes || (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(supplier)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(supplier.id)}
                    disabled={deleteLoading === supplier.id}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deleteLoading === supplier.id ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
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