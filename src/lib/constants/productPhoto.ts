/** Stored product photo max edge (px). Covers cashier cards + 256px detail modal at 2x DPR. */
export const PRODUCT_PHOTO_MAX_SIZE = 400;

export const PRODUCT_PHOTO_QUALITY = 0.85;

export const PRODUCT_PHOTO_RESIZE_OPTIONS = {
  maxWidth: PRODUCT_PHOTO_MAX_SIZE,
  maxHeight: PRODUCT_PHOTO_MAX_SIZE,
  quality: PRODUCT_PHOTO_QUALITY,
} as const;
