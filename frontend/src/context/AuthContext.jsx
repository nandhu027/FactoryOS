import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setPermissions([]);
    if (!window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }, []);
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/auth/me");
      setUser(res.data.data.user);
      setPermissions(res.data.data.permissions);
    } catch (err) {
      console.error("Auth initialization failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = async (username, password) => {
    try {
      const res = await api.post("/auth/login", { username, password });
      const { token } = res.data.data;
      localStorage.setItem("token", token);
      const profileRes = await api.get("/auth/me");

      setUser(profileRes.data.data.user);
      setPermissions(profileRes.data.data.permissions);

      return profileRes.data.data;
    } catch (err) {
      throw err;
    }
  };

  const can = useCallback(
    (moduleCode, action = "can_view") => {
      if (user?.is_super_admin) return true;
      if (permissions === "ALL") return true;
      const perm = permissions?.find((p) => p.module_code === moduleCode);
      return perm ? !!perm[action] : false;
    },
    [user, permissions],
  );

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  const value = useMemo(
    () => ({
      user,
      setUser,
      permissions,
      setPermissions,
      logout,
      loading,
      refreshUser,
      login,
      can,
    }),
    [user, permissions, loading, logout, refreshUser, can],
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
