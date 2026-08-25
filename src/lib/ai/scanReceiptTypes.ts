export type ScanReceiptItem = {
  name: string;
  quantity: number;
  boughtPrice: number | null;
};

export type ScanReceiptExtraction = {
  supplierName: string | null;
  items: ScanReceiptItem[];
};

export type ScanReceiptResult =
  | { success: true; data: ScanReceiptExtraction }
  | {
      success: false;
      error: string;
      code:
        | "invalid"
        | "missing_file"
        | "missing_env"
        | "offline"
        | "quota"
        | "ai_disabled"
        | "unreadable"
        | "model"
        | "parse";
    };
