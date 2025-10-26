import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
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
      
      // Find Windows asset - prefer portable/zip over installer
      const windowsAsset = release.assets.find((asset: { name: string }) => 
        asset.name.toLowerCase().includes('.zip') || // Prefer portable zip
        asset.name.toLowerCase().includes('portable') ||
        asset.name.toLowerCase().includes('setup.exe') || 
        asset.name.toLowerCase().includes('.exe') ||
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

      const downloadsPath = path.join(app.getPath("downloads"), "REDA TECH Store Management Setup.exe");
      currentDownloadPath = downloadsPath;
      
      // Clean up any existing partial file
      if (fs.existsSync(downloadsPath)) {
        fs.unlinkSync(downloadsPath);
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
      
      // Listen for window close
      const handleBeforeQuit = () => {
        downloadAborted = true;
        writeStream.destroy();
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
        response.body?.on('data', (chunk) => {
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
        });

        response.body?.on('end', () => {
          // Remove the before-quit listener
          app.removeListener('before-quit', handleBeforeQuit);
          
          // Check if download was aborted
          if (downloadAborted) {
            writeStream.destroy();
            reject(new Error("Download was interrupted by app close"));
            return;
          }
          
          writeStream.end();
          
          // Verify file size
          if (totalSize > 0 && downloadedSize !== totalSize) {
            reject(new Error(`Download incomplete. Expected ${totalSize} bytes, got ${downloadedSize} bytes`));
            return;
          }
          
          resolve({
            success: true,
            path: downloadsPath,
            error: null
          });
        });

        response.body?.on('error', (error) => {
          // Remove the before-quit listener
          app.removeListener('before-quit', handleBeforeQuit);
          
          writeStream.destroy();
          try {
            fs.unlinkSync(downloadsPath); // Clean up partial file
          } catch (unlinkError) {
            // Ignore cleanup errors
          }
          reject(error);
        });

        response.body?.pipe(writeStream);
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

  // Install update - ZIP handler
  ipcMain.handle("app:installUpdate", async (event, updatePath: string) => {
    try {
      if (!fs.existsSync(updatePath)) {
        throw new Error("Update file not found");
      }

      const isZip = updatePath.toLowerCase().endsWith('.zip');
      const isExe = updatePath.toLowerCase().endsWith('.exe');
      
      if (isZip) {
        // Handle ZIP update (portable version)
        return await handleZipUpdate(updatePath);
      } else if (isExe) {
        // Handle EXE update (installer) - try silent install first
        return await handleExeUpdate(updatePath);
      } else {
        throw new Error("Unsupported update file format");
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
      // Try silent installer flags first
      // Preserve user data directory to avoid re-validation
      const userDataPath = app.getPath("userData");
      const installerFlags = [
        `"${exePath}" /S /D="${path.dirname(userDataPath)}" /ALLUSERS=0`, // Silent install, preserve user data
        `"${exePath}" /S /ALLUSERS=0`, // Silent install
        `"${exePath}" /VERYSILENT /SUPPRESSMSGBOXES /ALLUSERS=0`, // Very silent install
        `"${exePath}" /S`, // Silent install (fallback)
        `"${exePath}"` // Fallback to normal install
      ];

      let installSuccess = false;
      let lastError: Error | null = null;

      for (const command of installerFlags) {
        try {
          await execAsync(command);
          installSuccess = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      if (!installSuccess) {
        throw lastError || new Error("All installer commands failed");
      }
      
      // Quit the app after installation starts
      setTimeout(() => {
        app.quit();
      }, 3000);

      return {
        success: true,
        error: null as string | null
      };
    } catch (error) {
      throw new Error(`Failed to run installer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
