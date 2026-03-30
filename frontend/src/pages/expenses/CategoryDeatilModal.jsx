import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Receipt,
  Loader2,
  ChevronDown,
  Building2,
  Trash2,
  Filter,
  Calendar,
  Wallet,
  ArrowDownRight,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: smoothEase },
  },
};

const formatINR = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const CurrencyFormat = ({ amount, className = "", symbolClass = "" }) => (
  <span
    className={`tabular-nums tracking-tight inline-flex items-baseline ${className}`}
  >
    <span
      className={`text-[0.85em] opacity-60 print:opacity-100 mr-[1.5px] font-medium ${symbolClass}`}
    >
      ₹
    </span>
    <span className="truncate">
      {formatINR(amount).replace("₹", "").trim()}
    </span>
  </span>
);

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

const CategoryDetailsModal = ({ category, onClose, onUpdate }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [localSearch, setLocalSearch] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    date_filter: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const fetchCategoryExpenses = useCallback(async () => {
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
      cleanFilters.category_id = category.id;
      cleanFilters._t = Date.now();

      const res = await api.get("/expenses", { params: cleanFilters });
      setExpenses(res.data.rows || []);
    } catch (err) {
      console.error("Failed to fetch category details", err);
      toast.error("Failed to load category transactions");
    } finally {
      setLoading(false);
    }
  }, [category.id, filters]);

  useEffect(() => {
    fetchCategoryExpenses();
  }, [fetchCategoryExpenses]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setFilters((prev) => ({ ...prev, search: localSearch }));
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this expense?",
      )
    )
      return;

    setDeletingId(expenseId);
    try {
      await api.delete(`/expenses/${expenseId}`);
      toast.success("Expense deleted successfully");
      fetchCategoryExpenses();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  const grandTotal = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-4 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-row items-center justify-between shrink-0 shadow-sm z-20 gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 border border-slate-700/50 shadow-sm flex items-center justify-center text-white shrink-0">
            <Building2 size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0">
                ID: {category.id}
              </span>
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 bg-blue-50 text-blue-600">
                Category Ledger
              </span>
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {category.category_name}
            </h2>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-full sm:rounded-[10px] transition-all shadow-sm active:scale-95 flex items-center justify-center"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 sm:py-4 shrink-0 z-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={16} strokeWidth={2} />
          </div>
          <input
            type="text"
            placeholder="Search expenses by reason..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              if (e.target.value === "") {
                setFilters((prev) => ({ ...prev, search: "" }));
              }
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full h-[44px] pl-10 pr-4 bg-slate-50/50 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-[13px] font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] placeholder:text-slate-400"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch("");
                setFilters((prev) => ({ ...prev, search: "" }));
              }}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="relative group w-full sm:w-[180px] shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Calendar size={15} strokeWidth={2} />
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
            className="w-full appearance-none h-[44px] pl-10 pr-8 bg-slate-50/50 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-[13px] font-semibold text-slate-700 cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 transition-colors z-10">
            <ChevronDown size={14} strokeWidth={2.5} />
          </div>
        </div>
      </div>
      <AnimatePresence>
        {filters.date_filter === "custom" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/80 border-b border-slate-200/60 overflow-hidden shrink-0"
          >
            <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                Custom Range
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                  className="h-[36px] sm:h-[40px] px-3 bg-white border border-slate-200/80 rounded-[10px] sm:rounded-[12px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all text-[12px] font-semibold text-slate-700 shadow-sm shrink-0"
                />
                <span className="text-slate-400 text-[12px] font-bold px-1 shrink-0">
                  -
                </span>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                  className="h-[36px] sm:h-[40px] px-3 bg-white border border-slate-200/80 rounded-[10px] sm:rounded-[12px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all text-[12px] font-semibold text-slate-700 shadow-sm shrink-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        <motion.div
          variants={fadeScale}
          initial="hidden"
          animate="show"
          className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
            <div className="flex flex-col p-4 sm:p-5">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Wallet size={14} className="text-blue-500" />
                Total Amount In View
              </p>
              <CurrencyFormat
                amount={grandTotal}
                className="text-[24px] sm:text-[28px] font-black text-slate-900 tracking-tight"
              />
            </div>
            <div className="flex flex-col p-4 sm:p-5 justify-center">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Receipt size={14} className="text-emerald-500" />
                Transactions Found
              </p>
              <p className="text-[20px] sm:text-[24px] font-black text-slate-700 tracking-tight tabular-nums">
                {expenses.length}
              </p>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0 bg-white sm:overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ArrowDownRight size={14} className="text-rose-500" /> Expense
                History
              </h4>
            </div>

            <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2
                    size={32}
                    strokeWidth={1.5}
                    className="animate-spin mb-4 text-blue-500"
                  />
                  <span className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">
                    Loading ledger data...
                  </span>
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-16 m-4 sm:m-6">
                  <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                    <Filter
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400"
                    />
                  </div>
                  <p className="text-[15px] font-bold tracking-tight text-slate-900">
                    No expenses found
                  </p>
                  <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                    Try adjusting your search or date filters.
                  </p>
                </div>
              ) : (
                <>
                  <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                    <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                      <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <th className="px-6 py-3 font-bold align-middle w-[140px]">
                          Date
                        </th>
                        <th className="px-4 py-3 font-bold align-middle w-[100px]">
                          Ref ID
                        </th>
                        <th className="px-4 py-3 font-bold align-middle min-w-[250px]">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-right font-bold align-middle w-[150px]">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-right font-bold align-middle w-[80px]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group align-middle"
                        >
                          <td className="px-6 py-4 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                            {formatDate(item.expense_date)}
                          </td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-500 font-mono align-middle">
                            #{item.id}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <span className="text-[13px] font-bold text-slate-900 leading-snug whitespace-normal line-clamp-2">
                              {item.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right align-middle">
                            <span className="text-[14px] font-black text-rose-600 tabular-nums tracking-tight">
                              {formatINR(item.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right align-middle">
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              disabled={deletingId === item.id}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95 disabled:opacity-50 inline-flex items-center justify-center opacity-100 lg:opacity-0 group-hover:opacity-100"
                              title="Delete Expense"
                            >
                              {deletingId === item.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin text-rose-500"
                                />
                              ) : (
                                <Trash2 size={16} strokeWidth={2} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                    {expenses.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                            Ref: #{item.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {formatDate(item.expense_date)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[13px] font-bold text-slate-900 leading-snug break-words flex-1">
                            {item.reason}
                          </span>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[15px] font-black text-rose-600 tabular-nums tracking-tight leading-none mt-0.5">
                              {formatINR(item.amount)}
                            </span>
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              disabled={deletingId === item.id}
                              className="text-[10px] font-bold text-slate-500 bg-white hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 px-2.5 py-1.5 rounded-[8px] transition-colors border border-slate-200 flex items-center gap-1.5 mt-1 disabled:opacity-50 shadow-sm"
                            >
                              {deletingId === item.id ? (
                                <Loader2
                                  size={12}
                                  className="animate-spin text-rose-500"
                                />
                              ) : (
                                <Trash2 size={12} strokeWidth={2.5} />
                              )}{" "}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
};

export default CategoryDetailsModal;
