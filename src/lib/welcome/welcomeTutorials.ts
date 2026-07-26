export type WelcomeTutorialDefinition = {
  youtubeId: string;
  watchUrl: string;
  titleKey: string;
  descriptionKey: string;
  badgeKey: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultBadge: string;
};

export const WELCOME_TUTORIALS: readonly WelcomeTutorialDefinition[] = [
  {
    youtubeId: "avgNr6EfhZY",
    watchUrl: "https://youtu.be/avgNr6EfhZY",
    titleKey: "welcome.tutorials.items.install.title",
    descriptionKey: "welcome.tutorials.items.install.description",
    badgeKey: "welcome.tutorials.items.install.badge",
    defaultTitle: "Download & installation",
    defaultDescription:
      "How to download the Windows installer, run setup, and launch Store Management on your PC for the first time.",
    defaultBadge: "Step 1",
  },
  {
    youtubeId: "5afm0IHUEW0",
    watchUrl: "https://youtu.be/5afm0IHUEW0",
    titleKey: "welcome.tutorials.items.setup.title",
    descriptionKey: "welcome.tutorials.items.setup.description",
    badgeKey: "welcome.tutorials.items.setup.badge",
    defaultTitle: "First-time setup & admin",
    defaultDescription:
      "Complete the welcome form, start your trial, and configure essential administrator settings for your shop.",
    defaultBadge: "Step 2",
  },
] as const;

export function welcomeTutorialEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}

export function welcomeTutorialThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}
