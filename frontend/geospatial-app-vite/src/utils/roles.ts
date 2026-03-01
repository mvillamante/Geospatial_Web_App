export type Role = "Admin" | "Officer" | "Citizen" | "" | "Guest";

export const normalizePrimaryRole = (role?: string): Role => {
  const r = role?.trim().toLowerCase() || "";

  switch (r) {
    case "citizen":
      return "Citizen";
    case "officer":
      return "Officer";
    case "admin":
      return "Admin";
    case "":
      return ""; // leave empty if no role
    default:
      return "Guest";
  }
};

export const normalizeSecondaryRole = (
  _primaryRole: Role,
  extraRole?: string
): "" | "Researcher" => {
  const r = extraRole?.trim().toLowerCase() || "";

  if (r === "researcher") {
    return "Researcher";
  }

  return "";
};

export const roleToBasePath = (role: Role | string) => {
  switch (role) {
    case "Admin":
      return "/main/admin/dashboard";
    case "Officer":
      return "/main/officer/home";
    case "Citizen":
      return "/main/citizen/community-feed";
    case "Researcher":
      return "/main/researcher/home";
    default:
      return "/main/citizen/community-feed";
  }
};