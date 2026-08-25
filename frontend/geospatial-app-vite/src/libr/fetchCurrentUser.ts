export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  extra_roles: string[];
}

const API_URL = import.meta.env.VITE_API_URL;

// Fetch authenticated user profile data from backend API
export const fetchCurrentUser = async (token: string): Promise<User> => {
  const response = await fetch(`${API_URL}/api/current_user/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch user from backend: ${text}`);
  }

  const data: User = await response.json();
  return data;
};
