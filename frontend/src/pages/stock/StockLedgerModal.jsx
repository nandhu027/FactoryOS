import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Database,
  Loader2,
  RefreshCcw,
  Factory,
  Truck,
  Building2,
  HardHat,
  Info,
  Search,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const normalizeText = (text) => {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
};

const getNarrative = (record) => {
  const type = record.movement_type;

  const configs = {
    RAW_INWARD: {
      title: `Material Received`,
      icon: <Truck size={18} strokeWidth={1.5} />,
    },
    PRODUCTION_CONSUME: {
      title: `Consumed in Production`,
      icon: <ArrowUpFromLine size={18} strokeWidth={1.5} />,
    },
    PRODUCTION_OUTPUT: {
      title: `Production Yield`,
      icon: <Factory size={18} strokeWidth={1.5} />,
    },
    SALE: {
      title: `Sales Dispatch`,
      icon: <Building2 size={18} strokeWidth={1.5} />,
    },
    CONTRACTOR_OUT: {
      title: `Sent to Contractor`,
      icon: <HardHat size={18} strokeWidth={1.5} />,
    },
    CONTRACTOR_RETURN: {
      title: `Contractor Return`,
      icon: <ArrowDownToLine size={18} strokeWidth={1.5} />,
    },
    ADJUSTMENT_IN: {
      title: `Inventory Adj (In)`,
      icon: <Info size={18} strokeWidth={1.5} />,
    },
    ADJUSTMENT_OUT: {
      title: `Inventory Adj (Out)`,
      icon: <Info size={18} strokeWidth={1.5} />,
    },
    REVERSAL: {
      title: `Ledger Reversal`,
      icon: <RefreshCcw size={18} strokeWidth={1.5} />,
    },
  };
  return (
    configs[type] || {
      title: type.replace(/_/g, " "),
      icon: <Database size={18} strokeWidth={1.5} />,
    }
  );
};

