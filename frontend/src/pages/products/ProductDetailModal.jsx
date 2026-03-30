import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Package,
  Loader2,
  Activity,
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Database,
  Layers,
  Clock,
  IndianRupee,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const formatTimeAgo = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const ProductDetailModal = ({ itemId, itemType, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isFinished = itemType === "FINISHED";

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const endpoint = isFinished
        ? `/products/${itemId}`
        : `/products/semi-finished/${itemId}`;

      const res = await api.get(endpoint);
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) fetchDetails();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [itemId, itemType]);

  const combinedTimeline = [];
  if (data) {
    if (isFinished) {
      (data.production_history || []).forEach((p) => {
        combinedTimeline.push({
          ...p,
          sortDate: new Date(p.created_at),
          renderType: "PRODUCED",
          badge: "PRODUCTION",
          model: p.business_model || "OWN_MANUFACTURING",
          party: p.party_name || null,
          desc: `Batch: ${p.batch_no} • ${p.step_name}`,
        });
      });
      (data.dispatch_history || []).forEach((d) => {
        combinedTimeline.push({
          ...d,
          sortDate: new Date(d.created_at),
          renderType: "DISPATCHED",
          badge: "OUTWARD",
          model: d.dispatch_type || "SALE",
          party: d.party_name,
          rate: d.sale_rate || null,
          desc: `Invoice: ${d.dispatch_no}`,
        });
      });
    } else {
      (data.produced_history || []).forEach((p) => {
        combinedTimeline.push({
          ...p,
          sortDate: new Date(p.created_at),
          renderType: "PRODUCED",
          badge: "YIELD",
          model: p.business_model || "OWN_MANUFACTURING",
          party: p.party_name || null,
          desc: `Batch: ${p.batch_no} • ${p.step_name}`,
        });
      });
      (data.consumed_history || []).forEach((c) => {
        combinedTimeline.push({
          ...c,
          sortDate: new Date(c.created_at),
          renderType: "CONSUMED",
          badge: "INPUT",
          model: c.business_model || "OWN_MANUFACTURING",
          party: c.party_name || null,
          desc: `Batch: ${c.batch_no} • ${c.step_name}`,
        });
      });
      (data.contractor_history || []).forEach((c) => {
        combinedTimeline.push({
          ...c,
          sortDate: new Date(c.out_date),
          renderType: "CONTRACTOR",
          badge: "JOB WORK",
          model: "EXTERNAL_PROCESSING",
          party: c.contractor_name,
          rate: c.processing_rate || null,
          desc: `Job Card: ${c.job_no}`,
        });
      });
    }
    combinedTimeline.sort((a, b) => b.sortDate - a.sortDate);
  }

  const getStockBalance = (type) => {
    if (!data || !data.stock_balances) return "0.00";
    const record = data.stock_balances.find((b) => b.ownership_type === type);
    return record
      ? parseFloat(record.balance).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";
  };

  const displayName = data ? data.product_name || data.item_name || "WP" : "WP";
  const displayCode = data
    ? data.product_code || data.item_code || "N/A"
    : "N/A";
  const initials = displayName.substring(0, 2).toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* 🟢 HEADER: Premium Dispatch Theme */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-3 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-20 gap-3 sm:gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
          <div
            className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[14px] shadow-sm shrink-0 border ${
              isFinished
                ? "bg-blue-50 text-blue-700 border-blue-200/80"
                : "bg-emerald-50 text-emerald-700 border-emerald-200/80"
            }`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 leading-none">
                ID: {itemId}
              </span>
              <span
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none ${
                  isFinished
                    ? "bg-blue-50 text-blue-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {isFinished ? "Finished Goods" : "WIP Material"}
              </span>
              {data && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none ${
                    data.is_active
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-slate-500/10 text-slate-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      data.is_active ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {data.is_active ? "Active" : "Inactive"}
                </span>
              )}
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {displayName}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 w-full sm:w-auto">
          {data && (
            <div className="flex items-center bg-slate-50/80 border border-slate-200/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers size={14} className="text-slate-400 hidden sm:block" />{" "}
                Base Unit:
                <span className="text-[12px] font-black text-slate-900 ml-1">
                  {data.default_uom}
                </span>
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-[8px] sm:rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        {/* Loading State */}
        {loading && !data && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
              <Loader2
                size={24}
                className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                strokeWidth={1.5}
              />
            </div>
          </div>
        )}

        {!loading && data && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden bg-white"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
                <div className="flex flex-col p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 text-slate-500">
                    <Database size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Total Own Stock
                    </span>
                  </div>
                  <span className="text-[20px] sm:text-[24px] font-black text-slate-900 tabular-nums leading-tight truncate">
                    {getStockBalance("OWN")}{" "}
                    <span className="text-[12px] font-bold text-slate-400 ml-0.5">
                      {data.default_uom}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col p-4 sm:p-5 hover:bg-blue-50/50 transition-colors">
                  <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2 text-blue-600">
                    <Truck size={14} className="text-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Out at Job Work
                    </span>
                  </div>
                  <span className="text-[20px] sm:text-[24px] font-black text-blue-700 tabular-nums leading-tight truncate">
                    {getStockBalance("JOB_WORK")}{" "}
                    <span className="text-[12px] font-bold text-blue-400/60 ml-0.5">
                      {data.default_uom}
                    </span>
                  </span>
                </div>
              </div>

              <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-blue-500" /> Lifecycle
                  Footprint
                </h4>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm leading-none">
                  {combinedTimeline.length} ENTRIES
                </span>
              </div>

              <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-slate-50/50 p-4 sm:p-6">
                {combinedTimeline.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-white py-12 m-2 shadow-sm">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400"
                      />
                    </div>
                    <p className="text-[15px] font-bold tracking-tight text-slate-900">
                      No Lifecycle Data
                    </p>
                    <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                      No production or operational footprint exists for this
                      item yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 relative">
                    <div className="absolute left-[15px] sm:left-[19.5px] top-6 bottom-6 w-[2px] bg-slate-200/80 z-0 hidden sm:block" />

                    {combinedTimeline.map((item, idx) => {
                      let Icon = Factory;
                      let colorClass = "text-indigo-600 bg-indigo-100";

                      if (item.renderType === "DISPATCHED") {
                        Icon = ArrowUpRight;
                        colorClass = "text-emerald-600 bg-emerald-100";
                      }
                      if (item.renderType === "CONSUMED") {
                        Icon = ArrowDownRight;
                        colorClass = "text-rose-600 bg-rose-100";
                      }
                      if (item.renderType === "CONTRACTOR") {
                        Icon = Truck;
                        colorClass = "text-orange-600 bg-orange-100";
                      }

                      const isJobWork = item.model?.includes("JOB_WORK");
                      const isOwn = item.model?.includes("OWN");

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, ease: smoothEase }}
                          key={idx}
                          className="relative sm:pl-9 mb-4 group"
                        >
                          <div
                            className={`hidden sm:flex absolute left-0 top-1.5 w-[40px] h-[40px] rounded-full border-[3px] border-slate-50 items-center justify-center shadow-sm z-10 transition-colors ${colorClass}`}
                          >
                            <Icon size={16} strokeWidth={2.5} />
                          </div>
                          <div className="bg-white p-4 rounded-[16px] sm:rounded-[20px] border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div
                                  className={`sm:hidden w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${colorClass}`}
                                >
                                  <Icon size={16} strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                                      {item.renderType}
                                    </p>
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider leading-none ${
                                        isJobWork
                                          ? "bg-blue-50 text-blue-600"
                                          : isOwn
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-slate-50 text-slate-400"
                                      }`}
                                    >
                                      {isJobWork
                                        ? "JOB WORK"
                                        : isOwn
                                          ? "OWN MATERIAL"
                                          : item.model?.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 whitespace-nowrap tabular-nums flex items-center gap-1.5 shrink-0 self-start">
                                <Clock size={12} className="hidden sm:block" />
                                {formatTimeAgo(item.sortDate)}
                              </span>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100/80 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                                {item.party && (
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-[8px]">
                                    <User
                                      size={12}
                                      className="text-slate-400"
                                    />
                                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">
                                      {item.party}
                                    </span>
                                  </div>
                                )}
                                {item.rate && (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-[8px]">
                                    <IndianRupee
                                      size={12}
                                      className="text-emerald-500"
                                    />
                                    <span className="text-[10px] font-bold text-emerald-700 truncate">
                                      Rate: {formatINR(item.rate)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-[10px] border sm:border-none border-slate-100">
                                <span className="inline-flex px-2 py-1 rounded-full text-[8.5px] sm:text-[9px] font-bold uppercase tracking-wider leading-none bg-slate-100 text-slate-500">
                                  {item.badge}
                                </span>
                                <span className="text-[14px] sm:text-[15px] font-black text-slate-900 tabular-nums">
                                  {item.quantity || item.qty_sent}{" "}
                                  <span className="text-[10px] font-bold text-slate-400 ml-0.5 uppercase tracking-widest">
                                    {item.uom}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ProductDetailModal;
