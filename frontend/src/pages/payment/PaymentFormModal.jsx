import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  ShieldAlert,
  Calendar,
  User,
  FileText,
  ChevronDown,
  Receipt,
  Wallet,
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

const PaymentFormModal = ({
  payment,
  personnelList = [],
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState(
    payment || {
      payment_date: new Date().toISOString().split("T")[0],
      personnel_id: "",
      amount: "",
      reason: "",
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSystemRecord =
    payment?.reason?.includes("| BILL:") ||
    payment?.reason?.includes("| SETTLED:");

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSystemRecord) return;

    setError("");

    if (!form.payment_date) return setError("Payment date is required.");
    if (!form.personnel_id)
      return setError("Please select a personnel member.");
    if (!form.amount || Number(form.amount) <= 0)
      return setError("Please enter a valid amount.");
    if (!form.reason.trim()) return setError("Reason/Description is required.");

    setLoading(true);
    try {
      if (payment) {
        await api.patch(`/payments/${payment.id}`, form);
        toast.success("Payment record updated.");
      } else {
        await api.post("/payments", form);
        toast.success("Payment registered successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to process transaction.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-white w-full max-w-[480px] rounded-[24px] sm:rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden flex flex-col h-auto max-h-[92dvh] sm:max-h-[85vh] z-10"
        >
          <div className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-slate-100/80 flex items-start justify-between gap-4 shrink-0 min-w-0">
            <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${payment ? "bg-blue-50 border-blue-200/60 text-blue-600" : "bg-emerald-50 border-emerald-200/60 text-emerald-600"}`}
              >
                {payment ? (
                  <Receipt size={20} strokeWidth={1.5} />
                ) : (
                  <Wallet size={20} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-1.5 truncate">
                  {payment
                    ? isSystemRecord
                      ? "View Settlement"
                      : "Modify Payment"
                    : "Execute Payout"}
                </h3>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 truncate">
                  {payment
                    ? "Review transaction details"
                    : "Log distribution to personnel"}
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
            className="flex flex-col flex-1 overflow-hidden min-w-0"
          >
            <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-4 sm:space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0">
              {/* 🌟 PRO FIX 1: Ledger Protection Banner */}
              {isSystemRecord && (
                <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200/60 rounded-[14px] flex items-start gap-3 min-w-0">
                  <ShieldAlert
                    size={20}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-[12px] font-medium text-amber-800 leading-snug">
                    <strong className="block text-amber-900 mb-0.5 text-[13px] truncate">
                      System Generated Record
                    </strong>
                    To preserve ledger integrity, settlement amounts and tags
                    cannot be manually edited. To fix mistakes, delete this
                    record and generate a new slip.
                  </p>
                </div>
              )}
              <div className="min-w-0 w-full flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1 truncate">
                  Transaction Date
                </label>
                <div className="flex items-center w-full h-[44px] px-3 bg-slate-50/60 border border-slate-200/80 rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 transition-all overflow-hidden box-border group shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                  <Calendar
                    size={15}
                    strokeWidth={1.5}
                    className="text-slate-400 shrink-0 mr-2.5 group-focus-within:text-blue-500 transition-colors"
                  />
                  <input
                    type="date"
                    disabled={loading || isSystemRecord}
                    value={form.payment_date}
                    onChange={(e) =>
                      setForm({ ...form, payment_date: e.target.value })
                    }
                    className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="min-w-0 w-full flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1 truncate">
                  Personnel Identity
                </label>
                <div className="relative group w-full min-w-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <User size={15} strokeWidth={1.5} />
                  </div>
                  <select
                    disabled={loading || isSystemRecord}
                    value={form.personnel_id}
                    onChange={(e) =>
                      setForm({ ...form, personnel_id: e.target.value })
                    }
                    className={`w-full min-w-0 h-[44px] pl-9 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold focus:bg-white focus:border-blue-400/50 outline-none transition-all appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60 truncate ${!form.personnel_id ? "text-slate-400" : "text-slate-900"}`}
                  >
                    <option value="" disabled>
                      Select beneficiary
                    </option>
                    {personnelList?.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900"
                      >
                        {p.full_name} ({p.personnel_type})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 z-10">
                    <ChevronDown size={14} strokeWidth={2} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-5 min-w-0">
                <div className="min-w-0 w-full flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1 truncate">
                    Amount
                  </label>
                  <div className="relative group w-full min-w-0">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600 font-bold text-[15px] z-10">
                      ₹
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      disabled={loading || isSystemRecord}
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full min-w-0 h-[46px] pl-9 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[16px] font-bold focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-300 tabular-nums shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="min-w-0 w-full flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1 truncate">
                    Remarks / Description
                  </label>
                  <div className="relative group w-full min-w-0">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                      <FileText size={16} strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      disabled={loading || isSystemRecord}
                      value={form.reason}
                      onChange={(e) =>
                        setForm({ ...form, reason: e.target.value })
                      }
                      placeholder="e.g., Advance payment"
                      className="w-full min-w-0 h-[46px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden min-w-0"
                  >
                    <div className="flex items-center gap-2 text-rose-600 text-[12px] font-bold bg-rose-50/80 border border-rose-100 p-3.5 rounded-[14px] mt-3">
                      <ShieldAlert
                        size={16}
                        strokeWidth={2}
                        className="shrink-0"
                      />
                      <span className="truncate">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-5 sm:pb-5 bg-white border-t border-slate-100/80 flex items-center gap-3 relative z-10 shrink-0 min-w-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={`flex-1 min-w-0 h-[44px] sm:h-[48px] text-[13px] font-bold transition-colors disabled:opacity-50 active:scale-95 rounded-[14px] sm:rounded-[16px] truncate ${isSystemRecord ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-600 bg-slate-100/80 hover:bg-slate-200"}`}
              >
                {isSystemRecord ? "Close View" : "Cancel"}
              </button>

              {!isSystemRecord && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] min-w-0 h-[44px] sm:h-[48px] bg-slate-900 text-white rounded-[14px] sm:rounded-[16px] text-[13px] font-bold transition-all hover:bg-slate-800 shadow-sm active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-slate-400 shrink-0"
                    />
                  ) : (
                    <>
                      <CheckCircle2
                        size={18}
                        strokeWidth={2}
                        className="shrink-0"
                      />
                      <span className="truncate">
                        {payment ? "Update Record" : "Register Payout"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default PaymentFormModal;
