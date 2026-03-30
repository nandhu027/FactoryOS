import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Loader2,
  Users,
  Truck,
  Cog,
  HardHat,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Wrench,
  Search,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Layers,
  X,
  Recycle,
  ArrowLeftRight,
} from "lucide-react";
import api from "../../api/axios";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const diffInMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const hrs = Math.floor(diffInMins / 60);
  const mins = Math.floor(diffInMins % 60);
  if (hrs < 24) return `${hrs}h ${mins}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatTime = (minutes) => {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hrs}h ${mins}m`;
};

const formatQty = (num) =>
  Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const BaseCard = ({ children, className = "", onClick, clickable }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-slate-200/80 shadow-sm transition-all duration-500 rounded-[24px] sm:rounded-[28px] relative flex flex-col w-full min-h-0 ${clickable || onClick ? "cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 active:scale-[0.98]" : "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"} ${className}`}
  >
    {children}
  </div>
);
const MachineInsightsModal = ({ machine, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="relative z-10 w-full max-w-5xl bg-slate-50 rounded-[28px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] border border-white/60 flex flex-col overflow-hidden max-h-[90vh] m-auto"
      >
        <div className="px-6 py-5 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-sm relative z-10 shrink-0">
          <div className="flex items-center gap-4 pr-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shadow-sm shrink-0">
              <Cog size={20} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col min-w-0 pt-0.5">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/80 px-2 py-0.5 rounded-[6px] border border-slate-200/60 shrink-0">
                  NODE: {machine.machine_id}
                </span>
                {machine.is_active ? (
                  <>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${machine.has_stuck ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"}`}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 shrink-0">
                      {machine.active_jobs.length} Active{" "}
                      {machine.active_jobs.length === 1 ? "Job" : "Jobs"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)] shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">
                      Idle
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-tight truncate">
                {machine.machine_name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm active:scale-95 shrink-0"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {machine.is_active ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {machine.active_jobs.map((job, idx) => (
                <div
                  key={job.step_id || idx}
                  className="bg-white p-5 sm:p-6 rounded-[24px] shadow-sm border border-slate-200/80 flex flex-col gap-6 h-full justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300"
                >
                  <div className="space-y-5">
                    <div className="flex justify-between items-start border-b border-slate-100/80 pb-4 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2 truncate">
                          {job.step_name}
                        </p>
                        <span className="text-[13px] font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-[10px] border border-slate-200/60 tracking-tight inline-block truncate max-w-full">
                          Batch: {job.batch_no}
                        </span>
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
                    <div className="flex flex-col gap-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                          <ArrowDownCircle
                            size={16}
                            className="text-slate-500"
                            strokeWidth={2}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Consuming
                          </p>
                          <p className="text-[13px] font-semibold text-slate-800 line-clamp-2 leading-snug">
                            {job.input_item || "Raw Material"}
                          </p>
                        </div>
                      </div>
                      <div className="w-px h-5 bg-slate-200 ml-4 hidden sm:block"></div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                          <ArrowUpCircle
                            size={16}
                            className="text-white"
                            strokeWidth={2}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            Producing
                          </p>
                          <p className="text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug">
                            {job.target_output_items || "WIP"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50/80 p-4 rounded-[16px] border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] mt-1">
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="flex flex-col p-2.5 bg-white rounded-[12px] shadow-sm border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <ArrowDownCircle size={10} /> Consumed
                          </span>
                          <span className="text-[14px] font-bold text-slate-900 tabular-nums truncate">
                            {formatQty(job.consumed_so_far)}{" "}
                            <span className="text-[10px] text-slate-400 font-medium tracking-normal">
                              / {formatQty(job.input_qty)}
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-col p-2.5 bg-white rounded-[12px] shadow-sm border border-emerald-100">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <ArrowUpCircle size={10} /> Yielded
                          </span>
                          <span className="text-[14px] font-bold text-emerald-600 tabular-nums truncate">
                            {formatQty(job.yielded_so_far)}
                          </span>
                        </div>
                        <div className="flex flex-col p-2.5 bg-white rounded-[12px] shadow-sm border border-rose-100">
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Recycle size={10} /> Scrap
                          </span>
                          <span className="text-[14px] font-bold text-rose-500 tabular-nums truncate">
                            {formatQty(job.scrap_generated)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200/80 h-[6px] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${job.is_stuck ? "bg-rose-500" : "bg-slate-900"}`}
                          style={{
                            width: `${Math.min((Number(job.consumed_so_far) / Number(job.input_qty)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 mt-auto">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                      Active Operators
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.active_team?.length > 0 ? (
                        job.active_team.map((op) => (
                          <span
                            key={op.id}
                            className="bg-white border border-slate-200/80 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-slate-700 flex items-center gap-2 shadow-sm"
                          >
                            <Users size={14} className="text-slate-400" />{" "}
                            {op.name}
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 min-h-[250px]">
              <div className="w-16 h-16 bg-white border border-slate-200/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Clock size={28} strokeWidth={1.5} className="text-slate-300" />
              </div>
              <p className="text-[18px] font-bold text-slate-900 tracking-tight text-center">
                Machine is currently idle.
              </p>
              <p className="text-[14px] mt-1.5 font-medium text-center px-4">
                Assign a batch to begin production.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
const JobBookPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedMachine, setSelectedMachine] = useState(null);
  const [localSearch, setLocalSearch] = useState("");
  const [viewMode, setViewMode] = useState("ALL");

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const fetchJobBook = useCallback(
    async (isBackground = false) => {
      if (isBackground) setRefreshing(true);
      else if (!data) setLoading(true);

      setError(null);
      try {
        const res = await api.get("/jobbook/live");
        if (isMounted.current) {
          setData(res.data.data);
        }
      } catch (err) {
        if (isMounted.current && !isBackground) {
          setError(err.response?.data?.message || "Failed to load live data.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [data],
  );
  useEffect(() => {
    isMounted.current = true;
    fetchJobBook(false);

    const interval = setInterval(() => fetchJobBook(true), 15000);
    return () => clearInterval(interval);
  }, [fetchJobBook]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const groupedMachines = useMemo(() => {
    if (!data?.machine_floor) return [];

    const map = new Map();

    data.machine_floor.forEach((item) => {
      if (!map.has(item.machine_id)) {
        map.set(item.machine_id, {
          machine_id: item.machine_id,
          machine_name: item.machine_name,
          is_active: false,
          has_stuck: false,
          active_jobs: [],
        });
      }

      const machineGroup = map.get(item.machine_id);

      if (item.step_id) {
        machineGroup.is_active = true;
        machineGroup.active_jobs.push(item);

        if (item.is_stuck === true || item.is_stuck === "true") {
          machineGroup.has_stuck = true;
        }
      }
    });

    return Array.from(map.values());
  }, [data]);

  const filteredMachines = useMemo(() => {
    return groupedMachines.filter((machine) => {
      if (viewMode === "ACTIVE_ONLY" && !machine.is_active) return false;
      if (viewMode === "STUCK_ONLY" && !machine.has_stuck) return false;

      if (localSearch.trim() !== "") {
        const query = localSearch.toLowerCase();
        const matchMachine = machine.machine_name.toLowerCase().includes(query);
        const matchJobs = machine.active_jobs.some(
          (job) =>
            (job.batch_no || "").toLowerCase().includes(query) ||
            (job.party_name || "").toLowerCase().includes(query) ||
            (job.step_name || "").toLowerCase().includes(query) ||
            (job.input_item || "").toLowerCase().includes(query),
        );

        if (!matchMachine && !matchJobs) {
          return false;
        }
      }
      return true;
    });
  }, [groupedMachines, viewMode, localSearch]);

  if (loading && !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
          <Loader2
            size={28}
            className="animate-spin text-blue-500"
            strokeWidth={1.5}
          />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 min-h-[60vh]">
        <div className="w-14 h-14 bg-rose-50 border border-rose-200/60 text-rose-600 rounded-[24px] flex items-center justify-center mb-5 shadow-sm">
          <ShieldAlert size={24} strokeWidth={1.5} />
        </div>
        <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight mb-1.5">
          Data Unavailable
        </h2>
        <p className="text-[14px] font-medium text-slate-500 max-w-sm">
          {error || "Could not connect to the live factory floor."}
        </p>
        <button
          onClick={() => fetchJobBook(false)}
          className="mt-6 h-[44px] px-6 bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-semibold rounded-full transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)] active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col font-sans antialiased pb-8">
      <AnimatePresence>
        {selectedMachine && (
          <MachineInsightsModal
            machine={selectedMachine}
            onClose={() => setSelectedMachine(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 sm:gap-8 w-full"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-2 px-1"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1.5 flex items-center gap-3">
              JobBook Live
              <button
                onClick={() => fetchJobBook(true)}
                className={`p-1.5 bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md rounded-full transition-all active:scale-95 ${refreshing ? "animate-spin" : ""}`}
              >
                <RefreshCw
                  size={16}
                  className="text-slate-600"
                  strokeWidth={2}
                />
              </button>
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Command Center &bull; Live Sync
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-3 sm:gap-4 w-full xl:w-auto min-w-0 shrink-0">
            <div className="flex items-center p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0 h-[44px]">
              {["ALL", "ACTIVE", "STUCK"].map((label) => {
                const mode = label === "ALL" ? "ALL" : `${label}_ONLY`;
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 shrink-0 min-w-[75px] sm:min-w-0 sm:flex-none px-4 sm:px-6 h-full rounded-[10px] sm:rounded-full text-[12px] sm:text-[13px] transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 font-medium border border-transparent"
                    }`}
                  >
                    {label === "STUCK" && (
                      <AlertTriangle
                        size={14}
                        strokeWidth={2.5}
                        className={
                          isActive ? "text-rose-500" : "text-slate-400"
                        }
                      />
                    )}
                    {label === "ALL"
                      ? label
                      : label.charAt(0) + label.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full xl:w-auto shrink-0">
              <div className="relative group w-full sm:w-[260px] shrink-0">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
                  size={16}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full h-[44px] pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
                />
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto shrink-0"
              >
                <Link
                  to="/production"
                  className="h-[44px] px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] sm:rounded-full font-semibold text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2.5 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50"
                >
                  <Layers
                    size={16}
                    strokeWidth={1.5}
                    className="text-white/90"
                  />{" "}
                  New Batch
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={fadeScale}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full shrink-0"
        >
          <StatCard
            title="Raw Stock"
            value={data?.live_inventory?.raw_stock}
            unit="KG"
            icon={Boxes}
            color="text-slate-500"
          />
          <StatCard
            title="Semi-Finished"
            value={data?.live_inventory?.semi_finished_stock}
            unit="KG"
            icon={Wrench}
            color="text-slate-500"
          />
          <StatCard
            title="Finished Goods"
            value={data?.live_inventory?.finished_stock}
            unit="KG"
            icon={Truck}
            color="text-slate-500"
          />
          <StatCard
            title="Factory Scrap"
            value={data?.live_inventory?.scrap_stock}
            unit="KG"
            icon={AlertTriangle}
            color="text-rose-500"
          />
        </motion.div>
        <motion.div variants={fadeScale} className="flex flex-col w-full">
          <div className="flex flex-nowrap items-center justify-between gap-3 mb-3 px-1">
            <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight truncate min-w-0">
              Factory Floor Grid
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-[8px] shadow-sm flex items-center shrink-0 whitespace-nowrap">
              {filteredMachines.length} Machine
              {filteredMachines.length !== 1 && "s"}
            </span>
          </div>

          <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {filteredMachines.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-[24px] sm:rounded-[28px] border border-slate-200/80 border-dashed shadow-sm flex flex-col items-center">
                  <AlertTriangle size={32} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-semibold text-[14px] px-4">
                    No machines match the current filters.
                  </p>
                </div>
              ) : (
                filteredMachines.map((machine) => {
                  return (
                    <BaseCard
                      key={machine.machine_id}
                      onClick={() => setSelectedMachine(machine)}
                      className={`p-5 sm:p-6 flex flex-col gap-4 !rounded-[20px] ${!machine.is_active ? "bg-slate-50/80 border-slate-200/60 opacity-80" : "bg-white"}`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="font-bold text-[14px] sm:text-[15px] text-slate-800 tracking-tight line-clamp-2 leading-snug">
                          {machine.machine_name}
                        </h3>
                        <div className="shrink-0 mt-1">
                          {machine.is_active ? (
                            machine.has_stuck ? (
                              <span className="flex w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                            ) : (
                              <span className="flex w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            )
                          ) : (
                            <span className="flex w-2.5 h-2.5 rounded-full bg-slate-300 shadow-inner" />
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-100/80">
                        <span className="text-[12px] font-semibold text-slate-500 tracking-tight truncate">
                          {machine.is_active
                            ? `${machine.active_jobs.length} Active Job${machine.active_jobs.length > 1 ? "s" : ""}`
                            : "Idle"}
                        </span>
                        {machine.is_active &&
                          machine.active_jobs[0]?.minutes_since_last_update !==
                            undefined && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-[6px] tracking-wide">
                              {formatTime(
                                machine.active_jobs[0]
                                  .minutes_since_last_update,
                              )}
                            </span>
                          )}
                      </div>
                    </BaseCard>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch lg:min-h-[420px] w-full mt-2">
          {/* --- System Feed --- */}
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col flex-1 overflow-hidden min-h-[420px]">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/60 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <ClipboardList size={14} strokeWidth={2} />
                  </div>
                  <span className="truncate">System Feed</span>
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2.5 py-1 rounded-[8px] bg-slate-100 border border-slate-200/60 shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Live Sync
                </span>
              </div>

              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-2">
                  {!data?.factory_log || data.factory_log.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p className="text-[14px] font-medium italic">
                        No activity recorded today.
                      </p>
                    </div>
                  ) : (
                    data.factory_log.map((log) => {
                      let colorClass =
                        "text-slate-500 bg-slate-100 border-slate-200/60";
                      let textColor = "text-slate-600";
                      let Icon = Boxes;
                      let actionText = "Moved";
                      let sign = "+";

                      const qty =
                        log.quantity_in > 0
                          ? log.quantity_in
                          : log.quantity_out;

                      if (log.movement_type === "PRODUCTION_CONSUME") {
                        colorClass = "bg-slate-50 border-slate-200/60";
                        textColor = "text-slate-700";
                        Icon = ArrowRight;
                        actionText = "Consumed";
                        sign = "-";
                      } else if (log.movement_type === "PRODUCTION_OUTPUT") {
                        colorClass = "bg-emerald-50 border-emerald-200/60";
                        textColor = "text-emerald-600";
                        Icon = CheckCircle2;
                        actionText = "Yielded";
                        sign = "+";
                      } else if (log.movement_type === "PRODUCTION_SCRAP") {
                        colorClass = "bg-rose-50 border-rose-200/60";
                        textColor = "text-rose-500";
                        Icon = AlertTriangle;
                        actionText = "Scrapped";
                        sign = "+";
                      } else if (log.movement_type === "CONTRACTOR_OUT") {
                        colorClass = "bg-amber-50 border-amber-200/60";
                        textColor = "text-amber-600";
                        Icon = Truck;
                        actionText = "Sent Out";
                        sign = "-";
                      } else if (log.movement_type === "CONTRACTOR_RETURN") {
                        colorClass = "bg-blue-50 border-blue-200/60";
                        textColor = "text-blue-600";
                        Icon = ArrowLeftRight;
                        actionText = "Returned";
                        sign = "+";
                      }

                      return (
                        <div
                          key={log.log_id}
                          className="p-4 hover:bg-slate-50/80 rounded-[16px] transition-colors flex items-center justify-between border border-transparent hover:border-slate-100/60 gap-3"
                        >
                          <div className="min-w-0 flex-1 flex gap-3.5 items-start">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${colorClass}`}
                            >
                              <Icon
                                size={14}
                                className={textColor}
                                strokeWidth={2.5}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 tracking-tight leading-snug">
                                {actionText}{" "}
                                <span className="font-bold">
                                  {formatQty(qty)} {log.uom}
                                </span>{" "}
                                of{" "}
                                <span className="text-slate-500">
                                  {log.item_name}
                                </span>
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-[6px]">
                                  {log.reference_no}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[150px]">
                                  {log.machine_name || "Contractor"} &bull;{" "}
                                  {log.actors || log.system_logger}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap text-right">
                            {formatTimeAgo(log.movement_ts)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </BaseCard>
          </motion.div>
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col flex-1 overflow-hidden min-h-[420px]">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-100/60 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Truck size={14} strokeWidth={2} />
                  </div>
                  <span className="truncate">Contractor WIP</span>
                </h3>
                <Link
                  to="/contractor"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50 tracking-wide shrink-0 whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                >
                  Manage Outwards
                  <ArrowRight size={12} strokeWidth={2.5} />
                </Link>
              </div>

              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-2">
                  {!data?.contractor_dispatch ||
                  data.contractor_dispatch.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p className="text-[14px] font-medium italic">
                        No material pending outside.
                      </p>
                    </div>
                  ) : (
                    data.contractor_dispatch.map((job) => (
                      <div
                        key={`job-${job.id}`}
                        className="p-4 hover:bg-slate-50/80 rounded-[20px] transition-colors flex flex-col border border-slate-100/80 hover:border-slate-200/80 gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="text-[14px] font-bold text-slate-900 tracking-tight truncate mb-0.5">
                              {job.contractor_name}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 truncate uppercase tracking-widest">
                              Batch {job.batch_no} &bull; {job.product_name}
                            </p>
                          </div>
                          <div
                            className={`px-2 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-widest shrink-0 border ${job.days_pending > 7 ? "bg-rose-50 text-rose-600 border-rose-200/60" : "bg-amber-50 text-amber-600 border-amber-200/60"}`}
                          >
                            {job.days_pending} Days
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                            <span>
                              Sent: {formatQty(job.qty_sent)} {job.uom}
                            </span>
                            <span className="text-emerald-600">
                              Ret: {formatQty(job.physical_returned)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(Number(job.physical_returned) / Number(job.qty_sent)) * 100}%`,
                              }}
                              title="Physical Returned"
                            />
                            <div
                              className="h-full bg-rose-400"
                              style={{
                                width: `${(Number(job.process_loss) / Number(job.qty_sent)) * 100}%`,
                              }}
                              title="Process Loss"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                            <span className="text-slate-400">
                              Pend: {formatQty(job.pending_qty)}
                            </span>
                            <span className="text-rose-400">
                              Loss: {formatQty(job.process_loss)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </BaseCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
const StatCard = ({ title, value, unit, icon: Icon, color }) => (
  <div className="p-4 sm:p-5 lg:p-6 h-full flex flex-col justify-center bg-slate-50/60 hover:bg-white border border-slate-200/60 transition-all duration-500 rounded-[20px] lg:rounded-[24px] shadow-sm relative hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0">
          <Icon size={14} strokeWidth={2.5} className={color} />
        </div>
        <p className="text-[12px] font-semibold text-slate-500 tracking-tight truncate">
          {title}
        </p>
      </div>
    </div>
    <div className="flex items-end justify-between gap-2 mt-0.5">
      <p className="text-[22px] sm:text-[28px] font-bold tracking-tight tabular-nums text-slate-900 leading-none truncate">
        {formatQty(value)}
        {unit && (
          <span className="text-[12px] sm:text-[13px] font-semibold text-slate-400 ml-1">
            {unit}
          </span>
        )}
      </p>
    </div>
  </div>
);

export default JobBookPage;
