import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Factory,
  CheckSquare,
  Layers,
  ChevronDown,
  Plus,
  Trash2,
  Calendar,
  Search,
  AlertTriangle,
  Box,
  CornerDownRight,
  Check,
  Cpu,
  Users,
} from "lucide-react";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const InputClass =
  "w-full h-[40px] px-3 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none min-w-0";
const SelectClass =
  "w-full h-[40px] pl-3 pr-9 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] text-[13px] font-medium text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none appearance-none cursor-pointer min-w-0 truncate";
const LabelClass =
  "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 pl-1";
const BaseCardClass =
  "bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[20px] sm:rounded-[24px] relative flex flex-col w-full min-h-0 transition-all duration-300";

const safeExtractArray = (res) => {
  if (!res || res.status !== "fulfilled" || !res.value) return [];
  const payload = res.value.data;
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.data)) return payload.data.data;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    for (const key of Object.keys(payload.data)) {
      if (Array.isArray(payload.data[key])) return payload.data[key];
    }
  }
  for (const key of Object.keys(payload)) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const CreateProductionModal = ({ onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [machines, setMachines] = useState([]);
  const [personnel, setPersonnel] = useState([]);

  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [semiFinished, setSemiFinished] = useState([]);

  const [stockPool, setStockPool] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  const [form, setForm] = useState({
    production_date: new Date().toISOString().split("T")[0],
    business_model: "OWN_MANUFACTURING",
    party_id: "",
    source_item_kind: "RAW",
    steps: [
      {
        step_name: "Phase 1",
        machine_id: "",
        worker_mode: "STAFF",
        workers: [],
        source_planned_outputs: {},
        wipSearchTerms: {},
      },
    ],
  });

  const [selectedSources, setSelectedSources] = useState([]);
  const [sourceSearchTerm, setSourceSearchTerm] = useState("");
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    Promise.allSettled([
      api.get("/parties?type=JOB_WORK"),
      api.get("/machines"),
      api.get("/staff"),
    ]).then(([resParties, resMach, resPers]) => {
      setParties(safeExtractArray(resParties));
      setMachines(safeExtractArray(resMach));
      setPersonnel(safeExtractArray(resPers));
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const ownership = form.business_model === "JOB_WORK" ? "JOB_WORK" : "OWN";

    if (ownership === "JOB_WORK" && !form.party_id) {
      setRawMaterials([]);
      setProducts([]);
      setSemiFinished([]);
      setStockPool([]);
      return;
    }

    setStockLoading(true);

    const stockParams = {
      limit: 5000,
      business_model: form.business_model,
      ownership_type: ownership,
    };

    if (ownership === "JOB_WORK") {
      stockParams.party_id = form.party_id;
      stockParams.owner_party_id = form.party_id;
    }

    const masterParams = { limit: 1000 };

    const pRaw = api
      .get("/raw-materials/master", { params: masterParams })
      .catch(() => api.get("/raw-materials", { params: masterParams }));
    const pProd = api.get("/products", { params: masterParams });
    const pWip = api.get("/products/semi-finished", { params: masterParams });
    const pStockRaw = api.get("/stock/snapshot", {
      params: { ...stockParams, item_kind: "RAW" },
    });
    const pStockWip = api.get("/stock/snapshot", {
      params: { ...stockParams, item_kind: "SEMI_FINISHED" },
    });

    Promise.allSettled([pRaw, pProd, pWip, pStockRaw, pStockWip]).then(
      ([resRaw, resProd, resSemi, stockRaw, stockWip]) => {
        setRawMaterials(safeExtractArray(resRaw));
        setProducts(safeExtractArray(resProd));
        setSemiFinished(safeExtractArray(resSemi));

        const extractStockArr = (resObj, kind) => {
          if (!resObj || resObj.status !== "fulfilled") return [];
          const payload = resObj.value.data?.data || resObj.value.data;
          let arr = [];
          if (Array.isArray(payload)) {
            arr = payload;
          } else if (payload && typeof payload === "object") {
            const key = ownership === "JOB_WORK" ? "job_work" : "own";
            if (payload[key]) arr = payload[key];
            else if (payload[key.toUpperCase()])
              arr = payload[key.toUpperCase()];
            else {
              for (const val of Object.values(payload)) {
                if (Array.isArray(val)) {
                  arr = val;
                  break;
                }
              }
            }
          }
          return arr.map((row) => ({ ...row, _injected_kind: kind }));
        };

        const merged = [
          ...extractStockArr(stockRaw, "RAW"),
          ...extractStockArr(stockWip, "SEMI_FINISHED"),
        ];
        setStockPool(merged);
        setStockLoading(false);
      },
    );
  }, [form.business_model, form.party_id, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mounted]);

  const safeProductsArray = Array.isArray(products) ? products : [];
  const safeSemiFinishedArray = Array.isArray(semiFinished) ? semiFinished : [];

  const activeSourceList = Array.isArray(
    form.source_item_kind === "RAW" ? rawMaterials : semiFinished,
  )
    ? form.source_item_kind === "RAW"
      ? rawMaterials
      : semiFinished
    : [];

  const filteredSourceOptions = activeSourceList
    .map((item) => {
      const isRawMode = form.source_item_kind === "RAW";

      const availableStock = stockPool.reduce((sum, s) => {
        if (s._injected_kind !== form.source_item_kind) return sum;

        // 🌟 STRICT ISOLATION PROTOCOL 🌟
        if (form.business_model === "OWN_MANUFACTURING") {
          if (s.ownership_type !== "OWN") return sum;
        } else if (form.business_model === "JOB_WORK") {
          if (s.ownership_type !== "JOB_WORK") return sum;
          const stockPartyId = String(s.owner_party_id || s.party_id || "");
          if (stockPartyId !== String(form.party_id)) return sum;
        }

        const recordId = isRawMode
          ? Number(s.raw_material_id || s.item_id || s.id || 0)
          : Number(s.semi_finished_id || s.item_id || s.id || 0);

        if (recordId !== Number(item.id)) return sum;

        const qty = Number(
          s.balance_qty ??
            s.balance ??
            s.total_balance ??
            s.quantity ??
            s.available_qty ??
            0,
        );
        return sum + qty;
      }, 0);

      const itemName = isRawMode
        ? item.material_name || item.name || `Raw Material #${item.id}`
        : item.item_name ||
          item.semi_finished_name ||
          item.name ||
          `WIP Item #${item.id}`;

      return {
        id: item.id,
        name: itemName,
        kind: form.source_item_kind,
        stock: availableStock,
      };
    })
    .filter(
      (item) =>
        item.name?.toLowerCase().includes(sourceSearchTerm.toLowerCase()) &&
        !selectedSources.some(
          (sel) => sel.id === item.id && sel.kind === item.kind,
        ),
    );

  const handleAddSource = (item) => {
    setSelectedSources((prev) => [
      ...prev,
      {
        uid: Math.random().toString(36).substr(2, 9),
        id: item.id,
        kind: item.kind,
        name: item.name,
        stock: item.stock,
        qty: "",
        target_products: [],
        productSearchTerm: "",
      },
    ]);
    setSourceSearchTerm("");
    setSourceDropdownOpen(false);
  };

  const updateSourceField = (uid, field, value) => {
    setSelectedSources((prev) =>
      prev.map((src) => (src.uid === uid ? { ...src, [field]: value } : src)),
    );
  };

  const toggleSourceProduct = (uid, productId) => {
    setSelectedSources((prev) =>
      prev.map((src) => {
        if (src.uid === uid) {
          const isSelected = src.target_products.includes(productId);
          return {
            ...src,
            target_products: isSelected
              ? src.target_products.filter((id) => id !== productId)
              : [...src.target_products, productId],
          };
        }
        return src;
      }),
    );
  };

  const handleStepChange = (idx, field, val) => {
    const newSteps = [...form.steps];
    newSteps[idx][field] = val;
    if (field === "worker_mode") newSteps[idx].workers = [];
    setForm({ ...form, steps: newSteps });
  };

  const toggleWorker = (stepIdx, workerId) => {
    const newSteps = [...form.steps];
    const currentWorkers = newSteps[stepIdx].workers;
    newSteps[stepIdx].workers = currentWorkers.includes(workerId)
      ? currentWorkers.filter((id) => id !== workerId)
      : [...currentWorkers, workerId];
    setForm({ ...form, steps: newSteps });
  };

  const toggleStepSourceOutput = (stepIdx, sourceUid, wipId) => {
    const newSteps = [...form.steps];
    if (!newSteps[stepIdx].source_planned_outputs)
      newSteps[stepIdx].source_planned_outputs = {};
    const currentOutputs =
      newSteps[stepIdx].source_planned_outputs[sourceUid] || [];
    const isSelected = currentOutputs.includes(wipId);
    newSteps[stepIdx].source_planned_outputs[sourceUid] = isSelected
      ? currentOutputs.filter((id) => id !== wipId)
      : [...currentOutputs, wipId];
    setForm({ ...form, steps: newSteps });
  };

  const handleStepSourceSearch = (stepIdx, sourceUid, term) => {
    const newSteps = [...form.steps];
    if (!newSteps[stepIdx].wipSearchTerms)
      newSteps[stepIdx].wipSearchTerms = {};
    newSteps[stepIdx].wipSearchTerms[sourceUid] = term;
    setForm({ ...form, steps: newSteps });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedSources.length === 0)
      return toast.error("Select at least one source material to process");

    for (let i = 0; i < selectedSources.length; i++) {
      const src = selectedSources[i];
      if (!src.qty || Number(src.qty) <= 0)
        return toast.error(`Enter a valid quantity for ${src.name}`);
      if (src.target_products.length === 0)
        return toast.error(
          `Select at least one target product for ${src.name}`,
        );
    }

    for (let i = 0; i < form.steps.length; i++) {
      const step = form.steps[i];
      if (!step.step_name.trim() || !step.machine_id)
        return toast.error(`Complete machine assignment for Phase ${i + 1}`);
      if (step.workers.length === 0)
        return toast.error(`Assign at least one operator to Phase ${i + 1}`);

      if (i < form.steps.length - 1) {
        for (const src of selectedSources) {
          const plannedIds = step.source_planned_outputs?.[src.uid] || [];
          if (plannedIds.length === 0) {
            return toast.error(
              `Select at least one expected WIP Output for ${src.name} in Phase ${i + 1}`,
            );
          }
        }
      }
    }

    setLoading(true);
    try {
      const flattenedSteps = [];
      form.steps.forEach((phase, phaseIdx) => {
        const isFinalPhase = phaseIdx === form.steps.length - 1;
        selectedSources.forEach((src) => {
          const inputKind = phaseIdx === 0 ? src.kind : "SEMI_FINISHED";
          const inputRawId =
            phaseIdx === 0 && src.kind === "RAW" ? Number(src.id) : null;
          const prevPhase = phaseIdx > 0 ? form.steps[phaseIdx - 1] : null;
          const inputSemiId =
            phaseIdx === 0 && src.kind === "SEMI_FINISHED"
              ? Number(src.id)
              : phaseIdx > 0
                ? Number(prevPhase.source_planned_outputs[src.uid][0])
                : null;
          const inputProdId =
            phaseIdx === 0 && src.kind === "SEMI_FINISHED"
              ? Number(src.target_products[0])
              : phaseIdx > 0
                ? Number(src.target_products[0])
                : null;
          const plannedIds = phase.source_planned_outputs?.[src.uid] || [];

          const generatedOutputs = isFinalPhase
            ? src.target_products.map((tpId) => ({
                output_item_kind: "FINISHED",
                product_id: Number(tpId),
                semi_finished_id: null,
                quantity: Number(src.qty),
              }))
            : plannedIds.map((wipId) => ({
                output_item_kind: "SEMI_FINISHED",
                product_id: Number(src.target_products[0]),
                semi_finished_id: Number(wipId),
                quantity: Number(src.qty),
              }));

          flattenedSteps.push({
            step_name: `${phase.step_name} (${src.name})`,
            machine_id: Number(phase.machine_id),
            worker_mode: phase.worker_mode,
            workers: phase.workers.map(Number),
            input_item_kind: inputKind,
            input_raw_material_id: inputRawId,
            input_semi_finished_id: inputSemiId,
            input_product_id: inputProdId,
            input_qty: Number(src.qty),
            is_final_step: isFinalPhase,
            outputs: generatedOutputs,
          });
        });
      });

      const payload = {
        production_date: form.production_date,
        business_model: form.business_model,
        party_id:
          form.business_model === "JOB_WORK" ? Number(form.party_id) : null,
        remarks: "Multi-Source Batch Matrix",
        steps: flattenedSteps,
      };

      await api.post("/production", payload);
      toast.success("Production Entry Saved Successfully!");
      onSuccess();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save production entry.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || typeof document === "undefined" || !document.body)
    return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm hidden sm:block"
      />
      <div className="fixed inset-0 z-[9999] flex flex-col pointer-events-none selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="flex flex-col bg-slate-50 w-full h-[100dvh] overflow-hidden relative shadow-2xl pointer-events-auto"
        >
          <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex justify-between items-center shrink-0 z-20 shadow-sm relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-slate-900 flex items-center justify-center text-white shadow-md shrink-0">
                <Factory size={18} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col mt-0.5">
                <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-slate-900 leading-none mb-1 flex items-center gap-2">
                  Production Planning
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-tight">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                  Matrix Engine Configuration
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-full transition-all shadow-sm active:scale-95 shrink-0"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden">
            <motion.form
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              id="routing-form"
              onSubmit={handleSubmit}
              className="max-w-[1600px] mx-auto space-y-4 sm:space-y-5 pb-8"
            >
              <motion.div variants={fadeScale} className="flex flex-col w-full">
                <div className="flex items-center mb-2.5 px-1">
                  <h2 className="text-[14px] font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    1. General Info
                  </h2>
                </div>
                <div className={`${BaseCardClass} p-4 sm:p-5 bg-white`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                    <div className="flex flex-col min-w-0">
                      <label className={LabelClass}>Production Date</label>
                      <div className="flex items-center w-full h-[40px] px-3 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all overflow-hidden box-border group">
                        <Calendar
                          size={14}
                          strokeWidth={2}
                          className="text-slate-400 shrink-0 mr-2 group-focus-within:text-slate-900 transition-colors"
                        />
                        <input
                          type="date"
                          required
                          value={form.production_date}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              production_date: e.target.value,
                            })
                          }
                          className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[13px] font-medium text-slate-900 cursor-pointer p-0 m-0"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <label className={LabelClass}>Business Model</label>
                      <div className="relative group min-w-0 w-full">
                        <select
                          value={form.business_model}
                          onChange={(e) => {
                            setForm({
                              ...form,
                              business_model: e.target.value,
                              party_id: "",
                            });
                            setSelectedSources([]);
                          }}
                          className={SelectClass}
                        >
                          <option value="OWN_MANUFACTURING">
                            Own Manufacturing
                          </option>
                          <option value="JOB_WORK">Job Work</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-slate-900 transition-colors"
                        />
                      </div>
                    </div>
                    {form.business_model === "JOB_WORK" && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col min-w-0"
                      >
                        <label className={LabelClass}>Client / Party</label>
                        <div className="relative group min-w-0 w-full">
                          <select
                            required
                            value={form.party_id}
                            onChange={(e) => {
                              setForm({ ...form, party_id: e.target.value });
                              setSelectedSources([]);
                            }}
                            className={SelectClass}
                          >
                            <option value="" disabled>
                              Select Party...
                            </option>
                            {parties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.party_name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-slate-900 transition-colors"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
              <motion.div variants={fadeScale} className="flex flex-col w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5 px-1">
                  <h2 className="text-[14px] font-semibold text-slate-900 tracking-tight flex items-center gap-2 min-w-0">
                    2. Inputs & Targets
                  </h2>
                  <div className="flex items-center p-1 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full sm:w-auto overflow-x-auto shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, source_item_kind: "RAW" })
                      }
                      className={`flex-1 shrink-0 min-w-[100px] sm:min-w-0 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-1.5 rounded-[10px] sm:rounded-full text-[11px] sm:text-[12px] transition-all duration-300 outline-none flex items-center justify-center whitespace-nowrap ${form.source_item_kind === "RAW" ? "bg-white border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.05)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 font-medium border border-transparent"}`}
                    >
                      Raw Materials
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, source_item_kind: "SEMI_FINISHED" })
                      }
                      className={`flex-1 shrink-0 min-w-[100px] sm:min-w-0 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-1.5 rounded-[10px] sm:rounded-full text-[11px] sm:text-[12px] transition-all duration-300 outline-none flex items-center justify-center whitespace-nowrap ${form.source_item_kind === "SEMI_FINISHED" ? "bg-white border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.05)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 font-medium border border-transparent"}`}
                    >
                      WIP Inventory
                    </button>
                  </div>
                </div>

                <div className={`${BaseCardClass} p-4 sm:p-5 bg-slate-50/40`}>
                  <div className="relative mb-4" ref={searchRef}>
                    <div className="relative group min-w-0">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder={`Search ${form.source_item_kind === "RAW" ? "Raw Materials" : "WIP Items"} to process...`}
                        value={sourceSearchTerm}
                        onChange={(e) => {
                          setSourceSearchTerm(e.target.value);
                          setSourceDropdownOpen(true);
                        }}
                        onFocus={() => setSourceDropdownOpen(true)}
                        className={`${InputClass} pl-10`}
                      />
                      {stockLoading && (
                        <Loader2
                          size={14}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
                        />
                      )}
                    </div>

                    <AnimatePresence>
                      {sourceDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200/80 rounded-[16px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] z-30 overflow-hidden"
                        >
                          <div className="max-h-[280px] overflow-y-auto p-1.5 scrollbar-hide">
                            {filteredSourceOptions.length === 0 ? (
                              <div className="p-4 text-center text-slate-500 text-[12px] font-medium">
                                No available materials found matching context.
                              </div>
                            ) : (
                              filteredSourceOptions.map((opt) => (
                                <div
                                  key={opt.id}
                                  onClick={() => handleAddSource(opt)}
                                  className={`px-3.5 py-2.5 flex justify-between items-center cursor-pointer rounded-[12px] transition-colors hover:bg-slate-50/80`}
                                >
                                  <span className="text-[13px] font-semibold text-slate-900 truncate pr-2">
                                    {opt.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[8px] whitespace-nowrap border shadow-sm ${opt.stock > 0 ? "bg-emerald-50 border-emerald-200/60 text-emerald-700" : "bg-slate-100 border-slate-200/60 text-slate-500"}`}
                                  >
                                    Stock: {opt.stock}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {selectedSources.map((src) => {
                        const isExceeding =
                          src.qty !== "" && Number(src.qty) > src.stock;
                        return (
                          <motion.div
                            key={src.uid}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white border border-slate-200/80 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden"
                          >
                            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                              <div className="flex-[0.8] p-4 lg:p-5 space-y-4 bg-slate-50/30">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                      Source Material
                                    </p>
                                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug tracking-tight">
                                      {src.name}
                                    </h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedSources((p) =>
                                        p.filter((s) => s.uid !== src.uid),
                                      )
                                    }
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="w-full sm:max-w-[200px]">
                                  <label className={LabelClass}>
                                    Input Qty (KG)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      value={src.qty}
                                      onChange={(e) =>
                                        updateSourceField(
                                          src.uid,
                                          "qty",
                                          e.target.value,
                                        )
                                      }
                                      className={`${InputClass} pr-20 tabular-nums ${isExceeding ? "!border-amber-400 !bg-amber-50/30 !text-amber-700 focus:!ring-amber-500/20" : ""}`}
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                                      / {src.stock}
                                    </span>
                                  </div>
                                  <AnimatePresence>
                                    {isExceeding && (
                                      <motion.p
                                        initial={{
                                          opacity: 0,
                                          y: -5,
                                          height: 0,
                                        }}
                                        animate={{
                                          opacity: 1,
                                          y: 0,
                                          height: "auto",
                                        }}
                                        exit={{ opacity: 0, y: -5, height: 0 }}
                                        className="text-[11px] text-amber-500 font-semibold mt-2 flex items-center gap-1.5"
                                      >
                                        <AlertTriangle size={12} /> Planning
                                        exceeds current stock
                                      </motion.p>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                              <div className="flex-[1.2] p-4 lg:p-5 flex flex-col bg-white">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <Box size={14} className="text-slate-400" />{" "}
                                  Map to Final Product(s)
                                </label>
                                <div className="relative mb-3 w-full sm:max-w-sm group min-w-0">
                                  <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Filter products..."
                                    value={src.productSearchTerm || ""}
                                    onChange={(e) =>
                                      updateSourceField(
                                        src.uid,
                                        "productSearchTerm",
                                        e.target.value,
                                      )
                                    }
                                    className={`${InputClass} pl-9 h-[36px]`}
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto scrollbar-hide py-1">
                                  {safeProductsArray
                                    .filter((p) => {
                                      const name =
                                        p.product_name ||
                                        p.name ||
                                        `Product #${p.id}`;
                                      return name
                                        .toLowerCase()
                                        .includes(
                                          (
                                            src.productSearchTerm || ""
                                          ).toLowerCase(),
                                        );
                                    })
                                    .map((p) => {
                                      const name =
                                        p.product_name ||
                                        p.name ||
                                        `Product #${p.id}`;
                                      const isSelected =
                                        src.target_products.includes(p.id);
                                      return (
                                        <label
                                          key={p.id}
                                          className={`cursor-pointer px-3.5 py-1.5 rounded-[10px] border text-[12px] font-medium flex items-center gap-2 select-none transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"}`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() =>
                                              toggleSourceProduct(src.uid, p.id)
                                            }
                                          />
                                          <div
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? "border-transparent bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
                                          >
                                            {isSelected && (
                                              <Check
                                                size={10}
                                                strokeWidth={3}
                                              />
                                            )}
                                          </div>
                                          {name}
                                        </label>
                                      );
                                    })}
                                  {safeProductsArray.length === 0 && (
                                    <div className="text-[12px] font-medium text-slate-400 py-1">
                                      No products found.
                                    </div>
                                  )}
                                </div>
                                {src.target_products.length === 0 && (
                                  <p className="text-[11px] text-rose-500 font-semibold mt-2.5 flex items-center gap-1.5 bg-rose-50 w-max px-2.5 py-1 rounded-[6px] border border-rose-100/60">
                                    <AlertTriangle size={12} /> Required: Select
                                    at least 1 product
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {selectedSources.length === 0 && (
                      <div className="py-10 border-2 border-dashed border-slate-200 rounded-[20px] flex flex-col items-center justify-center text-slate-400 bg-white">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-2.5">
                          <Box size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[13px] font-medium text-slate-500">
                          No input materials selected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              <motion.div variants={fadeScale} className="flex flex-col w-full">
                <div className="flex justify-between items-center px-1 mb-2.5">
                  <h2 className="text-[14px] font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    3. Routing Matrix
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2 py-1 rounded-[6px] shadow-sm flex items-center shrink-0 whitespace-nowrap">
                    {form.steps.length} Phase{form.steps.length !== 1 && "s"}
                  </span>
                </div>
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {form.steps.map((step, idx) => {
                      const isFinal = idx === form.steps.length - 1;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`${BaseCardClass} !shadow-[0_4px_16px_rgba(0,0,0,0.03)]`}
                        >
                          <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center rounded-t-[20px] sm:rounded-t-[24px]">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-slate-900 text-white text-[11px] font-bold rounded-[6px] flex items-center justify-center shadow-sm">
                                {idx + 1}
                              </span>
                              <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                                Processing Phase
                              </span>
                            </div>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    steps: p.steps.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 bg-white rounded-b-[20px] sm:rounded-b-[24px]">
                            <div className="space-y-4">
                              <div className="flex flex-col min-w-0">
                                <label className={LabelClass}>
                                  Process Name
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={step.step_name}
                                  onChange={(e) =>
                                    handleStepChange(
                                      idx,
                                      "step_name",
                                      e.target.value,
                                    )
                                  }
                                  className={InputClass}
                                  placeholder="e.g., Cutting, Welding..."
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <label className={LabelClass}>
                                  Machine Assignment
                                </label>
                                <div className="relative group w-full min-w-0">
                                  <Cpu
                                    size={14}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
                                  />
                                  <select
                                    required
                                    value={step.machine_id}
                                    onChange={(e) =>
                                      handleStepChange(
                                        idx,
                                        "machine_id",
                                        e.target.value,
                                      )
                                    }
                                    className={`${SelectClass} pl-10`}
                                  >
                                    <option value="" disabled>
                                      Select Machine...
                                    </option>
                                    {machines.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.machine_name}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    size={14}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-slate-900 transition-colors"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center p-1 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] rounded-[12px] self-start w-full sm:w-max">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStepChange(
                                      idx,
                                      "worker_mode",
                                      "STAFF",
                                    )
                                  }
                                  className={`flex-1 sm:flex-none px-5 py-1.5 text-[11px] transition-all duration-300 outline-none rounded-[8px] whitespace-nowrap flex items-center justify-center ${step.worker_mode === "STAFF" ? "bg-white border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.06)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 font-medium border border-transparent"}`}
                                >
                                  Internal Staff
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStepChange(
                                      idx,
                                      "worker_mode",
                                      "CONTRACTOR",
                                    )
                                  }
                                  className={`flex-1 sm:flex-none px-5 py-1.5 text-[11px] transition-all duration-300 outline-none rounded-[8px] whitespace-nowrap flex items-center justify-center ${step.worker_mode === "CONTRACTOR" ? "bg-white border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.06)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 font-medium border border-transparent"}`}
                                >
                                  Contractors
                                </button>
                              </div>
                              <div>
                                <label className={LabelClass}>
                                  Assign Operators
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto scrollbar-hide py-0.5">
                                  {personnel
                                    .filter(
                                      (p) =>
                                        p.personnel_type === step.worker_mode,
                                    )
                                    .map((p) => {
                                      const isSelected = step.workers.includes(
                                        p.id,
                                      );
                                      return (
                                        <label
                                          key={p.id}
                                          className={`cursor-pointer px-3.5 py-1.5 rounded-[10px] border text-[12px] font-medium flex items-center gap-2 select-none transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"}`}
                                        >
                                          <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() =>
                                              toggleWorker(idx, p.id)
                                            }
                                          />
                                          <div
                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? "border-transparent text-white" : "border-slate-300 bg-white"}`}
                                          >
                                            {isSelected && (
                                              <Check
                                                size={10}
                                                strokeWidth={3}
                                              />
                                            )}
                                          </div>
                                          {p.full_name}
                                        </label>
                                      );
                                    })}
                                  {personnel.filter(
                                    (p) =>
                                      p.personnel_type === step.worker_mode,
                                  ).length === 0 && (
                                    <div className="text-[12px] font-medium text-slate-400 flex items-center gap-2 py-1">
                                      <Users size={14} /> No personnel found.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {!isFinal && selectedSources.length > 0 && (
                            <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-200 border-dashed rounded-b-[20px] sm:rounded-b-[24px]">
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                                <Layers size={14} className="text-slate-400" />{" "}
                                Route to Intermediate WIP
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                                {selectedSources.map((src) => {
                                  const searchTerm =
                                    step.wipSearchTerms?.[src.uid] || "";
                                  const plannedIds =
                                    step.source_planned_outputs?.[src.uid] ||
                                    [];
                                  return (
                                    <div
                                      key={src.uid}
                                      className="bg-white border border-slate-200/80 rounded-[14px] p-4 shadow-sm"
                                    >
                                      <div className="flex items-center gap-2 mb-3 text-[12px] font-semibold text-slate-800">
                                        <CornerDownRight
                                          size={14}
                                          className="text-slate-400"
                                        />{" "}
                                        From: {src.name}
                                      </div>
                                      <div className="relative mb-3 group min-w-0">
                                        <Search
                                          size={14}
                                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Search WIP targets..."
                                          value={searchTerm}
                                          onChange={(e) =>
                                            handleStepSourceSearch(
                                              idx,
                                              src.uid,
                                              e.target.value,
                                            )
                                          }
                                          className={`${InputClass} pl-9 h-[36px]`}
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto scrollbar-hide py-1">
                                        {safeSemiFinishedArray
                                          .filter((s) => {
                                            const name =
                                              s.item_name ||
                                              s.semi_finished_name ||
                                              s.name ||
                                              `WIP #${s.id}`;
                                            return name
                                              .toLowerCase()
                                              .includes(
                                                (
                                                  searchTerm || ""
                                                ).toLowerCase(),
                                              );
                                          })
                                          .map((s) => {
                                            const name =
                                              s.item_name ||
                                              s.semi_finished_name ||
                                              s.name ||
                                              `WIP #${s.id}`;
                                            const isSelected =
                                              plannedIds.includes(s.id);
                                            return (
                                              <label
                                                key={s.id}
                                                className={`cursor-pointer px-3 py-1.5 rounded-[10px] border text-[12px] font-medium flex items-center gap-2 select-none transition-all ${isSelected ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"}`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  className="hidden"
                                                  checked={isSelected}
                                                  onChange={() =>
                                                    toggleStepSourceOutput(
                                                      idx,
                                                      src.uid,
                                                      s.id,
                                                    )
                                                  }
                                                />
                                                <div
                                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? "border-transparent bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
                                                >
                                                  {isSelected && (
                                                    <Check
                                                      size={10}
                                                      strokeWidth={3}
                                                    />
                                                  )}
                                                </div>
                                                {name}
                                              </label>
                                            );
                                          })}
                                      </div>
                                      {plannedIds.length === 0 && (
                                        <p className="text-[11px] text-rose-500 font-semibold mt-2.5 flex items-center gap-1.5 bg-rose-50 w-max px-2.5 py-1 rounded-[6px] border border-rose-100/60">
                                          <AlertTriangle size={12} /> Requires
                                          at least 1 WIP output
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        steps: [
                          ...p.steps,
                          {
                            step_name: `Phase ${p.steps.length + 1}`,
                            machine_id: "",
                            worker_mode: "STAFF",
                            workers: [],
                            source_planned_outputs: {},
                            wipSearchTerms: {},
                          },
                        ],
                      }))
                    }
                    className="w-full h-[44px] sm:h-[48px] bg-white border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50/80 rounded-[16px] text-[13px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Plus size={16} strokeWidth={2.5} /> Append Routing Phase
                  </button>
                </div>
              </motion.div>
            </motion.form>
          </div>

          <div className="bg-white border-t border-slate-200/80 px-4 sm:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:justify-end items-center gap-3 shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-[40px] sm:h-[44px] px-6 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] hover:bg-slate-50 rounded-[12px] sm:rounded-full text-[13px] font-semibold text-slate-700 transition-all outline-none"
            >
              Cancel
            </button>
            <motion.button
              whileTap={!loading ? { scale: 0.98 } : {}}
              type="submit"
              form="routing-form"
              disabled={loading}
              className="w-full sm:w-auto h-[40px] sm:h-[44px] px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-700/50 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} strokeWidth={2} />{" "}
                  Compiling...
                </>
              ) : (
                <>
                  <CheckSquare size={14} strokeWidth={2.5} /> Save Batch
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  );
};

export default CreateProductionModal;
