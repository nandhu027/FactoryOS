import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Cog,
  Loader2,
  Activity,
  Users,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Recycle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const formatQty = (num) =>
  Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const getStatusConfig = (status) => {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        style: "bg-emerald-50 text-emerald-600",
        dot: "bg-emerald-500",
      };
    case "UNDER_MAINTENANCE":
      return {
        label: "Maintenance",
        style: "bg-amber-50 text-amber-600",
        dot: "bg-amber-500",
      };
    case "INACTIVE":
    default:
      return {
        label: "Inactive",
        style: "bg-slate-50 text-slate-500",
        dot: "bg-slate-400",
      };
  }
};

const MachineDetailModal = ({ machineId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMachineDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/machines/${machineId}`);
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to load machine profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (machineId) fetchMachineDetails();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [machineId]);

  const activeJobs = (data?.operational_timeline || []).filter(
    (j) => j.step_status === "IN_PROGRESS" || j.step_status === "PLANNED",
  );

  const stat = getStatusConfig(data?.status);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-3 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-20 gap-3 sm:gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 border border-slate-700/50 shadow-sm flex items-center justify-center text-white shrink-0">
            <Cog size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 leading-none">
                Machine ID: {machineId}
              </span>
              {data && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none ${stat.style}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${stat.dot} ${data.status === "ACTIVE" ? "animate-pulse" : ""}`}
                  />
                  {stat.label}
                </span>
              )}
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {data ? data.machine_name : "Loading Machine..."}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 w-full sm:w-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-[8px] sm:rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        {loading && !data && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
              <Loader2
                size={24}
                className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                strokeWidth={1.5}
              />
            </div>
          </div>
        )}

        {!loading && data && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-slate-50/50"
            >
              <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="w-full flex flex-col h-full px-1.5 sm:px-2 pt-2">
                  <div className="px-2.5 sm:px-4 py-2 mb-1 flex justify-between items-center shrink-0">
                    <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} className="text-blue-500" /> Active
                      Operations
                    </h4>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm leading-none">
                      {activeJobs.length} PENDING
                    </span>
                  </div>

                  {activeJobs.length === 0 ? (
                    <div className="bg-white border border-slate-200/80 rounded-[20px] p-8 mx-2 sm:mx-4 flex flex-col items-center justify-center text-slate-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mt-2">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Clock size={20} strokeWidth={1.5} />
                      </div>
                      <p className="text-[14px] font-bold text-slate-900 tracking-tight">
                        Machine is Idle
                      </p>
                      <p className="text-[12px] font-medium mt-1 text-slate-500 text-center">
                        No active production batches assigned to this unit.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 px-1 sm:px-2">
                      {activeJobs.map((job, idx) => (
                        <div
                          key={job.step_id || idx}
                          className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-blue-200 hover:border-blue-300 transition-all flex flex-col gap-5 h-full"
                        >
                          <div className="flex justify-between items-start border-b border-slate-100/80 pb-4 gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2 truncate">
                                {job.step_name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/60 tracking-tight inline-block truncate max-w-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                  Batch: {job.batch_no}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                                  {job.step_status.replace("_", " ")}
                                </span>
                              </div>
                            </div>
                            {job.party_name && (
                              <div className="text-right shrink-0 max-w-[50%]">
                                <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-1.5 truncate">
                                  Client
                                </p>
                                <p className="text-[13px] font-semibold text-slate-700 truncate">
                                  {job.party_name}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="bg-slate-50/80 p-3 sm:p-4 rounded-[16px] border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                              <div className="flex flex-col p-2 sm:p-2.5 bg-white rounded-[12px] shadow-sm border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <ArrowDownCircle size={10} /> Consumed
                                </span>
                                <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums truncate">
                                  {formatQty(job.consumed_so_far)}{" "}
                                  <span className="text-[10px] text-slate-400 font-medium tracking-normal">
                                    / {formatQty(job.input_qty)} {job.input_uom}
                                  </span>
                                </span>
                              </div>
                              <div className="flex flex-col p-2 sm:p-2.5 bg-white rounded-[12px] shadow-sm border border-emerald-100">
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <ArrowUpCircle size={10} /> Yielded
                                </span>
                                <span className="text-[13px] sm:text-[14px] font-bold text-emerald-600 tabular-nums truncate">
                                  {formatQty(job.yielded_so_far)}
                                </span>
                              </div>
                              <div className="flex flex-col p-2 sm:p-2.5 bg-white rounded-[12px] shadow-sm border border-rose-100">
                                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Recycle size={10} /> Scrap
                                </span>
                                <span className="text-[13px] sm:text-[14px] font-bold text-rose-500 tabular-nums truncate">
                                  {formatQty(job.scrap_generated)}
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200/80 h-[6px] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-700"
                                style={{
                                  width: `${Math.min((Number(job.consumed_so_far) / Number(job.input_qty)) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 mt-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                              Active Operators
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {job.workers?.length > 0 ? (
                                job.workers.map((w, wIdx) => (
                                  <span
                                    key={wIdx}
                                    className="bg-white border border-slate-200/80 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-slate-700 flex items-center gap-2 shadow-sm"
                                  >
                                    <Users
                                      size={14}
                                      className="text-slate-400"
                                    />{" "}
                                    {w.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[12px] text-slate-400 italic font-medium bg-slate-50 px-3 py-1.5 rounded-[8px]">
                                  No operators assigned.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MachineDetailModal;
