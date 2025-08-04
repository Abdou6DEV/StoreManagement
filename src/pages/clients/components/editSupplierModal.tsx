import React from "react";
import { FormModal } from "../../../lib/components/Modal";
import { Input } from "../../../lib/components/input";
import { Edit } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Seller } from "@prisma/client";

interface EditSupplierModalProps {
  supplier: Seller | null;
  onChange: (key: keyof Seller, value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  supplier,
  onChange,
  onClose,
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <FormModal
      open={!!supplier}
      onClose={onClose}
      title={t("suppliers.editSupplier", "Edit Supplier")}
      subtitle={String(t("suppliers.editing", { name: supplier?.name }))}
      icon={<Edit className="w-5 h-5 text-blue-600" />}
      size="sm"
      className="min-w-[350px] max-w-md"
      onSubmit={onSubmit}
      submitText={
        loading
          ? t("suppliers.updating", "Updating...")
          : t("suppliers.update", "Update")
      }
      cancelText={t("suppliers.cancel", "Cancel")}
      loading={loading}
      submitDisabled={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("suppliers.name", "Name")}
          </label>
          <Input
            type="text"
            value={supplier?.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("suppliers.phone", "Phone")}
          </label>
          <Input
            type="text"
            value={supplier?.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("suppliers.email", "Email")}
          </label>
          <Input
            type="email"
            value={supplier?.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("suppliers.address", "Address")}
          </label>
          <Input
            type="text"
            value={supplier?.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("suppliers.notes", "Notes")}
          </label>
          <Input
            type="text"
            value={supplier?.notes || ""}
            onChange={(e) => onChange("notes", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </FormModal>
  );
};

export default EditSupplierModal;
