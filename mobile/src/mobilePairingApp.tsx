import { BrowserQRCodeReader } from "@zxing/browser";
import { AlertCircle, Camera, Check, Languages, LoaderCircle, ScanLine, ShieldCheck, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Language = "en" | "fr" | "ar";
type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  scan: string;
  cameraHelp: string;
  startCamera: string;
  stopCamera: string;
  enterCode: string;
  codePlaceholder: string;
  pairPhone: string;
  pairing: string;
  paired: string;
  pairedDetail: string;
  alreadyPaired: string;
  checkAgain: string;
  cameraDenied: string;
  invalidCode: string;
  pairFailed: string;
  tryAgain: string;
  secureNote: string;
  language: string;
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
    enterCode: "Or enter the code",
    codePlaceholder: "Paste pairing code",
    pairPhone: "Pair phone",
    pairing: "Pairing phone…",
    paired: "Phone paired",
    pairedDetail: "This phone is now linked to your store.",
    alreadyPaired: "This phone is already paired",
    checkAgain: "Check connection",
    cameraDenied: "Camera access is unavailable. You can paste the pairing code instead.",
    invalidCode: "That code is invalid or has expired. Create a fresh QR code on the desktop.",
    pairFailed: "Could not pair this phone. Check your connection and try again.",
    tryAgain: "Try again",
    secureNote: "Pairing is one-time. Your phone credential stays on this device.",
    language: "Language",
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
    enterCode: "Ou saisir le code",
    codePlaceholder: "Coller le code d’association",
    pairPhone: "Associer le téléphone",
    pairing: "Association en cours…",
    paired: "Téléphone associé",
    pairedDetail: "Ce téléphone est maintenant relié à votre magasin.",
    alreadyPaired: "Ce téléphone est déjà associé",
    checkAgain: "Vérifier la connexion",
    cameraDenied: "La caméra est indisponible. Vous pouvez saisir le code manuellement.",
    invalidCode: "Ce code est invalide ou expiré. Créez un nouveau QR code sur l’ordinateur.",
    pairFailed: "Impossible d’associer ce téléphone. Vérifiez la connexion et réessayez.",
    tryAgain: "Réessayer",
    secureNote: "L’association est unique. L’identifiant du téléphone reste sur cet appareil.",
    language: "Langue",
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
    enterCode: "أو أدخل الرمز",
    codePlaceholder: "ألصق رمز الربط",
    pairPhone: "ربط الهاتف",
    pairing: "جارٍ ربط الهاتف…",
    paired: "تم ربط الهاتف",
    pairedDetail: "أصبح هذا الهاتف مرتبطاً بمتجرك.",
    alreadyPaired: "هذا الهاتف مرتبط بالفعل",
    checkAgain: "التحقق من الاتصال",
    cameraDenied: "الكاميرا غير متاحة. يمكنك إدخال رمز الربط يدوياً.",
    invalidCode: "الرمز غير صالح أو انتهت صلاحيته. أنشئ رمز QR جديداً من الكمبيوتر.",
    pairFailed: "تعذر ربط الهاتف. تحقق من الاتصال ثم حاول مجدداً.",
    tryAgain: "حاول مجدداً",
    secureNote: "الربط لمرة واحدة. يبقى اعتماد الهاتف على هذا الجهاز فقط.",
    language: "اللغة",
    checkingSavedDevice: "جارٍ التحقق من الهاتف…",
  },
};

const SUPABASE_URL = "https://rztritesbzeunyjluqdi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xgFvypeJMKifcefAPiS38Q_niLG4IR9";
const DEVICE_CREDENTIAL_KEY = "reda-mobile-device-credential";

type DeviceCheckResponse = { ok: boolean; allowed?: boolean };
type PairResponse = { ok: boolean; error?: string; device_credential?: string };

function getInitialLanguage(): Language {
  const saved = localStorage.getItem("reda-mobile-language");
  if (saved === "en" || saved === "fr" || saved === "ar") return saved;
  const browserLanguage = navigator.language.slice(0, 2);
  return browserLanguage === "fr" || browserLanguage === "ar" ? browserLanguage : "en";
}

