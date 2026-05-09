"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "@/lib/client";
import { MOCK_DEMO_USERS } from "@/lib/mock-store";

export type Position =
  | "president" | "vice_president" | "dept_leader" | "dept_vice_leader" | "sub_leader" | "member";

export type Department =
  | "executive" | "hr" | "development" | "innovation" | "media" | "pr" | "finance" | "logistics" | "madarat";

export interface User {
  id: string;
  name: string;
  email: string;
  position: Position;
  department: Department;
  departmentName: string;
  departmentNameAr: string;
  avatar?: string;
  profileStatus?: "active" | "inactive" | "alumni" | "suspended";
}

interface LoginResult {
  ok: boolean;
  requiresDeviceConfirmation?: boolean;
  requiresSetup?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginAsDemo: (key: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isClubLeader: boolean;
  isDeptLeader: boolean;
  isAnyLeader: boolean;
  canAccessDept: (dept: Department) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USERS: Record<string, User> = MOCK_DEMO_USERS;

const DEMO_STORAGE_KEY = "drc-demo-user";
const DEMO_COOKIE_KEY = "drc_demo_session";

interface MeResponse {
  user: null | {
    memberId: number;
    email: string;
    position: Position;
    departmentId: number | null;
    departmentSlug: Department | null;
    profileStatus?: "active" | "inactive" | "alumni" | "suspended";
    profile: null | {
      fullName: string | null;
      fullNameAr: string | null;
      avatarUrl: string | null;
    };
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: remote } = await api.get<MeResponse>("/api/auth/me");
      if (remote) {
        setUser({
          id: String(remote.memberId),
          name: remote.profile?.fullName ?? remote.email,
          email: remote.email,
          position: remote.position,
          department: (remote.departmentSlug ?? "executive") as Department,
          departmentName: remote.departmentSlug ?? "Executive",
          departmentNameAr: remote.departmentSlug ?? "القيادة",
          avatar: remote.profile?.avatarUrl ?? undefined,
          profileStatus: remote.profileStatus ?? "active",
        });
        return;
      }
      // Fallback: demo user stored in localStorage (dev only).
      try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        setUser(stored ? JSON.parse(stored) : null);
      } catch { setUser(null); }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await api.post<{ requiresDeviceConfirmation?: boolean; requiresSetup?: boolean; user?: unknown }>(
        "/api/auth/login", { email, password },
      );
      if (res.requiresSetup)
        return { ok: false, requiresSetup: true };
      if (res.requiresDeviceConfirmation)
        return { ok: false, requiresDeviceConfirmation: true };
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as { message?: string }).message ?? "Login failed" };
    }
  }, [refresh]);

  const loginAsDemo = useCallback((key: string) => {
    const u = DEMO_USERS[key];
    if (!u) return;
    setUser(u);
    try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(u)); } catch {}
    document.cookie = `${DEMO_COOKIE_KEY}=${encodeURIComponent(key)}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    try { localStorage.removeItem(DEMO_STORAGE_KEY); } catch {}
    document.cookie = `${DEMO_COOKIE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
    setUser(null);
  }, []);

  // Super admins (e.g. system owner) get club-leader-equivalent UI access while
  // their real role/title remains untouched everywhere it's displayed.
  const SUPER_ADMIN_EMAILS = new Set<string>(["khalidalmneef@gmail.com"]);
  const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.has(user.email.toLowerCase());
  const isClubLeader = isSuperAdmin || user?.position === "president" || user?.position === "vice_president";
  // Sub-leaders (e.g. Quality & Assurance) act as leaders within their own
  // department for UI purposes; per-department scoping is handled by canAccessDept.
  const isDeptLeader = user?.position === "dept_leader" || user?.position === "dept_vice_leader" || user?.position === "sub_leader";
  const isAnyLeader = isClubLeader || isDeptLeader;

  // Visibility: any active member of a department can see and work in their
  // committee's dashboard. Sensitive *mutations* (posting announcements,
  // approving cross-dept requests, deleting projects, etc.) gate further on
  // position via the server-side `requireDeptLeader*` helpers; this flag is
  // about navigation visibility, not write authority.
  const canAccessDept = useCallback((dept: Department): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.position === "president" || user.position === "vice_president") return true;
    return user.department === dept;
  }, [user, isSuperAdmin]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      login, loginAsDemo, logout, refresh,
      isClubLeader, isDeptLeader, isAnyLeader, canAccessDept,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEMO_USERS };
