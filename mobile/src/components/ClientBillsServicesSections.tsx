import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
  MobileRow,
} from "../mobileApi";

type LabelKey =
  | "search"
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
  | "empty"
  | "name"
  | "phone"
  | "address"
  | "notes"
  | "created"
  | "clients"
  | "payments"
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
  | "completionRate"
  | "incompleteServices"
  | "dueSoonThresholdNote";


const LABELS: Record<MobileLanguage, Record<LabelKey, string>> = {
  en: {
    search: "Search", sort: "Sort by", desktopDefault: "Desktop default", pageSize: "Rows per page", view: "View",
    close: "Close", page: "Page", of: "of", previous: "Previous", next: "Next",
    newest: "Newest first", oldest: "Oldest first", nameAZ: "Name A–Z",
    empty: "No records match these filters.", name: "Name", phone: "Phone",
    address: "Address", notes: "Notes", created: "Added", clients: "Clients",
    payments: "Payments", sales: "Sales", paymentType: "Type", amount: "Amount",
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
    description: "Description", totalBills: "Bills", activeBills: "Active bills",
    inactiveBills: "Inactive bills", totalPaid: "Paid in available records",
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
    itemUnavailable: "Item details unavailable", average: "average", profit: "Profit",
    completionRate: "Completion rate", incompleteServices: "Incomplete",
    dueSoonThresholdNote: "Due-soon uses the 2-day default; the desktop threshold setting is not synced to the PWA.",
  },
  fr: {
    search: "Rechercher", sort: "Trier par", desktopDefault: "Ordre du bureau", pageSize: "Lignes par page", view: "Voir",
    close: "Fermer", page: "Page", of: "sur", previous: "Précédent", next: "Suivant",
    newest: "Plus récent", oldest: "Plus ancien", nameAZ: "Nom A–Z",
    empty: "Aucun résultat pour ces filtres.", name: "Nom", phone: "Téléphone",
    address: "Adresse", notes: "Notes", created: "Ajouté", clients: "Clients",
    payments: "Paiements", sales: "Ventes", paymentType: "Type", amount: "Montant",
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
    description: "Description", totalBills: "Factures", activeBills: "Factures actives",
    inactiveBills: "Factures inactives", totalPaid: "Payé dans les données disponibles",
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
    itemUnavailable: "Détails de l’article indisponibles", average: "moy.", profit: "Bénéfice",
    completionRate: "Taux de réalisation", incompleteServices: "Incomplets",
    dueSoonThresholdNote: "L’échéance proche utilise la valeur par défaut de 2 jours ; le réglage du bureau n’est pas synchronisé.",
  },
  ar: {
    search: "بحث", sort: "ترتيب حسب", desktopDefault: "ترتيب سطح المكتب", pageSize: "عدد الصفوف", view: "عرض",
    close: "إغلاق", page: "صفحة", of: "من", previous: "السابق", next: "التالي",
    newest: "الأحدث أولاً", oldest: "الأقدم أولاً", nameAZ: "الاسم أ–ي",
    empty: "لا توجد سجلات تطابق عوامل التصفية.", name: "الاسم", phone: "الهاتف",
    address: "العنوان", notes: "ملاحظات", created: "تاريخ الإضافة", clients: "العملاء",
    payments: "الدفعات", sales: "المبيعات", paymentType: "النوع", amount: "المبلغ",
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
    description: "الوصف", totalBills: "الفواتير", activeBills: "الفواتير النشطة",
    inactiveBills: "الفواتير غير النشطة", totalPaid: "المدفوع ضمن السجلات المتاحة",
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
    itemUnavailable: "تفاصيل العنصر غير متاحة", average: "متوسط", profit: "الربح",
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
  minWidth,
  stickyFirstColumn = false,
}: {
  rows: T[];
  columns: Column<T>[];
  sorts: SortOption<T>[];
  empty: string;
  pageSizeLabel: string;
  labels: Record<LabelKey, string>;
  ariaLabel: string;
  footer?: ReactNode;
  minWidth: number;
  stickyFirstColumn?: boolean;
}) {
  const [sortId, setSortId] = useState(sorts[0]?.id ?? "");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [tableScrolled, setTableScrolled] = useState(false);
  const sortedRows = useMemo(() => {
    const option = sorts.find((item) => item.id === sortId);
    return option ? [...rows].sort(option.compare) : rows;
  }, [rows, sortId, sorts]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setPage(1), [rows, pageSize]);

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
            {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
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
  const clients = useMemo(() => data.clients.filter((row) =>
    matchesQuery(row, query, ["name", "phone", "address", "notes"]),
  ), [data.clients, query]);
  const compareName = (a: MobileRow, b: MobileRow) => valueText(a, "name").localeCompare(valueText(b, "name"), language);
  const compareCreated = (a: MobileRow, b: MobileRow) => sortTime(b, "source_created_at") - sortTime(a, "source_created_at");
  const compareOldest = (a: MobileRow, b: MobileRow) => -compareCreated(a, b);
  const clientId = selected ? valueText(selected, "source_id") : "";
  const payments = clientId && permissions.can_access_clients
    ? data.payments.filter((row) => valueText(row, "client_source_id") === clientId)
    : [];
  const sales = clientId && permissions.can_access_history && data.sales_history_available
    ? data.sales.filter((row) => valueText(row, "client_source_id") === clientId)
    : [];

  return (
    <>
      <SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />
      {data.clients.length >= 2000 ? <LimitNotice>{labels.limitNotice} ({labels.limitedClients}: 2,000)</LimitNotice> : null}
      <section className="mobile-subsection">
        <h2>{labels.clients}</h2>
        <StockStyleTable
          rows={clients}
          labels={labels}
          ariaLabel={labels.clients}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={760}
          sorts={[
            { id: "name", label: labels.name, compare: compareName },
            { id: "newest", label: labels.newest, compare: compareCreated },
            { id: "oldest", label: labels.oldest, compare: compareOldest },
          ]}
          columns={[
            { key: "name", label: labels.name, render: (row) => valueText(row, "name") || "—" },
            { key: "phone", label: labels.phone, render: (row) => valueText(row, "phone") || "—" },
            { key: "address", label: labels.address, render: (row) => valueText(row, "address") || "—" },
            { key: "notes", label: labels.notes, render: (row) => valueText(row, "notes") || "—" },
            { key: "created", label: labels.created, render: (row) => displayDate(valueText(row, "source_created_at"), language) },
            { key: "view", label: labels.view, render: (row) => <DetailButton label={labels.view} onClick={() => setSelected(row)} /> },
          ]}
          footer={<div className="stock-table-totals"><div><span>{labels.clients}</span><strong>{new Intl.NumberFormat(language).format(clients.length)}</strong></div></div>}
        />
      </section>
      {selected ? (
        <ReadOnlyDetail title={labels.clients} subtitle={valueText(selected, "name")} labels={labels} language={language} onClose={() => setSelected(null)} fields={[
          [labels.phone, valueText(selected, "phone")],
          [labels.address, valueText(selected, "address")],
          [labels.notes, valueText(selected, "notes")],
          [labels.created, displayDate(valueText(selected, "source_created_at"), language, true)],
        ]}>
          <p className="stock-detail-muted">{labels.totalsUnavailable}</p>
          <section className="stock-detail-history-section">
            <h3>{labels.payments}{permissions.can_access_clients ? ` (${payments.length})` : ""}</h3>
            {!permissions.can_access_clients ? <p className="stock-detail-muted">{labels.historyUnavailable}</p> : payments.length === 0 ? <p className="stock-detail-muted">{labels.noPayments}</p> : (
              <div className="stock-history-table-wrap"><table className="stock-history-table">
                <thead><tr><th>{labels.paymentType}</th><th>{labels.givenAmount}</th><th>{labels.creditAmount}</th><th>{labels.dueDate}</th><th>{labels.paidDate}</th><th>{labels.reason}</th></tr></thead>
                <tbody>{payments.map((payment) => <tr key={valueText(payment, "source_id")}>
                  <td>{valueText(payment, "type") || "—"}</td>
                  <td>{displayMoney(valueNumber(payment, "given_amount"), language)}</td>
                  <td>{payment.credit_amount == null ? "—" : displayMoney(valueNumber(payment, "credit_amount"), language)}</td>
                  <td>{displayDate(valueText(payment, "due_date"), language)}</td>
                  <td>{displayDate(valueText(payment, "paid_date"), language)}</td>
                  <td>{valueText(payment, "reason") || "—"}</td>
                </tr>)}</tbody>
              </table></div>
            )}
            {data.payments.length >= 3000 ? <p className="stock-detail-muted">{labels.limitNotice} ({labels.limitedPayments}: 3,000)</p> : null}
          </section>
          <section className="stock-detail-history-section">
            <h3>{labels.sales}{permissions.can_access_history && data.sales_history_available ? ` (${sales.length})` : ""}</h3>
            {!permissions.can_access_history || !data.sales_history_available ? <p className="stock-detail-muted">{labels.historyUnavailable}</p> : sales.length === 0 ? <p className="stock-detail-muted">{labels.noSales}</p> : (
              <div className="stock-history-table-wrap"><table className="stock-history-table">
                <thead><tr><th>{labels.saleDate}</th><th>{labels.saleTotal}</th><th>{labels.saleItems}</th></tr></thead>
                <tbody>{sales.map((sale) => {
                  const items = data.sale_items.filter((item) => valueText(item, "sale_source_id") === valueText(sale, "source_id"));
                  return <tr key={valueText(sale, "source_id")}>
                    <td>{displayDate(valueText(sale, "source_created_at"), language)}</td>
                    <td>{displayMoney(valueNumber(sale, "total_amount_with_discount"), language)}</td>
                    <td>{items.length > 0 ? items.map((item) => {
                      const productId = valueText(item, "product_source_id");
                      const manualId = valueText(item, "manual_product_source_id");
                      const serviceId = valueText(item, "service_source_id");
                      const product = data.products.find((row) => valueText(row, "source_id") === productId);
                      const manualProduct = data.manual_products.find((row) => valueText(row, "source_id") === manualId);
                      const service = data.services.find((row) => valueText(row, "source_id") === serviceId);
                      const itemName = valueText(product ?? manualProduct ?? service ?? {}, "name") || labels.itemUnavailable;
                      return <div key={valueText(item, "source_id")}>
                        {itemName} · {new Intl.NumberFormat(language).format(valueNumber(item, "quantity"))} × {displayMoney(valueNumber(item, "price"), language)}
                      </div>;
                    }) : "—"}</td>
                  </tr>;
                })}</tbody>
              </table></div>
            )}
            {data.sales.length >= 5000 || data.sale_items.length >= 10000 ? <p className="stock-detail-muted">{labels.limitNotice} ({labels.limitedSales}: 5,000)</p> : null}
          </section>
        </ReadOnlyDetail>
      ) : null}
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

  return (
    <>
      <SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />
      {data.bills.length >= 1000 || data.bill_payments.length >= 3000 ? <LimitNotice>{labels.limitNotice}</LimitNotice> : null}
      <LimitNotice>{labels.dueSoonThresholdNote}</LimitNotice>
      <section className="mobile-subsection">
        <h2>{labels.title}</h2>
        <div className="stock-filter-row">
          <label className="mobile-select-control stock-filter-category"><span>{labels.type}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{labels.allTypes}</option>{types.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
          <label className="mobile-select-control stock-filter-category"><span>{labels.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="recurring">{labels.recurring}</option><option value="oneTime">{labels.oneTime}</option></select></label>
          <label className="mobile-select-control stock-filter-category"><span>{labels.dueFilter}</span><select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="overdue">{labels.overdue}</option><option value="soon">{labels.dueSoon}</option></select></label>
        </div>
        <StockStyleTable
          rows={bills}
          labels={labels}
          ariaLabel={labels.title}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={910}
          sorts={[
            { id: "due", label: labels.nextPayment, compare: compareDate },
            { id: "title", label: labels.name, compare: compareTitle },
          ]}
          columns={[
            { key: "title", label: labels.title, render: (bill) => valueText(bill, "title") || "—" },
            { key: "type", label: labels.type, render: (bill) => valueText(bill, "type") || "—" },
            { key: "status", label: labels.status, render: (bill) => <span className={`record-status ${valueText(bill, "duration") === "NO_NEXT" ? "waiting" : "done"}`}>{valueText(bill, "duration") === "NO_NEXT" ? labels.inactive : labels.active}</span> },
            { key: "paid", label: labels.totalPaid, align: "end", render: (bill) => displayMoney(billPaidTotal(bill), language, 100) },
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
            <div><span>{labels.totalBills}</span><strong>{new Intl.NumberFormat(language).format(bills.length)}</strong></div>
            <div><span>{labels.activeBills}</span><strong>{new Intl.NumberFormat(language).format(activeCount)}</strong></div>
            <div><span>{labels.inactiveBills}</span><strong>{new Intl.NumberFormat(language).format(inactiveCount)}</strong></div>
            <div><span>{labels.totalPaid}</span><strong>{displayMoney(paidTotal, language, 100)}</strong></div>
          </div>}
        />
      </section>
      {selected ? (
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
                  <td>{displayMoney(valueNumber(payment, "amount"), language, 100)}</td>
                  <td>{valueText(payment, "notes") || "—"}</td>
                </tr>)}</tbody>
              </table></div>
            )}
          </section>
        </ReadOnlyDetail>
      ) : null}
      <section className="mobile-subsection">
        <h2>{labels.billPayments}</h2>
        <StockStyleTable
          rows={billPaymentRows}
          labels={labels}
          ariaLabel={labels.billPayments}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={660}
          sorts={[
            { id: "recent", label: labels.newest, compare: (a, b) => sortTime(b, "paid_date") - sortTime(a, "paid_date") },
            { id: "oldest", label: labels.oldest, compare: (a, b) => sortTime(a, "paid_date") - sortTime(b, "paid_date") },
            { id: "amount", label: labels.amount, compare: (a, b) => valueNumber(b, "amount") - valueNumber(a, "amount") },
          ]}
          columns={[
            { key: "bill", label: labels.title, render: (payment) => valueText(payment, "bill_title") || labels.billUnavailable },
            { key: "paid", label: labels.paidDate, render: (payment) => displayDate(valueText(payment, "paid_date"), language, true) },
            { key: "amount", label: labels.amount, align: "end", render: (payment) => displayMoney(valueNumber(payment, "amount"), language, 100) },
            { key: "notes", label: labels.notes, render: (payment) => valueText(payment, "notes") || "—" },
          ]}
          footer={<div className="stock-table-totals">
            <div><span>{labels.payments}</span><strong>{new Intl.NumberFormat(language).format(billPaymentRows.length)}</strong></div>
            <div><span>{labels.totalPaid}</span><strong>{displayMoney(billPaymentTotal, language, 100)}</strong></div>
          </div>}
        />
      </section>
    </>
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
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<MobileRow | null>(null);
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
    const dueDate = dateValue(service, "due_date");
    if ((fromDate || toDate) && !Number.isFinite(dueDate)) return false;
    const dueDay = Number.isFinite(dueDate) ? localDayStart(new Date(dueDate)) : NaN;
    if (fromDate && dueDay < new Date(`${fromDate}T00:00:00`).getTime()) return false;
    if (toDate) {
      const endExclusive = new Date(`${toDate}T00:00:00`);
      endExclusive.setDate(endExclusive.getDate() + 1);
      if (dueDay >= endExclusive.getTime()) return false;
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
      <SearchRow query={query} onQueryChange={onQueryChange} label={labels.search} />
      {data.service_appointments.length >= 1000 || data.services.length >= 500 ? <LimitNotice>{labels.limitNotice}</LimitNotice> : null}
      <LimitNotice>{labels.dueSoonThresholdNote}</LimitNotice>
      <section className="mobile-subsection">
        <h2>{labels.appointments}</h2>
        <div className="stock-filter-row">
          <label className="mobile-select-control stock-filter-category"><span>{labels.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{labels.allStatuses}</option><option value="completed">{labels.completed}</option><option value="incomplete">{labels.incomplete}</option><option value="overdue">{labels.overdue}</option><option value="dueSoon">{labels.dueSoon}</option></select></label>
          <label className="mobile-select-control stock-filter-category"><span>{labels.from}</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="mobile-select-control stock-filter-category"><span>{labels.to}</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        </div>
        <StockStyleTable
          rows={appointments}
          labels={labels}
          ariaLabel={labels.appointments}
          pageSizeLabel={labels.pageSize}
          empty={labels.empty}
          minWidth={1100}
          stickyFirstColumn
          sorts={[
            { id: "desktop", label: labels.desktopDefault, compare: compareDesktopDefault },
            { id: "due", label: labels.dueDate, compare: compareDue },
            { id: "newest", label: labels.created, compare: compareNewest },
            { id: "name", label: labels.name, compare: compareName },
          ]}
          columns={[
            { key: "name", label: labels.name, render: (row) => <><strong>{valueText(row, "name") || "—"}</strong><br /><span>{valueText(row, "service_type") || "—"}</span></> },
            { key: "description", label: labels.description, render: (row) => valueText(row, "description") || "—" },
            { key: "notes", label: labels.notes, render: (row) => valueText(row, "notes") || "—" },
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
            { key: "price", label: labels.price, align: "end", render: (row) => displayMoney(valueNumber(row, "service_price"), language) },
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
          [labels.description, valueText(selected, "description")],
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
