import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import { API_ENDPOINTS } from "../../api/endpoints";
import {
  X,
  ShieldCheck,
  User,
  Loader2,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Activity,
  CalendarDays,
  ShieldAlert,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTableName = (name) => {
  if (!name) return "Unknown Record";
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const UserDetailModal = ({ userId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await api.get(`${API_ENDPOINTS.USERS}/${userId}`);
        setData(res.data.data);
      } catch (err) {
        console.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="relative z-10 w-full max-w-[480px] lg:max-w-[800px] h-full max-h-[85vh] bg-slate-50 rounded-[28px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-white/60 flex flex-col overflow-hidden transform-gpu m-auto"
        >
          {loading || !data ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-50">
              <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50 mb-4">
                <Loader2
                  size={28}
                  className="animate-spin text-blue-500"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Fetching Profile...
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-200/80 shrink-0 relative z-10 flex flex-col shadow-sm">
                {/* ✨ FIX: Using Flexbox to separate Content and Close Button natively */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-4 sm:gap-5 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-[20px] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white text-[20px] sm:text-[22px] font-bold shadow-sm border border-slate-700/50">
                      {data.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col pt-0.5 sm:pt-1 min-w-0">
                      <h2 className="text-[20px] sm:text-[24px] font-bold text-slate-900 tracking-tight leading-none truncate mb-1">
                        {data.full_name}
                      </h2>
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 flex items-center gap-1.5 tracking-tight truncate">
                        <User
                          size={14}
                          strokeWidth={1.5}
                          className="text-slate-400"
                        />{" "}
                        @{data.username}
                      </p>

                      <div className="mt-3 sm:mt-3.5 flex items-center gap-2">
                        <span
                          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${
                            data.is_active
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200/80"
                              : "bg-slate-100 text-slate-500 border-slate-200/80"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${data.is_active ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"}`}
                          />
                          {data.is_active ? "Active Status" : "Deactivated"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-100/80 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm active:scale-95 shrink-0"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-100/80">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Assigned Clearances
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {data.is_super_admin ? (
                      <span className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 text-white text-[11px] sm:text-[12px] font-semibold rounded-full flex items-center gap-1.5 shadow-sm">
                        <ShieldCheck size={14} strokeWidth={2} /> Super
                        Administrator
                      </span>
                    ) : data.assigned_roles &&
                      data.assigned_roles.length > 0 ? (
                      data.assigned_roles.map((r) => (
                        <span
                          key={r.role_id}
                          className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white border border-slate-200/80 text-slate-700 text-[11px] sm:text-[12px] font-semibold rounded-full shadow-sm flex items-center gap-1.5"
                        >
                          <Hash
                            size={12}
                            strokeWidth={2.5}
                            className="text-slate-400"
                          />
                          {r.role_name}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-rose-50 text-rose-600 border border-rose-200/80 text-[11px] sm:text-[12px] font-semibold rounded-full flex items-center gap-1.5 shadow-sm">
                        <ShieldAlert size={14} strokeWidth={2} /> No System
                        Access
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 sm:p-8 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex flex-nowrap items-center justify-between mb-5 sm:mb-6 gap-3 shrink-0">
                  <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-2.5 min-w-0 truncate">
                    <div className="p-1.5 rounded-md bg-blue-50 border border-blue-100/60 text-blue-600 shadow-sm flex items-center justify-center shrink-0">
                      <Activity size={14} strokeWidth={2} />
                    </div>
                    <span className="truncate">Activity Log</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white px-2.5 py-1 rounded-[8px] border border-slate-200/60 shadow-sm shrink-0 whitespace-nowrap">
                    Last 50 Events
                  </span>
                </div>

                <div className="space-y-2">
                  {!data.recent_activity ||
                  data.recent_activity.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-slate-200/80 rounded-[24px] bg-white flex flex-col items-center mt-2 shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <CalendarDays
                          size={20}
                          strokeWidth={1.5}
                          className="text-slate-400"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-900 tracking-tight">
                        No telemetry found
                      </p>
                      <p className="text-[13px] font-medium text-slate-500 mt-1">
                        This user hasn't modified any records yet.
                      </p>
                    </div>
                  ) : (
                    data.recent_activity.map((act) => {
                      const isInsert = act.action === "INSERT";
                      const isUpdate = act.action === "UPDATE";

                      return (
                        <div
                          key={act.id}
                          className="relative pl-8 before:absolute before:left-[15.5px] before:top-8 before:bottom-[-16px] before:w-[2px] before:bg-slate-200/80 last:before:hidden mb-5 group"
                        >
                          {/* Timeline Dot Icon */}
                          <div
                            className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-[3px] border-slate-50 flex items-center justify-center shadow-sm z-10 transition-colors ${
                              isInsert
                                ? "bg-emerald-100 text-emerald-600"
                                : isUpdate
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-rose-100 text-rose-600"
                            }`}
                          >
                            {isInsert ? (
                              <Plus size={14} strokeWidth={2.5} />
                            ) : isUpdate ? (
                              <Pencil size={12} strokeWidth={2.5} />
                            ) : (
                              <Trash2 size={12} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-sm hover:border-slate-300 transition-all ml-1">
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="text-[13px] sm:text-[14px] font-bold text-slate-800 tracking-tight truncate mb-1">
                                  {formatTableName(act.table_name)}
                                </p>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] font-medium text-slate-400 truncate mt-2">
                                  <span
                                    className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[6px] border ${
                                      isInsert
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : isUpdate
                                          ? "bg-blue-50 text-blue-600 border-blue-100"
                                          : "bg-rose-50 text-rose-600 border-rose-100"
                                    }`}
                                  >
                                    {isInsert
                                      ? "Created"
                                      : isUpdate
                                        ? "Modified"
                                        : "Deleted"}
                                  </span>
                                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 font-mono tracking-tighter truncate bg-slate-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {act.record_pk}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] sm:text-[12px] font-medium text-slate-400 whitespace-nowrap pt-0.5 tabular-nums flex items-center gap-1.5 shrink-0">
                                <Clock size={12} strokeWidth={1.5} />
                                {formatTimeAgo(act.changed_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default UserDetailModal;
