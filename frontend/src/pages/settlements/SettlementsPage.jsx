import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  ShieldAlert,
  Receipt,
  Search,
  CheckCircle2,
  X,
  Banknote,
  ShoppingCart,
  Truck,
  Recycle,
  Briefcase,
  Printer,
  Calendar,
  Building,
  ArrowDownRight,
  AlertTriangle,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const CurrencyFormat = ({ amount, className = "", symbolClass = "" }) => (
  <span
    className={`tabular-nums tracking-tight inline-flex items-baseline ${className}`}
  >
    <span
      className={`text-[0.85em] opacity-60 print:opacity-100 mr-[1.5px] font-medium ${symbolClass}`}
    >
      ₹{" "}
    </span>
    <span className="truncate">{formatINR(amount)}</span>{" "}
  </span>
);

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

const getBillTypeInfo = (type) => {
  switch (type) {
    case "PURCHASE":
      return {
        label: "Purchase",
        icon: ShoppingCart,
        bg: "bg-sky-50",
        color: "text-sky-600",
        title: "PURCHASE INVOICE",
      };
    case "OWN_SALE":
      return {
        label: "Sale",
        icon: Truck,
        bg: "bg-indigo-50",
        color: "text-indigo-600",
        title: "TAX INVOICE",
      };
    case "JOB_WORK_RETURN":
      return {
        label: "Jobwork",
        icon: Briefcase,
        bg: "bg-amber-50",
        color: "text-amber-600",
        title: "DELIVERY CHALLAN",
      };
    case "SCRAP_SALE":
      return {
        label: "Scrap Sale",
        icon: Recycle,
        bg: "bg-purple-50",
        color: "text-purple-600",
        title: "COMMERCIAL INVOICE",
      };
    default:
      return {
        label: type || "UNKNOWN",
        icon: Receipt,
        bg: "bg-slate-50",
        color: "text-slate-600",
        title: "INVOICE",
      };
  }
};

const isBillInDateRange = (dateStr, range, customMonthStr) => {
  if (range === "ALL_TIME") return true;
  if (!dateStr) return false;
  const rawYear = dateStr.substring(0, 4);
  const rawMonth = dateStr.substring(0, 7);
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (range === "THIS_MONTH") return rawMonth === currentMonth;
  if (range === "THIS_YEAR") return rawYear === currentYear;
  if (range === "LAST_MONTH") {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
    return rawMonth === lmStr;
  }
  if (range === "CUSTOM_MONTH") {
    if (!customMonthStr) return true;
    return rawMonth === customMonthStr;
  }
  if (range === "THIS_WEEK") {
    const d = new Date(dateStr);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  return true;
};

const DateFilterBar = ({
  dateRange,
  setDateRange,
  customMonth,
  setCustomMonth,
}) => {
  const TABS = [
    { id: "ALL_TIME", label: "All Time", hideOnMobile: false },
    { id: "THIS_MONTH", label: "This Month", hideOnMobile: false },
    { id: "LAST_MONTH", label: "Last Month", hideOnMobile: true },
  ];

  const getFormattedCustomMonth = () => {
    if (!customMonth) return "Select Month";
    const [year, month] = customMonth.split("-");
    const date = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] xl:rounded-full w-full xl:flex-1 h-[40px] sm:h-[44px] shrink-0 min-w-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setDateRange(tab.id);
            setCustomMonth("");
          }}
          className={`flex-1 px-1 sm:px-5 h-full rounded-[8px] xl:rounded-full text-[10px] sm:text-[13px] font-medium transition-all flex items-center justify-center outline-none border whitespace-nowrap shrink-0 min-w-0 ${tab.hideOnMobile ? "hidden sm:flex" : "flex"} ${
            dateRange === tab.id
              ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80 text-slate-900 font-semibold"
              : "text-slate-500 hover:text-slate-900 border-transparent"
          }`}
        >
          <span className="truncate leading-none block w-full text-center">
            {tab.label}
          </span>
        </button>
      ))}
      <div
        className={`relative flex-1 h-full rounded-[8px] xl:rounded-full text-[10px] sm:text-[13px] font-medium transition-all border flex items-center justify-center focus-within:ring-2 focus-within:ring-blue-100 shrink-0 min-w-0 ${
          dateRange === "CUSTOM_MONTH" && customMonth
            ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80 text-slate-900 font-semibold pr-5 sm:pr-8"
            : "text-slate-500 hover:text-slate-900 border-transparent"
        }`}
      >
        <div className="flex items-center justify-center w-full h-full px-1 sm:px-4 pointer-events-none whitespace-nowrap min-w-0 overflow-hidden">
          <Calendar
            size={14}
            className="mr-1.5 sm:mr-2 shrink-0 hidden sm:block"
            strokeWidth={2}
          />
          <span className="truncate leading-none w-full text-center">
            {getFormattedCustomMonth()}
          </span>
        </div>
        <input
          type="month"
          className="absolute inset-0 w-full h-full cursor-pointer z-10 opacity-0"
          value={customMonth}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch (err) {}
          }}
          onChange={(e) => {
            if (e.target.value) {
              setCustomMonth(e.target.value);
              setDateRange("CUSTOM_MONTH");
            } else {
              setCustomMonth("");
              setDateRange("ALL_TIME");
            }
          }}
        />
        {customMonth && dateRange === "CUSTOM_MONTH" && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCustomMonth("");
              setDateRange("ALL_TIME");
            }}
            className="absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-slate-100 border border-slate-200 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm transition-colors z-20"
          >
            <X size={12} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
};

