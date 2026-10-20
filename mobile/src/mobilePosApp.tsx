import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  loginMobile,
  logoutMobile,
  MobileApiError,
  refreshMobile,
} from "./mobileApi";
import type {
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
  MobileRow,
  MobileUser,
} from "./mobileApi";

type Section =
  | "menu"
  | "dashboard"
  | "stock"
  | "history"
  | "services"
  | "bills"
  | "clients";

type Copy = {
  appName: string;
  loginTitle: string;
  loginHelp: string;
  username: string;
  password: string;
  login: string;
  signingIn: string;
  menu: string;
  dashboard: string;
  stock: string;
  history: string;
  services: string;
  bills: string;
  clients: string;
  refresh: string;
  refreshing: string;
  logout: string;
  search: string;
  loading: string;
  empty: string;
  offline: string;
  stale: string;
  lastUpdated: string;
  welcome: string;
  noPermission: string;
  salesHistoryNote: string;
  salesHistoryUnavailable: string;
  categories: string;
  categoriesUnavailable: string;
  saleItems: string;
  sale: string;
  recentDays: string;
  revenue: string;
  sales: string;
  profit: string;
  items: string;
  appointments: string;
  serviceCatalog: string;
  billPayments: string;
  paymentRecords: string;
  yes: string;
  no: string;
  errors: Record<string, string>;
  columnLabels: Record<string, string>;
};

