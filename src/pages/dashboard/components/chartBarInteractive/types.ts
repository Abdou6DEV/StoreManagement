export interface ChartData {
  period: string;
  /** True when this X slot is after “now” (rest of month / year). Excluded from chart averages & scale max; line uses null to stop drawing. */
  future?: boolean;
  profits: number;
  /** Gross profit before bill deductions; set when net-profit view still uses gross Y-scale. */
  profitsGross?: number;
  clients: number;
  sales: number;
  purchases?: number;
  billsPayments?: number;
  // Used by the "sales" tooltip to display sales count and total quantity.
  salesCount?: number;
  salesQuantity?: number;
}

export interface ChartTypeConfig {
  title: string;
  description: string;
  format: (value: number) => string;
  dataKey: "profits" | "clients" | "sales";
  label: string;
}

export interface TimePeriodConfig {
  data: ChartData[];
  label: string;
  description: string;
}

export interface ChartControlsProps {
  timePeriod: "today" | "thisMonth" | "thisYear" | "overall";
  setTimePeriod: (period: "today" | "thisMonth" | "thisYear" | "overall") => void;
  chartView: "bar" | "line";
  setChartView: (view: "bar" | "line") => void;
  timePeriods: Record<string, TimePeriodConfig>;
}

export interface ChartHeaderProps {
  currentChart: ChartTypeConfig;
  currentPeriod: TimePeriodConfig;
}

export interface ChartContainerProps {
  currentPeriod: TimePeriodConfig;
  chartType: "profits" | "clients" | "sales";
  timePeriod: "today" | "thisMonth" | "thisYear" | "overall";
  chartView: "bar" | "line";
  kpiTimePeriod?: "today" | "thisMonth" | "thisYear" | "overall";
  kpiVsAverage?: {
    percentage: number;
    direction: "up" | "down";
  };
  billsPaymentsData?: Array<{ amount?: number; paidDate?: string | Date }>;
  purchasesData?: Array<{
    createdAt?: string | Date;
    PurchaseItems?: Array<{ quantity?: number; price?: number }>;
  }>;
  /** When true (profits chart), Y-axis ticks/domain follow gross profit; bars/line still use `profits` (net). */
  grossProfitYAxis?: boolean;
}

export interface ChartDataState {
  today: ChartData[];
  thisMonth: ChartData[];
  thisYear: ChartData[];
  overall: ChartData[];
}
