export type FindProductImageRequest = {
  productName: string;
  categoryName?: string | null;
  /** App UI language (`en` | `fr` | `ar`) — passed to Serper as `hl`. */
  locale?: string | null;
};

export type FindImageCandidate = {
  /** Full-size image URL used when the user confirms a choice. */
  url: string;
  /** Smaller preview URL when the provider supplies one. */
  thumbnailUrl: string | null;
  title: string | null;
  source: string | null;
};

export type FindProductImageResult =
  | {
      success: true;
      query: string;
      images: FindImageCandidate[];
    }
  | {
      success: false;
      error: string;
      code:
        | "invalid"
        | "missing_env"
        | "offline"
        | "quota"
        | "ai_disabled"
        | "model"
        | "search"
        | "no_results";
    };

export type DownloadProductImageRequest = {
  url: string;
};

export type DownloadProductImageResult =
  | {
      success: true;
      /** Raw image bytes as a data URL; the renderer resizes to product photo specs. */
      dataUrl: string;
      mimeType: string;
    }
  | {
      success: false;
      error: string;
      code: "invalid" | "fetch" | "too_large" | "not_image";
    };
