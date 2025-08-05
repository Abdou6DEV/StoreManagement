import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../lib/components/button';
import { Input } from '../../../lib/components/input';
import { ScrollArea } from '../../../lib/components/scrollArea';
import { Badge } from '../../../lib/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../lib/components/select';
import { ConfirmDialog } from '../../../lib/components/confirmDialog';
import { LogLevel } from '../../../lib/logger/common';
import rendererLogger from '../../../lib/logger/rendererLogger';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  process: 'main' | 'renderer';
  userId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  maxFileSize: number;
  maxFiles: number;
  logToFile: boolean;
  logToConsole: boolean;
}

const LoggerAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [allLogEntries, setAllLogEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [fileStats, setFileStats] = useState<{ totalLines: number; fileSize: number } | null>(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [selectedProcess, setSelectedProcess] = useState<'main' | 'renderer' | 'ALL'>('ALL');

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
      rendererLogger.error('Failed to load log files', 'LoggerAdmin', error);
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
      rendererLogger.error('Failed to refresh logs', 'LoggerAdmin', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const currentConfig = await window.api.logger.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      rendererLogger.error('Failed to load logger configuration', 'LoggerAdmin', error);
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
        .filter(line => line.trim())
        .map(line => {
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
      rendererLogger.error('Failed to load log content', 'LoggerAdmin', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and paginate log entries
  const filteredAndPaginatedEntries = useMemo(() => {
    let filtered = allLogEntries;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.message.toLowerCase().includes(searchLower) ||
        entry.context?.toLowerCase().includes(searchLower) ||
        entry.process.toLowerCase().includes(searchLower)
      );
    }

    // Filter by level
    if (selectedLevel !== 'ALL') {
      filtered = filtered.filter(entry => entry.level === selectedLevel);
    }

    // Filter by process
    if (selectedProcess !== 'ALL') {
      filtered = filtered.filter(entry => entry.process === selectedProcess);
    }

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      entries: paginated,
      totalEntries: filtered.length,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  }, [allLogEntries, searchTerm, selectedLevel, selectedProcess, currentPage, entriesPerPage]);

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
      rendererLogger.info('Logger configuration updated', 'LoggerAdmin', updatedConfig);
    } catch (error) {
      rendererLogger.error('Failed to update logger configuration', 'LoggerAdmin', error);
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR: return 'bg-red-500';
      case LogLevel.WARN: return 'bg-yellow-500';
      case LogLevel.INFO: return 'bg-blue-500';
      case LogLevel.DEBUG: return 'bg-purple-500';
      case LogLevel.TRACE: return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    if (selectedFile) {
      loadLogContent(selectedFile);
    }
  }, [selectedFile]);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('admin.logger.title')}</h2>
        <div className="flex gap-2">
          <Button onClick={refreshAll} disabled={isLoading}>
            {t('admin.logger.refresh')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => setShowClearConfirm(true)}
          >
            {t('admin.logger.clearAllLogs')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('admin.logger.configuration')}</h3>
          <div className="space-y-4 p-4 border rounded-lg">
            <div>
              <label className="text-sm font-medium">{t('admin.logger.logLevel')}</label>
              <Select value={config.level} onValueChange={(value: string) => updateConfig({ level: value as LogLevel })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LogLevel).map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('admin.logger.maxFileSize')}</label>
              <Input
                type="number"
                value={config.maxFileSize / (1024 * 1024)}
                onChange={(e) => updateConfig({ maxFileSize: parseInt(e.target.value) * 1024 * 1024 })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('admin.logger.maxFiles')}</label>
              <Input
                type="number"
                value={config.maxFiles}
                onChange={(e) => updateConfig({ maxFiles: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="logToFile"
                checked={config.logToFile}
                onChange={(e) => updateConfig({ logToFile: e.target.checked })}
              />
              <label htmlFor="logToFile" className="text-sm">{t('admin.logger.logToFile')}</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="logToConsole"
                checked={config.logToConsole}
                onChange={(e) => updateConfig({ logToConsole: e.target.checked })}
              />
              <label htmlFor="logToConsole" className="text-sm">{t('admin.logger.logToConsole')}</label>
            </div>
          </div>
        </div>

        {/* Log Files Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('admin.logger.logFiles')}</h3>
          <div className="space-y-2">
            {logFiles.map((file, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedFile === file ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="flex items-center justify-between">
                  <span 
                    className="text-sm font-medium truncate cursor-help" 
                    title={file}
                  >
                    {file.split('/').pop() || file.split('\\').pop()}
                  </span>
                  <Badge variant="secondary">Log File</Badge>
                </div>
              </div>
            ))}
            {logFiles.length === 0 && (
              <p className="text-sm text-gray-500">{t('admin.logger.noLogFiles')}</p>
            )}
          </div>
        </div>

        {/* Log Entries Panel */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('admin.logger.logEntries')}</h3>
          
          {/* Filters */}
          <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
            <div>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedLevel} onValueChange={(value: string) => setSelectedLevel(value as LogLevel | 'ALL')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  {Object.values(LogLevel).map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedProcess} onValueChange={(value: string) => setSelectedProcess(value as 'main' | 'renderer' | 'ALL')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="renderer">Renderer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-xs text-gray-600">
              Showing {filteredAndPaginatedEntries.entries.length} of {filteredAndPaginatedEntries.totalEntries} entries
              {fileStats && (
                <div className="mt-1">
                  File: {fileStats.totalLines.toLocaleString()} lines, {(fileStats.fileSize / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="h-60">
            <div className="space-y-2 pr-4">
              {filteredAndPaginatedEntries.entries.map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getLevelColor(entry.level)}>
                        {entry.level}
                      </Badge>
                      <Badge variant="outline">{entry.process}</Badge>
                      {entry.context && (
                        <Badge variant="secondary">{entry.context}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{entry.message}</p>
                  {entry.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600">{t('admin.logger.additionalData')}</summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto select-text">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {filteredAndPaginatedEntries.entries.length === 0 && (
                <p className="text-sm text-gray-500">No log entries to display</p>
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {filteredAndPaginatedEntries.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {filteredAndPaginatedEntries.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!filteredAndPaginatedEntries.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!filteredAndPaginatedEntries.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title={t('admin.logger.clearConfirmTitle')}
        message={t('admin.logger.clearConfirmMessage')}
        confirmText={t('admin.logger.clearConfirmText')}
        cancelText={t('cashier.cancel')}
        variant="danger"
        onConfirm={clearLogs}
        loading={isLoading}
      />
    </div>
  );
};

export default LoggerAdmin; 