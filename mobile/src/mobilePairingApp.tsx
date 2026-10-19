import type { BrowserQRCodeReader } from "@zxing/browser";
import { AlertCircle, Camera, LoaderCircle, ScanLine, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MobilePosApp } from "./mobilePosApp";
import {
  MOBILE_DEVICE_CREDENTIAL_KEY,
  MOBILE_PUBLISHABLE_KEY,
  MOBILE_SUPABASE_URL,
} from "./mobileApi";
import type { MobileLanguage } from "./mobileApi";

type Language = MobileLanguage;
type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  scan: string;
  cameraHelp: string;
  startCamera: string;
  stopCamera: string;
  pairing: string;
  paired: string;
  pairedDetail: string;
  alreadyPaired: string;
  checkAgain: string;
  cameraDenied: string;
  invalidCode: string;
  pairFailed: string;
  offline: string;
  revoked: string;
  tryAgain: string;
  checkingSavedDevice: string;
};

const COPY: Record<Language, Copy> = {
  en: {
    eyebrow: "REDA TECH · MOBILE",
    title: "Pair this phone",
    subtitle: "Scan the one-time QR code shown in your store app.",
    scan: "Scan pairing QR",
    cameraHelp: "Allow camera access, then hold the QR code inside the frame.",
    startCamera: "Open camera",
    stopCamera: "Stop camera",
    pairing: "Pairing phone…",
    paired: "Phone paired",
    pairedDetail: "This phone is now linked to your store.",
    alreadyPaired: "This phone is already paired",
    checkAgain: "Check connection",
    cameraDenied: "Camera access is unavailable. Allow camera access and try again.",
    invalidCode: "That code is invalid or has expired. Create a fresh QR code on the desktop.",
    pairFailed: "Could not pair this phone. Check your connection and try again.",
    offline: "You are offline. Connect to the internet to verify this phone.",
    revoked: "This phone was removed from the shop. Scan a new QR code to pair it again.",
    tryAgain: "Try again",
    checkingSavedDevice: "Checking this phone…",
  },
  fr: {
    eyebrow: "REDA TECH · MOBILE",
    title: "Associer ce téléphone",
    subtitle: "Scannez le QR code à usage unique affiché dans l’application du magasin.",
    scan: "Scanner le QR d’association",
    cameraHelp: "Autorisez l’accès à la caméra, puis placez le QR code dans le cadre.",
    startCamera: "Ouvrir la caméra",
    stopCamera: "Arrêter la caméra",
    pairing: "Association en cours…",
    paired: "Téléphone associé",
    pairedDetail: "Ce téléphone est maintenant relié à votre magasin.",
    alreadyPaired: "Ce téléphone est déjà associé",
    checkAgain: "Vérifier la connexion",
    cameraDenied: "La caméra est indisponible. Autorisez son accès puis réessayez.",
    invalidCode: "Ce code est invalide ou expiré. Créez un nouveau QR code sur l’ordinateur.",
    pairFailed: "Impossible d’associer ce téléphone. Vérifiez la connexion et réessayez.",
    offline: "Vous êtes hors ligne. Connectez-vous pour vérifier ce téléphone.",
    revoked: "Ce téléphone a été retiré de la boutique. Scannez un nouveau QR code pour l’associer à nouveau.",
    tryAgain: "Réessayer",
    checkingSavedDevice: "Vérification du téléphone…",
  },
  ar: {
    eyebrow: "REDA TECH · تطبيق الهاتف",
    title: "اربط هذا الهاتف",
    subtitle: "امسح رمز QR لمرة واحدة الظاهر في تطبيق المتجر.",
    scan: "مسح رمز الربط",
    cameraHelp: "اسمح باستخدام الكاميرا ثم ضع رمز QR داخل الإطار.",
    startCamera: "فتح الكاميرا",
    stopCamera: "إيقاف الكاميرا",
    pairing: "جارٍ ربط الهاتف…",
    paired: "تم ربط الهاتف",
    pairedDetail: "أصبح هذا الهاتف مرتبطاً بمتجرك.",
    alreadyPaired: "هذا الهاتف مرتبط بالفعل",
    checkAgain: "التحقق من الاتصال",
    cameraDenied: "الكاميرا غير متاحة. اسمح باستخدام الكاميرا ثم حاول مجدداً.",
    invalidCode: "الرمز غير صالح أو انتهت صلاحيته. أنشئ رمز QR جديداً من الكمبيوتر.",
    pairFailed: "تعذر ربط الهاتف. تحقق من الاتصال ثم حاول مجدداً.",
    offline: "أنت غير متصل. اتصل بالإنترنت للتحقق من هذا الهاتف.",
    revoked: "تمت إزالة هذا الهاتف من المتجر. امسح رمز QR جديداً لإعادة ربطه.",
    tryAgain: "حاول مجدداً",
    checkingSavedDevice: "جارٍ التحقق من الهاتف…",
  },
};

