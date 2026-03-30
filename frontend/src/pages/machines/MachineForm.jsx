import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Cog,
  Settings,
  Weight,
  Gauge,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Power,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const MachineForm = ({ machine, onClose, onSuccess }) => {
  const [machineName, setMachineName] = useState(machine?.machine_name || "");
  const [physicalWeight, setPhysicalWeight] = useState(
    machine?.physical_weight_kg || "",
  );
  const [capacityPerHour, setCapacityPerHour] = useState(
    machine?.capacity_per_hour || "",
  );
  const [capacityUom, setCapacityUom] = useState(machine?.capacity_uom || "KG");
  const [status, setStatus] = useState(machine?.status || "ACTIVE");
  const [isActive, setIsActive] = useState(machine?.is_active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!machineName.trim())
      return setError("Machine designation (name) is required.");
    if (physicalWeight && Number(physicalWeight) <= 0)
      return setError("Physical weight must be greater than 0.");
    if (capacityPerHour && Number(capacityPerHour) <= 0)
      return setError("Processing capacity must be greater than 0.");

    try {
      setLoading(true);
      const payload = {
        machine_name: machineName,
        physical_weight_kg: physicalWeight ? Number(physicalWeight) : null,
        capacity_per_hour: capacityPerHour ? Number(capacityPerHour) : null,
        capacity_uom: capacityUom,
        status,
        is_active: isActive,
      };

      if (machine) {
        await api.put(`/machines/${machine.id}`, payload);
        toast.success("Machine hardware profile updated.");
      } else {
        await api.post("/machines", payload);
        toast.success("New machine provisioned to floor.");
      }

      onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to configure machine. Please verify inputs.",
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
                  machine
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                {machine ? (
                  <Settings size={22} strokeWidth={1.5} />
                ) : (
                  <Plus size={22} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  {machine ? "Hardware Config" : "Provision Machine"}
                </h3>
                <p className="text-[12px] font-medium text-slate-500 truncate">
                  {machine
                    ? "Update specifications & status"
                    : "Register new floor equipment"}
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
                  Equipment Designation
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Cog size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    autoFocus={!machine}
                    disabled={loading}
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    placeholder="e.g. Polishing Unit B"
                    className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Physical Weight
                  </label>
                  <div className="relative group flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Weight size={16} strokeWidth={1.5} />
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      disabled={loading}
                      value={physicalWeight}
                      onChange={(e) => setPhysicalWeight(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-[42px] pl-10 pr-10 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                    <span className="absolute right-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 pointer-events-none">
                      KG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Processing Capacity
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Gauge size={16} strokeWidth={1.5} />
                    </div>
                    <input
                      type="number"
                      step="0.001"
                      disabled={loading}
                      value={capacityPerHour}
                      onChange={(e) => setCapacityPerHour(e.target.value)}
                      placeholder="Per Hour"
                      className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Capacity Unit
                  </label>
                  <select
                    value={capacityUom}
                    onChange={(e) => setCapacityUom(e.target.value)}
                    disabled={loading}
                    className="w-full h-[42px] pl-4 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold text-slate-700 focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  >
                    <option value="KG">Kilograms (KG)</option>
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

                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Floor Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={loading}
                    className={`w-full h-[42px] pl-4 pr-8 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60 ${
                      status === "ACTIVE"
                        ? "text-emerald-600"
                        : status === "UNDER_MAINTENANCE"
                          ? "text-orange-600"
                          : "text-slate-600"
                    }`}
                  >
                    <option value="ACTIVE">Active (Online)</option>
                    <option value="INACTIVE">Inactive (Offline)</option>
                    <option value="UNDER_MAINTENANCE">Maintenance</option>
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
            {machine && (
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
                          Record is Active
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                          Toggle visibility in dropdowns
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
                    {machine ? "Save Config" : "Deploy Machine"}
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

export default MachineForm;
