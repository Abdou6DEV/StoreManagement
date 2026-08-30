import {
  PRODUCT_PHOTO_MAX_SIZE,
  PRODUCT_PHOTO_QUALITY,
  PRODUCT_PHOTO_RESIZE_OPTIONS,
} from "../constants/productPhoto";

export type ResizeProductPhotoOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export { PRODUCT_PHOTO_RESIZE_OPTIONS };

function resizeLoadedImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): string {
  let { width, height } = img;
  const aspectRatio = width / height;
  const needsResize = width > maxWidth || height > maxHeight;

  if (needsResize) {
    if (width > height) {
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
    } else {
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function resizeDataUrlToProductPhoto(
  dataUrl: string,
  options: ResizeProductPhotoOptions = PRODUCT_PHOTO_RESIZE_OPTIONS,
): Promise<string> {
  const maxWidth = options.maxWidth ?? PRODUCT_PHOTO_MAX_SIZE;
  const maxHeight = options.maxHeight ?? PRODUCT_PHOTO_MAX_SIZE;
  const quality = options.quality ?? PRODUCT_PHOTO_QUALITY;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(resizeLoadedImage(img, maxWidth, maxHeight, quality));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export function resizeFileToProductPhoto(
  file: File,
  options: ResizeProductPhotoOptions = PRODUCT_PHOTO_RESIZE_OPTIONS,
): Promise<string> {
  const maxWidth = options.maxWidth ?? PRODUCT_PHOTO_MAX_SIZE;
  const maxHeight = options.maxHeight ?? PRODUCT_PHOTO_MAX_SIZE;
  const quality = options.quality ?? PRODUCT_PHOTO_QUALITY;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(resizeLoadedImage(img, maxWidth, maxHeight, quality));
        URL.revokeObjectURL(img.src);
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}