type DeviceCheckResponse = { ok: boolean; allowed?: boolean };
type PairResponse = { ok: boolean; error?: string; device_credential?: string };

function getInitialLanguage(): Language {
  const saved = localStorage.getItem("reda-mobile-language");
  if (saved === "en" || saved === "fr" || saved === "ar") return saved;
  const browserLanguage = navigator.language.slice(0, 2);
  return browserLanguage === "fr" || browserLanguage === "ar" ? browserLanguage : "en";
}

async function postFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`${MOBILE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: MOBILE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as T | null;
  if (!response.ok || !result) {
    const functionError =
      result && typeof result === "object" && "error" in result && typeof result.error === "string"
        ? result.error
        : "request_failed";
    throw new Error(functionError);
  }
  return result;
}

export function MobilePairingApp() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [hasSavedCredential, setHasSavedCredential] = useState(() =>
    Boolean(localStorage.getItem(MOBILE_DEVICE_CREDENTIAL_KEY)),
  );
  const [checkingSavedDevice, setCheckingSavedDevice] = useState(true);
  const [checkingDevice, setCheckingDevice] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopScannerRef = useRef<(() => void) | null>(null);
  const copy = COPY[language];
  const direction = language === "ar" ? "rtl" : "ltr";

  const checkSavedDevice = useCallback(async () => {
    const credential = localStorage.getItem(MOBILE_DEVICE_CREDENTIAL_KEY);
    if (!credential) {
      setHasSavedCredential(false);
      setCheckingSavedDevice(false);
      return;
    }
    setCheckingDevice(true);
    try {
      const result = await postFunction<DeviceCheckResponse>("mobile-device-check", {
        device_credential: credential,
      });
      if (result.ok && result.allowed) {
        setHasSavedCredential(true);
        setPaired(true);
        setError(null);
      } else {
        localStorage.removeItem(MOBILE_DEVICE_CREDENTIAL_KEY);
        setHasSavedCredential(false);
        setPaired(false);
        setError(copy.revoked);
      }
    } catch {
      setError(copy.pairFailed);
    } finally {
      setCheckingSavedDevice(false);
      setCheckingDevice(false);
    }
  }, [copy.pairFailed, copy.revoked]);

  const submitPairing = useCallback(async (token: string) => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await postFunction<PairResponse>("mobile-pairing-complete", {
        pairing_token: token,
        platform: /iPad|iPhone|iPod/.test(navigator.userAgent)
          ? "ios"
          : /Android/i.test(navigator.userAgent)
            ? "android"
            : "web",
      });
      if (!result.ok || !result.device_credential) {
        if (result.error === "invalid_or_expired_token" || result.error === "invalid_pairing_request") {
          throw new Error("invalid_code");
        }
        throw new Error("pair_failed");
      }
      localStorage.setItem(MOBILE_DEVICE_CREDENTIAL_KEY, result.device_credential);
      setHasSavedCredential(true);
      setPaired(true);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error &&
          ["invalid_code", "invalid_or_expired_token", "invalid_pairing_request"].includes(cause.message)
          ? copy.invalidCode
          : copy.pairFailed,
      );
    } finally {
      setBusy(false);
    }
  }, [busy, copy.invalidCode, copy.pairFailed]);

  useEffect(() => {
    void checkSavedDevice();
  }, [checkSavedDevice]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, language]);

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const { BrowserQRCodeReader: Reader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader: BrowserQRCodeReader = new Reader();
        await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _scanError, controls) => {
          stopScannerRef.current = () => controls.stop();
          if (result && !cancelled) {
            const scannedToken = result.getText().trim();
            setCameraActive(false);
            controls.stop();
            void submitPairing(scannedToken);
          }
        });
      } catch {
        if (!cancelled) {
          setCameraActive(false);
          setError(copy.cameraDenied);
        }
      }
    })();
    return () => {
      cancelled = true;
      stopScannerRef.current?.();
      stopScannerRef.current = null;
    };
  }, [cameraActive, copy.cameraDenied, submitPairing]);

  if (paired) {
    return (
      <MobilePosApp
        language={language}
        onLanguageChange={setLanguage}
        onDeviceInvalid={() => {
          localStorage.removeItem(MOBILE_DEVICE_CREDENTIAL_KEY);
          setHasSavedCredential(false);
          setPaired(false);
          setError(copy.revoked);
        }}
      />
    );
  }

  const changeLanguage = (next: Language) => {
    localStorage.setItem("reda-mobile-language", next);
    setLanguage(next);
  };

  return (
    <main className="mobile-shell" dir={direction}>
      <div className="langs" role="group" aria-label="Language">
        <button type="button" className={language === "en" ? "on" : ""} onClick={() => changeLanguage("en")}>English</button>
        <button type="button" className={language === "fr" ? "on" : ""} onClick={() => changeLanguage("fr")}>Français</button>
        <button type="button" className={language === "ar" ? "on" : ""} onClick={() => changeLanguage("ar")}>العربية</button>
      </div>
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}myapp_black.ico`} alt="REDA TECH" />
        <h1>{copy.title}</h1>
        <p className="sub">{copy.subtitle}</p>
      </div>
      <section className="card" aria-label={copy.scan}>
        {checkingSavedDevice ? (
          <p className="msg"><LoaderCircle className="spin" size={18} /> {copy.checkingSavedDevice}</p>
        ) : hasSavedCredential ? (
          <>
            {error ? <p className="msg err" role="alert"><AlertCircle size={17} /> {error}</p> : null}
            {!online ? <p className="msg err"><WifiOff size={17} /> {copy.offline}</p> : null}
            <button
              className="btn secondary"
              type="button"
              disabled={checkingDevice || !online}
              onClick={() => void checkSavedDevice()}
            >
              {checkingDevice ? <LoaderCircle className="spin" size={18} /> : null}
              {checkingDevice ? copy.checkingSavedDevice : copy.checkAgain}
            </button>
          </>
        ) : (
          <>
            <p className="sub scan-help"><ScanLine size={17} /> {copy.cameraHelp}</p>
            {!online ? <p className="msg err"><WifiOff size={17} /> {copy.offline}</p> : null}
            {cameraActive ? (
              <div className="camera-stage">
                <video ref={videoRef} muted playsInline />
                <span className="scan-frame" aria-hidden="true" />
                <button className="camera-close" type="button" onClick={() => setCameraActive(false)} aria-label={copy.stopCamera}><X size={18} /></button>
              </div>
            ) : (
              <button className="btn primary" type="button" disabled={busy || !online} onClick={() => { setError(null); setCameraActive(true); }}>
                {busy ? <LoaderCircle className="spin" size={18} /> : <Camera size={18} />}
                {busy ? copy.pairing : copy.startCamera}
              </button>
            )}
            {error ? <p className="msg err" role="alert"><AlertCircle size={17} /> {error}</p> : null}
          </>
        )}
      </section>
    </main>
  );
}
