import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Package,
  Box,
  Tag,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Power,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const ProductForm = ({ item, itemType, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [defaultUom, setDefaultUom] = useState("KG");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isFinished = itemType === "FINISHED";

  useEffect(() => {
    if (item) {
      setName(isFinished ? item.product_name : item.item_name);
      setCode(isFinished ? item.product_code : item.item_code);
      setDefaultUom(item.default_uom);
      setIsActive(item.is_active);
    }
  }, [item, isFinished]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required.");
    if (!code.trim()) return setError("Code is required.");

    try {
      setLoading(true);

      const payload = isFinished
        ? {
            product_name: name,
            product_code: code,
            default_uom: defaultUom,
            is_active: isActive,
          }
        : {
            item_name: name,
            item_code: code,
            default_uom: defaultUom,
            is_active: isActive,
          };

      const endpoint = isFinished ? "/products" : "/products/semi-finished";

      if (item) {
        await api.put(`${endpoint}/${item.id}`, payload);
        toast.success(
          `${isFinished ? "Product" : "WIP Item"} updated securely.`,
        );
      } else {
        await api.post(endpoint, payload);
        toast.success(
          `${isFinished ? "Product" : "WIP Item"} provisioned successfully.`,
        );
      }
      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Operation failed. Please verify inputs.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="w-full max-w-[480px] bg-white rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden relative z-10 flex flex-col transform-gpu"
        >
          <div className="px-6 pt-6 pb-5 flex items-start justify-between bg-white border-b border-slate-100/80 relative">
            <div className="flex gap-4 items-center pr-8">
              <div
                className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${
                  isFinished
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                {isFinished ? (
                  <Package size={22} strokeWidth={1.5} />
                ) : (
                  <Layers size={22} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  {item
                    ? "Edit Record"
                    : isFinished
                      ? "New Finished Good"
                      : "New WIP Item"}
                </h3>
                <p className="text-[12px] font-medium text-slate-500 truncate">
                  {item ? `Managing ${code}` : "Define stock master record"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-6 right-6 p-2 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  Item Identity Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Box size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    autoFocus={!item}
                    disabled={loading}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      isFinished
                        ? "e.g. Polished Steel Pipe"
                        : "e.g. Rough Cut Square"
                    }
                    className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Identity Code
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Tag size={16} strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SP-001"
                      className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-bold focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 uppercase shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Base Unit
                  </label>
                  <select
                    value={defaultUom}
                    onChange={(e) => setDefaultUom(e.target.value)}
                    disabled={loading}
                    className="w-full h-[42px] pl-4 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold text-slate-700 focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="TON">Tons (TON)</option>
                    <option value="PC">Pieces (PC)</option>
                  </select>
                  <div className="absolute right-3 bottom-0 h-[42px] flex items-center pointer-events-none">
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {item && (
              <div className="pt-2">
                <div className="flex flex-col gap-1 p-3 bg-slate-50/50 border border-slate-200/80 rounded-[20px]">
                  <label className="flex items-center justify-between cursor-pointer group p-2 rounded-[14px] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/60">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Power size={14} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-900 tracking-tight">
                          Active Master Record
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                          Toggle item availability system-wide
                        </span>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isActive}
                        onChange={() => setIsActive(!isActive)}
                        disabled={loading}
                      />
                      <div className="w-[36px] h-[20px] bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                    </div>
                  </label>
                </div>
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 text-rose-600 text-[13px] font-medium bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-[16px]">
                    <ShieldAlert
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 mt-0.5 text-rose-500"
                    />
                    <span className="leading-tight">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100/80 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-[44px] text-[13px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[14px] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-[44px] bg-slate-900 text-white rounded-[14px] text-[13px] font-semibold transition-all hover:bg-slate-800 shadow-sm active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2
                    size={16}
                    strokeWidth={2}
                    className="animate-spin text-slate-400"
                  />
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2} />
                    {item ? "Update Record" : "Save to Master"}
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

export default ProductForm;
