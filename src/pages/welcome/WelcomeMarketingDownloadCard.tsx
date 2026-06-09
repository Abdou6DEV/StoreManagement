import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { FaWindows } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Button } from "../../lib/components/button";
import { cn } from "../../lib/utils";

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/Abdou6DEV/StoreManagement/releases/latest";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

function pickWindowsAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
  return assets.find(
    (asset) =>
      asset.name.toLowerCase().includes("setup.exe") ||
      asset.name.toLowerCase().includes(".exe"),
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type WelcomeMarketingDownloadCardProps = {
  isRTL: boolean;
  reduceMotion: boolean;
};

export function WelcomeMarketingDownloadCard({
  isRTL,
  reduceMotion,
}: WelcomeMarketingDownloadCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [version, setVersion] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(GITHUB_RELEASES_API, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "REDA-TECH-Store-Management-Landing",
          },
        });
        if (!response.ok) throw new Error("release fetch failed");

        const release = await response.json();
        const asset = pickWindowsAsset(release.assets ?? []);
        if (!asset) throw new Error("no windows asset");

        if (cancelled) return;
        setDownloadUrl(asset.browser_download_url);
        setVersion(String(release.tag_name ?? "").replace(/^v/i, ""));
        setFileSize(formatBytes(asset.size));
        setUnavailable(false);
      } catch {
        if (!cancelled) setUnavailable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    if (!downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn("min-h-0", !reduceMotion && "welcome-gs-body-fadeup")}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="space-y-3 pt-6 text-center sm:pt-5">
        <h2 className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
          <Download className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          {t("welcome.downloadTitle", "Download the app")}
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t(
            "welcome.downloadDescription",
            "Get the latest Windows installer for REDA TECH Store Management. Install it on your PC, then start your free 7-day trial on first launch.",
          )}
        </p>
      </header>

      <div className="flex flex-col gap-3 pt-6">
        {loading ? (
          <div className="flex min-h-[3rem] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            {t("welcome.downloadLoading", "Preparing download…")}
          </div>
        ) : unavailable ? (
          <p className="text-center text-sm text-destructive">
            {t(
              "welcome.downloadUnavailable",
              "Download is temporarily unavailable. Try again later or visit GitHub Releases.",
            )}
          </p>
        ) : (
          <>
            {version ? (
              <p className="text-center text-xs text-muted-foreground">
                {t("welcome.downloadVersionHint", "Latest version: v{{version}}", { version })}
                {fileSize ? ` · ${fileSize}` : ""}
              </p>
            ) : null}
            <Button
              type="button"
              className="min-h-[3rem] w-full border-transparent bg-green-600 text-white shadow-xs hover:bg-green-700 focus-visible:ring-green-500/35 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
              disabled={!downloadUrl}
              onClick={handleDownload}
            >
              <span className="flex items-center justify-center gap-2">
                <FaWindows className="h-5 w-5 shrink-0" aria-hidden />
                {t("welcome.downloadButton", "Download for Windows")}
              </span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
