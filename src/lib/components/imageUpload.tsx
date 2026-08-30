import React, { useState, useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";
import rendererLogger from "../logger/rendererLogger";
import { resizeFileToProductPhoto, PRODUCT_PHOTO_RESIZE_OPTIONS } from "../utils/resizeProductPhoto";
import { ProductPhotoImage } from "./productPhotoImage";

interface ImageUploadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function ImageUpload({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  maxWidth = PRODUCT_PHOTO_RESIZE_OPTIONS.maxWidth,
  maxHeight = PRODUCT_PHOTO_RESIZE_OPTIONS.maxHeight,
  quality = PRODUCT_PHOTO_RESIZE_OPTIONS.quality,
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(t("imageUpload.selectImageFile"));
      return;
    }

    try {
      const resizedImage = await resizeFileToProductPhoto(file, {
        maxWidth,
        maxHeight,
        quality,
      });
      onChange(resizedImage);
    } catch (error) {
      rendererLogger.error("Error resizing image", "ImageUpload", error);
      alert(t("imageUpload.failedToProcess"));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        <div className="relative group">
          <ProductPhotoImage src={value} alt={t("stock.photo", "Product Photo")} variant="picker" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
            title={t("imageUpload.removeImage")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-border hover:border-green-500/50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 bg-muted rounded-full">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {placeholder}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("imageUpload.clickToUpload")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
