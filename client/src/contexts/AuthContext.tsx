import React, { createContext, useState, useContext, useEffect } from "react";
import { authApi } from "@/lib/api";

export type UserRole = "admin" | "teacher" | null;

interface AuthContextType {
  role: UserRole;
  username: string | null;
  userId: string | null;
  teacherInfo: any | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const { user } = await authApi.me();
        setRole(user.role as UserRole);
        setUsername(user.username);
        setUserId(user.id);
      } catch (error) {
        // Not authenticated
        setRole(null);
        setUsername(null);
        setUserId(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      const { user, teacher } = await authApi.login(identifier, password);
      setRole(user.role as UserRole);
      setUsername(user.username);
      setUserId(user.id);
      if (teacher) {
        setTeacherInfo(teacher);
      }
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setRole(null);
      setUsername(null);
      setUserId(null);
      setTeacherInfo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ role, username, userId, teacherInfo, login, logout, isAuthenticated: role !== null, loading }}>
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
