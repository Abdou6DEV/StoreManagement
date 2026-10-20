export type MobileSyncStatus = {
  inProgress: boolean;
  pending: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type MobileSyncNowResult =
  | { success: true; status: MobileSyncStatus }
  | { success: false; error: string; status: MobileSyncStatus };
