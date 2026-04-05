export type ReportStatus =
  | "Pending"
  | "In Progress"
  | "Resolved"
  | "Needs Info"
  | "Archived"
  | "Rejected";

export type ProgressStatus = ReportStatus;

export interface Report {
  id: number;
  title: string;
  description: string;
  location_display: string;
  date: string;
  status: ReportStatus;
  photo?: string;

  lat: number;
  lng: number;

  category?: string;
  other_category?: string | null;

  lgu_post?: {
    incident: string;
    status: string;
    what_happened?: string | null;
    action_taken?: string | null;
    advisory?: string | null;
    updated_at?: string;
  } | null;

  needs_info_note?: string | null;
  reply_message?: string | null;
  reply_image_url?: string | null;
  rejection_reason?: string | null;
}
