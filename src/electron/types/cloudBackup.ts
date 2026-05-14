/** Progress events for cloud backup upload/download (renderer: same layout as app update download). */
export type CloudBackupTransferProgressPayload = {
  phase: "upload" | "download";
  progress: number;
  downloaded: number;
  total: number;
  speed: number;
};

export type CloudBackupErrorCode =
  | "missing_env"
  | "invalid"
  | "missing_customer_id"
  | "missing_file"
  | "file_too_large"
  | "network"
  | "http"
  | "edge"
  | "unauthorized"
  | "not_found";

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

/** Downloaded cloud `.db` into the local backups folder (same naming pattern as upload snapshots). */
export type CloudBackupDownloadToLocalResult =
  | {
      success: true;
      backupPath: string;
      sizeBytes: number;
    }
  | {
      success: false;
      error: string;
      code: CloudBackupErrorCode;
    };
