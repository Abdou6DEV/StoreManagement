import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, Package, Loader2, ShoppingCart, Save, X, CheckCircle } from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import type { Seller } from "@prisma/client";
import { Tooltip } from "../../../lib/components/tooltip";

interface SuppliersTableProps {
  suppliers: Seller[];
  onEdit: (supplier: Seller) => void;
  onDelete: (id: string) => void;
  onViewPurchases: (supplier: Seller) => void;
  deleteLoading: string | null;
  onUpdateCredit?: (supplierId: string, credit: number) => Promise<void>;
}

export default function SuppliersTable({
  suppliers,
  onEdit,
  onDelete,
  onViewPurchases,
  deleteLoading,
  onUpdateCredit,
}: SuppliersTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
  const [creditValue, setCreditValue] = useState<string>("");
  const [updatingCredit, setUpdatingCredit] = useState<string | null>(null);

  const handleStartEditCredit = (supplier: Seller) => {
    setEditingCreditId(supplier.id);
    // Parse email field as credit amount (stored as string, convert to number for display)
    const creditAmount = supplier.email ? parseFloat(supplier.email) : 0;
    setCreditValue(isNaN(creditAmount) ? "0" : creditAmount.toString());
  };

  const handleCancelEditCredit = () => {
    setEditingCreditId(null);
    setCreditValue("");
  };

  const handleSaveCredit = async (supplierId: string) => {
    if (!onUpdateCredit) return;
    
    // Treat empty string as 0
    const creditNum = creditValue === "" ? 0 : parseFloat(creditValue);
    if (isNaN(creditNum) || creditNum < 0) {
      return;
    }

    setUpdatingCredit(supplierId);
    try {
      await onUpdateCredit(supplierId, creditNum);
      setEditingCreditId(null);
      setCreditValue("");
    } catch (error) {
      console.error("Failed to update credit:", error);
    } finally {
      setUpdatingCredit(null);
    }
  };

  const handleMarkAsPaid = async (supplierId: string) => {
    if (!onUpdateCredit) return;
    
    setUpdatingCredit(supplierId);
    try {
      await onUpdateCredit(supplierId, 0);
      setEditingCreditId(null);
      setCreditValue("");
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    } finally {
      setUpdatingCredit(null);
    }
  };

  const formatCredit = (email: string | null | undefined): string => {
    if (!email) return "0";
    const credit = parseFloat(email);
    if (isNaN(credit)) return "0";
    return credit.toLocaleString();
  };

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
              {t("suppliers.address", "Address")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("suppliers.notes", "Notes")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"} whitespace-nowrap`}>
              {t("suppliers.credit", "Credit")}
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
                {supplier.address || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                {supplier.notes || "-"}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"} font-medium whitespace-nowrap ${(parseFloat(supplier.email || "0") || 0) > 0 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                {editingCreditId === supplier.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={creditValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                          setCreditValue(value);
                        }
                      }}
                      min={0}
                      step="0.01"
                      className="w-24 h-8 text-sm"
                      autoFocus
                      disabled={updatingCredit === supplier.id}
                    />
                    <Tooltip content={t("common.save", "Save")}>
                      <Button
                        size="sm"
                        onClick={() => handleSaveCredit(supplier.id)}
                        className="h-8 px-2"
                        disabled={updatingCredit === supplier.id}
                      >
                        {updatingCredit === supplier.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                      </Button>
                    </Tooltip>
                    {(parseFloat(supplier.email || "0") || 0) > 0 && (
                      <Tooltip content={t("clients.markAsPaid", "Mark as Paid")}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(supplier.id)}
                          className="h-8 px-2 text-green-700 border-green-500 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-950/30"
                          disabled={updatingCredit === supplier.id}
                        >
                          {updatingCredit === supplier.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content={t("common.cancel", "Cancel")}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditCredit}
                        className="h-8 px-2"
                        disabled={updatingCredit === supplier.id}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Tooltip>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[0.9375rem]">{(Math.max(0, parseFloat(supplier.email || "0") || 0)).toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, " ")} {t("cashier.currency", "DA")}</span>
                    {onUpdateCredit && (
                      <Tooltip content={t("suppliers.editCreditTooltip", "Edit credit amount")}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEditCredit(supplier)}
                          className="h-6 px-1"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </td>
              <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                <div
                  className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Tooltip
                    content={t("suppliers.viewPurchasesTooltip", "View all products purchased from this supplier")}
                  >
                    <Button
                      onClick={() => onViewPurchases(supplier)}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
                    >
                      <ShoppingCart className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={t("suppliers.editTooltip", "Edit supplier")}
                  >
                    <Button
                      onClick={() => onEdit(supplier)}
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    content={t("suppliers.deleteTooltip", "Delete supplier")}
                  >
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
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
