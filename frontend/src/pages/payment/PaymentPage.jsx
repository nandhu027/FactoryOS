import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Receipt,
  Users,
  Edit2,
  Undo2,
  ChevronDown,
  Calendar,
  Loader2,
  Calculator,
  Hammer,
  ChevronLeft,
  ChevronRight,
  Banknote,
  X,
  ArrowRight,
  Eye,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import PaymentSummaryCards from "./PaymentSummaryCards";
import PaymentFormModal from "./PaymentFormModal";
import PersonnelDetailsModal from "./PersonnelDetailsModal";
import SalaryTab from "./SalaryTab";
import ContractorPayoutTab from "./ContractorPayoutTab";

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
const pageTransition = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: smoothEase } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const formatINR = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("ledger");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState([]);
  const [payments, setPayments] = useState([]);
  const [personnelSummary, setPersonnelSummary] = useState([]);
  const [displayData, setDisplayData] = useState([]);

  const [localSearch, setLocalSearch] = useState(
    searchParams.get("search") || "",
  );
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    personnel_type: "",
    date_filter: "month",
    start_date: "",
    end_date: "",
  });

  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total_pages: 1,
    total: 0,
  });

  const [paymentModal, setPaymentModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [viewPersonStats, setViewPersonStats] = useState(null);
  const [reversingId, setReversingId] = useState(null);

  const loadAllPersonnel = async () => {
    try {
      const res = await api.get("/staff");
      setAllPersonnel(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    loadAllPersonnel();
  }, []);

  const loadMasterData = useCallback(async () => {
    if (
      filters.date_filter === "custom" &&
      (!filters.start_date || !filters.end_date)
    )
      return;
    setIsLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== ""),
      );

      const resLedger = await api.get("/payments", { params: cleanFilters });
      const validLedger = (resLedger.data.rows || []).filter(
        (p) =>
          !p.is_reversed &&
          !(p.reason || "").toUpperCase().includes("[REVERSED]"),
      );
      setPayments(validLedger);

      if (allPersonnel.length > 0) {
        const resSummaryList = await Promise.all(
          allPersonnel.map((person) =>
            api.get(`/staff/${person.id}/payments`, { params: cleanFilters }),
          ),
        );
        const combinedSummary = allPersonnel
          .map((person, index) => {
            const rawData =
              resSummaryList[index].data.data ||
              resSummaryList[index].data.rows ||
              [];

            const activeTxs = rawData.filter(
              (p) =>
                !p.is_reversed &&
                !(p.reason || "").toUpperCase().includes("[REVERSED]"),
            );

            let calcBilled = 0;
            let calcPaid = 0;
            activeTxs.forEach((tx) => {
              const isBilled = (tx.reason || "").includes("BILL:");
              if (isBilled) {
                const match = (tx.reason || "").match(/\| BILL:([\d.]+)/);
                if (match) calcBilled += Number(match[1]);
              }
              calcPaid += Number(tx.amount || 0);
            });

            const netBal = calcBilled - calcPaid;

            return {
              personnel_id: person.id,
              full_name: person.full_name,
              personnel_type: person.personnel_type,
              total_paid: calcPaid,
              total_billed: calcBilled,
              balance: netBal,
              standing:
                netBal === 0 ? "SETTLED" : netBal < 0 ? "ADVANCE" : "PENDING",
            };
          })
          .filter(
            (p) =>
              Math.abs(p.balance) > 0.01 ||
              Math.abs(p.total_billed) > 0.01 ||
              Math.abs(p.total_paid) > 0.01,
          )
          .sort((a, b) => b.balance - a.balance);

        setPersonnelSummary(combinedSummary);
      }
    } catch (err) {
      console.error("Data load failed", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, allPersonnel]);

  useEffect(() => {
    if (allPersonnel.length > 0) loadMasterData();
  }, [loadMasterData, refreshTrigger, allPersonnel.length]);

  useEffect(() => {
    let sourceData = activeTab === "ledger" ? payments : personnelSummary;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      sourceData = sourceData.filter(
        (item) =>
          item.full_name?.toLowerCase().includes(q) ||
          item.reason?.toLowerCase().includes(q),
      );
    }

    const total = sourceData.length;
    const total_pages = Math.ceil(total / meta.limit) || 1;
    const safePage = Math.min(meta.page, total_pages);
    const startIdx = (safePage - 1) * meta.limit;

    setDisplayData(sourceData.slice(startIdx, startIdx + meta.limit));
    setMeta((prev) => ({ ...prev, page: safePage, total_pages, total }));
  }, [
    activeTab,
    payments,
    personnelSummary,
    meta.page,
    meta.limit,
    filters.search,
  ]);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setFilters((prev) => ({ ...prev, search: localSearch }));
      setMeta((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleReversePayment = async (id) => {
    if (
      !window.confirm(
        "CRITICAL: Are you sure you want to reverse this transaction? This will create an offsetting negative balance and update the net standing.",
      )
    )
      return;

    setReversingId(id);
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Transaction reversed successfully.");
      setRefreshTrigger((p) => p + 1); // Refresh master data immediately
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to reverse transaction.",
      );
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-4 sm:gap-6 pb-2 mb-0 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-2 sm:px-0 shrink-0 w-full"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5">
              Payment Engine
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              Live Ledger & Workforce Accounts
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
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
                placeholder={`Search ${
                  activeTab === "summary"
                    ? "balances..."
                    : activeTab === "payroll" || activeTab === "contractor"
                      ? "personnel..."
                      : "ledger..."
                }`}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value.trim() === "") {
                    setFilters((prev) => ({ ...prev, search: "" }));
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setFilters((prev) => ({ ...prev, search: "" }));
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
              <button type="submit" className="hidden" />
            </form>

            <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="w-full lg:w-auto shrink-0 overflow-x-auto scrollbar-hide">
                <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 rounded-[12px] sm:rounded-full min-w-max h-[40px] sm:h-[44px] gap-1">
                  {[
                    { id: "ledger", label: "Ledger", icon: Receipt },
                    { id: "summary", label: "Balances", icon: Users },
                    { id: "payroll", label: "Payroll", icon: Calculator },
                    { id: "contractor", label: "Contractor", icon: Hammer },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setLocalSearch("");
                        setFilters((prev) => ({ ...prev, search: "" }));
                        setMeta((prev) => ({ ...prev, page: 1 }));
                      }}
                      className={`flex-1 shrink-0 px-3 sm:px-5 h-full rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                          : "text-slate-500 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <tab.icon
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 hidden sm:block"
                      />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto shrink-0"
              >
                <button
                  onClick={() => {
                    setEditPayment(null);
                    setPaymentModal(true);
                  }}
                  className="h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 whitespace-nowrap"
                >
                  <Plus size={16} strokeWidth={2} className="text-white/90" />
                  Record Advance
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={fadeScale}
          className="w-full shrink-0 px-2 sm:px-0"
        >
          <PaymentSummaryCards
            refreshTrigger={refreshTrigger}
            filters={filters}
            activeTab={activeTab}
          />
        </motion.div>
        <AnimatePresence>
          {["ledger", "summary"].includes(activeTab) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shrink-0 w-full"
            >
              <div className="relative group w-full sm:w-[180px] shrink-0">
                <select
                  value={filters.personnel_type}
                  onChange={(e) => {
                    setFilters({ ...filters, personnel_type: e.target.value });
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full appearance-none h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="">Workforce: All</option>
                  <option value="STAFF">Internal Staff</option>
                  <option value="CONTRACTOR">Contractors</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>
              <div className="relative group w-full sm:w-[160px] shrink-0">
                <select
                  value={filters.date_filter}
                  onChange={(e) => {
                    setFilters({ ...filters, date_filter: e.target.value });
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full appearance-none h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="month">This Month</option>
                  <option value="today">Today</option>
                  <option value="">All Time</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 w-full min-h-0 flex flex-col relative px-1 sm:px-0">
          <AnimatePresence mode="wait">
            {activeTab === "ledger" && (
              <motion.div
                key="ledger-view"
                variants={pageTransition}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col flex-1 w-full h-full min-h-0"
              >
                <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                  <div className="w-[120px]">Date</div>
                  <div className="w-[260px]">Personnel</div>
                  <div className="flex-1 min-w-[200px]">Reason</div>
                  <div className="w-[150px] text-right">Amount</div>
                  <div className="w-[100px] text-right pr-2">Actions</div>
                </div>

                <div
                  className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${displayData.length === 0 ? "flex-1" : ""} overflow-y-auto`}
                >
                  {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px]">
                      <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                        <Loader2
                          size={24}
                          className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                  ) : displayData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Receipt
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                        />
                      </div>
                      <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                        Ledger is empty
                      </p>
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 text-center px-4">
                        No payment records match your filters.
                      </p>
                    </div>
                  ) : (
                    displayData.map((p) => (
                      <div
                        key={p.id}
                        className="group flex flex-col w-full shrink-0"
                      >
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-4 mx-1">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[14px] shadow-sm shrink-0 border ${p.personnel_type === "STAFF" ? "bg-blue-50 text-blue-700 border-blue-200/80" : "bg-amber-50 text-amber-700 border-amber-200/80"}`}
                              >
                                {p.full_name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-[15px] text-slate-900 truncate leading-tight">
                                  {p.full_name}
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                                  {new Date(p.payment_date).toLocaleDateString(
                                    "en-GB",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] font-black text-slate-900">
                                {formatINR(p.amount)}
                              </p>
                              <span
                                className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[6px] border shadow-sm mt-1 inline-block ${p.personnel_type === "STAFF" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}
                              >
                                {p.personnel_type.charAt(0)}
                              </span>
                            </div>
                          </div>

                          <div className="text-[12px] font-medium text-slate-600 mt-3 pt-3 border-t border-slate-100/80 leading-snug">
                            {p.reason}
                          </div>

                          <div className="flex items-center justify-end gap-2 mt-3">
                            <button
                              onClick={() => {
                                setEditPayment(p);
                                setPaymentModal(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200/80 hover:border-blue-200 rounded-[8px] transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleReversePayment(p.id)}
                              disabled={reversingId === p.id}
                              className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200/80 hover:border-rose-200 rounded-[8px] transition-colors disabled:opacity-50"
                              title="Reverse Transaction"
                            >
                              {reversingId === p.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Undo2 size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                          <div className="w-[120px] font-bold text-[13px] text-slate-900 tabular-nums tracking-tight">
                            {new Date(p.payment_date).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </div>
                          <div className="w-[260px] flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-[13px] shadow-sm shrink-0 border ${p.personnel_type === "STAFF" ? "bg-blue-50 text-blue-700 border-blue-200/80" : "bg-amber-50 text-amber-700 border-amber-200/80"}`}
                            >
                              {p.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                              <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                {p.full_name}
                              </h4>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                                {p.personnel_type}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-[200px] shrink-0">
                            <span className="text-[13px] font-medium text-slate-600 truncate block">
                              {p.reason}
                            </span>
                          </div>
                          <div className="w-[150px] text-right">
                            <span className="text-[14px] font-black tracking-tight text-slate-900 tabular-nums">
                              {formatINR(p.amount)}
                            </span>
                          </div>
                          <div className="w-[100px] text-right flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <button
                              onClick={() => {
                                setEditPayment(p);
                                setPaymentModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-[10px] border border-transparent hover:border-blue-200 transition-all active:scale-95"
                              title="Edit Record"
                            >
                              <Edit2 size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleReversePayment(p.id)}
                              disabled={reversingId === p.id}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:shadow-sm rounded-[10px] border border-transparent hover:border-rose-200 transition-all active:scale-95 disabled:opacity-50"
                              title="Reverse Transaction"
                            >
                              {reversingId === p.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Undo2 size={16} strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === "summary" && (
              <motion.div
                key="summary-view"
                variants={pageTransition}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col flex-1 w-full h-full min-h-0"
              >
                <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                  <div className="flex-1 min-w-[240px]">Staff Member</div>
                  <div className="w-[150px] text-center">Status</div>
                  <div className="w-[160px] text-right">Total Billed</div>
                  <div className="w-[160px] text-right">Net Balance</div>
                  <div className="w-[100px] text-right pr-2">Action</div>
                </div>

                <div
                  className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${displayData.length === 0 ? "flex-1" : ""} overflow-y-auto`}
                >
                  {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px]">
                      <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                        <Loader2
                          size={24}
                          className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                  ) : displayData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Users
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                        />
                      </div>
                      <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                        No balances found
                      </p>
                    </div>
                  ) : (
                    displayData.map((p) => (
                      <div
                        key={p.personnel_id}
                        className="group flex flex-col w-full shrink-0"
                        onClick={() => setViewPersonStats(p)}
                      >
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-4 mx-1 cursor-pointer active:scale-[0.98] transition-all">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-100/80 pb-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-[12px] bg-slate-50 border border-slate-200/80 flex items-center justify-center font-bold text-[14px] text-slate-600 shadow-sm shrink-0">
                                {p.full_name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-[15px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                  {p.full_name}
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                                  ID: {p.personnel_id}
                                </p>
                              </div>
                            </div>
                            <ArrowRight
                              size={16}
                              className="text-slate-300 shrink-0 mt-2"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                Total Billed
                              </p>
                              <p className="font-bold text-[13px] sm:text-[14px] text-slate-700 tabular-nums">
                                {formatINR(p.total_billed)}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                Net Balance
                              </p>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[4px] border shadow-sm ${p.standing === "ADVANCE" ? "bg-rose-50 text-rose-600 border-rose-200/80" : "bg-emerald-50 text-emerald-600 border-emerald-200/80"}`}
                                >
                                  {p.standing === "ADVANCE" ? "ADV" : "PEND"}
                                </span>
                                <p
                                  className={`font-black text-[14px] sm:text-[15px] tabular-nums ${p.standing === "ADVANCE" ? "text-rose-600" : "text-emerald-600"}`}
                                >
                                  {formatINR(Math.abs(p.balance))}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4 cursor-pointer">
                          <div className="flex-1 min-w-[240px] flex items-center gap-3.5 pr-2">
                            <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[13px] font-bold text-slate-600 shrink-0 shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              {p.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                                {p.full_name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                                ID: {p.personnel_id}
                              </p>
                            </div>
                          </div>

                          <div className="w-[150px] flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${p.standing === "ADVANCE" ? "bg-rose-50 text-rose-600 border-rose-200/60" : p.standing === "PENDING" ? "bg-amber-50 text-amber-600 border-amber-200/60" : "bg-emerald-50 text-emerald-600 border-emerald-200/60"}`}
                            >
                              {p.standing}
                            </span>
                          </div>

                          <div className="w-[160px] text-right">
                            <span className="text-[14px] font-bold text-slate-600 tabular-nums">
                              {formatINR(p.total_billed)}
                            </span>
                          </div>

                          <div className="w-[160px] text-right">
                            <span
                              className={`text-[15px] font-black tabular-nums tracking-tight ${p.standing === "ADVANCE" ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {formatINR(Math.abs(p.balance))}
                            </span>
                          </div>

                          <div className="w-[100px] text-right pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-[8px] transition-colors active:scale-95 border border-blue-100/50 hover:border-blue-600 shadow-sm inline-flex items-center gap-1.5">
                              <Eye size={12} strokeWidth={2.5} /> View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === "payroll" && (
              <motion.div
                key="payroll-view"
                variants={pageTransition}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col flex-1 w-full h-full min-h-0"
              >
                <SalaryTab
                  allPersonnel={allPersonnel}
                  onSettled={() => {
                    loadMasterData();
                    setRefreshTrigger((t) => t + 1);
                  }}
                />
              </motion.div>
            )}
            {activeTab === "contractor" && (
              <motion.div
                key="contractor-view"
                variants={pageTransition}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-col flex-1 w-full h-full min-h-0"
              >
                <ContractorPayoutTab
                  allPersonnel={allPersonnel}
                  onSettled={() => {
                    loadMasterData();
                    setRefreshTrigger((t) => t + 1);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {["ledger", "summary"].includes(activeTab) &&
            !isLoading &&
            meta.total > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between px-3 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0 border-t border-slate-200/80"
              >
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
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {meta.page} of {meta.total_pages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={meta.page <= 1}
                      onClick={() =>
                        setMeta((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {meta.page} of {meta.total_pages}
                      </span>
                    </div>
                    <button
                      disabled={meta.page >= meta.total_pages}
                      onClick={() =>
                        setMeta((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {paymentModal && (
          <PaymentFormModal
            payment={editPayment}
            personnelList={allPersonnel}
            onClose={() => setPaymentModal(false)}
            onSaved={() => {
              loadMasterData();
              setRefreshTrigger((t) => t + 1);
            }}
          />
        )}
        {viewPersonStats && (
          <PersonnelDetailsModal
            person={viewPersonStats}
            onClose={() => setViewPersonStats(null)}
            onUpdate={() => {
              loadMasterData();
              setRefreshTrigger((t) => t + 1);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentPage;
