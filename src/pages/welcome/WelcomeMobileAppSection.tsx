import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import { MonitorSmartphone, QrCode, RefreshCw, Sparkles } from "lucide-react";
import { FaAndroid, FaApple } from "react-icons/fa";
import { useTranslation } from "react-i18next";

type MobileCarouselAnimationData =
  typeof import("./assets/mobile-phone-carousel.json");

type WelcomeMobileAppSectionProps = {
  isRTL: boolean;
  reduceMotion: boolean;
};

export function WelcomeMobileAppSection({
  isRTL,
  reduceMotion,
}: WelcomeMobileAppSectionProps) {
  const { t } = useTranslation();
  const [animationData, setAnimationData] =
    useState<MobileCarouselAnimationData | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("./assets/mobile-phone-carousel.json").then(({ default: data }) => {
      if (!cancelled) setAnimationData(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="relative border-y border-green-400/40 bg-[radial-gradient(ellipse_at_76%_38%,rgba(74,222,128,0.32)_0%,transparent_42%),linear-gradient(112deg,#052e16_0%,#064e3b_30%,#047857_62%,#14532d_100%)] lg:h-[31.5rem] lg:max-h-[31.5rem]"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto h-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:py-0">
        <div
          className="grid items-center gap-8 lg:h-full lg:grid-cols-[minmax(0,1fr)_35rem] lg:gap-12"
          dir="ltr"
        >
          <header
            className="mx-auto max-w-2xl text-center drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] lg:mx-0 lg:text-start"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-100/35 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("welcome.sectionNav.premium", "What's new")}
            </span>
            <h2 className="welcome-mobile-title py-2 text-[1.85rem] font-bold leading-[1.15] tracking-tight sm:text-[2.15rem] lg:text-[2.35rem]">
              {t("welcome.mobileApp.title", "REDA TECH Mobile")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-emerald-100/90 sm:text-lg">
              {t(
                "welcome.mobileApp.subtitle",
                "A look at the REDA TECH mobile app for your shop.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100/35 bg-white/10 px-3.5 py-2 text-sm font-medium text-green-50 shadow-sm backdrop-blur-sm">
                <FaApple className="h-4 w-4 text-white-200" aria-hidden="true" />
                {t("welcome.mobileApp.iosCompatible", "iOS compatible")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-white/10 px-3.5 py-2 text-sm font-medium text-green-50 shadow-sm backdrop-blur-sm">
                <FaAndroid className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                {t("welcome.mobileApp.androidCompatible", "Android compatible")}
              </span>
            </div>
            <ul className="mt-5 grid grid-cols-3 gap-1.5 text-center sm:gap-2 sm:text-start">
              <li className="flex min-h-[4.5rem] min-w-0 flex-col items-center gap-1 rounded-lg border border-white/15 bg-white/[0.08] px-1 py-2 backdrop-blur-sm sm:min-h-[8rem] sm:items-start sm:gap-2 sm:px-2.5 sm:py-3">
                <QrCode className="h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="break-words text-[10px] font-semibold leading-tight text-white sm:text-sm sm:leading-normal">
                    {t("welcome.mobileApp.pairingTitle", "Easy pairing")}
                  </h3>
                  <p className="sr-only mt-0.5 text-xs leading-snug text-green-100/85 sm:not-sr-only">
                    {t("welcome.mobileApp.pairingDescription", "Scan a QR code")}
                  </p>
                </div>
              </li>
              <li className="flex min-h-[4.5rem] min-w-0 flex-col items-center gap-1 rounded-lg border border-white/15 bg-white/[0.08] px-1 py-2 backdrop-blur-sm sm:min-h-[8rem] sm:items-start sm:gap-2 sm:px-2.5 sm:py-3">
                <RefreshCw className="h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="break-words text-[10px] font-semibold leading-tight text-white sm:text-sm sm:leading-normal">
                    {t("welcome.mobileApp.syncTitle", "Stay in sync")}
                  </h3>
                  <p className="sr-only mt-0.5 text-xs leading-snug text-green-100/85 sm:not-sr-only">
                    {t("welcome.mobileApp.syncDescription", "Refresh for updates")}
                  </p>
                </div>
              </li>
              <li className="flex min-h-[4.5rem] min-w-0 flex-col items-center gap-1 rounded-lg border border-white/15 bg-white/[0.08] px-1 py-2 backdrop-blur-sm sm:min-h-[8rem] sm:items-start sm:gap-2 sm:px-2.5 sm:py-3">
                <MonitorSmartphone className="h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="break-words text-[10px] font-semibold leading-tight text-white sm:text-sm sm:leading-normal">
                    {t("welcome.mobileApp.devicesTitle", "PC + phone")}
                  </h3>
                  <p className="sr-only mt-0.5 text-xs leading-snug text-green-100/85 sm:not-sr-only">
                    {t("welcome.mobileApp.devicesDescription", "One connected shop")}
                  </p>
                </div>
              </li>
            </ul>
          </header>

          <div className="hidden lg:block lg:h-full" aria-hidden="true" />

          <div
            className="ml-auto mr-[-0.5rem] aspect-[29/25] w-full max-w-[32.5rem] overflow-hidden rounded-[1.5rem] border border-amber-200/55 bg-[radial-gradient(ellipse_at_18%_16%,rgba(234,179,8,0.5)_0%,transparent_44%),radial-gradient(ellipse_at_82%_82%,rgba(212,175,55,0.34)_0%,transparent_46%),linear-gradient(145deg,#064e3b_0%,#065f46_42%,#022c22_100%)] shadow-[0_18px_48px_-24px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-yellow-100/25 sm:mr-[-1rem] lg:absolute lg:bottom-2 lg:right-2 lg:top-2 lg:mr-0 lg:aspect-auto lg:h-auto lg:w-[35rem] lg:max-w-none"
            role="img"
            aria-label={t("welcome.mobileApp.animationAlt", "REDA TECH mobile app phone carousel")}
          >
            {animationData ? (
              <div className="aspect-[800/751] w-full">
                <Lottie
                  src={animationData}
                  renderer="canvas"
                  loop
                  autoplay={!reduceMotion}
                  aria-hidden="true"
                  className="h-full w-full"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}