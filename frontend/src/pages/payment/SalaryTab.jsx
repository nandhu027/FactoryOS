import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Calendar,
  User,
  Loader2,
  Clock,
  UserCheck,
  PartyPopper,
  Banknote,
  MinusCircle,
  History,
  Wallet,
  X,
  CreditCard,
  ArrowRight,
  ServerCrash,
  Calculator,
} from "lucide-react";
import api from "../../api/axios";
import SalarySlipModal from "./SalarySlipModal";
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
    maximumFractionDigits: 2,
  }).format(amount || 0);

const SalaryTab = ({ allPersonnel, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const [targetMonth, setTargetMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [salaryBasis, setSalaryBasis] = useState("MONTHLY");
  const [inputRate, setInputRate] = useState("");
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

  const staffList = allPersonnel.filter((p) => p.personnel_type === "STAFF");
  const selectedStaffDetails = staffList.find(
    (s) => String(s.id) === String(selectedStaffId),
  );

  const fetchSyncedData = useCallback(async () => {
    if (!selectedStaffId || !targetMonth) {
      setSyncedData(null);
      setSyncError(null);
      return;
    }
    setLoadingSync(true);
    setSyncError(null);
    try {
      const [year, month] = targetMonth.split("-");
      const res = await api.get("/payments/generate-salary", {
        params: {
          personnel_id: selectedStaffId,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          base_salary: 0,
          shift_hours: 8,
        },
      });
      setSyncedData(res.data.data);
    } catch (err) {
      console.error("Sync failed", err);
      setSyncError(
        err.response?.data?.message || "Failed to fetch payroll data.",
      );
      setSyncedData(null);
    } finally {
      setLoadingSync(false);
    }
  }, [selectedStaffId, targetMonth]);

  useEffect(() => {
    fetchSyncedData();
  }, [fetchSyncedData]);

  const handleGenerateClick = () => {
    if (!inputRate)
      return alert(
        `Please enter the ${salaryBasis === "DAILY" ? "Daily Wage" : "Monthly Salary"}.`,
      );
    setShowSlipModal(true);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

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
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: smoothEase }}
            className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
                <CreditCard size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
                  Salary Payouts
                </h2>
                <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 flex items-center gap-1.5 truncate">
                  Manage staff payroll & generate slips
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: smoothEase, delay: 0.05 }}
            className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-4"
          >
            <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                    <Calculator
                      size={14}
                      strokeWidth={2.5}
                      className="sm:w-4 sm:h-4"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                      Payroll Config
                    </h4>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                      Target & Base Details
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 scrollbar-hide min-w-0">
                <div className="w-full min-w-0 flex flex-col">
                  <label className={LabelClass}>Target Month</label>
                  <div className="flex items-center w-full h-[44px] px-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border group">
                    <Calendar
                      size={16}
                      strokeWidth={2.5}
                      className="text-slate-400 shrink-0 mr-2.5 group-focus-within:text-blue-500 transition-colors"
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
                  <label className={LabelClass}>Select Staff Member</label>
                  <div className="relative group w-full min-w-0">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center z-10 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                      <User size={16} strokeWidth={2.5} />
                    </div>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className={`${BaseInputClass} pl-11 pr-4 appearance-none w-full truncate`}
                    >
                      <option value="" disabled>
                        -- Choose Worker --
                      </option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} (ID: #{s.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedStaffId && (
                    <motion.div
                      variants={fadeScale}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      className="pt-5 border-t border-slate-100 space-y-5 w-full min-w-0"
                    >
                      <div className="w-full min-w-0 flex flex-col">
                        <label className={LabelClass}>Salary Basis</label>
                        <div className="flex bg-slate-50/60 p-1.5 rounded-[14px] border border-slate-200/80 shadow-sm min-w-0">
                          <button
                            onClick={() => {
                              setSalaryBasis("MONTHLY");
                              setInputRate("");
                            }}
                            className={`flex-1 min-w-0 truncate py-2.5 px-2 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase rounded-[10px] transition-all ${
                              salaryBasis === "MONTHLY"
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/60"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Monthly Fixed
                          </button>
                          <button
                            onClick={() => {
                              setSalaryBasis("DAILY");
                              setInputRate("");
                            }}
                            className={`flex-1 min-w-0 truncate py-2.5 px-2 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase rounded-[10px] transition-all ${
                              salaryBasis === "DAILY"
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/60"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Daily Wage
                          </button>
                        </div>
                      </div>

                      <div className="w-full min-w-0 flex flex-col">
                        <label className={LabelClass}>
                          {salaryBasis === "MONTHLY"
                            ? "Base Monthly Salary"
                            : "Per Day Wage"}
                        </label>
                        <div className="relative w-full min-w-0">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[14px] pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            placeholder={
                              salaryBasis === "MONTHLY"
                                ? "e.g. 15000"
                                : "e.g. 500"
                            }
                            value={inputRate}
                            onChange={(e) => setInputRate(e.target.value)}
                            className={`${BaseInputClass} pl-9 pr-4 text-[15px] tabular-nums w-full`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={handleGenerateClick}
                  disabled={!inputRate || syncedData?.meta?.is_fully_generated}
                  className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-slate-800 hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  <Banknote
                    size={18}
                    className={`shrink-0 ${
                      inputRate && !syncedData?.meta?.is_fully_generated
                        ? "text-blue-400"
                        : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">Generate Payout Slip</span>{" "}
                  <ArrowRight size={16} className="ml-1 shrink-0" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-y-auto scrollbar-hide">
              {!selectedStaffId ? (
                <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col flex-1 items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <User
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400"
                    />
                  </div>
                  <p className="text-[15px] font-bold tracking-tight text-slate-900 mb-1">
                    Select a Staff Member
                  </p>
                  <p className="text-[13px] font-medium text-slate-500 max-w-sm">
                    Choose an employee from the config panel to load their
                    attendance and financial records.
                  </p>
                </div>
              ) : loadingSync ? (
                <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col flex-1 items-center justify-center p-6 text-center">
                  <Loader2
                    size={32}
                    className="animate-spin mb-4 text-blue-500"
                  />
                  <p className="text-[13px] font-bold uppercase tracking-widest text-slate-400">
                    Syncing Factory Logs...
                  </p>
                </div>
              ) : syncError ? (
                <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col flex-1 items-center justify-center p-6 text-center">
                  <ServerCrash
                    size={32}
                    strokeWidth={1.5}
                    className="text-rose-400 mb-3"
                  />
                  <p className="text-[14px] font-bold text-rose-600">
                    {syncError}
                  </p>
                </div>
              ) : syncedData ? (
                <motion.div
                  variants={fadeScale}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-4 min-w-0"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-rose-50/50 rounded-[20px] p-4 sm:p-5 border border-rose-100/80 shadow-sm flex justify-between items-center group min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-[12px] flex items-center justify-center shrink-0">
                          <MinusCircle size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[13px] font-bold text-slate-900 truncate">
                            Unsettled Advances
                          </h4>
                          <p className="text-[10px] font-medium text-slate-500 truncate">
                            Deducted from next slip
                          </p>
                        </div>
                      </div>
                      <div className="text-[16px] font-black text-rose-600 tabular-nums shrink-0 ml-2">
                        {formatINR(syncedData.financials?.advances_available)}
                      </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-[20px] p-4 sm:p-5 border border-blue-100/80 shadow-sm flex flex-col justify-center relative overflow-hidden group min-w-0">
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
                              Partial payment dues
                            </p>
                          </div>
                        </div>
                        <div className="text-[16px] font-black text-blue-600 tabular-nums shrink-0 ml-2">
                          {formatINR(syncedData.financials?.previous_pending)}
                        </div>
                      </div>
                      {syncedData.financials?.previous_pending > 0 && (
                        <button
                          onClick={() => setShowClearPendingModal(true)}
                          className="mt-4 w-full h-[40px] bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-[10px] text-[12px] font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-sm z-10 relative"
                        >
                          <Wallet size={14} className="text-slate-500" /> Settle
                          Dues Now
                        </button>
                      )}
                    </div>
                  </div>
                  {!syncedData.meta?.previous_settlement_end &&
                    !syncedData.meta?.is_fully_generated && (
                      <div className="bg-white border border-slate-200/80 rounded-[20px] p-5 flex items-start gap-4 shadow-sm min-w-0">
                        <div className="mt-0.5 shrink-0">
                          <UserCheck size={20} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-slate-900 tracking-tight truncate">
                            Data Synced (Till{" "}
                            {new Date(
                              syncedData.period.end_date,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                            )
                          </p>
                          <p className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">
                            Calculated from{" "}
                            <strong className="font-bold text-slate-700">
                              {new Date(
                                syncedData.period.start_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </strong>{" "}
                            to{" "}
                            <strong className="font-bold text-slate-700">
                              {new Date(
                                syncedData.period.end_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </strong>{" "}
                            based strictly on logs.
                          </p>
                        </div>
                      </div>
                    )}

                  {syncedData.meta?.previous_settlement_end &&
                    !syncedData.meta?.is_fully_generated && (
                      <div className="bg-white border border-slate-200/80 rounded-[20px] p-5 flex items-start gap-4 shadow-sm min-w-0">
                        <div className="mt-0.5 shrink-0">
                          <Clock size={20} className="text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-slate-900 tracking-tight truncate">
                            Continuing Mid-Month Generation
                          </p>
                          <p className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">
                            Salary was already generated up to{" "}
                            <strong className="font-bold text-slate-700">
                              {new Date(
                                syncedData.meta.previous_settlement_end,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </strong>
                            . Now generating for the remaining period:{" "}
                            <strong className="font-bold text-slate-700">
                              {new Date(
                                syncedData.period.start_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </strong>{" "}
                            to{" "}
                            <strong className="font-bold text-slate-700">
                              {new Date(
                                syncedData.period.end_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </strong>
                            .
                          </p>
                        </div>
                      </div>
                    )}

                  {syncedData.meta?.is_fully_generated && (
                    <div className="bg-white border border-slate-200/80 rounded-[20px] p-5 flex items-start gap-4 shadow-sm min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <PartyPopper size={20} className="text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-slate-900 tracking-tight truncate">
                          Fully Settled & Billed
                        </p>
                        <p className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">
                          All possible working days up to{" "}
                          <strong className="font-bold text-slate-700">
                            {new Date(
                              syncedData.period.end_date,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </strong>{" "}
                          have already been generated and billed to the ledger.
                        </p>
                      </div>
                    </div>
                  )}
                  <div
                    className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${
                      syncedData.meta?.is_fully_generated
                        ? "opacity-60 grayscale pointer-events-none"
                        : ""
                    }`}
                  >
                    <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center min-w-0">
                      <span className="text-[28px] font-black text-emerald-500 tabular-nums">
                        {syncedData.attendance_summary.present}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate w-full">
                        Full Days
                      </span>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center min-w-0">
                      <span className="text-[28px] font-black text-amber-500 tabular-nums">
                        {syncedData.attendance_summary.half_days}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate w-full">
                        Half Days
                      </span>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center min-w-0">
                      <span className="text-[28px] font-black text-rose-500 tabular-nums">
                        {syncedData.attendance_summary.absent}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate w-full">
                        Absent
                      </span>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center min-w-0">
                      <span className="text-[28px] font-black text-purple-500 tabular-nums">
                        {syncedData.attendance_summary.holidays}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate w-full">
                        Holidays
                      </span>
                    </div>
                  </div>
                  <div
                    className={`bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 ${
                      syncedData.meta?.is_fully_generated
                        ? "opacity-60 grayscale pointer-events-none"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4 min-w-0">
                      <Clock
                        size={16}
                        className="text-indigo-500 shrink-0"
                        strokeWidth={2.5}
                      />
                      <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-widest truncate">
                        Overtime Logs
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-[16px] border border-slate-100 min-w-0">
                        <span className="text-[13px] font-bold text-slate-600 truncate">
                          Halfday OTs
                        </span>
                        <span className="text-[14px] sm:text-[15px] font-black text-indigo-600 tabular-nums shrink-0 ml-2">
                          {syncedData.attendance_summary.halfday_ots} Shift(s)
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-[16px] border border-slate-100 min-w-0">
                        <span className="text-[13px] font-bold text-slate-600 truncate">
                          Hourly OTs
                        </span>
                        <span className="text-[14px] sm:text-[15px] font-black text-blue-600 tabular-nums shrink-0 ml-2">
                          {syncedData.attendance_summary.hourly_ots} Hour(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          </motion.div>
          <AnimatePresence>
            {showSlipModal && (
              <SalarySlipModal
                person={selectedStaffDetails}
                config={{
                  month: targetMonth,
                  salaryBasis: salaryBasis,
                  inputRate: inputRate,
                  baseSalary:
                    salaryBasis === "DAILY"
                      ? Number(inputRate) * 30
                      : Number(inputRate),
                }}
                onClose={() => setShowSlipModal(false)}
                onSaved={() => {
                  fetchSyncedData();
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showClearPendingModal && (
              <ClearPendingModal
                person={selectedStaffDetails}
                pendingAmount={syncedData?.financials?.previous_pending || 0}
                onClose={() => setShowClearPendingModal(false)}
                onSaved={() => {
                  fetchSyncedData();
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SalaryTab;
