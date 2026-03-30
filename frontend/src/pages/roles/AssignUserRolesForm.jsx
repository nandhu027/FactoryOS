import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  ShieldPlus,
  Loader2,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const AssignUserRolesForm = ({ user, onClose }) => {
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setIsLoadingRoles(true);
        const res = await api.get("/roles", { params: { limit: 100 } });
        setRoles(res.data.data);

        if (user?.assigned_roles && Array.isArray(user.assigned_roles)) {
          setSelected(user.assigned_roles.map((r) => r.role_id || r.id));
        }
      } catch (err) {
        toast.error("Failed to load available system roles.");
      } finally {
        setIsLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [user]);

  const toggleRole = (roleId) => {
    setSelected((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await api.put(`/roles/assign/${user.id}`, {
        roleIds: selected,
      });
      toast.success(`Clearances updated for @${user.username}`);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to assign system clearances.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-indigo-500 selection:text-white">
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
          className="relative z-10 w-full max-w-[480px] bg-slate-50 rounded-[20px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-white/60 flex flex-col overflow-hidden transform-gpu m-auto"
        >
          <div className="px-5 pt-5 pb-4 flex items-start justify-between bg-white border-b border-slate-200/80 relative shrink-0 shadow-sm">
            <div className="flex gap-3.5 items-center pr-8">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm border shrink-0 bg-indigo-50 border-indigo-200/60 text-indigo-600">
                <ShieldPlus size={18} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 mt-0.5">
                <h3 className="text-[16px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  Assign Clearances
                </h3>
                <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1">
                  Managing roles for{" "}
                  <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-[4px] border border-slate-200/80">
                    @{user?.username || "user"}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-5 right-5 p-1.5 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="mb-3.5 flex items-center justify-between px-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                Available Security Roles
              </label>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-[6px] border border-indigo-100 shadow-sm">
                {selected.length} Selected
              </span>
            </div>

            {isLoadingRoles ? (
              <div className="py-10 flex flex-col items-center justify-center bg-white rounded-[16px] border border-slate-200/60 shadow-sm">
                <Loader2
                  size={20}
                  strokeWidth={2}
                  className="animate-spin text-indigo-500 mb-2.5"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Syncing Roles...
                </p>
              </div>
            ) : roles.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center bg-white rounded-[16px] border border-slate-200/60 border-dashed">
                <KeyRound
                  size={20}
                  strokeWidth={1.5}
                  className="text-slate-300 mb-2"
                />
                <p className="text-[13px] font-bold text-slate-700">
                  No roles defined
                </p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                  Create roles in Role Management first.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => {
                  const isChecked = selected.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-[16px] border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-white border-indigo-300 shadow-sm ring-4 ring-indigo-500/5"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-50 border border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50"
                          }`}
                        >
                          {isChecked ? (
                            <CheckCircle2 size={14} strokeWidth={2.5} />
                          ) : (
                            <KeyRound size={14} strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-[13px] font-bold tracking-tight transition-colors ${isChecked ? "text-indigo-950" : "text-slate-900"}`}
                          >
                            {role.role_name}
                          </span>
                          <span
                            className={`text-[11px] font-medium tracking-tight mt-0.5 ${isChecked ? "text-indigo-600/80" : "text-slate-500"}`}
                          >
                            Reference ID: #{role.id}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-10 mr-1 shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRole(role.id)}
                          className="peer hidden"
                        />
                        <div
                          className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
                              : "bg-white border-slate-200 group-hover:border-indigo-300"
                          }`}
                        >
                          <motion.svg
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: isChecked ? 1 : 0,
                              opacity: isChecked ? 1 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </motion.svg>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 text-rose-600 text-[12px] font-medium bg-rose-50/80 border border-rose-200/80 p-3 rounded-[12px]">
                    <ShieldAlert
                      size={16}
                      strokeWidth={2}
                      className="shrink-0 mt-0.5 text-rose-500"
                    />
                    <span className="leading-snug">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex items-center gap-2.5 relative z-10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-[40px] text-[12px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[12px] transition-colors disabled:opacity-50 active:scale-95"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isLoading || isLoadingRoles}
              className="flex-[2] h-[40px] bg-slate-900 text-white rounded-[12px] text-[12px] font-semibold transition-all hover:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2
                  size={14}
                  strokeWidth={2}
                  className="animate-spin text-slate-400"
                />
              ) : (
                <>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Save Clearances
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default AssignUserRolesForm;
