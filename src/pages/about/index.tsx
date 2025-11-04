import React from "react";
import { useTranslation } from "react-i18next";
import { 
  Info, 
  Mail, 
  Phone, 
  MapPin, 
  Code, 
  Shield, 
  Globe, 
  Database,
  ShoppingCart,
  Users,
  PackageSearch,
  History,
  FileText,
  Wrench,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  Star
} from "lucide-react";

export default function AboutPage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ShoppingCart,
      title: t("about.features.cashier", "Advanced Cashier System"),
      description: t("about.features.cashierDesc", "Multi-session cashier with real-time inventory tracking, receipt printing with barcode support, manual products, services integration, credit/versement payments, discount application, and sales history browser")
    },
    {
      icon: BarChart3,
      title: t("about.features.dashboard", "Analytics Dashboard"),
      description: t("about.features.dashboardDesc", "Comprehensive analytics with revenue/profit tracking, interactive charts, today/month/year comparisons, stock statistics, client metrics, and business performance insights")
    },
    {
      icon: PackageSearch,
      title: t("about.features.inventory", "Inventory Management"),
      description: t("about.features.inventoryDesc", "Complete stock management with low stock alerts, barcode printing, best/worst selling products, category summary, product info with warranty tracking, purchase management, and supplier tracking")
    },
    {
      icon: Users,
      title: t("about.features.clients", "Client Management"),
      description: t("about.features.clientsDesc", "Customer database with credit/versement tracking, overdue/due soon payment alerts, payment history, supplier management with purchase tracking, and comprehensive client relationship management")
    },
    {
      icon: History,
      title: t("about.features.history", "Sales History"),
      description: t("about.features.historyDesc", "Detailed transaction history with general and detailed views, advanced search, filtering by period, comprehensive reporting, and sale modification capabilities")
    },
    {
      icon: FileText,
      title: t("about.features.bills", "Bills & Expenses"),
      description: t("about.features.billsDesc", "Bill management system with recurring payments, expense tracking, overdue/due soon alerts, payment history, and financial oversight")
    },
    {
      icon: Wrench,
      title: t("about.features.services", "Service Management"),
      description: t("about.features.servicesDesc", "Service appointment scheduling with service types management, due date tracking, overdue/due soon alerts, completion status, service ticket printing with barcode, and service history")
    },
    {
      icon: Settings,
      title: t("about.features.admin", "Administration"),
      description: t("about.features.adminDesc", "System administration with user management, backup/restore tools, receipt configuration (multilingual, barcode, store info), update management, logger system, and comprehensive settings")
    }
  ];

  const technicalFeatures = [
    {
      icon: Globe,
      title: t("about.technical.multilingual", "Multi-language Support"),
      description: t("about.technical.multilingualDesc", "Full support for English, French, and Arabic with RTL layout")
    },
    {
      icon: Database,
      title: t("about.technical.database", "Secure Database"),
      description: t("about.technical.databaseDesc", "SQLite database with encryption and automatic backup capabilities")
    },
    {
      icon: Shield,
      title: t("about.technical.security", "Data Security"),
      description: t("about.technical.securityDesc", "Role-based access control, secure authentication, and data protection")
    },
    {
      icon: Clock,
      title: t("about.technical.realtime", "Real-time Updates"),
      description: t("about.technical.realtimeDesc", "Live inventory updates, instant notifications, and synchronized data")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-6 shadow-lg">
            <Info className="w-10 h-10 text-white dark:text-black" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("about.title", "About REDA TECH Store Management")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t("about.subtitle", "A comprehensive store management solution designed to streamline your business operations with modern technology and intuitive design.")}
          </p>
        </div>

        {/* App Information */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Code className="w-6 h-6 text-primary dark:text-primary" />
            {t("about.appInfo", "Application Information")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">{t("about.appName", "Application Name")}:</span>
                <span className="text-muted-foreground">REDA TECH Store Management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">{t("about.version", "Version")}:</span>
                <span className="text-muted-foreground">v{window.api?.app?.getVersion?.() || "1.0.0"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">{t("about.platform", "Platform")}:</span>
                <span className="text-muted-foreground">Desktop Application</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">{t("about.technology", "Technology")}:</span>
                <span className="text-muted-foreground">Electron + React + TypeScript</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-foreground font-medium">{t("about.database", "Database")}:</span>
                <span className="text-muted-foreground">SQLite</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-primary dark:text-primary" />
            {t("about.features.title", "Key Features")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-muted/30 rounded-xl p-6 hover:bg-muted/50 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary dark:text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Features */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary dark:text-primary" />
            {t("about.technical.title", "Technical Features")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {technicalFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-muted/20 rounded-xl">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-primary dark:text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Information */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Code className="w-6 h-6 text-primary dark:text-primary" />
            {t("about.developer.title", "Developer Information")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                  <span className="text-white dark:text-black font-bold text-lg">AK</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Abdellah Kahia</h3>
                  <p className="text-muted-foreground">{t("about.developer.role", "Lead Developer & Founder")}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary dark:text-primary" />
                  <span className="text-foreground">abdoukahia853@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary dark:text-primary" />
                  <span className="text-foreground">+213 793 420 745</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary dark:text-primary" />
                  <span className="text-foreground">Annaba, Algeria</span>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-6">
              <h4 className="font-semibold text-foreground mb-3">{t("about.developer.bio", "About the Developer")}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("about.developer.bioText", "Passionate software developer with expertise in modern web technologies and desktop application development. Dedicated to creating efficient, user-friendly solutions that help businesses streamline their operations and achieve their goals.")}
              </p>
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Privacy Policy */}
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary dark:text-primary" />
              {t("about.privacy.title", "Privacy Policy")}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("about.privacy.dataCollection", "• We collect only necessary business data for application functionality")}</p>
              <p>{t("about.privacy.dataStorage", "• All data is stored locally on your device")}</p>
              <p>{t("about.privacy.dataSharing", "• We do not share your data with third parties")}</p>
              <p>{t("about.privacy.dataSecurity", "• Your data is protected with encryption and secure storage")}</p>
              <p>{t("about.privacy.dataAccess", "• You have full control over your data and can export/backup anytime")}</p>
            </div>
          </div>

          {/* Terms of Service */}
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary dark:text-primary" />
              {t("about.terms.title", "Terms of Service")}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("about.terms.license", "• This software is licensed for commercial use")}</p>
              <p>{t("about.terms.warranty", "• Software provided 'as is' without warranty")}</p>
              <p>{t("about.terms.liability", "• Developer not liable for data loss or business damages")}</p>
              <p>{t("about.terms.updates", "• Updates and support provided as available")}</p>
              <p>{t("about.terms.termination", "• License can be terminated at any time")}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground">
            {t("about.footer", "© 2024 REDA TECH. All rights reserved. Built with ❤️ in Algeria.")}
          </p>
        </div>
      </div>
    </div>
  );
}
