import React, { useState, useRef } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "../utils";
import { useTranslation } from "react-i18next";

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
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.8,
}: ImageUploadProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with specified quality
        const resizedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(resizedDataUrl);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert(t("imageUpload.selectImageFile"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t("imageUpload.imageSizeLimit"));
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      onChange(resizedImage);
    } catch (error) {
      console.error("Error resizing image:", error);
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
          <img
            src={value}
            alt="Product"
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
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
