import React from "react";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  ChevronDown,
  Inbox,
  Wallet,
  Briefcase,
  Loader2,
  Cog,
  CheckCircle2,
  Truck,
  AlertTriangle,
  CalendarCheck,
  Clock,
  FileText,
  Receipt,
  ChevronUp,
  Package,
  HandCoins,
  PiggyBank,
  ArrowRightLeft,
  CreditCard,
} from "lucide-react";
import api from "../../api/axios";

const smoothEase = [0.22, 1, 0.36, 1];

const formatINR = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
};

const parseLedgerMetadata = (reasonStr) => {
  if (!reasonStr) return { title: "Unknown Transaction", meta: {} };
  const parts = reasonStr.split("|");
  const title = parts[0].trim();
  const meta = {};
  for (let i = 1; i < parts.length; i++) {
    const separatorIdx = parts[i].indexOf(":");
    if (separatorIdx > -1) {
      const key = parts[i].substring(0, separatorIdx).trim();
      const val = parts[i].substring(separatorIdx + 1).trim();
      meta[key] = val;
    }
  }
  return { title, meta };
};

const StatusBadge = ({ status }) => {
  const safeStatus = status || "UNKNOWN";
  const config = {
    PRESENT: { style: "bg-emerald-50 text-emerald-600", label: "Present" },
    ABSENT: { style: "bg-rose-50 text-rose-600", label: "Absent" },
    HALF_DAY: { style: "bg-amber-50 text-amber-600", label: "Half Day" },
    HOLIDAY: { style: "bg-sky-50 text-sky-600", label: "Holiday" },
  }[safeStatus] || {
    style: "bg-slate-50 text-slate-500",
    label: safeStatus.replace("_", " "),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${config.style}`}
    >
      {config.label}
    </span>
  );
};

const getStaffTypeConfig = (type) => {
  return type === "STAFF"
    ? "bg-blue-50 text-blue-600"
    : "bg-orange-50 text-orange-600";
};

const StaffInsightsModal = ({ person, onClose }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("work");
  const [data, setData] = useState([]);

  const [paymentSummary, setPaymentSummary] = useState({
    total_paid: 0,
    total_billed: 0,
    balance: 0,
    standing: "SETTLED",
  });
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState(null);

  const [filters, setFilters] = useState({
    date_filter: "",
    start_date: "",
    end_date: "",
    status: "ALL",
  });

  const fetchData = useCallback(async () => {
    if (
      filters.date_filter === "custom" &&
      (!filters.start_date || !filters.end_date)
    )
      return;

    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== ""),
      );

      if (activeTab === "work") {
        const res = await api.get(`/staff/${person.id}/ongoing-work`, {
          params: cleanFilters,
        });
        setData(res.data.data || []);
      } else if (activeTab === "payments") {
        const res = await api.get(`/staff/${person.id}/payments`, {
          params: cleanFilters,
        });

        const rawData =
          res.data?.data ||
          res.data?.rows ||
          (Array.isArray(res.data) ? res.data : []);
        const validPayments = rawData.filter((p) => {
          if (p.is_reversed === true) return false;
          if (
            p.reason &&
            typeof p.reason === "string" &&
            p.reason.includes("[REVERSED]")
          )
            return false;
          return true;
        });

        setData(validPayments);

        let calculatedBilled = 0;
        let calculatedPaid = 0;

        validPayments.forEach((p) => {
          const { meta } = parseLedgerMetadata(p.reason);
          calculatedBilled += meta.BILL ? Number(meta.BILL) : 0;

          const amt = Number(p.amount || 0);
          if (p.direction === "OUTFLOW") {
            calculatedPaid -= amt;
          } else {
            calculatedPaid += amt;
          }
        });

        const calcBalance = calculatedBilled - calculatedPaid;
        let calcStanding = "SETTLED";
        if (calcBalance > 0) calcStanding = "PENDING";
        else if (calcBalance < 0) calcStanding = "ADVANCE";

        setPaymentSummary({
          total_paid: calculatedPaid,
          total_billed: calculatedBilled,
          balance: calcBalance,
          standing: calcStanding,
        });
      } else if (activeTab === "attendance") {
        const res = await api.get(`/staff/${person.id}/attendance`, {
          params: cleanFilters,
        });
        setData(res.data.data || []);
        setAttendanceSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error("Failed to fetch insights", err);
    } finally {
      setLoading(false);
    }
  }, [person.id, activeTab, filters]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const delay = setTimeout(() => {
      fetchData();
    }, 300);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(delay);
    };
  }, [fetchData]);

  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setData([]);
    setExpandedId(null);
    setFilters({
      date_filter: "",
      start_date: "",
      end_date: "",
      status: "ALL",
    });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleWorkClick = (item) => {
    onClose();
    if (item.work_type === "PRODUCTION_STEP")
      navigate(`/production?search=${item.reference_no}`);
    else if (item.work_type === "CONTRACTOR_JOB")
      navigate(`/contractor?search=${item.reference_no}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-3 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-20 gap-3 sm:gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 border border-slate-700/50 shadow-sm flex items-center justify-center text-white shrink-0 text-[16px] font-bold">
            {person.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 leading-none">
                ID: {person.id}
              </span>
              <span
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none ${getStaffTypeConfig(person.personnel_type)}`}
              >
                {person.personnel_type}
              </span>
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {person.full_name}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 w-full sm:w-auto">
          <div className="flex items-center p-1 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[8px] sm:rounded-full w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleTabSwitch("work")}
              className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-[6px] sm:rounded-full text-[10px] sm:text-[12px] font-bold transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap leading-tight text-center ${
                activeTab === "work"
                  ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                  : "text-slate-500 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Briefcase size={14} strokeWidth={2} className="shrink-0" />{" "}
              Ongoing Work
            </button>
            {person.personnel_type === "STAFF" && (
              <button
                onClick={() => handleTabSwitch("attendance")}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-[6px] sm:rounded-full text-[10px] sm:text-[12px] font-bold transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap leading-tight text-center ${
                  activeTab === "attendance"
                    ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                    : "text-slate-500 hover:text-slate-900 border border-transparent"
                }`}
              >
                <CalendarCheck size={14} strokeWidth={2} className="shrink-0" />{" "}
                Attendance
              </button>
            )}
            <button
              onClick={() => handleTabSwitch("payments")}
              className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-[6px] sm:rounded-full text-[10px] sm:text-[12px] font-bold transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap leading-tight text-center ${
                activeTab === "payments"
                  ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                  : "text-slate-500 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Wallet size={14} strokeWidth={2} className="shrink-0" />{" "}
              Financials
            </button>
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-[8px] sm:rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0 relative z-10">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative group flex-1 sm:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar size={14} strokeWidth={1.5} />
              </div>
              <select
                value={filters.date_filter}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_filter: e.target.value,
                    start_date: "",
                    end_date: "",
                  })
                }
                className="w-full sm:w-auto h-[36px] sm:h-[34px] appearance-none pl-9 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[10px] outline-none focus:bg-white focus:border-blue-400/50 text-[12px] font-bold text-slate-700 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown size={14} strokeWidth={1.5} />
              </div>
            </div>

            {filters.date_filter === "custom" && (
              <div className="flex items-center gap-2 w-full sm:w-auto sm:pl-2 sm:border-l border-slate-200/80">
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                  className="flex-1 sm:w-auto h-[36px] sm:h-[34px] px-3 bg-white border border-slate-200/80 rounded-[10px] text-[12px] font-bold text-slate-700 outline-none focus:border-blue-400/50 shadow-sm"
                />
                <span className="text-[12px] font-medium text-slate-400">
                  to
                </span>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                  className="flex-1 sm:w-auto h-[36px] sm:h-[34px] px-3 bg-white border border-slate-200/80 rounded-[10px] text-[12px] font-bold text-slate-700 outline-none focus:border-blue-400/50 shadow-sm"
                />
              </div>
            )}

            {activeTab === "work" && (
              <div className="relative group w-full sm:w-auto sm:ml-2">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full sm:w-auto h-[36px] sm:h-[34px] appearance-none pl-3 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[10px] outline-none focus:bg-white focus:border-blue-400/50 text-[12px] font-bold text-slate-700 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Ongoing / Pending</option>
                  <option value="CLOSED">Completed / Closed</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={14} strokeWidth={1.5} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto sm:overflow-hidden flex flex-col relative w-full">
          {loading && data.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
              <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                <Loader2
                  size={24}
                  className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "payments" && (
                <motion.div
                  key="payments"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-white"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
                    <div className="flex flex-col p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 text-slate-500">
                        <HandCoins size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Salary Generated
                        </span>
                      </div>
                      <span className="text-[16px] sm:text-[20px] font-black text-slate-900 tabular-nums leading-tight truncate">
                        {formatINR(paymentSummary.total_billed)}
                      </span>
                    </div>

                    <div className="flex flex-col p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 text-emerald-600">
                        <PiggyBank size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          Amount Paid
                        </span>
                      </div>
                      <span className="text-[16px] sm:text-[20px] font-black text-emerald-600 tabular-nums leading-tight truncate">
                        {formatINR(paymentSummary.total_paid)}
                      </span>
                    </div>

                    <div
                      className={`flex flex-col p-4 sm:p-5 ${paymentSummary.standing === "PENDING" ? "bg-rose-50/50" : paymentSummary.standing === "ADVANCE" ? "bg-amber-50/50" : "bg-emerald-50/50"}`}
                    >
                      <div
                        className={`flex items-center gap-1.5 mb-1.5 sm:mb-2 ${paymentSummary.standing === "PENDING" ? "text-rose-600" : paymentSummary.standing === "ADVANCE" ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        <Wallet size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {paymentSummary.standing === "PENDING"
                            ? "Pending Balance"
                            : paymentSummary.standing === "ADVANCE"
                              ? "Advance Balance"
                              : "Account Settled"}
                        </span>
                      </div>
                      <span
                        className={`text-[16px] sm:text-[20px] font-black tabular-nums leading-tight truncate ${paymentSummary.standing === "PENDING" ? "text-rose-600" : paymentSummary.standing === "ADVANCE" ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {formatINR(Math.abs(paymentSummary.balance))}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {data.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-12 m-4 sm:m-6">
                        <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                          <CreditCard
                            size={24}
                            strokeWidth={1.5}
                            className="text-slate-400"
                          />
                        </div>
                        <p className="text-[15px] font-bold tracking-tight text-slate-900">
                          No Transactions
                        </p>
                        <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                          No financial history recorded for this date range.
                        </p>
                      </div>
                    ) : (
                      <>
                        <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                          <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              <th className="px-5 py-3 font-bold align-middle w-[150px]">
                                Date
                              </th>
                              <th className="px-4 py-3 font-bold align-middle w-[300px]">
                                Description
                              </th>
                              <th className="px-4 py-3 font-bold align-middle w-[150px]">
                                Ref No.
                              </th>
                              <th className="px-5 py-3 text-right font-bold align-middle">
                                Amount
                              </th>
                              <th className="px-4 py-3 w-[50px]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((item) => {
                              const { title, meta } = parseLedgerMetadata(
                                item.reason,
                              );
                              const hasDetails = Object.keys(meta).length > 0;
                              const isAdjustment =
                                title.includes("Settling Previous") ||
                                title.includes("Advance") ||
                                title.toLowerCase().includes("deduction");
                              const isExpanded = expandedId === item.id;

                              return (
                                <React.Fragment key={item.id}>
                                  <tr
                                    onClick={() =>
                                      hasDetails && toggleExpand(item.id)
                                    }
                                    className={`border-b border-slate-50 transition-colors group align-middle ${hasDetails ? "cursor-pointer hover:bg-slate-50/80" : "hover:bg-slate-50/40"}`}
                                  >
                                    <td className="px-5 py-3 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                                      {formatDate(item.payment_date)}
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-bold text-slate-900 truncate max-w-[200px]">
                                          {title}
                                        </span>
                                        {hasDetails && (
                                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8.5px] font-bold uppercase tracking-widest border border-slate-200">
                                            System Slip
                                          </span>
                                        )}
                                        {isAdjustment && (
                                          <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8.5px] font-bold uppercase tracking-widest">
                                            Adjustment
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-500 font-mono align-middle">
                                      {item.invoice_no || `#${item.id}`}
                                    </td>
                                    <td className="px-5 py-3 text-right align-middle">
                                      <span
                                        className={`text-[13px] font-black tabular-nums tracking-tight ${item.direction === "INFLOW" ? "text-emerald-600" : "text-slate-900"}`}
                                      >
                                        {item.direction === "INFLOW"
                                          ? "+"
                                          : "-"}
                                        {formatINR(item.amount)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-center">
                                      {hasDetails && (
                                        <span className="text-slate-400 flex justify-center">
                                          {isExpanded ? (
                                            <ChevronUp size={16} />
                                          ) : (
                                            <ChevronDown size={16} />
                                          )}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                  <AnimatePresence>
                                    {isExpanded && hasDetails && (
                                      <tr>
                                        <td
                                          colSpan="5"
                                          className="p-0 border-b border-slate-100"
                                        >
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                              height: "auto",
                                              opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                                          >
                                            <div className="p-4 sm:p-6 ml-[150px] mr-[50px] border-l-2 border-slate-200 pl-6 my-2">
                                              <div className="flex gap-4 mb-4">
                                                <div className="flex-1 bg-white border border-slate-200/80 rounded-[12px] p-4 shadow-sm">
                                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                    Salary Generated
                                                  </p>
                                                  <p className="text-[16px] font-black text-slate-900 tabular-nums leading-none">
                                                    {formatINR(meta.BILL || 0)}
                                                  </p>
                                                </div>
                                                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-[12px] p-4 shadow-sm">
                                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                                    Amount Paid To Staff
                                                  </p>
                                                  <p className="text-[16px] font-black text-emerald-700 tabular-nums leading-none">
                                                    {formatINR(item.amount)}
                                                  </p>
                                                </div>
                                              </div>

                                              {meta.ITEMS && (
                                                <div className="mb-4 last:mb-0">
                                                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <Package
                                                      size={14}
                                                      className="text-slate-400"
                                                    />{" "}
                                                    Items Handled
                                                  </h5>
                                                  <div className="flex flex-wrap gap-2">
                                                    {meta.ITEMS.split(",").map(
                                                      (itemName, i) => (
                                                        <span
                                                          key={i}
                                                          className="inline-flex items-center px-2.5 py-1 rounded-[8px] bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm"
                                                        >
                                                          {itemName.trim()}
                                                        </span>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                              {meta.ATT && (
                                                <div>
                                                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <Clock
                                                      size={14}
                                                      className="text-slate-400"
                                                    />{" "}
                                                    Attendance Basis
                                                  </h5>
                                                  <div className="flex flex-wrap gap-2">
                                                    {meta.ATT.split(",").map(
                                                      (attStat, i) => (
                                                        <span
                                                          key={i}
                                                          className="inline-flex items-center px-2.5 py-1 rounded-[8px] bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm"
                                                        >
                                                          {attStat.trim()}
                                                        </span>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        </td>
                                      </tr>
                                    )}
                                  </AnimatePresence>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                          {data.map((item) => {
                            const { title, meta } = parseLedgerMetadata(
                              item.reason,
                            );
                            const hasDetails = Object.keys(meta).length > 0;
                            const isAdjustment =
                              title.includes("Settling Previous") ||
                              title.includes("Advance") ||
                              title.toLowerCase().includes("deduction");
                            const isExpanded = expandedId === item.id;

                            return (
                              <div
                                key={item.id}
                                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-2"
                              >
                                <div
                                  onClick={() =>
                                    hasDetails && toggleExpand(item.id)
                                  }
                                  className={`flex items-center justify-between ${hasDetails ? "cursor-pointer" : ""}`}
                                >
                                  <div className="flex flex-col gap-1 pr-4">
                                    <span className="text-[13px] font-bold text-slate-900 leading-tight">
                                      {title}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-medium text-slate-500">
                                        {formatDate(item.payment_date)}
                                      </span>
                                      {isAdjustment && (
                                        <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[8.5px] font-bold uppercase tracking-widest">
                                          Adjustment
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span
                                      className={`text-[15px] font-black tabular-nums tracking-tight leading-none ${item.direction === "INFLOW" ? "text-emerald-600" : "text-slate-900"}`}
                                    >
                                      {item.direction === "INFLOW" ? "+" : "-"}
                                      {formatINR(item.amount)}
                                    </span>
                                    {hasDetails && (
                                      <span className="text-slate-400">
                                        {isExpanded ? (
                                          <ChevronUp size={16} />
                                        ) : (
                                          <ChevronDown size={16} />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {isExpanded && hasDetails && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden mt-3 pt-3 border-t border-slate-100"
                                    >
                                      <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                          <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-[8px] p-2.5">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                              Salary Gen.
                                            </p>
                                            <p className="text-[14px] font-black text-slate-900 tabular-nums">
                                              {formatINR(meta.BILL || 0)}
                                            </p>
                                          </div>
                                          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-[8px] p-2.5">
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                              Paid
                                            </p>
                                            <p className="text-[14px] font-black text-emerald-700 tabular-nums">
                                              {formatINR(item.amount)}
                                            </p>
                                          </div>
                                        </div>
                                        {meta.ITEMS && (
                                          <div className="flex flex-wrap gap-1.5">
                                            {meta.ITEMS.split(",").map(
                                              (itemName, i) => (
                                                <span
                                                  key={i}
                                                  className="px-2 py-1 rounded-[6px] bg-slate-100 text-[10px] font-bold text-slate-600"
                                                >
                                                  {itemName.trim()}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "attendance" && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-white"
                >
                  <div className="flex flex-wrap items-center bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 sm:py-4 gap-4 sm:gap-6 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Present:{" "}
                        <span className="text-slate-900 ml-0.5">
                          {Number(attendanceSummary.total_present || 0)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Absent:{" "}
                        <span className="text-slate-900 ml-0.5">
                          {Number(attendanceSummary.total_absent || 0)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        OT Hours:{" "}
                        <span className="text-slate-900 ml-0.5">
                          {Number(attendanceSummary.total_ot_hours || 0)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        OT Shifts:{" "}
                        <span className="text-slate-900 ml-0.5">
                          {Number(attendanceSummary.total_ot_shifts || 0)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {data.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-12 m-4 sm:m-6">
                        <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                          <CalendarCheck
                            size={24}
                            strokeWidth={1.5}
                            className="text-slate-400"
                          />
                        </div>
                        <p className="text-[15px] font-bold tracking-tight text-slate-900">
                          No Attendance Logs
                        </p>
                        <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                          No attendance marked for the selected filters.
                        </p>
                      </div>
                    ) : (
                      <>
                        <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                          <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              <th className="px-5 py-3 font-bold align-middle w-[150px]">
                                Date
                              </th>
                              <th className="px-4 py-3 font-bold align-middle w-[150px]">
                                Status
                              </th>
                              <th className="px-4 py-3 font-bold align-middle w-[250px]">
                                Overtime Details
                              </th>
                              <th className="px-5 py-3 font-bold align-middle">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((log, i) => (
                              <tr
                                key={log.id}
                                className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors align-middle"
                              >
                                <td className="px-5 py-4 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                                  {new Date(
                                    log.attendance_date,
                                  ).toLocaleDateString("en-GB")}
                                </td>
                                <td className="px-4 py-4 align-middle">
                                  <StatusBadge status={log.status} />
                                </td>
                                <td className="px-4 py-4 align-middle">
                                  <div className="flex flex-wrap gap-2">
                                    {log.morning_ot_type === "NONE" &&
                                    log.evening_ot_type === "NONE" ? (
                                      <span className="text-[12px] font-bold text-slate-300">
                                        —
                                      </span>
                                    ) : (
                                      <>
                                        {log.morning_ot_type !== "NONE" && (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 uppercase tracking-wider leading-none">
                                            <Clock
                                              size={10}
                                              strokeWidth={2.5}
                                            />{" "}
                                            Morning: {log.morning_ot_value}{" "}
                                            {log.morning_ot_type === "HOURLY"
                                              ? "Hr"
                                              : "Shift"}
                                          </span>
                                        )}
                                        {log.evening_ot_type !== "NONE" && (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider leading-none">
                                            <Clock
                                              size={10}
                                              strokeWidth={2.5}
                                            />{" "}
                                            Evening: {log.evening_ot_value}{" "}
                                            {log.evening_ot_type === "HOURLY"
                                              ? "Hr"
                                              : "Shift"}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-4 align-middle">
                                  <span className="text-[12px] font-medium text-slate-500 truncate max-w-[250px] inline-block">
                                    {log.remarks || "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                          {data.map((log) => (
                            <div
                              key={log.id}
                              className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-slate-700">
                                  {new Date(
                                    log.attendance_date,
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <StatusBadge status={log.status} />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {(log.morning_ot_type !== "NONE" ||
                                  log.evening_ot_type !== "NONE") && (
                                  <div className="flex flex-wrap gap-2">
                                    {log.morning_ot_type !== "NONE" && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 uppercase tracking-wider">
                                        Morn: {log.morning_ot_value}{" "}
                                        {log.morning_ot_type === "HOURLY"
                                          ? "Hr"
                                          : "Shift"}
                                      </span>
                                    )}
                                    {log.evening_ot_type !== "NONE" && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider">
                                        Eve: {log.evening_ot_value}{" "}
                                        {log.evening_ot_type === "HOURLY"
                                          ? "Hr"
                                          : "Shift"}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {log.remarks && (
                                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-lg mt-1">
                                    "{log.remarks}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "work" && (
                <motion.div
                  key="work"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-slate-50/50"
                >
                  <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {data.length === 0 ? (
                      <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-white py-12 m-4 sm:m-6 shadow-sm">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-full flex items-center justify-center mx-auto mb-3">
                          <Briefcase
                            size={24}
                            strokeWidth={1.5}
                            className="text-slate-400"
                          />
                        </div>
                        <p className="text-[15px] font-bold tracking-tight text-slate-900">
                          No Ongoing Work
                        </p>
                        <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                          No active batches or jobs assigned to this person.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.map((item, i) => {
                          const targetQty = Number(item.target_qty || 0);
                          const consumed = Number(item.consumed_so_far || 0);
                          const pending = Number(item.pending_qty || 0);
                          const progress =
                            targetQty > 0
                              ? Math.min(100, (consumed / targetQty) * 100)
                              : 0;
                          const isFinished =
                            item.status === "COMPLETED" ||
                            item.status === "CLOSED";
                          const isContractor =
                            item.work_type === "CONTRACTOR_JOB";

                          return (
                            <motion.div
                              key={i}
                              onClick={() => handleWorkClick(item)}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03, ease: smoothEase }}
                              className={`group p-4 sm:p-5 rounded-[20px] cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 relative overflow-hidden bg-white border ${isFinished ? "border-emerald-200/80" : isContractor ? "border-orange-200/80" : "border-blue-200/80"}`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                  <div
                                    className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-white shadow-sm shrink-0 ${isContractor ? "bg-orange-500" : "bg-blue-500"}`}
                                  >
                                    {isContractor ? (
                                      <Truck size={18} strokeWidth={1.5} />
                                    ) : (
                                      <Cog size={18} strokeWidth={1.5} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 font-mono truncate">
                                      {item.reference_no}
                                    </p>
                                    <h4 className="text-[14px] font-bold text-slate-900 tracking-tight leading-tight truncate">
                                      {item.description}
                                    </h4>
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider shrink-0 leading-none ${isFinished ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
                                >
                                  {item.status}
                                </span>
                              </div>

                              {item.machine_name && (
                                <div className="mb-4 inline-flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200/80 shadow-sm leading-none">
                                  <Cog size={12} strokeWidth={1.5} /> Node:{" "}
                                  {item.machine_name}
                                </div>
                              )}

                              <div className="bg-slate-50/50 border border-slate-200/80 p-3.5 rounded-[12px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] mt-auto">
                                <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                                  <span>
                                    {isContractor ? "Returned" : "Done"}:{" "}
                                    <span className="text-slate-800">
                                      {consumed.toFixed(2)}
                                    </span>{" "}
                                    <span className="text-[8px]">
                                      {item.uom}
                                    </span>
                                  </span>
                                  <span>
                                    Target:{" "}
                                    <span className="text-slate-800">
                                      {targetQty.toFixed(2)}
                                    </span>{" "}
                                    <span className="text-[8px]">
                                      {item.uom}
                                    </span>
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-[4px] rounded-full overflow-hidden mb-3">
                                  <div
                                    className={`h-full transition-all duration-1000 ${isFinished ? "bg-emerald-500" : isContractor ? "bg-orange-500" : "bg-blue-500"}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                                    <Calendar size={12} strokeWidth={1.5} />{" "}
                                    {new Date(
                                      item.assigned_date,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </span>
                                  {!isFinished && pending > 0 ? (
                                    <span className="text-rose-500 flex items-center gap-1 uppercase tracking-wider">
                                      <AlertTriangle
                                        size={12}
                                        strokeWidth={1.5}
                                      />{" "}
                                      Pend: {pending.toFixed(2)} {item.uom}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 flex items-center gap-1 uppercase tracking-wider">
                                      <CheckCircle2
                                        size={12}
                                        strokeWidth={1.5}
                                      />{" "}
                                      Done
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default StaffInsightsModal;
