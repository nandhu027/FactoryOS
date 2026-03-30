import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Calculator,
  Layers,
  CheckCircle2,
  ArrowRight,
  Truck,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0,
  );

const extractArray = (res) => {
  if (!res) return [];
  const payload = res.data?.data || res.data;
  if (Array.isArray(payload)) return payload;
  if (payload?.rows && Array.isArray(payload.rows)) return payload.rows;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
};

const InputClass =
  "w-full min-w-0 h-[40px] sm:h-[44px] px-2.5 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[12px] sm:text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400";
const SelectClass =
  "w-full min-w-0 h-[40px] sm:h-[44px] px-2.5 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[12px] sm:text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none";
const LabelClass =
  "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

const CargoLineItem = memo(
  ({
    line,
    availableItems,
    dispatchType,
    onChange,
    onRemove,
    disableRemove,
  }) => {
    const handleItemChange = useCallback(
      (e) => {
        const val = e.target.value;
        const selectedItem = availableItems.find((i) => i.unique_id === val);
        onChange(line.id, "unique_id", val, selectedItem);
      },
      [availableItems, onChange, line.id],
    );

    const lineTotal = Number(line.quantity || 0) * Number(line.sale_rate || 0);

    const selectedItemObj = availableItems.find(
      (i) => i.unique_id === line.unique_id,
    );
    const maxQty = selectedItemObj ? selectedItemObj.balance : 0;

    const isExceeding = line.unique_id && Number(line.quantity) > maxQty;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 p-4 lg:p-2 bg-white lg:hover:bg-slate-50/80 rounded-[16px] lg:rounded-[16px] border lg:border-transparent transition-colors group mb-3 lg:mb-0 shadow-sm lg:shadow-none ${isExceeding ? "border-rose-300 bg-rose-50/30" : "border-slate-200/80"}`}
      >
        <div className="flex justify-between items-center lg:hidden border-b border-slate-100 pb-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Item Details
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
            Product / Material
          </label>
          {dispatchType === "SCRAP_SALE" ? (
            <div
              className={`${InputClass} flex items-center justify-between bg-slate-100/80 text-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]`}
            >
              <span className="truncate">Factory Scrap (All Types)</span>
              {selectedItemObj && (
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200/60 px-2 py-0.5 rounded-[6px] shadow-sm ml-2 shrink-0">
                  Avail: {selectedItemObj.balance} {selectedItemObj.uom}
                </span>
              )}
            </div>
          ) : (
            <select
              required
              value={line.unique_id}
              onChange={handleItemChange}
              className={SelectClass}
            >
              <option value="" disabled>
                Choose Item...
              </option>
              {availableItems.map((i) => (
                <option key={i.unique_id} value={i.unique_id}>
                  {i.name} - Avail: {i.balance} {i.uom}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 lg:flex lg:flex-[3] gap-3 sm:gap-4 w-full min-w-0">
          <div className="flex-1 min-w-0 relative">
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
              className={`${InputClass} pr-9 lg:text-right tabular-nums ${isExceeding ? "border-rose-400 text-rose-600 focus:ring-rose-500/10 focus:border-rose-400" : ""}`}
            />
            <span className="absolute right-3 top-[34px] lg:top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
              {line.uom}
            </span>
            {isExceeding && (
              <p className="absolute -bottom-[18px] lg:top-[42px] lg:-bottom-auto right-0 text-[9px] sm:text-[10px] font-bold text-rose-500 flex items-center gap-1">
                <AlertTriangle size={10} /> Max: {maxQty}
              </p>
            )}
          </div>

          <div className="flex-1 min-w-0 relative">
            <label className="lg:hidden block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
              Rate
            </label>
            <span className="absolute left-3 top-[34px] lg:top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              required
              placeholder="Rate"
              value={line.sale_rate}
              onChange={(e) => onChange(line.id, "sale_rate", e.target.value)}
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

const DispatchForm = ({ onClose, onSuccess }) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  const [form, setForm] = useState({
    dispatch_no: `INV-${Date.now().toString().slice(-6)}`,
    dispatch_date: new Date().toISOString().split("T")[0],
    dispatch_type: "OWN_SALE",
    party_id: "",
    remarks: "",
    lines: [
      {
        id: generateId(),
        unique_id: "",
        item_id: "",
        item_kind: "",
        quantity: "",
        uom: "KG",
        sale_rate: "",
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
    const loadParties = async () => {
      try {
        const pRes = await api.get(`/parties?limit=1000`);
        setParties(extractArray(pRes));
      } catch (e) {
        toast.error("Failed to load clients");
      }
    };
    loadParties();
  }, []);

  const filteredParties = useMemo(() => {
    if (form.dispatch_type === "JOB_WORK_RETURN") {
      const filtered = parties.filter((p) => {
        const types = p.party_types || p.party_type || p.types || [];
        return (Array.isArray(types) ? types : [types]).includes("JOB_WORK");
      });
      return filtered.length > 0 ? filtered : parties;
    }

    if (
      form.dispatch_type === "OWN_SALE" ||
      form.dispatch_type === "SCRAP_SALE"
    ) {
      const filtered = parties.filter((p) => {
        const types = p.party_types || p.party_type || p.types || [];
        const typesArr = Array.isArray(types) ? types : [types];
        return typesArr.includes("SALE") || typesArr.includes("CUSTOMER");
      });
      return filtered.length > 0 ? filtered : parties;
    }

    return parties;
  }, [parties, form.dispatch_type]);

  useEffect(() => {
    const loadStock = async () => {
      if (form.dispatch_type === "JOB_WORK_RETURN" && !form.party_id) {
        setAvailableItems([]);
        return;
      }

      setStockLoading(true);
      try {
        if (form.dispatch_type === "SCRAP_SALE") {
          const stockRes = await api.get("/stock/snapshot");
          const sPayload =
            stockRes.data?.data || stockRes.data?.rows || stockRes.data;

          let scrapBal = 0;
          if (
            sPayload &&
            typeof sPayload === "object" &&
            !Array.isArray(sPayload)
          ) {
            if (sPayload.scrap !== undefined) {
              scrapBal = Number(
                typeof sPayload.scrap === "object"
                  ? sPayload.scrap.balance ||
                      sPayload.scrap.balance_qty ||
                      sPayload.scrap.quantity ||
                      0
                  : sPayload.scrap,
              );
            } else if (sPayload.scrap_stock !== undefined) {
              scrapBal = Number(sPayload.scrap_stock);
            } else if (sPayload.scrap_balance !== undefined) {
              scrapBal = Number(sPayload.scrap_balance);
            } else {
              for (const val of Object.values(sPayload)) {
                if (Array.isArray(val)) {
                  const sc = val.find(
                    (i) =>
                      i.item_kind === "SCRAP" ||
                      i.is_scrap ||
                      i.unique_id === "SCRAP",
                  );
                  if (sc) {
                    scrapBal = Number(
                      sc.balance_qty || sc.balance || sc.quantity || 0,
                    );
                    break;
                  }
                }
              }
            }
          } else if (Array.isArray(sPayload)) {
            const sc = sPayload.find(
              (i) =>
                i.item_kind === "SCRAP" ||
                i.is_scrap ||
                i.unique_id === "SCRAP",
            );
            if (sc)
              scrapBal = Number(
                sc.balance_qty || sc.balance || sc.quantity || 0,
              );
          }

          setAvailableItems([
            {
              id: "SCRAP",
              unique_id: "SCRAP",
              name: "Factory Scrap",
              uom: "KG",
              kind: "SCRAP",
              balance: scrapBal,
            },
          ]);
          setStockLoading(false);
          return;
        }
        const params = { item_kind: "FINISHED" };
        if (form.dispatch_type === "JOB_WORK_RETURN") {
          params.ownership_type = "JOB_WORK";
          params.party_id = form.party_id;
        } else {
          params.ownership_type = "OWN";
        }

        const [prRes, stockRes] = await Promise.all([
          api.get("/products?limit=1000"),
          api.get("/stock/snapshot", { params }),
        ]);

        const fgs = extractArray(prRes);

        let stockData = [];
        const sPayload =
          stockRes.data?.data || stockRes.data?.rows || stockRes.data;

        if (Array.isArray(sPayload)) {
          stockData = sPayload;
        } else if (sPayload?.rows && Array.isArray(sPayload.rows)) {
          stockData = sPayload.rows;
        } else if (sPayload && typeof sPayload === "object") {
          const key =
            form.dispatch_type === "JOB_WORK_RETURN" ? "job_work" : "own";
          stockData = sPayload[key] || sPayload[key.toUpperCase()] || [];
          if (!Array.isArray(stockData) || stockData.length === 0) {
            for (const val of Object.values(sPayload)) {
              if (Array.isArray(val)) {
                stockData = val;
                break;
              }
            }
          }
        }
        const merged = fgs.map((p) => {
          const s = stockData.find((st) => {
            const matchesProduct =
              Number(st.product_id || st.item_id || st.id) === Number(p.id);
            const matchesParty =
              form.dispatch_type !== "JOB_WORK_RETURN" ||
              Number(st.owner_party_id) === Number(form.party_id);
            return matchesProduct && matchesParty;
          });

          const bal = s
            ? Number(
                s.balance_qty ??
                  s.balance ??
                  s.quantity ??
                  s.total_balance ??
                  0,
              )
            : 0;
          return {
            id: p.id,
            unique_id: `FG_${p.id}`,
            name: p.product_name || p.name || "Unknown Product",
            uom: p.default_uom || p.uom || "KG",
            kind: "FINISHED",
            balance: bal,
          };
        });

        let finalItems = merged;
        if (form.dispatch_type === "JOB_WORK_RETURN") {
          finalItems = merged.filter((m) => m.balance > 0);
        }

        finalItems.sort((a, b) => b.balance - a.balance);
        setAvailableItems(finalItems);
      } catch (e) {
        console.error("Stock Fetch Error", e);
        toast.error("Failed to load product list.");
      } finally {
        setStockLoading(false);
      }
    };

    loadStock();
  }, [form.dispatch_type, form.party_id]);

  const handleTopLevelChange = useCallback((field, value) => {
    setForm((prev) => {
      const updates = { [field]: value };

      if (field === "dispatch_type" || field === "party_id") {
        updates.lines = [
          {
            id: generateId(),
            unique_id: value === "SCRAP_SALE" ? "SCRAP" : "",
            item_id: value === "SCRAP_SALE" ? null : "",
            item_kind: value === "SCRAP_SALE" ? "SCRAP" : "",
            quantity: "",
            uom: "KG",
            sale_rate: "",
          },
        ];
      }

      if (field === "dispatch_type") {
        updates.party_id = "";
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
          unique_id: prev.dispatch_type === "SCRAP_SALE" ? "SCRAP" : "",
          item_id: prev.dispatch_type === "SCRAP_SALE" ? null : "",
          item_kind: prev.dispatch_type === "SCRAP_SALE" ? "SCRAP" : "",
          quantity: "",
          uom: "KG",
          sale_rate: "",
        },
      ],
    }));
  }, []);

  const handleLineChange = useCallback((id, field, value, itemObj = null) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value };
          if (field === "unique_id" && itemObj) {
            updatedLine.item_id = itemObj.id === "SCRAP" ? null : itemObj.id;
            updatedLine.item_kind = itemObj.kind;
            updatedLine.uom = itemObj.uom;
          }
          return updatedLine;
        }
        return line;
      }),
    }));
  }, []);

  const handleRemoveLine = useCallback((idToRemove) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== idToRemove),
    }));
  }, []);

  const subTotal = form.lines.reduce(
    (sum, line) =>
      sum + Number(line.quantity || 0) * Number(line.sale_rate || 0),
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

    const hasEmptyLine = form.lines.some(
      (l) => !l.unique_id || !l.quantity || !l.sale_rate,
    );
    if (hasEmptyLine) return toast.error("Please fill all item line details.");

    for (let i = 0; i < form.lines.length; i++) {
      const line = form.lines[i];
      const item = availableItems.find((a) => a.unique_id === line.unique_id);
      if (item && Number(line.quantity) > item.balance) {
        return toast.error(`Line ${i + 1}: Exceeds available stock.`);
      }
    }

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
        lines: form.lines.map((line) => ({
          ...line,
          item_id: line.item_id === "SCRAP" ? null : line.item_id,
          item_kind: line.unique_id === "SCRAP" ? "SCRAP" : line.item_kind,
          sale_rate: Number(line.sale_rate),
          quantity: Number(line.quantity),
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

      await api.post("/dispatch", payload);
      toast.success("Dispatch confirmed successfully.");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to log dispatch");
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
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
            <Truck size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
              Create Dispatch
            </h2>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 flex items-center gap-1.5 truncate">
              Log outbound sales & returns
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 hidden sm:block"></span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
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
        <form
          id="dispatch-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full"
        >
          <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
              <div className="min-w-0 flex flex-col">
                <label className={LabelClass}>Dispatch No</label>
                <input
                  type="text"
                  required
                  value={form.dispatch_no}
                  onChange={(e) =>
                    handleTopLevelChange("dispatch_no", e.target.value)
                  }
                  className={InputClass}
                />
              </div>

              <div className="flex flex-col min-w-0">
                <label className={LabelClass}>Date</label>
                <div className="flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border">
                  <Calendar
                    size={14}
                    strokeWidth={2}
                    className="text-slate-400 shrink-0 mr-1.5"
                  />
                  <input
                    type="date"
                    required
                    value={form.dispatch_date}
                    onChange={(e) =>
                      handleTopLevelChange("dispatch_date", e.target.value)
                    }
                    className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 min-w-0 flex flex-col">
                <label className={LabelClass}>Dispatch Type</label>
                <div className="relative group w-full min-w-0">
                  <select
                    value={form.dispatch_type}
                    onChange={(e) =>
                      handleTopLevelChange("dispatch_type", e.target.value)
                    }
                    className={SelectClass}
                  >
                    <option value="OWN_SALE">Finished Goods</option>
                    <option value="SCRAP_SALE">Scrap Sale</option>
                    <option value="JOB_WORK_RETURN">Job Work Return</option>
                  </select>
                </div>
              </div>
              <div className="col-span-2 md:col-span-1 min-w-0 flex flex-col">
                <label className={LabelClass}>
                  {form.dispatch_type === "JOB_WORK_RETURN"
                    ? "Job Work Client"
                    : "Customer / Party"}
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
                  {filteredParties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.party_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] min-w-0 lg:overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                <Layers size={14} className="text-slate-400 sm:w-4 sm:h-4" />{" "}
                Outbound Items
                {stockLoading && (
                  <Loader2
                    className="animate-spin ml-1 text-blue-500"
                    size={14}
                  />
                )}
              </h3>
              {form.dispatch_type !== "SCRAP_SALE" && (
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="h-[32px] px-3 sm:px-4 border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-[10px] text-[11px] sm:text-[12px] font-bold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-sm"
                >
                  <Plus size={14} strokeWidth={2.5} /> Add{" "}
                  <span className="hidden sm:inline">Item</span>
                </button>
              )}
            </div>
            <div className="hidden lg:flex gap-3 px-5 py-2.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex-[3] text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Item Details
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
            <div className="lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-3 bg-slate-50/30 scrollbar-hide min-w-0">
              <div className="flex flex-col min-w-0">
                <AnimatePresence>
                  {form.lines.map((line) => (
                    <CargoLineItem
                      key={line.id}
                      line={line}
                      availableItems={availableItems}
                      dispatchType={form.dispatch_type}
                      onChange={handleLineChange}
                      onRemove={handleRemoveLine}
                      disableRemove={form.lines.length === 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 mb-4 lg:mb-0 min-w-0 w-full">
            <input
              type="text"
              placeholder="Additional remarks, loading notes, or instructions..."
              value={form.remarks}
              onChange={(e) => handleTopLevelChange("remarks", e.target.value)}
              className={InputClass}
            />
          </div>
        </form>
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
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

          <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide min-w-0">
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
                      <div className="flex bg-slate-200/50 p-1 rounded-[10px] text-[10px] sm:text-[11px] font-bold min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setBilling({ ...billing, gst_mode: "AUTO" })
                          }
                          className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-all truncate ${billing.gst_mode === "AUTO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                        >
                          AUTO (%)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setBilling({ ...billing, gst_mode: "MANUAL" })
                          }
                          className={`px-2.5 sm:px-3 py-1.5 rounded-[6px] transition-all truncate ${billing.gst_mode === "MANUAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
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
                          <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1 min-w-0">
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
                              className="flex shrink-0 ml-2"
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
                                    className={`${InputClass} h-[32px] text-[11px] sm:text-[12px] pr-5 sm:pr-6 text-right rounded-[8px] min-w-0`}
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
                                    className={`${InputClass} h-[32px] text-[11px] sm:text-[12px] pl-5 sm:pl-6 pr-2 text-right rounded-[8px] min-w-0`}
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
                  Subtotal (Items)
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
                    <span className="text-[11px] sm:text-[12px] font-semibold flex items-center gap-1.5 min-w-0">
                      {type}{" "}
                      {billing.gst_mode === "AUTO" && (
                        <span className="text-[9px] sm:text-[10px] bg-blue-100/50 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                          @{gstBreakdown[type].rate}%
                        </span>
                      )}
                    </span>
                    <span className="text-[12px] sm:text-[13px] font-bold tabular-nums shrink-0">
                      +{formatINR(gstBreakdown[type].amount)}
                    </span>
                  </div>
                ))}

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <label className="flex items-center cursor-pointer select-none min-w-0">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0"
                    checked={billing.apply_round_off}
                    onChange={(e) =>
                      setBilling({
                        ...billing,
                        apply_round_off: e.target.checked,
                      })
                    }
                  />
                  <span className="ml-2 text-[11px] sm:text-[12px] font-bold text-slate-700 truncate">
                    Auto Round-Off
                  </span>
                </label>
                {billing.apply_round_off && roundOff !== 0 && (
                  <span className="text-[11px] sm:text-[12px] font-bold text-slate-500 tabular-nums bg-slate-100 px-2 py-0.5 sm:py-1 rounded-lg shrink-0">
                    {roundOff > 0 ? "+" : ""}
                    {roundOff.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between items-end mb-4 sm:mb-5">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                Grand Total
              </span>
              <span className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none tabular-nums truncate max-w-[70%] text-right">
                {formatINR(grandTotal)}
              </span>
            </div>
            <button
              type="submit"
              form="dispatch-form"
              disabled={loading}
              className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-md hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={16} />{" "}
                  Executing...
                </>
              ) : (
                <>
                  Confirm Dispatch <ArrowRight className="shrink-0" size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default DispatchForm;
