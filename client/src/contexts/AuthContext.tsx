import React, { createContext, useState, useContext } from "react";
import { MOCK_TEACHERS } from "@/lib/mock-data";

export type UserRole = "admin" | "teacher" | null;

interface AuthContextType {
  role: UserRole;
  username: string | null;
  userId: string | null;
  login: (identifier: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  resetPassword: (identifier: string, secretWord: string) => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const login = (identifier: string, password: string) => {
    // Admin login
    if ((identifier === "admin" || identifier === "admin@academia.edu") && password === "admin123") {
      setRole("admin");
      setUsername("Administrator");
      setUserId("ADMIN");
      return true;
    }
    
    // Teacher login with username or email
    const teacher = MOCK_TEACHERS.find(
      t => (t.username === identifier || t.email === identifier) && t.password === password
    );
    
    if (teacher) {
      setRole("teacher");
      setUsername(teacher.name);
      setUserId(teacher.id);
      return true;
    }
    
    return false;
  };

  const resetPassword = (identifier: string, secretWord: string): string | null => {
    // Admin password reset
    if ((identifier === "admin" || identifier === "admin@academia.edu") && secretWord === "governance") {
      return "admin123";
    }
    
    // Teacher password reset
    const teacher = MOCK_TEACHERS.find(
      t => (t.username === identifier || t.email === identifier) && t.secretWord === secretWord
    );
    
    if (teacher) {
      return teacher.password;
    }
    
    return null;
  };

  const logout = () => {
    setRole(null);
    setUsername(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ role, username, userId, login, logout, isAuthenticated: role !== null, resetPassword }}>
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
