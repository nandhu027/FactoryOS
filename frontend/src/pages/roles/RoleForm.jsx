import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const RoleForm = ({ initialData, onClose }) => {
  const [roleName, setRoleName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = !!initialData;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (initialData) {
      setRoleName(initialData.role_name);
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!roleName.trim()) {
      return setError("Role name is required to proceed.");
    }

    setIsLoading(true);

    try {
      const payload = { role_name: roleName.trim() };

      if (isEditing) {
        await api.put(`/roles/${initialData.id}`, payload);
        toast.success("Role successfully updated.");
      } else {
        await api.post("/roles", payload);
        toast.success("New role provisioned successfully.");
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Operation failed. Please check inputs and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-pointer"
          onClick={!isLoading ? onClose : undefined}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="w-full max-w-[480px] bg-white rounded-[24px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-white/60 overflow-hidden relative z-10 flex flex-col transform-gpu"
        >
          <div className="px-5 py-5 sm:px-8 sm:py-6 flex flex-nowrap items-start justify-between gap-4 bg-white border-b border-slate-100/80 shrink-0 shadow-sm">
            <div className="flex gap-4 items-center min-w-0">
              <div
                className={`w-12 h-12 rounded-[20px] flex items-center justify-center shadow-sm border shrink-0 ${
                  isEditing
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                {isEditing ? (
                  <ShieldCheck size={24} strokeWidth={1.5} />
                ) : (
                  <Plus size={24} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  {isEditing ? "Edit Security Role" : "Create New Role"}
                </h3>
                <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 truncate">
                  {isEditing
                    ? "Modify existing system designation"
                    : "Define a new access control level"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-slate-400 bg-slate-100/80 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-8 space-y-6 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                  Role Identifier / Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <KeyRound size={16} strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    disabled={isLoading}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Floor Manager, QA Lead..."
                    className="w-full h-[44px] pl-11 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] sm:text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 text-rose-600 text-[13px] sm:text-[14px] font-medium bg-rose-50/80 border border-rose-200/80 p-4 rounded-[16px]">
                    <ShieldAlert
                      size={18}
                      strokeWidth={2}
                      className="shrink-0 mt-0.5 text-rose-500"
                    />
                    <span className="leading-snug">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 sm:gap-4 pt-6 border-t border-slate-100/80 mt-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 h-[44px] sm:h-[48px] text-[13px] sm:text-[14px] font-bold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[14px] sm:rounded-[16px] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] h-[44px] sm:h-[48px] bg-slate-900 text-white rounded-[14px] sm:rounded-[16px] text-[13px] sm:text-[14px] font-bold transition-all hover:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2
                    size={18}
                    strokeWidth={2}
                    className="animate-spin text-slate-400"
                  />
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                    {isEditing ? "Update Role" : "Create Role"}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default RoleForm;
