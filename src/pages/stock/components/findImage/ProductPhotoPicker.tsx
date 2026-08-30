import React, { useRef, useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../lib/utils";
import { useAiChatGate } from "../../../../lib/hooks/useAiChatGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../lib/components/dropdownMenu";
import { Tooltip } from "../../../../lib/components/tooltip";
import { Button } from "../../../../lib/components/button";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import {
  resizeFileToProductPhoto,
  PRODUCT_PHOTO_RESIZE_OPTIONS,
} from "../../../../lib/utils/resizeProductPhoto";
import { ProductPhotoImage } from "../../../../lib/components/productPhotoImage";
import { FindImageDialog } from "./FindImageDialog";

interface ProductPhotoPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  productName: string;
  categoryName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function PhotoSourceMenuItems({
  disabled,
  onUpload,
  aiMenuItem,
}: {
  disabled: boolean;
  onUpload: () => void;
  aiMenuItem: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <>
      <DropdownMenuItem disabled={disabled} onSelect={onUpload} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {t("stock.findImage.menuUpload", "Upload from computer")}
      </DropdownMenuItem>
      {aiMenuItem}
    </>
  );
}

export function ProductPhotoPicker({
  value,
  onChange,
  productName,
  categoryName,
  placeholder,
  className,
  disabled = false,
}: ProductPhotoPickerProps) {
  const { t } = useTranslation();
  const { canUseAi, blockReason } = useAiChatGate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [findDialogOpen, setFindDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const trimmedName = productName.trim();
  const aiLocked = !canUseAi;
  const aiNameMissing = trimmedName.length < 2;

  const aiLockMessage =
    blockReason === "offline"
      ? t(
          "ai.offlineBlocked",
          "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
        )
      : blockReason === "trial"
        ? t(
            "ai.trialBlocked",
            "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
          )
        : t(
            "ai.disabled",
            "This is a premium feature. Contact your provider to enable REDA AI.",
          );

  const aiNameMessage = t(
    "stock.findImage.nameRequired",
    "Enter a product name first to search for photos.",
  );

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(t("imageUpload.selectImageFile"));
      return;
    }

    try {
      const resized = await resizeFileToProductPhoto(file, PRODUCT_PHOTO_RESIZE_OPTIONS);
      onChange(resized);
    } catch (error) {
      rendererLogger.error("Error resizing image", "ProductPhotoPicker", error);
      alert(t("imageUpload.failedToProcess"));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  };

  const openFilePicker = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const openFindDialog = () => {
    if (disabled || aiLocked || aiNameMissing) return;
    setFindDialogOpen(true);
  };

  const aiMenuItem = (
    <DropdownMenuItem
      disabled={disabled || aiLocked || aiNameMissing}
      onSelect={(event) => {
        if (aiLocked || aiNameMissing) {
          event.preventDefault();
          return;
        }
        openFindDialog();
      }}
      className={cn(
        "invoice-scan-ai-btn my-1 w-full rounded-md border py-2 font-medium",
        "focus:bg-transparent data-[highlighted]:bg-transparent",
        (disabled || aiLocked || aiNameMissing) && "animate-none",
      )}
    >
      <Sparkles className="h-4 w-4 text-[#8b5cf6]" />
      <span className="flex-1">
        {t("stock.findImage.menuAi", "Find with REDA AI")}
      </span>
      {aiLocked ? (
        <span className="rounded-full bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#8b5cf6] uppercase">
          {t("stock.findImage.premiumBadge", "Premium")}
        </span>
      ) : null}
    </DropdownMenuItem>
  );

  const wrappedAiMenuItem =
    aiLocked || aiNameMissing ? (
      <Tooltip
        content={aiLocked ? aiLockMessage : aiNameMessage}
        position="top"
        triggerClassName="flex w-full"
      >
        {aiMenuItem}
      </Tooltip>
    ) : (
      aiMenuItem
    );

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelect(file);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="space-y-2">
          <div className="relative group">
            <ProductPhotoImage
              src={value}
              alt={t("stock.photo", "Product Photo")}
              variant="picker"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-600"
              title={t("imageUpload.removeImage")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className="w-full"
              >
                {t("stock.findImage.changePhoto", "Change photo")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[14rem]">
              <PhotoSourceMenuItems
                disabled={disabled}
                onUpload={openFilePicker}
                aiMenuItem={wrappedAiMenuItem}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                isDragOver
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-border hover:border-green-500/50",
                disabled && "cursor-not-allowed opacity-50",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-muted p-2">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {placeholder ?? t("stock.uploadPhoto", "Upload product photo")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("stock.findImage.addPhotoHint", "Click to upload or find with REDA AI")}
                  </p>
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[14rem]">
            <PhotoSourceMenuItems
              disabled={disabled}
              onUpload={openFilePicker}
              aiMenuItem={wrappedAiMenuItem}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <FindImageDialog
        open={findDialogOpen}
        onOpenChange={setFindDialogOpen}
        productName={trimmedName}
        categoryName={categoryName}
        onPhotoSelected={onChange}
      />
    </div>
  );
}
