import React from "react";
import { FormModal } from "../../../lib/components/Modal";
import { Input } from "../../../lib/components/input";
import { Edit } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Client } from "@prisma/client";

interface EditClientDialogProps {
  client: Client | null;
  onChange: (key: keyof Client, value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

const EditClientDialog: React.FC<EditClientDialogProps> = ({
  client,
  onChange,
  onClose,
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation();
  return (
    <FormModal
      open={!!client}
      onClose={onClose}
      title={t("clients.editTitle", "Edit Client")}
      subtitle={String(t("clients.editing", { name: client?.name }))}
      icon={<Edit className="w-5 h-5 text-red-600" />}
      size="sm"
      className="min-w-[350px] max-w-md"
      onSubmit={onSubmit}
      submitText={
        loading ? t("clients.saving", "Saving...") : t("clients.save", "Save")
      }
      cancelText={t("clients.cancel", "Cancel")}
      loading={loading}
      submitDisabled={loading}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("clients.name", "Name")}
          </label>
          <Input
            type="text"
            value={client?.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("clients.phone", "Phone")}
          </label>
          <Input
            type="text"
            value={client?.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("clients.address", "Address")}
          </label>
          <Input
            type="text"
            value={client?.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            {t("clients.notes", "Notes")}
          </label>
          <Input
            type="text"
            value={client?.notes || ""}
            onChange={(e) => onChange("notes", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </FormModal>
  );
};

export default EditClientDialog;
