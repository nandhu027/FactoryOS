import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Printer,
  Receipt,
  AlertCircle,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

const InputClass =
  "w-full px-4 bg-slate-50/50 border border-slate-200/80 rounded-[12px] text-[20px] font-black text-slate-900 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]";

const fadeScale = {
  hidden: { opacity: 0, scale: 0.97, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const numberToWords = (amount) => {
  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return "ZERO ONLY";
  const a = [
    "",
    "ONE ",
    "TWO ",
    "THREE ",
    "FOUR ",
    "FIVE ",
    "SIX ",
    "SEVEN ",
    "EIGHT ",
    "NINE ",
    "TEN ",
    "ELEVEN ",
    "TWELVE ",
    "THIRTEEN ",
    "FOURTEEN ",
    "FIFTEEN ",
    "SIXTEEN ",
    "SEVENTEEN ",
    "EIGHTEEN ",
    "NINETEEN ",
  ];
  const b = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];
  if (num.toString().length > 9) return "OVERFLOW";
  let n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = "";
  str +=
    n[1] != 0
      ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "CRORE "
      : "";
  str +=
    n[2] != 0
      ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "LAKH "
      : "";
  str +=
    n[3] != 0
      ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "THOUSAND "
      : "";
  str +=
    n[4] != 0
      ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "HUNDRED "
      : "";
  str +=
    n[5] != 0
      ? (str != "" ? "AND " : "") +
        (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
      : "";
  return ("INDIAN RUPEES " + str.trim() + " ONLY").toUpperCase();
};

const SalarySlipModal = ({ person, config, onClose, onSaved }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [amountPayingNow, setAmountPayingNow] = useState("");
  const [mobileTab, setMobileTab] = useState("INVOICE");

  const [cYear, cMonth] = config.month.split("-");
  const displayMonthYear = new Date(cYear, cMonth - 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const slipDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const params = {
          personnel_id: person.id,
          month: parseInt(cMonth, 10),
          year: parseInt(cYear, 10),
          base_salary: parseFloat(config.baseSalary),
          shift_hours: 8,
        };
        const res = await api.get("/payments/generate-salary", { params });
        setData(res.data.data);
        const netOwed = res.data.data.financials.raw_net_balance;
        setAmountPayingNow(netOwed > 0 ? netOwed.toString() : "0");
      } catch (error) {
        toast.error("Failed to calculate.");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, [person, config, cMonth, cYear, onClose]);

  const handleSettle = async () => {
    if (!data) return;
    const payAmount = Number(amountPayingNow);
    if (payAmount < 0) return toast.error("Payment cannot be negative");
    if (
      !window.confirm(
        `Record payment of ₹${payAmount} and finalize payslip for ${person.full_name}?`,
      )
    )
      return;

    setSettling(true);
    try {
      const fStart = new Date(data.period.start_date).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "short" },
      );
      const fEnd = new Date(data.period.end_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const att = data.attendance_summary;
      const attSummary = `${att.present} Full, ${att.half_days} Half, ${att.absent} Absent, ${att.holidays} Holiday`;
      const reasonStr = `Salary Settlement: ${fStart} to ${fEnd} (Base: ${config.salaryBasis}) | BILL:${data.financials.gross_salary} | PERIOD:${data.period.start_date},${data.period.end_date} | ATT:${attSummary}`;

      await api.post("/payments", {
        payment_date: new Date().toISOString().split("T")[0],
        personnel_id: person.id,
        amount: payAmount,
        reason: reasonStr,
      });
      toast.success("Salary & Ledger recorded successfully!");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to record settlement",
      );
    } finally {
      setSettling(false);
    }
  };

  const getBreakdown = () => {
    if (!data) return null;
    const att = data.attendance_summary;
    const rates = data.wage_rates;
    const regularDays = att.present + att.holidays + att.half_days * 0.5;
    const regularPay = regularDays * rates.daily_wage;
    const hdOtRate = rates.daily_wage / 2;
    const hdOtPay = att.halfday_ots * hdOtRate;
    const hrOtPay = att.hourly_ots * rates.hourly_wage;
    return { regularDays, regularPay, hdOtRate, hdOtPay, hrOtPay };
  };

  const breakdown = getBreakdown();
  const currentSlipGross = data ? Number(data.financials.gross_salary) : 0;
  const prevPending = data ? Number(data.financials.previous_pending) : 0;
  const ledgerAdvances = data ? Number(data.financials.advances_available) : 0;
  const rawNetPayable = data ? Number(data.financials.net_payable) : 0;

  const currentInputAmount = Number(amountPayingNow || 0);
  const projectedBalance = data
    ? data.financials.raw_net_balance - currentInputAmount
    : 0;
  const isProjectedAdvance = projectedBalance < 0;
  const displayProjectedBalance = Math.abs(projectedBalance);

  return createPortal(
    <>
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            html, body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
            body > *:not(#print-portal-container) { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #print-portal-container { display: block !important; width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
            .print-slip { width: 100% !important; max-width: none !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: 2px solid black !important; border-radius: 0 !important; }
            .avoid-break { page-break-inside: avoid; }
          }
        `}
      </style>

      <AnimatePresence>
        <div
          key="portal-container"
          id="print-portal-container"
          className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 print:static print:p-0 print:bg-white selection:bg-blue-500 selection:text-white"
        >
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
            onClick={onClose}
          />

          <motion.div
            key="modal-content"
            variants={fadeScale}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative bg-slate-50 w-full max-w-[1200px] rounded-[24px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[95vh] lg:max-h-[90vh] z-10 print:static print:h-auto print:max-h-none print:shadow-none print:w-full print:max-w-full print:block print:rounded-none print:mx-auto overflow-hidden border border-white/20 print:border-none"
          >
            {/* Modal Header */}
            <div className="h-[64px] sm:h-[70px] px-5 sm:px-6 bg-white border-b border-slate-200/80 flex justify-between items-center shrink-0 z-20 print:hidden shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-[10px] bg-slate-900 shadow-sm flex items-center justify-center text-white shrink-0">
                  <Receipt size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2 py-0.5 rounded-[6px] bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-widest border border-blue-200/80">
                      Payslip generation
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                      ID: {person.id}
                    </span>
                  </div>
                  <h2 className="text-[16px] sm:text-[18px] font-black text-slate-900 tracking-tight leading-none truncate">
                    {person.full_name}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading || settling}
                className="p-2 bg-slate-50 border border-slate-200/80 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-full transition-all shadow-sm active:scale-95 shrink-0"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="lg:hidden flex border-b border-slate-200/80 shrink-0 bg-white px-2 print:hidden z-10">
              <button
                onClick={() => setMobileTab("INVOICE")}
                className={`flex-1 py-3 text-[12px] font-bold tracking-wide transition-all border-b-[2.5px] ${mobileTab === "INVOICE" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}
              >
                Slip Preview
              </button>
              <button
                onClick={() => setMobileTab("PAYMENTS")}
                className={`flex-1 py-3 text-[12px] font-bold tracking-wide transition-all border-b-[2.5px] ${mobileTab === "PAYMENTS" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}
              >
                Settlement
              </button>
            </div>
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden print:overflow-visible print:block bg-slate-100/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center w-full py-24 sm:py-32 text-slate-400 print:hidden h-full">
                  <Loader2
                    size={36}
                    className="animate-spin mb-4 text-blue-500"
                  />
                  <span className="text-[12px] font-bold uppercase tracking-widest text-slate-500">
                    Compiling Financials...
                  </span>
                </div>
              ) : data && breakdown ? (
                <>
                  <div
                    className={`flex-1 p-4 sm:p-6 lg:p-6 lg:flex lg:items-center lg:justify-center print:p-0 print:block ${mobileTab === "INVOICE" ? "block" : "hidden lg:flex"}`}
                  >
                    <div className="print-slip w-full max-w-[800px] mx-auto bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 shrink-0 flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-full print:rounded-none">
                      <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start border-b-[1.5px] border-slate-900 print:border-black p-5 sm:p-6 bg-white shrink-0 gap-4 sm:gap-0">
                        <div className="flex flex-col">
                          <h1 className="text-[20px] sm:text-[22px] font-black uppercase tracking-tight text-slate-900 print:text-black leading-none mb-1">
                            Maa Arbuda Metals
                          </h1>
                          <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest print:text-slate-600">
                            Manufacturer & Exporter of Stainless Steel
                          </p>
                          <div className="mt-3 text-[9px] sm:text-[10px] font-medium text-slate-600 print:text-slate-800 leading-snug">
                            <p>Shed No.389, Gopal Charan Industrial Estate</p>
                            <p>
                              Revenue Block No. 113, Pavan Industrial Daskrol
                            </p>
                            <p>Bakrol Bujrang, Ahmedabad, Gujarat - 382430</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end print:items-end text-left sm:text-right print:text-right">
                          <h2 className="text-[20px] sm:text-[24px] font-black text-slate-300 print:text-slate-400 uppercase tracking-widest leading-none">
                            Salary Slip
                          </h2>
                          <div className="mt-2 bg-slate-50 border border-slate-200 print:bg-white print:border-slate-400 px-3 py-1.5 rounded-[6px] print:rounded-none">
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest print:text-black">
                              {displayMonthYear}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 border-b-[1.5px] border-slate-900 print:border-black shrink-0 bg-slate-50/50 print:bg-white">
                        <div className="md:col-span-5 print:col-span-5 p-4 border-b-[1.5px] md:border-b-0 print:border-b-0 md:border-r-[1.5px] print:border-r-[1.5px] border-slate-900 print:border-black flex flex-col justify-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-500">
                            Employee Details
                          </p>
                          <p className="font-bold text-[13px] sm:text-[14px] text-slate-900 print:text-black truncate">
                            {person.full_name}{" "}
                            <span className="font-medium text-slate-500 text-[11px] ml-1">
                              (ID: #{person.id})
                            </span>
                          </p>
                        </div>
                        <div className="md:col-span-4 print:col-span-4 p-4 border-b-[1.5px] md:border-b-0 print:border-b-0 md:border-r-[1.5px] print:border-r-[1.5px] border-slate-900 print:border-black flex flex-col justify-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-500">
                            Contract Information
                          </p>
                          <p className="font-bold text-[12px] sm:text-[13px] text-slate-900 print:text-black uppercase">
                            {config.salaryBasis === "MONTHLY"
                              ? "Monthly Fixed"
                              : "Daily Wage"}
                            <span className="text-slate-500 ml-1.5 font-semibold text-[11px]">
                              ({formatINR(config.inputRate)}
                              {config.salaryBasis === "MONTHLY"
                                ? "/mo"
                                : "/day"}
                              )
                            </span>
                          </p>
                        </div>
                        <div className="md:col-span-3 print:col-span-3 p-4 flex flex-col justify-center">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:text-slate-500">
                            Slip Date
                          </p>
                          <p className="font-bold text-[12px] sm:text-[13px] text-slate-900 print:text-black">
                            {slipDate}
                          </p>
                        </div>
                      </div>
                      <div className="w-full overflow-x-auto print:overflow-visible shrink-0 bg-white">
                        <table className="w-full min-w-[550px] text-left border-collapse border-b-[1.5px] border-slate-900 print:border-black">
                          <thead className="bg-slate-100/80 print:bg-transparent">
                            <tr>
                              <th className="py-2.5 px-4 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[45%] font-black text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                                Earnings Description
                              </th>
                              <th className="py-2.5 px-3 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[15%] text-center font-black text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                                Units
                              </th>
                              <th className="py-2.5 px-3 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[20%] text-right font-black text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                                Rate (₹)
                              </th>
                              <th className="py-2.5 px-4 border-b-[1.5px] border-slate-900 print:border-black w-[20%] text-right font-black text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                                Amount (₹)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="font-semibold text-[12px] text-slate-900 even:bg-slate-50/50 print:even:bg-transparent transition-colors">
                              <td className="py-2.5 px-4 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black leading-snug">
                                Regular Work Days
                              </td>
                              <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-center tabular-nums">
                                {breakdown.regularDays}{" "}
                                <span className="text-[9px] text-slate-500 ml-0.5">
                                  days
                                </span>
                              </td>
                              <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-right tabular-nums text-slate-600">
                                {Number(
                                  data.wage_rates.daily_wage,
                                ).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black text-right tabular-nums font-bold">
                                {Number(breakdown.regularPay).toLocaleString(
                                  "en-IN",
                                  { minimumFractionDigits: 2 },
                                )}
                              </td>
                            </tr>

                            {data.attendance_summary.halfday_ots > 0 && (
                              <tr className="font-semibold text-[12px] text-slate-900 even:bg-slate-50/50 print:even:bg-transparent transition-colors">
                                <td className="py-2.5 px-4 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black leading-snug">
                                  Halfday Overtime
                                </td>
                                <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-center tabular-nums">
                                  {data.attendance_summary.halfday_ots}{" "}
                                  <span className="text-[9px] text-slate-500 ml-0.5">
                                    shifts
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-right tabular-nums text-slate-600">
                                  {Number(breakdown.hdOtRate).toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                                <td className="py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black text-right tabular-nums font-bold">
                                  {Number(breakdown.hdOtPay).toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                              </tr>
                            )}

                            {data.attendance_summary.hourly_ots > 0 && (
                              <tr className="font-semibold text-[12px] text-slate-900 even:bg-slate-50/50 print:even:bg-transparent transition-colors">
                                <td className="py-2.5 px-4 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black leading-snug">
                                  Hourly Overtime
                                </td>
                                <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-center tabular-nums">
                                  {data.attendance_summary.hourly_ots}{" "}
                                  <span className="text-[9px] text-slate-500 ml-0.5">
                                    hrs
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-black border-slate-900 print:border-r-black text-right tabular-nums text-slate-600">
                                  {Number(
                                    data.wage_rates.hourly_wage,
                                  ).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </td>
                                <td className="py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black text-right tabular-nums font-bold">
                                  {Number(breakdown.hrOtPay).toLocaleString(
                                    "en-IN",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td className="h-[30px] border-r-[1.5px] border-slate-900 print:border-black bg-white"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black bg-white"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black bg-white"></td>
                              <td className="bg-white"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex flex-col md:flex-row print:flex-row w-full shrink-0 bg-white avoid-break">
                        {/* Left: Words & Signatures */}
                        <div className="w-full md:w-[55%] print:w-[55%] border-b-[1.5px] md:border-b-0 border-slate-900 print:border-b-0 border-r-0 md:border-r-[1.5px] print:border-r-[1.5px] print:border-black flex flex-col justify-between shrink-0">
                          <div className="p-4 sm:p-5 border-b-[1.5px] border-slate-900 print:border-black bg-slate-50/50 print:bg-white">
                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 tracking-widest">
                              Amount Paid (In Words)
                            </p>
                            <p className="font-bold text-[11px] sm:text-[12px] uppercase leading-snug text-slate-900 tracking-tight break-words">
                              {numberToWords(currentInputAmount)}
                            </p>
                          </div>
                          {/* Signatures */}
                          <div className="p-5 flex flex-row justify-between items-end h-[70px] pb-4 shrink-0">
                            <div className="text-center font-bold text-[9px] text-slate-500 w-[45%] border-t-[1.5px] border-slate-900 print:border-black pt-1.5 uppercase tracking-widest">
                              Employee Sign
                            </div>
                            <div className="text-center font-bold text-[9px] text-slate-500 w-[45%] border-t-[1.5px] border-slate-900 print:border-black pt-1.5 uppercase tracking-widest">
                              Auth. Signatory
                            </div>
                          </div>
                        </div>
                        <div className="w-full md:w-[45%] print:w-[45%] flex flex-col bg-slate-50/80 print:bg-transparent shrink-0">
                          <div className="flex justify-between items-center py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black font-bold text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                            <span>Period Gross Salary</span>
                            <span className="tabular-nums text-slate-900 print:text-black text-[13px]">
                              {formatINR(currentSlipGross)}
                            </span>
                          </div>

                          {prevPending > 0 && (
                            <div className="flex justify-between items-center py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black font-bold text-[10px] uppercase tracking-widest text-slate-600 print:text-black">
                              <span>Add: Prev Pending</span>
                              <span className="tabular-nums text-[13px] text-slate-900 print:text-black">
                                + {formatINR(prevPending)}
                              </span>
                            </div>
                          )}

                          {ledgerAdvances > 0 && (
                            <div className="flex justify-between items-center py-2.5 px-4 border-b-[1px] border-slate-300 print:border-black font-bold text-[10px] uppercase tracking-widest text-rose-600 print:text-black">
                              <span>Less: Ledger Advances</span>
                              <span className="tabular-nums text-[13px]">
                                - {formatINR(ledgerAdvances)}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center py-3 px-4 border-y-[1.5px] border-slate-900 print:border-black font-black text-[11px] sm:text-[12px] bg-slate-200/50 print:bg-transparent uppercase tracking-widest text-slate-900 print:text-black">
                            <span>Total Net Payable</span>
                            <span className="tabular-nums text-[14px] sm:text-[15px]">
                              {formatINR(rawNetPayable)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center py-3 px-4 border-b-[1.5px] border-slate-900 print:border-black font-black text-[11px] sm:text-[12px] uppercase tracking-widest text-blue-600 print:text-black">
                            <span>Less: Paid Today</span>
                            <span className="tabular-nums text-[14px] sm:text-[15px]">
                              - {formatINR(currentInputAmount)}
                            </span>
                          </div>

                          <div className="py-4 px-4 flex-1 flex flex-col justify-center bg-white print:bg-transparent items-center">
                            <div className="flex w-full justify-between items-center font-black text-[12px] sm:text-[13px] uppercase tracking-widest">
                              <span className="text-slate-800 print:text-black">
                                Closing{" "}
                                {isProjectedAdvance ? "Advance" : "Balance"}
                              </span>
                              <span
                                className={`tabular-nums text-[16px] sm:text-[18px] tracking-tight ${isProjectedAdvance ? "text-amber-600 print:text-black" : "text-rose-600 print:text-black"}`}
                              >
                                {formatINR(displayProjectedBalance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-full lg:w-[380px] xl:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col shrink-0 z-10 print:hidden shadow-[-20px_0_40px_rgba(0,0,0,0.04)] ${mobileTab === "PAYMENTS" ? "flex" : "hidden lg:flex"}`}
                  >
                    <div className="p-5 lg:p-6 lg:overflow-hidden flex-1 space-y-5 bg-slate-50/30 flex flex-col justify-center">
                      {/* Checkout Header */}
                      <div className="pb-4 border-b border-slate-200/80">
                        <h3 className="text-[18px] font-black text-slate-900 tracking-tight flex items-center gap-2 mb-1">
                          <Wallet size={18} className="text-blue-600" />{" "}
                          Settlement
                        </h3>
                        <p className="text-[12px] font-medium text-slate-500">
                          Finalize this payroll slip.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Total Net Payable
                        </h4>
                        <div className="bg-slate-900 text-white rounded-[14px] p-5 shadow-sm flex flex-col justify-center">
                          <span className="text-[12px] font-medium text-slate-400 mb-0.5">
                            Final calculated amount
                          </span>
                          <span className="text-[28px] sm:text-[32px] font-black tracking-tight tabular-nums leading-none">
                            {formatINR(rawNetPayable)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 flex items-center justify-between">
                          Amount Paying Today
                          {amountPayingNow !== "" && (
                            <button
                              onClick={() => setAmountPayingNow("")}
                              className="text-[9px] text-blue-500 hover:text-blue-700 tracking-wide lowercase bg-blue-50 px-1.5 py-0.5 rounded"
                            >
                              clear
                            </button>
                          )}
                        </label>
                        <div className="relative w-full">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-black text-[20px] pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={amountPayingNow}
                            onChange={(e) => setAmountPayingNow(e.target.value)}
                            className={`${InputClass} pl-[42px] font-black text-blue-900 bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 h-[56px] shadow-sm`}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <AnimatePresence>
                        {displayProjectedBalance > 0 && (
                          <motion.div
                            key="rollover-balance"
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                Resulting Balance
                              </h4>
                              <div
                                className={`p-4 rounded-[14px] flex flex-col gap-1.5 border shadow-sm ${
                                  isProjectedAdvance
                                    ? "bg-amber-50/80 border-amber-200/80 text-amber-900"
                                    : "bg-rose-50/80 border-rose-200/80 text-rose-900"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                  <AlertCircle size={14} strokeWidth={2.5} />
                                  {isProjectedAdvance
                                    ? "Carrying over as Advance"
                                    : "Rolling over as Pending Due"}
                                </div>
                                <span className="text-[20px] font-black tabular-nums tracking-tight">
                                  {formatINR(displayProjectedBalance)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="p-5 lg:p-6 bg-white border-t border-slate-200/80 flex flex-col gap-3 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                      <button
                        type="button"
                        disabled={loading || settling}
                        onClick={handleSettle}
                        className="w-full h-[52px] bg-blue-600 text-white rounded-[14px] text-[14px] font-bold tracking-wide shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:-translate-y-[1px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
                      >
                        {settling ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <>
                            <CheckCircle2 size={18} strokeWidth={2.5} /> Confirm
                            & Save Ledger
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={loading || settling}
                        onClick={() => window.print()}
                        className="w-full h-[44px] bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-70"
                      >
                        <Printer
                          size={16}
                          strokeWidth={2}
                          className="text-slate-500"
                        />{" "}
                        Print Preview Only
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>,
    document.body,
  );
};

export default SalarySlipModal;
