import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import { motion } from "framer-motion";
import { X, Loader2, Save, Database, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const RawMaterialMasterModal = ({ material, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    material_name: "",
    default_uom: "KG",
    is_active: true,
  });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (material) {
      setForm({
        material_name: material.material_name,
        default_uom: material.default_uom,
        is_active: material.is_active,
      });
    }
  }, [material]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (material) {
        await api.put(`/raw-materials/master/${material.id}`, form);
        toast.success("Material updated successfully.");
      } else {
        await api.post("/raw-materials/master", form);
        toast.success("Material added to master list.");
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 antialiased selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 bg-slate-50 w-full max-w-md max-h-[90vh] rounded-[24px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/60 m-auto transform-gpu"
      >
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-200/80 flex justify-between items-center flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-slate-50 border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-500 shrink-0">
              <Database size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-tight">
                {material ? "Edit Material" : "New Material"}
              </h2>
              <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight mt-0.5">
                Define item for inventory ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100/80 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm active:scale-95"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 scrollbar-hide">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-0.5">
                Material Composition
              </label>
              <input
                type="text"
                required
                value={form.material_name}
                onChange={(e) =>
                  setForm({ ...form, material_name: e.target.value })
                }
                placeholder="e.g. HR Coil Grade A"
                className="w-full h-[44px] px-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-[14px] text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* UOM Select */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-0.5">
                  Default Unit
                </label>
                <div className="relative group">
                  <select
                    value={form.default_uom}
                    onChange={(e) =>
                      setForm({ ...form, default_uom: e.target.value })
                    }
                    className="w-full appearance-none h-[44px] pl-4 pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-[14px] text-[13px] font-medium text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none cursor-pointer"
                  >
                    <option value="KG">Kilograms (KG)</option>
                    <option value="TON">Tons (TON)</option>
                    <option value="PC">Pieces (PC)</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={16}
                    strokeWidth={2}
                  />
                </div>
              </div>
              {material && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-0.5">
                    Status
                  </label>
                  <div className="relative group">
                    <select
                      value={form.is_active}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_active: e.target.value === "true",
                        })
                      }
                      className={`w-full appearance-none h-[44px] pl-4 pr-10 border rounded-[12px] sm:rounded-[14px] text-[13px] font-bold outline-none cursor-pointer transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] ${
                        form.is_active
                          ? "bg-emerald-50/50 text-emerald-700 border-emerald-200/80 focus:ring-4 focus:ring-emerald-500/10"
                          : "bg-rose-50/50 text-rose-700 border-rose-200/80 focus:ring-4 focus:ring-rose-500/10"
                      }`}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                    <ChevronDown
                      className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                        form.is_active ? "text-emerald-500" : "text-rose-500"
                      }`}
                      size={16}
                      strokeWidth={2}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="pt-4 mt-2">
              <motion.button
                whileTap={!loading ? { scale: 0.98 } : {}}
                type="submit"
                disabled={loading}
                className="w-full h-[44px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] font-semibold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2
                      className="animate-spin"
                      size={16}
                      strokeWidth={2}
                    />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} strokeWidth={2} className="text-white/90" />
                    <span>{material ? "Update Master" : "Save to Master"}</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default RawMaterialMasterModal;
