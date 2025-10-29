import React, { useState, useEffect } from "react";
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
  FolderOpen
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

export function BackupManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { logout } = useAuth();
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

  // Load backups on component mount
  useEffect(() => {
    loadBackups();
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
    
    if (backup.type === "manual") {
      return { status: "manual", color: "bg-blue-500", text: t("admin.backup.manual", "Manual") };
    } else if (diffInHours < 24) {
      return { status: "recent", color: "bg-green-500", text: t("admin.backup.recent", "Recent") };
    } else if (diffInHours < 48) {
      return { status: "yesterday", color: "bg-yellow-500", text: t("admin.backup.yesterday", "Yesterday") };
    } else {
      return { status: "old", color: "bg-red-500", text: t("admin.backup.older", "Older") };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6" />
          {t("admin.backup.title", "Database Backup Management")}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t("admin.backup.description", "Manage your database backups. The system automatically creates daily backups and keeps the 2 most recent ones.")}
        </p>
      </div>

      {/* Auto Backup Info */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>{t("admin.backup.automaticBackup", "Automatic Backup:")}</strong> {t("admin.backup.automaticBackupDesc", "The system automatically creates a backup every day at startup and keeps the 2 most recent backups. You can also create manual backups anytime.")}
        </AlertDescription>
      </Alert>

       {/* Actions */}
       <div className="flex gap-4">
         <Button 
           onClick={loadBackups} 
           disabled={loading}
           variant="outline"
           className="flex items-center gap-2"
         >
           <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
           {t("admin.backup.refresh", "Refresh")}
         </Button>
         
         <Button 
           onClick={cleanupOldBackups} 
           disabled={loading}
           variant="outline"
           className="flex items-center gap-2"
         >
           <Database className="w-4 h-4" />
           {t("admin.backup.cleanupOld", "Cleanup Old Backups")}
         </Button>
         
         <Button
           onClick={() => setCustomPathDialogOpen(true)}
           disabled={creatingBackup}
           variant="outline"
           className="flex items-center gap-2"
         >
           <FolderOpen className="w-4 h-4" />
           {t("admin.backup.backupToCustomPath", "Backup to Custom Path")}
         </Button>
         
         <Button
           onClick={() => setRestoreFromFileDialogOpen(true)}
           disabled={!!restoring}
           variant="outline"
           className="flex items-center gap-2"
         >
           <Upload className="w-4 h-4" />
           {t("admin.backup.restoreFromFile", "Restore from File")}
         </Button>
       </div>

      {/* Backups List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t("admin.backup.availableBackups", "Available Backups")}
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{t("admin.backup.loadingBackups", "Loading backups...")}</span>
          </div>
        ) : backups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Database className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {t("admin.backup.noBackupsAvailable", "No backups available. Create your first backup to get started.")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {backups.map((backup, index) => {
              const status = getBackupStatus(backup);
              return (
                <Card key={backup.name} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                        <CardTitle className="text-lg">{backup.name}</CardTitle>
                        <Badge variant="outline" className={status.color.replace("bg-", "text-")}>
                          {status.text}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {index === 0 && t("admin.backup.latest", "Latest")}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("admin.backup.created", "Created:")}</span>
                        <span className="font-medium">{formatDate(backup.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("admin.backup.size", "Size:")}</span>
                        <span className="font-medium">{formatFileSize(backup.size)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("admin.backup.age", "Age:")}</span>
                        <span className="font-medium">
                          {Math.floor((Date.now() - new Date(backup.date).getTime()) / (1000 * 60 * 60 * 24))} {t("admin.backup.days", "days")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("admin.backup.type", "Type:")}</span>
                      <Badge variant={backup.type === "automatic" ? "default" : "secondary"}>
                        {backup.type === "automatic" ? t("admin.backup.automatic", "Automatic") : t("admin.backup.manual", "Manual")}
                      </Badge>
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
                           <RefreshCw className="w-4 h-4 animate-spin" />
                         ) : (
                           <Upload className="w-4 h-4" />
                         )}
                         {restoring === backup.path ? t("admin.backup.restoring", "Restoring...") : t("admin.backup.restore", "Restore")}
                       </Button>
                     </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
               <AlertTriangle className="w-5 h-5 text-orange-500" />
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
                   <CheckCircle className="w-5 h-5 text-green-500" />
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
