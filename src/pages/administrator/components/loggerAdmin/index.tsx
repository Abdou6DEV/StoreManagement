import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";
import { LogLevel } from "../../../../lib/logger/common";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import { LogEntry, LoggerConfig, FileStats } from "./types";
import { Header } from "./header";
import { ConfigurationPanel } from "./configurationPanel";
import { LogFilesPanel } from "./logFilesPanel";
import { LogEntriesPanel } from "./logEntriesPanel";

const LoggerAdmin: React.FC = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [allLogEntries, setAllLogEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [config, setConfig] = useState<LoggerConfig>({
    level: LogLevel.INFO,
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 5,
    logToFile: true,
    logToConsole: true,
  });

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(30);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "ALL">("ALL");
  const [selectedProcess, setSelectedProcess] = useState<
    "main" | "renderer" | "ALL"
  >("ALL");

  useEffect(() => {
    loadLogFiles();
    loadConfig();
  }, []);

  const loadLogFiles = async () => {
    try {
      setIsLoading(true);
      const files = await window.api.logger.getLogFiles();
      setLogFiles(files);
      if (files.length > 0 && !selectedFile) {
        setSelectedFile(files[0]);
      }
    } catch (error) {
      rendererLogger.error("Failed to load log files", "LoggerAdmin", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      await loadLogFiles();
      if (selectedFile) {
        await loadLogContent(selectedFile);
      }
    } catch (error) {
      rendererLogger.error("Failed to refresh logs", "LoggerAdmin", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const currentConfig = await window.api.logger.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      rendererLogger.error(
        "Failed to load logger configuration",
        "LoggerAdmin",
        error,
      );
    }
  };

  const loadLogContent = async (filePath: string) => {
    try {
      setIsLoading(true);

      // Load file stats first
      const stats = await window.api.logger.getLogFileStats(filePath);
      setFileStats(stats);

      // Determine how many lines to load based on file size
      const maxLines = stats.totalLines > 1000 ? 1000 : stats.totalLines;
      const lines = await window.api.logger.readLogFile(filePath, maxLines);

      const entries: LogEntry[] = lines
        .filter((line: string) => line.trim())
        .map((line: string) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse(); // Show newest first

      setAllLogEntries(entries);
      setCurrentPage(1); // Reset to first page when loading new file
    } catch (error) {
      rendererLogger.error("Failed to load log content", "LoggerAdmin", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      await window.api.logger.clearLogs();
      await loadLogFiles();
      setAllLogEntries([]);
    } catch (error) {
      // Error is already logged by the main logger
    }
  };

  const updateConfig = async (newConfig: Partial<LoggerConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      await window.api.logger.updateConfig(updatedConfig);
      setConfig(updatedConfig);
      rendererLogger.info(
        "Logger configuration updated",
        "LoggerAdmin",
        updatedConfig,
      );
    } catch (error) {
      rendererLogger.error(
        "Failed to update logger configuration",
        "LoggerAdmin",
        error,
      );
    }
  };

  useEffect(() => {
    if (selectedFile) {
      loadLogContent(selectedFile);
    }
  }, [selectedFile]);

  const handleClearLogs = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = async () => {
    setShowClearConfirm(false);
    await clearLogs();
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <Header
        onRefresh={refreshAll}
        onClearLogs={handleClearLogs}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ConfigurationPanel config={config} onConfigUpdate={updateConfig} />

        <LogFilesPanel
          logFiles={logFiles}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />

        <LogEntriesPanel
          allLogEntries={allLogEntries}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          selectedProcess={selectedProcess}
          onProcessChange={setSelectedProcess}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          entriesPerPage={entriesPerPage}
          fileStats={fileStats}
        />
      </div>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title={i18n.t("admin.logger.clearConfirmTitle")}
        message={i18n.t("admin.logger.clearConfirmMessage")}
        confirmText={i18n.t("admin.logger.clearConfirmText")}
        cancelText={i18n.t("cashier.cancel")}
        variant="danger"
        onConfirm={handleConfirmClear}
        loading={isLoading}
      />
    </div>
  );
};

export default LoggerAdmin;
