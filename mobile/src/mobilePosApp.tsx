import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  LogOut,
  Menu,
  Search,
  User,
  WifiOff,
} from "lucide-react";
import { Card } from "../../src/lib/components/card";
import { PreferencesMenu } from "../../src/lib/components/preferencesMenu";
import { DropdownMenuItem } from "../../src/lib/components/dropdownMenu";
import {
  MenuCardContent,
  PAGE_PRESENTATION,
  PageIcon,
  UserBadgeAvatar,
} from "../../src/lib/components/sharedPresentation";
import { LOGO_ICON, LOGO_ICON_DARK } from "../../src/lib/assets";
import { useTheme } from "../../src/lib/contexts/themeContext";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  loginMobile,
  logoutMobile,
  MobileApiError,
} from "./mobileApi";
import type {
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
  MobileRow,
  MobileUser,
} from "./mobileApi";
import { MobileDashboard } from "./components/MobileDashboard";
import { StockSection } from "./components/StockSection";

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
  returnLabel: string;
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
  onlineStatus: string;
  offlineStatus: string;
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
  settings: string;
  showPassword: string;
  hidePassword: string;
  overviewPeriod: string;
  today: string;
  thisMonth: string;
  thisYear: string;
  last365Days: string;
  inventory: string;
  totalQuantity: string;
  stockCost: string;
  products: string;
  outOfStock: string;
  clientsCount: string;
  serviceAppointments: string;
  completed: string;
  pending: string;
  overdue: string;
  searchRecords: string;
  categoryFilter: string;
  allCategories: string;
  sortBy: string;
  recentFirst: string;
  oldestFirst: string;
  nameAZ: string;
  nameZA: string;
  listView: string;
  cardView: string;
  chartStyle: string;
  netProfit: string;
  barChart: string;
  lineChart: string;
  active: string;
  notActive: string;
  dueSoon: string;
  page: string;
  of: string;
  previous: string;
  next: string;
  noCategories: string;
  allRecords: string;
  yes: string;
  no: string;
  errors: Record<string, string>;
  columnLabels: Record<string, string>;
};

