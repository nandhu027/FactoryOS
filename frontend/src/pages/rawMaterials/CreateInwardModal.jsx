import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Database,
  Calculator,
  Layers,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0,
  );

const InputClass =
  "w-full h-[40px] sm:h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 min-w-0";
const SelectClass =
  "w-full h-[40px] sm:h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none min-w-0 truncate";
const LabelClass =
  "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

const CargoLineItem = memo(
  ({
    line,
    materialOptions,
    rawMaterials,
    onChange,
    onRemove,
    disableRemove,
  }) => {
    const handleMaterialChange = useCallback(
      (e) => {
        const val = e.target.value;
        const selectedMat = rawMaterials.find(
          (m) => m.id.toString() === val.toString(),
        );
        onChange(
          line.id,
          "raw_material_id",
          val,
          selectedMat?.default_uom || "KG",
        );
      },
      [rawMaterials, onChange, line.id],
    );

    const lineTotal = Number(line.quantity || 0) * Number(line.rate || 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 p-4 lg:p-2 bg-white lg:hover:bg-slate-50/80 rounded-[16px] border border-slate-200/80 lg:border-transparent shadow-sm lg:shadow-none transition-colors group mb-3 lg:mb-0"
      >
        <div className="flex justify-between items-center lg:hidden border-b border-slate-100 pb-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Batch Details
          </span>
          {!disableRemove && (
            <button
              type="button"
              onClick={() => onRemove(line.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex-[3] min-w-0 w-full">
          <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
            Material
          </label>
          <select
            required
            value={line.raw_material_id}
            onChange={handleMaterialChange}
            className={SelectClass}
          >
            <option value="" disabled>
              Choose Material...
            </option>
            {materialOptions}
          </select>
        </div>

        <div className="grid grid-cols-2 lg:flex lg:flex-[3] gap-3 sm:gap-4 w-full">
          <div className="flex-[2] min-w-0">
            <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
              Batch No
            </label>
            <input
              type="text"
              required
              placeholder="Batch No"
              value={line.raw_number}
              onChange={(e) => onChange(line.id, "raw_number", e.target.value)}
              className={InputClass}
            />
          </div>
          <div className="flex-[1] min-w-0">
            <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
              Thickness
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="Thick (mm)"
              value={line.thickness_mm}
              onChange={(e) =>
                onChange(line.id, "thickness_mm", e.target.value)
              }
              className={`${InputClass} lg:text-center tabular-nums`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:flex lg:flex-[3] gap-3 sm:gap-4 w-full">
          <div className="flex-[1.5] min-w-0 relative">
            <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
              Quantity
            </label>
            <input
              type="number"
              step="0.001"
              required
              placeholder="Qty"
              value={line.quantity}
              onChange={(e) => onChange(line.id, "quantity", e.target.value)}
              className={`${InputClass} pr-9 lg:text-right tabular-nums`}
            />
            <span className="absolute right-3 top-[34px] lg:top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
              {line.uom}
            </span>
          </div>

          <div className="flex-[1.5] min-w-0 relative">
            <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
              Rate
            </label>
            <span className="absolute left-3 top-[34px] lg:top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="Rate"
              value={line.rate}
              onChange={(e) => onChange(line.id, "rate", e.target.value)}
              className={`${InputClass} pl-6 lg:text-right tabular-nums`}
            />
          </div>
        </div>

        <div className="flex justify-between items-center lg:flex-[1.5] lg:justify-end min-w-0 w-full mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-slate-100 lg:border-none">
          <span className="lg:hidden text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Total Line Value
          </span>
          <div className="text-[15px] sm:text-[16px] font-black text-slate-800 tracking-tight tabular-nums lg:pr-2 truncate">
            {formatINR(lineTotal)}
          </div>
        </div>

        <div className="hidden lg:flex w-[40px] flex-shrink-0 justify-end">
          {!disableRemove && (
            <button
              type="button"
              onClick={() => onRemove(line.id)}
              className="w-[36px] h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[10px] transition-colors bg-white border border-slate-200/80 shadow-sm opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </motion.div>
    );
  },
);

const CreateInwardModal = ({ inwardId, onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(!!inwardId);
  const [parties, setParties] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  const [isDateLocked, setIsDateLocked] = useState(!!inwardId);

  const [form, setForm] = useState({
    inward_no: `INW-${Date.now().toString().slice(-6)}`,
    inward_date: new Date().toISOString().split("T")[0],
    business_model: "OWN_MANUFACTURING",
    party_id: "",
    challan_no: "",
    remarks: "",
    lines: [
      {
        id: generateId(),
        raw_material_id: "",
        raw_number: "",
        thickness_mm: "",
        quantity: "",
        rate: "",
        uom: "KG",
      },
    ],
  });

  const [billing, setBilling] = useState({
    apply_gst: false,
    gst_types: { CGST: false, SGST: false, IGST: false },
    gst_mode: "AUTO",
    rates: { CGST: 9, SGST: 9, IGST: 18 },
    manual_amounts: { CGST: "", SGST: "", IGST: "" },
    apply_round_off: true,
  });

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [partyRes, materialRes] = await Promise.all([
          api.get("/parties?limit=1000"),
          api.get("/raw-materials/master?is_active=true"),
        ]);

        const allParties = partyRes.data?.data || partyRes.data || [];
        setParties(allParties);

        const allMaterials = materialRes.data?.data || materialRes.data || [];
        setRawMaterials(allMaterials.filter((m) => m.is_active !== false));

        if (inwardId) {
          const inwardRes = await api.get(`/raw-materials/${inwardId}`);
          const existingData = inwardRes.data.data;

          setForm({
            inward_no: existingData.inward_no,
            inward_date: new Date(existingData.inward_date)
              .toISOString()
              .split("T")[0],
            business_model: existingData.business_model,
            party_id: existingData.party_id || "",
            challan_no: existingData.challan_no || "",
            remarks: existingData.remarks || "",
            lines: existingData.lines.map((line) => ({
              id: line.id || generateId(),
              raw_material_id: line.raw_material_id,
              raw_number: line.raw_number,
              thickness_mm: line.thickness_mm,
              quantity: line.quantity,
              rate: line.rate || "",
              uom: line.uom || "KG",
            })),
          });

          if (existingData.billing) {
            const b = existingData.billing;
            const defaultRates = { CGST: 9, SGST: 9, IGST: 18 };
            const gstTypes = { CGST: false, SGST: false, IGST: false };
            const manualAmts = { CGST: "", SGST: "", IGST: "" };
            const rates = { ...defaultRates };

            if (b.apply_gst && b.gst_breakdown) {
              Object.keys(b.gst_breakdown).forEach((type) => {
                gstTypes[type] = true;
                if (b.gst_mode === "AUTO") {
                  rates[type] = b.gst_breakdown[type].rate;
                } else {
                  manualAmts[type] = b.gst_breakdown[type].amount;
                }
              });
            }

            setBilling({
              apply_gst: b.apply_gst || false,
              gst_types: gstTypes,
              gst_mode: b.gst_mode || "AUTO",
              rates: rates,
              manual_amounts: manualAmts,
              apply_round_off: b.apply_round_off ?? true,
            });
          }
        }
      } catch (err) {
        toast.error("Failed to load necessary data.");
        onClose();
      } finally {
        setInitialFetchLoading(false);
      }
    };
    fetchDropdownData();
  }, [inwardId, onClose]);

  const filteredParties = useMemo(() => {
    const requiredType =
      form.business_model === "JOB_WORK" ? "JOB_WORK" : "PURCHASE";
    const filtered = parties.filter((p) => {
      const types = p.party_types || p.party_type || p.types || [];
      return (Array.isArray(types) ? types : [types]).includes(requiredType);
    });
    return filtered.length > 0 ? filtered : parties;
  }, [parties, form.business_model]);

  const partyOptions = useMemo(
    () =>
      filteredParties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.party_name}
        </option>
      )),
    [filteredParties],
  );

  const materialOptions = useMemo(
    () =>
      rawMaterials.map((m) => (
        <option key={m.id} value={m.id}>
          {m.material_name}
        </option>
      )),
    [rawMaterials],
  );

  const handleTopLevelChange = useCallback((field, value) => {
    setForm((prev) => {
      const updates = { [field]: value };
      if (field === "business_model") {
        updates.party_id = "";
        updates.challan_no = "";
      }
      return { ...prev, ...updates };
    });
  }, []);

  const handleAddLine = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: generateId(),
          raw_material_id: "",
          raw_number: "",
          thickness_mm: "",
          quantity: "",
          rate: "",
          uom: "KG",
        },
      ],
    }));
  }, []);

  const handleLineChange = useCallback(
    (id, field, value, overrideUom = null) => {
      setForm((prev) => ({
        ...prev,
        lines: prev.lines.map((line) =>
          line.id === id
            ? {
                ...line,
                [field]: value,
                ...(overrideUom && { uom: overrideUom }),
              }
            : line,
        ),
      }));
    },
    [],
  );

  const handleRemoveLine = useCallback((idToRemove) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== idToRemove),
    }));
  }, []);

  const handleDateUnlockRequest = (e) => {
    if (isDateLocked) {
      e.preventDefault();
      const confirmUnlock = window.confirm(
        "WARNING: Changing the date of an existing inward can affect the chronological order of your stock ledger. Are you sure you want to change the date?",
      );
      if (confirmUnlock) {
        setIsDateLocked(false);
      }
    }
  };

  const subTotal = form.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0),
    0,
  );
  let totalGstAmount = 0;
  const gstBreakdown = {};

  if (billing.apply_gst) {
    Object.keys(billing.gst_types).forEach((type) => {
      if (billing.gst_types[type]) {
        if (billing.gst_mode === "AUTO") {
          const rate = Number(billing.rates[type] || 0);
          const amt = (subTotal * rate) / 100;
          gstBreakdown[type] = { rate, amount: amt };
          totalGstAmount += amt;
        } else {
          const amt = Number(billing.manual_amounts[type] || 0);
          gstBreakdown[type] = { amount: amt };
          totalGstAmount += amt;
        }
      }
    });
  }

  let rawTotal = subTotal + totalGstAmount;
  let roundOff = 0;
  let grandTotal = rawTotal;

  if (billing.apply_round_off) {
    grandTotal = Math.round(rawTotal);
    roundOff = grandTotal - rawTotal;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_id) return toast.error("Please select a Party.");
    if (
      billing.apply_gst &&
      !billing.gst_types.CGST &&
      !billing.gst_types.SGST &&
      !billing.gst_types.IGST
    ) {
      return toast.error("Please select at least one GST type.");
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        party_id: Number(form.party_id),
        lines: form.lines.map((l) => ({
          ...l,
          thickness_mm: Number(l.thickness_mm) || 0,
          quantity: Number(l.quantity) || 0,
          rate: Number(l.rate) || 0,
        })),
        billing: {
          subtotal: subTotal,
          apply_gst: billing.apply_gst,
          gst_mode: billing.gst_mode,
          gst_breakdown: gstBreakdown,
          total_gst_amount: totalGstAmount,
          apply_round_off: billing.apply_round_off,
          round_off_amount: roundOff,
          grand_total: grandTotal,
        },
      };

      if (inwardId) {
        await api.put(`/raw-materials/${inwardId}`, payload);
        toast.success("Inward updated successfully.");
        onSuccess(true);
      } else {
        await api.post("/raw-materials", payload);
        toast.success("Inward created successfully.");
        onSuccess(false);
      }

      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
            <Database size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
                {inwardId ? "Edit Inward Record" : "Receive Raw Materials"}
              </h2>
              {inwardId && (
                <span className="hidden sm:block px-2 py-0.5 rounded-[6px] bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                  Edit Mode
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 flex items-center gap-1.5 truncate">
              {inwardId
                ? `Updating record #${form.inward_no}`
                : "Log inbound purchases & returns"}
              {!inwardId && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 hidden sm:block"></span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={loading || initialFetchLoading}
          className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-full transition-all shadow-sm active:scale-95 shrink-0"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase, delay: 0.05 }}
        className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-4"
      >
        {initialFetchLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
            <p className="text-slate-500 text-[13px] font-bold uppercase tracking-widest">
              Loading Record Data...
            </p>
          </div>
        ) : (
          <>
            <form
              id="inward-form"
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden"
            >
              <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  <div className="flex flex-col min-w-0">
                    <label className={LabelClass}>Inward No</label>
                    <input
                      type="text"
                      required
                      value={form.inward_no}
                      onChange={(e) =>
                        handleTopLevelChange("inward_no", e.target.value)
                      }
                      className={InputClass}
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <label className={LabelClass}>Date</label>
                    <div
                      onClick={handleDateUnlockRequest}
                      className={`flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] transition-all overflow-hidden box-border ${isDateLocked ? "bg-slate-100/80 cursor-not-allowed" : "bg-slate-50/60 focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10"}`}
                    >
                      <Calendar
                        size={14}
                        strokeWidth={2}
                        className="text-slate-400 shrink-0 mr-1.5"
                      />
                      <input
                        type="date"
                        required
                        value={form.inward_date}
                        readOnly={isDateLocked}
                        onChange={(e) => {
                          if (!isDateLocked)
                            handleTopLevelChange("inward_date", e.target.value);
                        }}
                        className={`flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 p-0 m-0 ${isDateLocked ? "cursor-not-allowed opacity-60 pointer-events-none" : "cursor-pointer"}`}
                      />
                      {isDateLocked && (
                        <span
                          className="text-slate-400 shrink-0 ml-1 text-[12px]"
                          title="Click to unlock date"
                        >
                          🔒
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 flex flex-col min-w-0">
                    <label className={LabelClass}>Business Model</label>
                    <div className="relative w-full">
                      <select
                        value={form.business_model}
                        onChange={(e) =>
                          handleTopLevelChange("business_model", e.target.value)
                        }
                        className={SelectClass}
                      >
                        <option value="OWN_MANUFACTURING">Own Mfg</option>
                        <option value="JOB_WORK">Job Work</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2 lg:col-span-2 flex flex-col min-w-0">
                    <label className={LabelClass}>
                      {form.business_model === "JOB_WORK"
                        ? "Job Work Client"
                        : "Purchase Party"}
                    </label>
                    <select
                      required
                      value={form.party_id}
                      onChange={(e) =>
                        handleTopLevelChange("party_id", e.target.value)
                      }
                      className={SelectClass}
                    >
                      <option value="" disabled>
                        -- Select Party --
                      </option>
                      {partyOptions}
                    </select>
                  </div>
                  {form.business_model === "JOB_WORK" && (
                    <div className="col-span-2 flex flex-col min-w-0">
                      <label className={LabelClass}>Client Challan No</label>
                      <input
                        type="text"
                        required
                        value={form.challan_no}
                        onChange={(e) =>
                          handleTopLevelChange("challan_no", e.target.value)
                        }
                        className={InputClass}
                        placeholder="e.g. CH-9921"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] lg:overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                    <Layers
                      size={14}
                      className="text-slate-400 sm:w-4 sm:h-4"
                    />{" "}
                    Material Batches
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="h-[32px] px-3 sm:px-4 border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-[10px] text-[11px] sm:text-[12px] font-bold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-sm"
                  >
                    <Plus size={14} strokeWidth={2.5} /> Add{" "}
                    <span className="hidden sm:inline">Batch</span>
                  </button>
                </div>

                <div className="hidden lg:flex gap-3 px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
                  <div className="flex-[3] text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Material Details
                  </div>
                  <div className="flex-[2] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Batch No
                  </div>
                  <div className="flex-[1] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    Thick
                  </div>
                  <div className="flex-[1.5] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    Quantity
                  </div>
                  <div className="flex-[1.5] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    Rate
                  </div>
                  <div className="flex-[1.5] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-2">
                    Total
                  </div>
                  <div className="w-[40px]"></div>
                </div>

                <div className="lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-3 bg-slate-50/30 scrollbar-hide">
                  <div className="flex flex-col">
                    <AnimatePresence>
                      {form.lines.map((line) => (
                        <CargoLineItem
                          key={line.id}
                          line={line}
                          materialOptions={materialOptions}
                          rawMaterials={rawMaterials}
                          onChange={handleLineChange}
                          onRemove={handleRemoveLine}
                          disableRemove={form.lines.length === 1}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 mb-4 lg:mb-0">
                <input
                  type="text"
                  placeholder="Additional remarks, loading notes, or instructions..."
                  value={form.remarks}
                  onChange={(e) =>
                    handleTopLevelChange("remarks", e.target.value)
                  }
                  className={InputClass}
                />
              </div>
            </form>

            <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:overflow-hidden pb-safe">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                    <Calculator
                      size={14}
                      strokeWidth={2}
                      className="sm:w-4 sm:h-4"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                      Invoice Config
                    </h4>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                      Taxes & Summary
                    </p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer select-none shrink-0 ml-2">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={billing.apply_gst}
                      onChange={(e) =>
                        setBilling({ ...billing, apply_gst: e.target.checked })
                      }
                    />
                    <div
                      className={`block w-9 h-5 sm:w-10 sm:h-6 rounded-full transition-colors shadow-inner ${billing.apply_gst ? "bg-emerald-500" : "bg-slate-300"}`}
                    ></div>
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-transform shadow-sm ${billing.apply_gst ? "transform translate-x-4" : ""}`}
                    ></div>
                  </div>
                </label>
              </div>

              <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide">
                <AnimatePresence>
                  {billing.apply_gst && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-[16px] border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 mb-2">
                        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-200/60">
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Calc Mode
                          </span>
                          <div className="flex bg-slate-200/50 p-1 rounded-[10px] text-[10px] sm:text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() =>
                                setBilling({ ...billing, gst_mode: "AUTO" })
                              }
                              className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-all ${billing.gst_mode === "AUTO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                            >
                              AUTO (%)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setBilling({ ...billing, gst_mode: "MANUAL" })
                              }
                              className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-all ${billing.gst_mode === "MANUAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                            >
                              MANUAL (₹)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {["CGST", "SGST", "IGST"].map((type) => (
                            <div
                              key={type}
                              className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl border border-slate-200/60 bg-white hover:border-slate-300 transition-colors shadow-sm"
                            >
                              <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1">
                                <div
                                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center transition-colors shadow-sm shrink-0 ${billing.gst_types[type] ? "bg-blue-600 border-blue-600" : "bg-slate-50 border-slate-300 group-hover:border-blue-400"}`}
                                >
                                  {billing.gst_types[type] && (
                                    <CheckCircle2
                                      size={12}
                                      strokeWidth={3}
                                      className="text-white sm:w-[14px] sm:h-[14px]"
                                    />
                                  )}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={billing.gst_types[type]}
                                  onChange={(e) =>
                                    setBilling((p) => ({
                                      ...p,
                                      gst_types: {
                                        ...p.gst_types,
                                        [type]: e.target.checked,
                                      },
                                    }))
                                  }
                                />
                                <span className="text-[12px] sm:text-[13px] font-bold text-slate-700">
                                  {type}
                                </span>
                              </label>
                              {billing.gst_types[type] && (
                                <motion.div
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex shrink-0"
                                >
                                  {billing.gst_mode === "AUTO" ? (
                                    <div className="relative w-[70px] sm:w-[80px]">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={billing.rates[type]}
                                        onChange={(e) =>
                                          setBilling((p) => ({
                                            ...p,
                                            rates: {
                                              ...p.rates,
                                              [type]: e.target.value,
                                            },
                                          }))
                                        }
                                        className={`${InputClass} h-[32px] text-[11px] sm:text-[12px] pr-5 sm:pr-6 text-right rounded-[8px]`}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-[11px] font-bold text-slate-400">
                                        %
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="relative w-[90px] sm:w-[110px]">
                                      <span className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-[11px] sm:text-[12px] font-bold text-slate-400">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={billing.manual_amounts[type]}
                                        onChange={(e) =>
                                          setBilling((p) => ({
                                            ...p,
                                            manual_amounts: {
                                              ...p.manual_amounts,
                                              [type]: e.target.value,
                                            },
                                          }))
                                        }
                                        className={`${InputClass} h-[32px] text-[11px] sm:text-[12px] pl-5 sm:pl-6 pr-2 text-right rounded-[8px]`}
                                        placeholder="Amt"
                                      />
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2.5 sm:space-y-3 pb-4 lg:pb-0">
                  <h4 className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 sm:mb-4">
                    Financial Breakdown
                  </h4>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-[12px] sm:text-[13px] font-semibold">
                      Subtotal (Materials)
                    </span>
                    <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                      {formatINR(subTotal)}
                    </span>
                  </div>

                  {billing.apply_gst &&
                    Object.keys(gstBreakdown).map((type) => (
                      <div
                        key={type}
                        className="flex justify-between items-center text-blue-600 mt-1"
                      >
                        <span className="text-[11px] sm:text-[12px] font-semibold flex items-center gap-1.5">
                          {type}{" "}
                          {billing.gst_mode === "AUTO" && (
                            <span className="text-[9px] sm:text-[10px] bg-blue-100/50 px-1.5 py-0.5 rounded-md font-mono">
                              @{gstBreakdown[type].rate}%
                            </span>
                          )}
                        </span>
                        <span className="text-[12px] sm:text-[13px] font-bold tabular-nums">
                          +{formatINR(gstBreakdown[type].amount)}
                        </span>
                      </div>
                    ))}

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <label className="flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-blue-600 focus:ring-blue-50 border-slate-300"
                        checked={billing.apply_round_off}
                        onChange={(e) =>
                          setBilling({
                            ...billing,
                            apply_round_off: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-[11px] sm:text-[12px] font-bold text-slate-700">
                        Auto Round-Off
                      </span>
                    </label>
                    {billing.apply_round_off && roundOff !== 0 && (
                      <span className="text-[11px] sm:text-[12px] font-bold text-slate-500 tabular-nums bg-slate-100 px-2 py-0.5 sm:py-1 rounded-lg">
                        {roundOff > 0 ? "+" : ""}
                        {roundOff.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex justify-between items-end mb-4 sm:mb-5">
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Grand Total
                  </span>
                  <span className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none tabular-nums truncate max-w-[70%] text-right">
                    {formatINR(grandTotal)}
                  </span>
                </div>
                <button
                  type="submit"
                  form="inward-form"
                  disabled={loading}
                  className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-md hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />{" "}
                      Processing...
                    </>
                  ) : (
                    <>
                      {inwardId ? "Save Changes" : "Confirm Inward"}{" "}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body,
  );
};

export default CreateInwardModal;