const StockLedgerModal = ({ item, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [localSearch, setLocalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [direction, setDirection] = useState("ALL");
  const [page, setPage] = useState(1);

  const currentBalance = Number(
    item.balance_qty ?? item.balance ?? item.total_balance ?? 0,
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchHistory = async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const itemId =
        item.raw_material_id ||
        item.semi_finished_id ||
        item.product_id ||
        item.scrap_type_id ||
        item.id;

      const params = {
        item_kind: item.item_kind,
        item_id: itemId,
        ownership_type: item.ownership_type,
        owner_party_id: item.owner_party_id,
        search: searchQuery || undefined,
        startDate: dateFilter.start || undefined,
        endDate: dateFilter.end || undefined,
        direction: direction === "ALL" ? undefined : direction,
        page: pageNum,
        limit: 30,
      };
      const res = await api.get("/stock/history", { params });
      if (append) setHistory((prev) => [...prev, ...res.data.data]);
      else setHistory(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      setPage(1);
      fetchHistory(1, false);
    }, 400);
    return () => clearTimeout(delay);
  }, [item, searchQuery, dateFilter, direction]);

  const filteredHistory = useMemo(() => {
    const normalizedQuery = normalizeText(localSearch);
    if (!normalizedQuery) return history;

    return history.filter((record) => {
      const nav = getNarrative(record);
      const entityMatch = normalizeText(record.transaction_entity).includes(
        normalizedQuery,
      );
      const refMatch = normalizeText(record.transaction_ref_no).includes(
        normalizedQuery,
      );
      const titleMatch = normalizeText(nav.title).includes(normalizedQuery);

      return entityMatch || refMatch || titleMatch;
    });
  }, [history, localSearch]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
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
          className="relative z-10 bg-slate-50 w-full max-w-[850px] max-h-[85dvh] sm:max-h-[90dvh] rounded-[20px] sm:rounded-[32px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/60 m-auto transform-gpu"
        >
          <div className="bg-white p-4 sm:p-8 border-b border-slate-200/80 shrink-0 z-20">
            <div className="flex justify-between items-start mb-3 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 pr-10">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-[12px] sm:rounded-[16px] flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
                  <Package
                    size={20}
                    strokeWidth={1.5}
                    className="sm:w-[28px] sm:h-[28px]"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] sm:text-[22px] font-bold text-slate-900 tracking-tight leading-tight mb-0.5 sm:mb-1 truncate">
                    {item.display_name}
                  </h2>
                  <p className="text-[8.5px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 truncate">
                    {item.item_kind.replace("_", " ")} • {item.ownership_type}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 p-1.5 sm:p-2 bg-slate-100/80 hover:bg-slate-200 text-slate-500 rounded-full transition-all active:scale-95 shadow-sm z-30"
              >
                <X
                  size={16}
                  strokeWidth={2}
                  className="sm:w-[18px] sm:h-[18px]"
                />
              </button>
            </div>

            <div className="bg-slate-50/60 border border-slate-200/80 p-3 sm:p-5 rounded-[12px] sm:rounded-[20px] flex justify-between items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 w-[40%] sm:w-auto leading-tight">
                Total Factory Balance
              </span>
              <span className="text-[20px] sm:text-[32px] font-bold tabular-nums tracking-tight text-slate-900 leading-none text-right truncate pl-2">
                {currentBalance.toLocaleString()}{" "}
                <span className="text-[10px] sm:text-[14px] font-semibold text-slate-500 ml-0.5 sm:ml-1">
                  {item.uom}
                </span>
              </span>
            </div>
          </div>

          <div className="px-3 sm:px-6 py-3 border-b border-slate-200/80 flex flex-col lg:flex-row gap-2.5 sm:gap-4 bg-white z-10 shrink-0 shadow-sm w-full">
            <div className="relative flex-1 group w-full lg:min-w-[200px] shrink-0">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none sm:w-4 sm:h-4 sm:left-3.5"
              />
              <input
                type="text"
                placeholder="Search entity, ref, notes..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearchQuery(e.target.value);
                  }
                }}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 h-[36px] sm:h-[44px] bg-slate-50/60 border border-slate-200/80 rounded-[10px] sm:rounded-[14px] outline-none focus:bg-white focus:border-slate-400/50 focus:ring-4 focus:ring-slate-500/10 text-[11px] sm:text-[13px] font-medium text-slate-900 placeholder:text-slate-400 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto shrink-0">
              <div className="flex flex-1 sm:flex-none items-center justify-between gap-1.5 h-[36px] sm:h-[44px] px-2.5 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[10px] sm:rounded-[14px] focus-within:bg-white focus-within:border-slate-400/50 focus-within:ring-4 focus-within:ring-slate-500/10 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] min-w-0">
                <Calendar
                  size={12}
                  strokeWidth={1.5}
                  className="text-slate-400 shrink-0 sm:w-3.5 sm:h-3.5"
                />
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 w-full min-w-0">
                  <input
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, start: e.target.value })
                    }
                    className="w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[10px] sm:text-[12px] font-medium text-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-300 font-semibold shrink-0 text-[9px] sm:text-[10px]">
                    —
                  </span>
                  <input
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, end: e.target.value })
                    }
                    className="w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[10px] sm:text-[12px] font-medium text-slate-700 cursor-pointer"
                  />
                </div>
                {(dateFilter.start || dateFilter.end) && (
                  <button
                    onClick={() => setDateFilter({ start: "", end: "" })}
                    className="p-1 hover:bg-slate-200 text-slate-500 rounded-full transition-colors shrink-0"
                  >
                    <X
                      size={12}
                      strokeWidth={2}
                      className="sm:w-3.5 sm:h-3.5"
                    />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-[10px] sm:rounded-[14px] shrink-0 border border-slate-200/60 w-full sm:w-[220px] h-[36px] sm:h-[44px]">
                {["ALL", "IN", "OUT"].map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setDirection(dir)}
                    className={`w-full h-full rounded-[6px] sm:rounded-[10px] text-[9.5px] sm:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center ${
                      direction === dir
                        ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-700 border border-transparent"
                    }`}
                  >
                    {dir === "IN"
                      ? "In (+)"
                      : dir === "OUT"
                        ? "Out (-)"
                        : "All"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="space-y-2.5 sm:space-y-3 relative pb-2 sm:pb-0">
              {loading && page === 1 ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <div className="p-4 bg-white/80 backdrop-blur-md rounded-[20px] shadow-sm border border-slate-200/50 mb-3">
                    <Loader2
                      className="animate-spin text-blue-500"
                      size={24}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-[16px] sm:rounded-[24px] border border-dashed border-slate-200 shadow-sm">
                  <Database
                    size={32}
                    strokeWidth={1.5}
                    className="mx-auto mb-2 sm:mb-3 text-slate-300"
                  />
                  <p className="font-semibold text-slate-700 text-[13px] sm:text-[14px] tracking-tight">
                    No transactions found
                  </p>
                  <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 mt-0.5 sm:mt-1">
                    Try adjusting your filters or search term.
                  </p>
                </div>
              ) : (
                <>
                  {filteredHistory.map((record, i) => {
                    const nav = getNarrative(record);
                    const qtyIn = Number(record.quantity_in);
                    const qtyOut = Number(record.quantity_out);
                    const isIn = qtyIn > 0;
                    const displayQty = isIn ? qtyIn : qtyOut;

                    return (
                      <div
                        key={`${record.id}-${i}`}
                        className={`relative p-3.5 sm:p-5 rounded-[14px] sm:rounded-[20px] border transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${
                          record.is_reversal
                            ? "bg-slate-100/50 border-slate-200/80 opacity-60"
                            : "bg-white border-slate-200/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-[10px] sm:rounded-[14px] bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 shadow-sm">
                              <span className="scale-[0.85] sm:scale-100">
                                {nav.icon}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pr-2">
                              <p
                                className={`text-[12px] sm:text-[15px] font-semibold truncate leading-tight mb-0.5 sm:mb-1 tracking-tight ${
                                  record.is_reversal
                                    ? "text-slate-500 line-through"
                                    : "text-slate-900"
                                }`}
                              >
                                {nav.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] sm:text-[11px] font-medium text-slate-500 truncate">
                                <span className="flex items-center gap-1 tabular-nums bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-[4px] sm:rounded-[6px] shrink-0">
                                  <Calendar
                                    size={10}
                                    strokeWidth={1.5}
                                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                                  />
                                  {new Date(
                                    record.movement_ts,
                                  ).toLocaleDateString([], {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                {record.transaction_ref_no && (
                                  <span className="font-mono bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-[4px] sm:rounded-[6px] truncate max-w-[100px] sm:max-w-none shrink-0">
                                    REF: {record.transaction_ref_no}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-end justify-between sm:justify-end sm:items-center w-full sm:w-auto gap-3 sm:gap-4 pl-[46px] sm:pl-0 shrink-0 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                            <div className="hidden min-[360px]:block min-w-0 max-w-[140px] lg:max-w-[180px] sm:text-right">
                              <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 truncate">
                                Entity
                              </p>
                              <p className="text-[11px] sm:text-[13px] font-semibold text-slate-700 truncate tracking-tight">
                                {record.transaction_entity || "System"}
                              </p>
                            </div>

                            <div className="text-right shrink-0 ml-auto sm:ml-0">
                              <p
                                className={`text-[16px] sm:text-[20px] font-bold tracking-tight tabular-nums leading-none ${
                                  record.is_reversal
                                    ? "text-slate-400"
                                    : isIn
                                      ? "text-emerald-600"
                                      : "text-slate-900"
                                }`}
                              >
                                {isIn ? "+" : "-"}
                                {displayQty.toLocaleString()}
                              </p>
                              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                                {record.uom}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {meta && meta.total > history.length && (
                    <button
                      onClick={() => {
                        setPage(page + 1);
                        fetchHistory(page + 1, true);
                      }}
                      disabled={loading}
                      className="w-full py-3 sm:py-4 mt-3 sm:mt-6 rounded-[12px] sm:rounded-[20px] bg-white border border-slate-200/80 text-slate-600 font-bold uppercase tracking-widest text-[9.5px] sm:text-[11px] hover:bg-slate-50 hover:shadow-sm transition-all disabled:opacity-50 active:scale-[0.99] shadow-sm"
                    >
                      {loading
                        ? "Loading..."
                        : `Load Previous Logs (${meta.total - history.length} remaining)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default StockLedgerModal;