const COPY: Record<MobileLanguage, Copy> = {
  en: {
    appName: "REDA TECH",
    loginTitle: "Sign in to your store",
    loginHelp: "Use your username and password.",
    username: "Username",
    password: "Password",
    login: "Sign in",
    signingIn: "Signing in…",
    menu: "Main menu",
    returnLabel: "Return",
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
    onlineStatus: "Online",
    offlineStatus: "Offline",
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
    settings: "Settings",
    showPassword: "Show password",
    hidePassword: "Hide password",
    overviewPeriod: "Summary period",
    today: "Today",
    thisMonth: "This month",
    thisYear: "This year",
    last365Days: "Last 365 days",
    inventory: "Inventory",
    totalQuantity: "Total quantity",
    stockCost: "Stock cost",
    products: "Products",
    outOfStock: "Out of stock",
    clientsCount: "Clients",
    serviceAppointments: "Service appointments",
    completed: "Completed",
    pending: "Pending",
    overdue: "Overdue",
    searchRecords: "Search records",
    categoryFilter: "Category",
    allCategories: "All categories",
    sortBy: "Sort by",
    recentFirst: "Newest first",
    oldestFirst: "Oldest first",
    nameAZ: "Name A–Z",
    nameZA: "Name Z–A",
    listView: "Compact list",
    cardView: "Cards",
    chartStyle: "Chart style",
    netProfit: "Net profit",
    barChart: "Bars",
    lineChart: "Line",
    active: "Active",
    notActive: "Not active",
    dueSoon: "Due soon",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    noCategories: "No categories available.",
    allRecords: "All",
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
      service_type: "Service type",
      is_completed: "Completed",
      duration: "Frequency",
      type: "Type",
      notes: "Notes",
      bought_price: "Purchase price",
      selling_price: "Sale price",
      cost_price: "Cost",
      service_price: "Service price",
      given_amount: "Paid",
      credit_amount: "Credit",
    },
  },
  fr: {
    appName: "REDA TECH",
    loginTitle: "Connexion à votre magasin",
    loginHelp: "Utilisez le nom d’utilisateur et le mot de passe.",
    username: "Nom d’utilisateur",
    password: "Mot de passe",
    login: "Se connecter",
    signingIn: "Connexion…",
    menu: "Menu principal",
    returnLabel: "Retour",
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
    onlineStatus: "En ligne",
    offlineStatus: "Hors ligne",
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
    settings: "Paramètres",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    overviewPeriod: "Période du résumé",
    today: "Aujourd’hui",
    thisMonth: "Ce mois",
    thisYear: "Cette année",
    last365Days: "365 derniers jours",
    inventory: "Stock",
    totalQuantity: "Quantité totale",
    stockCost: "Coût du stock",
    products: "Produits",
    outOfStock: "Rupture de stock",
    clientsCount: "Clients",
    serviceAppointments: "Rendez-vous de service",
    completed: "Terminé",
    pending: "En attente",
    overdue: "En retard",
    searchRecords: "Rechercher des enregistrements",
    categoryFilter: "Catégorie",
    allCategories: "Toutes les catégories",
    sortBy: "Trier par",
    recentFirst: "Plus récent",
    oldestFirst: "Plus ancien",
    nameAZ: "Nom A–Z",
    nameZA: "Nom Z–A",
    listView: "Liste compacte",
    cardView: "Cartes",
    chartStyle: "Type de graphique",
    netProfit: "Bénéfice net",
    barChart: "Barres",
    lineChart: "Ligne",
    active: "Actif",
    notActive: "Inactif",
    dueSoon: "Bientôt dû",
    page: "Page",
    of: "sur",
    previous: "Précédent",
    next: "Suivant",
    noCategories: "Aucune catégorie disponible.",
    allRecords: "Tous",
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
      service_type: "Type de service",
      is_completed: "Terminé",
      duration: "Fréquence",
      type: "Type",
      notes: "Notes",
      bought_price: "Prix d’achat",
      selling_price: "Prix de vente",
      cost_price: "Coût",
      service_price: "Prix du service",
      given_amount: "Payé",
      credit_amount: "Crédit",
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
    returnLabel: "عودة",
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
    onlineStatus: "متصل",
    offlineStatus: "غير متصل",
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
    settings: "الإعدادات",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    overviewPeriod: "فترة الملخص",
    today: "اليوم",
    thisMonth: "هذا الشهر",
    thisYear: "هذه السنة",
    last365Days: "آخر 365 يوماً",
    inventory: "المخزون",
    totalQuantity: "الكمية الإجمالية",
    stockCost: "تكلفة المخزون",
    products: "المنتجات",
    outOfStock: "نفد المخزون",
    clientsCount: "العملاء",
    serviceAppointments: "مواعيد الخدمة",
    completed: "مكتمل",
    pending: "قيد الانتظار",
    overdue: "متأخر",
    searchRecords: "بحث في السجلات",
    categoryFilter: "الفئة",
    allCategories: "كل الفئات",
    sortBy: "ترتيب حسب",
    recentFirst: "الأحدث أولاً",
    oldestFirst: "الأقدم أولاً",
    nameAZ: "الاسم أ–ي",
    nameZA: "الاسم ي–أ",
    listView: "قائمة مختصرة",
    cardView: "بطاقات",
    chartStyle: "نوع المخطط",
    netProfit: "الربح الصافي",
    barChart: "أعمدة",
    lineChart: "خط",
    active: "نشط",
    notActive: "غير نشط",
    dueSoon: "قريب الاستحقاق",
    page: "صفحة",
    of: "من",
    previous: "السابق",
    next: "التالي",
    noCategories: "لا توجد فئات متاحة.",
    allRecords: "الكل",
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
      service_type: "نوع الخدمة",
      is_completed: "مكتمل",
      duration: "التكرار",
      type: "النوع",
      notes: "ملاحظات",
      bought_price: "سعر الشراء",
      selling_price: "سعر البيع",
      cost_price: "التكلفة",
      service_price: "سعر الخدمة",
      given_amount: "المدفوع",
      credit_amount: "الدين",
    },
  },
};

const SECTIONS: Array<{
  id: Exclude<Section, "menu">;
  permission: keyof MobilePermissions;
}> = [
  { id: "dashboard", permission: "can_access_dashboard" },
  { id: "stock", permission: "can_access_stock" },
  { id: "history", permission: "can_access_history" },
  { id: "services", permission: "can_access_services" },
  { id: "bills", permission: "can_access_bills" },
  { id: "clients", permission: "can_access_clients" },
];

