export interface ChartData {
  period: string;
  profits: number;
  clients: number;
  sales: number;
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
  timePeriod: "1m" | "12m" | "years";
  setTimePeriod: (period: "1m" | "12m" | "years") => void;
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
  timePeriod: "1m" | "12m" | "years";
}

export interface ChartDataState {
  "1m": ChartData[];
  "12m": ChartData[];
  years: ChartData[];
}
