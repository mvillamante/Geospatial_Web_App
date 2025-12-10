import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "./api";

interface User {
    username: string;
    role: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, refreshUser: () => {} });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    const refreshUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
    };

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};
