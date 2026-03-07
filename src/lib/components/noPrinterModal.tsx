import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Settings, AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Tooltip } from "./tooltip";
import { useAuth } from "../contexts/authContext";

export type PrinterType = "receipt" | "label";

interface NoPrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printerType: PrinterType;
}

export const NoPrinterModal: React.FC<NoPrinterModalProps> = ({
  open,
  onOpenChange,
  printerType,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const canAccessAdmin = canAccessPage("administrator");

  const title =
    printerType === "receipt"
      ? t("cashier.receiptPrinterNotSetTitle", "Receipt printer not set")
      : t("stock.labelPrinterNotSetTitle", "Label printer not set");

  const message =
    printerType === "receipt"
      ? t(
          "cashier.receiptPrinterNotSetMessage",
          "You need to set up the receipt printer in the Admin page to print receipts. Go to Admin → Configure Printing → Configure Printers and choose your receipt printer."
        )
      : t(
          "stock.labelPrinterNotSetMessage",
          "You need to set up the label printer in the Admin page to print barcode labels. Go to Admin → Configure Printing → Configure Printers and choose your label printer."
        );

  const handleSetupPrinter = () => {
    onOpenChange(false);
    navigate("/administrator?tab=receipt&subTab=configurePrinters");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="md"
      showCloseButton={true}
      icon={<AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden />}
      headerClassName="border-l-4 border-amber-500 pl-1"
    >
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          {canAccessAdmin ? (
            <Button size="sm" onClick={handleSetupPrinter} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Settings className="w-4 h-4 mr-2" />
              {t("stock.setupPrinter", "Setup Printer")}
            </Button>
          ) : (
            <Tooltip
              content={t("stock.noAccessToAdminTooltip", "You do not have access to the Admin page.")}
              position="top"
            >
              <span className="inline-block">
                <Button size="sm" disabled className="bg-amber-600/50 text-white cursor-not-allowed">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("stock.setupPrinter", "Setup Printer")}
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </Modal>
  );
};
