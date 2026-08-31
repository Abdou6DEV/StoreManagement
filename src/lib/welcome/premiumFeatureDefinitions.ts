import type { LucideIcon } from "lucide-react";
import { Cloud, Images, ScanLine, Sparkles } from "lucide-react";

export type WelcomePremiumFeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  exampleKey?: string;
};

export const WELCOME_PREMIUM_FEATURE_DEFS: WelcomePremiumFeatureDef[] = [
  {
    icon: Sparkles,
    titleKey: "welcome.premium.features.assistant.title",
    descKey: "welcome.premium.features.assistant.description",
    exampleKey: "welcome.premium.features.assistant.example",
  },
  {
    icon: ScanLine,
    titleKey: "welcome.premium.features.receiptScan.title",
    descKey: "welcome.premium.features.receiptScan.description",
  },
  {
    icon: Images,
    titleKey: "welcome.premium.features.findImage.title",
    descKey: "welcome.premium.features.findImage.description",
  },
  {
    icon: Cloud,
    titleKey: "welcome.premium.features.cloudBackup.title",
    descKey: "welcome.premium.features.cloudBackup.description",
  },
];
