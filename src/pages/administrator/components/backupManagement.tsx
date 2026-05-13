import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "../../../lib/components/button";
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

export function BackupManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [backupProgressOpen, setBackupProgressOpen] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState("");
  const [customPathDialogOpen, setCustomPathDialogOpen] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [restoreFromFileDialogOpen, setRestoreFromFileDialogOpen] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState("");
  const [uploadingCloud, setUploadingCloud] = useState(false);

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
  }, []);

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
    try {
      setUploadingCloud(true);
      const created = await window.api.backup.createCloud();
      if (!created.success || !created.backupPath) {
        showToast(
          `${t("admin.backup.failedToCreateBackup", "Failed to create backup:")} ${created.error ?? ""}`,
          "error",
        );
        return;
      }

      await loadBackups();
      const uploaded = await window.api.online.backupUploadLatest(created.backupPath, "cloud_backup");
      if (uploaded.success) {
        showToast(t("admin.backup.cloudUploadSuccess", "Cloud backup uploaded successfully"), "success");
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
      setUploadingCloud(false);
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
    
    if (confirmText !== "YES") {
      showToast("Please type 'YES' to confirm", "error");
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
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{t("admin.backup.created", "Created:")}</span>
              <span className="font-medium">{formatDate(backup.date)}</span>
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
          <div className="flex gap-2">
            <Button
              onClick={() => openRestoreDialog(backup)}
              disabled={restoring === backup.path}
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
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Database className="h-6 w-6 text-orange-500" aria-hidden />
            {t("admin.backup.title", "Database Backup Management")}
          </h2>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            {t(
              "admin.backup.descriptionPage",
              "Backups are grouped below: automatic (daily on this PC), cloud (snapshot + upload), and manual (local copies you create). Use Refresh to reload lists.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={loadBackups}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {t("admin.backup.refresh", "Refresh")}
          </Button>
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

      {loading && backups.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">{t("admin.backup.loadingBackups", "Loading backups...")}</span>
        </div>
      ) : (
        <>
          {/* Automatic backups */}
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-labelledby="backup-section-auto"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
              <Button onClick={cleanupOldBackups} disabled={loading} variant="outline" size="sm" className="shrink-0">
                <Database className="mr-2 h-4 w-4" />
                {t("admin.backup.cleanupOld", "Cleanup Old Backups")}
              </Button>
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

          {/* Cloud backups */}
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-labelledby="backup-section-cloud"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <h3 id="backup-section-cloud" className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Cloud className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  {t("admin.backup.sectionCloudTitle", "Online cloud backups")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "admin.backup.sectionCloudDesc",
                    "Creates a cloud_backup file on this PC, uploads it to your supplier’s online storage, and lists snapshots here.",
                  )}
                </p>
              </div>
              <Button
                onClick={() => void uploadToCloud()}
                disabled={creatingBackup || uploadingCloud || !!restoring}
                size="sm"
                className="shrink-0"
              >
                {uploadingCloud ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                {uploadingCloud
                  ? t("admin.backup.uploadingToCloud", "Uploading to cloud...")
                  : t("admin.backup.uploadToCloud", "Cloud backup & upload")}
              </Button>
            </div>
            <div className="space-y-4 bg-card p-4 sm:p-5">
              {cloudBackups.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t(
                    "admin.backup.emptyCloud",
                    "No cloud snapshots in the backup folder yet. Use the button above to create and upload one.",
                  )}
                </p>
              ) : (
                <div className="grid gap-4">{cloudBackups.map((b, i) => renderBackupCard(b, i))}</div>
              )}
            </div>
          </section>

          {/* Manual backups */}
          <section
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            aria-labelledby="backup-section-manual"
          >
            <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  onClick={() => void createBackup()}
                  disabled={creatingBackup || uploadingCloud || !!restoring}
                  size="sm"
                >
                  {creatingBackup ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t("admin.backup.manualBackup", "Manual Backup")}
                </Button>
                <Button onClick={() => setCustomPathDialogOpen(true)} disabled={creatingBackup} variant="outline" size="sm">
                  <FolderOpen className="mr-2 h-4 w-4" />
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
        </>
      )}

      {/* Warning */}
       <Alert variant="destructive">
         <AlertTriangle className="h-4 w-4" />
         <AlertDescription>
           <strong>{t("admin.backup.warning", "Warning:")}</strong> {t("admin.backup.warningDesc", "Restoring a backup will completely replace your current database. Make sure to create a manual backup before restoring if you want to keep your current data.")}
         </AlertDescription>
       </Alert>

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
                 Type "YES" to confirm:
               </label>
               <input
                 id="confirm-text"
                 type="text"
                 value={confirmText}
                 onChange={(e) => setConfirmText(e.target.value)}
                 placeholder="Type YES here"
                 className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
               disabled={confirmText !== "YES" || restoring !== null}
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
