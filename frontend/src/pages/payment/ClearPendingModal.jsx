import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Banknote, History } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const fadeScale = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: themeSpring },
  exit: { opacity: 0, scale: 0.96, y: 15, transition: { duration: 0.2 } },
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const ClearPendingModal = ({ person, pendingAmount, onClose, onSaved }) => {
  const [amount, setAmount] = useState(pendingAmount.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    const payAmount = Number(amount);
    if (payAmount <= 0) return toast.error("Enter a valid amount");
    if (payAmount > pendingAmount)
      return toast.error("Cannot pay more than pending dues!");

    setSaving(true);
    try {
      await api.post("/payments", {
        payment_date: new Date().toISOString().split("T")[0],
        personnel_id: person.id,
        amount: payAmount,
        reason: "Settling Previous Pending Dues",
      });

      toast.success("Pending dues cleared successfully!");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to clear dues");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          variants={fadeScale}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-white w-full max-w-md rounded-[28px] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200/80 overflow-hidden z-10 flex flex-col"
        >
          <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center bg-white/50 backdrop-blur-sm">
            <h3 className="text-[18px] text-slate-900 font-bold flex items-center gap-3 tracking-tight">
              <div className="w-9 h-9 rounded-[12px] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                <Banknote size={18} strokeWidth={2.5} />
              </div>
              Clear Pending Dues
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-[10px] transition-all active:scale-95"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="p-6 space-y-7">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[16px] font-bold text-blue-700 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] shrink-0">
                {(person?.full_name || "CT").substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                  Contractor Profile
                </p>
                <p className="text-[16px] font-bold text-slate-900 tracking-tight leading-none truncate">
                  {person?.full_name}
                </p>
              </div>
            </div>
            <div className="bg-slate-50/60 border border-slate-200/60 p-5 rounded-[20px] flex justify-between items-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
              <span className="text-[13px] font-semibold text-slate-600">
                Total Pending Dues
              </span>
              <span className="text-[20px] font-black text-rose-600 tracking-tight">
                {formatINR(pendingAmount)}
              </span>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2.5 ml-1">
                Amount to clear today
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[10px] bg-white border border-slate-200/80 flex items-center justify-center shadow-sm z-10 pointer-events-none transition-colors group-focus-within:border-emerald-200 group-focus-within:text-emerald-600">
                  <span className="font-bold text-[14px]">₹</span>
                </div>

                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-[56px] pl-[56px] pr-4 bg-slate-50/50 border border-slate-200/80 rounded-[16px] text-[18px] font-black text-slate-900 outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] placeholder:text-slate-300 placeholder:font-medium"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100/80 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-[48px] text-[14px] font-bold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 rounded-[14px] transition-all active:scale-95 shadow-sm"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={handleSave}
              className="flex-1 h-[48px] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-800/50 text-white rounded-[14px] text-[14px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin text-white/80" />
              ) : (
                <Banknote size={18} className="text-emerald-400" />
              )}
              Confirm Payment
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default ClearPendingModal;