function errorMessage(error: unknown, copy: Copy): string {
  const code = error instanceof MobileApiError ? error.code : "request_failed";
  return copy.errors[code] ?? copy.errors.request_failed;
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
    .filter(([key]) => !/(^id$|_id$|_source_id$|^customer_id$|sync_version|source_updated_at|deleted_at)/i.test(key))
    .filter(([, value]) => value == null || ["string", "number", "boolean"].includes(typeof value))
    .filter(([, value]) => value !== null && value !== "");
}

function searchable(row: MobileRow): string {
  return safeFields(row)
    .map(([, value]) => String(value ?? ""))
    .join(" ")
    .toLocaleLowerCase();
}

function recordStatus(row: MobileRow, copy: Copy): string | null {
  if (typeof row.is_completed === "boolean") {
    if (row.is_completed) return copy.completed;
    const dueDate = typeof row.due_date === "string" ? Date.parse(row.due_date) : NaN;
    return Number.isFinite(dueDate) && dueDate < Date.now() ? copy.overdue : copy.pending;
  }
  if (row.duration === "NO_NEXT") return copy.notActive;
  if (typeof row.next_bill_date !== "string") return null;
  const nextBillDate = Date.parse(row.next_bill_date);
  if (!Number.isFinite(nextBillDate)) return null;
  if (nextBillDate < Date.now()) return copy.overdue;
  if (nextBillDate - Date.now() <= 7 * 24 * 60 * 60 * 1000) return copy.dueSoon;
  return copy.active;
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
  language,
  onLanguageChange,
}: {
  copy: Copy;
  onLogin: (username: string, password: string) => Promise<void>;
  language: MobileLanguage;
  onLanguageChange: (language: MobileLanguage) => void;
}) {
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <section className="mobile-login-screen">
      <div className="mobile-login-brand">
        <img src={theme === "dark" ? LOGO_ICON : LOGO_ICON_DARK} alt="REDA TECH" />
        <h1>{copy.loginTitle}</h1>
        <p className="sub">{copy.loginHelp}</p>
      </div>
      <Card className="mobile-login">
        <form className="mobile-login-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>{copy.username}</span>
            <div className="mobile-input-wrap">
              <User size={18} aria-hidden="true" />
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </label>
          <label>
            <span>{copy.password}</span>
            <div className="mobile-input-wrap">
              <Lock size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error ? <p className="msg err" role="alert"><AlertCircle size={17} />{error}</p> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={18} /> : null}
            {busy ? copy.signingIn : copy.login}
          </button>
        </form>
      </Card>
    </section>
  );
}

