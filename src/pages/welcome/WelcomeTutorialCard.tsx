import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import {
  welcomeTutorialEmbedUrl,
  welcomeTutorialThumbnailUrl,
  type WelcomeTutorialDefinition,
} from "../../lib/welcome/welcomeTutorials";

type WelcomeTutorialCardProps = {
  tutorial: WelcomeTutorialDefinition;
  isRTL: boolean;
};

function openYoutubeWatchUrl(url: string): void {
  if (typeof window.api?.app?.openExternal === "function") {
    void window.api.app.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function WelcomeTutorialCard({ tutorial, isRTL }: WelcomeTutorialCardProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  const title = t(tutorial.titleKey, tutorial.defaultTitle);
  const description = t(tutorial.descriptionKey, tutorial.defaultDescription);
  const badge = t(tutorial.badgeKey, tutorial.defaultBadge);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm">
      <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
        {isPlaying ? (
          <iframe
            src={welcomeTutorialEmbedUrl(tutorial.youtubeId)}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="group absolute inset-0 flex w-full flex-col items-center justify-center gap-3 bg-black/5 transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-black/20 dark:hover:bg-black/30"
            aria-label={t("welcome.tutorials.playVideo", "Play video: {{title}}", { title })}
          >
            <img
              src={welcomeTutorialThumbnailUrl(tutorial.youtubeId)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-black/10" aria-hidden />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
              <Play className={cn("h-6 w-6 fill-current sm:h-7 sm:w-7", isRTL ? "mr-0.5" : "ml-0.5")} aria-hidden />
            </span>
            <span className="relative rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {t("welcome.tutorials.playVideoShort", "Play video")}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {badge}
          </span>
        </div>
        <h3 className="text-lg font-semibold leading-snug text-foreground">{title}</h3>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <button
          type="button"
          onClick={() => openYoutubeWatchUrl(tutorial.watchUrl)}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:underline"
        >
          {t("welcome.tutorials.watchOnYoutube", "Watch on YouTube")}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </button>
      </div>
    </article>
  );
}
