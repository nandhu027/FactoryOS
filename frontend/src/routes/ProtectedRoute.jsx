import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50/50 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="h-10 w-10 animate-spin text-emerald-500"
            strokeWidth={2.5}
          />
          <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">
            Verifying Session...
          </p>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

export default ProtectedRoute;