function RecordList({
  rows,
  language,
  copy,
  query,
  emptyLabel,
  rowLimit = 20,
  moneyDivisor = 1,
}: {
  rows: MobileRow[];
  language: MobileLanguage;
  copy: Copy;
  query: string;
  emptyLabel?: string;
  rowLimit?: number;
  moneyDivisor?: number;
}) {
  const [sort, setSort] = useState<"recent" | "oldest" | "az" | "za">("recent");
  const [page, setPage] = useState(1);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const filtered = term ? rows.filter((row) => searchable(row).includes(term)) : rows;
    return [...filtered].sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const left = String(a.name ?? a.title ?? a.local_day ?? "");
        const right = String(b.name ?? b.title ?? b.local_day ?? "");
        return sort === "az" ? left.localeCompare(right) : right.localeCompare(left);
      }
      const left = String(a.source_created_at ?? a.created_at ?? a.due_date ?? a.paid_date ?? a.local_day ?? "");
      const right = String(b.source_created_at ?? b.created_at ?? b.due_date ?? b.paid_date ?? b.local_day ?? "");
      return sort === "recent" ? right.localeCompare(left) : left.localeCompare(right);
    });
  }, [query, rows, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowLimit));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * rowLimit, currentPage * rowLimit);
  const tableColumns = useMemo(
    () => Array.from(new Set(filteredRows.flatMap((row) => safeFields(row).map(([key]) => key)))),
    [filteredRows],
  );

  if (filteredRows.length === 0) {
    return <p className="mobile-empty">{emptyLabel ?? copy.empty}</p>;
  }

  return (
    <div className="mobile-records">
      <div className="mobile-record-controls">
        <label className="mobile-select-control">
          <span>{copy.sortBy}</span>
          <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); setPage(1); }}>
            <option value="recent">{copy.recentFirst}</option>
            <option value="oldest">{copy.oldestFirst}</option>
            <option value="az">{copy.nameAZ}</option>
            <option value="za">{copy.nameZA}</option>
          </select>
        </label>
      </div>
      <div className="mobile-record-table-wrap">
        <table className="mobile-record-table">
          <thead>
            <tr>{tableColumns.map((key) => <th key={key}>{fieldLabel(key, copy)}</th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const fields = new Map(safeFields(row));
              return (
                <tr key={String(row.source_id ?? row.id ?? index)}>
                  {tableColumns.map((key) => {
                    const value = fields.get(key);
                    const status = recordStatus(row, copy);
                    return (
                      <td key={key} data-label={fieldLabel(key, copy)}>
                        {typeof value === "number" && key === "amount" && moneyDivisor !== 1
                          ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value / moneyDivisor)} DA`
                          : safeValue(value, language, copy)}
                        {key === "is_completed" && status ? (
                          <span className={`record-status ${status === copy.completed ? "done" : status === copy.overdue ? "late" : "waiting"}`}>
                            {status}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="mobile-pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{copy.previous}</button>
          <span>{copy.page} {currentPage} {copy.of} {pageCount}</span>
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>{copy.next}</button>
        </div>
      ) : null}
    </div>
  );
}

function SectionContent({
  section,
  data,
  language,
  copy,
  query,
  onQueryChange,
  permissions,
}: {
  section: Exclude<Section, "menu">;
  data: MobileBundle;
  language: MobileLanguage;
  copy: Copy;
  query: string;
  onQueryChange: (query: string) => void;
  permissions: MobilePermissions;
}) {
  const [serviceFilter, setServiceFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  if (section === "dashboard") {
    return (
      <MobileDashboard
        data={data}
        permissions={permissions}
        language={language}
        labels={{
          dashboard: copy.dashboard,
          overviewPeriod: copy.overviewPeriod,
          today: copy.today,
          thisMonth: copy.thisMonth,
          thisYear: copy.thisYear,
          last365Days: copy.last365Days,
          revenue: copy.revenue,
          profit: copy.profit,
          items: copy.items,
          products: copy.products,
          inventory: copy.inventory,
          totalQuantity: copy.totalQuantity,
          stockCost: copy.stockCost,
          outOfStock: copy.outOfStock,
          clientsCount: copy.clientsCount,
          serviceAppointments: copy.serviceAppointments,
          completed: copy.completed,
          overdue: copy.overdue,
          chartStyle: copy.chartStyle,
          barChart: copy.barChart,
          lineChart: copy.lineChart,
          recentDays: copy.recentDays,
          empty: copy.empty,
          billPayments: copy.billPayments,
          netProfit: copy.netProfit,
        }}
      />
    );
  }
  if (section === "stock") {
    return <StockSection data={data} language={language} query={query} onQueryChange={onQueryChange} />;
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
    const appointments = data.service_appointments.filter((row) => {
      if (serviceFilter === "completed") return row.is_completed === true;
      if (serviceFilter === "pending") return row.is_completed === false;
      if (serviceFilter === "overdue") {
        return row.is_completed !== true && typeof row.due_date === "string" && Date.parse(row.due_date) < Date.now();
      }
      return true;
    });
    return (
      <>
        <section className="mobile-subsection">
          <h2>{copy.appointments}</h2>
          <label className="mobile-select-control filter-control">
            <span>{copy.sortBy}</span>
            <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as typeof serviceFilter)}>
              <option value="all">{copy.allRecords}</option>
              <option value="pending">{copy.pending}</option>
              <option value="completed">{copy.completed}</option>
              <option value="overdue">{copy.overdue}</option>
            </select>
          </label>
          <RecordList rows={appointments} language={language} copy={copy} query={query} />
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
        <RecordList rows={data.bills} language={language} copy={copy} query={query} moneyDivisor={100} />
      </section>
      <section className="mobile-subsection">
        <h2>{copy.billPayments}</h2>
        <RecordList rows={data.bill_payments} language={language} copy={copy} query={query} moneyDivisor={100} />
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
  const activePage = activeSection?.id ?? "home";
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
      {user ? (
        <>
          <header className="mobile-app-header">
            <div className="mobile-user-badge" title={user.username}>
              <UserBadgeAvatar
                className="mobile-user-badge-avatar"
                isAdmin={user.role.toUpperCase() === "ADMIN"}
                size="sm"
              />
              <span>{user.username}<small>{user.role}</small></span>
            </div>
            <h1>
              <PageIcon page={activePage} className="mobile-header-page-icon" aria-hidden="true" />
              <span>{title}</span>
            </h1>
            <PreferencesMenu
              language={language}
              onLanguageChange={changeLanguage}
              placement="anchor"
              showTooltipToggle={false}
              className="mobile-preferences-header"
            >
              <div className="mobile-settings-extra">
                <div className="mobile-settings-actions">
                  <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
                    <button type="button" className="mobile-settings-action logout-button" onClick={() => void signOut()}>
                      <LogOut size={17} />{copy.logout}
                    </button>
                  </DropdownMenuItem>
                </div>
              </div>
            </PreferencesMenu>
          </header>
        </>
      ) : (
        <>
          <PreferencesMenu language={language} onLanguageChange={changeLanguage} className="mobile-login-preferences" forceRight showTooltipToggle={false} />
        </>
      )}
      {notice ? <div className="mobile-state-banner error-banner" role="alert"><AlertCircle size={17} />{notice}</div> : null}

      {!user ? (
        <LoginScreen copy={copy} onLogin={signIn} language={language} onLanguageChange={changeLanguage} />
      ) : (
        <>
          {!online ? <div className="mobile-state-banner offline-banner"><WifiOff size={17} />{copy.offline}</div> : null}
          {stale && online ? <div className="mobile-state-banner stale-banner"><AlertCircle size={17} />{copy.stale}</div> : null}
          {section !== "menu" || lastUpdated ? (
            <div className="mb-3 flex items-center justify-between gap-3">
              {section !== "menu" ? (
                <button
                  type="button"
                  className="back-button !mb-0 flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm font-medium"
                  onClick={() => selectSection("menu")}
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                  <span>{copy.returnLabel}</span>
                </button>
              ) : <span />}
              {lastUpdated ? <p className="last-updated !mb-0">{copy.lastUpdated}: {formatTime(lastUpdated, language)}</p> : null}
            </div>
          ) : null}

          {section === "menu" ? (
            <section className="mobile-menu-view">
              <p className="sub">{copy.welcome}</p>
              <div className="mobile-menu-grid">
                {allowedSections.map(({ id }) => (
                  <button type="button" className="mobile-menu-tile group" key={id} onClick={() => selectSection(id)}>
                    <MenuCardContent page={id} title={copy[id]} compact />
                  </button>
                ))}
              </div>
              {allowedSections.length === 0 ? <p className="mobile-empty">{copy.noPermission}</p> : null}
            </section>
          ) : activeSection && !user.permissions[activeSection.permission] ? (
            <p className="mobile-empty">{copy.noPermission}</p>
          ) : (
            <>
              {needsSearch && section !== "stock" ? (
                <label className="mobile-search">
                  <Search size={18} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchRecords} aria-label={copy.searchRecords} />
                </label>
              ) : null}
              {!data ? (
                <p className="mobile-empty"><LoaderCircle className="spin" size={18} />{copy.loading}</p>
              ) : (
                section === "dashboard" ? (
                  <SectionContent
                    section="dashboard"
                    data={data}
                    language={language}
                    copy={copy}
                    query={query}
                    onQueryChange={setQuery}
                    permissions={user.permissions}
                  />
                ) : (
                  <Card className="mobile-page-panel">
                    <div className="mobile-panel-heading">
                      <PageIcon page={activePage} size={28} />
                      <h2>{title}</h2>
                    </div>
                    <SectionContent
                      section={section as Exclude<Section, "menu">}
                      data={data}
                      language={language}
                      copy={copy}
                      query={query}
                      onQueryChange={setQuery}
                      permissions={user.permissions}
                    />
                  </Card>
                )
              )}
            </>
          )}

          <nav
            className="mobile-bottom-nav"
            aria-label={copy.menu}
            style={{ gridTemplateColumns: `repeat(${primarySections.length + 1}, minmax(0, 1fr))` }}
          >
            {primarySections.map(({ id }) => (
              <button
                type="button"
                className={section === id ? `selected ${PAGE_PRESENTATION[id].color}` : ""}
                key={id}
                onClick={() => selectSection(id)}
              >
                <PageIcon page={id} size={20} /><span>{copy[id]}</span>
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
