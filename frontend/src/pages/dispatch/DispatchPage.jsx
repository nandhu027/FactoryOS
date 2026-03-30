import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import DispatchForm from "./DispatchForm";
import DispatchDetailModal from "./DispatchDetailModal";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

import {
  Search,
  Plus,
  Trash2,
  Loader2,
  Eye,
  Truck,
  CheckCircle2,
  XCircle,
  Building,
  Receipt,
  Ban,
  X,
  Calendar,
  CircleDashed,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";

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

const getLocalDateString = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const normalizeSearch = (str) =>
  (str || "")
    .toString()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");

const DispatchPage = () => {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState("ACTIVE"); // 'ACTIVE' | 'VOIDED'

  const [dispatches, setDispatches] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);

  const initialSearch = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [filters, setFilters] = useState({
    search: initialSearch,
    dispatch_type: "",
    date_filter: "ALL_TIME",
    customStart: "",
    customEnd: "",
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState(null);

  const fetchDispatches = useCallback(async () => {
    setLedgerLoading(true);
    try {
      let params = new URLSearchParams();

      if (activeTab === "VOIDED") {
        params.append("status", "CANCELLED");
      }

      const today = new Date();

      if (filters.date_filter === "TODAY") {
        const todayStr = getLocalDateString(today);
        params.append("startDate", todayStr);
        params.append("endDate", todayStr);
      } else if (filters.date_filter === "YESTERDAY") {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateString(yest);
        params.append("startDate", yestStr);
        params.append("endDate", yestStr);
      } else if (filters.date_filter === "THIS_MONTH") {
        const startStr = getLocalDateString(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        const endStr = getLocalDateString(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
        params.append("startDate", startStr);
        params.append("endDate", endStr);
      } else if (
        filters.date_filter === "CUSTOM" &&
        filters.customStart &&
        filters.customEnd
      ) {
        params.append("startDate", filters.customStart);
        params.append("endDate", filters.customEnd);
      }

      const res = await api.get(`/dispatch?${params.toString()}`);
      let fetchedData = res.data?.data || res.data || [];

      if (activeTab === "VOIDED") {
        fetchedData = fetchedData.filter((d) => d.status === "CANCELLED");
      } else {
        fetchedData = fetchedData.filter((d) => d.status !== "CANCELLED");
      }

      setDispatches(Array.isArray(fetchedData) ? fetchedData : []);
    } catch (error) {
      console.error("Fetch failed", error);
      toast.error("Failed to load records.");
    } finally {
      setLedgerLoading(false);
    }
  }, [activeTab, filters.date_filter, filters.customStart, filters.customEnd]);

  useEffect(() => {
    fetchDispatches();
  }, [fetchDispatches]);

  const filteredDispatches = useMemo(() => {
    let data = dispatches;

    if (filters.dispatch_type) {
      data = data.filter((d) => d.dispatch_type === filters.dispatch_type);
    }

    if (filters.search) {
      const q = normalizeSearch(filters.search);
      data = data.filter(
        (item) =>
          normalizeSearch(item.dispatch_no).includes(q) ||
          normalizeSearch(item.party_name).includes(q) ||
          normalizeSearch(item.dispatch_type).includes(q) ||
          normalizeSearch(item.payment_status).includes(q),
      );
    }
    return data;
  }, [dispatches, filters.search, filters.dispatch_type]);

  useEffect(() => {
    setPage(1);
  }, [filters, activeTab]);

  const totalPages = Math.ceil(filteredDispatches.length / limit) || 1;
  const currentDispatches = filteredDispatches.slice(
    (page - 1) * limit,
    page * limit,
  );
  const ledgerStartCount = (page - 1) * limit + 1;
  const ledgerEndCount = ledgerStartCount + currentDispatches.length - 1;

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setFilters((prev) => ({ ...prev, search: localSearch }));
      if (localSearch) {
        setSearchParams({ search: localSearch });
      } else {
        setSearchParams(new URLSearchParams());
      }
    }
  };

  const handleCancel = async (id) => {
    if (
      !window.confirm(
        "CRITICAL: Cancelling this bill will mark it as cancelled and return the inventory back to stock. Proceed?",
      )
    )
      return;
    try {
      await api.delete(`/dispatch/${id}`);
      toast.success("Bill cancelled and stock returned.");
      fetchDispatches();
    } catch (error) {
      toast.error("Failed to cancel bill.");
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
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 shrink-0 w-full"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5">
              Sales & Deliveries
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              Manage outbound invoices and deliveries
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
                placeholder="Search invoices, clients, or status..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.trim() === "") {
                    setFilters((prev) => ({ ...prev, search: "" }));
                    setSearchParams(new URLSearchParams());
                  }
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" />
            </form>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="w-full sm:w-[240px] shrink-0">
                <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full h-[40px] sm:h-[44px] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ACTIVE");
                      setLocalSearch("");
                      setFilters((prev) => ({ ...prev, search: "" }));
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "ACTIVE"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    <Receipt
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("VOIDED");
                      setLocalSearch("");
                      setFilters((prev) => ({ ...prev, search: "" }));
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "VOIDED"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-rose-600 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    <Ban
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">Cancelled</span>
                  </button>
                </div>
              </div>

              {can("DISPATCH", "can_add") && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowForm(true)}
                  className="w-full sm:w-auto h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 shrink-0 whitespace-nowrap"
                >
                  <Plus size={16} strokeWidth={2} className="text-white/90" />
                  Create Bill
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-2 sm:px-0 w-full shrink-0"
          >
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="relative group w-full sm:w-[160px] shrink-0">
                <select
                  value={filters.date_filter}
                  onChange={(e) =>
                    setFilters({ ...filters, date_filter: e.target.value })
                  }
                  className="w-full appearance-none h-[40px] sm:h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="ALL_TIME">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>

              <div className="relative group w-full sm:w-[180px] shrink-0">
                <select
                  value={filters.dispatch_type}
                  onChange={(e) =>
                    setFilters({ ...filters, dispatch_type: e.target.value })
                  }
                  className="w-full appearance-none h-[40px] sm:h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="">All Bill Types</option>
                  <option value="OWN_SALE">Own Sale</option>
                  <option value="JOB_WORK_RETURN">Job Work Return</option>
                  <option value="SCRAP_SALE">Scrap Sale</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </div>

            <AnimatePresence>
              {filters.date_filter === "CUSTOM" && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center w-full sm:w-auto gap-2 sm:gap-3 overflow-hidden"
                >
                  <input
                    type="date"
                    value={filters.customStart}
                    onChange={(e) =>
                      setFilters({ ...filters, customStart: e.target.value })
                    }
                    className="bg-white border flex-1 sm:flex-none border-slate-200/80 text-slate-700 text-[12px] sm:text-[13px] font-bold h-[40px] px-3 sm:px-4 rounded-[12px] sm:rounded-full outline-none focus:border-blue-400 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="date"
                    value={filters.customEnd}
                    onChange={(e) =>
                      setFilters({ ...filters, customEnd: e.target.value })
                    }
                    className="bg-white border flex-1 sm:flex-none border-slate-200/80 text-slate-700 text-[12px] sm:text-[13px] font-bold h-[40px] px-3 sm:px-4 rounded-[12px] sm:rounded-full outline-none focus:border-blue-400 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
              <div className="w-[15%] pr-4">Invoice Info</div>
              <div className="w-[20%] pr-4">Client / Party</div>
              <div className="w-[15%] pr-4 text-center">Bill Type</div>
              <div className="w-[20%] pr-4">Items Summary</div>
              <div className="w-[10%] pr-4 text-center">Status</div>
              <div className="w-[10%] pr-4 text-right">Total Value</div>
              <div className="w-[10%] text-right pr-2">Action</div>
            </div>
            <div
              className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-0 pt-2 lg:pt-3 overflow-y-auto ${
                ledgerLoading || currentDispatches.length === 0 ? "flex-1" : ""
              }`}
            >
              {ledgerLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
                  <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                    <Loader2
                      size={24}
                      className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : currentDispatches.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Truck
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                    />
                  </div>
                  <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                    No dispatches found
                  </h3>
                  <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm px-4 text-center">
                    {activeTab === "VOIDED"
                      ? "No cancelled bills in this range."
                      : "Try adjusting your search or filters."}
                  </p>
                </div>
              ) : (
                currentDispatches.map((dispatch) => (
                  <div
                    key={dispatch.id}
                    className={`group flex flex-col w-full shrink-0 ${
                      dispatch.status === "CANCELLED"
                        ? "opacity-60 grayscale"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-5 transition-all duration-300">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] tracking-tight truncate">
                            {dispatch?.dispatch_no || "MISSING_INV"}
                          </div>
                          <div className="text-[11px] sm:text-[12px] font-medium text-slate-500 flex items-center gap-1.5 tabular-nums mt-1">
                            <Calendar
                              size={12}
                              strokeWidth={1.5}
                              className="text-slate-400"
                            />
                            {dispatch?.dispatch_date
                              ? new Date(
                                  dispatch.dispatch_date,
                                ).toLocaleDateString()
                              : "No Date"}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end min-w-[80px]">
                          {dispatch.grand_total || dispatch.total_amount ? (
                            <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] tracking-tight">
                              {formatINR(
                                dispatch.grand_total || dispatch.total_amount,
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center w-full">
                              <span className="text-[14px] sm:text-[15px] font-medium text-slate-300 text-center">
                                —
                              </span>
                            </div>
                          )}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 mt-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                              dispatch?.dispatch_type === "OWN_SALE"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                                : dispatch?.dispatch_type === "SCRAP_SALE"
                                  ? "bg-amber-50 text-amber-600 border-amber-200/60"
                                  : "bg-blue-50 text-blue-600 border-blue-200/60"
                            }`}
                          >
                            {(dispatch?.dispatch_type || "UNKNOWN").replace(
                              "_",
                              " ",
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 mt-2">
                        {dispatch.party_name && (
                          <div className="text-[13px] sm:text-[14px] font-bold text-slate-800 truncate block">
                            {dispatch.party_name}
                          </div>
                        )}
                        <div className="text-[11px] sm:text-[13px] font-semibold text-slate-600 truncate flex items-center gap-1.5 sm:gap-2 mt-1">
                          <Package
                            size={14}
                            className="text-blue-500 shrink-0 sm:w-[16px] sm:h-[16px]"
                            strokeWidth={2}
                          />
                          <span className="truncate">
                            {dispatch?.item_count || 0} Items Included
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 sm:mt-4 pt-3 sm:pt-3.5 border-t border-slate-100/80">
                        <div
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1.5 rounded-[8px] border shadow-sm ${
                            dispatch.dispatch_type === "JOB_WORK_RETURN" ||
                            dispatch.status === "CANCELLED"
                              ? "bg-slate-50 text-slate-400 border-slate-200"
                              : dispatch?.payment_status === "PAID"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : dispatch?.payment_status === "PARTIAL"
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-rose-50 text-rose-600 border-rose-200"
                          }`}
                        >
                          {dispatch.dispatch_type === "JOB_WORK_RETURN" ? (
                            <Ban size={14} strokeWidth={2} />
                          ) : dispatch?.payment_status === "PAID" ? (
                            <CheckCircle2 size={14} strokeWidth={2} />
                          ) : dispatch?.payment_status === "PARTIAL" ? (
                            <CircleDashed size={14} strokeWidth={2} />
                          ) : (
                            <XCircle size={14} strokeWidth={2} />
                          )}
                          {dispatch.dispatch_type === "JOB_WORK_RETURN"
                            ? "N/A"
                            : dispatch?.payment_status || "UNPAID"}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispatchId(dispatch.id);
                              setShowDetails(true);
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                          >
                            <Eye
                              size={14}
                              className="sm:w-[16px] sm:h-[16px]"
                              strokeWidth={2.5}
                            />
                          </button>
                          {dispatch.status !== "CANCELLED" &&
                            can("DISPATCH", "can_delete") && (
                              <button
                                type="button"
                                onClick={() => handleCancel(dispatch.id)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                              >
                                <Trash2
                                  size={14}
                                  className="sm:w-[16px] sm:h-[16px]"
                                  strokeWidth={2.5}
                                />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all">
                      <div className="w-[15%] pr-4 min-w-0">
                        <div className="font-bold text-slate-900 text-[14px] tracking-tight truncate block group-hover:text-blue-600 transition-colors">
                          {dispatch?.dispatch_no || "MISSING_INV"}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 tabular-nums">
                          <Calendar size={12} strokeWidth={1.5} />{" "}
                          {dispatch?.dispatch_date
                            ? new Date(
                                dispatch.dispatch_date,
                              ).toLocaleDateString()
                            : "No Date"}
                        </div>
                      </div>

                      <div className="w-[20%] pr-4 min-w-0 flex flex-col justify-center">
                        <div className="font-bold text-slate-700 text-[13px] truncate block">
                          {dispatch?.party_name || "Unknown Client"}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 truncate">
                          ID: P-{dispatch?.party_id}
                        </div>
                      </div>

                      <div className="w-[15%] pr-4 flex justify-center text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-sm border ${
                            dispatch?.dispatch_type === "OWN_SALE"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                              : dispatch?.dispatch_type === "SCRAP_SALE"
                                ? "bg-amber-50 text-amber-600 border-amber-200/60"
                                : "bg-blue-50 text-blue-600 border-blue-200/60"
                          }`}
                        >
                          {(dispatch?.dispatch_type || "UNKNOWN").replace(
                            "_",
                            " ",
                          )}
                        </span>
                      </div>

                      <div className="w-[20%] pr-4 min-w-0">
                        <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2 truncate">
                          <Package
                            size={16}
                            className="text-blue-500 shrink-0"
                            strokeWidth={2}
                          />
                          <span className="truncate">
                            {dispatch?.item_count || 0} Items
                          </span>
                        </div>
                      </div>

                      <div className="w-[10%] pr-4 flex justify-center text-center">
                        <div
                          className={`inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-[8px] border shadow-sm w-full max-w-[80px] ${
                            dispatch.dispatch_type === "JOB_WORK_RETURN" ||
                            dispatch.status === "CANCELLED"
                              ? "bg-slate-50 text-slate-400 border-slate-200"
                              : dispatch?.payment_status === "PAID"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                : dispatch?.payment_status === "PARTIAL"
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-rose-50 text-rose-600 border-rose-200"
                          }`}
                        >
                          {dispatch.dispatch_type === "JOB_WORK_RETURN" ? (
                            <Ban size={12} strokeWidth={2.5} />
                          ) : dispatch?.payment_status === "PAID" ? (
                            <CheckCircle2 size={12} strokeWidth={2.5} />
                          ) : dispatch?.payment_status === "PARTIAL" ? (
                            <CircleDashed size={12} strokeWidth={2.5} />
                          ) : (
                            <XCircle size={12} strokeWidth={2.5} />
                          )}
                        </div>
                      </div>

                      <div className="w-[10%] pr-4 flex justify-end">
                        {dispatch.grand_total || dispatch.total_amount ? (
                          <p className="text-[14px] font-bold text-slate-900 tracking-tight tabular-nums text-right">
                            {formatINR(
                              dispatch.grand_total || dispatch.total_amount,
                            )}
                          </p>
                        ) : (
                          <p className="text-[14px] font-medium text-slate-300 text-right">
                            —
                          </p>
                        )}
                      </div>
                      <div className="w-[10%] text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDispatchId(dispatch.id);
                              setShowDetails(true);
                            }}
                            className="p-1.5 text-slate-300 group-hover:text-blue-500 hover:bg-blue-50 rounded-[8px] transition-all active:scale-95 border border-transparent hover:border-blue-200"
                            title="View Invoice Details"
                          >
                            <Eye size={18} strokeWidth={2} />
                          </button>
                          {dispatch.status !== "CANCELLED" &&
                            can("DISPATCH", "can_delete") && (
                              <button
                                type="button"
                                onClick={() => handleCancel(dispatch.id)}
                                className="p-1.5 text-slate-300 group-hover:text-rose-500 hover:bg-rose-50 rounded-[8px] transition-all active:scale-95 border border-transparent hover:border-rose-200"
                                title="Cancel & Revert Stock"
                              >
                                <Trash2 size={18} strokeWidth={2} />
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {!ledgerLoading && currentDispatches.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0 border-t border-slate-100/80">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {ledgerStartCount}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {ledgerEndCount}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {filteredDispatches.length}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => prev - 1)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {page} of {totalPages}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((prev) => prev + 1)}
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
        {showForm && (
          <DispatchForm
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              fetchDispatches();
            }}
          />
        )}
        {showDetails && (
          <DispatchDetailModal
            dispatchId={selectedDispatchId}
            onClose={() => setShowDetails(false)}
            onStatusChange={fetchDispatches}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DispatchPage;
