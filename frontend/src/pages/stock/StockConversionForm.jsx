import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Loader2,
  Save,
  Repeat,
  ChevronDown,
  PackageMinus,
  PackagePlus,
  AlertCircle,
  Calendar,
} from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const StockConversionForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingMasters, setFetchingMasters] = useState(true);
  const [masters, setMasters] = useState({
    raw: [],
    semi: [],
    products: [],
    parties: [],
    snapshot: [],
  });

  const [formData, setFormData] = useState({
    conversion_date: new Date().toISOString().split("T")[0],
    ownership_type: "OWN",
    party_id: "",
    source_item_kind: "RAW",
    source_item_id: "",
    source_qty: "",
    source_uom: "KG",
    target_item_kind: "FINISHED",
    target_item_id: "",
    target_qty: "",
    target_uom: "KG",
    scrap_type_id: "",
    scrap_qty: "",
    remarks: "",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      setFetchingMasters(true);
      try {
        const endpoints = [
          api.get("/raw-materials/master"),
          api.get("/semi-finished"),
          api.get("/products"),
          api.get("/parties"),
          api.get("/stock/snapshot"),
        ];

        const results = await Promise.allSettled(endpoints);

        const extractData = (res, name) => {
          if (res.status === "rejected") {
            console.error(
              `❌ Failed to load ${name}:`,
              res.reason?.response?.data || res.reason,
            );
            return [];
          }

          const payload = res.value?.data;
          if (!payload) return [];

          if (Array.isArray(payload)) return payload;

          if (Array.isArray(payload.data)) return payload.data;

          if (payload.data && Array.isArray(payload.data.data))
            return payload.data.data;

          if (Array.isArray(payload.products)) return payload.products;
          if (payload.data && Array.isArray(payload.data.products))
            return payload.data.products;

          const fallbackArray = Object.values(payload).find((val) =>
            Array.isArray(val),
          );
          if (fallbackArray) return fallbackArray;

          return [];
        };

        const raw = extractData(results[0], "Raw Materials");
        const semi = extractData(results[1], "Semi Finished");
        const products = extractData(results[2], "Products");
        const allParties = extractData(results[3], "Parties");
        const snapshot = extractData(results[4], "Stock Snapshot");

        const jobWorkParties = allParties.filter((p) => {
          const t = p.types || p.party_types || [];
          if (Array.isArray(t)) return t.includes("JOB_WORK");
          if (typeof t === "string") return t.includes("JOB_WORK");
          return false;
        });

        setMasters({
          raw,
          semi,
          products,
          parties: jobWorkParties,
          snapshot,
        });
      } catch (err) {
        console.error("Master Fetch Error:", err);
        toast.error("Network issue while loading dropdowns.");
      } finally {
        setFetchingMasters(false);
      }
    };
    fetchMasters();
  }, []);

  const getAvailableBalance = useCallback(
    (kind, id) => {
      if (!id) return 0;

      const stock = masters.snapshot.find((s) => {
        const isKindMatch = s.item_kind === kind;

        const isIdMatch =
          (kind === "RAW" && String(s.raw_material_id) === String(id)) ||
          (kind === "SEMI_FINISHED" &&
            String(s.semi_finished_id) === String(id)) ||
          (kind === "FINISHED" && String(s.product_id) === String(id));

        const isOwnershipMatch = s.ownership_type === formData.ownership_type;

        const isPartyMatch =
          formData.ownership_type === "OWN" ||
          String(s.owner_party_id) === String(formData.party_id);

        return isKindMatch && isIdMatch && isOwnershipMatch && isPartyMatch;
      });

      return stock ? Number(stock.balance) : 0;
    },
    [masters.snapshot, formData.ownership_type, formData.party_id],
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        source_qty: Number(formData.source_qty),
        target_qty: Number(formData.target_qty),
        scrap_qty: formData.scrap_qty ? Number(formData.scrap_qty) : 0,
        party_id:
          formData.ownership_type === "JOB_WORK"
            ? Number(formData.party_id)
            : null,
        source_item_id: Number(formData.source_item_id),
        target_item_id: Number(formData.target_item_id),
        scrap_type_id: formData.scrap_type_id
          ? Number(formData.scrap_type_id)
          : null,
      };

      await api.post("/stock/conversions", payload);
      toast.success("Stock converted successfully!");
      onSuccess();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Conversion failed. Check stock levels.",
      );
    } finally {
      setLoading(false);
    }
  };

  const currentAvailable = getAvailableBalance(
    formData.source_item_kind,
    formData.source_item_id,
  );
  const isOverdrawn = Number(formData.source_qty) > currentAvailable;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="relative w-full max-w-4xl bg-slate-50 rounded-[24px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-white/60 m-auto transform-gpu"
        >
          <div className="px-5 py-4 sm:px-8 sm:py-6 border-b border-slate-200/80 flex justify-between items-start sm:items-center bg-white shrink-0 z-20 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4 pr-12 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-900 border border-slate-700/50 text-white rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-sm shrink-0">
                <Repeat size={18} strokeWidth={2} className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] sm:text-[22px] font-bold text-slate-900 tracking-tight leading-tight truncate">
                  Direct Stock Conversion
                </h2>
                <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 mt-0.5 truncate">
                  Transform items from one ledger to another.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 sm:top-7 sm:right-7 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all active:scale-95 border border-slate-200/60"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col gap-4 sm:gap-6 w-full mx-auto">
              {fetchingMasters && (
                <div className="absolute inset-0 z-20 bg-slate-50/80 backdrop-blur-md flex flex-col items-center justify-center text-slate-500">
                  <Loader2
                    size={32}
                    className="animate-spin text-blue-500 mb-3"
                    strokeWidth={1.5}
                  />
                  <span className="text-[11px] sm:text-[13px] font-bold tracking-widest uppercase text-slate-400">
                    Loading Inventory Data...
                  </span>
                </div>
              )}

              <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] shadow-sm border border-slate-200/80 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col min-w-0">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                      Ownership Context
                    </label>
                    <div className="grid grid-cols-2 bg-slate-100/80 p-1 sm:p-1.5 rounded-[12px] sm:rounded-[14px] border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] h-[40px] sm:h-[44px]">
                      {["OWN", "JOB_WORK"].map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              ownership_type: type,
                              party_id: "",
                            })
                          }
                          className={`w-full h-full text-[11px] sm:text-[12px] font-bold rounded-[8px] sm:rounded-[10px] transition-all tracking-wide outline-none ${
                            formData.ownership_type === type
                              ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-900 border border-transparent"
                          }`}
                        >
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                      Conversion Date
                    </label>
                    <div className="flex items-center w-full h-[40px] sm:h-[44px] px-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden box-border">
                      <Calendar
                        size={16}
                        strokeWidth={1.5}
                        className="text-slate-400 shrink-0"
                      />
                      <input
                        type="date"
                        value={formData.conversion_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conversion_date: e.target.value,
                          })
                        }
                        className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-medium text-slate-700 pl-2 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {formData.ownership_type === "JOB_WORK" && (
                  <div className="mt-4">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                      Job Work Party
                    </label>
                    <div className="relative">
                      <select
                        value={formData.party_id}
                        onChange={(e) =>
                          setFormData({ ...formData, party_id: e.target.value })
                        }
                        className="w-full h-[44px] pl-4 pr-10 rounded-[14px] border border-slate-200/80 text-[12px] sm:text-[13px] font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer truncate"
                      >
                        <option value="">Select External Party...</option>
                        {masters.parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.party_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col md:flex-row items-stretch relative shrink-0 gap-4 sm:gap-6">
                <div className="flex-1 w-full bg-white border border-rose-200/60 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-sm flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                  <div className="flex items-center justify-between shrink-0 relative z-10">
                    <span className="text-[11px] sm:text-[12px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-2">
                      <PackageMinus size={16} strokeWidth={2.5} />
                      Consume (Source)
                    </span>
                    <div className="relative w-[140px] sm:w-[150px]">
                      <select
                        value={formData.source_item_kind}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            source_item_kind: e.target.value,
                            source_item_id: "",
                          })
                        }
                        className="w-full h-[36px] pl-3 pr-8 rounded-[10px] text-[10px] sm:text-[11px] font-bold bg-rose-50/50 border border-rose-200/80 text-rose-700 outline-none shadow-sm cursor-pointer hover:bg-rose-50 transition-colors appearance-none"
                      >
                        <option value="RAW">Raw Material</option>
                        <option value="SEMI_FINISHED">Semi-Finished</option>
                      </select>
                      <ChevronDown
                        size={14}
                        strokeWidth={2.5}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-end space-y-4 relative z-10 mt-2">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        Select Item to Consume
                      </label>
                      <div className="relative">
                        <select
                          value={formData.source_item_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              source_item_id: e.target.value,
                            })
                          }
                          className="w-full h-[44px] pl-4 pr-10 rounded-[14px] border border-slate-200/80 hover:border-rose-300 text-[12px] sm:text-[13px] font-medium outline-none focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-slate-50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] text-slate-900 cursor-pointer truncate transition-all appearance-none"
                        >
                          <option value="">Select Source Item...</option>
                          {(formData.source_item_kind === "RAW"
                            ? masters.raw
                            : masters.semi
                          ).map((item) => {
                            const balance = getAvailableBalance(
                              formData.source_item_kind,
                              item.id,
                            );
                            return (
                              <option key={item.id} value={item.id}>
                                {item.material_name ||
                                  item.item_name ||
                                  item.name ||
                                  item.display_name}{" "}
                                (Avail: {balance} {item.default_uom || "KG"})
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown
                          size={16}
                          strokeWidth={2}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        Quantity Consumed
                      </label>
                      <div className="flex gap-2 sm:gap-3 w-full">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={formData.source_qty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              source_qty: e.target.value,
                            })
                          }
                          className={`flex-1 min-w-0 h-[44px] px-4 rounded-[14px] border text-[14px] sm:text-[15px] font-bold outline-none shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] tabular-nums transition-all ${
                            isOverdrawn
                              ? "border-rose-400 bg-rose-50 text-rose-700 focus:bg-white focus:ring-2 focus:ring-rose-200"
                              : "border-slate-200/80 bg-slate-50 hover:bg-white focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 text-slate-900"
                          }`}
                        />
                        <div className="relative shrink-0 w-[90px] sm:w-[100px]">
                          <select
                            value={formData.source_uom}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                source_uom: e.target.value,
                              })
                            }
                            className="w-full h-[44px] pl-3 pr-8 rounded-[14px] border border-slate-200/80 text-[11px] sm:text-[12px] font-bold outline-none focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 bg-slate-50 hover:bg-white text-slate-700 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer appearance-none transition-all"
                          >
                            <option value="KG">KG</option>
                            <option value="TON">TON</option>
                            <option value="PC">PC</option>
                          </select>
                          <ChevronDown
                            size={14}
                            strokeWidth={2.5}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>

                      {isOverdrawn && (
                        <div className="mt-2 text-[10px] sm:text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-[10px] border border-rose-100 shadow-sm w-full flex items-center gap-1.5">
                          <AlertCircle size={14} strokeWidth={2.5} /> Exceeds
                          available balance ({currentAvailable})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex md:hidden justify-center relative z-10 -my-2.5 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-100 rotate-90">
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="hidden md:flex flex-col justify-center items-center absolute inset-0 pointer-events-none z-10">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-100">
                    <ArrowRight
                      size={22}
                      strokeWidth={2.5}
                      className="lg:w-6 lg:h-6"
                    />
                  </div>
                </div>

                <div className="flex-1 w-full bg-white border border-emerald-200/60 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-[0_2px_12px_rgba(16,185,129,0.03)] flex flex-col gap-4 relative overflow-hidden mt-0">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -ml-10 -mt-10 pointer-events-none" />

                  <div className="flex items-center justify-between shrink-0 relative z-10">
                    <span className="text-[11px] sm:text-[12px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <PackagePlus size={16} strokeWidth={2.5} />
                      Produce (Target)
                    </span>
                    <div className="relative w-[140px] sm:w-[150px]">
                      <select
                        value={formData.target_item_kind}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            target_item_kind: e.target.value,
                            target_item_id: "",
                          })
                        }
                        className="w-full h-[36px] pl-3 pr-8 rounded-[10px] text-[10px] sm:text-[11px] font-bold bg-emerald-50/50 border border-emerald-200/80 text-emerald-700 outline-none shadow-sm cursor-pointer hover:bg-emerald-50 transition-colors appearance-none"
                      >
                        <option value="FINISHED">Finished Product</option>
                        <option value="SEMI_FINISHED">Semi-Finished</option>
                      </select>
                      <ChevronDown
                        size={14}
                        strokeWidth={2.5}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex-col flex flex-1 justify-end gap-4 relative z-10 mt-2">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        Select Item to Produce
                      </label>
                      <div className="relative">
                        <select
                          value={formData.target_item_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              target_item_id: e.target.value,
                            })
                          }
                          className="w-full h-[44px] pl-4 pr-10 rounded-[14px] border border-slate-200/80 hover:border-emerald-300 text-[12px] sm:text-[13px] font-medium outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-slate-50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] text-slate-900 cursor-pointer truncate transition-all appearance-none"
                        >
                          <option value="">Select Target Item...</option>
                          {(formData.target_item_kind === "FINISHED"
                            ? masters.products
                            : masters.semi
                          ).map((item) => {
                            const balance = getAvailableBalance(
                              formData.target_item_kind,
                              item.id,
                            );
                            return (
                              <option key={item.id} value={item.id}>
                                {item.product_name ||
                                  item.item_name ||
                                  item.name ||
                                  item.display_name}{" "}
                                (Current: {balance} {item.default_uom || "KG"})
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown
                          size={16}
                          strokeWidth={2}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                        Quantity Produced
                      </label>
                      <div className="flex gap-2 sm:gap-3 w-full">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={formData.target_qty}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              target_qty: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 h-[44px] px-4 rounded-[14px] border border-slate-200/80 text-[14px] sm:text-[15px] font-bold outline-none shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] tabular-nums transition-all bg-slate-50 hover:bg-white focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-slate-900"
                        />
                        <div className="relative shrink-0 w-[90px] sm:w-[100px]">
                          <select
                            value={formData.target_uom}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                target_uom: e.target.value,
                              })
                            }
                            className="w-full h-[44px] pl-3 pr-8 rounded-[14px] border border-slate-200/80 text-[11px] sm:text-[12px] font-bold outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-slate-50 hover:bg-white text-slate-700 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer appearance-none transition-all"
                          >
                            <option value="KG">KG</option>
                            <option value="TON">TON</option>
                            <option value="PC">PC</option>
                          </select>
                          <ChevronDown
                            size={14}
                            strokeWidth={2.5}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 bg-white p-4 sm:p-5 rounded-[20px] shadow-sm border border-slate-200/80">
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes, batch references, or details about this conversion..."
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  className="w-full h-[44px] px-4 rounded-[14px] border border-slate-200/80 text-[13px] font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-slate-50 hover:bg-white transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-4 sm:px-8 sm:py-5 border-t border-slate-200/80 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 h-[44px] rounded-[14px] sm:rounded-full text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors shadow-sm active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                fetchingMasters ||
                isOverdrawn ||
                !formData.source_item_id ||
                !formData.target_item_id ||
                !formData.source_qty ||
                !formData.target_qty ||
                (formData.ownership_type === "JOB_WORK" && !formData.party_id)
              }
              className="w-full sm:w-auto px-8 h-[44px] rounded-[14px] sm:rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-bold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} strokeWidth={2.5} className="text-white/90" />
              )}
              Confirm Conversion
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default StockConversionForm;
