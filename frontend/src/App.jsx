import AppRoutes from "./routes";
import { useAuth } from "./hooks/useAuth";
import { Loader2 } from "lucide-react";

const App = () => {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 animate-pulse" />
          <Loader2
            className="h-10 w-10 animate-spin text-emerald-600"
            strokeWidth={2.5}
          />
        </div>
        <h2 className="mt-6 text-sm font-black tracking-[0.2em] text-slate-400 uppercase">
          FactoryOS Loading
        </h2>
      </div>
    );
  }

  return <AppRoutes />;
};

export default App;
