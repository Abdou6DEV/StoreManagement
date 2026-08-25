export type InvoiceScanStatus =
  | "waiting"
  | "uploaded"
  | "completed"
  | "expired"
  | "failed";

export type InvoiceScanCreateResult =
  | {
      success: true;
      sessionId: string;
      scanUrl: string;
      qrDataUrl: string;
      expiresAt: string;
    }
  | { success: false; error: string; code: string };

export type InvoiceScanStatusResult =
  | { success: true; status: InvoiceScanStatus; expiresAt: string | null }
  | { success: false; error: string; code: string };

export type InvoiceScanDownloadResult =
  | {
      success: true;
      localPath: string;
      dataUrl: string;
    }
  | { success: false; error: string; code: string };
