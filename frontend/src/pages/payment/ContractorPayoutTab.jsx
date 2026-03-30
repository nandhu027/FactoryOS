import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Calendar,
  User,
  Loader2,
  Banknote,
  MinusCircle,
  Briefcase,
  CheckSquare2,
  Square,
  CheckCircle2,
  History,
  ServerCrash,
  Wallet,
  Layers,
  ArrowRight,
  Calculator,
  X,
} from "lucide-react";
import api from "../../api/axios";
import ContractorSlipModal from "./ContractorSlipModal";
import ClearPendingModal from "./ClearPendingModal";

const smoothEase = [0.22, 1, 0.36, 1];

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

const BaseInputClass =
  "w-full min-w-0 h-[44px] bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400";

const LabelClass =
  "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const ContractorPayoutPage = ({ allPersonnel = [], onSettled, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const [targetMonth, setTargetMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [rates, setRates] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());

  const [loadingSync, setLoadingSync] = useState(false);
  const [syncedData, setSyncedData] = useState(null);
  const [syncError, setSyncError] = useState(null);

  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showClearPendingModal, setShowClearPendingModal] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isVisible]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const contractorList = allPersonnel.filter(
    (p) => p.personnel_type === "CONTRACTOR",
  );
  const selectedDetails = contractorList.find(
    (s) => String(s.id) === String(selectedContractorId),
  );

  const fetchSyncedData = useCallback(async () => {
    if (!selectedContractorId || !targetMonth) {
      setSyncedData(null);
      setSyncError(null);
      return;
    }

    setLoadingSync(true);
    setSyncError(null);
    setRates({});
    setSelectedItems(new Set());

    try {
      const [year, month] = targetMonth.split("-");
      const res = await api.get("/payments/generate-contractor-payout", {
        params: {
          personnel_id: selectedContractorId,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          rates: JSON.stringify({}),
        },
      });

      const data = res.data.data || {
        unpaid_items: [],
        paid_items: [],
        financials: {},
      };
      setSyncedData(data);

      const unpaidItemIds = (data.unpaid_items || []).map((i) =>
        String(i.item_id),
      );
      setSelectedItems(new Set(unpaidItemIds));
    } catch (err) {
      console.error("Sync failed", err);
      setSyncError(
        err.response?.data?.message || "Failed to fetch ledger data.",
      );
      setSyncedData(null);
    } finally {
      setLoadingSync(false);
    }
  }, [selectedContractorId, targetMonth]);

  useEffect(() => {
    fetchSyncedData();
  }, [fetchSyncedData]);

  const handleRateChange = (itemId, value) => {
    setRates((prev) => ({ ...prev, [itemId]: value }));
  };

  const toggleItemSelection = (itemId) => {
    const newSet = new Set(selectedItems);
    const strId = String(itemId);
    if (newSet.has(strId)) newSet.delete(strId);
    else newSet.add(strId);
    setSelectedItems(newSet);
  };

  const handleGenerateClick = () => {
    if (selectedItems.size === 0)
      return alert("Please tick at least one item to generate a payout.");
    const missingRate = Array.from(selectedItems).some(
      (itemId) => !rates[itemId] || rates[itemId] <= 0,
    );
    if (missingRate)
      return alert("Please enter a valid rate for all ticked items.");
    setShowSlipModal(true);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const unpaidItems = syncedData?.unpaid_items || [];
  const paidItems = syncedData?.paid_items || [];

  const selectedTotal = Array.from(selectedItems).reduce((sum, strId) => {
    const item = unpaidItems.find((i) => String(i.item_id) === strId);
    const rate = Number(rates[strId]) || 0;
    return sum + (item ? Number(item.quantity) * rate : 0);
  }, 0);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white"
        >
          <div className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
                <Hammer size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
                  Contractor Payouts
                </h2>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 flex items-center gap-1.5 truncate">
                  Manage billing cycles & generate slips
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 hidden sm:block"></span>
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-rose-600 rounded-full transition-all shadow-sm active:scale-95 shrink-0 ml-2"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-4">
            <div className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full">
              <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 min-w-0 w-full overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full min-w-0">
                  <div className="w-full min-w-0 flex flex-col">
                    <label className={LabelClass}>Billing Cycle</label>
                    <div className="flex items-center w-full h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border group min-w-0">
                      <Calendar
                        size={16}
                        strokeWidth={2.5}
                        className="text-slate-400 shrink-0 mr-2 group-focus-within:text-blue-500 transition-colors"
                      />
                      <input
                        type="month"
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                      />
                    </div>
                  </div>

                  <div className="w-full min-w-0 flex flex-col">
                    <label className={LabelClass}>Select Contractor</label>
                    <div className="flex items-center w-full h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border group min-w-0">
                      <User
                        size={16}
                        strokeWidth={2.5}
                        className="text-slate-400 shrink-0 mr-2 group-focus-within:text-blue-500 transition-colors"
                      />
                      <select
                        value={selectedContractorId}
                        onChange={(e) =>
                          setSelectedContractorId(e.target.value)
                        }
                        className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0 truncate"
                      >
                        <option value="" disabled>
                          -- Choose Contractor --
                        </option>
                        {contractorList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} (ID: #{s.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] min-w-0 lg:overflow-hidden">
                <div className="px-4 sm:px-5 py-3 sm:py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 sm:gap-2">
                    <Layers size={14} className="text-blue-500 sm:w-4 sm:h-4" />{" "}
                    Active Unpaid Returns
                    {loadingSync && (
                      <Loader2
                        className="animate-spin ml-1 text-blue-500"
                        size={14}
                      />
                    )}
                  </h3>
                  {selectedItems.size > 0 && (
                    <div className="text-[11px] sm:text-[12px] font-bold bg-blue-50 border border-blue-200/60 text-blue-700 px-3 py-1 rounded-full shadow-sm shrink-0 ml-2">
                      {selectedItems.size} Selected
                    </div>
                  )}
                </div>

                {unpaidItems.length > 0 && (
                  <div className="hidden lg:flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-white shrink-0">
                    <div className="w-[40px] flex justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Inc
                    </div>
                    <div className="flex-[2.5] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Item Details
                    </div>
                    <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Quantity
                    </div>
                    <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                      Rate
                    </div>
                    <div className="w-[120px] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-2">
                      Total
                    </div>
                  </div>
                )}

                <div className="lg:flex-1 lg:overflow-y-auto p-4 lg:p-4 bg-slate-50/30 scrollbar-hide min-w-0">
                  {!selectedContractorId ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 bg-white border border-slate-200/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <Briefcase
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-300"
                        />
                      </div>
                      <p className="text-[15px] font-bold tracking-tight text-slate-900 mb-1">
                        Select a Contractor
                      </p>
                      <p className="text-[13px] font-medium text-slate-500 text-center">
                        Choose a contractor to view pending returns.
                      </p>
                    </div>
                  ) : syncError ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center">
                      <ServerCrash
                        size={32}
                        strokeWidth={1.5}
                        className="text-rose-400 mb-3"
                      />
                      <p className="text-[14px] font-bold text-rose-600">
                        {syncError}
                      </p>
                    </div>
                  ) : unpaidItems.length === 0 ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 bg-white border border-slate-200/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <CheckCircle2 size={24} className="text-emerald-400" />
                      </div>
                      <p className="text-[15px] font-bold text-slate-900 tracking-tight mb-1">
                        {paidItems.length > 0
                          ? "All caught up!"
                          : "No returns found"}
                      </p>
                      <p className="text-[13px] font-medium text-slate-500 max-w-sm">
                        {paidItems.length > 0
                          ? "All items returned this month have been billed."
                          : "No unpaid returns for this period."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
                      {unpaidItems.map((item) => {
                        const strId = String(item.item_id);
                        const isSelected = selectedItems.has(strId);
                        const lineRate = Number(rates[strId]) || 0;
                        const lineTotal = Number(item.quantity) * lineRate;

                        return (
                          <div
                            key={item.item_id}
                            className={`flex flex-col lg:flex-row lg:items-center gap-4 p-4 lg:px-5 lg:py-3 bg-white rounded-[16px] border transition-colors group shadow-sm lg:shadow-none min-w-0 ${
                              isSelected
                                ? "border-blue-300 bg-blue-50/20 lg:bg-blue-50/20"
                                : "border-slate-200/80 lg:border-transparent"
                            }`}
                          >
                            <div className="flex justify-between items-center lg:hidden border-b border-slate-100 pb-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Include Item
                              </span>
                              <button
                                onClick={() =>
                                  toggleItemSelection(item.item_id)
                                }
                                className={`p-1.5 rounded-[8px] transition-all ${
                                  isSelected
                                    ? "text-blue-500 bg-blue-50"
                                    : "text-slate-300 bg-slate-50 border border-slate-200"
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare2 size={20} />
                                ) : (
                                  <Square size={20} />
                                )}
                              </button>
                            </div>
                            <div className="hidden lg:flex w-[40px] shrink-0 justify-center">
                              <button
                                onClick={() =>
                                  toggleItemSelection(item.item_id)
                                }
                                className={`transition-all ${isSelected ? "text-blue-500 hover:text-blue-600" : "text-slate-300 hover:text-slate-400"}`}
                              >
                                {isSelected ? (
                                  <CheckSquare2 size={20} strokeWidth={2.5} />
                                ) : (
                                  <Square size={20} strokeWidth={2} />
                                )}
                              </button>
                            </div>
                            <div className="flex-[2.5] min-w-0 w-full lg:w-auto">
                              <div className="flex items-center gap-2 min-w-0">
                                <h5 className="text-[14px] sm:text-[15px] font-bold text-slate-900 truncate">
                                  {item.item_name}
                                </h5>
                                <span
                                  className={`px-1.5 py-0.5 rounded-[4px] text-[8.5px] font-bold uppercase tracking-widest border shrink-0 shadow-sm ${item.item_type === "FINISHED" ? "bg-indigo-50 text-indigo-600 border-indigo-200/80" : "bg-emerald-50 text-emerald-600 border-emerald-200/80"}`}
                                >
                                  {item.item_type}
                                </span>
                              </div>
                              <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 mt-1 lg:hidden truncate">
                                Returned: {item.quantity} {item.uom}
                              </p>
                            </div>
                            <div className="flex flex-row gap-4 w-full lg:hidden min-w-0">
                              <div className="flex-1 min-w-0 relative flex flex-col justify-center">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
                                  Quantity
                                </label>
                                <div className="text-[13px] font-bold text-slate-700 bg-slate-50/50 border border-slate-200/80 rounded-[14px] px-3 py-2 truncate">
                                  {item.quantity}{" "}
                                  <span className="text-[10px] text-slate-400 ml-1">
                                    {item.uom}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 relative flex flex-col justify-center">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">
                                  Rate
                                </label>
                                <div className="relative w-full min-w-0">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400 pointer-events-none">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    value={rates[item.item_id] || ""}
                                    onChange={(e) =>
                                      handleRateChange(
                                        item.item_id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder="0.00"
                                    className={`${BaseInputClass} pl-7 px-4 tabular-nums w-full disabled:opacity-50 disabled:bg-slate-100 ${
                                      isSelected
                                        ? "border-blue-200 focus:border-blue-400"
                                        : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="hidden lg:flex flex-1 min-w-0 flex-col justify-center text-right pr-2">
                              <div className="text-[13px] font-bold text-slate-700 truncate">
                                {item.quantity}{" "}
                                <span className="text-[10px] text-slate-400">
                                  {item.uom}
                                </span>
                              </div>
                            </div>

                            <div className="hidden lg:block flex-1 min-w-0 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400 pointer-events-none">
                                ₹
                              </span>
                              <input
                                type="number"
                                disabled={!isSelected}
                                value={rates[item.item_id] || ""}
                                onChange={(e) =>
                                  handleRateChange(item.item_id, e.target.value)
                                }
                                placeholder="0.00"
                                className={`${BaseInputClass} pl-7 pr-4 text-right tabular-nums w-full disabled:opacity-50 disabled:bg-slate-100 ${
                                  isSelected
                                    ? "border-blue-200 focus:border-blue-400"
                                    : ""
                                }`}
                              />
                            </div>
                            <div className="flex justify-between items-center w-full lg:w-[120px] lg:justify-end mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-slate-100 lg:border-none min-w-0">
                              <span className="lg:hidden text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                Total Value
                              </span>
                              <div
                                className={`text-[15px] sm:text-[16px] font-black tracking-tight tabular-nums lg:pr-2 truncate ${isSelected ? "text-slate-900" : "text-slate-400"}`}
                              >
                                {formatINR(lineTotal)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                      Payout Summary
                    </h4>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                      Adjustments & Final Total
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-4 sm:space-y-5 scrollbar-hide min-w-0">
                <div className="bg-rose-50/50 p-4 rounded-[16px] border border-rose-100/80 flex justify-between items-center group min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-[12px] flex items-center justify-center shrink-0">
                      <MinusCircle size={18} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13px] font-bold text-slate-900 truncate">
                        Unsettled Advances
                      </h4>
                      <p className="text-[10px] font-medium text-slate-500 truncate">
                        Will be deducted
                      </p>
                    </div>
                  </div>
                  <div className="text-[16px] font-black text-rose-600 tabular-nums shrink-0 ml-2">
                    {formatINR(syncedData?.financials?.advances_available)}
                  </div>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-[16px] border border-blue-100/80 flex flex-col justify-center relative overflow-hidden group min-w-0">
                  <div className="flex justify-between items-center z-10 relative">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-[12px] flex items-center justify-center shrink-0">
                        <History size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-900 truncate">
                          Previous Pending
                        </h4>
                        <p className="text-[10px] font-medium text-slate-500 truncate">
                          Unpaid from past
                        </p>
                      </div>
                    </div>
                    <div className="text-[16px] font-black text-blue-600 tabular-nums shrink-0 ml-2">
                      {formatINR(syncedData?.financials?.previous_pending)}
                    </div>
                  </div>
                  {syncedData?.financials?.previous_pending > 0 && (
                    <button
                      onClick={() => setShowClearPendingModal(true)}
                      className="mt-4 w-full h-[40px] bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-[10px] text-[12px] font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-sm z-10 relative"
                    >
                      <Wallet size={14} className="shrink-0" />{" "}
                      <span className="truncate">Settle Out of Band</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex justify-between items-end mb-4 sm:mb-5">
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                    Items Total
                  </span>
                  <span className="text-[28px] sm:text-[32px] font-black text-slate-900 tracking-tight leading-none tabular-nums truncate max-w-[70%] text-right">
                    {formatINR(selectedTotal)}
                  </span>
                </div>
                <button
                  onClick={handleGenerateClick}
                  disabled={
                    unpaidItems.length === 0 || selectedItems.size === 0
                  }
                  className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-slate-800 hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  <Banknote
                    size={18}
                    className={`shrink-0 ${
                      selectedItems.size > 0
                        ? "text-blue-400"
                        : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">Generate Payout Slip</span>{" "}
                  <ArrowRight size={16} className="ml-1 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <AnimatePresence>
        {showSlipModal && (
          <ContractorSlipModal
            person={selectedDetails}
            config={{
              month: targetMonth,
              rates: rates,
              selectedItems: Array.from(selectedItems),
            }}
            onClose={() => setShowSlipModal(false)}
            onSaved={() => {
              fetchSyncedData();
              if (onSettled) onSettled();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearPendingModal && (
          <ClearPendingModal
            person={selectedDetails}
            pendingAmount={syncedData?.financials?.previous_pending || 0}
            onClose={() => setShowClearPendingModal(false)}
            onSaved={() => {
              fetchSyncedData();
              if (onSettled) onSettled();
            }}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>,
    document.body,
  );
};

export default ContractorPayoutPage;
