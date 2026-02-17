export type HazardBarangayData = {
  hazard_index: number;
};

export type GreenIndexBarangayData = {
  green_index: number;
};

export type CalamityRiskBarangayData = {
  calamity_risk: number;
};

export type StatItem = {
  label: string;
  value: number;
  change: number;
};

export type HealthItem = {
  label: string;
  value: string;
  status: "good" | "warning";
};

export type DownloadItem = {
  name: string;
  type: "report" | "chart";
};

export type ReportItem = [string, string];
export type ChartItem = string;
export type DatasetsItem = [string, string, string];
export type ExportItem = ReportItem | ChartItem | DownloadItem;