const COPY: Record<MobileLanguage, Copy> = {
  en: {
    appName: "REDA TECH",
    loginTitle: "Sign in to your store",
    loginHelp: "Use your desktop POS username and password.",
    username: "Username",
    password: "Password",
    login: "Sign in",
    signingIn: "Signing in…",
    menu: "Main menu",
    dashboard: "Dashboard",
    stock: "Stock",
    history: "History",
    services: "Services",
    bills: "Bills",
    clients: "Clients",
    refresh: "Refresh data",
    refreshing: "Refreshing…",
    logout: "Sign out",
    search: "Search",
    loading: "Loading your store data…",
    empty: "No records to show.",
    offline: "You are offline. Previously loaded data is shown if available.",
    stale: "The latest refresh failed. Displayed data may be stale.",
    lastUpdated: "Last refreshed",
    welcome: "Choose a section to view your store.",
    noPermission: "You don't have permission to view this section.",
    salesHistoryNote:
      "Sales, items, and payments are shown as read-only records.",
    salesHistoryUnavailable:
      "Sales history is not available from this server yet. Payments remain available.",
    categories: "Categories",
    categoriesUnavailable:
      "Categories are not available from this server yet.",
    saleItems: "Sale items",
    sale: "Sale",
    recentDays: "Daily summary",
    revenue: "Revenue",
    sales: "Sales",
    profit: "Profit",
    items: "Items",
    appointments: "Appointments",
    serviceCatalog: "Service catalog",
    billPayments: "Bill payments",
    paymentRecords: "Payment records",
    yes: "Yes",
    no: "No",
    errors: {
      invalid_credentials: "Incorrect username or password.",
      credentials_required: "Enter both your username and password.",
      device_revoked: "This phone is no longer paired. Pair it again from the desktop.",
      mobile_access_disabled: "Mobile access is disabled for this store.",
      licensing_unavailable: "Store authorization is temporarily unavailable.",
      login_unavailable: "Sign-in is temporarily unavailable. Try again.",
      session_expired: "Your session expired. Sign in again.",
      user_inactive: "This user account is inactive.",
      network_error: "Could not connect. Check your internet connection.",
      data_unavailable: "Store data could not be loaded.",
      invalid_response: "The server returned an unexpected response.",
      request_failed: "The request failed. Try again.",
      logout_failed: "The server could not confirm sign-out.",
    },
    columnLabels: {
      name: "Name",
      username: "Username",
      role: "Role",
      barcode: "Barcode",
      reference: "Reference",
      sku: "SKU",
      quantity: "Quantity",
      stock: "Stock",
      stock_quantity: "Stock",
      price: "Price",
      sale_price: "Sale price",
      purchase_price: "Purchase price",
      total: "Total",
      amount: "Amount",
      paid_amount: "Paid",
      remaining_amount: "Remaining",
      status: "Status",
      phone: "Phone",
      email: "Email",
      address: "Address",
      due_date: "Due date",
      next_bill_date: "Next bill date",
      paid_date: "Paid date",
      created_at: "Created",
      updated_at: "Updated",
      description: "Description",
      category_name: "Category",
      total_amount_with_discount: "Total after discount",
      total_profit: "Profit",
      source_created_at: "Created",
      customer_name: "Client",
      client_name: "Client",
      device_name: "Device",
      service_name: "Service",
      sales_count: "Sales",
      revenue: "Revenue",
      profit: "Profit",
      total_items: "Items",
      local_day: "Date",
      bill_payments: "Bill payments",
    },
  },
  fr: {
    appName: "REDA TECH",
    loginTitle: "Connexion à votre magasin",
    loginHelp: "Utilisez le nom d’utilisateur et le mot de passe du POS.",
    username: "Nom d’utilisateur",
    password: "Mot de passe",
    login: "Se connecter",
    signingIn: "Connexion…",
    menu: "Menu principal",
    dashboard: "Tableau de bord",
    stock: "Stock",
    history: "Historique",
    services: "Services",
    bills: "Factures",
    clients: "Clients",
    refresh: "Actualiser",
    refreshing: "Actualisation…",
    logout: "Déconnexion",
    search: "Rechercher",
    loading: "Chargement des données…",
    empty: "Aucun enregistrement à afficher.",
    offline: "Vous êtes hors ligne. Les données déjà chargées restent affichées.",
    stale: "L’actualisation a échoué. Les données affichées peuvent être obsolètes.",
    lastUpdated: "Dernière actualisation",
    welcome: "Choisissez une section de votre magasin.",
    noPermission: "Vous n’avez pas accès à cette section.",
    salesHistoryNote:
      "Les ventes, articles et paiements sont affichés en lecture seule.",
    salesHistoryUnavailable:
      "L’historique des ventes n’est pas encore disponible sur ce serveur. Les paiements restent accessibles.",
    categories: "Catégories",
    categoriesUnavailable:
      "Les catégories ne sont pas encore disponibles sur ce serveur.",
    saleItems: "Articles vendus",
    sale: "Vente",
    recentDays: "Résumé quotidien",
    revenue: "Chiffre d’affaires",
    sales: "Ventes",
    profit: "Bénéfice",
    items: "Articles",
    appointments: "Rendez-vous",
    serviceCatalog: "Catalogue des services",
    billPayments: "Paiements de factures",
    paymentRecords: "Paiements",
    yes: "Oui",
    no: "Non",
    errors: {
      invalid_credentials: "Nom d’utilisateur ou mot de passe incorrect.",
      credentials_required: "Saisissez le nom d’utilisateur et le mot de passe.",
      device_revoked: "Ce téléphone n’est plus associé. Associez-le depuis l’ordinateur.",
      mobile_access_disabled: "L’accès mobile est désactivé pour ce magasin.",
      licensing_unavailable: "L’autorisation du magasin est temporairement indisponible.",
      login_unavailable: "Connexion temporairement indisponible. Réessayez.",
      session_expired: "Votre session a expiré. Connectez-vous à nouveau.",
      user_inactive: "Ce compte utilisateur est inactif.",
      network_error: "Connexion impossible. Vérifiez votre réseau.",
      data_unavailable: "Impossible de charger les données du magasin.",
      invalid_response: "Le serveur a renvoyé une réponse inattendue.",
      request_failed: "La requête a échoué. Réessayez.",
      logout_failed: "Le serveur n’a pas confirmé la déconnexion.",
    },
    columnLabels: {
      name: "Nom",
      username: "Utilisateur",
      role: "Rôle",
      barcode: "Code-barres",
      reference: "Référence",
      sku: "SKU",
      quantity: "Quantité",
      stock: "Stock",
      stock_quantity: "Stock",
      price: "Prix",
      sale_price: "Prix de vente",
      purchase_price: "Prix d’achat",
      total: "Total",
      amount: "Montant",
      paid_amount: "Payé",
      remaining_amount: "Restant",
      status: "Statut",
      phone: "Téléphone",
      email: "E-mail",
      address: "Adresse",
      due_date: "Échéance",
      next_bill_date: "Prochaine facture",
      paid_date: "Date de paiement",
      created_at: "Créé",
      updated_at: "Modifié",
      description: "Description",
      category_name: "Catégorie",
      total_amount_with_discount: "Total après remise",
      total_profit: "Bénéfice",
      source_created_at: "Créé",
      customer_name: "Client",
      client_name: "Client",
      device_name: "Appareil",
      service_name: "Service",
      sales_count: "Ventes",
      revenue: "Chiffre d’affaires",
      profit: "Bénéfice",
      total_items: "Articles",
      local_day: "Date",
      bill_payments: "Paiements de factures",
    },
  },
  ar: {
    appName: "ريدا تيك",
    loginTitle: "تسجيل الدخول إلى متجرك",
    loginHelp: "استخدم اسم المستخدم وكلمة المرور الخاصة بنقطة البيع.",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    login: "تسجيل الدخول",
    signingIn: "جارٍ تسجيل الدخول…",
    menu: "القائمة الرئيسية",
    dashboard: "لوحة المعلومات",
    stock: "المخزون",
    history: "السجل",
    services: "الخدمات",
    bills: "الفواتير",
    clients: "العملاء",
    refresh: "تحديث البيانات",
    refreshing: "جارٍ التحديث…",
    logout: "تسجيل الخروج",
    search: "بحث",
    loading: "جارٍ تحميل بيانات المتجر…",
    empty: "لا توجد سجلات للعرض.",
    offline: "أنت غير متصل. ستظهر البيانات المحملة سابقاً إن توفرت.",
    stale: "تعذر تحديث البيانات. قد تكون البيانات المعروضة قديمة.",
    lastUpdated: "آخر تحديث",
    welcome: "اختر قسماً لعرض بيانات متجرك.",
    noPermission: "ليست لديك صلاحية لعرض هذا القسم.",
    salesHistoryNote: "تُعرض المبيعات والعناصر والمدفوعات للقراءة فقط.",
    salesHistoryUnavailable:
      "سجل المبيعات غير متاح على هذا الخادم بعد. تبقى المدفوعات متاحة.",
    categories: "الفئات",
    categoriesUnavailable: "الفئات غير متاحة على هذا الخادم بعد.",
    saleItems: "عناصر المبيعات",
    sale: "بيع",
    recentDays: "الملخص اليومي",
    revenue: "الإيرادات",
    sales: "المبيعات",
    profit: "الربح",
    items: "العناصر",
    appointments: "المواعيد",
    serviceCatalog: "قائمة الخدمات",
    billPayments: "دفعات الفواتير",
    paymentRecords: "سجلات الدفع",
    yes: "نعم",
    no: "لا",
    errors: {
      invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة.",
      credentials_required: "أدخل اسم المستخدم وكلمة المرور.",
      device_revoked: "لم يعد هذا الهاتف مقترناً. أعد ربطه من الكمبيوتر.",
      mobile_access_disabled: "الوصول عبر الهاتف معطل لهذا المتجر.",
      licensing_unavailable: "تعذر التحقق من ترخيص المتجر مؤقتاً.",
      login_unavailable: "تسجيل الدخول غير متاح مؤقتاً. حاول مجدداً.",
      session_expired: "انتهت جلستك. سجل الدخول مجدداً.",
      user_inactive: "حساب المستخدم غير نشط.",
      network_error: "تعذر الاتصال. تحقق من اتصال الإنترنت.",
      data_unavailable: "تعذر تحميل بيانات المتجر.",
      invalid_response: "أعاد الخادم استجابة غير متوقعة.",
      request_failed: "فشل الطلب. حاول مجدداً.",
      logout_failed: "لم يتمكن الخادم من تأكيد تسجيل الخروج.",
    },
    columnLabels: {
      name: "الاسم",
      username: "المستخدم",
      role: "الدور",
      barcode: "الباركود",
      reference: "المرجع",
      sku: "رمز المنتج",
      quantity: "الكمية",
      stock: "المخزون",
      stock_quantity: "المخزون",
      price: "السعر",
      sale_price: "سعر البيع",
      purchase_price: "سعر الشراء",
      total: "الإجمالي",
      amount: "المبلغ",
      paid_amount: "المدفوع",
      remaining_amount: "المتبقي",
      status: "الحالة",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      address: "العنوان",
      due_date: "تاريخ الاستحقاق",
      next_bill_date: "الفاتورة القادمة",
      paid_date: "تاريخ الدفع",
      created_at: "تاريخ الإنشاء",
      updated_at: "تاريخ التحديث",
      description: "الوصف",
      category_name: "الفئة",
      total_amount_with_discount: "الإجمالي بعد الخصم",
      total_profit: "الربح",
      source_created_at: "تاريخ الإنشاء",
      customer_name: "العميل",
      client_name: "العميل",
      device_name: "الجهاز",
      service_name: "الخدمة",
      sales_count: "المبيعات",
      revenue: "الإيرادات",
      profit: "الربح",
      total_items: "العناصر",
      local_day: "التاريخ",
      bill_payments: "دفعات الفواتير",
    },
  },
};

