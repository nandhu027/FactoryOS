import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Inbox,
  Loader2,
  User,
  ChevronDown,
  ChevronUp,
  Receipt,
  Package,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  FileSpreadsheet,
  Undo2,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 10,
    transition: { duration: 0.3, ease: smoothEase },
  },
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const parseLedgerMetadata = (reasonStr) => {
  if (!reasonStr) return { title: "Manual Payment Entry", meta: {} };
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

const PersonnelDetailsModal = ({ person, onClose, onUpdate }) => {
  const [rawPayments, setRawPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [localSearch, setLocalSearch] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    date_filter: "",
    start_date: "",
    end_date: "",
  });

  const [expandedId, setExpandedId] = useState(null);
  const [reversingId, setReversingId] = useState(null);
  const [sessionReversedIds, setSessionReversedIds] = useState([]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  const fetchPayments = useCallback(async () => {
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
      cleanFilters.personnel_id = person.personnel_id || person.id;
      cleanFilters.limit = 1000;

      const res = await api.get("/payments", { params: cleanFilters });

      const fetchedRows = res.data?.rows || res.data?.data || [];
      setRawPayments(Array.isArray(fetchedRows) ? fetchedRows : []);
    } catch (err) {
      console.error("Ledger Fetch Error:", err);
      toast.error("Failed to load payment history.");
    } finally {
      setLoading(false);
    }
  }, [person, filters]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  const handleReversePayment = async (e, paymentId) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "CRITICAL: Are you sure you want to reverse this transaction? This will undo the payment and update the net standing.",
      )
    ) {
      return;
    }

    setReversingId(paymentId);
    try {
      await api.delete(`/payments/${paymentId}`);
      toast.success("Transaction reversed successfully.");
      setSessionReversedIds((prev) => [...prev, paymentId]);

      await fetchPayments();
      if (typeof onUpdate === "function") {
        onUpdate();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reverse transaction.",
      );
    } finally {
      setReversingId(null);
    }
  };
  const { ledger, summary } = useMemo(() => {
    const validPayments = rawPayments.filter((pay) => {
      if (sessionReversedIds.includes(pay.id)) return false;
      if (pay.is_reversed === true) return false;
      if (
        pay.reason &&
        typeof pay.reason === "string" &&
        pay.reason.toUpperCase().includes("[REVERSED]")
      )
        return false;

      return true;
    });

    const sorted = [...validPayments].sort(
      (a, b) => new Date(a.payment_date) - new Date(b.payment_date),
    );

    let runningBalance = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    const processed = sorted.map((pay) => {
      const { title, meta } = parseLedgerMetadata(pay.reason);
      const billedAmount = meta.BILL ? Number(meta.BILL) : 0;
      const paidAmount = Number(pay.amount);

      totalBilled += billedAmount;
      totalPaid += paidAmount;

      runningBalance = runningBalance + billedAmount - paidAmount;

      let type = "ADVANCE / PAYMENT";
      if (meta.BILL) type = "SALARY / BILL SETTLED";

      return {
        ...pay,
        title,
        meta,
        billedAmount,
        paidAmount,
        balanceAfter: runningBalance,
        type,
      };
    });

    const reversed = processed.reverse();

    const filtered = filters.search
      ? reversed.filter(
          (p) =>
            p.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            p.reason.toLowerCase().includes(filters.search.toLowerCase()),
        )
      : reversed;

    return {
      ledger: filtered,
      summary: { totalBilled, totalPaid, currentBalance: runningBalance },
    };
  }, [rawPayments, filters.search, sessionReversedIds]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter")
      setFilters((prev) => ({ ...prev, search: localSearch }));
  };

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-3 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-20 gap-3 sm:gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
          <div
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm border shrink-0 ${person.personnel_type === "STAFF" ? "bg-blue-50 text-blue-600 border-blue-200/80" : "bg-amber-50 text-amber-600 border-amber-200/80"}`}
          >
            <User size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0">
                ID: {person.personnel_id || person.id}
              </span>
              <span
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 ${person.personnel_type === "STAFF" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
              >
                {person.personnel_type}
              </span>
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {person.full_name}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-rose-600 rounded-[8px] sm:rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        {loading ? (
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
          <motion.div
            key="ledger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-white"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
              <div className="p-4 sm:p-5 flex flex-col justify-center">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight size={14} className="text-emerald-500" /> Total
                  Earned (Billed)
                </p>
                <p className="text-[20px] sm:text-[24px] font-black text-slate-900 tabular-nums">
                  {formatINR(summary.totalBilled)}
                </p>
              </div>
              <div className="p-4 sm:p-5 flex flex-col justify-center">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <ArrowDownRight size={14} className="text-blue-500" /> Total
                  Paid Out
                </p>
                <p className="text-[20px] sm:text-[24px] font-black text-slate-900 tabular-nums">
                  {formatINR(summary.totalPaid)}
                </p>
              </div>
              <div className="p-4 sm:p-5 flex flex-col justify-center bg-slate-50/50 shadow-[inset_4px_0_12px_rgba(0,0,0,0.02)]">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Scale
                    size={14}
                    className={
                      summary.currentBalance >= 0
                        ? "text-slate-400"
                        : "text-rose-500"
                    }
                  />{" "}
                  Net Standing
                </p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-[20px] sm:text-[24px] font-black tabular-nums tracking-tight ${summary.currentBalance < 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {formatINR(Math.abs(summary.currentBalance))}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[6px] border shadow-sm ${summary.currentBalance < 0 ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}
                  >
                    {summary.currentBalance < 0 ? "ADVANCE" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-3 bg-white border-b border-slate-100 flex gap-3 min-w-0 z-10 shadow-sm">
              <div className="flex-1 relative group min-w-0 w-full">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500"
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    if (e.target.value === "")
                      setFilters((prev) => ({ ...prev, search: "" }));
                  }}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full h-[36px] pl-9 pr-4 bg-slate-50 border border-slate-200/80 rounded-[10px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all text-[12px] font-medium placeholder:text-slate-400"
                />
              </div>
              <select
                value={filters.date_filter}
                onChange={(e) =>
                  setFilters({ ...filters, date_filter: e.target.value })
                }
                className="w-[140px] appearance-none h-[36px] px-3 bg-slate-50 border border-slate-200/80 rounded-[10px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 text-[12px] font-semibold text-slate-700 cursor-pointer"
              >
                <option value="">All Time</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex-1 sm:overflow-y-auto bg-slate-50/30 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {ledger.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 h-full min-h-[300px]">
                  <Inbox size={32} className="text-slate-300 mb-4" />
                  <p className="text-[15px] font-bold text-slate-900 tracking-tight">
                    Ledger is empty.
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 mt-1 text-center">
                    No payment history found matching your criteria.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col min-w-0 sm:min-w-[700px] w-full">
                  <div className="hidden sm:flex items-center px-6 py-3 bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                    <div className="w-[12%]">Date</div>
                    <div className="w-[38%]">Transaction Details</div>
                    <div className="w-[13%] text-right pr-4 text-emerald-600">
                      Billed (+ve)
                    </div>
                    <div className="w-[13%] text-right pr-4 text-blue-600">
                      Paid (-ve)
                    </div>
                    <div className="w-[16%] text-right">Running Balance</div>
                    <div className="w-[8%] text-right pr-2">Action</div>
                  </div>
                  <div className="flex flex-col divide-y divide-slate-100 pb-8">
                    {ledger.map((item) => {
                      const isExpanded = expandedId === item.id;
                      const hasDrilldown = Object.keys(item.meta).length > 0;
                      const isReversingThisRow = reversingId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col bg-white transition-all duration-300 hover:bg-slate-50/50 ${isExpanded ? "shadow-[0_2px_12px_rgba(0,0,0,0.04)] z-10" : ""}`}
                        >
                          <div className="flex flex-col sm:hidden p-4 gap-3">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[13px] font-bold truncate text-slate-900">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  {new Date(
                                    item.payment_date,
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "2-digit",
                                  })}
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">
                                    #{item.id}
                                  </span>
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">
                                  {item.type}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-[12px] border border-slate-100">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase text-slate-400">
                                  Billed/Earned
                                </span>
                                <span className="text-[13px] font-black text-emerald-600">
                                  {item.billedAmount > 0
                                    ? `+${formatINR(item.billedAmount)}`
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[9px] font-bold uppercase text-slate-400">
                                  Paid Out
                                </span>
                                <span className="text-[13px] font-black text-slate-900">
                                  {item.paidAmount > 0
                                    ? formatINR(item.paidAmount)
                                    : "-"}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                  Balance:
                                </span>
                                <span
                                  className={`text-[13px] font-bold tabular-nums ${item.balanceAfter < 0 ? "text-rose-600" : "text-slate-600"}`}
                                >
                                  {formatINR(Math.abs(item.balanceAfter))}
                                  <span className="text-[9px] ml-1 opacity-60">
                                    {item.balanceAfter < 0 ? "ADV" : "BAL"}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasDrilldown && (
                                  <button
                                    onClick={() => toggleExpand(item.id)}
                                    className="p-1.5 bg-white border border-slate-200 rounded-[8px] text-slate-500 shadow-sm"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={(e) =>
                                    handleReversePayment(e, item.id)
                                  }
                                  disabled={isReversingThisRow}
                                  className="p-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-[8px] shadow-sm disabled:opacity-50"
                                >
                                  {isReversingThisRow ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Undo2 size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() =>
                              hasDrilldown && toggleExpand(item.id)
                            }
                            className={`hidden sm:flex items-center px-6 py-4 w-full ${hasDrilldown ? "cursor-pointer" : ""}`}
                          >
                            <div className="w-[12%] flex flex-col">
                              <span className="text-[13px] font-bold text-slate-900">
                                {new Date(item.payment_date).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "2-digit",
                                  },
                                )}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                Ref: #{item.id}
                              </span>
                            </div>

                            <div className="w-[38%] flex items-center gap-3 pr-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                                  item.type.includes("SALARY") ||
                                  item.type.includes("BILL")
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : "bg-blue-50 text-blue-600 border-blue-200"
                                }`}
                              >
                                {item.type.includes("SALARY") ||
                                item.type.includes("BILL") ? (
                                  <FileSpreadsheet size={14} />
                                ) : (
                                  <ArrowDownRight size={14} />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 pr-4">
                                <span className="text-[13px] font-bold truncate text-slate-900">
                                  {item.title}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                                  {item.type}
                                </span>
                              </div>
                            </div>

                            <div className="w-[13%] text-right pr-4">
                              {item.billedAmount > 0 ? (
                                <span className="text-[14px] font-black tabular-nums text-emerald-600">
                                  +{formatINR(item.billedAmount)}
                                </span>
                              ) : (
                                <span className="text-[14px] font-medium text-slate-300">
                                  -
                                </span>
                              )}
                            </div>

                            <div className="w-[13%] text-right pr-4 flex justify-end">
                              {item.paidAmount > 0 ? (
                                <span className="text-[14px] font-black tabular-nums text-slate-900">
                                  {formatINR(item.paidAmount)}
                                </span>
                              ) : item.paidAmount < 0 ? (
                                <span className="text-[14px] font-black tabular-nums text-rose-500">
                                  {formatINR(item.paidAmount)}
                                </span>
                              ) : (
                                <span className="text-[14px] font-medium text-slate-300">
                                  -
                                </span>
                              )}
                            </div>

                            <div className="w-[16%] flex items-center justify-end gap-3">
                              <span
                                className={`text-[14px] font-bold tabular-nums ${item.balanceAfter < 0 ? "text-rose-600" : "text-slate-600"}`}
                              >
                                {formatINR(Math.abs(item.balanceAfter))}
                                <span className="text-[10px] ml-1 opacity-60">
                                  {item.balanceAfter < 0 ? "ADV" : "BAL"}
                                </span>
                              </span>
                              {hasDrilldown ? (
                                <div className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                  {isExpanded ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                </div>
                              ) : (
                                <div className="w-5 h-5 shrink-0" />
                              )}
                            </div>

                            <div className="w-[8%] flex justify-end shrink-0 pr-2">
                              <button
                                onClick={(e) =>
                                  handleReversePayment(e, item.id)
                                }
                                disabled={isReversingThisRow}
                                className="p-1.5 sm:px-2 sm:py-1.5 flex items-center gap-1.5 rounded-[8px] bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Undo Transaction"
                              >
                                {isReversingThisRow ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Undo2 size={14} strokeWidth={2} />
                                )}
                              </button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && hasDrilldown && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-gradient-to-b from-slate-50/80 to-slate-50/30 border-t border-slate-100 shadow-[inset_0_3px_10px_rgba(0,0,0,0.01)]"
                              >
                                <div className="p-4 sm:p-6 sm:pl-12">
                                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 sm:pb-4 mb-3 sm:mb-4">
                                    <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-800 flex items-center gap-2">
                                      <Receipt
                                        size={16}
                                        className="text-blue-500"
                                      />{" "}
                                      Settlement Slip Breakdown
                                    </h4>
                                    <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-400">
                                      Generated:{" "}
                                      {new Date(
                                        item.payment_date,
                                      ).toLocaleDateString("en-GB")}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                    <div className="flex flex-col gap-3">
                                      <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
                                        <span className="text-slate-500 font-medium">
                                          Gross Billed (Earned)
                                        </span>
                                        <span className="text-slate-900 font-bold font-mono">
                                          {formatINR(item.billedAmount)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-[12px] sm:text-[13px] border-b border-slate-200/80 pb-3">
                                        <span className="text-slate-500 font-medium">
                                          Advances / Prior Balance Adj.
                                        </span>
                                        <span className="text-slate-500 font-bold font-mono">
                                          {formatINR(
                                            item.billedAmount - item.paidAmount,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-[13px] sm:text-[14px] font-bold pt-1">
                                        <span className="text-blue-600">
                                          Net Paid in this Tx
                                        </span>
                                        <span className="text-blue-600 font-black font-mono text-[15px] sm:text-[16px]">
                                          {formatINR(item.paidAmount)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-4 sm:border-l sm:border-slate-200/80 sm:pl-8">
                                      {item.meta.PERIOD && (
                                        <div>
                                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                            <Clock
                                              size={12}
                                              className="text-slate-400"
                                            />{" "}
                                            Payroll Period
                                          </p>
                                          <span className="inline-block px-2.5 py-1 rounded-[6px] bg-white text-slate-700 text-[11px] sm:text-[12px] font-bold border border-slate-200/80 shadow-sm">
                                            {item.meta.PERIOD}
                                          </span>
                                        </div>
                                      )}
                                      {item.meta.ATT && (
                                        <div>
                                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                            Attendance Stats
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {item.meta.ATT.split(",").map(
                                              (stat, i) => (
                                                <span
                                                  key={i}
                                                  className="px-2 py-0.5 rounded-[6px] bg-emerald-50 text-emerald-600 text-[10px] sm:text-[11px] font-bold border border-emerald-100 shadow-sm"
                                                >
                                                  {stat.trim()}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {item.meta.ITEMS && (
                                        <div>
                                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                            <Package
                                              size={12}
                                              className="text-slate-400"
                                            />{" "}
                                            Items Settled
                                          </p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {item.meta.ITEMS.split(",").map(
                                              (iName, i) => (
                                                <span
                                                  key={i}
                                                  className="px-2 py-0.5 rounded-[6px] bg-blue-50 text-blue-600 text-[10px] sm:text-[11px] font-bold border border-blue-100 shadow-sm"
                                                >
                                                  {iName.trim()}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default PersonnelDetailsModal;