async function postFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
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
  const [pairingCode, setPairingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [checkingSavedDevice, setCheckingSavedDevice] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserQRCodeReader | null>(null);
  const stopScannerRef = useRef<(() => void) | null>(null);
  const copy = COPY[language];
  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    let cancelled = false;
    const credential = localStorage.getItem(DEVICE_CREDENTIAL_KEY);
    if (!credential) {
      setCheckingSavedDevice(false);
      return;
    }
    void postFunction<DeviceCheckResponse>("mobile-device-check", { device_credential: credential })
      .then((result) => {
        if (!cancelled && result.ok && result.allowed) setPaired(true);
        if (!result?.allowed) localStorage.removeItem(DEVICE_CREDENTIAL_KEY);
      })
      .catch(() => {
        if (!cancelled) setError(copy.pairFailed);
      })
      .finally(() => {
        if (!cancelled) setCheckingSavedDevice(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    scannerRef.current = reader;
    void reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _scanError, controls) => {
      stopScannerRef.current = () => controls.stop();
      if (result && !cancelled) {
        setPairingCode(result.getText().trim());
        setCameraActive(false);
        controls.stop();
      }
    }).catch(() => {
      if (!cancelled) {
        setCameraActive(false);
        setError(copy.cameraDenied);
      }
    });
    return () => {
      cancelled = true;
      stopScannerRef.current?.();
      stopScannerRef.current = null;
      scannerRef.current = null;
    };
  }, [cameraActive, copy.cameraDenied]);

  const changeLanguage = (next: Language) => {
    localStorage.setItem("reda-mobile-language", next);
    setLanguage(next);
  };

  const submitPairing = async (event: FormEvent) => {
    event.preventDefault();
    const token = pairingCode.trim();
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await postFunction<PairResponse>("mobile-pairing-complete", {
        pairing_token: token,
        device_name: `${navigator.platform || "Mobile"} phone`,
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
      localStorage.setItem(DEVICE_CREDENTIAL_KEY, result.device_credential);
      setPaired(true);
      setPairingCode("");
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
  };

  return (
    <main className="mobile-shell" dir={direction}>
      <header className="topbar">
        <a className="brand" href="/mobile/" aria-label="REDA TECH Mobile home">
          <span className="brand-mark">R</span>
          <span>REDA TECH</span>
        </a>
        <label className="language-control">
          <Languages size={16} aria-hidden="true" />
          <span className="sr-only">{copy.language}</span>
          <select value={language} onChange={(event) => changeLanguage(event.target.value as Language)}>
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="ar">عربي</option>
          </select>
        </label>
      </header>

      <section className="pairing-layout">
        <div className="intro-column">
          <p className="eyebrow"><span className="live-dot" />{copy.eyebrow}</p>
          <h1>{paired ? copy.paired : copy.title}</h1>
          <p className="intro-copy">{paired ? copy.pairedDetail : copy.subtitle}</p>
          <div className="security-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{copy.secureNote}</span>
          </div>
        </div>

        <section className="pair-panel" aria-label={copy.scan}>
          {checkingSavedDevice ? (
            <div className="center-state"><LoaderCircle className="spin" /><span>{copy.checkingSavedDevice}</span></div>
          ) : paired ? (
            <div className="paired-state">
              <span className="success-mark"><Check size={30} /></span>
              <h2>{copy.paired}</h2>
              <p>{copy.pairedDetail}</p>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <span className="panel-icon"><ScanLine size={19} /></span>
                <div><h2>{copy.scan}</h2><p>{copy.cameraHelp}</p></div>
              </div>
              {cameraActive ? (
                <div className="camera-stage">
                  <video ref={videoRef} muted playsInline />
                  <span className="scan-frame" aria-hidden="true" />
                  <button className="camera-close" type="button" onClick={() => setCameraActive(false)} aria-label={copy.stopCamera}><X size={18} /></button>
                </div>
              ) : (
                <button className="camera-button" type="button" onClick={() => { setError(null); setCameraActive(true); }}>
                  <Camera size={19} />{copy.startCamera}
                </button>
              )}
              <div className="divider"><span>{copy.enterCode}</span></div>
              <form className="code-form" onSubmit={submitPairing}>
                <input
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={pairingCode}
                  onChange={(event) => setPairingCode(event.target.value)}
                  placeholder={copy.codePlaceholder}
                  aria-label={copy.codePlaceholder}
                />
                <button type="submit" disabled={!pairingCode.trim() || busy}>
                  {busy ? <LoaderCircle className="spin" size={18} /> : <Smartphone size={18} />}
                  {busy ? copy.pairing : copy.pairPhone}
                </button>
              </form>
              {error ? <p className="error-message" role="alert"><AlertCircle size={17} />{error}</p> : null}
            </>
          )}
        </section>
      </section>
      <footer className="page-footer"><span>STORE MANAGEMENT</span><span>·</span><span>REDA TECH</span></footer>
    </main>
  );
}