const SECTIONS: Array<{
  id: Exclude<Section, "menu">;
  icon: typeof LayoutDashboard;
  permission: keyof MobilePermissions;
}> = [
  { id: "dashboard", icon: LayoutDashboard, permission: "can_access_dashboard" },
  { id: "stock", icon: Boxes, permission: "can_access_stock" },
  { id: "history", icon: ClipboardList, permission: "can_access_history" },
  { id: "services", icon: BriefcaseBusiness, permission: "can_access_services" },
  { id: "bills", icon: CreditCard, permission: "can_access_bills" },
  { id: "clients", icon: Users, permission: "can_access_clients" },
];

function errorMessage(error: unknown, copy: Copy): string {
  const code = error instanceof MobileApiError ? error.code : "request_failed";
  return copy.errors[code] ?? copy.errors.request_failed;
}

function errorCode(error: unknown): string | null {
  return error instanceof MobileApiError ? error.code : null;
}

function safeValue(value: unknown, language: MobileLanguage, copy: Copy): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? copy.yes : copy.no;
  if (typeof value === "number") {
    return new Intl.NumberFormat(language === "ar" ? "ar" : language).format(value);
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (
      value.length >= 10 &&
      (value.includes("T") || /^\d{4}-\d{2}-\d{2}$/.test(value)) &&
      Number.isFinite(date.getTime())
    ) {
      return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date);
    }
    return value;
  }
  return "";
}