const DrillDownModal = ({
  bill,
  isJobworkParty,
  onClose,
  onPaymentSuccess,
}) => {
  const [billDetails, setBillDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [mobileTab, setMobileTab] = useState("INVOICE");

  const [formLoading, setFormLoading] = useState(false);
  const [reversingId, setReversingId] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "BANK_TRANSFER",
    reference_no: "",
  });

  const isJobWork = bill?.bill_type === "JOB_WORK_RETURN";

  const fetchFormat = useCallback(async () => {
    setLoadingDetails(true);
    try {
      const typeParam = bill.bill_type === "PURCHASE" ? "PURCHASE" : "DISPATCH";
      const res = await api.get(`/settlements/${bill.id}?type=${typeParam}`);
      let fetchedData = res?.data?.data || null;

      if (fetchedData) {
        let extractedPayments = Array.isArray(fetchedData.payments)
          ? fetchedData.payments
          : [];
        let extractedBilling = fetchedData.billing || {};

        if (fetchedData.remarks && typeof fetchedData.remarks === "object") {
          if (Array.isArray(fetchedData.remarks.payments))
            extractedPayments = fetchedData.remarks.payments;
          if (fetchedData.remarks.billing)
            extractedBilling = {
              ...extractedBilling,
              ...fetchedData.remarks.billing,
            };
        } else if (
          typeof fetchedData.remarks === "string" &&
          fetchedData.remarks.trim().startsWith("{")
        ) {
          try {
            const parsedRemarks = JSON.parse(fetchedData.remarks);
            if (Array.isArray(parsedRemarks.payments))
              extractedPayments = parsedRemarks.payments;
            if (parsedRemarks.billing)
              extractedBilling = {
                ...extractedBilling,
                ...parsedRemarks.billing,
              };
          } catch (e) {}
        }
        fetchedData.payments = extractedPayments;
        fetchedData.billing = extractedBilling;
      }
      setBillDetails(fetchedData);
    } catch (err) {
      toast.error("Failed to fetch bill format.");
    } finally {
      setLoadingDetails(false);
    }
  }, [bill]);

  useEffect(() => {
    if (bill) fetchFormat();
  }, [bill, fetchFormat]);

  const subtotal = Number(billDetails?.subtotal) || 0;
  let cgstPercent = Number(billDetails?.billing?.cgst_percent) || 0;
  let sgstPercent = Number(billDetails?.billing?.sgst_percent) || 0;
  let cgstAmt = Number(billDetails?.billing?.cgst) || 0;
  let sgstAmt = Number(billDetails?.billing?.sgst) || 0;
  let grandTotal = Number(billDetails?.grand_total) || subtotal;

  if (grandTotal > subtotal && !cgstPercent && cgstAmt === 0) {
    const taxDiff = grandTotal - subtotal;
    cgstAmt = taxDiff / 2;
    sgstAmt = taxDiff / 2;
    cgstPercent = subtotal > 0 ? Math.round((cgstAmt / subtotal) * 100) : 0;
    sgstPercent = subtotal > 0 ? Math.round((sgstAmt / subtotal) * 100) : 0;
  } else if (cgstPercent > 0 && cgstAmt === 0) {
    cgstAmt = (subtotal * cgstPercent) / 100;
    sgstAmt = (subtotal * cgstPercent) / 100;
  }

  const detailedPayments = Array.isArray(billDetails?.payments)
    ? billDetails.payments
    : [];
  const detailedPaidSum = detailedPayments.reduce(
    (sum, p) => sum + (Number(p?.amount) || 0),
    0,
  );
  const listAmountPaid = Number(bill?.amount_paid) || 0;

  const totalPaid =
    billDetails && detailedPayments.length === 0
      ? 0
      : detailedPaidSum > 0
        ? detailedPaidSum
        : listAmountPaid;

  const currentBalance = Math.max(0, grandTotal - totalPaid);

  useEffect(() => {
    setForm((prev) => ({ ...prev, amount: currentBalance || "" }));
  }, [currentBalance]);

  const getModulePayloadType = (dbType) => {
    if (dbType === "PURCHASE") return "PURCHASE";
    if (dbType === "OWN_SALE") return "OWN_SALE";
    if (dbType === "JOB_WORK_RETURN") return "JOB_WORK_RETURN";
    if (dbType === "SCRAP_SALE") return "SCRAP_SALE";
    return "OWN_SALE";
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(form.amount);

    if (numAmount <= 0) return toast.error("Amount must be greater than zero.");
    if (numAmount > currentBalance)
      return toast.error("Amount cannot exceed balance due.");

    setFormLoading(true);
    try {
      await api.post("/settlements/process", {
        module_type: getModulePayloadType(bill?.bill_type),
        record_id: bill?.id,
        amount: numAmount,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        reference_no: form.reference_no,
      });
      toast.success("Payment recorded securely!");
      onPaymentSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment processing failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleReversePayment = async (paymentId) => {
    if (
      !window.confirm(
        "Are you sure you want to reverse this payment? This cannot be undone.",
      )
    )
      return;

    setReversingId(paymentId);
    try {
      const modType = getModulePayloadType(bill?.bill_type);
      await api.delete(
        `/settlements/${bill.id}/payments/${paymentId}?module_type=${modType}`,
      );
      toast.success("Payment reversed successfully!");

      await fetchFormat();
      onPaymentSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reverse payment");
    } finally {
      setReversingId(null);
    }
  };

  const handlePrint = () => window.print();

  return createPortal(
    <AnimatePresence>
      <div
        style={{ zIndex: 9999 }}
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 font-sans antialiased print:block print:p-0 print:static print:bg-white"
      >
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 10mm; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; margin: 0 !important; overflow: visible !important; }
            #root { display: none !important; }
            .no-print { display: none !important; }
            div[style*="z-index: 9999"], 
            div[style*="z-index: 9999"] > div {
               position: static !important; transform: none !important; box-shadow: none !important; border: none !important; overflow: visible !important; height: auto !important; max-height: none !important; background: white !important; padding: 0 !important;
            }
            #printable-invoice { width: 100% !important; max-width: none !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-color: #000 !important; }
            .print-footer-row { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; width: 100% !important; page-break-inside: avoid !important; }
            .print-footer-left { width: 60% !important; }
            .print-footer-right { width: 40% !important; }
          `}
        </style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden cursor-pointer"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.98, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 10, opacity: 0 }}
          transition={themeSpring}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[1300px] h-[95vh] bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-200/60 flex flex-col overflow-hidden z-10 print:h-auto print:border-none print:shadow-none print:overflow-visible print:rounded-none"
        >
          <div className="no-print px-4 sm:px-8 py-4 sm:py-5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 shrink-0 z-30">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Receipt
                  size={18}
                  strokeWidth={1.5}
                  className="sm:w-5 sm:h-5"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] sm:text-[20px] font-bold text-slate-900 tracking-tight leading-none mb-1 sm:mb-1.5 truncate">
                  Invoice #{bill?.bill_no || "Document"}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={`px-2 sm:px-2.5 py-0.5 rounded-[6px] sm:rounded-[8px] text-[8px] sm:text-[10px] font-bold uppercase tracking-widest border ${getBillTypeInfo(bill?.bill_type).bg} ${getBillTypeInfo(bill?.bill_type).color}`}
                  >
                    {getBillTypeInfo(bill?.bill_type).label}
                  </span>
                  {!isJobWork && (
                    <span
                      className={`px-2 sm:px-2.5 py-0.5 rounded-[6px] sm:rounded-[8px] text-[8px] sm:text-[10px] font-bold uppercase tracking-widest border ${currentBalance === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200/60" : totalPaid > 0 ? "bg-amber-50 text-amber-600 border-amber-200/60" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
                    >
                      {currentBalance === 0
                        ? "PAID"
                        : totalPaid > 0
                          ? "PARTIAL"
                          : "PENDING"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handlePrint}
                disabled={loadingDetails}
                className="hidden sm:flex h-[40px] px-5 rounded-[12px] font-bold text-[13px] text-slate-700 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900 transition-all items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <Printer
                  size={16}
                  strokeWidth={2.5}
                  className="text-slate-500"
                />{" "}
                Print
              </button>
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm active:scale-95 shrink-0"
              >
                <X size={18} strokeWidth={2.5} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="lg:hidden flex border-b border-slate-200/80 shrink-0 bg-slate-50/50 px-2 no-print">
            <button
              onClick={() => setMobileTab("INVOICE")}
              className={`flex-1 py-3 text-[12px] sm:text-[13px] font-bold tracking-wide transition-all border-b-[2.5px] ${mobileTab === "INVOICE" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`}
            >
              Preview
            </button>
            <button
              onClick={() => setMobileTab("PAYMENTS")}
              className={`flex-1 py-3 text-[12px] sm:text-[13px] font-bold tracking-wide transition-all border-b-[2.5px] ${mobileTab === "PAYMENTS" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`}
            >
              Settlement
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-50/50 print:block print:overflow-visible print:bg-white">
            <div
              className={`flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 flex-col items-center [&::-webkit-scrollbar]:hidden ${mobileTab === "INVOICE" ? "flex" : "hidden lg:flex"} print:block print:overflow-visible print:p-0`}
            >
              {loadingDetails || !billDetails ? (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[40vh] bg-transparent print:hidden">
                  <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50 flex items-center justify-center">
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-500"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[850px] mx-auto bg-white rounded-[12px] sm:rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/80 shrink-0 overflow-hidden flex flex-col print:border-none print:shadow-none print:w-full print:max-w-full print:overflow-visible">
                  <div className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
                    <div
                      id="printable-invoice"
                      className="min-w-[700px] sm:min-w-[800px] w-full flex flex-col text-[12px] text-slate-900 font-sans bg-white mx-auto print:min-w-full"
                    >
                      <div className="border-b-[1.5px] border-slate-900 print:border-black text-center py-3 font-black text-[18px] sm:text-[20px] tracking-[0.2em] sm:tracking-[0.25em] uppercase text-slate-900 bg-slate-50/80 shrink-0">
                        {getBillTypeInfo(bill?.bill_type).title}
                      </div>

                      <div className="flex flex-row border-b-[1.5px] border-slate-900 print:border-black shrink-0">
                        <div className="w-1/2 p-4 sm:p-5 border-r-[1.5px] border-slate-900 print:border-black flex flex-col justify-between shrink-0 bg-slate-50/50">
                          <div>
                            <h2 className="text-[20px] sm:text-[24px] font-black uppercase tracking-tight mb-1 text-slate-900 leading-none">
                              Maa Arbuda Metal
                            </h2>
                            <p className="text-[11px] sm:text-[12px] font-bold text-slate-700 mb-3 tracking-tight">
                              Manufacturer & Exporter of Stainless Steel
                            </p>
                            <div className="text-[10px] sm:text-[11px] font-medium leading-relaxed text-slate-800">
                              <p>Shed No.389, Gopal Charan Industrial Estate</p>
                              <p>
                                Revenue Block No. 113, Pavan Industrial Daskrol
                              </p>
                              <p>Bakrol Bujrang, Ahmedabad, Gujarat - 382430</p>
                            </div>
                          </div>
                          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:gap-6 gap-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shrink-0">
                            <p className="text-slate-500">
                              GSTIN:{" "}
                              <span className="text-slate-900 font-black">
                                24BCPFPT7572L1ZY
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="w-1/2 grid grid-cols-2 grid-rows-2 shrink-0">
                          <div className="p-3 sm:p-4 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black flex flex-col justify-center">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:mb-1 tracking-widest">
                              Invoice No.
                            </p>
                            <p className="font-black text-[13px] sm:text-[14px] uppercase truncate text-slate-900">
                              {bill?.bill_no}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 border-b-[1.5px] border-slate-900 print:border-black flex flex-col justify-center">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:mb-1 tracking-widest">
                              Dated
                            </p>
                            <p className="font-black text-[13px] sm:text-[14px] text-slate-900">
                              {bill?.bill_date
                                ? new Date(bill.bill_date).toLocaleDateString(
                                    "en-GB",
                                  )
                                : ""}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 border-r-[1.5px] border-slate-900 print:border-black flex flex-col justify-center">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:mb-1 tracking-widest">
                              Place of Supply
                            </p>
                            <p className="font-semibold text-[12px] sm:text-[13px] truncate text-slate-900">
                              {billDetails?.billing?.place_of_supply ||
                                (billDetails?.address
                                  ? "As per Billing"
                                  : "Gujarat")}
                            </p>
                          </div>
                          <div className="p-3 sm:p-4 border-slate-900 print:border-black flex flex-col justify-center">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:mb-1 tracking-widest">
                              Vehicle No.
                            </p>
                            <p className="font-semibold text-[12px] sm:text-[13px] truncate text-slate-900">
                              {billDetails?.billing?.vehicle_no ||
                                billDetails?.challan_no ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 border-b-[1.5px] border-slate-900 print:border-black shrink-0">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-1 sm:mb-2 tracking-widest">
                          Billed To Details
                        </p>
                        <h3 className="text-[16px] sm:text-[18px] font-black uppercase tracking-tight mb-1.5 sm:mb-2 text-slate-900">
                          {billDetails?.party_name || bill?.party_name}
                        </h3>
                        <div className="text-[11px] sm:text-[12px] font-medium leading-relaxed text-slate-800">
                          <p className="max-w-[70%] sm:max-w-[60%] whitespace-pre-wrap">
                            {billDetails?.address || "Address not provided"}
                          </p>
                          <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            PHONE:{" "}
                            <span className="text-slate-900 font-black">
                              {billDetails?.phone || "N/A"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="w-full shrink-0">
                        <table
                          className="w-full text-left border-collapse bg-white border-b-[1.5px] border-slate-900 print:border-black"
                          style={{ tableLayout: "fixed" }}
                        >
                          <thead className="bg-slate-100 print:bg-transparent">
                            <tr>
                              <th className="py-2.5 px-2 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[8%] text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                S.No
                              </th>
                              <th className="py-2.5 px-3 sm:px-4 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[42%] font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                Description of Goods
                              </th>
                              <th className="py-2.5 px-2 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[10%] text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                Qty
                              </th>
                              <th className="py-2.5 px-2 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[10%] text-center font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                UOM
                              </th>
                              <th className="py-2.5 px-3 border-r-[1.5px] border-b-[1.5px] border-slate-900 print:border-black w-[15%] text-right font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                Rate (₹)
                              </th>
                              <th className="py-2.5 px-3 border-b-[1.5px] border-slate-900 print:border-black w-[15%] text-right font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-900">
                                Amount (₹)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(billDetails?.lines) &&
                              billDetails.lines.map((line, i) => (
                                <tr
                                  key={i}
                                  className="font-semibold text-[11px] sm:text-[12px] text-slate-900"
                                >
                                  <td className="py-2 sm:py-3 px-2 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-b-slate-400 border-slate-900 print:border-r-black text-center align-top">
                                    {i + 1}
                                  </td>
                                  <td className="py-2 sm:py-3 px-3 sm:px-4 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-b-slate-400 border-slate-900 print:border-r-black leading-snug align-top">
                                    {line?.material_name ||
                                      line?.product_name ||
                                      line?.scrap_name ||
                                      "Item"}
                                    {line?.raw_number && (
                                      <span className="block text-[9px] sm:text-[10px] font-semibold text-slate-500 mt-1 sm:mt-1.5">
                                        Batch: {line.raw_number}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 sm:py-3 px-2 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-b-slate-400 border-slate-900 print:border-r-black text-right tabular-nums align-top">
                                    {Number(
                                      line?.quantity || 0,
                                    ).toLocaleString()}
                                  </td>
                                  <td className="py-2 sm:py-3 px-2 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-b-slate-400 border-slate-900 print:border-r-black text-center align-top">
                                    {line?.uom || "-"}
                                  </td>
                                  <td className="py-2 sm:py-3 px-3 border-r-[1.5px] border-b-[1px] border-slate-300 print:border-b-slate-400 border-slate-900 print:border-r-black text-right tabular-nums align-top">
                                    {Number(
                                      line?.rate || line?.sale_rate || 0,
                                    ).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="py-2 sm:py-3 px-3 border-b-[1px] border-slate-300 print:border-b-slate-400 text-right tabular-nums align-top font-bold">
                                    {Number(
                                      line?.amount || line?.line_total || 0,
                                    ).toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              ))}
                            <tr>
                              <td className="h-[150px] sm:h-[200px] border-r-[1.5px] border-slate-900 print:border-black"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black"></td>
                              <td className="border-r-[1.5px] border-slate-900 print:border-black"></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div
                        className="print-footer-row flex flex-row w-full shrink-0 avoid-break"
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          flexWrap: "nowrap",
                          width: "100%",
                        }}
                      >
                        <div className="print-footer-left w-[60%] border-r-[1.5px] border-slate-900 print:border-black flex flex-col justify-between bg-white shrink-0">
                          <div className="p-4 sm:p-5 border-b-[1.5px] border-slate-900 print:border-black shrink-0 flex-1">
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mb-1.5 sm:mb-2 tracking-widest">
                              Amount Chargeable (In Words)
                            </p>
                            <p className="font-bold text-[10px] sm:text-[12px] uppercase leading-relaxed text-slate-900 tracking-tight">
                              {numberToWords(grandTotal)}
                            </p>
                          </div>
                        </div>

                        <div className="print-footer-right w-[40%] flex flex-col bg-slate-50 shrink-0">
                          <div className="flex justify-between items-center p-2.5 sm:p-3 px-3 sm:px-4 border-b-[1px] border-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600">
                            <span>Subtotal</span>
                            <span className="tabular-nums text-slate-900 text-[11px] sm:text-[13px]">
                              {Number(subtotal).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          {cgstAmt > 0 && (
                            <div className="flex justify-between items-center p-2.5 sm:p-3 px-3 sm:px-4 border-b-[1px] border-slate-300 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-700">
                              <span>
                                Add: CGST
                                {billDetails?.billing?.gst_mode === "AUTO" && (
                                  <span className="font-mono text-[8px] sm:text-[9px]">
                                    @{cgstPercent}%
                                  </span>
                                )}
                              </span>
                              <span className="tabular-nums text-[11px] sm:text-[12px]">
                                {Number(cgstAmt).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          {sgstAmt > 0 && (
                            <div className="flex justify-between items-center p-2.5 sm:p-3 px-3 sm:px-4 border-b-[1px] border-slate-300 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-700">
                              <span>
                                Add: SGST
                                {billDetails?.billing?.gst_mode === "AUTO" && (
                                  <span className="font-mono text-[8px] sm:text-[9px]">
                                    @{sgstPercent}%
                                  </span>
                                )}
                              </span>
                              <span className="tabular-nums text-[11px] sm:text-[12px]">
                                {Number(sgstAmt).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          {billDetails?.billing?.apply_round_off &&
                            billDetails?.billing?.round_off_amount !== 0 && (
                              <div className="flex justify-between items-center p-2.5 sm:p-3 px-3 sm:px-4 border-b-[1px] border-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-600">
                                <span>Round Off</span>
                                <span className="tabular-nums text-[11px] sm:text-[12px]">
                                  {billDetails.billing.round_off_amount > 0
                                    ? "+"
                                    : ""}
                                  {Number(
                                    billDetails.billing.round_off_amount,
                                  ).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                          <div className="flex justify-between items-center p-3 sm:p-3.5 px-3 sm:px-4 border-b-[1.5px] border-slate-900 print:border-black font-bold text-[10px] sm:text-[12px] bg-slate-200/50 uppercase tracking-widest text-slate-900">
                            <span>Grand Total (₹)</span>
                            <span className="tabular-nums text-[15px] sm:text-[18px]">
                              {Number(grandTotal).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="p-3 sm:p-4 px-4 sm:px-5 flex-1 flex flex-col justify-end text-right bg-white items-center">
                            <p className="font-bold text-[9px] sm:text-[11px] uppercase tracking-wider mb-8 sm:mb-10 text-slate-900 w-full">
                              For Maa Arbuda Metal
                            </p>
                            <div className="border-b-[1.5px] border-slate-900 print:border-black w-full mb-1 sm:mb-1.5"></div>
                            <p className="text-[7px] sm:text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                              Authorized Signatory
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 sm:p-3 text-center text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border-t-[1.5px] border-slate-900 print:border-black shrink-0">
                        This is a computer generated invoice
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`w-full lg:w-[380px] xl:w-[420px] flex-col bg-white border-l border-slate-200/80 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] no-print ${mobileTab === "PAYMENTS" ? "flex" : "hidden lg:flex"}`}
            >
              <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
                <h2 className="text-[14px] sm:text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Banknote size={18} className="text-blue-600" /> Payment &
                  Settlement
                </h2>
                <div className="mt-3 sm:mt-4 bg-white border border-slate-200/80 rounded-[14px] sm:rounded-[16px] p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 sm:mb-1">
                      Current Balance
                    </p>
                    <CurrencyFormat
                      amount={currentBalance}
                      className={`text-[16px] sm:text-[20px] font-black ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}
                    />
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[6px] sm:rounded-[8px] border ${currentBalance === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200/60" : totalPaid > 0 ? "bg-amber-50 text-amber-600 border-amber-200/60" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
                  >
                    {currentBalance === 0
                      ? "PAID"
                      : totalPaid > 0
                        ? "PARTIAL"
                        : "PENDING"}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-5 sm:space-y-6 lg:space-y-8 [&::-webkit-scrollbar]:hidden">
                {currentBalance > 0 ? (
                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">
                      Record New Payment
                    </h3>
                    <form
                      onSubmit={handlePaymentSubmit}
                      className="space-y-3 sm:space-y-4"
                    >
                      <div>
                        <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mb-1 sm:mb-1.5 block uppercase tracking-wide">
                          Amount to Settle
                        </label>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[13px] sm:text-[14px] font-black text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none">
                            ₹
                          </div>
                          <input
                            type="number"
                            max={currentBalance}
                            step="0.01"
                            min="0.01"
                            required
                            value={form.amount}
                            onChange={(e) =>
                              setForm({ ...form, amount: e.target.value })
                            }
                            className="w-full h-[44px] sm:h-[48px] pl-10 pr-4 bg-white border border-slate-200/80 rounded-[12px] sm:rounded-full text-[14px] sm:text-[15px] lg:text-[16px] font-bold text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none tabular-nums shadow-sm transition-all placeholder:text-slate-400"
                            placeholder={`Max: ${currentBalance}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mb-1 sm:mb-1.5 block uppercase tracking-wide">
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={form.payment_date}
                            onChange={(e) =>
                              setForm({ ...form, payment_date: e.target.value })
                            }
                            className="w-full h-[44px] sm:h-[48px] px-3 sm:px-3.5 py-2 sm:py-0 bg-white border border-slate-200/80 rounded-[10px] sm:rounded-[12px] lg:rounded-[14px] text-[13px] sm:text-[14px] font-bold text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all appearance-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mb-1 sm:mb-1.5 block uppercase tracking-wide">
                            Mode
                          </label>
                          <div className="relative">
                            <select
                              value={form.payment_mode}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  payment_mode: e.target.value,
                                })
                              }
                              className="w-full h-[44px] sm:h-[48px] pl-3 sm:pl-3.5 pr-8 bg-white border border-slate-200/80 rounded-[10px] sm:rounded-[12px] lg:rounded-[14px] text-[13px] sm:text-[14px] font-bold text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none shadow-sm transition-all cursor-pointer"
                            >
                              <option value="BANK_TRANSFER">
                                Bank Transfer
                              </option>
                              <option value="CASH">Cash</option>
                              <option value="CHEQUE">Cheque</option>
                              <option value="UPI">UPI</option>
                            </select>
                            <ChevronDown
                              size={14}
                              className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mb-1 sm:mb-1.5 block uppercase tracking-wide">
                          Reference No (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UTR / Cheque No"
                          value={form.reference_no}
                          onChange={(e) =>
                            setForm({ ...form, reference_no: e.target.value })
                          }
                          className="w-full h-[44px] sm:h-[48px] px-3.5 sm:px-4 bg-white border border-slate-200/80 rounded-[10px] sm:rounded-[12px] lg:rounded-[14px] text-[13px] sm:text-[14px] font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={formLoading}
                        className="w-full h-[44px] sm:h-[48px] mt-1 sm:mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] sm:rounded-[14px] font-bold text-[13px] sm:text-[14px] tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                      >
                        {formLoading ? (
                          <Loader2
                            className="animate-spin"
                            size={16}
                            strokeWidth={2.5}
                          />
                        ) : (
                          <>
                            <CheckCircle2 size={16} strokeWidth={2.5} /> Confirm
                            Payment
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-[16px] sm:rounded-[20px] p-5 sm:p-6 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <CheckCircle2
                        size={24}
                        className="sm:w-7 sm:h-7"
                        strokeWidth={2.5}
                      />
                    </div>
                    <p className="text-[15px] sm:text-[16px] font-black text-emerald-800 tracking-tight">
                      Invoice Fully Settled
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-medium text-emerald-600/80 mt-1">
                      No further payments required.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 sm:mb-4 border-t border-slate-200/60 pt-5 sm:pt-6">
                    Payment History
                  </h3>
                  {detailedPayments.length > 0 ? (
                    <div className="space-y-2.5 sm:space-y-3">
                      {detailedPayments.map((p, i) => (
                        <div
                          key={p.id || i}
                          className="flex justify-between items-center p-3.5 sm:p-4 bg-slate-50/80 border border-slate-200/60 rounded-[14px] sm:rounded-[16px] hover:shadow-sm transition-shadow group"
                        >
                          <div>
                            <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight">
                              {p?.payment_date
                                ? new Date(p.payment_date).toLocaleDateString()
                                : "N/A"}
                            </p>
                            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-0.5 sm:mt-1 uppercase tracking-widest">
                              {p?.payment_mode}
                              {p?.reference_no ? `• ${p.reference_no}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] sm:text-[15px] font-black text-emerald-600 tabular-nums tracking-tight">
                              +
                              <CurrencyFormat
                                amount={p?.amount}
                                symbolClass="text-[0.85em] opacity-60 mr-[1px] ml-0.5"
                              />
                            </span>
                            <button
                              onClick={() => handleReversePayment(p.id)}
                              disabled={reversingId === p.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-colors disabled:opacity-50"
                              title="Delete/Reverse Payment"
                            >
                              {reversingId === p.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin text-rose-500"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : totalPaid > 0 ? (
                    <div className="p-3.5 sm:p-5 bg-emerald-50/50 border border-emerald-200/80 rounded-[14px] sm:rounded-[16px] flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight">
                          Prior Payments
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1">
                          Consolidated from ledger
                        </p>
                      </div>
                      <span className="text-[14px] sm:text-[15px] font-black text-emerald-600 tabular-nums tracking-tight">
                        +
                        <CurrencyFormat
                          amount={totalPaid}
                          symbolClass="text-[0.85em] opacity-60 mr-[1px] ml-0.5"
                        />
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 sm:py-8 text-center bg-slate-50/50 rounded-[14px] sm:rounded-[16px] border border-slate-200/80 border-dashed">
                      <p className="text-[12px] sm:text-[13px] text-slate-500 font-semibold tracking-tight">
                        No payments recorded yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 sm:hidden no-print z-20">
            <button
              onClick={handlePrint}
              disabled={loadingDetails}
              className="w-full h-[44px] bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
            >
              <Printer size={16} strokeWidth={2.5} /> Print Document
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

const SettlementDetailModal = ({
  party,
  onClose,
  onBillClick,
  dateRange,
  customMonth,
}) => {
  const safeBills = party?.bills || [];

  const displayBills = useMemo(() => {
    const filtered = safeBills.filter((bill) => {
      return isBillInDateRange(
        bill.bill_date || bill.created_at,
        dateRange,
        customMonth,
      );
    });

    return filtered.sort((a, b) => {
      if (Number(a.balance_due) > 0 && Number(b.balance_due) === 0) return -1;
      if (Number(b.balance_due) > 0 && Number(a.balance_due) === 0) return 1;
      return (
        new Date(b.bill_date || b.created_at) -
        new Date(a.bill_date || a.created_at)
      );
    });
  }, [safeBills, dateRange, customMonth]);

  const stats = useMemo(() => {
    let sales = { billed: 0, received: 0, balance: 0 };
    let purchases = { billed: 0, paid: 0, balance: 0 };

    displayBills.forEach((bill) => {
      if (bill.direction === "RECEIVABLE") {
        sales.billed += Number(bill.grand_total || 0);
        sales.received += Number(bill.amount_paid || 0);
        sales.balance += Number(bill.balance_due || 0);
      } else if (bill.direction === "PAYABLE") {
        purchases.billed += Number(bill.grand_total || 0);
        purchases.paid += Number(bill.amount_paid || 0);
        purchases.balance += Number(bill.balance_due || 0);
      }
    });
    return { sales, purchases };
  }, [displayBills]);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-full overflow-hidden selection:bg-blue-500 selection:text-white print:hidden">
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
                {displayBills.length} Bills Tracked
              </span>
              {party?.isJobworkParty && (
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 bg-amber-50 text-amber-600">
                  Job Work Party
                </span>
              )}
            </div>
            <h2 className="text-[14px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate py-0.5">
              {party?.party_name || "Unknown Party"}
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-[8px] sm:rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col h-full w-full overflow-y-auto sm:overflow-hidden"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-white border-b border-slate-200/80 shrink-0">
            <div className="flex flex-col p-3 sm:p-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 sm:mb-3">
                <ArrowDownRight size={14} className="text-emerald-500" />
                Receivables (Debtors)
              </h3>
              <div className="flex items-end justify-between gap-2 sm:gap-4">
                <div className="flex-1">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sales Billed
                  </p>
                  <p className="text-[12px] sm:text-[14px] font-bold text-slate-800 tabular-nums leading-none">
                    {formatINR(stats.sales.billed)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Amount Paid
                  </p>
                  <p className="text-[12px] sm:text-[14px] font-bold text-emerald-600 tabular-nums leading-none">
                    {formatINR(stats.sales.received)}
                  </p>
                </div>
                <div className="flex-1 pl-2 sm:pl-4 border-l border-slate-100">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pending Balance
                  </p>
                  <p
                    className={`text-[15px] sm:text-[18px] font-black tabular-nums tracking-tight leading-none ${stats.sales.balance > 0 ? "text-rose-600" : "text-slate-900"}`}
                  >
                    {formatINR(stats.sales.balance)}
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
                    {formatINR(stats.purchases.billed)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    We Paid
                  </p>
                  <p className="text-[12px] sm:text-[14px] font-bold text-rose-600 tabular-nums leading-none">
                    {formatINR(stats.purchases.paid)}
                  </p>
                </div>
                <div className="flex-1 pl-2 sm:pl-4 border-l border-slate-100">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pending Balance
                  </p>
                  <p
                    className={`text-[15px] sm:text-[18px] font-black tabular-nums tracking-tight leading-none ${stats.purchases.balance > 0 ? "text-amber-600" : "text-slate-900"}`}
                  >
                    {formatINR(stats.purchases.balance)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-white sm:overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h4 className="text-[11px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Receipt size={14} className="text-blue-500" /> Active Bills
              </h4>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-white border border-slate-200/80 px-2.5 py-1 rounded-full shadow-sm leading-none">
                {displayBills.length} ENTRIES
              </span>
            </div>
            <div className="flex-1 sm:overflow-auto pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {displayBills.length === 0 ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 py-16 m-4">
                  <div className="w-14 h-14 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3">
                    <Filter
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400"
                    />
                  </div>
                  <p className="text-[15px] font-bold tracking-tight text-slate-900">
                    No bills found
                  </p>
                  <p className="text-[12px] font-medium text-slate-500 mt-1 text-center px-4">
                    There is no billing history for this party in the selected
                    time period.
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
                          Grand Total
                        </th>
                        <th className="px-5 py-3 text-right font-bold align-middle">
                          Balance
                        </th>
                        <th className="px-5 py-3 text-center font-bold align-middle">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayBills.map((bill, idx) => {
                        const typeInfo = getBillTypeInfo(bill.bill_type);

                        return (
                          <tr
                            key={`${bill.bill_type}-${bill.id}`}
                            onClick={() => onBillClick(bill)}
                            className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer group align-middle"
                          >
                            <td className="px-5 py-4 text-[12px] font-medium text-slate-600 tabular-nums align-middle">
                              {formatDate(bill.bill_date || bill.created_at)}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${typeInfo.bg} ${typeInfo.color}`}
                              >
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[11px] font-bold text-slate-500 font-mono align-middle group-hover:text-blue-600 transition-colors">
                              {bill.bill_no}
                            </td>
                            <td className="px-5 py-4 text-right text-[13px] font-bold text-slate-900 tabular-nums tracking-tight align-middle">
                              {formatINR(bill.grand_total)}
                            </td>
                            <td className="px-5 py-4 text-right align-middle">
                              <span
                                className={`text-[13px] font-black tabular-nums tracking-tight ${Number(bill.balance_due) > 0 ? "text-rose-600" : "text-emerald-600"}`}
                              >
                                {formatINR(bill.balance_due)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right align-middle">
                              <div className="flex flex-col items-end">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${bill.status === "PAID" ? "bg-emerald-50 text-emerald-600" : bill.status === "PARTIAL" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
                                >
                                  {bill.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex flex-col md:hidden divide-y divide-slate-100 pb-4">
                    {displayBills.map((bill, idx) => {
                      const typeInfo = getBillTypeInfo(bill.bill_type);

                      return (
                        <div
                          key={`${bill.bill_type}-${bill.id}`}
                          onClick={() => onBillClick(bill)}
                          className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-slate-800 font-mono">
                              {bill.bill_no}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {formatDate(bill.bill_date || bill.created_at)}
                            </span>
                          </div>
                          <div className="flex items-end justify-between mt-1">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${typeInfo.bg} ${typeInfo.color}`}
                              >
                                {typeInfo.label}
                              </span>
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none ${bill.status === "PAID" ? "bg-emerald-50 text-emerald-600" : bill.status === "PARTIAL" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}
                              >
                                {bill.status}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Balance Due
                              </span>
                              <span
                                className={`text-[15px] font-black tabular-nums tracking-tight ${Number(bill.balance_due) > 0 ? "text-rose-600" : "text-emerald-600"}`}
                              >
                                {formatINR(bill.balance_due)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>,
    document.body,
  );
};

const SettlementsPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedPartyName, setSelectedPartyName] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);

  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("ALL_TIME");
  const [customMonth, setCustomMonth] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => setIsMounted(true), []);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/settlements?status=${filterStatus}&bill_type=${filterType === "ALL" ? "ALL" : filterType}`,
      );
      setBills(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (err) {
      setError("Failed to load settlements.");
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    setCurrentPage(1);
    fetchSettlements();
  }, [fetchSettlements]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (selectedBill || selectedPartyName)
        document.body.style.overflow = "hidden";
      else document.body.style.overflow = "";
    }
    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    };
  }, [selectedBill, selectedPartyName]);

  useEffect(() => {
    if (selectedBill && bills.length > 0) {
      const freshBill = bills.find(
        (b) =>
          b.id === selectedBill.id && b.bill_type === selectedBill.bill_type,
      );
      if (
        freshBill &&
        (freshBill.amount_paid !== selectedBill.amount_paid ||
          freshBill.balance_due !== selectedBill.balance_due ||
          freshBill.status !== selectedBill.status)
      ) {
        setSelectedBill(freshBill);
      }
    }
  }, [bills, selectedBill]);

  const searchFilteredBills = Array.isArray(bills)
    ? bills.filter((b) => {
        const party = b?.party_name || "";
        const billNo = b?.bill_no || "";
        const query = searchQuery || "";
        return (
          party.toLowerCase().includes(query.toLowerCase()) ||
          billNo.toLowerCase().includes(query.toLowerCase())
        );
      })
    : [];

  const allGroupedParties = useMemo(() => {
    const map = new Map();

    searchFilteredBills.forEach((bill) => {
      const pName = bill.party_name || "Unknown Party";
      if (!map.has(pName)) {
        map.set(pName, {
          party_name: pName,
          bills: [],
          total_value: 0,
          balance_due: 0,
          isJobworkParty: false,
        });
      }
      const group = map.get(pName);

      if (bill.bill_type === "JOB_WORK_RETURN") {
        group.isJobworkParty = true;
      }
      group.bills.push(bill);
    });

    return Array.from(map.values())
      .map((g) => {
        g.bills = g.bills.filter((bill) => {
          if (g.isJobworkParty && bill.bill_type === "PURCHASE") {
            return false;
          }
          return true;
        });

        g.bills.forEach((bill) => {
          g.total_value += Number(bill.grand_total || 0);
          g.balance_due += Number(bill.balance_due || 0);
        });

        if (g.balance_due <= 0 && g.total_value > 0) g.status = "PAID";
        else if (g.balance_due <= 0 && g.total_value === 0)
          g.status = "CLEARED";
        else if (g.balance_due < g.total_value) g.status = "PARTIAL";
        else g.status = "PENDING";

        g.bills.sort(
          (a, b) =>
            new Date(b.bill_date || b.created_at) -
            new Date(a.bill_date || a.created_at),
        );
        return g;
      })
      .filter((g) => g.bills.length > 0)
      .sort((a, b) => b.balance_due - a.balance_due);
  }, [searchFilteredBills]);

  const dashboardVisibleParties = useMemo(() => {
    return allGroupedParties.filter((group) => {
      return group.bills.some((bill) =>
        isBillInDateRange(
          bill.bill_date || bill.created_at,
          dateRange,
          customMonth,
        ),
      );
    });
  }, [allGroupedParties, dateRange, customMonth]);

  const activePartyData = useMemo(() => {
    if (!selectedPartyName) return null;
    return (
      allGroupedParties.find((g) => g.party_name === selectedPartyName) || {
        party_name: selectedPartyName,
        bills: [],
        isJobworkParty: false,
        total_value: 0,
        balance_due: 0,
      }
    );
  }, [selectedPartyName, allGroupedParties]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentParties = dashboardVisibleParties.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(dashboardVisibleParties.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5 print:hidden">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2"
        >
          <div className="flex-shrink-0 mt-1 min-w-0">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 truncate">
              Ledger Settlements
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight truncate">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              Manage Receivables & Payables by Client
            </div>
          </div>
          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full xl:flex-1 shrink-0">
              <div className="relative group w-full sm:flex-1 min-w-[200px]">
                <Search
                  className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search party or bill no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 p-1 rounded-full"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0">
                <DateFilterBar
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  customMonth={customMonth}
                  setCustomMonth={setCustomMonth}
                />
              </div>
              <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0 h-[40px] sm:h-[44px]">
                {[
                  { label: "All Bills", val: "ALL" },
                  { label: "Pending", val: "PENDING" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setFilterStatus(opt.val)}
                    className={`flex-1 shrink-0 min-w-[80px] sm:min-w-0 sm:flex-none px-2 sm:px-5 h-full rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-300 outline-none flex items-center justify-center whitespace-nowrap ${
                      filterStatus === opt.val
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border border-transparent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
              <div className="w-[80px]">Activity</div>
              <div className="flex-1 min-w-[200px]">Party Profile</div>
              <div className="w-[150px] text-right">Total Billed</div>
              <div className="w-[150px] text-right">Received</div>
              <div className="w-[150px] text-right">Balance Due</div>
              <div className="w-[100px] text-center">Status</div>
              <div className="w-[80px] text-right pr-2">Ledger</div>
            </div>

            {loading ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                  <Loader2
                    size={24}
                    className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 min-h-[40vh]">
                <div className="w-14 h-14 bg-rose-50 border border-rose-200/60 text-rose-600 rounded-[24px] flex items-center justify-center mb-5 shadow-sm">
                  <ShieldAlert size={24} strokeWidth={1.5} />
                </div>
                <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight mb-1.5">
                  Unable to Load Data
                </h2>
                <p className="text-[14px] font-medium text-slate-500 max-w-sm mb-6">
                  {error}
                </p>
                <button
                  onClick={() => fetchSettlements()}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] font-semibold transition-colors shadow-md"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div
                className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${currentParties.length === 0 ? "flex-1" : ""} overflow-y-auto`}
              >
                {currentParties.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Filter
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      No ledgers found
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm text-center px-4">
                      Try adjusting your search or filter settings to find what
                      you're looking for.
                    </p>
                  </div>
                ) : (
                  currentParties.map((group) => {
                    const receivedAmount =
                      group.total_value - group.balance_due;

                    return (
                      <div
                        key={group.party_name}
                        className="group flex flex-col w-full shrink-0"
                      >
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-4 sm:p-5">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-sm shrink-0">
                                <Building size={18} strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                  {group.party_name}
                                </h4>
                                <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                                  {group.bills.length} Bills Tracked
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-[6px] sm:rounded-[8px] border shrink-0 ${group.status === "PAID" || group.status === "CLEARED" ? "text-emerald-600 bg-emerald-50 border-emerald-200/60" : group.status === "PARTIAL" ? "text-amber-600 bg-amber-50 border-amber-200/60" : "text-rose-600 bg-rose-50 border-rose-200/60"}`}
                            >
                              {group.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100/80">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Billed
                              </span>
                              <CurrencyFormat
                                amount={group.total_value}
                                className="text-[12px] sm:text-[13px] font-bold text-slate-700"
                              />
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Balance Due
                              </span>
                              <CurrencyFormat
                                amount={group.balance_due}
                                className={`text-[15px] sm:text-[18px] font-black tracking-tight ${group.balance_due > 0 ? "text-rose-600" : "text-emerald-600"}`}
                              />
                            </div>
                          </div>
                          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100/80">
                            <button
                              onClick={() =>
                                setSelectedPartyName(group.party_name)
                              }
                              className="w-full text-[12px] sm:text-[13px] font-bold text-slate-700 hover:text-slate-900 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 py-2 sm:py-2.5 rounded-[10px] sm:rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95"
                            >
                              <Receipt size={14} strokeWidth={2.5} /> View Full
                              Ledger
                            </button>
                          </div>
                        </div>

                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                          <div className="w-[80px]">
                            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full border border-slate-200/60 tabular-nums">
                              {group.bills.length} Bills
                            </span>
                          </div>
                          <div className="flex-1 min-w-[200px] flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-[10px] bg-white border border-slate-200 shadow-sm text-slate-500 flex items-center justify-center shrink-0">
                              <Building size={16} strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                {group.party_name}
                              </h4>
                            </div>
                          </div>
                          <div className="w-[150px] text-right">
                            <CurrencyFormat
                              amount={group.total_value}
                              className="text-[13px] font-bold text-slate-700"
                            />
                          </div>
                          <div className="w-[150px] text-right">
                            <CurrencyFormat
                              amount={receivedAmount}
                              className="text-[13px] font-bold text-emerald-600/80"
                            />
                          </div>
                          <div className="w-[150px] text-right">
                            <CurrencyFormat
                              amount={group.balance_due}
                              className={`text-[14px] font-black tracking-tight ${group.balance_due > 0 ? "text-rose-600" : "text-emerald-600"}`}
                            />
                          </div>
                          <div className="w-[100px] flex items-center justify-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                group.status === "PAID" ||
                                group.status === "CLEARED"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : group.status === "PARTIAL"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {group.status}
                            </span>
                          </div>
                          <div className="w-[80px] text-right flex items-center justify-end pr-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() =>
                                setSelectedPartyName(group.party_name)
                              }
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="View Ledger"
                            >
                              <Eye size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {!loading && dashboardVisibleParties.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to
                  <span className="font-medium text-slate-900 mx-1">
                    {Math.min(indexOfLastItem, dashboardVisibleParties.length)}
                  </span>{" "}
                  of
                  <span className="font-medium text-slate-900 mx-1">
                    {dashboardVisibleParties.length}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedPartyName && activePartyData && (
          <SettlementDetailModal
            party={activePartyData}
            onClose={() => setSelectedPartyName(null)}
            onBillClick={(bill) => setSelectedBill(bill)}
            dateRange={dateRange}
            customMonth={customMonth}
          />
        )}
      </AnimatePresence>

      {isMounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {selectedBill && (
              <DrillDownModal
                bill={selectedBill}
                isJobworkParty={activePartyData?.isJobworkParty}
                onClose={() => setSelectedBill(null)}
                onPaymentSuccess={() => {
                  fetchSettlements();
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default SettlementsPage;
