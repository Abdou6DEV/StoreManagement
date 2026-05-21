import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Calendar,
  FolderOpen,
  CloudUpload,
  Cloud,
  Copy,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  Trash2,
  Shield,
} from "lucide-react";
import { Button } from "../../../lib/components/button";
import { Switch } from "../../../lib/components/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../../../lib/components/card";
import { Alert, AlertDescription } from "../../../lib/components/alert";
import { Badge } from "../../../lib/components/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "../../../lib/components/dialog";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import type { BackupFile } from "../../../electron/preload/types";
import { cn } from "../../../lib/utils";
import { AUTO_CLOUD_BACKUP_ENABLED_OPTION_KEY } from "../../../lib/backup/constants";
import {
  loadCloudBackupPresenceFromOptions,
  persistCloudBackupPresence,
  type CloudBackupPresenceSnapshot,
} from "../../../lib/backup/cloudBackupPresence";
import { ONLINE_CUSTOMER_ID_OPTION_KEY } from "../../../lib/onboarding/constants";
import type { CloudBackupTransferProgressPayload } from "../../../electron/types/cloudBackup";
import { usePaidCloudBackupAccess } from "../../../lib/hooks/usePaidCloudBackupAccess";
import type { CloudBackupAccessBlockReason } from "../../../lib/license/paidCloudBackupAccess";

const RESTORE_CONFIRM_WORD = "YES";
const CLOUD_BACKUP_CHECK_COOLDOWN_MS = 60_000;

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="break-all text-sm font-semibold text-foreground">{value}</div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

type BackupManagementProps = {
  onOpenLicenseTab?: () => void;
};

