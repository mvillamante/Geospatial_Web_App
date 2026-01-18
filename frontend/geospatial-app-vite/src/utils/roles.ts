export type Role = "Admin" | "Officer" | "Researcher" | "Citizen" | "Guest";

export const normalizeRole = (r?: string): Role => {
  switch (r?.toLowerCase()) {
    case "citizen":
      return "Citizen";
    case "researcher":
      return "Researcher";
    case "officer":
      return "Officer";
    case "admin":
      return "Admin";
    default:
      return "Guest";
  }
};

export const roleToBasePath = (role: Role) => {
  switch (role) {
    case "Admin":
      return "/main/admin/dashboard";
    case "Officer":
      return "/main/officer/dashboard-map";
    case "Researcher":
      return "/main/researcher/dashboard-map";
    case "Citizen":
      return "/main/citizen/alerts-map";
    default:
      return "/main/guest/alerts-map";
  }
};