import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { AlertTriangle, Info, XCircle } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: XCircle,
          iconColor: "text-red-600",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          buttonColor: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconColor: "text-yellow-600",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          buttonColor: "bg-yellow-600 hover:bg-yellow-700",
        };
      default:
        return {
          icon: Info,
          iconColor: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = styles.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${styles.bgColor}`}>
              <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={styles.buttonColor}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
