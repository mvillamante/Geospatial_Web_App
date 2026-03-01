export interface User {
  id: number;
  staff_id: string;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  extra_roles?: string[];
  department?: string; 
  dateJoined: string;
  lastLogin: string;
  lastLoginDisplay: string;
}