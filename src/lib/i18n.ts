import i18n, { use } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
};

// Get saved language from localStorage or fallback to browser language or 'en'
const getSavedLanguage = (): string => {
  const savedLanguage = localStorage.getItem("language");
  if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
    return savedLanguage;
  }

  // Check browser language
  const browserLanguage = navigator.language.split("-")[0];
  if (resources[browserLanguage as keyof typeof resources]) {
    return browserLanguage;
  }

  return "en";
};

use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Save language to localStorage whenever it changes
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);

  // Update document direction for RTL languages
  const direction = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.style.direction = direction;
});

// Set initial direction
const initialDirection = i18n.language === "ar" ? "rtl" : "ltr";
document.documentElement.setAttribute("dir", initialDirection);
document.documentElement.style.direction = initialDirection;

export default i18n;
