export interface ChartData {
  period: string;
  profits: number;
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
  chartType: "profits" | "clients" | "sales";
  setChartType: (type: "profits" | "clients" | "sales") => void;
  timePeriod: "today" | "thisMonth" | "thisYear" | "overall";
  setTimePeriod: (period: "today" | "thisMonth" | "thisYear" | "overall") => void;
  chartView: "bar" | "line";
  setChartView: (view: "bar" | "line") => void;
  chartTypes: Record<string, ChartTypeConfig>;
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
}

export interface ChartDataState {
  today: ChartData[];
  thisMonth: ChartData[];
  thisYear: ChartData[];
  overall: ChartData[];
}
