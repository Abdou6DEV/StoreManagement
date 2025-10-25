interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  error?: string;
}

export class UpdateChecker {
  private static readonly GITHUB_API_URL = 'https://api.github.com/repos/Abdou6DEV/StoreManagement/releases/latest';
  
  static async checkForUpdates(): Promise<UpdateInfo> {
    try {
      // Get current app version
      const currentVersion = await window.api.app.getVersion();
      
      // Fetch latest release from GitHub
      const response = await fetch(this.GITHUB_API_URL);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No releases available yet
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
      const isUpdateAvailable = this.compareVersions(currentVersion, latestVersion) < 0;
      
      // Find Windows installer
      const windowsAsset = release.assets.find((asset: any) => 
        asset.name.includes('Setup.exe') || asset.name.includes('.exe')
      );
      
      return {
        available: isUpdateAvailable,
        currentVersion,
        latestVersion,
        downloadUrl: windowsAsset?.browser_download_url || '',
        releaseNotes: release.body || '',
        error: undefined
      };
      
    } catch (error) {
      return {
        available: false,
        currentVersion: await window.api.app.getVersion(),
        latestVersion: '',
        downloadUrl: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  private static compareVersions(version1: string, version2: string): number {
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
}
