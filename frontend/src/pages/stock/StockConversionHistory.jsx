import { useState, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Loader2,
  RefreshCcw,
  Calendar,
  User,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const HistoryCard = memo(({ record }) => {
  return (
    <div
      style={{ contentVisibility: "auto", containIntrinsicSize: "220px" }}
      className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative overflow-hidden transform-gpu"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 pb-3 border-b border-slate-100/80 gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-[8px] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border shadow-sm ${
              record.ownership_type === "OWN"
                ? "bg-slate-50 text-slate-600 border-slate-200/80"
                : "bg-blue-50 text-blue-700 border-blue-200/80"
            }`}
          >
            {record.ownership_type.replace("_", " ")}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 tabular-nums bg-slate-50/50 px-2 py-1 rounded-[6px] border border-slate-100">
            <Calendar size={12} strokeWidth={2} className="text-slate-400" />{" "}
            {new Date(record.conversion_date).toLocaleDateString()}
          </span>
          {record.party_name && (
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 flex items-center gap-1 bg-slate-50/50 px-2 py-1 rounded-[6px] border border-slate-100 truncate max-w-[150px] sm:max-w-none">
              <User
                size={12}
                strokeWidth={2}
                className="text-slate-400 shrink-0"
              />{" "}
              <span className="truncate">{record.party_name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-[6px] border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            #{record.id}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 w-full">
        <div className="flex-1 w-full rounded-[14px] sm:rounded-[16px] p-3.5 sm:p-4 border shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] bg-slate-50/80 border-slate-200/60">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-slate-400">
            Consumed ({record.source_item_kind.replace("_", " ")})
          </p>
          <p className="text-[13px] sm:text-[14px] font-bold line-clamp-2 sm:truncate mb-1.5 tracking-tight leading-snug text-slate-900">
            {record.source_name}
          </p>
          <p className="text-[15px] sm:text-[16px] font-black tabular-nums text-rose-600">
            -{Number(record.source_qty)}{" "}
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ml-0.5 text-rose-400">
              {record.source_uom}
            </span>
          </p>
        </div>

        <div className="flex items-center justify-center py-1 sm:py-0 px-0 sm:px-1 shrink-0">
          <ArrowRight
            size={20}
            strokeWidth={2.5}
            className="text-slate-300 rotate-90 sm:rotate-0"
          />
        </div>

        <div className="flex-1 w-full rounded-[14px] sm:rounded-[16px] p-3.5 sm:p-4 border shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] bg-emerald-50/30 border-emerald-100/60">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-emerald-600">
            Produced ({record.target_item_kind.replace("_", " ")})
          </p>
          <p className="text-[13px] sm:text-[14px] font-bold line-clamp-2 sm:truncate mb-1.5 tracking-tight leading-snug text-slate-900">
            {record.target_name}
          </p>
          <p className="text-[15px] sm:text-[16px] font-black tabular-nums text-emerald-600">
            +{Number(record.target_qty)}{" "}
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ml-0.5 text-emerald-500">
              {record.target_uom}
            </span>
          </p>
        </div>
      </div>

      {record.remarks && (
        <div className="mt-3.5 sm:mt-4 pt-3.5 sm:pt-4 border-t border-slate-100/80">
          <p className="text-[11px] sm:text-[12px] font-medium text-slate-600 leading-relaxed bg-slate-50 p-2.5 sm:p-3 rounded-[10px] sm:rounded-[12px] border border-slate-100">
            <span className="font-bold text-slate-400 mr-1.5 uppercase tracking-widest text-[9px]">
              Note:
            </span>
            {record.remarks}
          </p>
        </div>
      )}
    </div>
  );
});

HistoryCard.displayName = "HistoryCard";

const StockConversionHistory = ({ onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownershipFilter, setOwnershipFilter] = useState("ALL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      setMounted(false);
      document.body.style.overflow = "";
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/stock/conversions?ownership_type=${ownershipFilter === "ALL" ? "" : ownershipFilter}`,
      );
      setHistory(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch history");
      toast.error("Failed to load conversion history");
    } finally {
      setLoading(false);
    }
  }, [ownershipFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer transform-gpu"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="relative z-10 bg-slate-50 w-full max-w-[850px] max-h-[90vh] rounded-[24px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/60 m-auto transform-gpu will-change-transform"
        >
          <div className="bg-white px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-200/80 shrink-0 z-20 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
                  <RefreshCcw
                    size={20}
                    strokeWidth={2}
                    className="sm:w-[28px] sm:h-[28px]"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[18px] sm:text-[22px] font-bold text-slate-900 tracking-tight leading-tight mb-0.5 truncate">
                    Conversion History
                  </h2>
                  <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate">
                    Drill-down of direct manual stock transformations.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-95 border border-slate-200/60 shadow-sm shrink-0"
              >
                <X size={18} strokeWidth={2} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:flex bg-slate-100/80 p-1.5 rounded-[12px] sm:rounded-[14px] border border-slate-200/60 w-full sm:w-fit shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] gap-1 sm:gap-0">
              {["ALL", "OWN", "JOB_WORK"].map((type) => (
                <button
                  key={type}
                  onClick={() => setOwnershipFilter(type)}
                  className={`py-2.5 sm:py-2 sm:px-6 rounded-[8px] sm:rounded-[10px] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all outline-none truncate ${
                    ownershipFilter === type
                      ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-800 border border-transparent"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transform-gpu will-change-scroll">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50 mb-4">
                  <Loader2
                    className="animate-spin text-blue-500"
                    size={28}
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-white border border-dashed border-slate-200 rounded-[24px] shadow-sm">
                <div className="w-14 h-14 bg-slate-50 rounded-[16px] flex items-center justify-center mb-4 border border-slate-200/60 shadow-sm">
                  <RefreshCcw
                    size={24}
                    strokeWidth={1.5}
                    className="text-slate-400"
                  />
                </div>
                <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">
                  No data available
                </h3>
                <p className="text-[13px] font-medium text-slate-500 mt-1 max-w-sm">
                  No data available for selected range.
                </p>
              </div>
            ) : (
              <div className="space-y-4 relative">
                {history.map((record) => (
                  <HistoryCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 sm:px-8 py-3.5 sm:py-5 bg-white border-t border-slate-200/80 flex justify-end shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white rounded-[14px] sm:rounded-full text-[13px] sm:text-[14px] font-semibold hover:bg-slate-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:scale-95"
            >
              Close View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default StockConversionHistory;
