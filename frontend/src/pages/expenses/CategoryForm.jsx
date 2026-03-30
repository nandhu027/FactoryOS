import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Tags,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Power,
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

const CategoryForm = ({ category, onClose, onSaved }) => {
  const [form, setForm] = useState(
    category || { category_name: "", is_active: true },
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

    if (!form.category_name.trim()) {
      return setError("Category designation is required.");
    }

    setLoading(true);
    try {
      if (category) {
        await api.patch(`/expenses/categories/${category.id}`, form);
        toast.success("Category updated.");
      } else {
        await api.post("/expenses/categories", form);
        toast.success("Classification registered.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to save classification.",
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
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-white w-full max-w-[440px] rounded-[28px] sm:rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden flex flex-col h-auto max-h-[90dvh] sm:max-h-[85vh] z-10"
        >
          <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-100/80 flex items-start justify-between gap-4 shrink-0">
            <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${
                  category
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                <Tags size={20} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-1.5 truncate">
                  {category ? "Edit Category" : "New Classification"}
                </h3>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 truncate">
                  {category
                    ? "Modify ledger tag"
                    : "Define a new expense category"}
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
              {/* Context Badge for Edit Mode */}
              {category && (
                <div className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-200/80 rounded-[16px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-8 h-8 rounded-[10px] bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                    <Tags size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-slate-900 leading-tight truncate">
                      {category.category_name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Record ID: #{category.id}
                    </span>
                  </div>
                </div>
              )}
              <div className="min-w-0 w-full">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  Category Designation
                </label>
                <div className="relative group w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
                    <Tags size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    autoFocus={!category}
                    disabled={loading}
                    value={form.category_name}
                    onChange={(e) =>
                      setForm({ ...form, category_name: e.target.value })
                    }
                    placeholder="e.g. Raw Materials, Utilities"
                    className="w-full h-[46px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-bold focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                  />
                </div>
              </div>
              <div className="pt-1">
                <div className="flex flex-col gap-1 p-2 sm:p-3 bg-slate-50/50 border border-slate-200/80 rounded-[20px]">
                  <label className="flex items-center justify-between cursor-pointer group p-2 rounded-[14px] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/60">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          form.is_active
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Power size={14} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-900 tracking-tight">
                          Category Active
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                          Visible in ledger dropdowns
                        </span>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.is_active}
                        onChange={() =>
                          setForm({ ...form, is_active: !form.is_active })
                        }
                        disabled={loading}
                      />
                      <div className="w-[36px] h-[20px] bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                    </div>
                  </label>
                </div>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-rose-600 text-[12px] font-bold bg-rose-50/80 border border-rose-100 p-3.5 rounded-[14px] mt-2">
                      <ShieldAlert
                        size={16}
                        strokeWidth={2}
                        className="shrink-0"
                      />
                      <span>{error}</span>
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
                className="flex-[2] h-[48px] bg-slate-900 text-white rounded-[14px] sm:rounded-[16px] text-[13px] font-bold transition-all hover:bg-slate-800 shadow-sm active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2} />
                    {category ? "Update Category" : "Create Category"}
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

export default CategoryForm;
