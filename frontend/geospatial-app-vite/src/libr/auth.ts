import { supabase } from "./supabaseClient";
import type { Session, AuthError } from "@supabase/supabase-js";
import type { User } from "./fetchCurrentUser";
import { normalizePrimaryRole } from "../utils/roles";

// User login authentication handler
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

// User registration signup handler
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

// Fetch active backend authentication session
export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session;
};

// Retrieve current user role and profile details from local session
export const getUserRoleAndDisplayName = () => {
  const storedRoles = JSON.parse(localStorage.getItem("user_roles") || "{}");
  const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");

  const currentUserId = currentUser.id || null;

  const userRole = storedRoles.role || "Guest";

  const first = (currentUser.first_name || currentUser.firstName || "").trim();
  const last = (currentUser.last_name || currentUser.lastName || "").trim();
  const fullName = `${first} ${last}`.trim();

  const displayName =
    fullName ||
    currentUser.name ||
    currentUser.username ||
    (userRole || "Guest");

  const userName = currentUser.username;

  // Determine user role navigation paths
  const effectiveRole = userRole;

  const profilePath = `/main/${effectiveRole.toLowerCase()}/profile`;
  const settingsPath = `/main/${effectiveRole.toLowerCase()}/settings`;

  const isResidentVerified = currentUser.is_resident_verified;

  return {
    currentUserId,
    userRole,
    userName,
    displayName,
    profilePath,
    settingsPath,
    isResidentVerified
  };
};


// Subscribe to authentication state changes
export const onAuthChange = (
  callback: (event: string, session: Session | null) => void
) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  // Unsubscribe cleanup handler
  return () => data.subscription.unsubscribe();
};

// Persist user session data and access tokens locally
export const saveUserSession = (user: User, accessToken: string) => {
  if (!user || !accessToken) return;

  const role = normalizePrimaryRole(user.role, user.extra_roles);

  localStorage.setItem(
    "user_roles",
    JSON.stringify({ role })
  );

  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("current_user", JSON.stringify(user));
};

// Clear active user session from local storage
export const clearUserSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_roles");
  localStorage.removeItem("current_user");
};