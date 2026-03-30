import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import { useEffect, useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const PermissionGuard = ({ children, module, action = "can_view" }) => {
  const { can, user, loading } = useAuth();
  const location = useLocation();

  const hasPermission = useMemo(() => {
    if (loading) return null;
    if (user?.is_super_admin) return true;
    return can(module, action);
  }, [loading, user, can, module, action]);

  useEffect(() => {
    if (hasPermission === false) {
      const timer = setTimeout(() => {
        toast.error(`Access Denied: Missing permissions for ${module}`, {
          icon: <ShieldAlert className="text-rose-500 w-5 h-5" />,
          style: {
            borderRadius: "16px",
            background: "#fff",
            color: "#0f172a",
            fontWeight: "600",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          },
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasPermission, module]);

  if (loading || hasPermission === null) {
    return (
      <div className="flex-1 w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-6 antialiased">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center justify-center">
            <Loader2
              className="w-6 h-6 animate-spin text-blue-500 shrink-0"
              strokeWidth={2.5}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-[15px] font-semibold text-slate-900 tracking-tight">
              Verifying Access
            </p>
            <p className="text-[12px] font-medium text-slate-500 tracking-tight">
              Securely connecting to {module.toLowerCase()}...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }
  if (!hasPermission) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PermissionGuard;
