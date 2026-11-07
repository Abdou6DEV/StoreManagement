import {
  ArrowRight,
  Clock3,
  History,
  Package,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageIcon } from "../../../src/lib/components/sharedPresentation";
import { LOGO_ICON, LOGO_ICON_DARK } from "../../../src/lib/assets";
import type {
  MobileAppSection,
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
} from "../mobileApi";

type HomeSection = Exclude<MobileAppSection, "menu" | "dashboard">;

export type MobileHomeDashboardLabels = {
  greeting: string;
  overview: string;
  todaySales: string;
  salesCount: string;
  profit: string;
  outstandingCredit: string;
  quickActions: string;
  storeSections: string;
  recentActivity: string;
  noRecentSales: string;
  noPermission: string;
  sale: string;
  clientsSuppliers: string;
  stock: string;
  history: string;
  services: string;
  bills: string;
};

export function MobileHomeDashboard({
  data,
  language,
  permissions,
  username,
  theme,
  labels,
  onNavigate,
}: {
  data: MobileBundle;
  language: MobileLanguage;
  permissions: MobilePermissions;
  username: string;
  theme: "light" | "dark";
  labels: MobileHomeDashboardLabels;
  onNavigate: (section: MobileAppSection) => void;
}) {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todaySummary = data.dashboard_daily.find((row) => row.local_day === todayKey);
  const formatNumber = (value: number) =>
    new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value);
  const formatMoney = (value: unknown) =>
    `${formatNumber(Number(value) || 0)} DA`;
  const salesById = new Map(
    data.sales.map((sale) => [String(sale.source_id ?? ""), sale]),
  );
  const paymentDataComplete =
    data.payments.length < 3000 &&
    data.payments.every((payment) =>
      payment.type !== "CREDIT" ||
      payment.credit_amount != null ||
      !payment.sale_source_id ||
      salesById.has(String(payment.sale_source_id)),
    );
  const unpaidCredit = data.payments
    .filter((payment) => payment.type === "CREDIT" && !payment.paid_date)
    .reduce((sum, payment) => {
      const givenAmount = Number(payment.given_amount) || 0;
      if (payment.credit_amount != null) {
        return sum + (Number(payment.credit_amount) || 0) - givenAmount;
      }
      const linkedSale = salesById.get(String(payment.sale_source_id ?? ""));
      return sum + (linkedSale
        ? (Number(linkedSale.total_amount_with_discount) || 0) - givenAmount
        : -givenAmount);
    }, 0);
  const dateLabel = new Intl.DateTimeFormat(language, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);

  const navigation: Array<{
    id: HomeSection;
    permission: keyof MobilePermissions;
    label: string;
  }> = [
    { id: "stock", permission: "can_access_stock", label: labels.stock },
    { id: "clients", permission: "can_access_clients", label: labels.clientsSuppliers },
    { id: "services", permission: "can_access_services", label: labels.services },
    { id: "bills", permission: "can_access_bills", label: labels.bills },
    { id: "history", permission: "can_access_history", label: labels.history },
  ];
  const visibleNavigation = navigation.filter(({ permission }) => permissions[permission]);
  const quickActions: Array<{
    id: HomeSection;
    permission: keyof MobilePermissions;
    label: string;
    Icon: LucideIcon;
  }> = [
    { id: "history", permission: "can_access_history", label: labels.history, Icon: History },
    { id: "stock", permission: "can_access_stock", label: labels.stock, Icon: Package },
    { id: "clients", permission: "can_access_clients", label: labels.clientsSuppliers, Icon: Users },
  ];
  const visibleQuickActions = quickActions.filter(({ permission }) => permissions[permission]);
  const canShowActivity =
    permissions.can_access_history &&
    data.sales_history_available &&
    data.sales.length < 5000;
  const recentSales = canShowActivity
    ? [...data.sales]
        .filter((sale) => {
          const createdAt = new Date(String(sale.source_created_at ?? ""));
          return Number.isFinite(createdAt.getTime());
        })
        .sort((left, right) =>
          String(right.source_created_at).localeCompare(String(left.source_created_at)),
        )
        .slice(0, 3)
    : [];
  const clientNames = new Map(
    data.clients.map((client) => [String(client.source_id ?? ""), String(client.name ?? "")]),
  );

  return (
    <div className="mobile-home-dashboard">
      <header className="mobile-home-brand">
        <img
          src={theme === "dark" ? LOGO_ICON : LOGO_ICON_DARK}
          alt="REDA TECH"
        />
        <div className="mobile-home-brand-copy">
          <p>{labels.greeting},</p>
          <h2>{username}</h2>
        </div>
        <time>{dateLabel}</time>
      </header>

      {permissions.can_access_dashboard ? (
        <section className="mobile-home-overview" aria-labelledby="mobile-home-overview-title">
          <div className="mobile-home-section-heading">
            <h2 id="mobile-home-overview-title">{labels.overview}</h2>
            <span>{dateLabel}</span>
          </div>
          <p className="mobile-home-primary-label">{labels.todaySales}</p>
          <strong className="mobile-home-primary-value">
            {todaySummary ? formatMoney(todaySummary.revenue) : "—"}
          </strong>
          <div className="mobile-home-secondary-metrics">
            <div>
              <span>{labels.salesCount}</span>
              <strong>{todaySummary ? formatNumber(Number(todaySummary.sales_count) || 0) : "—"}</strong>
            </div>
            <div>
              <span>{labels.profit}</span>
              <strong>{todaySummary ? formatMoney(todaySummary.profit) : "—"}</strong>
            </div>
            {permissions.can_access_clients && paymentDataComplete ? (
              <div>
                <span>{labels.outstandingCredit}</span>
                <strong>{formatMoney(unpaidCredit)}</strong>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {visibleQuickActions.length > 0 ? (
        <section className="mobile-home-section" aria-labelledby="mobile-home-actions-title">
          <h2 id="mobile-home-actions-title" className="mobile-home-section-title">
            {labels.quickActions}
          </h2>
          <div className="mobile-home-quick-actions">
            {visibleQuickActions.map(({ id, label, Icon }) => (
              <button
                type="button"
                className="mobile-home-quick-action"
                key={id}
                onClick={() => onNavigate(id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {visibleNavigation.length > 0 ? (
        <section className="mobile-home-section" aria-labelledby="mobile-home-sections-title">
          <h2 id="mobile-home-sections-title" className="mobile-home-section-title">
            {labels.storeSections}
          </h2>
          <div className="mobile-home-navigation">
            {visibleNavigation.map(({ id, label }) => (
              <button
                type="button"
                className="mobile-home-navigation-card"
                key={id}
                onClick={() => onNavigate(id)}
              >
                <span className="mobile-home-navigation-icon">
                  <PageIcon page={id} size={21} aria-hidden="true" />
                </span>
                <span className="mobile-home-navigation-label">{label}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="mobile-home-empty">{labels.noPermission}</p>
      )}

      {canShowActivity ? (
        <section className="mobile-home-section" aria-labelledby="mobile-home-activity-title">
          <div className="mobile-home-section-heading">
            <h2 id="mobile-home-activity-title" className="mobile-home-section-title">
              {labels.recentActivity}
            </h2>
            <Clock3 size={17} aria-hidden="true" />
          </div>
          {recentSales.length ? (
            <div className="mobile-home-activity-list">
              {recentSales.map((sale, index) => {
                const createdAt = new Date(String(sale.source_created_at));
                const clientName = clientNames.get(String(sale.client_source_id ?? ""));
                return (
                  <button
                    type="button"
                    className="mobile-home-activity-row"
                    key={String(sale.source_id ?? index)}
                    onClick={() => onNavigate("history")}
                  >
                    <span className="mobile-home-activity-icon">
                      <History size={17} aria-hidden="true" />
                    </span>
                    <span className="mobile-home-activity-description">
                      <strong>{clientName ? `${labels.sale} · ${clientName}` : labels.sale}</strong>
                      <time>
                        {new Intl.DateTimeFormat(language, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(createdAt)}
                      </time>
                    </span>
                    <strong className="mobile-home-activity-amount">
                      {formatMoney(sale.total_amount_with_discount)}
                    </strong>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mobile-home-empty">{labels.noRecentSales}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}