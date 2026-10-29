import { useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, Search, ShoppingCart, Users, Wrench, X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
  MobileRow,
} from "../mobileApi";

type LabelKey =
  | "search"
  | "filters"
  | "clearFilters"
  | "sort"
  | "desktopDefault"
  | "pageSize"
  | "view"
  | "close"
  | "page"
  | "of"
  | "previous"
  | "next"
  | "newest"
  | "oldest"
  | "nameAZ"
  | "sortCreditsVersements"
  | "sortTotalPurchases"
  | "totalPurchases"
  | "totalSpent"
  | "totalSales"
  | "salesHistory"
  | "paymentsHistory"
  | "servicesHistory"
  | "noServices"
  | "showMore"
  | "showLess"
  | "more"
  | "totalCredit"
  | "totalCredits"
  | "totalVersement"
  | "totalVersements"
  | "services"
  | "purchasesUnavailable"
  | "sortNotes"
  | "empty"
  | "name"
  | "phone"
  | "address"
  | "notes"
  | "created"
  | "clients"
  | "payments"
  | "allPaymentsTab"
  | "viewInPayments"
  | "credits"
  | "versements"
  | "paid"
  | "unpaid"
  | "paymentStatus"
  | "paymentSearch"
  | "totalPayments"
  | "totalAmount"
  | "paidAmount"
  | "outstandingAmount"
  | "overdueAmount"
  | "sales"
  | "paymentType"
  | "amount"
  | "givenAmount"
  | "creditAmount"
  | "reason"
  | "dueDate"
  | "paidDate"
  | "saleDate"
  | "saleTotal"
  | "saleItems"
  | "historyUnavailable"
  | "noPayments"
  | "noSales"
  | "totalsUnavailable"
  | "title"
  | "type"
  | "status"
  | "active"
  | "inactive"
  | "dueSoon"
  | "overdue"
  | "noNextPayment"
  | "lastPayment"
  | "nextPayment"
  | "duration"
  | "description"
  | "deviceName"
  | "totalBills"
  | "activeBills"
  | "inactiveBills"
  | "totalPaid"
  | "allTypes"
  | "allStatuses"
  | "dueFilter"
  | "recurring"
  | "oneTime"
  | "appointments"
  | "catalog"
  | "serviceTypes"
  | "completed"
  | "incomplete"
  | "pending"
  | "client"
  | "price"
  | "completedAt"
  | "cost"
  | "serviceValue"
  | "totalServices"
  | "totalCost"
  | "totalValue"
  | "all"
  | "from"
  | "to"
  | "noClient"
  | "clientUnavailable"
  | "linkedPaymentUnavailable"
  | "catalogEmpty"
  | "typeCount"
  | "revenue"
  | "quantity"
  | "limitNotice"
  | "limitedClients"
  | "limitedPayments"
  | "limitedSales"
  | "limitedBills"
  | "limitedBillPayments"
  | "limitedAppointments"
  | "limitedCatalog"
  | "billPayments"
  | "billUnavailable"
  | "itemUnavailable"
  | "average"
  | "profit"
  | "showProfit"
  | "completionRate"
  | "incompleteServices"
  | "dueSoonThresholdNote";


