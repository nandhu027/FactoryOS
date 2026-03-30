import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Loader2,
  Building2,
  Receipt,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const formatINR = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
};

const getTypeConfig = (type) => {
  switch (type) {
    case "PURCHASE":
      return { label: "Purchase", style: "bg-sky-50 text-sky-600" };
    case "SALE":
      return { label: "Sale", style: "bg-indigo-50 text-indigo-600" };
    case "JOB_WORK":
      return { label: "Job Work", style: "bg-amber-50 text-amber-600" };
    default:
      return { label: type, style: "bg-slate-50 text-slate-600" };
  }
};

const PartyDetailModal = ({ partyId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("FINANCIALS");

  useEffect(() => {
    const fetchPartyDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/parties/${partyId}`);
        setData(res.data.data);
      } catch (err) {
        console.error("Failed to load party profile");
      } finally {
        setLoading(false);
      }
    };
    if (partyId) fetchPartyDetails();
  }, [partyId]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  const unifiedTransactions = data
    ? [
        ...(data.sales_history || [])
          .filter(
            (i) =>
              i.invoice_value > 0 && i.invoice_value > (i.amount_paid || 0),
          )
          .map((i) => ({
            ...i,
            tx_type: "SALE",
            _date: i.dispatch_date,
            _no: i.dispatch_no,
            _value: i.invoice_value,
          })),
        ...(data.purchase_history || [])
          .filter(
            (i) => i.inward_value > 0 && i.inward_value > (i.amount_paid || 0),
          )
          .map((i) => ({
            ...i,
            tx_type: "PURCHASE",
            _date: i.inward_date,
            _no: i.inward_no,
            _value: i.inward_value,
          })),
      ].sort((a, b) => new Date(b._date) - new Date(a._date))
    : [];
  const logisticsData = data
    ? [
        ...(data.monthly_logistics?.inwards || []).map((i) => ({
          ...i,
          log_type: "INWARD",
          date: i.inward_date,
          ref: i.inward_no,
        })),
        ...(data.monthly_logistics?.productions || [])
          .filter((p) => p.status !== "COMPLETED")
          .map((p) => ({
            ...p,
            log_type: "PROD",
            date: p.production_date,
            ref: p.batch_no,
          })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];
  const recentPayments = data?.payment_ledger
    ? data.payment_ledger.slice(0, 15)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="min-h-[64px] px-3 sm:px-6 py-3 sm:py-0 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-20 gap-3 sm:gap-4 overflow-x-hidden"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-8 sm:pr-0">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 border border-slate-700/50 shadow-sm flex items-center justify-center text-white shrink-0">
            <Building2 size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500 font-mono bg-slate-100/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0">
                ID: {partyId}
              </span>
              {data?.types?.map((type) => {
                const config = getTypeConfig(type);
                return (
                  <span
                    key={type}
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 ${config.style}`}
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {data ? data.party_name : "Loading Profile..."}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 w-full sm:w-auto">
          {data && (
            <div className="flex items-center p-1 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[8px] sm:rounded-full w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("FINANCIALS")}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-[6px] sm:rounded-full text-[10px] sm:text-[12px] font-bold transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-normal sm:whitespace-nowrap leading-tight text-center ${
                  activeTab === "FINANCIALS"
                    ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                    : "text-slate-500 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Receipt size={14} strokeWidth={2} className="shrink-0" />{" "}
                Financials
              </button>
              <button
                onClick={() => setActiveTab("OPERATIONS")}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-[6px] sm:rounded-full text-[10px] sm:text-[12px] font-bold transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-normal sm:whitespace-nowrap leading-tight text-center ${
                  activeTab === "OPERATIONS"
                    ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                    : "text-slate-500 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Truck size={14} strokeWidth={2} className="shrink-0" />{" "}
                Operations
              </button>
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
        {loading && !data ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
              <Loader2
                size={24}
                className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                strokeWidth={1.5}
              />
            </div>
          </div>
        ) : (
          data && (
            <AnimatePresence mode="wait">
              {activeTab === "FINANCIALS" && (
                <motion.div
                  key="financials"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
                    <div className="flex flex-col p-3 sm:p-5">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 sm:mb-3">
                        <ArrowDownRight
                          size={14}
                          className="text-emerald-500"
                        />
                        Receivables (Debtors)
                      </h3>
                      <div className="flex items-end justify-between gap-2 sm:gap-4">
                        <div className="flex-1">
                          <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Sales Billed
                          </p>
                          <p className="text-[12px] sm:text-[14px] font-bold text-slate-800 tabular-nums leading-none">
                            {formatINR(
                              data.financial_summary?.sales?.lifetime_billed,
                            )}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Amount Paid
                          </p>
                          <p className="text-[12px] sm:text-[14px] font-bold text-emerald-600 tabular-nums leading-none">
                            {formatINR(
                              data.financial_summary?.sales?.total_received,
                            )}
                          </p>
                        </div>
                        <div className="flex-1 pl-2 sm:pl-4 border-l border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Pending Balance
                          </p>
                          <p
                            className={`text-[15px] sm:text-[18px] font-black tabular-nums tracking-tight leading-none ${data.financial_summary?.sales?.balance_due > 0 ? "text-rose-600" : "text-slate-900"}`}
                          >
                            {formatINR(
                              data.financial_summary?.sales?.balance_due,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col p-3 sm:p-5">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 sm:mb-3">
                        <ArrowUpRight size={14} className="text-rose-500" />
                        Payables (Creditors)
                      </h3>
                      <div className="flex items-end justify-between gap-2 sm:gap-4">
                        <div className="flex-1">
                          <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Purchased
                          </p>
                          <p className="text-[12px] sm:text-[14px] font-bold text-slate-800 tabular-nums leading-none">
                            {formatINR(
                              data.financial_summary?.purchases
                                ?.lifetime_purchased,
                            )}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            We Paid
                          </p>
                          <p className="text-[12px] sm:text-[14px] font-bold text-rose-600 tabular-nums leading-none">
                            {formatINR(
                              data.financial_summary?.purchases?.total_paid,
                            )}
                          </p>
                        </div>
                        <div className="flex-1 pl-2 sm:pl-4 border-l border-slate-100">
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Pending Balance
                          </p>
                          <p
                            className={`text-[15px] sm:text-[18px] font-black tabular-nums tracking-tight leading-none ${data.financial_summary?.purchases?.balance_due > 0 ? "text-amber-600" : "text-slate-900"}`}
                          >
                            {formatINR(
                              data.financial_summary?.purchases?.balance_due,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 sm:min-h-0 bg-white sm:overflow-hidden">
                    <div className="flex flex-col min-h-0 border-r border-slate-100">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                        <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Receipt size={14} className="text-blue-500" /> Active
                          Bills
                        </h4>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm leading-none">
                          {unifiedTransactions.length} PENDING
                        </span>
                      </div>
                      <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {unifiedTransactions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-12 m-4">
                            <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                              <Receipt
                                size={24}
                                strokeWidth={1.5}
                                className="text-slate-400"
                              />
                            </div>
                            <p className="text-[15px] font-bold tracking-tight text-slate-900">
                              All Cleared Up!
                            </p>
                            <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                              No pending bills for this party.
                            </p>
                          </div>
                        ) : (
                          <>
                            <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  <th className="px-5 py-3 font-bold align-middle">
                                    Date
                                  </th>
                                  <th className="px-4 py-3 font-bold align-middle">
                                    Vch Type
                                  </th>
                                  <th className="px-4 py-3 font-bold align-middle">
                                    Ref No.
                                  </th>
                                  <th className="px-5 py-3 text-right font-bold align-middle">
                                    Amount
                                  </th>
                                  <th className="px-5 py-3 text-right font-bold align-middle">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {unifiedTransactions.map((tx, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group align-middle"
                                  >
                                    <td className="px-5 py-3 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                                      {formatDate(tx._date)}
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${tx.tx_type === "SALE" ? "bg-indigo-50 text-indigo-600" : "bg-sky-50 text-sky-600"}`}
                                      >
                                        {tx.tx_type === "SALE"
                                          ? "Sales"
                                          : "Purchase"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-500 font-mono align-middle">
                                      {tx._no}
                                    </td>
                                    <td className="px-5 py-3 text-right text-[13px] font-bold text-slate-900 tabular-nums tracking-tight align-middle">
                                      {formatINR(tx._value)}
                                    </td>
                                    <td className="px-5 py-3 text-right align-middle">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${tx.payment_status === "PAID" ? "bg-emerald-50 text-emerald-600" : tx.payment_status === "PARTIAL" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
                                      >
                                        {tx.payment_status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                              {unifiedTransactions.map((tx, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-slate-700 font-mono">
                                      {tx._no}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      {formatDate(tx._date)}
                                    </span>
                                  </div>
                                  <div className="flex items-end justify-between">
                                    <div className="flex flex-col gap-1.5 items-start">
                                      <span
                                        className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${tx.tx_type === "SALE" ? "bg-indigo-50 text-indigo-600" : "bg-sky-50 text-sky-600"}`}
                                      >
                                        {tx.tx_type === "SALE"
                                          ? "Sales"
                                          : "Purchase"}
                                      </span>
                                      <span
                                        className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${tx.payment_status === "PAID" ? "bg-emerald-50 text-emerald-600" : tx.payment_status === "PARTIAL" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
                                      >
                                        {tx.payment_status}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Total Value
                                      </span>
                                      <span className="text-[15px] font-black text-slate-900 tabular-nums tracking-tight">
                                        {formatINR(tx._value)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col min-h-0">
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                        <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <CreditCard size={14} className="text-emerald-500" />{" "}
                          Recent Payments
                        </h4>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm leading-none">
                          {recentPayments.length} ENTRIES
                        </span>
                      </div>
                      <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {recentPayments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-12 m-4">
                            <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                              <CreditCard
                                size={24}
                                strokeWidth={1.5}
                                className="text-slate-400"
                              />
                            </div>
                            <p className="text-[15px] font-bold tracking-tight text-slate-900">
                              No Recent Payments
                            </p>
                            <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                              No recent payment activity recorded.
                            </p>
                          </div>
                        ) : (
                          <>
                            <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                              <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  <th className="px-5 py-3 font-bold align-middle">
                                    Date
                                  </th>
                                  <th className="px-4 py-3 font-bold align-middle">
                                    Mode
                                  </th>
                                  <th className="px-4 py-3 font-bold align-middle">
                                    Against Bill
                                  </th>
                                  <th className="px-5 py-3 text-right font-bold align-middle">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {recentPayments.map((p, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group align-middle"
                                  >
                                    <td className="px-5 py-3 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                                      {formatDate(p.payment_date)}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider align-middle">
                                      {p.payment_mode}
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-500 font-mono align-middle">
                                      {p.invoice_no}
                                    </td>
                                    <td className="px-5 py-3 text-right align-middle">
                                      <span
                                        className={`text-[13px] font-black tabular-nums tracking-tight ${p.direction === "INFLOW" ? "text-emerald-600" : "text-slate-900"}`}
                                      >
                                        {p.direction === "INFLOW" ? "+" : "-"}
                                        {formatINR(p.amount)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                              {recentPayments.map((p, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-slate-700 font-mono">
                                      Ref: {p.invoice_no}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      {formatDate(p.payment_date)}
                                    </span>
                                  </div>
                                  <div className="flex items-end justify-between mt-1">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                      {p.payment_mode}
                                    </span>
                                    <span
                                      className={`text-[15px] font-black tabular-nums tracking-tight ${p.direction === "INFLOW" ? "text-emerald-600" : "text-slate-900"}`}
                                    >
                                      {p.direction === "INFLOW" ? "+" : "-"}
                                      {formatINR(p.amount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === "OPERATIONS" && (
                <motion.div
                  key="operations"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full w-full bg-white overflow-y-auto sm:overflow-hidden"
                >
                  {data.types.includes("JOB_WORK") && data.stock_snapshot && (
                    <div className="flex flex-col sm:flex-row border-b border-slate-200/80 bg-white shrink-0">
                      <div className="bg-slate-50/80 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-slate-200/80">
                        <Box size={16} className="text-indigo-600" />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                          Customer Stock Bal.
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-3 divide-x divide-slate-100">
                        <div className="px-3 sm:px-5 py-3 flex flex-col justify-center hover:bg-slate-50/50 transition-colors">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Raw Material
                          </span>
                          <span className="font-black text-[15px] sm:text-[18px] text-slate-900 tabular-nums leading-none">
                            {parseFloat(
                              data.stock_snapshot.raw_qty || 0,
                            ).toLocaleString()}{" "}
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">
                              KG
                            </span>
                          </span>
                        </div>
                        <div className="px-3 sm:px-5 py-3 flex flex-col justify-center hover:bg-slate-50/50 transition-colors">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            WIP
                          </span>
                          <span className="font-black text-[15px] sm:text-[18px] text-amber-600 tabular-nums leading-none">
                            {parseFloat(
                              data.stock_snapshot.semi_finished_qty || 0,
                            ).toLocaleString()}{" "}
                            <span className="text-[9px] sm:text-[10px] font-bold text-amber-600/50">
                              KG
                            </span>
                          </span>
                        </div>
                        <div className="px-3 sm:px-5 py-3 flex flex-col justify-center hover:bg-slate-50/50 transition-colors">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            Finished
                          </span>
                          <span className="font-black text-[15px] sm:text-[18px] text-emerald-600 tabular-nums leading-none">
                            {parseFloat(
                              data.stock_snapshot.finished_qty || 0,
                            ).toLocaleString()}{" "}
                            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600/50">
                              KG
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col flex-1 sm:min-h-0">
                    <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                      <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Truck size={14} className="text-blue-500" /> Active
                        Operations
                      </h4>
                    </div>
                    <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {logisticsData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-12 m-4">
                          <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                            <Truck
                              size={24}
                              strokeWidth={1.5}
                              className="text-slate-400"
                            />
                          </div>
                          <p className="text-[15px] font-bold tracking-tight text-slate-900">
                            No Active Operations
                          </p>
                          <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                            There are no WIP batches or recent shipments.
                          </p>
                        </div>
                      ) : (
                        <>
                          <table className="hidden md:table w-full text-left whitespace-nowrap border-collapse">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#e2e8f0] z-10">
                              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                <th className="px-5 py-3 font-bold w-[120px] align-middle">
                                  Date
                                </th>
                                <th className="px-4 py-3 font-bold w-[160px] align-middle">
                                  Type
                                </th>
                                <th className="px-4 py-3 font-bold w-[140px] align-middle">
                                  Ref No.
                                </th>
                                <th className="px-4 py-3 font-bold w-[120px] align-middle">
                                  Status
                                </th>
                                <th className="px-5 py-3 font-bold align-middle">
                                  Item Details
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {logisticsData.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group align-middle"
                                >
                                  <td className="px-5 py-4 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                                    {formatDate(item.date)}
                                  </td>
                                  <td className="px-4 py-4 align-middle">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${item.log_type === "INWARD" ? "bg-sky-50 text-sky-600" : "bg-purple-50 text-purple-600"}`}
                                    >
                                      {item.log_type === "INWARD"
                                        ? item.business_model === "JOB_WORK"
                                          ? "Customer Material"
                                          : "Purchase Inward"
                                        : "Production Batch"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-[11px] font-bold text-slate-500 font-mono align-middle">
                                    {item.ref}
                                  </td>
                                  <td className="px-4 py-4 align-middle">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${item.log_type === "INWARD" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-600"}`}
                                    >
                                      {item.status || "RECEIVED"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 align-middle">
                                    {item.items && item.items.length > 0 ? (
                                      <div className="flex flex-col gap-1.5 max-w-[400px]">
                                        {item.items.map((sub, i) => (
                                          <div
                                            key={i}
                                            className="flex justify-between items-center bg-slate-50/80 border border-slate-100 px-2.5 py-1.5 rounded-[8px]"
                                          >
                                            <span className="text-[11px] font-bold text-slate-700 truncate mr-3">
                                              {sub.item}{" "}
                                              {sub.batch && (
                                                <span className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">
                                                  (B: {sub.batch})
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-[12px] font-black text-slate-900 tabular-nums shrink-0">
                                              {sub.qty}{" "}
                                              <span className="text-[9px] font-bold text-slate-400">
                                                {sub.uom}
                                              </span>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 font-medium">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                            {logisticsData.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[12px] font-bold text-slate-700 font-mono">
                                      {item.ref}
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      {formatDate(item.date)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${item.log_type === "INWARD" ? "bg-sky-50 text-sky-600" : "bg-purple-50 text-purple-600"}`}
                                    >
                                      {item.log_type === "INWARD"
                                        ? item.business_model === "JOB_WORK"
                                          ? "Customer Mat"
                                          : "Purch. Inward"
                                        : "Prod. Batch"}
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${item.log_type === "INWARD" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-600"}`}
                                    >
                                      {item.status || "RECEIVED"}
                                    </span>
                                  </div>
                                </div>

                                {item.items && item.items.length > 0 && (
                                  <div className="bg-slate-50/80 rounded-[8px] border border-slate-100 p-2 flex flex-col gap-1.5 mt-1">
                                    {item.items.map((sub, i) => (
                                      <div
                                        key={i}
                                        className="flex justify-between items-center"
                                      >
                                        <span className="text-[11px] font-bold text-slate-700 truncate mr-3">
                                          {sub.item}{" "}
                                          {sub.batch && (
                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest ml-1">
                                              (B: {sub.batch})
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-[12px] font-black text-slate-900 tabular-nums shrink-0">
                                          {sub.qty}{" "}
                                          <span className="text-[9px] font-bold text-slate-400">
                                            {sub.uom}
                                          </span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )
        )}
      </div>
    </div>,
    document.body,
  );
};

export default PartyDetailModal;