function fieldLabel(key: string, copy: Copy): string {
  return (
    copy.columnLabels[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function safeFields(row: MobileRow): Array<[string, unknown]> {
  return Object.entries(row)
    .filter(([key]) => !/(password|hash|secret|token)/i.test(key))
    .filter(([key]) => !/^(id|source_id|customer_id|sync_version|source_updated_at|deleted_at)$/i.test(key))
    .filter(([, value]) => value == null || ["string", "number", "boolean"].includes(typeof value))
    .filter(([, value]) => value !== null && value !== "");
}

function searchable(row: MobileRow): string {
  return safeFields(row)
    .map(([, value]) => String(value ?? ""))
    .join(" ")
    .toLocaleLowerCase();
}

function formatTime(value: Date, language: MobileLanguage): string {
  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function LoginScreen({
  copy,
  onLogin,
}: {
  copy: Copy;
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onLogin(username.trim(), password);
      setPassword("");
    } catch (cause) {
      setError(errorMessage(cause, copy));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mobile-login card">
      <div className="mobile-login-icon"><Users size={24} /></div>
      <h2>{copy.loginTitle}</h2>
      <p className="sub">{copy.loginHelp}</p>
      <form className="mobile-login-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>{copy.username}</span>
          <input
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          <span>{copy.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="msg err" role="alert"><AlertCircle size={17} />{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : null}
          {busy ? copy.signingIn : copy.login}
        </button>
      </form>
    </section>
  );
}

function RecordList({
  rows,
  language,
  copy,
  query,
  emptyLabel,
}: {
  rows: MobileRow[];
  language: MobileLanguage;
  copy: Copy;
  query: string;
  emptyLabel?: string;
}) {
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? rows.filter((row) => searchable(row).includes(term)) : rows;
  }, [query, rows]);

  if (filteredRows.length === 0) {
    return <p className="mobile-empty">{emptyLabel ?? copy.empty}</p>;
  }

  return (
    <div className="mobile-record-list">
      {filteredRows.map((row, index) => {
        const fields = safeFields(row).slice(0, 5);
        const titleField =
          fields.find(([key]) => /^(name|title|service_name|client_name|customer_name|reference|barcode|username)$/i.test(key)) ??
          fields[0];
        const title = titleField
          ? safeValue(titleField[1], language, copy)
          : `#${index + 1}`;
        const details = fields.filter(([key]) => key !== titleField?.[0]).slice(0, 3);
        return (
          <article className="mobile-record" key={String(row.source_id ?? row.id ?? index)}>
            <h3>{title}</h3>
            <dl>
              {details.map(([key, value]) => (
                <div key={key}>
                  <dt>{fieldLabel(key, copy)}</dt>
                  <dd>{safeValue(value, language, copy)}</dd>
                </div>
              ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

function Dashboard({
  rows,
  language,
  copy,
}: {
  rows: MobileRow[];
  language: MobileLanguage;
  copy: Copy;
}) {
  const history = [...rows].sort((a, b) =>
    String(b.local_day ?? "").localeCompare(String(a.local_day ?? "")),
  ).slice(0, 365);
  if (history.length === 0) return <p className="mobile-empty">{copy.empty}</p>;
  const totals = history.slice(0, 7).reduce<{ revenue: number; sales: number; profit: number; items: number }>(
    (result, row) => ({
      revenue: result.revenue + (Number(row.revenue) || 0),
      sales: result.sales + (Number(row.sales_count) || 0),
      profit: result.profit + (Number(row.profit) || 0),
      items: result.items + (Number(row.total_items) || 0),
    }),
    { revenue: 0, sales: 0, profit: 0, items: 0 },
  );
  const metrics = [
    [copy.revenue, totals.revenue],
    [copy.sales, totals.sales],
    [copy.profit, totals.profit],
    [copy.items, totals.items],
  ] as const;

  return (
    <>
      <div className="mobile-metrics">
        {metrics.map(([label, value]) => (
          <article className="mobile-metric" key={label}>
            <span>{label}</span>
            <strong>{new Intl.NumberFormat(language === "ar" ? "ar" : language, {
              maximumFractionDigits: 2,
            }).format(value)}</strong>
          </article>
        ))}
      </div>
      <section className="mobile-subsection">
        <h2>{copy.recentDays}</h2>
        <RecordList rows={history} language={language} copy={copy} query="" />
      </section>
    </>
  );
}

function SectionContent({
  section,
  data,
  language,
  copy,
  query,
}: {
  section: Exclude<Section, "menu">;
  data: MobileBundle;
  language: MobileLanguage;
  copy: Copy;
  query: string;
}) {
  if (section === "dashboard") {
    return <Dashboard rows={data.dashboard_daily} language={language} copy={copy} />;
  }
  if (section === "stock") {
    return (
      <>
        <section className="mobile-subsection">
          <h2>{copy.categories}</h2>
          {!data.categories_available ? (
            <div className="mobile-notice">
              <AlertCircle size={18} />
              <span>{copy.categoriesUnavailable}</span>
            </div>
          ) : null}
          <RecordList rows={data.categories} language={language} copy={copy} query={query} />
        </section>
        <section className="mobile-subsection">
          <h2>{copy.stock}</h2>
          <RecordList rows={data.products} language={language} copy={copy} query={query} />
        </section>
      </>
    );
  }
  if (section === "clients") {
    return <RecordList rows={data.clients} language={language} copy={copy} query={query} />;
  }
  if (section === "history") {
    const saleRows = data.sales.map((row, index) => ({
      ...row,
      name: `${copy.sale} ${index + 1}`,
    }));
    const saleItemRows = data.sale_items.map((row, index) => ({
      ...row,
      name: `${copy.saleItems} ${index + 1}`,
    }));
    return (
      <>
        <div className="mobile-notice">
          <AlertCircle size={18} />
          <span>
            {data.sales_history_available
              ? copy.salesHistoryNote
              : copy.salesHistoryUnavailable}
          </span>
        </div>
        <section className="mobile-subsection">
          <h2>{copy.sales}</h2>
          <RecordList rows={saleRows} language={language} copy={copy} query={query} />
        </section>
        <section className="mobile-subsection">
          <h2>{copy.saleItems}</h2>
          <RecordList rows={saleItemRows} language={language} copy={copy} query={query} />
        </section>
        <section className="mobile-subsection">
          <h2>{copy.paymentRecords}</h2>
          <RecordList rows={data.payments} language={language} copy={copy} query={query} />
        </section>
      </>
    );
  }
  if (section === "services") {
    return (
      <>
        <section className="mobile-subsection">
          <h2>{copy.appointments}</h2>
          <RecordList rows={data.service_appointments} language={language} copy={copy} query={query} />
        </section>
        <section className="mobile-subsection">
          <h2>{copy.serviceCatalog}</h2>
          <RecordList rows={data.services} language={language} copy={copy} query={query} />
        </section>
      </>
    );
  }
  return (
    <>
      <section className="mobile-subsection">
        <h2>{copy.bills}</h2>
        <RecordList rows={data.bills} language={language} copy={copy} query={query} />
      </section>
      <section className="mobile-subsection">
        <h2>{copy.billPayments}</h2>
        <RecordList rows={data.bill_payments} language={language} copy={copy} query={query} />
      </section>
    </>
  );
}

export function MobilePosApp({
  language,
  onLanguageChange,
  onDeviceInvalid,
}: {
  language: MobileLanguage;
  onLanguageChange: (language: MobileLanguage) => void;
  onDeviceInvalid: () => void;
}) {
  const copy = COPY[language];
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [data, setData] = useState<MobileBundle | null>(null);
  const [section, setSection] = useState<Section>("menu");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [stale, setStale] = useState(false);
  const direction = language === "ar" ? "rtl" : "ltr";
  const allowedSections = SECTIONS.filter((item) => user?.permissions[item.permission]);
  const primarySections = allowedSections.filter((item) =>
    ["dashboard", "stock", "services"].includes(item.id),
  );
  const title = section === "menu" ? copy.menu : copy[section];
  const activeSection = SECTIONS.find((item) => item.id === section);
  const needsSearch = section === "stock" || section === "history" || section === "services" || section === "bills" || section === "clients";

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
    if (!lastUpdated) return;
    const timer = window.setInterval(() => {
      setStale(Date.now() - lastUpdated.getTime() > 15 * 60 * 1000);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [lastUpdated]);

  const applyResponse = (response: { user: MobileUser; data: MobileBundle }) => {
    setUser(response.user);
    setData(response.data);
    setLastUpdated(new Date());
    setStale(false);
    setNotice(null);
  };

  const signIn = async (username: string, password: string) => {
    const credential = localStorage.getItem("reda-mobile-device-credential");
    if (!credential) {
      onDeviceInvalid();
      throw new MobileApiError("device_revoked", 403);
    }
    const result = await loginMobile(credential, username, password);
    setSessionCode(result.session_code);
    applyResponse(result);
    setSection("menu");
  };

  const refresh = async () => {
    if (!sessionCode) return;
    setRefreshing(true);
    setNotice(null);
    try {
      applyResponse(await refreshMobile(sessionCode));
    } catch (error) {
      const code = errorCode(error);
      if (code === "device_revoked" || code === "mobile_access_disabled") {
        setSessionCode(null);
        setUser(null);
        setData(null);
        onDeviceInvalid();
        return;
      }
      if (code === "session_expired" || code === "user_inactive") {
        setSessionCode(null);
        setUser(null);
        setData(null);
        setNotice(errorMessage(error, copy));
      } else {
        setStale(true);
        setNotice(errorMessage(error, copy));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = async () => {
    if (sessionCode) {
      try {
        await logoutMobile(sessionCode);
      } catch {
        setNotice(copy.errors.logout_failed);
      }
    }
    setSessionCode(null);
    setUser(null);
    setData(null);
    setLastUpdated(null);
    setStale(false);
    setSection("menu");
    setQuery("");
  };

  const selectSection = (next: Section) => {
    if (next !== "menu" && !allowedSections.some((item) => item.id === next)) return;
    setSection(next);
    setQuery("");
  };

  const changeLanguage = (next: MobileLanguage) => {
    localStorage.setItem("reda-mobile-language", next);
    onLanguageChange(next);
  };

  return (
    <main className="mobile-shell mobile-app" dir={direction}>
      <header className="mobile-app-header">
        <div className="mobile-app-brand">
          <img src={`${import.meta.env.BASE_URL}myapp_black.ico`} alt="" />
          <div><strong>{copy.appName}</strong><span>{user?.username ?? copy.loginTitle}</span></div>
        </div>
        <div className="mobile-app-tools">
          <span className={`connection-state ${online ? "is-online" : "is-offline"}`} aria-label={online ? "Online" : "Offline"}>
            {online ? <Wifi size={17} /> : <WifiOff size={17} />}
          </span>
          {user ? (
            <button type="button" className="icon-button" aria-label={copy.logout} title={copy.logout} onClick={() => void signOut()}>
              <LogOut size={18} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="langs" role="group" aria-label="Language">
        <button type="button" className={language === "en" ? "on" : ""} onClick={() => changeLanguage("en")}>English</button>
        <button type="button" className={language === "fr" ? "on" : ""} onClick={() => changeLanguage("fr")}>Français</button>
        <button type="button" className={language === "ar" ? "on" : ""} onClick={() => changeLanguage("ar")}>العربية</button>
      </div>

      {notice ? <div className="mobile-state-banner error-banner" role="alert"><AlertCircle size={17} />{notice}</div> : null}

      {!user ? (
        <LoginScreen copy={copy} onLogin={signIn} />
      ) : (
        <>
          <div className="mobile-page-heading">
            <button type="button" className="icon-button back-button" aria-label={copy.menu} onClick={() => selectSection("menu")}>
              <ArrowLeft size={19} />
            </button>
            <div>
              <p>{copy.appName}</p>
              <h1>{title}</h1>
            </div>
            <button type="button" className="icon-button refresh-button" aria-label={refreshing ? copy.refreshing : copy.refresh} disabled={refreshing || !online} onClick={() => void refresh()}>
              {refreshing ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
            </button>
          </div>

          {!online ? <div className="mobile-state-banner offline-banner"><WifiOff size={17} />{copy.offline}</div> : null}
          {stale && online ? <div className="mobile-state-banner stale-banner"><AlertCircle size={17} />{copy.stale}</div> : null}
          {lastUpdated ? <p className="last-updated">{copy.lastUpdated}: {formatTime(lastUpdated, language)}</p> : null}

          {section === "menu" ? (
            <section className="mobile-menu-view">
              <p className="sub">{copy.welcome}</p>
              <div className="mobile-menu-grid">
                {allowedSections.map(({ id, icon: Icon }) => (
                  <button type="button" className="mobile-menu-tile" key={id} onClick={() => selectSection(id)}>
                    <span className="menu-tile-icon"><Icon size={22} /></span>
                    <span>{copy[id]}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
              {allowedSections.length === 0 ? <p className="mobile-empty">{copy.noPermission}</p> : null}
            </section>
          ) : activeSection && !user.permissions[activeSection.permission] ? (
            <p className="mobile-empty">{copy.noPermission}</p>
          ) : (
            <>
              {needsSearch ? (
                <label className="mobile-search">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
                </label>
              ) : null}
              {!data ? (
                <p className="mobile-empty"><LoaderCircle className="spin" size={18} />{copy.loading}</p>
              ) : (
                <SectionContent section={section as Exclude<Section, "menu">} data={data} language={language} copy={copy} query={query} />
              )}
            </>
          )}

          <nav className="mobile-bottom-nav" aria-label={copy.menu}>
            {primarySections.map(({ id, icon: Icon }) => (
              <button type="button" className={section === id ? "selected" : ""} key={id} onClick={() => selectSection(id)}>
                <Icon size={20} /><span>{copy[id]}</span>
              </button>
            ))}
            <button type="button" className={section === "menu" ? "selected" : ""} onClick={() => selectSection("menu")}>
              <Menu size={20} /><span>{copy.menu}</span>
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
