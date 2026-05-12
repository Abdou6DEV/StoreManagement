export type CloudBackupErrorCode =
  | "missing_env"
  | "invalid"
  | "missing_customer_id"
  | "missing_file"
  | "file_too_large"
  | "network"
  | "http"
  | "edge"
  | "unauthorized";

export type CloudBackupUploadMeta = {
  uploaded_at: string;
  size_bytes: number;
  source: string;
  app_version: string;
  device_id: string;
  customer_id: string;
};

export type CloudBackupUploadResult =
  | {
      success: true;
      dbPath: string;
      metaPath: string;
      meta: CloudBackupUploadMeta;
    }
  | {
      success: false;
      error: string;
      code: CloudBackupErrorCode;
    };

export type CloudBackupDownloadResult =
  | {
      success: true;
      customerId: string;
      dbSignedUrl: string;
    }
  | {
      success: false;
      error: string;
      code: CloudBackupErrorCode;
    };
