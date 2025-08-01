import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "../utils";
import { Button } from "./button";

// Modal size variants
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full" | "auto";

// Modal type variants
export type ModalType = "dialog" | "overlay";

// Common button configurations
export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

// Core modal props
export interface ModalProps {
  // Basic modal state
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;

  // Modal configuration
  type?: ModalType;
  size?: ModalSize;
  className?: string;
  overlayClassName?: string;

  // Header configuration
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  headerClassName?: string;

  // Content
  children: React.ReactNode;

  // Footer actions
  actions?: ModalAction[];
  footerClassName?: string;
  showFooter?: boolean;

  // Behavior
  modal?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;

  // Accessibility
  "aria-label"?: string;
  "aria-describedby"?: string;
}

// Size configuration
const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
  full: "max-w-[95vw] max-h-[95vh]",
  auto: "max-w-fit",
};

// Dialog-based modal component
function DialogModal({
  open,
  onOpenChange,
  onClose,
  size = "md",
  className,
  overlayClassName,
  title,
  subtitle,
  icon,
  showCloseButton = true,
  headerClassName,
  children,
  actions,
  footerClassName,
  showFooter = true,
  modal = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventClose = false,
  ...props
}: Omit<ModalProps, "type">) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && preventClose) return;
    onOpenChange?.(newOpen);
    if (!newOpen) onClose?.();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick || preventClose) return;
    if (e.target === e.currentTarget) {
      handleOpenChange(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      modal={modal}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 transition-opacity",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            overlayClassName,
          )}
          onClick={handleOverlayClick}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%]",
            "gap-4 border bg-background p-6 shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "rounded-lg",
            sizeClasses[size],
            className,
          )}
          onEscapeKeyDown={
            closeOnEscape ? undefined : (e) => e.preventDefault()
          }
          {...props}
        >
          {/* Header */}
          {(title || subtitle || showCloseButton) && (
            <div className={cn("flex flex-col space-y-2", headerClassName)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {icon}
                    </div>
                  )}
                  <div className="flex flex-col">
                    {title && (
                      <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                        {title}
                      </DialogPrimitive.Title>
                    )}
                    {subtitle && (
                      <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                        {subtitle}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                </div>
                {showCloseButton && (
                  <DialogPrimitive.Close
                    className={cn(
                      "rounded-sm opacity-70 ring-offset-background transition-opacity",
                      "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
                      "h-6 w-6 flex items-center justify-center",
                    )}
                    disabled={preventClose}
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto">{children}</div>

          {/* Footer */}
          {showFooter && actions && actions.length > 0 && (
            <div
              className={cn(
                "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0",
                footerClassName,
              )}
            >
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className="w-full sm:w-auto"
                >
                  {action.loading && (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  )}
                  {action.icon && !action.loading && (
                    <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Overlay-based modal component (for custom overlays like calculator)
function OverlayModal({
  open,
  onClose,
  className,
  overlayClassName,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventClose = false,
}: Omit<ModalProps, "type">) {
  React.useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, closeOnEscape, preventClose, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!closeOnOverlayClick || preventClose) return;
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn("absolute inset-0 bg-black/50", overlayClassName)}
        onClick={handleOverlayClick}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}

// Main modal component
export function Modal(props: ModalProps) {
  const { type = "dialog", ...rest } = props;

  switch (type) {
    case "overlay":
      return <OverlayModal {...rest} />;
    case "dialog":
    default:
      return <DialogModal {...rest} />;
  }
}

// Convenience hook for modal state management
export function useModal(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen);

  const openModal = React.useCallback(() => setOpen(true), []);
  const closeModal = React.useCallback(() => setOpen(false), []);
  const toggleModal = React.useCallback(() => setOpen((prev) => !prev), []);

  return {
    open,
    openModal,
    closeModal,
    toggleModal,
    setOpen,
  };
}

// Pre-configured modal variants
export interface ConfirmModalProps
  extends Omit<ModalProps, "actions" | "children"> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "info" | "warning" | "danger";
  loading?: boolean;
}

export function ConfirmModal({
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "info",
  loading = false,
  onClose,
  ...props
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  const getVariantConfig = () => {
    switch (variant) {
      case "danger":
        return {
          variant: "destructive" as const,
        };
      case "warning":
        return {
          variant: "default" as const,
        };
      default:
        return {
          variant: "default" as const,
        };
    }
  };

  const config = getVariantConfig();

  const actions: ModalAction[] = [
    {
      label: cancelText,
      onClick: handleCancel,
      variant: "outline",
      disabled: loading,
    },
    {
      label: confirmText,
      onClick: handleConfirm,
      variant: config.variant,
      loading,
      disabled: loading,
    },
  ];

  return (
    <Modal
      {...props}
      onClose={onClose}
      size="sm"
      actions={actions}
      preventClose={loading}
    >
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </Modal>
  );
}

// Form modal variant
export interface FormModalProps extends Omit<ModalProps, "actions"> {
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
}

export function FormModal({
  children,
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",
  onCancel,
  onClose,
  loading = false,
  submitDisabled = false,
  ...props
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  const actions: ModalAction[] = [
    {
      label: cancelText,
      onClick: handleCancel,
      variant: "outline",
      disabled: loading,
    },
    {
      label: submitText,
      onClick: () => {
        const form = document.querySelector("form");
        if (form) {
          form.dispatchEvent(
            new Event("submit", { cancelable: true, bubbles: true }),
          );
        }
      },
      variant: "default",
      loading,
      disabled: loading || submitDisabled,
    },
  ];

  return (
    <Modal
      {...props}
      onClose={onClose}
      actions={actions}
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {children}
      </form>
    </Modal>
  );
}

// Default export
export default Modal;
