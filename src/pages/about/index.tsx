import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../lib/hooks/useTheme";
import { LOGO_ICON, LOGO_ICON_DARK } from "../../lib/assets";
import { Mail, Phone, MapPin, Code, Shield, FileText, Star } from "lucide-react";
import {
  ABOUT_MAIN_FEATURE_DEFS,
  ABOUT_TECHNICAL_FEATURE_DEFS,
} from "../../lib/about/featureDefinitions";

export default function AboutPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [version, setVersion] = useState<string>("1.0.0");

  useEffect(() => {
    const getVersion = async () => {
      try {
        const appVersion = await window.api?.app?.getVersion();
        if (appVersion) {
          setVersion(appVersion);
        }
      } catch (error) {
        console.error("Failed to get version:", error);
      }
    };
    
    getVersion();
  }, []);

  const features = ABOUT_MAIN_FEATURE_DEFS.map((def) => ({
    icon: def.icon,
    title: t(def.titleKey),
    description: t(def.descKey),
  }));

  const technicalFeatures = ABOUT_TECHNICAL_FEATURE_DEFS.map((def) => ({
    icon: def.icon,
    title: t(def.titleKey),
    description: t(def.descKey),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <img
            src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
            alt=""
            className="mx-auto w-50 h-50 object-contain select-none mb-6"
          />
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
                <span className="text-muted-foreground">v{version}</span>
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
