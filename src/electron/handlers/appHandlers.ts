import { ipcMain, app, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Version comparison function
function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  
  return 0;
}

export function setupAppHandlers() {
  // Get app version
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  // Check for updates
  ipcMain.handle("app:checkForUpdates", async () => {
    try {
      const currentVersion = app.getVersion();
      const GITHUB_API_URL = 'https://api.github.com/repos/Abdou6DEV/StoreManagement/releases/latest';
      
      // Fetch latest release from GitHub with proper headers
      const response = await fetch(GITHUB_API_URL, {
        headers: {
          'User-Agent': `REDA-TECH-Store-Management/${currentVersion}`,
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': 'token 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'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            available: false,
            currentVersion,
            latestVersion: currentVersion,
            downloadUrl: '',
            releaseNotes: '',
            error: undefined
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', ''); // Remove 'v' prefix
      
      
      // Compare versions
      const isUpdateAvailable = compareVersions(currentVersion, latestVersion) < 0;
      
      // Find Windows asset - prefer Setup.exe over zip (for Squirrel updates)
      const windowsAsset = release.assets.find((asset: { name: string }) => 
        asset.name.toLowerCase().includes('setup.exe') || // Prefer Squirrel installer
        asset.name.toLowerCase().includes('.exe') ||
        asset.name.toLowerCase().includes('.zip') || // Fallback to portable zip
        asset.name.toLowerCase().includes('portable') ||
        asset.name.includes('REDA.TECH.Store.Management')
      );
      
      const assetApiUrl = windowsAsset?.url || '';
      
      return {
        available: isUpdateAvailable,
        currentVersion,
        latestVersion,
        downloadUrl: assetApiUrl, // Use API URL for private repos
        releaseNotes: release.body || '',
        error: undefined
      };
      
    } catch (error) {
      return {
        available: false,
        currentVersion: app.getVersion(),
        latestVersion: "",
        downloadUrl: "",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Download update
  let currentDownloadAbortController: AbortController | null = null;
  let currentWriteStream: fs.WriteStream | null = null;
  let currentDownloadPath = '';

  ipcMain.handle("app:downloadUpdate", async (event, url: string) => {
    try {
      if (!url) {
        throw new Error("No download URL provided");
      }
      
      // Clean up any existing download first
      if (currentDownloadAbortController) {
        try {
          currentDownloadAbortController.abort();
        } catch (err) {
          // Ignore cleanup errors
        }
        currentDownloadAbortController = null;
      }
      
      if (currentWriteStream) {
        try {
          if (!currentWriteStream.destroyed) {
            currentWriteStream.destroy();
          }
        } catch (err) {
          // Ignore cleanup errors
        }
        currentWriteStream = null;
      }
      
      const { default: fetch } = await import("node-fetch");
      
      // Create abort controller for this download
      currentDownloadAbortController = new AbortController();
      
      // Use API URL with authentication for private repos
      const isApiUrl = url.includes('api.github.com');
      const headers = isApiUrl ? {
        'User-Agent': `REDA-TECH-Store-Management/${app.getVersion()}`,
        'Authorization': 'token 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',
        'Accept': 'application/octet-stream'
      } : {
        'User-Agent': `REDA-TECH-Store-Management/${app.getVersion()}`,
        'Accept': 'application/octet-stream'
      };
      
      const response = await fetch(url, { headers, signal: currentDownloadAbortController.signal });
      
      if (!response.ok) {
        throw new Error(`Failed to download update: ${response.statusText}`);
      }
      
      // Check if response body exists
      if (!response.body) {
        throw new Error("No response body received from server");
      }

      const downloadsDir = app.getPath("downloads");

      // Ensure Downloads directory exists
      if (!fs.existsSync(downloadsDir)) {
        try {
          fs.mkdirSync(downloadsDir, { recursive: true });
          console.log('[Download] Created Downloads directory:', downloadsDir);
        } catch (err) {
          console.error('[Download] Failed to create Downloads directory:', err);
          throw new Error('Downloads folder does not exist and could not be created');
        }
      }

      const downloadsPath = path.join(downloadsDir, "REDA TECH Store Management Setup.exe");
      currentDownloadPath = downloadsPath;
      
      // Clean up any existing partial file
      if (fs.existsSync(downloadsPath)) {
        try {
          fs.unlinkSync(downloadsPath);
        } catch (err) {
          console.log('[Download] Could not delete existing file (may be locked):', err);
          // Continue anyway, file will be overwritten
        }
      }
      
      // Get file size from response headers
      const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Create write stream for large files
      const writeStream = fs.createWriteStream(downloadsPath);
      currentWriteStream = writeStream;
      let downloadedSize = 0;

      let lastTime = Date.now();
      let lastDownloadedSize = 0;
      
      // Track if download was aborted
      let downloadAborted = false;
      let downloadRejected = false;
      
      // Listen for window close
      const handleBeforeQuit = () => {
        downloadAborted = true;
        if (currentWriteStream && !currentWriteStream.destroyed) {
          currentWriteStream.destroy();
        }
        if (fs.existsSync(downloadsPath)) {
          try {
            fs.unlinkSync(downloadsPath);
          } catch (err) {
            // Ignore cleanup errors
          }
        }
      };
      
      app.on('before-quit', handleBeforeQuit);
      
      return new Promise((resolve, reject) => {
        // Handle write stream errors
        writeStream.on('error', (error) => {
          if (downloadRejected) return;
          downloadRejected = true;
          
          app.removeListener('before-quit', handleBeforeQuit);
          writeStream.destroy();
          
          try {
            if (fs.existsSync(downloadsPath)) {
              fs.unlinkSync(downloadsPath);
            }
          } catch (unlinkError) {
            // Ignore cleanup errors
          }
          
          reject(new Error(`Write stream error: ${error.message}`));
        });

        writeStream.on('finish', () => {
          app.removeListener('before-quit', handleBeforeQuit);
          
          if (downloadAborted || downloadRejected) {
            return;
          }
          
          // Verify file size
          if (totalSize > 0 && downloadedSize !== totalSize) {
            try {
              fs.unlinkSync(downloadsPath);
            } catch (unlinkError) {
              // Ignore cleanup errors
            }
            reject(new Error(`Download incomplete. Expected ${totalSize} bytes, got ${downloadedSize} bytes`));
            return;
          }
          
          // Verify downloaded file integrity
          try {
            if (!fs.existsSync(downloadsPath)) {
              reject(new Error("Downloaded file not found after download completed"));
              return;
            }
            
            const stats = fs.statSync(downloadsPath);
            
            // If we know the expected size, verify it matches
            if (totalSize > 0 && stats.size !== totalSize) {
              fs.unlinkSync(downloadsPath);
              reject(new Error(`Downloaded file size mismatch. Expected ${totalSize} bytes, got ${stats.size} bytes`));
              return;
            }
            
            // Check if file is suspiciously small (likely corrupted)
            if (stats.size < 100000) { // Less than 100KB is suspicious
              fs.unlinkSync(downloadsPath);
              reject(new Error("Downloaded file appears to be corrupted (too small). Please try downloading again."));
              return;
            }
            
            // Verify it's a valid executable by checking magic bytes
            const fd = fs.openSync(downloadsPath, 'r');
            const buffer = Buffer.alloc(2);
            fs.readSync(fd, buffer, 0, 2, 0);
            fs.closeSync(fd);
            
            const magicBytes = buffer.toString('ascii');
            if (magicBytes !== 'MZ' && magicBytes !== 'PK') { // MZ for EXE, PK for ZIP
              fs.unlinkSync(downloadsPath);
              reject(new Error("Downloaded file is not a valid executable or archive. The download may have been corrupted."));
              return;
            }
          } catch (verifyError) {
            fs.unlinkSync(downloadsPath);
            reject(new Error(`File verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`));
            return;
          }
          
          resolve({
            success: true,
            path: downloadsPath,
            error: null
          });
        });

        response.body?.on('data', (chunk) => {
          // Check if download was aborted or stream is destroyed
          if (downloadAborted || downloadRejected) {
            return;
          }
          
          if (!writeStream.writable || writeStream.destroyed) {
            return;
          }
          
          try {
            writeStream.write(chunk, () => {
              // Data written successfully
            });
            
            downloadedSize += chunk.length;
            
            const now = Date.now();
            const timeDiff = now - lastTime;
            
            // Only send progress update once per second
            if (timeDiff >= 1000) {
              const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
              const sizeDiff = downloadedSize - lastDownloadedSize;
              const speed = (sizeDiff / timeDiff) * 1000; // bytes per second
              
              // Send progress update to renderer
              event.sender.send('download-progress', {
                progress: Math.round(progress),
                downloaded: downloadedSize,
                total: totalSize,
                speed: speed
              });
              
              // Reset for next calculation
              lastTime = now;
              lastDownloadedSize = downloadedSize;
            }
          } catch (writeError) {
            if (downloadRejected) return;
            downloadRejected = true;
            
            app.removeListener('before-quit', handleBeforeQuit);
            writeStream.destroy();
            
            try {
              if (fs.existsSync(downloadsPath)) {
                fs.unlinkSync(downloadsPath);
              }
            } catch (unlinkError) {
              // Ignore cleanup errors
            }
            
            reject(new Error(`Failed to write data: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`));
          }
        });

        response.body?.on('end', () => {
          if (downloadRejected) {
            return;
          }
          
          app.removeListener('before-quit', handleBeforeQuit);
          
          // Check if download was aborted
          if (downloadAborted) {
            writeStream.destroy();
            if (fs.existsSync(downloadsPath)) {
              try {
                fs.unlinkSync(downloadsPath);
              } catch (err) {
                // Ignore cleanup errors
              }
            }
            reject(new Error("Download was interrupted by app close"));
            return;
          }
          
          // End the write stream - this will trigger the 'finish' event
          writeStream.end();
        });

        response.body?.on('error', (error: any) => {
          if (downloadRejected) return;
          downloadRejected = true;
          
          app.removeListener('before-quit', handleBeforeQuit);
          
          if (!writeStream.destroyed) {
            writeStream.destroy();
          }
          
          try {
            if (fs.existsSync(downloadsPath)) {
              fs.unlinkSync(downloadsPath);
            }
          } catch (unlinkError) {
            // Ignore cleanup errors
          }
          
          // Handle aborted signal gracefully
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          if (errorMessage.includes('aborted') || errorMessage.includes('The operation was aborted')) {
            // This is expected when user cancels or network issues
            resolve({
              success: false,
              path: "",
              error: "Download was cancelled or interrupted"
            });
          } else {
            reject(new Error(`Download failed: ${errorMessage}`));
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        path: "",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Cancel download handler
  ipcMain.handle("app:cancelUpdateDownload", async () => {
    try {
      if (currentDownloadAbortController) {
        currentDownloadAbortController.abort();
        currentDownloadAbortController = null;
      }
      
      if (currentWriteStream) {
        currentWriteStream.destroy();
        currentWriteStream = null;
      }
      
      // Clean up partial file
      if (currentDownloadPath && fs.existsSync(currentDownloadPath)) {
        fs.unlinkSync(currentDownloadPath);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Validate installer file integrity
  function validateInstallerFile(filePath: string): { valid: boolean; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: "File does not exist" };
      }

      const stats = fs.statSync(filePath);
      
      // Check if file is too small (likely corrupted)
      if (stats.size < 1000000) { // Less than 1MB is suspicious for an installer
        return { valid: false, error: "File appears to be corrupted or incomplete (too small)" };
      }

      // Check if file is zero bytes (definitely corrupted)
      if (stats.size === 0) {
        return { valid: false, error: "File is empty (download incomplete)" };
      }

      // Try to read the first few bytes to check if it's a valid PE (Portable Executable) file
      // Valid Windows executables start with "MZ" signature
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(2);
      fs.readSync(fd, buffer, 0, 2, 0);
      fs.closeSync(fd);
      
      const magicBytes = buffer.toString('ascii');
      if (magicBytes !== 'MZ') {
        return { valid: false, error: "File is not a valid Windows executable (missing MZ signature)" };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Install update - ZIP handler
  ipcMain.handle("app:installUpdate", async (event, updatePath: string) => {
    try {
      if (!fs.existsSync(updatePath)) {
        throw new Error("Update file not found");
      }

      // Determine file type from actual content (magic bytes), not filename
      // because we always save with .exe extension
      let isZip = false;
      let isExe = false;

      try {
        const fileHandle = fs.openSync(updatePath, 'r');
        const buffer = Buffer.alloc(4);
        fs.readSync(fileHandle, buffer, 0, 4, 0);
        fs.closeSync(fileHandle);
        
        isExe = buffer[0] === 0x4D && buffer[1] === 0x5A; // MZ for .exe
        isZip = buffer[0] === 0x50 && buffer[1] === 0x4B; // PK for .zip/.exe
        
        console.log('[Install] File type detected - isZip:', isZip, 'isExe:', isExe);
      } catch (err) {
        console.error('[Install] Error reading magic bytes:', err);
        throw new Error('Could not determine installer file type');
      }
      
      if (isZip) {
        // Handle ZIP file (Windows update)
        return await handleZipUpdate(updatePath);
      } else if (isExe) {
        // Validate file integrity before installation
        const validation = validateInstallerFile(updatePath);
        if (!validation.valid) {
          // Delete corrupted file
          try {
            if (fs.existsSync(updatePath)) {
              fs.unlinkSync(updatePath);
            }
          } catch (unlinkError) {
            // Ignore cleanup errors
          }
          
          return {
            success: false,
            error: `Corrupted download file detected and removed. ${validation.error} Please download again.`
          };
        }

        // Handle EXE update (installer)
        await handleExeUpdate(updatePath);
        
        // Quit the app immediately after launching installer
        // The installer needs the app to be closed to replace files
        console.log('[Install] Installer launched, quitting app now...');
        
        // Close all windows first to release any file locks
        const allWindows = BrowserWindow.getAllWindows();
        allWindows.forEach(window => {
          if (window && !window.isDestroyed()) {
            window.close();
          }
        });
        
        // Very short delay to ensure:
        // 1. Response is sent back to renderer
        // 2. Windows are closed and file locks released
        // 3. Installer has fully launched
        setTimeout(() => {
          console.log('[Install] Forcing app quit for installer');
          app.exit(0); // Force quit - more reliable than app.quit()
        }, 1000);
        
        return {
          success: true,
          error: null as string | null
        };
      } else {
        throw new Error("Unsupported installer format - file is neither .exe nor .zip");
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Handle ZIP update (portable version)
  async function handleZipUpdate(zipPath: string) {
    try {
      const { default: AdmZip } = await import('adm-zip');
      const zip = new AdmZip(zipPath);
      
      // Get app directory
      const appPath = process.resourcesPath || app.getAppPath();
      const updateDir = path.join(path.dirname(appPath), 'update');
      
      // Create update directory
      if (!fs.existsSync(updateDir)) {
        fs.mkdirSync(updateDir, { recursive: true });
      }
      
      // Extract to update directory
      zip.extractAllTo(updateDir, true);
      
      // ZIP extracted successfully
      
      // For now, just restart the app - the actual file replacement
      // would need to be done by a separate updater process
      setTimeout(() => {
        app.quit();
      }, 2000);
      
      return {
        success: true,
        error: null as string | null
      };
    } catch (error) {
      throw new Error(`Failed to extract ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle EXE update (installer)
  async function handleExeUpdate(exePath: string) {
    try {
      const { shell } = await import('electron');
      
      console.log('[Install] Launching installer:', exePath);
      
      // Verify the file exists and is accessible before trying to launch
      if (!fs.existsSync(exePath)) {
        throw new Error('Installer file not found');
      }
      
      // Check file permissions - ensure it's readable and executable
      try {
        fs.accessSync(exePath, fs.constants.R_OK);
      } catch (err) {
        throw new Error('Installer file is not accessible - check permissions');
      }
      
      // Use shell.openPath which behaves exactly like double-clicking the file
      // This properly handles UAC elevation and Windows UI context
      const result = await shell.openPath(exePath);
      
      // openPath returns empty string on success, error message on failure
      if (result) {
        console.error('[Install] Failed to open installer:', result);
        throw new Error(`Failed to launch installer: ${result}`);
      }
      
      console.log('[Install] Installer launched successfully');
      
      // Give installer a moment to start before app quits
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return; // Success
    } catch (error) {
      console.error('[Install] Error launching installer:', error);
      throw new Error(`Failed to launch installer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Silent print handler - prints HTML directly without showing print dialog
  ipcMain.handle("app:printSilently", async (_event, html: string) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden BrowserWindow for printing
        // Size doesn't matter much since print media query will control the actual print size
        const printWindow = new BrowserWindow({
          show: false,
          width: 800,
          height: 2000,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        // Load the HTML content
        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        // Wait for content to load, then print silently
        printWindow.webContents.once("did-finish-load", () => {
          // Inject JavaScript to ensure print media query is active before printing
          printWindow.webContents.executeJavaScript(`
            // Force browser to apply print styles
            const style = document.createElement('style');
            style.textContent = '@media print { body { width: 70mm !important; } .receipt { width: 70mm !important; max-width: 70mm !important; } }';
            document.head.appendChild(style);
          `).then(() => {
            setTimeout(() => {
              // Print silently - CSS @page rule should control size
              // Using minimal options to let CSS handle everything
              printWindow.webContents.print(
                {
                  silent: true,
                  printBackground: true,
                  deviceName: "", // Empty string uses default printer
                },
                (success: boolean, failureReason?: string) => {
                  // Close the window
                  printWindow.close();
                  
                  if (success) {
                    resolve(true);
                  } else {
                    reject(new Error(failureReason || "Print failed"));
                  }
                }
              );
            }, 300); // Longer delay to ensure all styles are applied
          }).catch((error) => {
            printWindow.close();
            reject(new Error(`Failed to apply print styles: ${error}`));
          });
        });

        // Handle errors
        printWindow.webContents.once("did-fail-load", () => {
          printWindow.close();
          reject(new Error("Failed to load print content"));
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