export function BackupManagement({ onOpenLicenseTab }: BackupManagementProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { hasPaidCloudBackupAccess, blockReason, isAccessResolved } = usePaidCloudBackupAccess();
  const cloudBackupGateActive = isAccessResolved && !hasPaidCloudBackupAccess;
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [backupPendingDelete, setBackupPendingDelete] = useState<BackupFile | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [backupProgressOpen, setBackupProgressOpen] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState("");
  const [customPathDialogOpen, setCustomPathDialogOpen] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [restoreFromFileDialogOpen, setRestoreFromFileDialogOpen] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState("");
  const [uploadingCloud, setUploadingCloud] = useState(false);
  const [storedCustomerId, setStoredCustomerId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [copiedCustomerId, setCopiedCustomerId] = useState(false);
  const [checkingCloudPresence, setCheckingCloudPresence] = useState(false);
  const [downloadingCloudBackup, setDownloadingCloudBackup] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastManualCloudBackupCheckMs, setLastManualCloudBackupCheckMs] = useState<number | null>(null);
  const [lastRemoteBackupCheckMs, setLastRemoteBackupCheckMs] = useState<number | null>(null);
  const [remoteBackupKnownAvailable, setRemoteBackupKnownAvailable] = useState<boolean | null>(null);
  const [cloudTransferWarningOpen, setCloudTransferWarningOpen] = useState(false);
  const [cloudTransferDialogPhase, setCloudTransferDialogPhase] = useState<"upload" | "download" | null>(null);
  const [cloudTransferProgress, setCloudTransferProgress] = useState<CloudBackupTransferProgressPayload | null>(null);
  const [autoCloudBackupEnabled, setAutoCloudBackupEnabled] = useState(false);
  const [savingAutoCloudSetting, setSavingAutoCloudSetting] = useState(false);
  const cloudTransferPhaseRef = useRef<"upload" | "download" | null>(null);
  const cloudPresenceRef = useRef<CloudBackupPresenceSnapshot>({
    lastCheckAtMs: null,
    available: null,
    lastManualCheckAtMs: null,
    initialCheckDone: false,
  });
  const initialCloudCheckStartedRef = useRef(false);
  const [cloudPresenceHydrated, setCloudPresenceHydrated] = useState(false);

  const loadStoredCustomerId = useCallback(async () => {
    try {
      let v = await window.api.database.options.get(ONLINE_CUSTOMER_ID_OPTION_KEY);
      let trimmed = v?.trim() || null;
      if (!trimmed && isOnline) {
        const check = await window.api.online.deviceCheck();
        if (check.success === true && check.customerId?.trim()) {
          trimmed = check.customerId.trim();
          v = await window.api.database.options.get(ONLINE_CUSTOMER_ID_OPTION_KEY);
          trimmed = v?.trim() || trimmed;
        }
      }
      setStoredCustomerId(trimmed);
    } catch {
      setStoredCustomerId(null);
    }
  }, [isOnline]);

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
  }, []);

  useEffect(() => {
    void loadStoredCustomerId();
  }, [loadStoredCustomerId]);

  const applyCloudPresence = useCallback(async (patch: Partial<CloudBackupPresenceSnapshot>) => {
    const next: CloudBackupPresenceSnapshot = {
      ...cloudPresenceRef.current,
      ...patch,
    };
    cloudPresenceRef.current = next;
    setLastRemoteBackupCheckMs(next.lastCheckAtMs);
    setRemoteBackupKnownAvailable(next.available);
    setLastManualCloudBackupCheckMs(next.lastManualCheckAtMs);
    await persistCloudBackupPresence(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const saved = await loadCloudBackupPresenceFromOptions();
      cloudPresenceRef.current = saved;
      setLastRemoteBackupCheckMs(saved.lastCheckAtMs);
      setRemoteBackupKnownAvailable(saved.available);
      setLastManualCloudBackupCheckMs(saved.lastManualCheckAtMs);
      setCloudPresenceHydrated(true);
    })();
  }, []);

  const loadAutoCloudBackupSetting = useCallback(async () => {
    try {
      const v = await window.api.database.options.get(AUTO_CLOUD_BACKUP_ENABLED_OPTION_KEY);
      setAutoCloudBackupEnabled(v === "1" || v?.trim().toLowerCase() === "true");
    } catch {
      setAutoCloudBackupEnabled(false);
    }
  }, []);

  useEffect(() => {
    void loadAutoCloudBackupSetting();
  }, [loadAutoCloudBackupSetting]);

  const handleAutoCloudBackupChange = async (checked: boolean) => {
    setSavingAutoCloudSetting(true);
    try {
      await window.api.database.options.set(AUTO_CLOUD_BACKUP_ENABLED_OPTION_KEY, checked ? "1" : "0");
      setAutoCloudBackupEnabled(checked);
    } catch {
      showToast(t("admin.backup.autoCloudBackupSaveFailed", "Could not save automatic cloud backup setting."), "error");
    } finally {
      setSavingAutoCloudSetting(false);
    }
  };

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastManualCloudBackupCheckMs == null) return;
    if (Date.now() >= lastManualCloudBackupCheckMs + CLOUD_BACKUP_CHECK_COOLDOWN_MS) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lastManualCloudBackupCheckMs]);

  const cloudBackupCheckCooldownRemainingMs = useMemo(() => {
    if (lastManualCloudBackupCheckMs == null) return 0;
    return Math.max(0, lastManualCloudBackupCheckMs + CLOUD_BACKUP_CHECK_COOLDOWN_MS - nowMs);
  }, [lastManualCloudBackupCheckMs, nowMs]);

  useEffect(() => {
    const cleanup = window.api.online.onCloudBackupTransferProgress((data) => {
      if (cloudTransferPhaseRef.current !== data.phase) return;
      setCloudTransferProgress(data);
    });
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const unsub =
      typeof window.api?.backup?.onAutoCloudUploadSuccess === "function"
        ? window.api.backup.onAutoCloudUploadSuccess(() => {
            void applyCloudPresence({
              lastCheckAtMs: Date.now(),
              available: true,
            });
          })
        : undefined;
    return () => {
      unsub?.();
    };
  }, [applyCloudPresence]);

  // Refresh list when an automatic backup was just created (so the new backup appears)
  useEffect(() => {
    const refresh = () => loadBackups();
    window.addEventListener("backup:created", refresh);
    const unsub =
      typeof window.api?.backup?.onAutoBackupSuccess === "function"
        ? window.api.backup.onAutoBackupSuccess(refresh)
        : undefined;
    return () => {
      window.removeEventListener("backup:created", refresh);
      unsub?.();
    };
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const result = await window.api.backup.list();
      if (result.success) {
        setBackups(result.backups || []);
      } else {
        showToast(t("admin.backup.failedToLoadBackups", "Failed to load backups"), "error");
      }
    } catch (error) {
      showToast(t("admin.backup.errorLoadingBackups", "Error loading backups"), "error");
      console.error("Error loading backups:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloud = async () => {
    cloudTransferPhaseRef.current = "upload";
    try {
      setUploadingCloud(true);
      setCloudTransferDialogPhase("upload");
      setCloudTransferWarningOpen(true);
      setCloudTransferProgress({
        phase: "upload",
        progress: 0,
        downloaded: 0,
        total: 0,
        speed: 0,
      });
      const created = await window.api.backup.createCloud();
      if (!created.success || !created.backupPath) {
        showToast(
          `${t("admin.backup.failedToCreateBackup", "Failed to create backup:")} ${created.error ?? ""}`,
          "error",
        );
        return;
      }

      const uploaded = await window.api.online.backupUploadLatest(created.backupPath, "manual_upload");
      if (uploaded.success === true) {
        await window.api.backup.deleteCloudUploadStaging(created.backupPath);
        await loadBackups();
        showToast(t("admin.backup.cloudUploadSuccess", "Cloud backup uploaded successfully"), "success");
        await applyCloudPresence({
          lastCheckAtMs: Date.now(),
          available: true,
        });
        return;
      }

      if (uploaded.success === false) {
        const normalizedError = uploaded.error.trim().toLowerCase();
        if (uploaded.code === "missing_customer_id") {
          showToast(
            t(
              "admin.backup.cloudUploadMissingCustomer",
              "Customer ID is not recorded on this device. Complete welcome setup first.",
            ),
            "error",
          );
          return;
        }
        if (uploaded.code === "file_too_large" || normalizedError.includes("file_too_large")) {
          showToast(
            t("admin.backup.cloudUploadFileTooLarge", "This backup is too large to upload on the current plan."),
            "error",
          );
          return;
        }
        if (normalizedError.includes("device_inactive")) {
          showToast(
            t(
              "admin.backup.cloudUploadDeviceInactive",
              "This device is not activated for paid cloud backup yet.",
            ),
            "error",
          );
          return;
        }
        if (uploaded.code === "missing_env") {
          showToast(
            t("admin.backup.cloudUploadNeedsOnline", "Online backup is not configured on this app build."),
            "error",
          );
          return;
        }

        showToast(
          `${t("admin.backup.cloudUploadFailed", "Failed to upload cloud backup")}: ${uploaded.error}`,
          "error",
        );
      }
    } catch (error) {
      showToast(t("admin.backup.cloudUploadFailed", "Failed to upload cloud backup"), "error");
      console.error("Error uploading cloud backup:", error);
    } finally {
      cloudTransferPhaseRef.current = null;
      setUploadingCloud(false);
      setCloudTransferDialogPhase(null);
      setCloudTransferWarningOpen(false);
      setCloudTransferProgress(null);
    }
  };

  const checkRemoteCloudBackup = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      const manualCooldownAtMs = cloudPresenceRef.current.lastManualCheckAtMs;
      if (
        !silent &&
        (checkingCloudPresence ||
          (manualCooldownAtMs != null &&
            Date.now() < manualCooldownAtMs + CLOUD_BACKUP_CHECK_COOLDOWN_MS))
      ) {
        return;
      }
      try {
        if (!silent) setCheckingCloudPresence(true);
        const r = await window.api.online.backupDownloadLatest();
        if (r.success === true) {
          const checkedAtMs = Date.now();
          await applyCloudPresence({
            lastCheckAtMs: checkedAtMs,
            available: true,
            ...(silent ? {} : { lastManualCheckAtMs: checkedAtMs }),
          });
          return;
        }

        const checkedAtMs = Date.now();
        if (r.code === "not_found") {
          await applyCloudPresence({
            lastCheckAtMs: checkedAtMs,
            available: false,
            ...(silent ? {} : { lastManualCheckAtMs: checkedAtMs }),
          });
          if (!silent) {
            showToast(
              t("admin.backup.cloudCheckNone", "No cloud backup was found for this customer yet."),
              "info",
            );
          }
          return;
        }

        setRemoteBackupKnownAvailable(null);
        if (r.code === "missing_customer_id") {
          if (!silent) {
            showToast(
              t(
                "admin.backup.cloudUploadMissingCustomer",
                "Customer ID is not recorded on this device. Complete welcome setup first.",
              ),
              "error",
            );
          }
          return;
        }
        if (r.code === "missing_env") {
          if (!silent) {
            showToast(
              t("admin.backup.cloudUploadNeedsOnline", "Online backup is not configured on this app build."),
              "error",
            );
          }
          return;
        }
        if (r.code === "network") {
          if (!silent) {
            showToast(
              t("admin.backup.cloudCheckNetwork", "Could not reach the server. Check your connection."),
              "error",
            );
          }
          return;
        }

        if (!silent) {
          showToast(
            t("admin.backup.cloudCheckFailed", "Could not verify cloud backup: {{message}}", {
              message: r.error,
            }),
            "error",
          );
        }
      } catch {
        if (!silent) {
          showToast(t("admin.backup.cloudCheckFailedGeneric", "Could not verify cloud backup."), "error");
        }
      } finally {
        if (!silent) setCheckingCloudPresence(false);
      }
    },
    [applyCloudPresence, checkingCloudPresence, showToast, t],
  );

  useEffect(() => {
    if (!cloudPresenceHydrated || !isAccessResolved || !hasPaidCloudBackupAccess) return;
    if (cloudPresenceRef.current.initialCheckDone || initialCloudCheckStartedRef.current) return;
    if (!isOnline) return;
    initialCloudCheckStartedRef.current = true;
    void checkRemoteCloudBackup({ silent: true }).finally(() => {
      void applyCloudPresence({ initialCheckDone: true });
    });
  }, [
    applyCloudPresence,
    checkRemoteCloudBackup,
    cloudPresenceHydrated,
    hasPaidCloudBackupAccess,
    isAccessResolved,
    isOnline,
  ]);

  const downloadRemoteCloudBackup = async () => {
    cloudTransferPhaseRef.current = "download";
    try {
      setDownloadingCloudBackup(true);
      setCloudTransferDialogPhase("download");
      setCloudTransferWarningOpen(true);
      setCloudTransferProgress({
        phase: "download",
        progress: 0,
        downloaded: 0,
        total: 0,
        speed: 0,
      });
      const r = await window.api.online.backupDownloadLatestToLocal();
      if (r.success === true) {
        await applyCloudPresence({
          lastCheckAtMs: Date.now(),
          available: true,
        });
        await loadBackups();
        showToast(
          t(
            "admin.backup.cloudDownloadSaved",
            "Latest cloud backup saved to this computer. You can restore it from the list below.",
          ),
          "success",
        );
        return;
      }

      if (r.code === "not_found") {
        await applyCloudPresence({
          lastCheckAtMs: Date.now(),
          available: false,
        });
        showToast(
          t("admin.backup.cloudDownloadNotFound", "No cloud backup was found to download."),
          "info",
        );
        return;
      }

      const errMsg = r.success === false ? String(r.error ?? "") : "";

      if (r.code === "missing_customer_id") {
        showToast(
          t(
            "admin.backup.cloudUploadMissingCustomer",
            "Customer ID is not recorded on this device. Complete welcome setup first.",
          ),
          "error",
        );
        return;
      }
      if (r.code === "missing_env") {
        showToast(
          t("admin.backup.cloudUploadNeedsOnline", "Online backup is not configured on this app build."),
          "error",
        );
        return;
      }
      if (errMsg.toLowerCase().includes("device_inactive")) {
        showToast(
          t(
            "admin.backup.cloudUploadDeviceInactive",
            "This device is not activated for paid cloud backup yet.",
          ),
          "error",
        );
        return;
      }
      if (r.code === "network") {
        showToast(t("admin.backup.cloudDownloadNetwork", "Download failed. Check your connection."), "error");
        return;
      }
      if (r.code === "app_update_required") {
        showToast(
          t(
            "admin.backup.cloudAppUpdateRequired",
            "This cloud backup needs app version {{cloudVersion}} or newer. You have {{installedVersion}}. Update the app before downloading or restoring.",
            {
              cloudVersion: r.cloudAppVersion ?? "?",
              installedVersion: r.installedAppVersion ?? "?",
            },
          ),
          "error",
        );
        return;
      }

      showToast(
        t("admin.backup.cloudDownloadFailed", "Cloud download failed: {{message}}", { message: errMsg || "Unknown error" }),
        "error",
      );
    } catch {
      showToast(t("admin.backup.cloudDownloadFailedGeneric", "Cloud download failed."), "error");
    } finally {
      cloudTransferPhaseRef.current = null;
      setDownloadingCloudBackup(false);
      setCloudTransferDialogPhase(null);
      setCloudTransferWarningOpen(false);
      setCloudTransferProgress(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const copyCustomerId = async () => {
    if (!storedCustomerId) return;
    try {
      await navigator.clipboard.writeText(storedCustomerId);
      setCopiedCustomerId(true);
      showToast(t("admin.backup.customerIdCopied", "Customer ID copied"), "success");
      window.setTimeout(() => setCopiedCustomerId(false), 2000);
    } catch {
      showToast(t("admin.backup.customerIdCopyFailed", "Could not copy customer ID"), "error");
    }
  };

  const createBackup = async () => {
    try {
      setCreatingBackup(true);
      setBackupProgressOpen(true);
      setBackupProgress(0);
      setBackupStatus("Preparing backup...");
      
      // Simulate progress steps
      const progressSteps = [
        { progress: 20, status: "Validating database..." },
        { progress: 40, status: "Creating backup file..." },
        { progress: 60, status: "Verifying backup integrity..." },
        { progress: 80, status: "Finalizing backup..." },
        { progress: 100, status: "Backup completed!" }
      ];
      
      // Start the actual backup
      const backupPromise = window.api.backup.createManual();
      
      // Simulate progress updates
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setBackupProgress(progressSteps[i].progress);
        setBackupStatus(progressSteps[i].status);
      }
      
      const result = await backupPromise;
      
      if (result.success) {
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.backupCreated",
          details: result.backupPath ?? null,
        }).catch((): void => {
          return;
        });
        showToast("Backup created successfully", "success");
        await loadBackups(); // Refresh the list
      } else {
        showToast(`Failed to create backup: ${result.error}`, "error");
      }
    } catch (error) {
      showToast("Error creating backup", "error");
      console.error("Error creating backup:", error);
    } finally {
      setCreatingBackup(false);
      setBackupProgressOpen(false);
      setBackupProgress(0);
      setBackupStatus("");
    }
  };

  const cleanupOldBackups = async () => {
    try {
      setLoading(true);
      const result = await window.api.backup.cleanup();
      if (result.success) {
        showToast(result.message, "success");
        await loadBackups(); // Refresh the list
      } else {
        showToast(`Cleanup failed: ${result.error}`, "error");
      }
    } catch (error) {
      showToast("Error during cleanup", "error");
      console.error("Error during cleanup:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBackupToCustomPath = async () => {
    if (!customPath.trim()) {
      showToast("Please enter a valid backup path", "error");
      return;
    }

    try {
      setCreatingBackup(true);
      setBackupProgressOpen(true);
      setBackupProgress(0);
      setBackupStatus("Preparing backup to custom path...");
      
      // Simulate progress steps
      const progressSteps = [
        { progress: 20, status: "Validating database..." },
        { progress: 40, status: "Creating backup file..." },
        { progress: 60, status: "Verifying backup integrity..." },
        { progress: 80, status: "Finalizing backup..." },
        { progress: 100, status: "Backup completed!" }
      ];
      
      // Start the actual backup
      const backupPromise = window.api.backup.createManualToPath(customPath);
      
      // Simulate progress updates
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setBackupProgress(progressSteps[i].progress);
        setBackupStatus(progressSteps[i].status);
      }
      
      const result = await backupPromise;
      
      if (result.success) {
        showToast(`Backup created successfully to: ${customPath}`, "success");
        setCustomPathDialogOpen(false);
        setCustomPath("");
        await loadBackups(); // Refresh the list
      } else {
        showToast(`Failed to create backup: ${result.error}`, "error");
      }
    } catch (error) {
      showToast("Error creating backup", "error");
      console.error("Error creating backup:", error);
    } finally {
      setCreatingBackup(false);
      setBackupProgressOpen(false);
      setBackupProgress(0);
      setBackupStatus("");
    }
  };

  const restoreFromCustomFile = async () => {
    if (!selectedRestoreFile.trim()) {
      showToast("Please select a backup file to restore", "error");
      return;
    }

    try {
      setRestoring(selectedRestoreFile);
      setBackupProgressOpen(true);
      setBackupProgress(0);
      setBackupStatus("Preparing restore from custom file...");

      // Simulate progress steps
      const progressSteps = [
        { progress: 20, status: "Validating backup file..." },
        { progress: 40, status: "Creating safety backup..." },
        { progress: 60, status: "Restoring database file..." },
        { progress: 80, status: "Validating restored database..." },
        { progress: 100, status: "Restore completed! Redirecting to login..." }
      ];

      // Start the actual restore
      const restorePromise = window.api.backup.restore(selectedRestoreFile);
      
      // Simulate progress updates
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setBackupProgress(progressSteps[i].progress);
        setBackupStatus(progressSteps[i].status);
      }

      const result = await restorePromise;

      if (result.success) {
        showToast("Database restored successfully from custom file. Redirecting to login...", "success");
        setRestoreFromFileDialogOpen(false);
        setSelectedRestoreFile("");
        setTimeout(() => {
          logout(); // Clear auth state
          navigate('/login', { replace: true }); // Redirect
        }, 2000);
      } else {
        showToast(`Restore failed: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Custom file restore error:", error);
      showToast("Failed to restore from custom file", "error");
    } finally {
      setRestoring("");
      setBackupProgressOpen(false);
      setBackupProgress(0);
      setBackupStatus("");
    }
  };

  const openRestoreDialog = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setConfirmText("");
    setRestoreDialogOpen(true);
  };

  const closeRestoreDialog = () => {
    setRestoreDialogOpen(false);
    setSelectedBackup(null);
    setConfirmText("");
  };

  const confirmRestore = async () => {
    if (!selectedBackup) return;
    
    if (confirmText !== RESTORE_CONFIRM_WORD) {
      showToast(
        t("admin.backup.pleaseTypeYesToConfirm", "Please type YES to confirm"),
        "error",
      );
      return;
    }

    try {
      setRestoring(selectedBackup.path);
      setBackupProgressOpen(true);
      setBackupProgress(0);
      setBackupStatus("Preparing restore...");
      
      // Simulate progress steps for restore
      const progressSteps = [
        { progress: 20, status: "Creating safety backup..." },
        { progress: 40, status: "Disconnecting from database..." },
        { progress: 60, status: "Restoring backup file..." },
        { progress: 80, status: "Validating restored database..." },
        { progress: 100, status: "Restore completed! Redirecting to login..." }
      ];
      
      // Start the actual restore
      const restorePromise = window.api.backup.restore(selectedBackup.path);
      
      // Simulate progress updates
      for (let i = 0; i < progressSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setBackupProgress(progressSteps[i].progress);
        setBackupStatus(progressSteps[i].status);
      }
      
      const result = await restorePromise;
      
      if (result.success) {
        showToast("Database restored successfully. Redirecting to login...", "success");
        closeRestoreDialog();
        
        // Wait a moment for the toast to show, then redirect to login
        setTimeout(() => {
          // Clear auth state and redirect to login
          logout();
          navigate('/login', { replace: true });
        }, 2000);
      } else if (
        !result.success &&
        "code" in result &&
        result.code === "app_update_required"
      ) {
        showToast(
          t(
            "admin.backup.cloudRestoreAppUpdateRequired",
            "This cloud backup needs app version {{cloudVersion}} or newer. You have {{installedVersion}}. Update the app, then restore again.",
            {
              cloudVersion:
                "cloudAppVersion" in result && typeof result.cloudAppVersion === "string"
                  ? result.cloudAppVersion
                  : "?",
              installedVersion:
                "installedAppVersion" in result && typeof result.installedAppVersion === "string"
                  ? result.installedAppVersion
                  : "?",
            },
          ),
          "error",
        );
      } else {
        showToast(`Failed to restore backup: ${result.error}`, "error");
      }
    } catch (error) {
      showToast("Error restoring backup", "error");
      console.error("Error restoring backup:", error);
    } finally {
      setRestoring(null);
      setBackupProgressOpen(false);
      setBackupProgress(0);
      setBackupStatus("");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const loc = i18n.language === "ar" ? "ar" : i18n.language === "fr" ? "fr" : "en";
    const datePart = new Intl.DateTimeFormat(loc, { dateStyle: "medium" }).format(date);
    const timePart = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" }).format(date);
    return `${datePart}\u00a0${timePart}`;
  };

  const getBackupStatus = (backup: BackupFile) => {
    const backupDate = new Date(backup.date);
    const now = new Date();
    const diffInHours = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);

    if (backup.type === "cloud") {
      return { status: "cloud", color: "bg-sky-500", text: t("admin.backup.cloud", "Cloud") };
    }
    if (backup.type === "manual") {
      return { status: "manual", color: "bg-blue-500", text: t("admin.backup.manual", "Manual") };
    }
    if (diffInHours < 24) {
      return { status: "recent", color: "bg-green-500", text: t("admin.backup.recent", "Recent") };
    }
    if (diffInHours < 48) {
      return { status: "yesterday", color: "bg-yellow-500", text: t("admin.backup.yesterday", "Yesterday") };
    }
    return { status: "old", color: "bg-red-500", text: t("admin.backup.older", "Older") };
  };

  const autoBackups = useMemo(
    () => backups.filter((b) => b.type === "automatic"),
    [backups],
  );
  const cloudBackups = useMemo(() => backups.filter((b) => b.type === "cloud"), [backups]);
  const manualBackups = useMemo(() => backups.filter((b) => b.type === "manual"), [backups]);

  const cloudBackupBlockedMessage = useMemo(() => {
    const reason: CloudBackupAccessBlockReason | null = cloudBackupGateActive
      ? blockReason ?? "unknown"
      : null;
    switch (reason) {
      case "trial":
        return t(
          "admin.backup.cloudBackupUnavailableTrial",
          "Online backup is included with a paid subscription. During the free trial, use local backups only. Open the License tab to see your status or contact your provider.",
        );
      case "subscription_expired":
        return t(
          "admin.backup.cloudBackupUnavailableExpired",
          "Your paid subscription has ended. Renew your license to use online backup again.",
        );
      case "not_licensed":
        return t(
          "admin.backup.cloudBackupUnavailableNotLicensed",
          "Online backup requires an active paid license. Sign in and verify your license on the License tab.",
        );
      default:
        return t(
          "admin.backup.cloudBackupUnavailableUnknown",
          "Online backup will be available after your license is verified. Open the License tab and run an online check.",
        );
    }
  }, [blockReason, cloudBackupGateActive, t]);

  const openLicenseTab = useCallback(() => {
    onOpenLicenseTab?.();
  }, [onOpenLicenseTab]);

  const lastRemoteCheckLabel = useMemo(() => {
    if (lastRemoteBackupCheckMs == null) return "—";
    const loc = i18n.language === "ar" ? "ar" : i18n.language === "fr" ? "fr" : "en";
    return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(lastRemoteBackupCheckMs),
    );
  }, [lastRemoteBackupCheckMs, i18n.language]);

  const remotePresenceBadge = useMemo(() => {
    if (!isOnline) {
      return {
        className: "border-border text-muted-foreground",
        label: t("admin.backup.hubRemoteOffline", "Offline — connect to use the server"),
      };
    }
    if (checkingCloudPresence || downloadingCloudBackup) {
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        label: t("admin.backup.hubRemoteWorking", "Checking / downloading…"),
      };
    }
    if (remoteBackupKnownAvailable === true) {
      return {
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        label: t("admin.backup.hubRemoteYes", "Online backup available"),
      };
    }
    if (remoteBackupKnownAvailable === false) {
      return {
        className: "border-border text-muted-foreground",
        label: t("admin.backup.hubRemoteNo", "No file online (last check)"),
      };
    }
    return {
      className: "border-border text-muted-foreground",
      label: t("admin.backup.hubRemoteUnknown", "Not checked against server"),
    };
  }, [checkingCloudPresence, downloadingCloudBackup, isOnline, remoteBackupKnownAvailable, t]);

  const openDeleteDialog = (backup: BackupFile) => {
    setBackupPendingDelete(backup);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deletingPath) return;
    setDeleteDialogOpen(false);
    setBackupPendingDelete(null);
  };

  const confirmDeleteBackup = async () => {
    if (!backupPendingDelete) return;
    const backup = backupPendingDelete;
    try {
      setDeletingPath(backup.path);
      const result = await window.api.backup.deleteListingFile(backup.path);
      if (result.success) {
        showToast(t("admin.backup.deleteBackupSuccess", "Backup file deleted"), "success");
        setDeleteDialogOpen(false);
        setBackupPendingDelete(null);
        await loadBackups();
      } else {
        showToast(
          t("admin.backup.deleteBackupFailed", "Could not delete backup: {{message}}", {
            message: result.error ?? "",
          }),
          "error",
        );
      }
    } catch {
      showToast(t("admin.backup.deleteBackupFailedGeneric", "Could not delete backup"), "error");
    } finally {
      setDeletingPath(null);
    }
  };

  const renderBackupCard = (backup: BackupFile, indexInSection: number) => {
    const status = getBackupStatus(backup);
    const showLatest = indexInSection === 0;
    return (
      <Card key={backup.name} className="relative border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
              <div className={cn("h-3 w-3 shrink-0 rounded-full", status.color)} />
              <CardTitle className="break-all text-base font-semibold sm:text-lg">{backup.name}</CardTitle>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {status.text}
              </Badge>
              {backup.type === "cloud" ? (
                <Cloud className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
              ) : null}
            </div>
            {showLatest ? (
              <div className="shrink-0 text-sm text-muted-foreground">{t("admin.backup.latest", "Latest")}</div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 text-muted-foreground">{t("admin.backup.created", "Created:")}</span>
              <span className="whitespace-nowrap font-medium" title={formatDate(backup.date)}>
                {formatDate(backup.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <HardDrive className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{t("admin.backup.size", "Size:")}</span>
              <span className="font-medium">{formatFileSize(backup.size)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{t("admin.backup.age", "Age:")}</span>
              <span className="font-medium">
                {Math.floor((Date.now() - new Date(backup.date).getTime()) / (1000 * 60 * 60 * 24))}{" "}
                {t("admin.backup.days", "days")}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => openRestoreDialog(backup)}
              disabled={restoring === backup.path || !!deletingPath}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              {restoring === backup.path ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {restoring === backup.path ? t("admin.backup.restoring", "Restoring...") : t("admin.backup.restore", "Restore")}
            </Button>
            <Button
              type="button"
              onClick={() => openDeleteDialog(backup)}
              disabled={!!restoring || !!deletingPath}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {deletingPath === backup.path ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              {deletingPath === backup.path ? t("admin.backup.deleting", "Deleting...") : t("admin.backup.delete", "Delete")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Database className="h-7 w-7 text-orange-600" aria-hidden />
            {t("admin.backup.title", "Database Backup Management")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t(
              "admin.backup.hubPageLead",
              "Manage automatic copies, manual snapshots, and your optional online backup for this computer.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setRestoreFromFileDialogOpen(true)}
            disabled={!!restoring}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t("admin.backup.restoreFromFile", "Restore from File")}
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden border-border shadow-sm">
        <CardContent className="relative min-h-[28rem] p-0">
          {!isAccessResolved ? (
            <div
              className="flex min-h-[28rem] items-center justify-center p-6"
              aria-busy="true"
              aria-label={t("admin.backup.cloudAccessChecking", "Checking online backup access…")}
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : (
            <>
          <div
            className={cn(cloudBackupGateActive && "pointer-events-none select-none opacity-50")}
            aria-hidden={cloudBackupGateActive ? true : undefined}
          >
          <div className="flex flex-col gap-4 bg-gradient-to-br from-orange-500/10 via-background to-background p-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
                <Cloud className="h-7 w-7 text-orange-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("font-normal", remotePresenceBadge.className)}>
                    {remotePresenceBadge.label}
                  </Badge>
                  <Badge variant="outline" className="border-border">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5" aria-hidden />
                        {t("admin.backup.hubOnline", "Online")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <WifiOff className="h-3.5 w-3.5" aria-hidden />
                        {t("admin.backup.hubOffline", "Offline")}
                      </span>
                    )}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t("admin.backup.hubTitle", "Online backup")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    label={t("admin.backup.hubLastServerCheck", "Last server check")}
                    value={lastRemoteCheckLabel}
                    hint={t(
                      "admin.backup.hubLastServerCheckHint",
                      "Updated when you check, upload, or download the online backup.",
                    )}
                  />
                  <InfoRow
                    label={t("admin.backup.hubCustomerId", "Customer ID")}
                    value={
                      storedCustomerId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm">{storedCustomerId}</span>
                          <Button type="button" size="sm" variant="outline" onClick={() => void copyCustomerId()}>
                            {copiedCustomerId ? (
                              <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                            )}
                            {copiedCustomerId
                              ? t("admin.backup.customerIdCopiedShort", "Copied")
                              : t("admin.backup.customerIdCopy", "Copy")}
                          </Button>
                        </div>
                      ) : (
                        t("admin.backup.hubCustomerMissing", "Not recorded — complete welcome setup")
                      )
                    }
                    hint={t(
                      "admin.backup.hubCustomerHint",
                      "Used with your device ID so the server knows which online backup belongs to this shop.",
                    )}
                  />
                </div>
                <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <label
                      htmlFor="auto-cloud-backup"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("admin.backup.autoCloudBackupLabel", "Automatic cloud backup")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "admin.backup.autoCloudBackupDesc",
                        "When enabled, each new daily automatic backup on this PC is also uploaded to your online backup (latest only).",
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      id="auto-cloud-backup"
                      checked={autoCloudBackupEnabled}
                      onCheckedChange={(checked) => void handleAutoCloudBackupChange(checked)}
                      disabled={savingAutoCloudSetting || uploadingCloud || downloadingCloudBackup}
                      aria-label={t("admin.backup.autoCloudBackupLabel", "Automatic cloud backup")}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      {autoCloudBackupEnabled
                        ? t("admin.backup.autoCloudBackupOn", "Enabled")
                        : t("admin.backup.autoCloudBackupOff", "Disabled")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void checkRemoteCloudBackup()}
                    disabled={
                      !isOnline ||
                      checkingCloudPresence ||
                      cloudBackupCheckCooldownRemainingMs > 0 ||
                      downloadingCloudBackup ||
                      uploadingCloud ||
                      creatingBackup ||
                      !!restoring
                    }
                  >
                    {checkingCloudPresence ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Cloud className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    {cloudBackupCheckCooldownRemainingMs > 0
                      ? t("admin.backup.checkCloudBackupCooldown", "Check cloud backup ({{seconds}}s)", {
                          seconds: Math.ceil(cloudBackupCheckCooldownRemainingMs / 1000),
                        })
                      : t("admin.backup.checkCloudBackup", "Check cloud backup")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadRemoteCloudBackup()}
                    disabled={
                      !isOnline ||
                      checkingCloudPresence ||
                      downloadingCloudBackup ||
                      uploadingCloud ||
                      creatingBackup ||
                      !!restoring
                    }
                  >
                    {downloadingCloudBackup ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    {t("admin.backup.downloadCloudBackup", "Download from cloud")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void uploadToCloud()}
                    disabled={
                      !isOnline ||
                      creatingBackup ||
                      uploadingCloud ||
                      checkingCloudPresence ||
                      downloadingCloudBackup ||
                      !!restoring
                    }
                  >
                    {uploadingCloud ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <CloudUpload className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    {uploadingCloud
                      ? t("admin.backup.uploadingToCloud", "Uploading to cloud...")
                      : t("admin.backup.uploadToCloud", "Create & upload to cloud")}
                  </Button>
                </div>
                {(uploadingCloud || downloadingCloudBackup) && cloudTransferProgress ? (
                  <div className="mt-4 w-full max-w-xl">
                    <div className="w-full bg-muted rounded-full h-3 mb-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, cloudTransferProgress.progress))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span>
                        {Math.round(cloudTransferProgress.progress)}%{" "}
                        {t("admin.updatesContent.complete", "complete")}
                      </span>
                      <span>
                        {cloudTransferProgress.speed > 0 && `${formatBytes(cloudTransferProgress.speed)}/s`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>
                        {formatBytes(cloudTransferProgress.downloaded)} / {formatBytes(cloudTransferProgress.total)}
                      </span>
                      <span>
                        {cloudTransferProgress.total > 0 &&
                          cloudTransferProgress.downloaded > 0 &&
                          cloudTransferProgress.speed > 0 &&
                          (() => {
                            const remainingBytes = cloudTransferProgress.total - cloudTransferProgress.downloaded;
                            const remainingSeconds = Math.ceil(
                              remainingBytes / cloudTransferProgress.speed,
                            );

                            if (remainingSeconds < 60) {
                              return `${remainingSeconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
                            }
                            if (remainingSeconds < 3600) {
                              const minutes = Math.floor(remainingSeconds / 60);
                              const seconds = remainingSeconds % 60;
                              return `${minutes}m ${seconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
                            }
                            const hours = Math.floor(remainingSeconds / 3600);
                            const minutes = Math.floor((remainingSeconds % 3600) / 60);
                            return `${hours}h ${minutes}m ${t("admin.updatesContent.remaining", "remaining")}`;
                          })()}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-card px-6 py-5">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("admin.backup.hubLocalCloudSnapshots", "Latest backup downloaded from cloud")}
            </h4>
            <p className="mb-4 text-sm text-muted-foreground">
              {t(
                "admin.backup.hubLocalCloudSnapshotsDesc",
                "Only one file is kept here: the newest copy downloaded from your online backup (each download replaces it). Uploads use a temporary file on disk that is removed after a successful send, so they do not appear in this list.",
              )}
            </p>
            {cloudBackups.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                {t(
                  "admin.backup.emptyCloud",
                  "Nothing downloaded from the cloud yet. Use “Download from cloud” above, then you can restore this single file like any other backup.",
                )}
              </p>
            ) : (
              <div className="grid gap-4">{cloudBackups.map((b, i) => renderBackupCard(b, i))}</div>
            )}
          </div>
          </div>
          {cloudBackupGateActive ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-6 backdrop-blur-[2px]"
              role="region"
              aria-labelledby="cloud-backup-unavailable-title"
            >
              <div className="max-w-lg space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                  <Shield className="h-6 w-6 text-orange-600" aria-hidden />
                </div>
                <h4
                  id="cloud-backup-unavailable-title"
                  className="text-base font-semibold text-foreground"
                >
                  {t("admin.backup.cloudBackupUnavailableTitle", "Online backup unavailable")}
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {cloudBackupBlockedMessage}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={openLicenseTab}>
                  {t("admin.backup.cloudBackupOpenLicenseTab", "Open License tab")}
                </Button>
              </div>
            </div>
          ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        <AlertDescription>
          <strong>{t("admin.backup.warning", "Warning:")}</strong>{" "}
          {t(
            "admin.backup.warningDesc",
            "Restoring a backup will completely replace your current database. Make sure to create a manual backup before restoring if you want to keep your current data.",
          )}
        </AlertDescription>
      </Alert>

      {loading && backups.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          <span className="ml-2 text-muted-foreground">{t("admin.backup.loadingBackups", "Loading backups...")}</span>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-labelledby="backup-section-auto"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 id="backup-section-auto" className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  {t("admin.backup.sectionAutoTitle", "Automatic backups")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "admin.backup.sectionAutoDesc",
                    "Created daily when you use the app; only the two most recent files are kept in the backup folder.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={cleanupOldBackups} disabled={loading} variant="outline" size="sm">
                  <Database className="mr-2 h-4 w-4" aria-hidden />
                  {t("admin.backup.cleanupOld", "Cleanup Old Backups")}
                </Button>
              </div>
            </div>
            <div className="space-y-4 bg-card p-4 sm:p-5">
              {autoBackups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("admin.backup.emptyAuto", "No automatic backups yet. They appear after daily backup runs.")}
                </p>
              ) : (
                <div className="grid gap-4">{autoBackups.map((b, i) => renderBackupCard(b, i))}</div>
              )}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-labelledby="backup-section-manual"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h3 id="backup-section-manual" className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <HardDrive className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  {t("admin.backup.sectionManualTitle", "Manual backups")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "admin.backup.sectionManualDesc",
                    "Local copies you create in the backup folder, or save elsewhere with “Backup to custom path” (those paths are not listed here).",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void createBackup()}
                  disabled={creatingBackup || uploadingCloud || !!restoring || checkingCloudPresence || downloadingCloudBackup}
                  size="sm"
                >
                  {creatingBackup ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  {t("admin.backup.manualBackup", "Manual Backup")}
                </Button>
                <Button
                  onClick={() => setCustomPathDialogOpen(true)}
                  disabled={creatingBackup}
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" aria-hidden />
                  {t("admin.backup.backupToCustomPath", "Backup to Custom Path")}
                </Button>
              </div>
            </div>
            <div className="space-y-4 bg-card p-4 sm:p-5">
              {manualBackups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t(
                    "admin.backup.emptyManual",
                    "No manual backups in the folder yet. Create one with the buttons above.",
                  )}
                </p>
              ) : (
                <div className="grid gap-4">{manualBackups.map((b, i) => renderBackupCard(b, i))}</div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Cloud backup transfer notice */}
      <Dialog
        open={cloudTransferWarningOpen}
        onOpenChange={(open) => {
          if (!open) setCloudTransferWarningOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
              {cloudTransferDialogPhase === "upload"
                ? t(
                    "admin.backup.cloudTransferWarningTitleUpload",
                    "Cloud upload in progress",
                  )
                : t(
                    "admin.backup.cloudTransferWarningTitleDownload",
                    "Cloud download in progress",
                  )}
            </DialogTitle>
            <DialogDescription className="text-left">
              {t(
                "admin.backup.cloudTransferWarningDescription",
                "Do not close the application until the transfer finishes. Keep a stable internet connection. Closing the app or losing connectivity may leave an incomplete file or cause the transfer to fail.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setCloudTransferWarningOpen(false)}>
              {t("admin.backup.cloudTransferWarningOk", "I understand")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete backup confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
          else setDeleteDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
              {t("admin.backup.deleteBackupTitle", "Delete backup file")}
            </DialogTitle>
            <DialogDescription className="text-left">
              {t(
                "admin.backup.deleteBackupDesc",
                "This permanently removes the file from your backup folder. This cannot be undone.",
              )}
              {backupPendingDelete ? (
                <>
                  <br />
                  <strong className="mt-2 inline-block break-all text-foreground">{backupPendingDelete.name}</strong>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={!!deletingPath}>
              {t("admin.backup.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteBackup()}
              disabled={!backupPendingDelete || !!deletingPath}
              className="flex items-center gap-2"
            >
              {deletingPath ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              {deletingPath ? t("admin.backup.deleting", "Deleting...") : t("admin.backup.delete", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
       <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-lg">
               <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
               {t("admin.backup.restoreDatabase", "Restore Database")}
             </DialogTitle>
             <DialogDescription>
               {t("admin.backup.restoreConfirmDesc", "You are about to restore from:")} <strong>{selectedBackup?.name}</strong>
               <br />
               {t("admin.backup.restoreConfirmDesc2", "This will replace your current database with the selected backup.")}
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <label htmlFor="confirm-text" className="text-sm font-medium">
                 {t("admin.backup.typeYesToConfirm", "Type YES to confirm:")}
               </label>
               <input
                 id="confirm-text"
                 type="text"
                 value={confirmText}
                 onChange={(e) => setConfirmText(e.target.value)}
                 placeholder="YES"
                 className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                 autoComplete="off"
               />
             </div>
           </div>
           
           <DialogFooter className="gap-2">
             <Button
               variant="outline"
               onClick={closeRestoreDialog}
               disabled={restoring !== null}
             >
               {t("admin.backup.cancel", "Cancel")}
             </Button>
             <Button
               variant="destructive"
               onClick={confirmRestore}
               disabled={confirmText !== RESTORE_CONFIRM_WORD || restoring !== null}
               className="flex items-center gap-2"
             >
               {restoring ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
               ) : (
                 <Upload className="w-4 h-4" />
               )}
               {restoring ? t("admin.backup.restoring", "Restoring...") : t("admin.backup.restore", "Restore")}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Backup Progress Modal */}
       <Dialog open={backupProgressOpen} onOpenChange={() => undefined}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-lg">
               <Database className="w-5 h-5 text-primary" />
               {restoring ? "Restoring Database" : "Creating Backup"}
             </DialogTitle>
             <DialogDescription>
               {restoring 
                 ? "Please wait while we restore your database from backup..."
                 : "Please wait while we create your database backup..."
               }
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-6 py-4">
             {/* Progress Bar */}
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-muted-foreground">Progress</span>
                 <span className="font-medium">{backupProgress}%</span>
               </div>
               <div className="w-full bg-muted rounded-full h-2">
                 <div 
                   className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                   style={{ width: `${backupProgress}%` }}
                 />
               </div>
             </div>
             
             {/* Status Message */}
             <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
               <div className="flex-shrink-0">
                 {backupProgress < 100 ? (
                   <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                 ) : (
                  <CheckCircle className="h-5 w-5 text-primary" aria-hidden />
                 )}
               </div>
               <div className="flex-1">
                 <p className="text-sm font-medium">{backupStatus}</p>
                 {backupProgress < 100 && (
                   <p className="text-xs text-muted-foreground mt-1">
                     This may take a few moments...
                   </p>
                 )}
               </div>
             </div>
             
             {/* Backup Info */}
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="flex items-center gap-2">
                 <HardDrive className="w-4 h-4 text-muted-foreground" />
                 <span className="text-muted-foreground">Type:</span>
                 <span className="font-medium">
                   {restoring ? "Database Restore" : "Manual Backup"}
                 </span>
               </div>
               <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-muted-foreground" />
                 <span className="text-muted-foreground">Started:</span>
                 <span className="font-medium">{new Date().toLocaleTimeString()}</span>
               </div>
             </div>
             
             {restoring && selectedBackup && (
               <div className="p-3 bg-muted/30 rounded-lg">
                 <p className="text-sm text-muted-foreground mb-1">Restoring from:</p>
                 <p className="text-sm font-medium">{selectedBackup.name}</p>
               </div>
             )}
           </div>
           
           <DialogFooter>
             <div className="w-full text-center">
               <p className="text-xs text-muted-foreground">
                 {restoring 
                   ? "Do not close this window during restore process"
                   : "Do not close this window during backup process"
                 }
               </p>
             </div>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Custom Path Backup Dialog */}
       <Dialog open={customPathDialogOpen} onOpenChange={setCustomPathDialogOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-lg">
               <FolderOpen className="w-5 h-5 text-primary" />
               {t("admin.backup.backupToCustomPathTitle", "Backup to Custom Path")}
             </DialogTitle>
             <DialogDescription>
               {t("admin.backup.backupToCustomPathDesc", "Choose where to save your backup file (e.g., USB drive, external storage)")}
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <label htmlFor="custom-path" className="text-sm font-medium">
                 {t("admin.backup.backupPath", "Backup Path:")}
               </label>
               <div className="flex gap-2">
                 <input
                   id="custom-path"
                   type="text"
                   value={customPath}
                   onChange={(e) => setCustomPath(e.target.value)}
                   placeholder={t("admin.backup.backupPathPlaceholder", "C:\\MyBackups\\backup_2025-09-24.db")}
                   className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                 />
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={async () => {
                     try {
                       const result = await window.api.backup.selectPath();
                       if (result.success && result.filePath) {
                         setCustomPath(result.filePath);
                       } else if (!result.canceled) {
                         showToast(t("admin.backup.failedToSelectPath", "Failed to select path"), "error");
                       }
                     } catch (error) {
                       showToast(t("admin.backup.errorOpeningFileDialog", "Error opening file dialog"), "error");
                       console.error("File dialog error:", error);
                     }
                   }}
                   className="px-3"
                 >
                   {t("admin.backup.browse", "Browse")}
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground">
                 {t("admin.backup.pathExample", "Example: D:\\MyBackups\\backup_2025-09-24.db or /media/usb/backup.db")}
               </p>
             </div>
             
             <Alert>
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>
                 <strong>{t("admin.backup.note", "Note:")}</strong> {t("admin.backup.noteDesc", "Make sure the target directory exists and you have write permissions. The backup will be created with a timestamp in the filename.")}
               </AlertDescription>
             </Alert>
           </div>
           
           <DialogFooter className="gap-2">
             <Button
               variant="outline"
               onClick={() => {
                 setCustomPathDialogOpen(false);
                 setCustomPath("");
               }}
               disabled={creatingBackup}
             >
               {t("admin.backup.cancel", "Cancel")}
             </Button>
             <Button
               onClick={createBackupToCustomPath}
               disabled={creatingBackup || !customPath.trim()}
               className="flex items-center gap-2"
             >
               {creatingBackup ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
               ) : (
                 <Download className="w-4 h-4" />
               )}
               {creatingBackup ? t("admin.backup.creating", "Creating...") : t("admin.backup.createBackup", "Create Backup")}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Restore from File Dialog */}
       <Dialog open={restoreFromFileDialogOpen} onOpenChange={setRestoreFromFileDialogOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-lg">
               <Upload className="w-5 h-5 text-primary" />
               {t("admin.backup.restoreFromFileTitle", "Restore from File")}
             </DialogTitle>
             <DialogDescription>
               {t("admin.backup.restoreFromFileDesc", "Select a backup file from any location to restore your database")}
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div>
               <label className="text-sm font-medium text-foreground mb-2 block">
                 {t("admin.backup.selectBackupFile", "Select Backup File")}
               </label>
               <div className="flex gap-2">
                 <input
                   type="text"
                   value={selectedRestoreFile}
                   onChange={(e) => setSelectedRestoreFile(e.target.value)}
                   placeholder={t("admin.backup.filePathPlaceholder", "C:\\MyBackups\\backup_2025-09-24.db")}
                   className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                 />
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={async () => {
                     try {
                       const result = await window.api.backup.selectRestorePath();
                       if (result.success && result.filePath) {
                         setSelectedRestoreFile(result.filePath);
                       } else if (!result.canceled) {
                         showToast(t("admin.backup.failedToSelectFile", "Failed to select file"), "error");
                       }
                     } catch (error) {
                       showToast(t("admin.backup.errorOpeningFileDialog", "Error opening file dialog"), "error");
                       console.error("File dialog error:", error);
                     }
                   }}
                   className="px-3"
                 >
                   {t("admin.backup.browse", "Browse")}
                 </Button>
               </div>
               <p className="text-xs text-muted-foreground mt-1">
                 {t("admin.backup.fileExample", "Example: D:\\MyBackups\\backup_2025-09-24.db or /media/usb/backup.db")}
               </p>
             </div>
             
             <Alert>
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>
                 <strong>{t("admin.backup.warning", "Warning:")}</strong> {t("admin.backup.warningReplace", "This will replace your current database with the selected backup. A safety backup will be created before restoration.")}
               </AlertDescription>
             </Alert>
           </div>
           
           <DialogFooter className="gap-2">
             <Button
               variant="outline"
               onClick={() => {
                 setRestoreFromFileDialogOpen(false);
                 setSelectedRestoreFile("");
               }}
               disabled={!!restoring}
             >
               {t("admin.backup.cancel", "Cancel")}
             </Button>
             <Button
               onClick={restoreFromCustomFile}
               disabled={!!restoring || !selectedRestoreFile.trim()}
               className="flex items-center gap-2"
             >
               {restoring ? (
                 <RefreshCw className="w-4 h-4 animate-spin" />
               ) : (
                 <Upload className="w-4 h-4" />
               )}
               {restoring ? t("admin.backup.restoring", "Restoring...") : t("admin.backup.restore", "Restore")}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