const LABELS: Record<MobileLanguage, Record<LabelKey, string>> = {
  en: {
    search: "Search", filters: "Filters", clearFilters: "Clear filters", sort: "Sort by", desktopDefault: "Desktop default", pageSize: "Rows per page", view: "View",
    close: "Close", page: "Page", of: "of", previous: "Previous", next: "Next",
    newest: "Newest first", oldest: "Oldest first", nameAZ: "Name A–Z",
    sortCreditsVersements: "Credits / versements (default)", sortTotalPurchases: "Total purchases", totalPurchases: "Total purchases", totalSpent: "Total spent", totalSales: "Total sales", salesHistory: "Sales history", paymentsHistory: "Payments history", servicesHistory: "Services history", noServices: "No service history is available for this client.", showMore: "Show more", showLess: "Show less", more: "more", totalCredit: "Total credit", totalCredits: "Total credits", totalVersement: "Total versement", totalVersements: "Total versements", services: "Services", purchasesUnavailable: "Purchase totals are not shown in this view.", sortNotes: "Clients with notes first",
    empty: "No records match these filters.", name: "Name", phone: "Phone",
    address: "Address", notes: "Notes", created: "Added", clients: "Clients",
    payments: "Payments", allPaymentsTab: "All payments", viewInPayments: "View in payments", credits: "Credits", versements: "Versements", paid: "Paid", unpaid: "Unpaid", paymentStatus: "Status", paymentSearch: "Search client, phone or reason...", totalPayments: "Total payments", totalAmount: "Total amount", paidAmount: "Paid amount", outstandingAmount: "Outstanding", overdueAmount: "Overdue", sales: "Sales", paymentType: "Type", amount: "Amount",
    givenAmount: "Given amount", creditAmount: "Credit amount", reason: "Reason",
    dueDate: "Due date", paidDate: "Paid date", saleDate: "Sale date",
    saleTotal: "Sale total", saleItems: "Sale items",
    historyUnavailable: "Related history is not available in the current PWA data.",
    noPayments: "No linked payment records are available.",
    noSales: "No linked sales are available in the current PWA data.",
    totalsUnavailable: "Desktop purchase, credit, and versement totals are not included in the PWA data.",
    title: "Title", type: "Type", status: "Status", active: "Active", inactive: "Not active",
    dueSoon: "Due soon", overdue: "Overdue", noNextPayment: "No next payment",
    lastPayment: "Last payment", nextPayment: "Next payment", duration: "Frequency",
    description: "Description", deviceName: "Device name", totalBills: "Bills", activeBills: "Active bills",
    inactiveBills: "Inactive bills", totalPaid: "Total Paid",
    allTypes: "All types", allStatuses: "All statuses", recurring: "Recurring",
    dueFilter: "Due status",
    oneTime: "One-time", appointments: "Service requests", catalog: "Service catalog",
    serviceTypes: "Service type summary", completed: "Complete", incomplete: "Incomplete",
    pending: "Pending", client: "Client", price: "Service price", completedAt: "Completed",
    cost: "Cost", serviceValue: "Service value", totalServices: "Services",
    totalCost: "Total cost", totalValue: "Total value", all: "All",
    noClient: "No client assigned", clientUnavailable: "Client information is not available to this user.",
    linkedPaymentUnavailable: "Appointment payment status and linked sale details are not included in the PWA data.",
    catalogEmpty: "No service catalog records are available.", typeCount: "Requests",
    from: "From", to: "To",
    revenue: "Revenue", quantity: "Quantity", limitNotice: "The PWA data limit was reached; totals and history include only records currently available.",
    limitedClients: "Client list", limitedPayments: "Payment history", limitedSales: "Sales history",
    limitedBills: "Bill list", limitedBillPayments: "Bill payment history",
    limitedAppointments: "Service requests", limitedCatalog: "Service catalog",
    billPayments: "Bill payment history", billUnavailable: "Bill details unavailable",
    itemUnavailable: "Item details unavailable", average: "average", profit: "Profit", showProfit: "Show profit",
    completionRate: "Completion rate", incompleteServices: "Incomplete",
    dueSoonThresholdNote: "Due-soon uses the 2-day default; the desktop threshold setting is not synced to the PWA.",
  },
  fr: {
    search: "Rechercher", filters: "Filtres", clearFilters: "Effacer les filtres", sort: "Trier par", desktopDefault: "Ordre du bureau", pageSize: "Lignes par page", view: "Voir",
    close: "Fermer", page: "Page", of: "sur", previous: "Précédent", next: "Suivant",
    newest: "Plus récent", oldest: "Plus ancien", nameAZ: "Nom A–Z",
    sortCreditsVersements: "Crédits / versements (défaut)", sortTotalPurchases: "Total des achats", totalPurchases: "Total des achats", totalSpent: "Total dépensé", totalSales: "Total des ventes", salesHistory: "Historique des ventes", paymentsHistory: "Historique des paiements", servicesHistory: "Historique des services", noServices: "Aucun historique de service disponible pour ce client.", showMore: "Afficher plus", showLess: "Afficher moins", more: "de plus", totalCredit: "Total crédit", totalCredits: "Total des crédits", totalVersement: "Total versement", totalVersements: "Total des versements", services: "Services", purchasesUnavailable: "Le total des achats n’est pas affiché dans cette vue.", sortNotes: "Clients avec notes en premier",
    empty: "Aucun résultat pour ces filtres.", name: "Nom", phone: "Téléphone",
    address: "Adresse", notes: "Notes", created: "Ajouté", clients: "Clients",
    payments: "Paiements", allPaymentsTab: "Tous les paiements", viewInPayments: "Voir dans les paiements", credits: "Crédits", versements: "Versements", paid: "Payé", unpaid: "Impayé", paymentStatus: "Statut", paymentSearch: "Rechercher client, téléphone ou motif...", totalPayments: "Nombre de paiements", totalAmount: "Montant total", paidAmount: "Montant payé", outstandingAmount: "Restant dû", overdueAmount: "En retard", sales: "Ventes", paymentType: "Type", amount: "Montant",
    givenAmount: "Montant versé", creditAmount: "Montant du crédit", reason: "Motif",
    dueDate: "Échéance", paidDate: "Date de paiement", saleDate: "Date de vente",
    saleTotal: "Total de la vente", saleItems: "Articles de vente",
    historyUnavailable: "L’historique associé n’est pas disponible dans les données PWA actuelles.",
    noPayments: "Aucun paiement lié n’est disponible.",
    noSales: "Aucune vente liée n’est disponible dans les données PWA actuelles.",
    totalsUnavailable: "Les totaux des achats, crédits et versements du bureau ne sont pas inclus dans les données PWA.",
    title: "Titre", type: "Type", status: "Statut", active: "Active", inactive: "Inactive",
    dueSoon: "Bientôt due", overdue: "En retard", noNextPayment: "Aucun prochain paiement",
    lastPayment: "Dernier paiement", nextPayment: "Prochain paiement", duration: "Fréquence",
    description: "Description", deviceName: "Nom de l’appareil", totalBills: "Factures", activeBills: "Factures actives",
    inactiveBills: "Factures inactives", totalPaid: "Total payé",
    allTypes: "Tous les types", allStatuses: "Tous les statuts", recurring: "Récurrente",
    dueFilter: "Échéance",
    oneTime: "Unique", appointments: "Demandes de service", catalog: "Catalogue des services",
    serviceTypes: "Résumé par type de service", completed: "Terminée", incomplete: "Incomplète",
    pending: "En attente", client: "Client", price: "Prix du service", completedAt: "Terminée le",
    cost: "Coût", serviceValue: "Valeur du service", totalServices: "Services",
    totalCost: "Coût total", totalValue: "Valeur totale", all: "Tout",
    noClient: "Aucun client associé", clientUnavailable: "Les informations du client ne sont pas accessibles à cet utilisateur.",
    linkedPaymentUnavailable: "Le statut de paiement et les détails de vente liés au rendez-vous ne sont pas inclus dans les données PWA.",
    catalogEmpty: "Aucun service du catalogue disponible.", typeCount: "Demandes",
    from: "Du", to: "Au",
    revenue: "Revenu", quantity: "Quantité", limitNotice: "La limite de données PWA est atteinte ; les totaux et historiques couvrent uniquement les données disponibles.",
    limitedClients: "Liste des clients", limitedPayments: "Historique des paiements",
    limitedSales: "Historique des ventes", limitedBills: "Liste des factures",
    limitedBillPayments: "Historique des paiements de factures",
    limitedAppointments: "Demandes de service", limitedCatalog: "Catalogue des services",
    billPayments: "Historique des paiements de factures", billUnavailable: "Détails de la facture indisponibles",
    itemUnavailable: "Détails de l’article indisponibles", average: "moy.", profit: "Bénéfice", showProfit: "Afficher le bénéfice",
    completionRate: "Taux de réalisation", incompleteServices: "Incomplets",
    dueSoonThresholdNote: "L’échéance proche utilise la valeur par défaut de 2 jours ; le réglage du bureau n’est pas synchronisé.",
  },
  ar: {
    search: "بحث", filters: "عوامل التصفية", clearFilters: "مسح عوامل التصفية", sort: "ترتيب حسب", desktopDefault: "ترتيب سطح المكتب", pageSize: "عدد الصفوف", view: "عرض",
    close: "إغلاق", page: "صفحة", of: "من", previous: "السابق", next: "التالي",
    newest: "الأحدث أولاً", oldest: "الأقدم أولاً", nameAZ: "الاسم أ–ي",
    sortCreditsVersements: "الائتمان / الدفعات (افتراضي)", sortTotalPurchases: "إجمالي المشتريات", totalPurchases: "إجمالي المشتريات", totalSpent: "إجمالي الإنفاق", totalSales: "إجمالي المبيعات", salesHistory: "سجل المبيعات", paymentsHistory: "سجل الدفعات", servicesHistory: "سجل الخدمات", noServices: "لا يوجد سجل خدمات متاح لهذا العميل.", showMore: "عرض المزيد", showLess: "عرض أقل", more: "أخرى", totalCredit: "إجمالي الائتمان", totalCredits: "إجمالي الائتمانات", totalVersement: "إجمالي الدفعات", totalVersements: "إجمالي الدفعات", services: "الخدمات", purchasesUnavailable: "إجمالي المشتريات غير معروض في هذه الشاشة.", sortNotes: "العملاء الذين لديهم ملاحظات أولاً",
    empty: "لا توجد سجلات تطابق عوامل التصفية.", name: "الاسم", phone: "الهاتف",
    address: "العنوان", notes: "ملاحظات", created: "تاريخ الإضافة", clients: "العملاء",
    payments: "الدفعات", allPaymentsTab: "كل الدفعات", viewInPayments: "عرض في الدفعات", credits: "الائتمانات", versements: "الدفعات المستحقة", paid: "مدفوع", unpaid: "غير مدفوع", paymentStatus: "الحالة", paymentSearch: "ابحث باسم العميل أو الهاتف أو السبب...", totalPayments: "عدد الدفعات", totalAmount: "المبلغ الإجمالي", paidAmount: "المبلغ المدفوع", outstandingAmount: "المبلغ المتبقي", overdueAmount: "متأخر", sales: "المبيعات", paymentType: "النوع", amount: "المبلغ",
    givenAmount: "المبلغ المدفوع", creditAmount: "مبلغ الائتمان", reason: "السبب",
    dueDate: "تاريخ الاستحقاق", paidDate: "تاريخ الدفع", saleDate: "تاريخ البيع",
    saleTotal: "إجمالي البيع", saleItems: "عناصر البيع",
    historyUnavailable: "السجل المرتبط غير متاح في بيانات التطبيق الحالية.",
    noPayments: "لا توجد دفعات مرتبطة متاحة.",
    noSales: "لا توجد مبيعات مرتبطة في بيانات التطبيق الحالية.",
    totalsUnavailable: "إجماليات المشتريات والائتمان والدفعات من سطح المكتب غير موجودة في بيانات التطبيق.",
    title: "العنوان", type: "النوع", status: "الحالة", active: "نشطة", inactive: "غير نشطة",
    dueSoon: "مستحقة قريباً", overdue: "متأخرة", noNextPayment: "لا يوجد دفع قادم",
    lastPayment: "آخر دفعة", nextPayment: "الدفعة القادمة", duration: "التكرار",
    description: "الوصف", deviceName: "اسم الجهاز", totalBills: "الفواتير", activeBills: "الفواتير النشطة",
    inactiveBills: "الفواتير غير النشطة", totalPaid: "إجمالي المدفوع",
    allTypes: "كل الأنواع", allStatuses: "كل الحالات", recurring: "متكررة",
    dueFilter: "حالة الاستحقاق",
    oneTime: "مرة واحدة", appointments: "طلبات الخدمة", catalog: "دليل الخدمات",
    serviceTypes: "ملخص أنواع الخدمة", completed: "مكتملة", incomplete: "غير مكتملة",
    pending: "قيد الانتظار", client: "العميل", price: "سعر الخدمة", completedAt: "تاريخ الإكمال",
    cost: "التكلفة", serviceValue: "قيمة الخدمة", totalServices: "الخدمات",
    totalCost: "إجمالي التكلفة", totalValue: "إجمالي القيمة", all: "الكل",
    noClient: "لا يوجد عميل مرتبط", clientUnavailable: "بيانات العميل غير متاحة لهذا المستخدم.",
    linkedPaymentUnavailable: "حالة دفع الموعد وتفاصيل البيع المرتبط غير موجودة في بيانات التطبيق.",
    catalogEmpty: "لا توجد خدمات متاحة في الدليل.", typeCount: "الطلبات",
    from: "من", to: "إلى",
    revenue: "الإيرادات", quantity: "الكمية", limitNotice: "تم بلوغ حد بيانات التطبيق؛ تشمل الإجماليات والسجلات البيانات المتاحة فقط.",
    limitedClients: "قائمة العملاء", limitedPayments: "سجل الدفعات",
    limitedSales: "سجل المبيعات", limitedBills: "قائمة الفواتير",
    limitedBillPayments: "سجل دفعات الفواتير",
    limitedAppointments: "طلبات الخدمة", limitedCatalog: "دليل الخدمات",
    billPayments: "سجل دفعات الفواتير", billUnavailable: "تفاصيل الفاتورة غير متاحة",
    itemUnavailable: "تفاصيل العنصر غير متاحة", average: "متوسط", profit: "الربح", showProfit: "إظهار الربح",
    completionRate: "معدل الإنجاز", incompleteServices: "غير مكتملة",
    dueSoonThresholdNote: "تستخدم حالة الاستحقاق القريب القيمة الافتراضية يومين؛ إعداد سطح المكتب غير متزامن مع التطبيق.",
  },
};

const valueText = (row: MobileRow, key: string): string => {
  const value = row[key];
  return typeof value === "string" ? value : "";
};
const valueNumber = (row: MobileRow, key: string): number => {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};
const dateValue = (row: MobileRow, key: string): number => {
  const raw = valueText(row, key);
  const parsed = raw ? Date.parse(raw) : NaN;
  return parsed;
};
const sortTime = (row: MobileRow, key: string): number => {
  const parsed = dateValue(row, key);
  return Number.isFinite(parsed) ? parsed : 0;
};
const localDayStart = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

