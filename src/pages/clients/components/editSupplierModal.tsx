import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Loader2, X } from "lucide-react";
import type { Seller } from "@prisma/client";

interface EditSupplierModalProps {
  supplier: Seller | null;
  onChange: (key: keyof Seller, value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function EditSupplierModal({
  supplier,
  onChange,
  onClose,
  onSubmit,
  loading,
}: EditSupplierModalProps) {
  const { t } = useTranslation();

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {t("suppliers.editSupplier", "Edit Supplier")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("suppliers.name", "Name")}
            </label>
            <input
              type="text"
              value={supplier.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("suppliers.phone", "Phone")}
            </label>
            <input
              type="text"
              value={supplier.phone || ""}
              onChange={(e) => onChange("phone", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("suppliers.email", "Email")}
            </label>
            <input
              type="email"
              value={supplier.email || ""}
              onChange={(e) => onChange("email", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("suppliers.address", "Address")}
            </label>
            <input
              type="text"
              value={supplier.address || ""}
              onChange={(e) => onChange("address", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("suppliers.notes", "Notes")}
            </label>
            <input
              type="text"
              value={supplier.notes || ""}
              onChange={(e) => onChange("notes", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t("suppliers.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("suppliers.updating", "Updating...")}
                </>
              ) : (
                t("suppliers.update", "Update")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 