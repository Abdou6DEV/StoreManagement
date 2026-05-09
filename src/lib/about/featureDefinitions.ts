import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  BarChart3,
  PackageSearch,
  Users,
  History,
  FileText,
  Wrench,
  Bell,
  TrendingUp,
  Zap,
  FileCheck,
  UserCheck,
  HardDrive,
  Monitor,
  Settings,
  CreditCard,
  ScrollText,
  Calculator,
  Banknote,
  Globe,
  Database,
  Shield,
  Clock,
  Wifi,
  Code,
  RefreshCw,
} from "lucide-react";

export type AboutFeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

/** Same list as About page → Key Features (business capabilities). */
export const ABOUT_MAIN_FEATURE_DEFS: AboutFeatureDef[] = [
  { icon: ShoppingCart, titleKey: "about.features.cashier", descKey: "about.features.cashierDesc" },
  { icon: BarChart3, titleKey: "about.features.dashboard", descKey: "about.features.dashboardDesc" },
  { icon: PackageSearch, titleKey: "about.features.inventory", descKey: "about.features.inventoryDesc" },
  { icon: Users, titleKey: "about.features.clients", descKey: "about.features.clientsDesc" },
  { icon: History, titleKey: "about.features.history", descKey: "about.features.historyDesc" },
  { icon: FileText, titleKey: "about.features.bills", descKey: "about.features.billsDesc" },
  { icon: Banknote, titleKey: "about.features.salary", descKey: "about.features.salaryDesc" },
  { icon: Wrench, titleKey: "about.features.services", descKey: "about.features.servicesDesc" },
  { icon: Bell, titleKey: "about.features.notifications", descKey: "about.features.notificationsDesc" },
  { icon: TrendingUp, titleKey: "about.features.reporting", descKey: "about.features.reportingDesc" },
  { icon: Zap, titleKey: "about.features.sessions", descKey: "about.features.sessionsDesc" },
  { icon: FileCheck, titleKey: "about.features.receipts", descKey: "about.features.receiptsDesc" },
  { icon: UserCheck, titleKey: "about.features.suppliers", descKey: "about.features.suppliersDesc" },
  { icon: HardDrive, titleKey: "about.features.backup", descKey: "about.features.backupDesc" },
  { icon: Monitor, titleKey: "about.features.logger", descKey: "about.features.loggerDesc" },
  { icon: Settings, titleKey: "about.features.admin", descKey: "about.features.adminDesc" },
  { icon: CreditCard, titleKey: "about.features.accounts", descKey: "about.features.accountsDesc" },
  { icon: ScrollText, titleKey: "about.features.activityLog", descKey: "about.features.activityLogDesc" },
  { icon: Calculator, titleKey: "about.features.zakat", descKey: "about.features.zakatDesc" },
];

/** Same list as About page → Technical Features. */
export const ABOUT_TECHNICAL_FEATURE_DEFS: AboutFeatureDef[] = [
  { icon: Globe, titleKey: "about.technical.multilingual", descKey: "about.technical.multilingualDesc" },
  { icon: Database, titleKey: "about.technical.database", descKey: "about.technical.databaseDesc" },
  { icon: Shield, titleKey: "about.technical.security", descKey: "about.technical.securityDesc" },
  { icon: Clock, titleKey: "about.technical.realtime", descKey: "about.technical.realtimeDesc" },
  { icon: Wifi, titleKey: "about.technical.offline", descKey: "about.technical.offlineDesc" },
  { icon: Zap, titleKey: "about.technical.performance", descKey: "about.technical.performanceDesc" },
  { icon: BarChart3, titleKey: "about.technical.scalability", descKey: "about.technical.scalabilityDesc" },
  { icon: Monitor, titleKey: "about.technical.ui", descKey: "about.technical.uiDesc" },
  { icon: Code, titleKey: "about.technical.api", descKey: "about.technical.apiDesc" },
  { icon: RefreshCw, titleKey: "about.technical.autoMigration", descKey: "about.technical.autoMigrationDesc" },
];
