import { ipcMain, app } from "electron";
import { UpdateChecker } from "../../lib/utils/updateChecker";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function setupAppHandlers() {
  // Get app version
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });

  // Check for updates
  ipcMain.handle("app:checkForUpdates", async () => {
    try {
      return await UpdateChecker.checkForUpdates();
    } catch (error) {
      console.error("Error checking for updates:", error);
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
  ipcMain.handle("app:downloadUpdate", async (event, url: string) => {
    try {
      const { default: fetch } = await import("node-fetch");
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download update: ${response.statusText}`);
      }

      const downloadsPath = path.join(app.getPath("downloads"), "REDA TECH Store Management Setup.exe");
      
      // Create write stream for large files
      const writeStream = fs.createWriteStream(downloadsPath);
      const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
      let downloadedSize = 0;

      return new Promise((resolve, reject) => {
        response.body?.on('data', (chunk) => {
          downloadedSize += chunk.length;
          const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
          
          // Send progress update to renderer
          event.sender.send('download-progress', {
            progress: Math.round(progress),
            downloaded: downloadedSize,
            total: totalSize
          });
        });

        response.body?.on('end', () => {
          writeStream.end();
          resolve({
            success: true,
            path: downloadsPath,
            error: null
          });
        });

        response.body?.on('error', (error) => {
          writeStream.destroy();
          try {
            fs.unlinkSync(downloadsPath); // Clean up partial file
          } catch (unlinkError) {
            console.warn("Failed to clean up partial file:", unlinkError);
          }
          reject(error);
        });

        response.body?.pipe(writeStream);
      });
    } catch (error) {
      console.error("Error downloading update:", error);
      return {
        success: false,
        path: "",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Install update
  ipcMain.handle("app:installUpdate", async (event, installerPath: string) => {
    try {
      if (!fs.existsSync(installerPath)) {
        throw new Error("Installer file not found");
      }

      // Try different installer flags for better compatibility
      const installerFlags = [
        `"${installerPath}" /S /D=C:\\Program Files\\REDA TECH Store Management`, // Silent install with directory
        `"${installerPath}" /S`, // Silent install
        `"${installerPath}" /VERYSILENT /SUPPRESSMSGBOXES`, // Very silent install
        `"${installerPath}"` // Fallback to normal install
      ];

      let installSuccess = false;
      let lastError: Error | null = null;

      for (const command of installerFlags) {
        try {
          console.log(`Trying installer command: ${command}`);
          await execAsync(command);
          installSuccess = true;
          break;
        } catch (error) {
          console.log(`Installer command failed: ${command}`, error);
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
        error: null
      };
    } catch (error) {
      console.error("Error installing update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
