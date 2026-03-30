import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Tags,
  IndianRupee,
  FileText,
  Loader2,
  ShieldAlert,
  ChevronDown,
  Receipt,
  CheckCircle2,
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

const ExpenseFormModal = ({ expense, categories, onClose, onSaved }) => {
  const [form, setForm] = useState(
    expense || {
      expense_date: new Date().toISOString().split("T")[0],
      category_id: "",
      amount: "",
      reason: "",
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.expense_date) return setError("Expense date is required.");
    if (!form.category_id) return setError("Please select a category.");
    if (!form.amount || Number(form.amount) <= 0)
      return setError("Please enter a valid amount.");
    if (!form.reason.trim()) return setError("Reason/Description is required.");

    setLoading(true);
    try {
      if (expense) {
        await api.patch(`/expenses/${expense.id}`, form);
        toast.success("Expense record updated.");
      } else {
        await api.post("/expenses", form);
        toast.success("Expense registered successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to process expenditure entry.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-white w-full max-w-[480px] rounded-[28px] sm:rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden flex flex-col h-auto max-h-[90dvh] sm:max-h-[85vh] z-10"
        >
          <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-100/80 flex items-start justify-between gap-4 shrink-0">
            <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${
                  expense
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-amber-50 border-amber-200/60 text-amber-600"
                }`}
              >
                <Receipt size={20} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-1.5 truncate">
                  {expense ? "Modify Expense" : "Record Outflow"}
                </h3>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 truncate">
                  {expense
                    ? "Update expenditure details"
                    : "Log new operational expense"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-5 sm:space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="min-w-0 w-full relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Expense Date
                  </label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                      <Calendar size={15} strokeWidth={1.5} />
                    </div>
                    <input
                      type="date"
                      disabled={loading}
                      value={form.expense_date}
                      onChange={(e) =>
                        setForm({ ...form, expense_date: e.target.value })
                      }
                      className="appearance-none m-0 py-0 leading-normal flex items-center justify-between block w-full box-border h-[44px] pl-9 pr-3 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold focus:bg-white focus:border-blue-400/50 outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer"
                    />
                  </div>
                </div>
                <div className="min-w-0 w-full">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Category
                  </label>
                  <div className="relative group w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                      <Tags size={15} strokeWidth={1.5} />
                    </div>
                    <select
                      disabled={loading}
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({ ...form, category_id: e.target.value })
                      }
                      className={`w-full h-[44px] pl-9 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold focus:bg-white focus:border-blue-400/50 outline-none transition-all appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${
                        !form.category_id ? "text-slate-400" : "text-slate-800"
                      }`}
                    >
                      <option value="" disabled>
                        Select Category
                      </option>
                      {categories
                        .filter((c) => c.is_active || c.id === form.category_id)
                        .map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            className="text-slate-800"
                          >
                            {c.category_name}
                          </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 z-10">
                      <ChevronDown size={14} strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 w-full">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  Transaction Amount
                </label>
                <div className="relative group w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600 font-bold text-[15px] z-10">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    disabled={loading}
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full h-[46px] pl-9 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[16px] font-bold focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-300 tabular-nums shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
              </div>
              <div className="min-w-0 w-full">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  Purpose / Description
                </label>
                <div className="relative group w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <FileText size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    disabled={loading}
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                    placeholder="e.g., Office Supplies, Electricity bill..."
                    className="w-full h-[46px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 text-rose-600 text-[13px] font-medium bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-[16px]">
                      <ShieldAlert
                        size={16}
                        strokeWidth={1.5}
                        className="shrink-0"
                      />
                      <span className="leading-tight">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-5 sm:pb-5 bg-white border-t border-slate-100/80 flex items-center gap-3 relative z-10 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-[48px] text-[13px] font-bold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[14px] sm:rounded-[16px] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-[48px] bg-slate-900 text-white rounded-[14px] sm:rounded-[16px] text-[13px] font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2} />
                    {expense ? "Update Record" : "Register Expense"}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default ExpenseFormModal;
