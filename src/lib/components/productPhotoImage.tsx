import type { ReactEventHandler } from "react";
import { cn } from "../utils";

export type ProductPhotoVariant = "picker" | "card" | "detail";

const variantShell: Record<ProductPhotoVariant, string> = {
  /** Add / edit stock preview — tall enough to review before saving */
  picker: "h-40 w-full rounded-lg border border-border",
  /** Cashier product card (fills parent h-20 area) */
  card: "h-full w-full rounded-md",
  /** Product info modal */
  detail: "h-64 w-64 rounded-lg border border-border shadow-lg",
};

const variantImageFit: Record<ProductPhotoVariant, string> = {
  /** Upload preview — show the full photo without cropping */
  picker: "object-contain object-center",
  /** Cashier card — show the full photo within the tile */
  card: "object-contain object-center",
  /** Modal — show the full photo */
  detail: "object-contain object-center",
};

type ProductPhotoImageProps = {
  src: string;
  alt: string;
  variant?: ProductPhotoVariant;
  className?: string;
  onError?: ReactEventHandler<HTMLImageElement>;
};

/** Consistent product photo framing with variant-specific fit. */
export function ProductPhotoImage({
  src,
  alt,
  variant = "picker",
  className,
  onError,
}: ProductPhotoImageProps) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-muted/30",
        variantShell[variant],
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full", variantImageFit[variant])}
        draggable={false}
        onError={onError}
      />
    </div>
  );
}
