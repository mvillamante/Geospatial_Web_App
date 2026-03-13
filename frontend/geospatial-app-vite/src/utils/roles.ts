export type Role =
  | "Admin"
  | "Officer"
  | "Citizen"
  | "Researcher"
  | "Guest";

export const normalizePrimaryRole = (
  role?: string,
  extraRoles?: string[]
): Role | "Researcher" => {

  if (extraRoles?.some(r => r.toLowerCase() === "researcher")) {
    return "Researcher";
  }

  const r = role?.trim().toLowerCase() || "";

  switch (r) {
    case "citizen":
      return "Citizen";
    case "officer":
      return "Officer";
    case "admin":
      return "Admin";
    case "researcher":
      return "Researcher";
    case "guest":
      return "Guest";
    default:
      return "Guest";
  }
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