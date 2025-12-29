import React, { createContext, useState, useContext } from "react";

export type UserRole = "admin" | "teacher" | null;

interface AuthContextType {
  role: UserRole;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);

  const login = (inputUsername: string, password: string) => {
    // Mock credentials
    if (inputUsername === "admin" && password === "admin123") {
      setRole("admin");
      setUsername("Administrator");
      return true;
    }
    // Teachers can login with teacher_id and any password
    if (inputUsername.startsWith("teacher_") && password === "teacher123") {
      setRole("teacher");
      setUsername(inputUsername);
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ role, username, login, logout, isAuthenticated: role !== null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
