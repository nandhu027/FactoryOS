import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Building2,
  Phone,
  MapPin,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Plus,
  Power,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const typeOptions = [
  { label: "Purchase", value: "PURCHASE" },
  { label: "Sale", value: "SALE" },
  { label: "Job Work", value: "JOB_WORK" },
];

const PartyForm = ({ party, onClose }) => {
  const [partyName, setPartyName] = useState(
    party?.party_name || party?.name || "",
  );
  const [phone, setPhone] = useState(party?.phone || "");
  const [address, setAddress] = useState(party?.address || "");
  const [types, setTypes] = useState(party?.types || []);
  const [isActive, setIsActive] = useState(party?.is_active ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const toggleType = (value) => {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!partyName.trim()) return setError("Party name is required.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!address.trim()) return setError("Address is required.");
    if (types.length === 0)
      return setError("Please select at least one party role.");

    try {
      setLoading(true);
      const payload = {
        name: partyName,
        phone,
        address,
        types,
        is_active: isActive,
      };

      if (party?.id) {
        await api.put(`/parties/${party.id}`, payload);
        toast.success("Party updated successfully.");
      } else {
        await api.post("/parties", payload);
        toast.success("New party created.");
      }

      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "An error occurred while saving.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 lg:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="relative bg-white w-full max-w-[440px] rounded-[20px] sm:rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] transform-gpu z-10"
        >
          <div className="px-4 py-3.5 sm:px-6 sm:py-5 bg-white border-b border-slate-100/80 flex items-start justify-between gap-3 shrink-0">
            <div className="flex gap-2.5 sm:gap-3 items-center min-w-0">
              <div
                className={`w-9 h-9 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[14px] flex items-center justify-center shadow-sm border shrink-0 ${
                  party
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                {party ? (
                  <Building2
                    size={16}
                    className="sm:w-5 sm:h-5"
                    strokeWidth={1.5}
                  />
                ) : (
                  <Plus size={16} className="sm:w-5 sm:h-5" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-0.5 sm:mb-1 truncate">
                  {party ? "Edit Party" : "Add Party"}
                </h3>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 truncate">
                  Manage customer or supplier details
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 sm:p-2 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-[8px] sm:rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
            >
              <X size={16} className="sm:w-5 sm:h-5" strokeWidth={2} />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 text-blue-600 text-[10px] sm:text-[11px] font-semibold px-3 py-2 rounded-[8px] sm:rounded-[10px]">
                <Info size={14} strokeWidth={2.5} className="shrink-0" />
                All fields are required to proceed.
              </div>
              <div className="space-y-3 sm:space-y-3.5">
                <div>
                  <label className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 block ml-1">
                    Party Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Building2
                        size={16}
                        strokeWidth={1.5}
                        className="sm:w-4 sm:h-4"
                      />
                    </div>
                    <input
                      type="text"
                      autoFocus={!party}
                      disabled={loading}
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="Company or Person Name"
                      className="w-full h-[40px] sm:h-[44px] pl-9 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[10px] sm:rounded-[12px] text-[13px] sm:text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 block ml-1">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Phone
                        size={16}
                        strokeWidth={1.5}
                        className="sm:w-4 sm:h-4"
                      />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number"
                      className="w-full h-[40px] sm:h-[44px] pl-9 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[10px] sm:rounded-[12px] text-[13px] sm:text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 sm:mb-1.5 block ml-1">
                    Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 pt-[12px] pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <MapPin
                        size={16}
                        strokeWidth={1.5}
                        className="sm:w-4 sm:h-4"
                      />
                    </div>
                    <textarea
                      disabled={loading}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full Address"
                      rows={2}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50/60 border border-slate-200/80 rounded-[10px] sm:rounded-[12px] text-[13px] sm:text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-1">
                <label className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                  Party Roles (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {typeOptions.map((opt) => {
                    const isSelected = types.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={loading}
                        onClick={() => toggleType(opt.value)}
                        className={`relative flex items-center justify-center gap-1.5 h-[36px] sm:h-[40px] px-2 sm:px-3 rounded-[8px] sm:rounded-[10px] text-[11px] sm:text-[12px] font-bold transition-all duration-200 border ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm active:scale-95"
                            : "bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300 active:scale-95"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2
                            size={14}
                            strokeWidth={2.5}
                            className="sm:w-4 sm:h-4"
                          />
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {party && (
                <div className="pt-1">
                  <div className="flex flex-col gap-1 p-2 sm:p-2.5 bg-slate-50/50 border border-slate-200/80 rounded-[12px] sm:rounded-[14px]">
                    <label className="flex items-center justify-between cursor-pointer group p-1.5 sm:p-2 rounded-[8px] sm:rounded-[10px] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/60">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-4">
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Power
                            size={12}
                            strokeWidth={2.5}
                            className="sm:w-3.5 sm:h-3.5"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] sm:text-[13px] font-semibold text-slate-900 tracking-tight truncate">
                            Active Party
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 truncate mt-0.5">
                            Allow operations with this party
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
                        <div className="w-[28px] h-[16px] sm:w-[32px] sm:h-[18px] bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[12px] after:w-[12px] sm:after:h-[14px] sm:after:w-[14px] after:transition-all peer-checked:bg-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2 text-rose-600 text-[11px] sm:text-[12px] font-medium bg-rose-50/80 border border-rose-200/80 p-2.5 sm:p-3 rounded-[10px] sm:rounded-[12px]">
                      <ShieldAlert
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0 mt-0.5 text-rose-500 sm:w-4 sm:h-4"
                      />
                      <span className="leading-tight">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-t border-slate-100/80 flex items-center gap-2.5 sm:gap-3 relative z-10 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-[40px] sm:h-[44px] text-[12px] sm:text-[13px] font-bold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[10px] sm:rounded-[12px] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-[40px] sm:h-[44px] bg-slate-900 text-white rounded-[10px] sm:rounded-[12px] text-[12px] sm:text-[13px] font-bold transition-all hover:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {loading ? (
                  <Loader2
                    size={16}
                    strokeWidth={2}
                    className="animate-spin text-slate-400 sm:w-4 sm:h-4"
                  />
                ) : (
                  <>
                    <CheckCircle2
                      size={16}
                      strokeWidth={2}
                      className="sm:w-4 sm:h-4"
                    />
                    {party ? "Save Changes" : "Save Party"}
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

export default PartyForm;
