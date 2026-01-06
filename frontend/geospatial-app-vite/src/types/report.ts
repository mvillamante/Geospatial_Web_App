export type ReportStatus =
  | "Pending"
  | "Under Review"
  | "Assigned"
  | "In Progress"
  | "Resolved";

export interface Report {
  id: number;
  title: string;
  description: string;
  location: string;
  date: string;
  status: ReportStatus;
  photo?: string; 
}
