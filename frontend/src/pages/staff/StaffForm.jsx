import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Phone,
  MapPin,
  Wrench,
  Settings,
  Loader2,
  CheckCircle2,
  Plus,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../../api/axios";

const smoothEase = [0.22, 1, 0.36, 1];

const StaffForm = ({ staff, onClose, onSuccess }) => {
  const isEdit = !!staff;

  const [formData, setFormData] = useState({
    name: staff?.full_name || "",
    phone: staff?.phone || "",
    address: staff?.address || "",
    category: staff?.personnel_type || "STAFF",
    work_types: staff?.work_types || [],
    machine_ids: staff?.machine_ids || [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [masters, setMasters] = useState({ machines: [], workTypes: [] });
  const [newWorkType, setNewWorkType] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [machinesRes, workTypesRes] = await Promise.all([
          api.get("/machines"),
          api.get("/staff/work-types"),
        ]);
        setMasters({
          machines: machinesRes.data?.data || [],
          workTypes: workTypesRes.data?.data || [],
        });
      } catch (err) {
        console.error("Failed to load master data", err);
      }
    };
    fetchMasters();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSelection = (field, idOrName) => {
    setFormData((prev) => {
      const currentList = prev[field] || [];
      const exists = currentList.includes(idOrName);
      return {
        ...prev,
        [field]: exists
          ? currentList.filter((item) => item !== idOrName)
          : [...currentList, idOrName],
      };
    });
  };

  const handleAddCustomWorkType = (e) => {
    e.preventDefault();
    if (!newWorkType.trim()) return;
    const formattedType = newWorkType.trim().toUpperCase();
    if (!formData.work_types.includes(formattedType)) {
      setFormData((prev) => ({
        ...prev,
        work_types: [...prev.work_types, formattedType],
      }));
    }
    setNewWorkType("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim() || !formData.phone.trim()) {
      return setError("Name and Phone are required.");
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/staff/${staff.id}`, formData);
        toast.success("Worker updated successfully.");
      } else {
        await api.post("/staff", formData);
        toast.success("New worker added successfully.");
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save worker data.");
    } finally {
      setLoading(false);
    }
  };

  const allDisplayWorkTypes = useMemo(() => {
    const masterNames = masters.workTypes.map((w) => w.work_type_name);
    return [...new Set([...masterNames, ...(formData.work_types || [])])];
  }, [masters.workTypes, formData.work_types]);

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
          className="w-full max-w-[520px] max-h-[90vh] bg-white rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden relative z-10 flex flex-col transform-gpu"
        >
          <div className="px-6 pt-6 pb-5 flex items-start justify-between bg-white border-b border-slate-100/80 relative">
            <div className="flex gap-4 items-center pr-8">
              <div
                className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${
                  formData.category === "STAFF"
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-purple-50 border-purple-200/60 text-purple-600"
                }`}
              >
                <Briefcase size={22} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1.5">
                  {isEdit ? "Update Worker" : "Add New Worker"}
                </h3>
                <p className="text-[12px] font-medium text-slate-500">
                  {isEdit
                    ? `Editing details for ${formData.name}`
                    : "Enter details for the new worker"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="absolute top-6 right-6 p-2 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors active:scale-95 shadow-sm"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            id="staff-form-pro"
            className="p-6 space-y-6 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="bg-slate-100/80 p-1 rounded-[14px] flex items-center border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              {["STAFF", "CONTRACTOR"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`flex-1 py-2 text-[11px] font-bold tracking-widest uppercase rounded-[11px] transition-all ${
                    formData.category === cat
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                    />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter name..."
                      className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <Phone
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="10-digit number"
                      className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Home Address
                </label>
                <div className="relative group">
                  <MapPin
                    size={16}
                    className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Enter full address..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Wrench size={14} /> Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {allDisplayWorkTypes.map((type) => {
                  const isSelected = formData.work_types.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSelection("work_types", type)}
                      className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold uppercase transition-all border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWorkType}
                  onChange={(e) => setNewWorkType(e.target.value)}
                  placeholder="Add other skill..."
                  className="flex-1 h-[38px] px-4 bg-slate-50 border border-slate-200/80 rounded-[10px] text-[11px] font-bold uppercase outline-none focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddCustomWorkType}
                  className="px-4 bg-slate-900 text-white rounded-[10px] text-[11px] font-bold uppercase flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Settings size={14} /> Machine Access
              </label>
              <div className="grid grid-cols-2 gap-2">
                {masters.machines.map((machine) => {
                  const isSelected = formData.machine_ids.includes(machine.id);
                  return (
                    <div
                      key={machine.id}
                      onClick={() => toggleSelection("machine_ids", machine.id)}
                      className={`p-3 rounded-[16px] border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100"
                          : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-[12px] font-bold truncate ${isSelected ? "text-blue-700" : "text-slate-700"}`}
                        >
                          {machine.machine_name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {machine.machine_type}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-slate-100 border-slate-200"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle2 size={10} strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 text-rose-600 text-[12px] font-semibold bg-rose-50 border border-rose-100 p-3 rounded-[14px]"
                >
                  <ShieldAlert size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="p-6 bg-white border-t border-slate-100/80 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[46px] text-[13px] font-bold text-slate-500 hover:bg-slate-50 rounded-[14px] transition-colors"
            >
              Cancel
            </button>
            <button
              form="staff-form-pro"
              type="submit"
              disabled={loading}
              className="flex-[2] h-[46px] bg-slate-900 text-white rounded-[14px] text-[13px] font-bold transition-all hover:bg-slate-800 shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                  {isEdit ? "Update Details" : "Save Details"}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default StaffForm;
