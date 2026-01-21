import React, { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { fetchCurrentUser, User } from "../libr/fetchCurrentUser";
import { supabase } from "../libr/supabaseClient";

// AuthContextType definition
interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>; // Add refreshUser here
}

// Create the AuthContext
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {} // Add a default for refreshUser
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user information from Supabase and backend
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setUser(null);
          return;
        }

        const currentUser = await fetchCurrentUser(session.access_token);
        setUser(currentUser);
      } catch (error) {
        console.log("Error fetching user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Function to refresh the user info
  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        return;
      }

      const currentUser = await fetchCurrentUser(session.access_token);
        setUser(currentUser);
    } catch (error) {
      console.log("Error refreshing user:", error);
        setUser(null);
    } finally {
        setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
