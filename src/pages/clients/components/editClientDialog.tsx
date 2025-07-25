import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { Edit, X, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Client } from "../../../types";

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
    <Dialog modal open={!!client}>
      <DialogContent className="min-w-[350px] max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Edit className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("clients.editTitle", "Edit Client")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {String(t("clients.editing", { name: client?.name } as any))}
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
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
          <div className="flex gap-3 pt-4 border-t border-border mt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {t("clients.saving", "Saving...")}{" "}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {t("clients.save", "Save")}{" "}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4" /> {t("clients.cancel", "Cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
