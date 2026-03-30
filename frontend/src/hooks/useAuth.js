import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider. Wrap your App.jsx!",
    );
  }
  const { user, permissions } = context;
  const can = (moduleCode, action = "can_view") => {
    if (user?.is_super_admin) return true;
    const perm = permissions?.find((p) => p.module_code === moduleCode);
    return perm ? !!perm[action] : false;
  };

  return { ...context, can };
};
