import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Database,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  User,
  ChevronDown,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const DiffModal = memo(({ log, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const changes = useMemo(() => {
    if (!log) return [];
    const oldData = log.old_data || {};
    const newData = log.new_data || {};
    const allKeys = Array.from(
      new Set([...Object.keys(oldData), ...Object.keys(newData)]),
    );
    const ignoreList = [
      "id",
      "created_at",
      "updated_at",
      "deleted_at",
      "uuid",
      "password",
    ];

    return allKeys
      .filter((key) => !ignoreList.includes(key))
      .map((key) => {
        const oldValue = oldData[key];
        const newValue = newData[key];
        const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

        const formatVal = (val) => {
          if (val === null || val === undefined)
            return (
              <span className="text-slate-400 italic font-normal">None</span>
            );
          if (typeof val === "boolean")
            return val ? (
              <span className="text-emerald-600 flex items-center gap-1">
                True <CheckCircle2 size={12} />
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                False <XCircle size={12} />
              </span>
            );
          return String(val);
        };

        const humanKey = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        return {
          key: humanKey,
          oldValue: formatVal(oldValue),
          newValue: formatVal(newValue),
          isChanged,
        };
      })
      .filter((item) => log.action !== "UPDATE" || item.isChanged);
  }, [log]);

  if (!log) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm sm:backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="relative z-10 w-full max-w-2xl bg-slate-50 rounded-[20px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] border border-white/60 flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[85vh]"
      >
        <div className="px-4 sm:px-8 py-3.5 sm:py-6 bg-white border-b border-slate-200/80 flex justify-between items-start flex-shrink-0 shadow-sm relative z-10">
          <div className="flex gap-3 sm:gap-4 items-center sm:items-start min-w-0">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-2xl flex items-center justify-center shadow-sm border shrink-0 ${
                log.action === "INSERT"
                  ? "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                  : log.action === "UPDATE"
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-rose-50 border-rose-200/60 text-rose-600"
              }`}
            >
              {log.action === "INSERT" ? (
                <Plus size={18} className="sm:w-6 sm:h-6" strokeWidth={2} />
              ) : log.action === "UPDATE" ? (
                <Pencil size={18} className="sm:w-6 sm:h-6" strokeWidth={1.5} />
              ) : (
                <Trash2 size={18} className="sm:w-6 sm:h-6" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-tight truncate">
                {log.action === "INSERT"
                  ? "New Record Created"
                  : log.action === "UPDATE"
                    ? "Record Updated"
                    : "Record Deleted"}
              </h2>
              <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 tracking-tight mt-0.5 truncate">
                System Activity Log
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-95 border border-slate-200/60 shrink-0 ml-2"
          >
            <X size={16} className="sm:w-5 sm:h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 [-webkit-overflow-scrolling:touch]">
          <div className="bg-white border border-slate-200/80 p-3.5 sm:p-5 rounded-[16px] sm:rounded-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3 min-w-0">
            <h3 className="text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2.5 sm:pb-3">
              <FileText size={14} className="text-slate-400 sm:w-4 sm:h-4" />{" "}
              Event Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  Action By User
                </span>
                <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold text-slate-900 min-w-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User size={10} className="sm:w-3 sm:h-3" strokeWidth={2} />
                  </div>
                  <span className="truncate">
                    {log.changed_by_name || "System Automated"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  Date & Time
                </span>
                <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold text-slate-900 tabular-nums min-w-0">
                  <Clock
                    size={12}
                    className="text-slate-400 sm:w-3.5 sm:h-3.5 shrink-0"
                  />
                  <span className="truncate">
                    {new Date(log.changed_at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 sm:mt-1 min-w-0">
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  Target Location
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-semibold text-slate-900">
                  <Database
                    size={12}
                    className="text-slate-400 sm:w-3.5 sm:h-3.5 shrink-0"
                  />
                  <span className="truncate">Table: </span>
                  <span className="text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-100 truncate max-w-[120px] sm:max-w-none">
                    {log.table_name}
                  </span>
                  <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">
                    •
                  </span>
                  <span className="truncate">ID: </span>
                  <span className="font-mono text-slate-600 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[100px] sm:max-w-none">
                    {log.record_pk}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3 min-w-0">
            <h3 className="text-[10px] sm:text-[12px] font-bold text-slate-500 uppercase tracking-widest px-1 truncate">
              Modifications ({changes.length})
            </h3>
            {changes.length === 0 ? (
              <div className="p-6 sm:p-10 text-center bg-white rounded-[16px] sm:rounded-3xl border border-dashed border-slate-200 shadow-sm">
                <p className="text-slate-500 text-[12px] sm:text-[14px] font-medium">
                  No viewable property changes recorded.
                </p>
              </div>
            ) : (
              changes.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/60 rounded-[12px] sm:rounded-[20px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-w-0"
                >
                  <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50/80 border-b border-slate-100/80 text-[9.5px] sm:text-[11px] font-bold text-slate-600 tracking-wide uppercase flex min-w-0">
                    <span className="shrink-0 mr-1">Field: </span>
                    <span className="text-blue-600 truncate">{item.key}</span>
                  </div>
                  <div className="p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                    {log.action === "INSERT" ? (
                      <div className="w-full min-w-0 flex flex-col">
                        <div className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase mb-1 sm:mb-1.5 truncate">
                          Initial Data
                        </div>
                        <div className="w-full text-[12px] sm:text-[14px] font-medium text-slate-800 bg-emerald-50/50 px-2.5 sm:px-4 py-2 sm:py-3 rounded-[8px] sm:rounded-xl border border-emerald-200/60 overflow-x-auto scrollbar-hide">
                          {item.newValue}
                        </div>
                      </div>
                    ) : log.action === "DELETE" ? (
                      <div className="w-full min-w-0 flex flex-col">
                        <div className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase mb-1 sm:mb-1.5 truncate">
                          Deleted Data
                        </div>
                        <div className="w-full text-[12px] sm:text-[14px] font-medium text-slate-500 bg-rose-50/50 px-2.5 sm:px-4 py-2 sm:py-3 rounded-[8px] sm:rounded-xl border border-rose-200/60 line-through overflow-x-auto scrollbar-hide">
                          {item.oldValue}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 uppercase mb-1 sm:mb-1.5 truncate">
                            Previous Data
                          </div>
                          <div className="text-[12px] sm:text-[13px] font-medium text-slate-500 bg-slate-50 px-2.5 sm:px-4 py-2 sm:py-3 rounded-[8px] sm:rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-hide whitespace-nowrap line-through decoration-rose-400/60">
                            {item.oldValue}
                          </div>
                        </div>
                        <div className="flex justify-center sm:block py-0.5 sm:py-0 sm:pt-5 text-slate-300 shrink-0">
                          <ArrowRight
                            size={16}
                            className="rotate-90 sm:rotate-0 sm:w-[18px] sm:h-[18px]"
                            strokeWidth={2.5}
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="text-[9.5px] sm:text-[10px] font-bold text-emerald-600 uppercase mb-1 sm:mb-1.5 truncate">
                            New Data
                          </div>
                          <div className="text-[12px] sm:text-[13px] font-semibold text-slate-900 bg-emerald-50/50 px-2.5 sm:px-4 py-2 sm:py-3 rounded-[8px] sm:rounded-xl border border-emerald-200/60 shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)] overflow-x-auto scrollbar-hide whitespace-nowrap">
                            {item.newValue}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-4 sm:px-8 py-3 sm:py-5 bg-white border-t border-slate-200/80 flex justify-end shrink-0 z-10 rounded-b-[20px] sm:rounded-b-[32px]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-slate-900 text-white rounded-[12px] sm:rounded-full text-[13px] sm:text-[14px] font-semibold hover:bg-slate-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:scale-95"
          >
            Close View
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
});

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");

  const [meta, setMeta] = useState({
    page: 1,
    limit: 7,
    total_pages: 1,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    action: "",
    table_name: "",
  });

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (targetPage, currentFilters) => {
    setLoading(true);
    setLogs([]);

    try {
      const query = new URLSearchParams({
        ...currentFilters,
        page: targetPage,
        limit: 7,
      }).toString();

      const res = await api.get(`/audit-logs?${query}`);
      setLogs(res.data.data || res.data || []);
      if (res.data.meta) {
        setMeta(res.data.meta);
      }
    } catch (err) {
      toast.error("Audit history sync failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await api.get("/audit-logs/tables");
        setTables(res.data.data || []);
      } catch (err) {
        console.error("Failed to load tables");
      }
    };
    fetchTables();
  }, []);

  useEffect(() => {
    fetchLogs(meta.page, filters);
  }, [meta.page, filters, fetchLogs]);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setFilters((prev) => ({ ...prev, search: localSearch }));
      setMeta((prev) => ({ ...prev, page: 1 }));
    }
  };

  const getActionConfig = (action) => {
    switch (action) {
      case "INSERT":
        return {
          label: "Insert",
          style: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          icon: Plus,
        };
      case "UPDATE":
        return {
          label: "Update",
          style: "bg-blue-50 text-blue-700 border-blue-200/60",
          icon: Pencil,
        };
      case "DELETE":
        return {
          label: "Delete",
          style: "bg-rose-50 text-rose-700 border-rose-200/60",
          icon: Trash2,
        };
      default:
        return {
          label: action,
          style: "bg-slate-50 text-slate-700 border-slate-200/60",
          icon: Activity,
        };
    }
  };

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2"
        >
          <div className="flex-shrink-0 mt-1 min-w-0">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 truncate">
              Audit Logs
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              <span className="truncate">
                Security &bull; Integrity History
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:flex-1 xl:ml-8 min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative group flex-1 w-full min-w-[150px]"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search record IDs or users..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.trim() === "") {
                    setFilters((prev) => ({ ...prev, search: "" }));
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit(e);
                }}
                className="w-full h-[40px] sm:h-[44px] pl-10 sm:pl-11 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" />
            </form>
            <div className="flex flex-row items-center gap-3 w-full sm:w-auto shrink-0 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <div className="relative group flex-1 sm:min-w-[150px] shrink-0 h-[40px] sm:h-[44px]">
                <select
                  value={filters.action}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, action: e.target.value }));
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full appearance-none h-full pl-3 sm:pl-4 pr-8 sm:pr-9 bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[11px] sm:text-[13px] font-semibold text-slate-700 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none cursor-pointer truncate"
                >
                  <option value="">All Actions</option>
                  <option value="INSERT">Insert</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
                <ChevronDown
                  className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                  strokeWidth={2.5}
                />
              </div>

              <div className="relative group flex-1 sm:min-w-[160px] shrink-0 h-[40px] sm:h-[44px]">
                <select
                  value={filters.table_name}
                  onChange={(e) => {
                    setFilters((p) => ({ ...p, table_name: e.target.value }));
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full appearance-none h-full pl-3 sm:pl-4 pr-8 sm:pr-9 bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[11px] sm:text-[13px] font-semibold text-slate-700 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none cursor-pointer truncate"
                >
                  <option value="">All Tables</option>
                  {tables.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            {/* Desktop Header - Floating Style with Fixed Gaps */}
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
              <div className="w-[20%]">Timestamp</div>
              <div className="w-[15%] flex justify-center">Action</div>
              <div className="w-[30%]">Target Record</div>
              <div className="w-[20%]">Modified By</div>
              <div className="w-[15%] text-right pr-2">Activity</div>
            </div>

            {loading ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                  <Loader2
                    size={24}
                    className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${logs.length === 0 ? "flex-1" : ""} overflow-y-auto`}
              >
                {logs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Database
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      No logs found
                    </h3>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-sm text-center px-4">
                      No activity matches your current search or filter
                      parameters.
                    </p>
                  </div>
                ) : (
                  logs.map((log) => {
                    const act = getActionConfig(log.action);
                    const ActionIcon = act.icon;

                    return (
                      <div
                        key={log.id}
                        className="group flex flex-col w-full shrink-0"
                      >
                        {/* === APP-LIKE MOBILE VIEW (ISOLATED CARD) === */}
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md rounded-[16px] sm:rounded-[20px] p-4 transition-all duration-300 min-w-0">
                          <div className="flex justify-between items-start gap-3 sm:gap-4 mb-3">
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                              <div
                                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] flex items-center justify-center shadow-sm shrink-0 border ${act.style}`}
                              >
                                <ActionIcon
                                  size={18}
                                  strokeWidth={1.5}
                                  className="sm:w-[20px] sm:h-[20px]"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                  {log.table_name}
                                </h4>
                                <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                                  ID: {log.record_pk}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-[6px] border shrink-0 mt-0.5 shadow-sm ${act.style}`}
                            >
                              {act.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100/80 gap-2">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 truncate">
                                <Calendar
                                  size={12}
                                  strokeWidth={2}
                                  className="shrink-0"
                                />
                                <span className="truncate">
                                  {new Date(log.changed_at).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </span>
                              <span className="text-[11px] sm:text-[12px] font-bold text-slate-700 flex items-center gap-1.5 mt-1 truncate">
                                <User
                                  size={12}
                                  strokeWidth={2}
                                  className="text-slate-400 shrink-0"
                                />
                                <span className="truncate">
                                  {log.changed_by_name || "System"}
                                </span>
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-[11px] sm:text-[12px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[8px] sm:rounded-[10px] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-blue-100/50 whitespace-nowrap shrink-0"
                            >
                              <Eye
                                size={14}
                                strokeWidth={2.5}
                                className="sm:w-[16px] sm:h-[16px]"
                              />{" "}
                              View
                            </button>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                          <div className="w-[20%]">
                            <span className="text-[12px] font-bold text-slate-700 flex items-center gap-2">
                              <Calendar
                                size={14}
                                className="text-slate-400"
                                strokeWidth={2}
                              />
                              {new Date(log.changed_at).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>

                          <div className="w-[15%] flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-widest border shadow-sm ${act.style}`}
                            >
                              <ActionIcon size={12} strokeWidth={2.5} />
                              {act.label}
                            </span>
                          </div>

                          <div className="w-[30%] min-w-0 pr-4">
                            <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                              {log.table_name}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                              ID: {log.record_pk}
                            </p>
                          </div>

                          <div className="w-[20%] min-w-0 pr-4">
                            <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-2 truncate">
                              <User
                                size={14}
                                className="text-slate-400 shrink-0"
                                strokeWidth={2}
                              />
                              <span className="truncate">
                                {log.changed_by_name || "System"}
                              </span>
                            </span>
                          </div>

                          <div className="w-[15%] text-right flex items-center justify-end shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="View Details"
                            >
                              <Eye size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {!loading && logs.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0 border-t border-slate-100 lg:border-none">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {(meta.page - 1) * meta.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {Math.min(meta.page * meta.limit, meta.total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {meta.total}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {meta.page} of {meta.total_pages || 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchLogs(meta.page - 1, filters)}
                      disabled={meta.page <= 1}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {meta.page} of {meta.total_pages || 1}
                      </span>
                    </div>
                    <button
                      onClick={() => fetchLogs(meta.page + 1, filters)}
                      disabled={meta.page >= (meta.total_pages || 1)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedLog && (
          <DiffModal log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogsPage;
