import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  Loader2,
  FileText,
  Printer,
  Building2,
  Calendar,
  Box,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0,
  );

const DispatchDetailModal = ({ dispatchId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/dispatch/${dispatchId}`);
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dispatchId) fetchDetails();
  }, [dispatchId]);

  if (loading || !data) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm print:hidden">
        <Loader2
          className="animate-spin text-blue-600"
          size={32}
          strokeWidth={2}
        />
      </div>,
      document.body,
    );
  }

  const isJobWork = data.dispatch_type === "JOB_WORK_RETURN";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 font-sans antialiased print:block print:p-0 print:static">
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; margin: 0 !important; }
          #root { display: none !important; }
          #printable-invoice-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; display: block !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        `}
      </style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden cursor-pointer"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="relative w-full max-w-[900px] bg-slate-50 flex flex-col z-10 overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-2xl max-h-[95dvh] sm:max-h-[90dvh] transform-gpu print:hidden m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-200/80 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 pr-4 sm:pr-8 relative z-10 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-900 shadow-sm flex items-center justify-center text-white shrink-0">
              <FileText size={22} strokeWidth={1.5} className="sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col pt-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded-[6px] text-[8.5px] sm:text-[9px] font-bold uppercase tracking-widest border shrink-0 ${data.dispatch_type === "OWN_SALE" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : data.dispatch_type === "SCRAP_SALE" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}
                >
                  {data.dispatch_type.replace("_", " ")}
                </span>
                {!isJobWork && (
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[8.5px] sm:text-[9px] font-bold uppercase tracking-widest border shrink-0 ${data.payment_status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : data.payment_status === "PARTIAL" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}
                  >
                    {data.payment_status}
                  </span>
                )}
              </div>
              <h2 className="text-[18px] sm:text-[22px] font-bold text-slate-900 tracking-tight leading-tight line-clamp-1 pb-1">
                Invoice #{data.dispatch_no}
              </h2>
              <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight flex items-center gap-1.5">
                <Calendar size={12} strokeWidth={1.5} />
                {new Date(data.dispatch_date).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 z-20 shrink-0">
            <button
              onClick={() => window.print()}
              className="p-2 sm:p-2.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-[10px] sm:rounded-full transition-colors shadow-sm hidden sm:flex active:scale-95"
              title="Print Invoice"
            >
              <Printer size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-slate-100/80 border border-transparent text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm active:scale-95"
              title="Close"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col justify-center">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Building2
                    size={12}
                    strokeWidth={2}
                    className="sm:w-3.5 sm:h-3.5"
                  />{" "}
                  Billed To
                </p>
                <p className="text-[14px] sm:text-[16px] font-bold text-slate-900 tracking-tight">
                  {data.party_name}
                </p>
                <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 mt-1 leading-relaxed">
                  {data.address || "Client Address Not Provided"}
                </p>
              </div>
              <div className="bg-white p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col justify-center items-start sm:items-end sm:text-right">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {isJobWork ? "Challan Valuation" : "Invoice Value"}
                </p>
                <p className="text-[20px] sm:text-[24px] font-bold text-slate-900 tracking-tight tabular-nums leading-none">
                  {formatINR(data.grand_total)}
                </p>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-2 uppercase tracking-widest">
                  {data.lines.length} Item
                  {data.lines.length > 1 ? "s" : ""} Dispatched
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[11px] sm:text-[12px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <Box size={14} className="text-slate-400" /> Cargo Details
                </h3>
              </div>
              <div className="flex flex-col">
                <div className="hidden lg:flex px-5 py-3 border-b border-slate-100 bg-white">
                  <div className="w-[40%] text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Description
                  </div>
                  <div className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    Qty
                  </div>
                  <div className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    Rate
                  </div>
                  <div className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-2">
                    Total
                  </div>
                </div>

                <div className="divide-y divide-slate-100/80 bg-slate-50/30">
                  {data.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex flex-col lg:flex-row lg:items-center px-4 py-4 sm:px-5 sm:py-3 hover:bg-white transition-colors group"
                    >
                      <div className="w-full lg:w-[40%] flex justify-between lg:block mb-2 lg:mb-0">
                        <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 leading-tight">
                          {line.product_name ||
                            line.scrap_name ||
                            "Factory Scrap"}
                        </p>
                        <div className="lg:hidden text-[14px] font-bold text-slate-900 tabular-nums text-right">
                          {formatINR(line.line_total)}
                        </div>
                      </div>

                      <div className="w-full lg:w-[60%] flex items-center justify-between lg:justify-end">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:w-full lg:justify-end gap-1 lg:gap-0">
                          <div className="flex items-center gap-4 lg:contents">
                            <div className="lg:w-[33%] text-left lg:text-right">
                              <p className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                Quantity
                              </p>
                              <p className="text-[13px] sm:text-[14px] font-semibold text-slate-800 tabular-nums">
                                {Number(line.quantity).toLocaleString()}{" "}
                                <span className="text-[10px] text-slate-400 uppercase">
                                  {line.uom}
                                </span>
                              </p>
                            </div>

                            <div className="lg:w-[33%] text-left lg:text-right">
                              <p className="lg:hidden text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                Rate
                              </p>
                              <p className="text-[13px] sm:text-[14px] font-medium text-slate-600 tabular-nums">
                                {formatINR(line.sale_rate)}
                              </p>
                            </div>
                          </div>
                          <div className="hidden lg:block lg:w-[33%] text-right font-bold text-[14px] text-slate-900 tabular-nums pr-2">
                            {formatINR(line.line_total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col items-end">
                <div className="w-full sm:w-[280px] space-y-2 text-[12px] sm:text-[13px] font-medium text-slate-600">
                  <div className="flex justify-between pb-2 border-b border-slate-200/60">
                    <span className="font-semibold text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-500 mt-1">
                      Subtotal
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 text-[13px] sm:text-[14px]">
                      {formatINR(data.subtotal)}
                    </span>
                  </div>
                  {data.billing?.apply_gst &&
                    data.billing.gst_breakdown &&
                    Object.entries(data.billing.gst_breakdown).map(
                      ([type, details]) => (
                        <div
                          key={type}
                          className="flex justify-between text-blue-600 pt-1"
                        >
                          <span className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px]">
                            {type}{" "}
                            {data.billing.gst_mode === "AUTO" && (
                              <span className="text-[8.5px] sm:text-[9px] font-mono bg-blue-100/50 px-1.5 py-0.5 rounded-[4px]">
                                @{details.rate}%
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums font-bold text-[12px] sm:text-[13px]">
                            +{formatINR(details.amount)}
                          </span>
                        </div>
                      ),
                    )}
                  {data.billing?.apply_round_off &&
                    data.billing.round_off_amount !== 0 && (
                      <div className="flex justify-between text-slate-500 pt-1 font-medium text-[11px] sm:text-[12px]">
                        <span>Round Off</span>
                        <span className="tabular-nums">
                          {data.billing.round_off_amount > 0 ? "+" : ""}
                          {formatINR(data.billing.round_off_amount)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between font-bold text-[15px] sm:text-[16px] text-slate-900 border-t border-slate-300 pt-3 mt-3">
                    <span className="uppercase tracking-widest text-[11px] sm:text-[12px] mt-0.5">
                      Grand Total
                    </span>
                    <span className="tabular-nums text-[18px] sm:text-[20px]">
                      {formatINR(data.grand_total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border-t border-slate-200/80 sm:hidden z-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => window.print()}
            className="w-full h-[48px] bg-blue-600 text-white rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
          >
            <Printer size={16} strokeWidth={2.5} /> Print Invoice
          </button>
        </div>
      </motion.div>
      <div
        id="printable-invoice-container"
        className="hidden print:block w-full bg-white text-black font-sans text-[12px]"
      >
        <div className="border-[2px] border-slate-900 mx-auto w-full min-h-[250mm] flex flex-col box-border">
          <div className="bg-slate-100 border-b-[2px] border-slate-900 text-center py-2 font-bold text-[16px] tracking-[0.2em] uppercase text-slate-900">
            {isJobWork ? "DELIVERY CHALLAN" : "TAX INVOICE"}
          </div>

          <div className="flex border-b-[2px] border-slate-900">
            <div className="w-[55%] p-4 border-r-[2px] border-slate-900 bg-slate-50/50">
              <h1 className="text-[20px] font-bold uppercase tracking-wider text-slate-900 mb-1 leading-none">
                Maa Arbuda Metal
              </h1>
              <p className="font-semibold text-[11px] text-slate-700 tracking-wide">
                Manufacturer & Exporter of Stainless Steel
              </p>
              <div className="mt-2 text-[11px] leading-relaxed font-medium text-slate-800">
                <p>Shed No.389, Gopal Charan Industrial Estate</p>
                <p>Revenue Block No. 113, Pavan Industrial Daskrol</p>
                <p>Bakrol Bujrang, Ahmedabad, Gujarat - 382430</p>
              </div>
              <div className="mt-3 flex gap-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  GSTIN:{" "}
                  <span className="font-bold text-slate-900">
                    24BCPFPT7572L1ZY
                  </span>
                </p>
              </div>
            </div>
            <div className="w-[45%] flex flex-col">
              <div className="flex border-b-[2px] border-slate-900 flex-1">
                <div className="w-1/2 p-3 border-r-[2px] border-slate-900 flex flex-col justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    Invoice No.
                  </p>
                  <p className="font-bold text-[14px] text-slate-900">
                    {data.dispatch_no}
                  </p>
                </div>
                <div className="w-1/2 p-3 flex flex-col justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    Dated
                  </p>
                  <p className="font-bold text-[14px] text-slate-900">
                    {new Date(data.dispatch_date).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex flex-1">
                <div className="w-1/2 p-3 border-r-[2px] border-slate-900 flex flex-col justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    Place of Supply
                  </p>
                  <p className="font-semibold text-[12px] text-slate-900">
                    {data.address ? "As per Billing" : "Tamil Nadu"}
                  </p>
                </div>
                <div className="w-1/2 p-3 flex flex-col justify-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    Vehicle No.
                  </p>
                  <p className="font-semibold text-[12px] text-slate-900">:</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-[2px] border-slate-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Billed To
            </p>
            <h2 className="text-[16px] font-bold text-slate-900 uppercase tracking-tight">
              {data.party_name}
            </h2>
            <p className="whitespace-pre-wrap max-w-[60%] text-[11px] leading-relaxed mt-1 text-slate-800 font-medium">
              {data.address || "Address not provided"}
            </p>
            {data.phone && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Phone:{" "}
                <span className="font-bold text-slate-900">{data.phone}</span>
              </p>
            )}
          </div>

          {/* TABLE */}
          <table
            className="w-full text-left border-collapse border-b-[2px] border-slate-900"
            style={{ tableLayout: "fixed" }}
          >
            <thead className="border-b-[2px] border-slate-900 bg-slate-100">
              <tr>
                <th className="border-r-[2px] border-slate-900 p-2.5 text-center font-bold text-[10px] uppercase tracking-widest w-[8%]">
                  S.No
                </th>
                <th className="border-r-[2px] border-slate-900 p-2.5 font-bold text-[10px] uppercase tracking-widest w-[40%]">
                  Description of Goods
                </th>
                <th className="border-r-[2px] border-slate-900 p-2.5 text-right font-bold text-[10px] uppercase tracking-widest w-[12%]">
                  Quantity
                </th>
                <th className="border-r-[2px] border-slate-900 p-2.5 text-center font-bold text-[10px] uppercase tracking-widest w-[10%]">
                  UOM
                </th>
                <th className="border-r-[2px] border-slate-900 p-2.5 text-right font-bold text-[10px] uppercase tracking-widest w-[15%]">
                  Rate (₹)
                </th>
                <th className="p-2.5 text-right font-bold text-[10px] uppercase tracking-widest w-[15%]">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, idx) => (
                <tr key={line.id} className="border-b-[1px] border-slate-300">
                  <td className="border-r-[2px] border-slate-900 p-2.5 text-center align-top font-medium text-[12px]">
                    {idx + 1}
                  </td>
                  <td className="border-r-[2px] border-slate-900 p-2.5 align-top font-medium text-[12px]">
                    {line.product_name || line.scrap_name || "Factory Scrap"}
                  </td>
                  <td className="border-r-[2px] border-slate-900 p-2.5 text-right align-top font-medium text-[12px] tabular-nums">
                    {Number(line.quantity).toLocaleString()}
                  </td>
                  <td className="border-r-[2px] border-slate-900 p-2.5 text-center align-top text-slate-700 font-medium text-[12px]">
                    {line.uom}
                  </td>
                  <td className="border-r-[2px] border-slate-900 p-2.5 text-right align-top font-medium text-[12px] tabular-nums">
                    {Number(line.sale_rate).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2.5 text-right align-top font-semibold text-[12px] tabular-nums">
                    {Number(line.line_total).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Grouped totals and signatures to push to bottom naturally */}
          <div className="avoid-break mt-auto">
            <div className="flex border-t-[2px] border-slate-900 border-b-[2px] border-slate-900">
              {/* Left Side (Amount in words & Remarks) */}
              <div className="w-[60%] p-4 border-r-[2px] border-slate-900 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                    Amount Chargeable (in words)
                  </p>
                  <p className="font-bold text-[12px] uppercase leading-relaxed text-slate-900">
                    Indian Rupees {convertNumberToWords(data.grand_total)} Only
                  </p>
                </div>
                {data.remarks && (
                  <div className="mt-4 pt-3 border-t-[1px] border-slate-400">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                      Remarks / Details
                    </p>
                    <p className="text-[11px] italic font-medium text-slate-800">
                      {data.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side (Financial Math) */}
              <div className="w-[40%] bg-slate-50 flex flex-col">
                <div className="flex justify-between items-center p-2.5 px-4 border-b-[1px] border-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Subtotal
                  </span>
                  <span className="font-semibold text-[13px] tabular-nums">
                    {Number(data.subtotal).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {data.billing?.apply_gst &&
                  data.billing.gst_breakdown &&
                  Object.entries(data.billing.gst_breakdown).map(
                    ([type, details]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center p-2.5 px-4 border-b-[1px] border-slate-300"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                          Add: {type}{" "}
                          {data.billing.gst_mode === "AUTO" && (
                            <span className="font-mono text-[9px]">
                              @{details.rate}%
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-[12px] tabular-nums">
                          {Number(details.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ),
                  )}

                {data.billing?.apply_round_off &&
                  data.billing.round_off_amount !== 0 && (
                    <div className="flex justify-between items-center p-2.5 px-4 border-b-[1px] border-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        Round Off
                      </span>
                      <span className="font-semibold text-[12px] tabular-nums">
                        {data.billing.round_off_amount > 0 ? "+" : ""}
                        {Number(data.billing.round_off_amount).toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  )}

                {/* Grand total naturally sits at the bottom of this column */}
                <div className="flex justify-between items-center p-3 px-4 bg-slate-200/50 flex-1 border-t-[1px] border-slate-400">
                  <span className="text-[12px] font-bold uppercase tracking-widest text-slate-900">
                    Grand Total (₹)
                  </span>
                  <span className="font-bold text-[18px] tabular-nums text-slate-900">
                    {Number(data.grand_total).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex h-[120px]">
              <div className="w-[60%] p-4 border-r-[2px] border-slate-900 text-[10px] leading-relaxed">
                <table className="w-full font-medium text-slate-800"></table>
              </div>
              <div className="w-[40%] p-4 flex flex-col justify-between items-center text-center">
                <p className="font-bold uppercase tracking-wider text-[11px] text-slate-900 w-full text-right">
                  For Maa Arbuda Metal
                </p>
                <div className="w-full text-right flex flex-col items-end mt-auto">
                  <div className="border-t-[2px] border-slate-400 pt-1.5 w-[80%]">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                      Authorized Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          This is a computer generated invoice
        </div>
      </div>
    </div>,
    document.body,
  );
};

function convertNumberToWords(amount) {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const num = Math.floor(amount);
  if (num === 0) return "Zero";

  function convertToWords(n) {
    if (n < 20) return words[n];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + words[n % 10] : "")
      );
    if (n < 1000)
      return (
        words[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " and " + convertToWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        convertToWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 !== 0 ? " " + convertToWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convertToWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 !== 0 ? " " + convertToWords(n % 100000) : "")
      );
    return (
      convertToWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 !== 0 ? " " + convertToWords(n % 10000000) : "")
    );
  }
  return convertToWords(num);
}

export default DispatchDetailModal;
