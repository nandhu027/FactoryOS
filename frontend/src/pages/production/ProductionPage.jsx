import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Factory,
  Plus,
  Loader2,
  Search,
  CalendarDays,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  Eye,
  Settings2,
  PlayCircle,
} from "lucide-react";
import CreateProductionModal from "./CreateProductionModal";
import ProductionExecution from "./ProductionExecution";

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const LoadingScreen = () => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/60 backdrop-blur-[2px]">
    <div className="p-4 sm:p-5 bg-white/90 backdrop-blur-3xl rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
      <Loader2
        size={28}
        className="animate-spin text-blue-500"
        strokeWidth={1.5}
      />
    </div>
  </div>
);

const ProductionPage = () => {
  const navigate = useNavigate();
  const [productions, setProductions] = useState([]);
  const [selectedProd, setSelectedProd] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    date_filter: "MONTH",
    custom_start: "",
    custom_end: "",
  });
  const [localSearch, setLocalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(localSearch), 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const fetchProductions = useCallback(
    async (isBackground = false, isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else if (!isBackground) setIsFetching(true);

      setError(null);
      try {
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (filters.date_filter !== "ALL")
          params.date_filter = filters.date_filter;
        if (filters.date_filter === "CUSTOM") {
          if (filters.custom_start) params.custom_start = filters.custom_start;
          if (filters.custom_end) params.custom_end = filters.custom_end;
        }

        const res = await api.get("/production", { params });

        let activeBatches = [];
        if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
          activeBatches = res.data.data.data;
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          activeBatches = res.data.data;
        } else if (Array.isArray(res.data)) {
          activeBatches = res.data;
        }

        setProductions(activeBatches);

        if (selectedProd && selectedProd.id) {
          try {
            const detailRes = await api.get(`/production/${selectedProd.id}`);
            const fullProdData = detailRes.data?.data || selectedProd;
            fullProdData.steps = fullProdData.steps || [];
            setSelectedProd((prev) =>
              prev?.id === fullProdData.id ? fullProdData : prev,
            );
          } catch (detailErr) {}
        }
      } catch (error) {
        if (!isBackground) {
          setError("Failed to load factory floor data");
          toast.error("Failed to load factory floor data");
        }
      } finally {
        setIsFetching(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, filters, selectedProd],
  );

  useEffect(() => {
    fetchProductions(false);
  }, [
    debouncedSearch,
    filters.date_filter,
    filters.custom_start,
    filters.custom_end,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProductions(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchProductions]);

  const handleSelectProduction = async (prod) => {
    setIsDetailLoading(true);
    setSelectedProd(prod);
    try {
      const res = await api.get(`/production/${prod.id}`);
      const fullProdData = res.data?.data || prod;
      fullProdData.steps = fullProdData.steps || [];
      setSelectedProd(fullProdData);
    } catch (err) {
      toast.error("Failed to load routing map");
      setSelectedProd(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setDebouncedSearch(localSearch);
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
          className={`flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 shrink-0 w-full ${
            selectedProd ? "hidden" : "flex"
          }`}
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 flex items-center gap-2.5 sm:gap-3">
              Production Floor
              <button
                type="button"
                onClick={() => fetchProductions(false, true)}
                className={`p-1.5 sm:p-2 bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:bg-slate-50 rounded-full transition-all active:scale-95 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                title="Refresh Floor Data"
              >
                <RefreshCw
                  size={16}
                  className="text-slate-600"
                  strokeWidth={2.5}
                />
              </button>
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              Batch Management &bull; Live Sync
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative group flex-1 w-full min-w-[200px]"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search batch or party..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.trim() === "") setDebouncedSearch("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit(e);
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" aria-hidden="true" />
            </form>

            <div className="flex flex-col sm:flex-row lg:flex-row gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="w-full sm:w-[180px] shrink-0 relative">
                <CalendarDays
                  size={15}
                  strokeWidth={2}
                  className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"
                />
                <select
                  value={filters.date_filter}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date_filter: e.target.value }))
                  }
                  className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-8 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-700 outline-none appearance-none cursor-pointer focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="WEEK">This Week</option>
                  <option value="MONTH">This Month</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 shrink-0 whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2} className="text-white/90" />
                Plan Batch
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {!selectedProd && filters.date_filter === "CUSTOM" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col sm:flex-row gap-2 px-2 sm:px-0 -mt-1 sm:-mt-4 mb-2 justify-end"
            >
              <input
                type="date"
                value={filters.custom_start}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, custom_start: e.target.value }))
                }
                className="h-[38px] px-3 bg-white border border-slate-200/80 rounded-[10px] text-[12px] font-semibold text-slate-700 outline-none shadow-sm cursor-pointer focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <input
                type="date"
                value={filters.custom_end}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, custom_end: e.target.value }))
                }
                className="h-[38px] px-3 bg-white border border-slate-200/80 rounded-[10px] text-[12px] font-semibold text-slate-700 outline-none shadow-sm cursor-pointer focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          {selectedProd ? (
            <div className="flex flex-col flex-1 w-full bg-white border border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[16px] sm:rounded-[24px] overflow-hidden relative">
              {isDetailLoading && <LoadingScreen />}

              <div className="px-3 sm:px-5 py-3 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setSelectedProd(null)}
                  className="flex items-center gap-1.5 px-3 py-2 -ml-2 rounded-[10px] text-slate-700 font-bold text-[13px] hover:bg-slate-200/60 transition-colors active:scale-95"
                >
                  <ArrowLeft size={16} strokeWidth={2.5} />
                  Back to Floor
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white border border-slate-200/60 px-3 py-1.5 rounded-[8px] shadow-sm">
                    {selectedProd.business_model === "JOB_WORK"
                      ? "Job Work"
                      : "Own Mfg"}
                  </span>
                  <span className="text-[12px] font-bold text-slate-900 bg-slate-200/50 px-3 py-1.5 rounded-[8px]">
                    {selectedProd.batch_no}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/30">
                <ProductionExecution
                  prodId={selectedProd.id}
                  onActionComplete={() => {
                    setSelectedProd(null);
                    fetchProductions(true);
                  }}
                  onRefreshList={() => fetchProductions(true)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col w-full min-h-0">
              <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                <div className="w-[120px]">Batch No</div>
                <div className="flex-1 min-w-[200px]">Profile</div>
                <div className="w-[200px]">Progress Status</div>
                <div className="w-[140px]">Current Phase</div>
                <div className="w-[120px] text-right pr-2">Execution</div>
              </div>

              {isFetching ? (
                <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                  <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-500"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${productions.length === 0 ? "flex-1" : ""} overflow-y-auto`}
                >
                  {productions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Factory
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-400"
                        />
                      </div>
                      <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                        Floor is Empty
                      </p>
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm text-center px-4">
                        Adjust your filters or plan a new batch to start
                        tracking production.
                      </p>
                    </div>
                  ) : (
                    productions.map((prod) => {
                      if (!prod) return null;

                      const totalSteps = prod.total_steps || 0;
                      const completedSteps = prod.completed_steps || 0;
                      const status = prod.status || "PENDING";
                      const progressPct =
                        totalSteps > 0
                          ? Math.round((completedSteps / totalSteps) * 100)
                          : 0;

                      return (
                        <div
                          key={prod.id}
                          className="group flex flex-col w-full shrink-0"
                        >
                          <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-5">
                            <div className="flex justify-between items-start gap-4 mb-3">
                              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                                <div
                                  className={`w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm shrink-0 border ${prod.business_model === "JOB_WORK" ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-900 border-slate-700 text-white"}`}
                                >
                                  <Settings2 size={18} strokeWidth={2} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                    {prod.batch_no}
                                  </h4>
                                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate mt-0.5">
                                    {prod.business_model === "JOB_WORK"
                                      ? "Job Work"
                                      : "Own Mfg"}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 rounded-[6px] border shrink-0 whitespace-nowrap shadow-sm ${
                                  status === "COMPLETED"
                                    ? "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                                    : status === "CANCELLED"
                                      ? "bg-rose-50 border-rose-200/60 text-rose-500"
                                      : status === "IN_PROGRESS"
                                        ? "bg-blue-50 border-blue-200/60 text-blue-600"
                                        : "bg-slate-50 border-slate-200/80 text-slate-500"
                                }`}
                              >
                                {status === "IN_PROGRESS" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                )}
                                {status.replace("_", " ")}
                              </span>
                            </div>

                            <div className="w-full bg-slate-50 border border-slate-100 rounded-[10px] p-2.5 mb-3">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-0.5">
                                <span>Progress</span>
                                <span>{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-700 ease-out ${status === "COMPLETED" ? "bg-emerald-500" : status === "CANCELLED" ? "bg-rose-500" : "bg-slate-900"}`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                              <span className="text-[11px] font-medium text-slate-500">
                                {completedSteps} of {totalSteps} Steps
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectProduction(prod);
                                }}
                                className="text-[12px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-[10px] transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 border border-blue-100/50"
                              >
                                {status === "COMPLETED" ? (
                                  <Eye size={14} />
                                ) : (
                                  <PlayCircle size={14} />
                                )}
                                {status === "COMPLETED"
                                  ? "View Report"
                                  : "Execute Run"}
                              </button>
                            </div>
                          </div>
                          <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                            <div className="w-[120px]">
                              <span className="text-[13px] font-bold text-slate-900">
                                {prod.batch_no}
                              </span>
                            </div>

                            <div className="flex-1 min-w-[200px] flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-[13px] shadow-sm shrink-0 border ${prod.business_model === "JOB_WORK" ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-100 border-slate-200 text-slate-700"}`}
                              >
                                <Settings2 size={14} strokeWidth={2.5} />
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                {prod.business_model === "JOB_WORK"
                                  ? "Job Work Mfg"
                                  : "In-House Mfg"}
                              </span>
                            </div>

                            <div className="w-[200px] flex flex-col justify-center gap-1.5">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-0.5">
                                <span>
                                  {completedSteps} / {totalSteps} Steps
                                </span>
                                <span>{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 border border-slate-200/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-700 ease-out ${status === "COMPLETED" ? "bg-emerald-500" : status === "CANCELLED" ? "bg-rose-500" : "bg-slate-900"}`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>

                            <div className="w-[140px] flex items-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  status === "COMPLETED"
                                    ? "bg-emerald-50 border border-emerald-200/60 text-emerald-600"
                                    : status === "CANCELLED"
                                      ? "bg-rose-50 border border-rose-200/60 text-rose-500"
                                      : status === "IN_PROGRESS"
                                        ? "bg-blue-50 border border-blue-200/60 text-blue-600"
                                        : "bg-slate-50 border border-slate-200/80 text-slate-500"
                                }`}
                              >
                                {status === "IN_PROGRESS" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                )}
                                {status.replace("_", " ")}
                              </span>
                            </div>

                            <div className="w-[120px] text-right flex items-center justify-end pr-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectProduction(prod);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50 rounded-[8px] transition-all active:scale-95 shadow-sm"
                              >
                                {status === "COMPLETED" ? (
                                  <Eye size={14} />
                                ) : (
                                  <PlayCircle size={14} />
                                )}
                                {status === "COMPLETED" ? "View" : "Open"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {isCreateOpen && (
          <CreateProductionModal
            onClose={() => setIsCreateOpen(false)}
            onSuccess={() => {
              setIsCreateOpen(false);
              fetchProductions(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductionPage;