function displayDate(value: string, language: MobileLanguage, withTime = false): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function displayMoney(value: number, language: MobileLanguage, divisor = 1): string {
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value / divisor)} DA`;
}

function matchesQuery(row: MobileRow, query: string, keys: string[]): boolean {
  const term = query.trim().toLocaleLowerCase();
  return !term || keys.some((key) => valueText(row, key).toLocaleLowerCase().includes(term));
}

type Column<T> = { key: string; label: string; render: (row: T) => ReactNode; align?: "start" | "end" };
type SortOption<T> = { id: string; label: string; compare: (a: T, b: T) => number };

function StockStyleTable<T extends MobileRow>({
  rows,
  columns,
  sorts,
  empty,
  pageSizeLabel,
  labels,
  ariaLabel,
  footer,
  toolbar,
  minWidth,
  stickyFirstColumn = false,
  initialSortId,
  initialPageSize = 7,
  pageSizes = [7, 10, 20, 50, 100],
}: {
  rows: T[];
  columns: Column<T>[];
  sorts: SortOption<T>[];
  empty: string;
  pageSizeLabel: string;
  labels: Record<LabelKey, string>;
  ariaLabel: string;
  footer?: ReactNode;
  toolbar?: ReactNode;
  minWidth: number;
  stickyFirstColumn?: boolean;
  initialSortId?: string;
  initialPageSize?: number;
  pageSizes?: number[];
}) {
  const [sortId, setSortId] = useState(initialSortId ?? sorts[0]?.id ?? "");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [tableScrolled, setTableScrolled] = useState(false);
  const sortedRows = useMemo(() => {
    const option = sorts.find((item) => item.id === sortId);
    return option ? [...rows].sort(option.compare) : rows;
  }, [rows, sortId, sorts]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setPage(1), [rows, pageSize, sortId]);
  useEffect(() => { setSortId(initialSortId ?? sorts[0]?.id ?? ""); }, [initialSortId]);

  return (
    <>
      <div className="stock-filter-row">
        <label className="mobile-select-control stock-filter-sort">
          <span>{labels.sort}</span>
          <select value={sortId} onChange={(event) => { setSortId(event.target.value); setPage(1); }}>
            {sorts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="mobile-select-control stock-filter-pagesize">
          <span>{pageSizeLabel}</span>
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      {toolbar ? <div className="stock-table-toolbar">{toolbar}</div> : null}
      {rows.length === 0 ? <p className="mobile-empty">{empty}</p> : (
        <div className={"stock-table-scroll" + (stickyFirstColumn ? " mobile-services-table-scroll" + (tableScrolled ? " is-horizontally-scrolled" : "") : "")} onScroll={stickyFirstColumn ? (event) => setTableScrolled(event.currentTarget.scrollLeft !== 0) : undefined} role="region" aria-label={ariaLabel} tabIndex={0}>
          <table className="stock-data-table mobile-record-data-table" style={{ minWidth }}>
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={String(row.source_id ?? `${currentPage}-${index}`)}>
                  {columns.map((column) => <td className={column.align === "end" ? "record-align-end" : undefined} key={column.key}>{column.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 ? (
        <>
          <div className="mobile-pagination">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>{labels.previous}</button>
            <span>{labels.page} {currentPage} {labels.of} {pageCount}</span>
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>{labels.next}</button>
          </div>
          {footer}
        </>
      ) : null}
    </>
  );
}

function ReadOnlyDetail({
  title,
  subtitle,
  labels,
  fields,
  children,
  onClose,
  language,
}: {
  title: string;
  subtitle: string;
  labels: Record<LabelKey, string>;
  fields: Array<[string, ReactNode]>;
  children?: ReactNode;
  onClose: () => void;
  language: MobileLanguage;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div className="stock-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="stock-detail-modal" role="dialog" aria-modal="true" aria-label={title} dir={language === "ar" ? "rtl" : "ltr"}>
        <header>
          <div><span>{title}</span><h2>{subtitle || "—"}</h2></div>
          <button type="button" aria-label={labels.close} onClick={onClose}><X size={20} /></button>
        </header>
        <dl className="stock-detail-grid">
          {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}
        </dl>
        {children}
        <button type="button" className="stock-modal-close" onClick={onClose}>{labels.close}</button>
      </section>
    </div>
  );
}

function DetailButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="stock-table-view" onClick={onClick}>{label}</button>;
}

function LimitNotice({ children }: { children: ReactNode }) {
  return <p className="stock-filter-note" role="note">{children}</p>;
}

function SearchRow({
  query,
  onQueryChange,
  label,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  label: string;
}) {
  return (
    <label className="mobile-search stock-search-row">
      <Search size={18} />
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={label} aria-label={label} />
    </label>
  );
}

export function ClientsSection({
  data,
  language,
  permissions,
  query,
  onQueryChange,
}: {
  data: MobileBundle;
  language: MobileLanguage;
  permissions: MobilePermissions;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const labels = LABELS[language];
  const [selected, setSelected] = useState<MobileRow | null>(null);
  const [clientDetailTab, setClientDetailTab] = useState<"sales" | "payments" | "services">("sales");
  const [clientSalesLimit, setClientSalesLimit] = useState(5);
  const [clientPaymentsLimit, setClientPaymentsLimit] = useState(5);
  const [clientServicesLimit, setClientServicesLimit] = useState(5);
  const [showProfit, setShowProfit] = useState(false);
  const [view, setView] = useState<"clients" | "payments">("clients");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedPaymentClientId, setSelectedPaymentClientId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"all" | "paid" | "unpaid">("unpaid");
  const [paymentDueFilter, setPaymentDueFilter] = useState<"all" | "overdue" | "dueSoon">("all");
  const clients = useMemo(() => data.clients.filter((row) =>
    matchesQuery(row, query, ["name", "phone", "address", "notes"]),
  ), [data.clients, query]);
  const compareName = (a: MobileRow, b: MobileRow) => valueText(a, "name").localeCompare(valueText(b, "name"), language, { sensitivity: "base" });
  const compareCreated = (a: MobileRow, b: MobileRow) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at");
  const compareOldest = (a: MobileRow, b: MobileRow) => -compareCreated(a, b);
  const clientFinancials = useMemo(() => {
    const totals = new Map<string, { purchases: number; credit: number; versement: number }>();
    const salesById = new Map<string, MobileRow>();
    const saleItemsBySaleId = new Map<string, MobileRow[]>();
    for (const client of data.clients) {
      totals.set(valueText(client, "source_id"), { purchases: 0, credit: 0, versement: 0 });
    }
    for (const sale of data.sales) {
      salesById.set(valueText(sale, "source_id"), sale);
    }
    for (const item of data.sale_items) {
      const saleId = valueText(item, "sale_source_id");
      if (!saleId) continue;
      const items = saleItemsBySaleId.get(saleId) ?? [];
      items.push(item);
      saleItemsBySaleId.set(saleId, items);
    }
    // Desktop totals each sale as (sum of item price * quantity) - discount.
    // Prefer the persisted discounted sale total when present: the PWA receives
    // sale headers and sale items as separate bounded datasets, so a missing or
    // truncated item list must not turn a real sale into a zero/partial total.
    // Fall back to the desktop calculation for older rows without that field.
    for (const sale of data.sales) {
      const clientId = valueText(sale, "client_source_id");
      const totalsForClient = totals.get(clientId);
      if (!totalsForClient) continue;
      const saleItems = saleItemsBySaleId.get(valueText(sale, "source_id")) ?? [];
      const storedTotal = sale.total_amount_with_discount;
      const saleTotal = typeof storedTotal === "number" && Number.isFinite(storedTotal)
        ? storedTotal
        : saleItems.reduce(
            (sum, item) => sum + valueNumber(item, "price") * valueNumber(item, "quantity"),
            0,
          ) - valueNumber(sale, "discount");
      totalsForClient.purchases += saleTotal;
    }
    for (const payment of data.payments) {
      const clientId = valueText(payment, "client_source_id") || valueText(payment, "clientSourceId");
      if (!clientId) continue;
      const paymentType = valueText(payment, "type").toUpperCase();
      const totalsForClient = totals.get(clientId);
      if (!totalsForClient) continue;
      const paidDate = valueText(payment, "paid_date") || valueText(payment, "paidDate");
      const givenAmount = valueNumber(payment, "given_amount") || valueNumber(payment, "givenAmount");

      // Match src/lib/database/clients.ts: the Clients table totals unpaid records only.
      if (paymentType === "CREDIT" && !paidDate) {
        const rawCreditAmount = payment.credit_amount ?? payment.creditAmount;
        const saleId = valueText(payment, "sale_source_id") || valueText(payment, "saleId");
        const sale = salesById.get(saleId);
        let remainingAmount: number;
        if (rawCreditAmount !== null && rawCreditAmount !== undefined && rawCreditAmount !== "") {
          remainingAmount = Number(rawCreditAmount) - givenAmount;
        } else if (saleId && sale) {
          remainingAmount = valueNumber(sale, "total_amount_with_discount") - givenAmount;
        } else {
          remainingAmount = valueNumber(payment, "credit_amount") - givenAmount;
        }

        // Desktop falls back to givenAmount if remainingAmount is absent/non-positive.
        if (remainingAmount > 0) {
          totalsForClient.credit += remainingAmount;
        } else if (givenAmount > 0) {
          totalsForClient.credit += givenAmount;
        }
      } else if (paymentType === "VERSEMENT" && !paidDate) {
        totalsForClient.versement += givenAmount;
      }
    }
    return totals;
  }, [data.clients, data.payments, data.sales]);
  const financialsFor = (client: MobileRow) => clientFinancials.get(valueText(client, "source_id")) ?? { purchases: 0, credit: 0, versement: 0 };
  const paymentRows = useMemo(() => {
    if (!permissions.can_access_clients) return [] as MobileRow[];
    const clientsById = new Map(data.clients.map((client) => [valueText(client, "source_id"), client]));
    const salesById = new Map(data.sales.map((sale) => [valueText(sale, "source_id"), sale]));
    return data.payments.map((payment) => {
      const client = clientsById.get(valueText(payment, "client_source_id"));
      const sale = salesById.get(valueText(payment, "sale_source_id"));
      const givenAmount = valueNumber(payment, "given_amount");
      const rawCreditAmount = payment.credit_amount;
      const creditBase = rawCreditAmount !== null && rawCreditAmount !== undefined && rawCreditAmount !== ""
        ? Number(rawCreditAmount)
        : sale ? valueNumber(sale, "total_amount_with_discount") : 0;
      const type = valueText(payment, "type").toUpperCase();
      const paidDate = valueText(payment, "paid_date");
      const remainingAmount = type === "CREDIT" ? creditBase - givenAmount : paidDate ? 0 : givenAmount;
      return {
        ...payment,
        _client_name: valueText(client ?? {}, "name"),
        _client_phone: valueText(client ?? {}, "phone"),
        _remaining_amount: Number.isFinite(remainingAmount) ? remainingAmount : 0,
      };
    });
  }, [data.clients, data.payments, data.sales, permissions.can_access_clients]);
  const isPaymentOverdue = (payment: MobileRow) => {
    const due = dateValue(payment, "due_date");
    return !valueText(payment, "paid_date") && Number.isFinite(due) && due !== 0 && due < Date.now();
  };
  const isPaymentDueSoon = (payment: MobileRow) => {
    const due = dateValue(payment, "due_date");
    const days = Math.ceil((due - Date.now()) / 86_400_000);
    return !valueText(payment, "paid_date") && Number.isFinite(due) && days > 0 && days <= 2;
  };
  const filteredPaymentRows = useMemo(() => paymentRows.filter((payment) => {
    const term = paymentSearch.trim().toLocaleLowerCase();
    const matchesSearch = !term || ["_client_name", "_client_phone", "reason"].some((key) => valueText(payment, key).toLocaleLowerCase().includes(term));
    const paymentClientId = valueText(payment, "client_source_id") || valueText(payment, "clientSourceId");
    const matchesSelectedClient = !selectedPaymentClientId || paymentClientId === selectedPaymentClientId;
    const paid = Boolean(valueText(payment, "paid_date"));
    const matchesStatus = paymentStatus === "all" || (paymentStatus === "paid" ? paid : !paid);
    const matchesDue = paymentDueFilter === "all" || (paymentDueFilter === "overdue" ? isPaymentOverdue(payment) : isPaymentDueSoon(payment));
    return matchesSearch && matchesSelectedClient && matchesStatus && matchesDue;
  }), [paymentRows, paymentSearch, selectedPaymentClientId, paymentStatus, paymentDueFilter]);
  const credits = filteredPaymentRows.filter((payment) => valueText(payment, "type").toUpperCase() === "CREDIT");
  const versements = filteredPaymentRows.filter((payment) => valueText(payment, "type").toUpperCase() === "VERSEMENT");
  const openClientPayments = (client: MobileRow) => {
    const clientId = valueText(client, "source_id");
    if (!clientId) return;
    setSelectedPaymentClientId(clientId);
    setPaymentSearch(valueText(client, "name"));
    setView("payments");
  };
  const handlePaymentSearchChange = (nextQuery: string) => {
    setSelectedPaymentClientId(null);
    setPaymentSearch(nextQuery);
  };
  const paymentAmount = (payment: MobileRow) => valueText(payment, "type").toUpperCase() === "CREDIT" ? valueNumber(payment, "_remaining_amount") : valueNumber(payment, "given_amount");
  const paymentTotals = (rows: MobileRow[]) => ({
    count: rows.length,
    amount: rows.reduce((sum, payment) => sum + paymentAmount(payment), 0),
    paid: rows.filter((payment) => Boolean(valueText(payment, "paid_date"))).reduce((sum, payment) => sum + paymentAmount(payment), 0),
    outstanding: rows.filter((payment) => !valueText(payment, "paid_date")).reduce((sum, payment) => sum + paymentAmount(payment), 0),
    overdue: rows.filter(isPaymentOverdue).reduce((sum, payment) => sum + paymentAmount(payment), 0),
  });
  const renderPaymentsTable = (rows: MobileRow[], type: "CREDIT" | "VERSEMENT") => {
    const totals = paymentTotals(rows);
    const isCredit = type === "CREDIT";
    return <StockStyleTable
      rows={rows}
      labels={labels}
      ariaLabel={isCredit ? labels.credits : labels.versements}
      pageSizeLabel={labels.pageSize}
      empty={labels.empty}
      minWidth={760}
      initialSortId="dueDate"
      initialPageSize={7}
      pageSizes={[7, 10, 25, 50, 100]}
      stickyFirstColumn
      sorts={[
        { id: "dueDate", label: labels.dueDate, compare: (a, b) => dateValue(a, "due_date") - dateValue(b, "due_date") },
        { id: "newest", label: labels.newest, compare: (a, b) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at") },
        { id: "oldest", label: labels.oldest, compare: (a, b) => sortTime(a, "source_created_at") - sortTime(b, "source_created_at") },
        { id: "name", label: labels.nameAZ, compare: (a, b) => valueText(a, "_client_name").localeCompare(valueText(b, "_client_name"), language, { sensitivity: "base" }) },
      ]}
      columns={[
        { key: "client", label: labels.client, render: (row) => <span className="block min-w-0"><strong className="block truncate" title={valueText(row, "_client_name") || labels.clientUnavailable}>{valueText(row, "_client_name") || labels.clientUnavailable}</strong>{valueText(row, "_client_phone") ? <small className="block truncate text-[11px] text-muted-foreground" title={valueText(row, "_client_phone")}>{valueText(row, "_client_phone")}</small> : null}</span> },
        { key: "reason", label: labels.reason, render: (row) => isCredit ? valueText(row, "reason") || "—" : "—" },
        { key: "amount", label: labels.amount, align: "end", render: (row) => valueText(row, "paid_date") ? <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">{labels.paid}</span> : <span className={isCredit ? "font-semibold text-orange-600 dark:text-orange-400" : "font-semibold text-blue-600 dark:text-blue-400"}>{displayMoney(paymentAmount(row), language)}</span> },
        { key: "dueDate", label: labels.dueDate, render: (row) => <span className="block"><span>{displayDate(valueText(row, "due_date"), language)}</span>{isPaymentOverdue(row) ? <small className="block font-semibold text-red-600 dark:text-red-400">{labels.overdue}</small> : !valueText(row, "paid_date") && isPaymentDueSoon(row) ? <small className="block font-semibold text-orange-600 dark:text-orange-400">{labels.dueSoon}</small> : null}</span> },
        { key: "status", label: labels.paymentStatus, render: (row) => valueText(row, "paid_date") ? <span className="font-semibold text-green-600 dark:text-green-400">{labels.paid}</span> : isPaymentOverdue(row) ? <span className="font-semibold text-red-600 dark:text-red-400">{labels.overdue}</span> : isPaymentDueSoon(row) ? <span className="font-semibold text-orange-600 dark:text-orange-400">{labels.dueSoon}</span> : <span>{labels.unpaid}</span> },
        { key: "created", label: labels.created, render: (row) => displayDate(valueText(row, "source_created_at"), language) },
      ]}
      footer={<div className="stock-table-totals" aria-label={isCredit ? labels.credits : labels.versements}>
        <div><span>{labels.totalPayments}</span><strong>{new Intl.NumberFormat(language).format(totals.count)}</strong></div>
        <div><span>{labels.totalAmount}</span><strong>{displayMoney(totals.amount, language)}</strong></div>
        <div><span>{labels.paidAmount}</span><strong className="text-green-600 dark:text-green-400">{displayMoney(totals.paid, language)}</strong></div>
        <div><span>{labels.outstandingAmount}</span><strong className={isCredit ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}>{displayMoney(totals.outstanding, language)}</strong></div>
        <div><span>{labels.overdueAmount}</span><strong className="text-red-600 dark:text-red-400">{displayMoney(totals.overdue, language)}</strong></div>
      </div>}
    />;
  };

  const totalPurchases = clients.reduce((sum, client) => sum + financialsFor(client).purchases, 0);
  const totalCredits = clients.reduce((sum, client) => sum + Math.max(0, financialsFor(client).credit), 0);
  const totalVersements = clients.reduce((sum, client) => sum + Math.max(0, financialsFor(client).versement), 0);
  const compareCreditsVersements = (a: MobileRow, b: MobileRow) => {
    const aTotals = financialsFor(a);
    const bTotals = financialsFor(b);
    return bTotals.credit - aTotals.credit || bTotals.versement - aTotals.versement || compareName(a, b);
  };
  const compareNotes = (a: MobileRow, b: MobileRow) => {
    const aHasNotes = valueText(a, "notes").trim().length > 0;
    const bHasNotes = valueText(b, "notes").trim().length > 0;
    return Number(bHasNotes) - Number(aHasNotes) || compareName(a, b);
  };
  // Desktop defaults to ordering clients by outstanding credits, then versements.
  const defaultClientSort = "creditsVersements";
  const clientId = selected ? valueText(selected, "source_id") : "";
  const sales = clientId && permissions.can_access_history && data.sales_history_available
    ? data.sales.filter((row) => valueText(row, "client_source_id") === clientId)
        .sort((a, b) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at"))
    : [];
  const payments = clientId && permissions.can_access_clients
    ? data.payments.filter((row) => valueText(row, "client_source_id") === clientId)
        .sort((a, b) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at"))
    : [];
  const clientServices = clientId && permissions.can_access_services
    ? data.service_appointments.filter((row) => valueText(row, "client_source_id") === clientId)
        .sort((a, b) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at"))
    : [];
  const totalSpentForClient = sales.reduce((sum, sale) => sum + valueNumber(sale, "total_amount_with_discount"), 0);
  const salesByIdForClient = new Map(data.sales.map((sale) => [valueText(sale, "source_id"), sale]));
  const totalCreditsForClient = payments.filter((payment) => valueText(payment, "type").toUpperCase() === "CREDIT")
    .reduce((sum, payment) => {
      const given = valueNumber(payment, "given_amount");
      const rawCredit = payment.credit_amount ?? payment.creditAmount;
      const sale = salesByIdForClient.get(valueText(payment, "sale_source_id") || valueText(payment, "saleId"));
      const remaining = rawCredit !== null && rawCredit !== undefined && rawCredit !== ""
        ? Number(rawCredit) - given
        : sale ? valueNumber(sale, "total_amount_with_discount") - given : given;
      return sum + (Number.isFinite(remaining) ? remaining : given);
    }, 0);
  const totalVersementsForClient = payments
    .filter((payment) => valueText(payment, "type").toUpperCase() === "VERSEMENT")
    .reduce((sum, payment) => sum + valueNumber(payment, "given_amount"), 0);
  const paymentDetailAmount = (payment: MobileRow) => {
    if (valueText(payment, "type").toUpperCase() !== "CREDIT") return valueNumber(payment, "given_amount");
    const given = valueNumber(payment, "given_amount");
    const rawCredit = payment.credit_amount ?? payment.creditAmount;
    const sale = salesByIdForClient.get(valueText(payment, "sale_source_id") || valueText(payment, "saleId"));
    if (rawCredit !== null && rawCredit !== undefined && rawCredit !== "") return Number(rawCredit) - given;
    return sale ? valueNumber(sale, "total_amount_with_discount") - given : given;
  };
  const saleItemName = (item: MobileRow) => {
    const productId = valueText(item, "product_source_id");
    const manualId = valueText(item, "manual_product_source_id");
    const serviceId = valueText(item, "service_source_id");
    const product = data.products.find((row) => valueText(row, "source_id") === productId);
    const manualProduct = data.manual_products.find((row) => valueText(row, "source_id") === manualId);
    const service = data.services.find((row) => valueText(row, "source_id") === serviceId);
    return valueText(product ?? manualProduct ?? service ?? {}, "name") || labels.itemUnavailable;
  };
  const openClientDetail = (client: MobileRow) => {
    setSelected(client);
    setClientDetailTab("sales");
    setClientSalesLimit(5);
    setClientPaymentsLimit(5);
    setClientServicesLimit(5);
  };

  return (
    <>
      <div className="stock-view-switch" role="tablist" aria-label={labels.clients}>
        <button type="button" role="tab" aria-selected={view === "clients"} className={view === "clients" ? "active" : ""} onClick={() => setView("clients")}><Users size={16} />{labels.clients}</button>
        <button type="button" role="tab" aria-selected={view === "payments"} className={view === "payments" ? "active" : ""} onClick={() => setView("payments")}><CreditCard size={16} />{labels.allPaymentsTab}</button>
      </div>
      {view === "clients" ? <>
      <section className="mobile-subsection">
        <h2>{labels.clients}</h2>
        <StockStyleTable
          rows={clients}
          labels={labels}
          ariaLabel={labels.clients}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={760}
          initialSortId={defaultClientSort}
          initialPageSize={10}
          pageSizes={[5, 10, 25, 50, 100]}
          stickyFirstColumn
          toolbar={<>
            <SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />
            {data.clients.length >= 2000 ? <LimitNotice>{labels.limitNotice} ({labels.limitedClients}: 2,000)</LimitNotice> : null}
          </>}
          sorts={[
            { id: "creditsVersements", label: labels.sortCreditsVersements, compare: compareCreditsVersements },
            { id: "name", label: labels.nameAZ, compare: compareName },
            { id: "newest", label: labels.newest, compare: compareCreated },
            { id: "oldest", label: labels.oldest, compare: compareOldest },
            { id: "notes", label: labels.sortNotes, compare: compareNotes },
          ]}
          columns={[
            { key: "name", label: labels.name, render: (row) => { const name = valueText(row, "name") || "—"; return <span className="block truncate" title={name}>{name}</span>; } },
            { key: "phone", label: labels.phone, render: (row) => valueText(row, "phone") || "—" },
            { key: "address", label: labels.address, render: (row) => valueText(row, "address") || "—" },
            { key: "notes", label: labels.notes, render: (row) => valueText(row, "notes") || "—" },
            { key: "totalPurchases", label: labels.totalPurchases, align: "end", render: (row) => displayMoney(financialsFor(row).purchases, language) },
            { key: "totalCredit", label: labels.totalCredit, align: "end", render: (row) => { const amount = financialsFor(row).credit; const name = valueText(row, "name") || labels.clientUnavailable; return <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap"><span className="font-medium text-orange-600 dark:text-orange-400">{displayMoney(amount, language)}</span>{amount > 0 && permissions.can_access_clients ? <button type="button" title={`${labels.viewInPayments}: ${name}`} aria-label={`${labels.viewInPayments}: ${name}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/60 dark:text-orange-300 dark:hover:bg-orange-950/40" onClick={() => openClientPayments(row)}><ExternalLink size={14} aria-hidden="true" /></button> : null}</span>; } },
            { key: "totalVersement", label: labels.totalVersement, align: "end", render: (row) => { const amount = financialsFor(row).versement; const name = valueText(row, "name") || labels.clientUnavailable; return <span className="inline-flex items-center justify-end gap-2 whitespace-nowrap"><span className="font-medium text-blue-600 dark:text-blue-400">{displayMoney(amount, language)}</span>{amount > 0 && permissions.can_access_clients ? <button type="button" title={`${labels.viewInPayments}: ${name}`} aria-label={`${labels.viewInPayments}: ${name}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40" onClick={() => openClientPayments(row)}><ExternalLink size={14} aria-hidden="true" /></button> : null}</span>; } },
            { key: "view", label: labels.view, render: (row) => <DetailButton label={labels.view} onClick={() => openClientDetail(row)} /> },
          ]}
          footer={<div className="stock-table-totals">
            <div><span>{labels.clients}</span><strong>{new Intl.NumberFormat(language).format(clients.length)}</strong></div>
            <div><span>{labels.totalPurchases}</span><strong>{displayMoney(totalPurchases, language)}</strong></div>
            <div><span>{labels.totalCredit}</span><strong className="text-orange-600 dark:text-orange-400">{displayMoney(totalCredits, language)}</strong></div>
            <div><span>{labels.totalVersement}</span><strong className="text-blue-600 dark:text-blue-400">{displayMoney(totalVersements, language)}</strong></div>
          </div>}
        />
      </section>
      {selected ? (
        <ReadOnlyDetail title={labels.clients} subtitle={valueText(selected, "name")} labels={labels} language={language} onClose={() => setSelected(null)} fields={[
          [labels.phone, valueText(selected, "phone")],
          [labels.address, valueText(selected, "address")],
          [labels.notes, valueText(selected, "notes")],
          [labels.created, displayDate(valueText(selected, "source_created_at"), language, true)],
        ]}>
          <section className="client-detail-summary" aria-label={labels.totalSpent}>
            <div><span>{labels.totalSpent}</span><strong className="text-green-600 dark:text-green-400">{permissions.can_access_history && data.sales_history_available ? displayMoney(totalSpentForClient, language) : "—"}</strong><small>{labels.totalSales}: {permissions.can_access_history && data.sales_history_available ? new Intl.NumberFormat(language).format(sales.length) : "—"}</small></div>
            <div><span>{labels.totalCredits}</span><strong className="text-orange-600 dark:text-orange-400">{permissions.can_access_clients ? displayMoney(totalCreditsForClient, language) : "—"}</strong><small>{labels.payments}: {permissions.can_access_clients ? new Intl.NumberFormat(language).format(payments.filter((payment) => valueText(payment, "type").toUpperCase() === "CREDIT").length) : "—"}</small></div>
            <div><span>{labels.totalVersements}</span><strong className="text-blue-600 dark:text-blue-400">{permissions.can_access_clients ? displayMoney(totalVersementsForClient, language) : "—"}</strong><small>{labels.payments}: {permissions.can_access_clients ? new Intl.NumberFormat(language).format(payments.filter((payment) => valueText(payment, "type").toUpperCase() === "VERSEMENT").length) : "—"}</small></div>
          </section>
          <div className="client-detail-tabs" role="tablist" aria-label={labels.clients}>
            <button type="button" role="tab" aria-selected={clientDetailTab === "sales"} className={clientDetailTab === "sales" ? "active" : ""} onClick={() => setClientDetailTab("sales")}><ShoppingCart size={15} /><span>{labels.sales}</span><b>{permissions.can_access_history && data.sales_history_available ? sales.length : "—"}</b></button>
            <button type="button" role="tab" aria-selected={clientDetailTab === "payments"} className={clientDetailTab === "payments" ? "active" : ""} onClick={() => setClientDetailTab("payments")}><CreditCard size={15} /><span>{labels.payments}</span><b>{permissions.can_access_clients ? payments.length : "—"}</b></button>
            <button type="button" role="tab" aria-selected={clientDetailTab === "services"} className={clientDetailTab === "services" ? "active" : ""} onClick={() => setClientDetailTab("services")}><Wrench size={15} /><span>{labels.services}</span><b>{permissions.can_access_services ? clientServices.length : "—"}</b></button>
          </div>
          {clientDetailTab === "sales" ? <section className="stock-detail-history-section">
            <div className="stock-history-heading"><h3>{labels.salesHistory}</h3><div><span>{labels.totalSales}: {permissions.can_access_history && data.sales_history_available ? new Intl.NumberFormat(language).format(sales.length) : "—"}</span><span>{labels.totalSpent}: {permissions.can_access_history && data.sales_history_available ? displayMoney(totalSpentForClient, language) : "—"}</span></div></div>
            {!permissions.can_access_history || !data.sales_history_available ? <p className="stock-detail-muted">{labels.historyUnavailable}</p> : sales.length === 0 ? <p className="stock-detail-muted">{labels.noSales}</p> : <div className="stock-detail-history-cards">
              {sales.slice(0, clientSalesLimit).map((sale) => {
                const items = data.sale_items.filter((item) => valueText(item, "sale_source_id") === valueText(sale, "source_id"));
                return <article className="stock-detail-history-card" key={valueText(sale, "source_id")}>
                  <div className="stock-detail-history-top"><strong className="stock-history-total stock-history-total-sale">{displayMoney(valueNumber(sale, "total_amount_with_discount"), language)}</strong><time>{displayDate(valueText(sale, "source_created_at"), language, true)}</time></div>
                  <div className="client-detail-sale-items">{items.length ? items.slice(0, 3).map((item) => <div key={valueText(item, "source_id")}><span>{saleItemName(item)}</span><strong>{new Intl.NumberFormat(language).format(valueNumber(item, "quantity"))} × {displayMoney(valueNumber(item, "price"), language)}</strong></div>) : <p className="stock-detail-muted">{labels.itemUnavailable}</p>}{items.length > 3 ? <small>+{items.length - 3} {labels.more}</small> : null}</div>
                </article>;
              })}
            </div>}
            {permissions.can_access_history && sales.length > 5 ? <button type="button" className="stock-history-more" onClick={() => setClientSalesLimit((limit) => limit < sales.length ? Math.min(limit + 5, sales.length) : 5)}>{clientSalesLimit < sales.length ? `${labels.showMore} (${Math.min(5, sales.length - clientSalesLimit)} ${labels.more})` : labels.showLess}</button> : null}
            {data.sales.length >= 5000 || data.sale_items.length >= 10000 ? <p className="stock-detail-muted">{labels.limitNotice} ({labels.limitedSales}: 5,000)</p> : null}
          </section> : null}
          {clientDetailTab === "payments" ? <section className="stock-detail-history-section">
            <div className="stock-history-heading"><h3>{labels.paymentsHistory}</h3><div><span>{labels.totalPayments}: {permissions.can_access_clients ? new Intl.NumberFormat(language).format(payments.length) : "—"}</span><span>{labels.totalCredits}: {permissions.can_access_clients ? displayMoney(totalCreditsForClient, language) : "—"}</span><span>{labels.totalVersements}: {permissions.can_access_clients ? displayMoney(totalVersementsForClient, language) : "—"}</span></div></div>
            {!permissions.can_access_clients ? <p className="stock-detail-muted">{labels.historyUnavailable}</p> : payments.length === 0 ? <p className="stock-detail-muted">{labels.noPayments}</p> : <div className="stock-detail-history-cards">
              {payments.slice(0, clientPaymentsLimit).map((payment) => {
                const type = valueText(payment, "type").toUpperCase();
                const paid = Boolean(valueText(payment, "paid_date"));
                const amount = paymentDetailAmount(payment);
                return <article className="stock-detail-history-card" key={valueText(payment, "source_id")}>
                  <div className="stock-detail-history-top"><strong>{type === "CREDIT" ? labels.credits : labels.versements}</strong><time>{displayDate(valueText(payment, "source_created_at"), language, true)}</time></div>
                  <div className="stock-detail-history-party"><span className={`record-status ${paid ? "completed" : "waiting"}`}>{paid ? labels.paid : labels.unpaid}</span><strong className={type === "CREDIT" ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}>{displayMoney(Number.isFinite(amount) ? amount : 0, language)}</strong></div>
                  <div className="stock-detail-history-values"><div><span>{labels.givenAmount}</span><strong>{displayMoney(valueNumber(payment, "given_amount"), language)}</strong></div><div><span>{labels.dueDate}</span><strong>{displayDate(valueText(payment, "due_date"), language)}</strong></div><div><span>{labels.paidDate}</span><strong>{displayDate(valueText(payment, "paid_date"), language)}</strong></div></div>
                  {valueText(payment, "reason") ? <p className="client-detail-payment-reason">{labels.reason}: {valueText(payment, "reason")}</p> : null}
                </article>;
              })}
            </div>}
            {permissions.can_access_clients && payments.length > 5 ? <button type="button" className="stock-history-more" onClick={() => setClientPaymentsLimit((limit) => limit < payments.length ? Math.min(limit + 5, payments.length) : 5)}>{clientPaymentsLimit < payments.length ? `${labels.showMore} (${Math.min(5, payments.length - clientPaymentsLimit)} ${labels.more})` : labels.showLess}</button> : null}
            {data.payments.length >= 3000 ? <p className="stock-detail-muted">{labels.limitNotice} ({labels.limitedPayments}: 3,000)</p> : null}
          </section> : null}
          {clientDetailTab === "services" ? <section className="stock-detail-history-section">
            <div className="stock-history-heading"><h3>{labels.servicesHistory}</h3><div><span>{labels.totalServices}: {permissions.can_access_services ? new Intl.NumberFormat(language).format(clientServices.length) : "—"}</span><span>{labels.totalCost}: {permissions.can_access_services ? displayMoney(clientServices.reduce((sum, service) => sum + valueNumber(service, "cost_price"), 0), language) : "—"}</span></div></div>
            {!permissions.can_access_services ? <p className="stock-detail-muted">{labels.historyUnavailable}</p> : clientServices.length === 0 ? <p className="stock-detail-muted">{labels.noServices}</p> : <div className="stock-detail-history-cards">
              {clientServices.slice(0, clientServicesLimit).map((service) => {
                const status = serviceStatus(service, language);
                return <article className="stock-detail-history-card" key={valueText(service, "source_id")}>
                  <div className="stock-detail-history-top"><strong>{valueText(service, "name") || labels.itemUnavailable}</strong><time>{displayDate(valueText(service, "source_created_at"), language, true)}</time></div>
                  <div className="stock-detail-history-party"><span className={`record-status ${status.className}`}>{status.label}</span><strong className="text-blue-600 dark:text-blue-400">{displayMoney(valueNumber(service, "service_price"), language)}</strong></div>
                  <div className="stock-detail-history-values"><div><span>{labels.cost}</span><strong>{displayMoney(valueNumber(service, "cost_price"), language)}</strong></div><div><span>{labels.dueDate}</span><strong>{displayDate(valueText(service, "due_date"), language)}</strong></div><div><span>{labels.completedAt}</span><strong>{displayDate(valueText(service, "completed_at"), language)}</strong></div></div>
                  {valueText(service, "description") ? <p className="client-detail-payment-reason">{valueText(service, "description")}</p> : null}
                  {valueText(service, "notes") ? <p className="client-detail-payment-reason">{labels.notes}: {valueText(service, "notes")}</p> : null}
                </article>;
              })}
            </div>}
            {permissions.can_access_services && clientServices.length > 5 ? <button type="button" className="stock-history-more" onClick={() => setClientServicesLimit((limit) => limit < clientServices.length ? Math.min(limit + 5, clientServices.length) : 5)}>{clientServicesLimit < clientServices.length ? `${labels.showMore} (${Math.min(5, clientServices.length - clientServicesLimit)} ${labels.more})` : labels.showLess}</button> : null}
            {data.service_appointments.length >= 1000 ? <p className="stock-detail-muted">{labels.limitNotice} ({labels.limitedAppointments}: 1,000)</p> : null}
          </section> : null}
        </ReadOnlyDetail>
      ) : null}
      </> : <section className="mobile-subsection">
        <h2>{labels.allPaymentsTab}</h2>
        {!permissions.can_access_clients ? <p className="mobile-empty">{labels.historyUnavailable}</p> : <>
          <div className="stock-filter-row" aria-label={labels.filters}>
            <label className="mobile-select-control"><span>{labels.status}</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "all" | "paid" | "unpaid")}>
              <option value="all">{labels.allStatuses}</option><option value="unpaid">{labels.unpaid}</option><option value="paid">{labels.paid}</option>
            </select></label>
            <label className="mobile-select-control"><span>{labels.dueFilter}</span><select value={paymentDueFilter} onChange={(event) => setPaymentDueFilter(event.target.value as "all" | "overdue" | "dueSoon")}>
              <option value="all">{labels.all}</option><option value="overdue">{labels.overdue}</option><option value="dueSoon">{labels.dueSoon}</option>
            </select></label>
          </div>
          <div className="stock-table-toolbar">
            <SearchRow query={paymentSearch} onQueryChange={handlePaymentSearchChange} label={labels.paymentSearch} />
          </div>
          {data.payments.length >= 3000 ? <LimitNotice>{labels.limitNotice} ({labels.limitedPayments}: 3,000)</LimitNotice> : null}
          <section className="mobile-subsection"><h3>{labels.credits} ({credits.length})</h3>{credits.length ? renderPaymentsTable(credits, "CREDIT") : <p className="mobile-empty">{labels.empty}</p>}</section>
          <section className="mobile-subsection"><h3>{labels.versements} ({versements.length})</h3>{versements.length ? renderPaymentsTable(versements, "VERSEMENT") : <p className="mobile-empty">{labels.empty}</p>}</section>
          <p className="stock-detail-muted">{labels.dueSoonThresholdNote}</p>
        </>}
      </section>}
    </>
  );
}

function billDueStatus(bill: MobileRow): "overdue" | "soon" | "active" | "inactive" | "unknown" {
  if (valueText(bill, "duration") === "NO_NEXT") return "inactive";
  const date = dateValue(bill, "next_bill_date");
  if (!Number.isFinite(date)) return "unknown";
  const days = Math.ceil((date - Date.now()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days <= 2) return "soon";
  return "active";
}

function billDuration(value: string, language: MobileLanguage): string {
  if (value === "NO_NEXT") return LABELS[language].noNextPayment;
  const match = /^(\d+)_(DAY|DAYS|MONTH|MONTHS|YEAR|YEARS)$/.exec(value);
  if (!match) return value || "—";
  const unit = match[2].toLowerCase().replace(/s$/, "");
  const translatedUnit: Record<MobileLanguage, Record<string, string>> = {
    en: { day: "day", month: "month", year: "year" },
    fr: { day: "jour", month: "mois", year: "an" },
    ar: { day: "يوم", month: "شهر", year: "سنة" },
  };
  return `${match[1]} ${translatedUnit[language][unit] ?? unit}`;
}

export function BillsSection({
  data,
  language,
  query,
  onQueryChange,
}: {
  data: MobileBundle;
  language: MobileLanguage;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const labels = LABELS[language];
  const [view, setView] = useState<"bills" | "payments">("bills");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [selected, setSelected] = useState<MobileRow | null>(null);
  const types = useMemo(() => [...new Set(data.bills.map((bill) => valueText(bill, "type")).filter(Boolean))].sort(), [data.bills]);
  const billTitles = useMemo(() => new Map(data.bills.map((bill) => [valueText(bill, "source_id"), valueText(bill, "title")])), [data.bills]);
  const bills = useMemo(() => data.bills.filter((bill) => {
    const termMatch = matchesQuery(bill, query, ["title", "description", "type", "notes"]);
    const typeMatch = typeFilter === "all" || valueText(bill, "type") === typeFilter;
    const duration = valueText(bill, "duration") === "NO_NEXT" ? "oneTime" : "recurring";
    const durationMatch = statusFilter === "all" || duration === statusFilter;
    const due = billDueStatus(bill);
    const dueMatch = dueFilter === "all" || (dueFilter === "overdue" && due === "overdue") || (dueFilter === "soon" && due === "soon");
    return termMatch && typeMatch && durationMatch && dueMatch;
  }), [data.bills, query, typeFilter, statusFilter, dueFilter]);
  const compareDate = (a: MobileRow, b: MobileRow) => sortTime(b, "next_bill_date") - sortTime(a, "next_bill_date");
  const compareTitle = (a: MobileRow, b: MobileRow) => valueText(a, "title").localeCompare(valueText(b, "title"), language);
  const selectedId = selected ? valueText(selected, "source_id") : "";
  const selectedPayments = selectedId
    ? data.bill_payments.filter((payment) => valueText(payment, "bill_source_id") === selectedId)
      .sort((a, b) => sortTime(b, "paid_date") - sortTime(a, "paid_date"))
    : [];
  const billPaidTotal = (bill: MobileRow) => data.bill_payments
    .filter((payment) => valueText(payment, "bill_source_id") === valueText(bill, "source_id"))
    .reduce((sum, payment) => sum + valueNumber(payment, "amount"), 0);
  const activeCount = bills.filter((bill) => valueText(bill, "duration") !== "NO_NEXT").length;
  const inactiveCount = bills.length - activeCount;
  const paidTotal = bills.reduce((sum, bill) => sum + billPaidTotal(bill), 0);
  const billPaymentRows = useMemo(() => data.bill_payments
    .map((payment) => ({
      ...payment,
      bill_title: billTitles.get(valueText(payment, "bill_source_id")) ?? "",
    }))
    .filter((payment) => matchesQuery(payment, query, ["bill_title", "notes", "paid_date"])),
  [data.bill_payments, billTitles, query]);
  const billPaymentTotal = billPaymentRows.reduce((sum, payment) => sum + valueNumber(payment, "amount"), 0);
  const activeFilters = typeFilter !== "all" || statusFilter !== "all" || dueFilter !== "all";
  const resetFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setDueFilter("all");
  };

  return (
    <div className="stock-replica" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="stock-view-switch" role="tablist" aria-label={labels.totalBills}>
        <button type="button" role="tab" aria-selected={view === "bills"} className={view === "bills" ? "active" : ""} onClick={() => { setSelected(null); setView("bills"); }}><ShoppingCart size={16} />{labels.totalBills}</button>
        <button type="button" role="tab" aria-selected={view === "payments"} className={view === "payments" ? "active" : ""} onClick={() => { setSelected(null); setView("payments"); }}><CreditCard size={16} />{labels.payments}</button>
      </div>
      {data.bills.length >= 1000 || data.bill_payments.length >= 3000 ? <LimitNotice>{labels.limitNotice}</LimitNotice> : null}
      {view === "bills" ? (
        <>
          <StockStyleTable
            rows={bills}
            labels={labels}
            ariaLabel={labels.totalBills}
            pageSizeLabel={labels.pageSize}
            empty={labels.empty}
            minWidth={910}
            stickyFirstColumn
            toolbar={
              <>
                <div className="stock-filter-row stock-filter-primary-row" aria-label={labels.filters}>
                  <label className="mobile-select-control stock-filter-category"><span>{labels.type}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{labels.allTypes}</option>{types.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
                </div>
                <div className="stock-filter-row stock-filter-options-row" aria-label={labels.filters}>
                  <label className="mobile-select-control stock-filter-category"><span>{labels.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="recurring">{labels.recurring}</option><option value="oneTime">{labels.oneTime}</option></select></label>
                  <label className="mobile-select-control stock-filter-category"><span>{labels.dueFilter}</span><select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="overdue">{labels.overdue}</option><option value="soon">{labels.dueSoon}</option></select></label>
                  {activeFilters ? <button type="button" className="stock-filter-chip stock-clear-filters" onClick={resetFilters}>{labels.clearFilters}<X size={14} /></button> : null}
                </div>
                <SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />
              </>
            }
            sorts={[
              { id: "due", label: labels.nextPayment, compare: compareDate },
              { id: "title", label: labels.nameAZ, compare: compareTitle },
            ]}
            columns={[
              { key: "title", label: labels.title, render: (bill) => valueText(bill, "title") || "—" },
              { key: "type", label: labels.type, render: (bill) => valueText(bill, "type") || "—" },
              { key: "status", label: labels.status, render: (bill) => <span className={`record-status ${valueText(bill, "duration") === "NO_NEXT" ? "waiting" : "done"}`}>{valueText(bill, "duration") === "NO_NEXT" ? labels.inactive : labels.active}</span> },
              { key: "paid", label: labels.totalPaid, align: "end", render: (bill) => <span className="font-semibold text-purple-500">{displayMoney(billPaidTotal(bill), language, 100)}</span> },
              { key: "last", label: labels.lastPayment, render: (bill) => {
                const last = data.bill_payments.filter((payment) => valueText(payment, "bill_source_id") === valueText(bill, "source_id")).reduce((latest, payment) => {
                  const time = dateValue(payment, "paid_date");
                  return Number.isFinite(time) && time > latest ? time : latest;
                }, 0);
                return last ? displayDate(new Date(last).toISOString(), language) : "—";
              } },
              { key: "next", label: labels.nextPayment, render: (bill) => {
                if (valueText(bill, "duration") === "NO_NEXT") return labels.noNextPayment;
                const status = billDueStatus(bill);
                return <>{displayDate(valueText(bill, "next_bill_date"), language)}{status === "overdue" ? <span className="record-status late">{labels.overdue}</span> : status === "soon" ? <span className="record-status waiting">{labels.dueSoon}</span> : null}</>;
              } },
              { key: "view", label: labels.view, render: (bill) => <DetailButton label={labels.view} onClick={() => setSelected(bill)} /> },
            ]}
            footer={<div className="stock-table-totals">
              <div><span>{labels.totalBills}</span><strong className="text-purple-500">{new Intl.NumberFormat(language).format(bills.length)}</strong></div>
              <div><span>{labels.activeBills}</span><strong className="text-purple-500">{new Intl.NumberFormat(language).format(activeCount)}</strong></div>
              <div><span>{labels.inactiveBills}</span><strong className="text-purple-500">{new Intl.NumberFormat(language).format(inactiveCount)}</strong></div>
              <div><span>{labels.totalPaid}</span><strong className="text-purple-500">{displayMoney(paidTotal, language, 100)}</strong></div>
            </div>}
          />
        </>
      ) : (
        <StockStyleTable
          rows={billPaymentRows}
          labels={labels}
          ariaLabel={labels.billPayments}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={660}
          stickyFirstColumn
          toolbar={<SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />}
          sorts={[
            { id: "recent", label: labels.newest, compare: (a, b) => sortTime(b, "paid_date") - sortTime(a, "paid_date") },
            { id: "oldest", label: labels.oldest, compare: (a, b) => sortTime(a, "paid_date") - sortTime(b, "paid_date") },
            { id: "amount", label: labels.amount, compare: (a, b) => valueNumber(b, "amount") - valueNumber(a, "amount") },
          ]}
          columns={[
            { key: "bill", label: labels.title, render: (payment) => valueText(payment, "bill_title") || labels.billUnavailable },
            { key: "paid", label: labels.paidDate, render: (payment) => displayDate(valueText(payment, "paid_date"), language, true) },
            { key: "amount", label: labels.amount, align: "end", render: (payment) => <span className="font-semibold text-purple-500">{displayMoney(valueNumber(payment, "amount"), language, 100)}</span> },
            { key: "notes", label: labels.notes, render: (payment) => valueText(payment, "notes") || "—" },
          ]}
          footer={<div className="stock-table-totals">
            <div><span>{labels.payments}</span><strong className="text-purple-500">{new Intl.NumberFormat(language).format(billPaymentRows.length)}</strong></div>
            <div><span>{labels.totalPaid}</span><strong className="text-purple-500">{displayMoney(billPaymentTotal, language, 100)}</strong></div>
          </div>}
        />
      )}
      {selected && view === "bills" ? (
        <ReadOnlyDetail title={labels.payments} subtitle={valueText(selected, "title")} labels={labels} language={language} onClose={() => setSelected(null)} fields={[
          [labels.type, valueText(selected, "type")],
          [labels.status, valueText(selected, "duration") === "NO_NEXT" ? labels.inactive : labels.active],
          [labels.amount, displayMoney(valueNumber(selected, "amount"), language, 100)],
          [labels.duration, billDuration(valueText(selected, "duration"), language)],
          [labels.nextPayment, valueText(selected, "duration") === "NO_NEXT" ? labels.noNextPayment : displayDate(valueText(selected, "next_bill_date"), language)],
          [labels.description, valueText(selected, "description")],
          [labels.notes, valueText(selected, "notes")],
        ]}>
          <section className="stock-detail-history-section">
            <h3>{labels.payments} ({selectedPayments.length})</h3>
            {selectedPayments.length === 0 ? <p className="stock-detail-muted">{labels.noPayments}</p> : (
              <div className="stock-history-table-wrap"><table className="stock-history-table">
                <thead><tr><th>{labels.paidDate}</th><th>{labels.amount}</th><th>{labels.notes}</th></tr></thead>
                <tbody>{selectedPayments.map((payment) => <tr key={valueText(payment, "source_id")}>
                  <td>{displayDate(valueText(payment, "paid_date"), language, true)}</td>
                  <td><span className="font-semibold text-purple-500">{displayMoney(valueNumber(payment, "amount"), language, 100)}</span></td>
                  <td>{valueText(payment, "notes") || "—"}</td>
                </tr>)}</tbody>
              </table></div>
            )}
          </section>
        </ReadOnlyDetail>
      ) : null}
    </div>
  );
}

function serviceStatus(service: MobileRow, language: MobileLanguage, now = Date.now()): { label: string; className: string } {
  const labels = LABELS[language];
  if (service.is_completed === true) return { label: labels.completed, className: "done" };
  if (service.is_completed !== false) return { label: labels.pending, className: "waiting" };
  const due = dateValue(service, "due_date");
  if (Number.isFinite(due) && due < now) return { label: labels.overdue, className: "late" };
  return { label: labels.incomplete, className: "waiting" };
}

function isServiceDueSoon(service: MobileRow, now = Date.now()): boolean {
  if (service.is_completed !== false) return false;
  const due = dateValue(service, "due_date");
  return Number.isFinite(due) && due >= now && due <= now + 2 * 86_400_000;
}

export function ServicesSection({
  data,
  language,
  permissions,
  query,
  onQueryChange,
}: {
  data: MobileBundle;
  language: MobileLanguage;
  permissions: MobilePermissions;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const labels = LABELS[language];
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(1);
    start.setFullYear(start.getFullYear() - 1);
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(now.getDate(), lastDay));
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [selected, setSelected] = useState<MobileRow | null>(null);
  const [showProfit, setShowProfit] = useState(false);
  const clientsById = useMemo(
    () => new Map(
      (permissions.can_access_clients ? data.clients : [])
        .map((client) => [valueText(client, "source_id"), client] as const),
    ),
    [data.clients, permissions.can_access_clients],
  );
  const appointments = useMemo(() => data.service_appointments.filter((service) => {
    const linkedClient = permissions.can_access_clients
      ? clientsById.get(valueText(service, "client_source_id"))
      : undefined;
    const queryMatches = matchesQuery(service, query, ["name", "service_type", "description", "notes"]) ||
      (linkedClient !== undefined && valueText(linkedClient, "name").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if (!queryMatches) return false;
    const createdAt = dateValue(service, "source_created_at");
    if ((fromDate || toDate) && !Number.isFinite(createdAt)) return false;
    const createdDay = Number.isFinite(createdAt) ? localDayStart(new Date(createdAt)) : NaN;
    if (fromDate && createdDay < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate) {
      const endExclusive = new Date(`${toDate}T00:00:00`);
      endExclusive.setDate(endExclusive.getDate() + 1);
      if (createdDay >= endExclusive.getTime()) return false;
    }
    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return service.is_completed === true;
    if (statusFilter === "incomplete") return service.is_completed === false;
    if (statusFilter === "overdue") return serviceStatus(service, language).label === labels.overdue;
    if (statusFilter === "dueSoon") return isServiceDueSoon(service);
    return false;
  }), [data.service_appointments, clientsById, permissions.can_access_clients, query, statusFilter, language, labels.overdue, fromDate, toDate]);
  const compareDue = (a: MobileRow, b: MobileRow) => sortTime(a, "due_date") - sortTime(b, "due_date");
  const compareDesktopDefault = (a: MobileRow, b: MobileRow) => {
    const aCompleted = a.is_completed === true;
    const bCompleted = b.is_completed === true;
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
    if (aCompleted && bCompleted) {
      // Desktop treats zero-priced completed services as sold when no sale record is linked.
      const aSold = valueNumber(a, "service_price") === 0;
      const bSold = valueNumber(b, "service_price") === 0;
      if (aSold !== bSold) return aSold ? 1 : -1;
    }
    return sortTime(b, "source_created_at") - sortTime(a, "source_created_at");
  };
  const compareName = (a: MobileRow, b: MobileRow) => valueText(a, "name").localeCompare(valueText(b, "name"), language);
  const compareNewest = (a: MobileRow, b: MobileRow) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at");
  const completedCount = appointments.filter((service) => service.is_completed === true).length;
  const totalCost = appointments.reduce((sum, service) => sum + valueNumber(service, "cost_price"), 0);
  const totalValue = appointments.reduce((sum, service) => sum + valueNumber(service, "service_price"), 0);
  const selectedClient = selected ? clientsById.get(valueText(selected, "client_source_id")) : undefined;

  return (
    <>
      <section className="mobile-subsection">
        <h2>{labels.appointments}</h2>
        <div className="stock-filter-row mobile-services-filters">
          <label className="mobile-select-control stock-filter-category"><span>{labels.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="completed">{labels.completed}</option><option value="incomplete">{labels.incomplete}</option><option value="overdue">{labels.overdue}</option><option value="dueSoon">{labels.dueSoon}</option></select></label>
          <div className="mobile-services-date-range">
            <label className="mobile-select-control"><span>{labels.from}</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label>
            <span className="mobile-services-date-separator" aria-hidden="true">–</span>
            <label className="mobile-select-control"><span>{labels.to}</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label>
          </div>
        </div>
        <StockStyleTable
          rows={appointments}
          labels={labels}
          ariaLabel={labels.appointments}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={showProfit ? 1140 : 1040}
          stickyFirstColumn
          toolbar={<div className="mobile-services-toolbar"><div className="mobile-services-search"><SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} /></div><label className="mobile-services-profit-toggle"><input type="checkbox" checked={showProfit} onChange={(event) => setShowProfit(event.target.checked)} /><span>{labels.profit}</span></label></div>}
          sorts={[
            { id: "desktop", label: labels.desktopDefault, compare: compareDesktopDefault },
            { id: "due", label: labels.dueDate, compare: compareDue },
            { id: "newest", label: labels.created, compare: compareNewest },
            { id: "name", label: labels.name, compare: compareName },
          ]}
          columns={[
            { key: "name", label: labels.name, render: (row) => <div className="mobile-services-name-cell"><strong title={valueText(row, "name")}>{valueText(row, "name") || "—"}</strong><span title={valueText(row, "service_type")}>{valueText(row, "service_type") || "—"}</span></div> },
            { key: "description", label: labels.deviceName, render: (row) => valueText(row, "description") || "—" },
            { key: "status", label: labels.status, render: (row) => {
              const status = serviceStatus(row, language);
              return <><span className={`record-status ${status.className}`}>{status.label}</span>{isServiceDueSoon(row) ? <span className="record-status waiting">{labels.dueSoon}</span> : null}</>;
            } },
            { key: "client", label: labels.client, render: (row) => {
              const linkedClientId = valueText(row, "client_source_id");
              if (!permissions.can_access_clients) return labels.clientUnavailable;
              const client = clientsById.get(linkedClientId);
              return client ? <>{valueText(client, "name") || "—"}{valueText(client, "phone") ? <small className="stock-row-subtext">{valueText(client, "phone")}</small> : null}</> : linkedClientId ? labels.clientUnavailable : labels.noClient;
            } },
            { key: "price", label: labels.price, align: "end", render: (row) => <div className="mobile-services-price-cell"><strong>{displayMoney(valueNumber(row, "service_price"), language)}</strong>{showProfit ? (() => { const profit = valueNumber(row, "service_price") - valueNumber(row, "cost_price"); return <span className={profit >= 0 ? "mobile-services-profit" : "mobile-services-loss"}>{profit > 0 ? "+" : ""}{displayMoney(profit, language)}</span>; })() : null}</div> },
            { key: "notes", label: labels.notes, render: (row) => valueText(row, "notes") || "—" },
            { key: "due", label: labels.dueDate, render: (row) => displayDate(valueText(row, "due_date"), language) },
            { key: "view", label: labels.view, render: (row) => <DetailButton label={labels.view} onClick={() => setSelected(row)} /> },
          ]}
          footer={<div className="stock-table-totals">
            <div><span>{labels.totalServices}</span><strong>{new Intl.NumberFormat(language).format(appointments.length)}</strong></div>
            <div><span>{labels.completed}</span><strong>{new Intl.NumberFormat(language).format(completedCount)}</strong></div>
            <div><span>{labels.totalCost}</span><strong>{displayMoney(totalCost, language)}</strong></div>
            <div><span>{labels.totalValue}</span><strong>{displayMoney(totalValue, language)}</strong></div>
          </div>}
        />
      </section>
      {selected ? (
        <ReadOnlyDetail title={labels.appointments} subtitle={valueText(selected, "name")} labels={labels} language={language} onClose={() => setSelected(null)} fields={[
          [labels.type, valueText(selected, "service_type")],
          [labels.deviceName, valueText(selected, "description")],
          [labels.notes, valueText(selected, "notes")],
          [labels.status, serviceStatus(selected, language).label],
          [labels.client, !permissions.can_access_clients ? labels.clientUnavailable : selectedClient ? valueText(selectedClient, "name") : valueText(selected, "client_source_id") ? labels.clientUnavailable : labels.noClient],
          [labels.phone, permissions.can_access_clients && selectedClient ? valueText(selectedClient, "phone") : ""],
          [labels.price, displayMoney(valueNumber(selected, "service_price"), language)],
          [labels.cost, displayMoney(valueNumber(selected, "cost_price"), language)],
          [labels.dueDate, displayDate(valueText(selected, "due_date"), language, true)],
          [labels.completedAt, displayDate(valueText(selected, "completed_at"), language, true)],
        ]}>
          <p className="stock-detail-muted">{labels.linkedPaymentUnavailable}</p>
        </ReadOnlyDetail>
      ) : null}
    </>
  );
}
