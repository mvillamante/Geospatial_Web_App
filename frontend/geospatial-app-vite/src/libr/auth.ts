import { supabase } from "./supabaseClient";
import type { Session, AuthError } from "@supabase/supabase-js";
import type { User } from "./fetchCurrentUser";
import { normalizeRole } from "../utils/roles";

// ===== LOGIN ======
export const login = async (
  phone: string,
  password: string
): Promise<Session | null> => {
  const { data, error }: { data: { session: Session | null }; error: AuthError | null } =
    await supabase.auth.signInWithPassword({
      phone,
      password,
    });
  if (error) throw error;
  return data.session;
};

// ===== SIGNUP =====
export const signup = async (
  phone: string,
  password: string,
  metadata: Record<string, string>
): Promise<Session | null> => {
  const { data, error }: { data: { session: Session | null }; error: AuthError | null } =
    await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: metadata,
      },
    });

  if (error) throw error;

  return data.session;
};

// ===== GET CURRENT SESSION (for supabase only) =====
export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
};

// ===== GET CURRENT SESSION (mainly user role) =====
export const getUserRoleAndDisplayName = () => {
  const storedRoles = JSON.parse(localStorage.getItem("user_roles") || '{}');
  const currentUser = JSON.parse(localStorage.getItem("current_user") || '{}');

  const userRole = storedRoles.primaryRole || "Guest";
  const userRole2 = storedRoles.secondaryRoles || [];

  const displayName = currentUser.name || currentUser.username || userRole;
  const profilePath = `/main/${userRole.toLowerCase()}/profile`;

  return { userRole, userRole2, displayName, profilePath };
};

// ===== LISTEN TO AUTH CHANGES =====
export const onAuthChange = (
  callback: (event: string, session: Session | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  // Return unsubscribe function
  return () => data.subscription.unsubscribe();
};

// ===== SAVE USER SESSION =====
export const saveUserSession = (user: User, accessToken: string) => {
  if (!user || !accessToken) return;

  const primaryRole = normalizeRole(user.role);
  const secondaryRoles = user.extra_roles?.map(normalizeRole) ?? [];

  localStorage.setItem(
    "user_roles",
    JSON.stringify({ primaryRole, secondaryRoles })
  );

  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("current_user", JSON.stringify(user));

  const user_roles = localStorage.getItem("user_roles")

  console.log("roles of current user:", user_roles) //debug @here
};

// ===== CLEAR USER SESSION =====
export const clearUserSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_roles");
  localStorage.removeItem("current_user");
};