import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  Search,
  Loader2,
  Undo2,
  X,
  CheckCircle2,
  Ban,
  Building,
  Package,
  HardHat,
  Truck,
  History,
  Calendar,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Box,
  Check,
  Lock,
  ClipboardList,
  Calculator,
  Workflow,
} from "lucide-react";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const BaseCardClass =
  "bg-white border border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 rounded-[24px] sm:rounded-[28px] relative flex flex-col w-full min-h-0 overflow-hidden";

const InputPremiumClass =
  "w-full min-w-0 h-[40px] sm:h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[12px] sm:text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400";
const SelectPremiumClass =
  "w-full min-w-0 h-[40px] sm:h-[44px] px-3 sm:px-4 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] text-[12px] sm:text-[13px] font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";
const LabelPremiumClass =
  "block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

const getSafeArray = (res) => {
  const d = res?.data;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.items)) return d.items;
  if (d.data && Array.isArray(d.data.data)) return d.data.data;
  if (d.data && Array.isArray(d.data.items)) return d.data.items;

  for (const key in d) {
    if (Array.isArray(d[key])) return d[key];
  }
  if (d.data && typeof d.data === "object") {
    for (const key in d.data) {
      if (Array.isArray(d.data[key])) return d.data[key];
    }
  }
  return [];
};

const PipelineCard = memo(({ name, data }) => (
  <motion.div
    variants={fadeScale}
    className="flex flex-col p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] bg-slate-50/60 hover:bg-white border border-slate-200/60 transition-colors shadow-sm w-[260px] sm:w-[280px] shrink-0 group"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0">
        <HardHat
          size={14}
          className="text-slate-500 w-4 h-4"
          strokeWidth={2.5}
        />
      </div>
      <h4 className="text-[13px] font-bold text-slate-800 tracking-tight truncate flex-1 min-w-0">
        {name}
      </h4>
    </div>
    <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200/80">
      <div className="min-w-0 pr-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
          Pending
        </p>
        <p className="text-[20px] font-bold text-slate-900 tracking-tight tabular-nums leading-none truncate">
          {data.pending.toFixed(2)}
          <span className="text-[11px] font-semibold text-slate-500 ml-1">
            {data.uom || "KG"}
          </span>
        </p>
      </div>
      <div className="pl-4 flex flex-col justify-center min-w-0 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 truncate">
          <ArrowUpRight size={12} className="text-slate-400 shrink-0" /> Sent:
          <span className="text-slate-900 tabular-nums ml-auto">
            {data.sent.toFixed(0)}
          </span>
        </p>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5 truncate">
          <ArrowDownRight size={12} className="text-slate-400 shrink-0" /> Rcvd:
          <span className="text-slate-900 tabular-nums ml-auto">
            {data.returned.toFixed(0)}
          </span>
        </p>
      </div>
    </div>
  </motion.div>
));

const JobCard = memo(({ job, onDrillDown, onReturn, onCancel, canDelete }) => {
  const isDone = job.status === "CLOSED";
  const isOpen = job.status === "OPEN";

  return (
    <motion.div
      layout
      variants={fadeScale}
      initial="hidden"
      animate="show"
      exit="hidden"
      className={BaseCardClass}
    >
      <div
        className={`absolute top-0 left-0 w-full h-[4px] ${isOpen ? "bg-blue-500" : isDone ? "bg-slate-300" : "bg-rose-500"}`}
      />
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full">
        <div className="flex justify-between items-start mb-5 gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-2 truncate">
              {job.job_no}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
              <Clock size={12} strokeWidth={2.5} className="shrink-0 w-3 h-3" />
              Sent: {new Date(job.out_date).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`shrink-0 px-2.5 py-1 rounded-[8px] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isOpen ? "bg-blue-50 text-blue-600 border-blue-200/60" : isDone ? "bg-slate-100 text-slate-600 border-slate-200/80" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
          >
            {isDone ? "Finished" : isOpen ? "Active" : "Canceled"}
          </span>
        </div>

        <div className="bg-slate-50/80 p-4 rounded-[16px] border border-slate-200/60 space-y-3 mb-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-tight min-w-0">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-slate-200/80 shadow-sm shrink-0">
              <HardHat
                size={14}
                strokeWidth={2.5}
                className="text-slate-400 w-3.5 h-3.5"
              />
            </div>
            <span className="truncate">{job.contractor_name}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-tight min-w-0">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-slate-200/80 shadow-sm shrink-0">
              <Package
                size={14}
                strokeWidth={2.5}
                className="text-slate-400 w-3.5 h-3.5"
              />
            </div>
            <span className="truncate">{job.semi_finished_name}</span>
          </div>
          {job.ownership_type === "JOB_WORK" && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200/80 px-2.5 py-1 rounded-[8px] shadow-sm mt-1 max-w-full min-w-0">
              <Building
                size={12}
                strokeWidth={2}
                className="shrink-0 text-slate-400 w-3 h-3"
              />
              <span className="shrink-0 font-semibold text-slate-500">
                Client:
              </span>
              <span className="truncate text-slate-800">{job.party_name}</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <div className="grid grid-cols-2 gap-4 mb-5 border-t border-slate-100/80 pt-5 divide-x divide-slate-100">
            <div className="min-w-0 pr-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 truncate">
                <ArrowUpRight
                  size={14}
                  strokeWidth={2.5}
                  className="text-blue-500 shrink-0 w-3.5 h-3.5"
                />{" "}
                Sent Out
              </p>
              <p className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-none tabular-nums tracking-tight truncate">
                {job.qty_sent}{" "}
                <span className="text-[11px] sm:text-[12px] font-semibold text-slate-400">
                  {job.uom}
                </span>
              </p>
            </div>
            <div className="text-right min-w-0 pl-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-end gap-1.5 mb-1.5 truncate">
                <ArrowDownRight
                  size={14}
                  strokeWidth={2.5}
                  className={`${isDone ? "text-emerald-500" : "text-amber-500"} shrink-0 w-3.5 h-3.5`}
                />{" "}
                Got Back
              </p>
              <p className="text-[18px] sm:text-[20px] font-bold text-slate-800 leading-none tabular-nums tracking-tight truncate">
                {job.returned_qty}{" "}
                <span className="text-[11px] sm:text-[12px] font-semibold text-slate-400">
                  {job.uom}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onDrillDown(job)}
              className="flex-1 h-[40px] bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[13px] rounded-[12px] transition-all border border-slate-200/80 shadow-sm flex items-center justify-center gap-2 active:scale-95 px-3 min-w-0 truncate"
            >
              <History size={16} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">Hist</span>
            </button>
            {isOpen && (
              <>
                <button
                  onClick={() => onReturn(job)}
                  className="flex-[2] h-[40px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-wide rounded-[12px] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:scale-95 px-3 border border-slate-700/50 min-w-0 truncate"
                >
                  <Undo2 size={16} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">Collect</span>
                </button>
                {Number(job.returned_qty) === 0 && canDelete && (
                  <button
                    onClick={() => onCancel(job.id)}
                    className="w-[40px] h-[40px] flex items-center justify-center bg-white hover:bg-rose-50 text-rose-500 rounded-[12px] transition-all border border-rose-200/80 shadow-sm active:scale-95 shrink-0"
                    title="Cancel Job & Return Stock"
                  >
                    <Ban size={16} strokeWidth={2.5} className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const ProductionBatchCard = memo(
  ({ batch, onReturn, onDrillDown, onCancelBatch, canDelete }) => {
    const isDone = batch.status === "CLOSED";
    const isOpen = batch.status === "OPEN";

    return (
      <motion.div
        layout
        variants={fadeScale}
        initial="hidden"
        animate="show"
        exit="hidden"
        className={BaseCardClass}
      >
        <div
          className={`absolute top-0 left-0 w-full h-[4px] ${isOpen ? "bg-blue-500" : isDone ? "bg-slate-300" : "bg-rose-500"}`}
        />
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full">
          <div className="flex justify-between items-start mb-5 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                  <Package size={12} strokeWidth={2.5} className="w-3 h-3" />
                </div>
                <span className="truncate">{batch.batch_no} (Batch)</span>
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                <Clock
                  size={12}
                  strokeWidth={2.5}
                  className="shrink-0 w-3 h-3"
                />
                Sent: {new Date(batch.out_date).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-[8px] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isOpen ? "bg-blue-50 text-blue-600 border-blue-200/60" : isDone ? "bg-slate-100 text-slate-600 border-slate-200/80" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
            >
              {isDone ? "Finished" : isOpen ? "Active" : "Canceled"}
            </span>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-[16px] border border-slate-200/60 mb-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] flex-1 overflow-hidden">
            <div className="flex items-center gap-2.5 text-[13px] font-bold text-slate-800 tracking-tight mb-3 min-w-0">
              <HardHat
                size={14}
                strokeWidth={2.5}
                className="text-slate-400 shrink-0 w-4 h-4"
              />
              <span className="truncate">{batch.contractor_name}</span>
            </div>
            <div className="space-y-2 border-t border-slate-200/80 pt-3">
              {batch.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-[11px] font-semibold text-slate-600 bg-white px-3 py-2 rounded-[10px] border border-slate-100 shadow-sm"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="truncate block text-slate-800 text-[12px]">
                      {item.semi_finished_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-slate-800 font-bold tabular-nums">
                        {item.returned_qty}
                      </span>
                      <span className="text-slate-400 mx-1 text-[10px]">/</span>
                      <span className="text-slate-500 font-medium tabular-nums">
                        {item.qty_sent}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 border-l border-slate-200/80 pl-3">
                      <button
                        onClick={() => onDrillDown(item)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-[8px] transition-colors"
                        title="Item History & Reversals"
                      >
                        <History
                          size={14}
                          strokeWidth={2.5}
                          className="w-3.5 h-3.5"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-4 mb-5 border-t border-slate-100/80 pt-5 divide-x divide-slate-100">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5 truncate">
                  <ArrowUpRight
                    size={14}
                    strokeWidth={2.5}
                    className="text-blue-500 shrink-0 w-3.5 h-3.5"
                  />{" "}
                  Sent Out
                </p>
                <p className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-none tabular-nums tracking-tight truncate">
                  {batch.qty_sent.toFixed(2)}
                </p>
              </div>
              <div className="text-right min-w-0 pl-4">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-end gap-1.5 mb-1.5 truncate">
                  <ArrowDownRight
                    size={14}
                    strokeWidth={2.5}
                    className={`${isDone ? "text-emerald-500" : "text-amber-500"} shrink-0 w-3.5 h-3.5`}
                  />{" "}
                  Got Back
                </p>
                <p className="text-[18px] sm:text-[20px] font-bold text-slate-800 leading-none tabular-nums tracking-tight truncate">
                  {batch.returned_qty.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {isOpen && (
                <button
                  onClick={() => onReturn(batch)}
                  className="flex-[2] h-[40px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-wide rounded-[12px] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 active:scale-95 px-3 border border-slate-700/50 min-w-0 truncate"
                >
                  <Undo2 size={16} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">Collect Batch</span>
                </button>
              )}
              {Number(batch.returned_qty) === 0 && canDelete && (
                <button
                  onClick={() => onCancelBatch(batch)}
                  className="w-[40px] h-[40px] flex items-center justify-center bg-white hover:bg-rose-50 text-rose-500 rounded-[12px] transition-all border border-rose-200/80 shadow-sm active:scale-95 shrink-0"
                  title="Cancel Batch & Return Stock"
                >
                  <Ban size={16} strokeWidth={2.5} className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

const GeneralBatchCard = memo(
  ({ batch, onReturn, onDrillDown, onCancelBatch, canDelete }) => {
    const isDone = batch.status === "CLOSED";
    const isOpen = batch.status === "OPEN";

    return (
      <motion.div
        layout
        variants={fadeScale}
        initial="hidden"
        animate="show"
        exit="hidden"
        className={BaseCardClass}
      >
        <div
          className={`absolute top-0 left-0 w-full h-[4px] ${isOpen ? "bg-purple-500" : isDone ? "bg-slate-300" : "bg-rose-500"}`}
        />
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col h-full">
          <div className="flex justify-between items-start mb-5 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-[16px] sm:text-[18px] font-bold text-purple-900 tracking-tight leading-none mb-2 flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm shrink-0">
                  <Layers size={12} strokeWidth={2.5} className="w-3 h-3" />
                </div>
                <span className="truncate">{batch.batch_no}</span>
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 truncate">
                <Clock
                  size={12}
                  strokeWidth={2.5}
                  className="shrink-0 w-3 h-3"
                />
                Taken: {new Date(batch.out_date).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-[8px] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border shadow-sm ${isOpen ? "bg-purple-50 text-purple-700 border-purple-200/60" : isDone ? "bg-slate-100 text-slate-600 border-slate-200/80" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
            >
              {isDone ? "Finished" : isOpen ? "Active" : "Canceled"}
            </span>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-[16px] border border-slate-200/60 mb-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] flex-1 overflow-hidden">
            <div className="flex items-center gap-2.5 text-[13px] font-bold text-slate-800 tracking-tight mb-3 min-w-0">
              <HardHat
                size={14}
                strokeWidth={2.5}
                className="text-slate-400 shrink-0 w-4 h-4"
              />
              <span className="truncate">{batch.contractor_name}</span>
            </div>
            <div className="space-y-2 border-t border-slate-200/80 pt-3">
              {batch.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-[11px] font-semibold text-slate-600 bg-white px-3 py-2 rounded-[10px] border border-slate-100 shadow-sm"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-[6px] text-[8px] font-bold uppercase tracking-widest border max-w-full truncate inline-block ${item.ownership_type === "OWN" ? "bg-slate-100 text-slate-600 border-slate-200/80" : "bg-amber-50 text-amber-700 border-amber-200/80"}`}
                      >
                        {item.ownership_type === "OWN"
                          ? "🏭 OWN"
                          : `🤝 JOB WORK: ${item.party_name}`}
                      </span>
                    </div>
                    <span className="truncate block text-slate-800 text-[12px]">
                      {item.semi_finished_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-slate-800 font-bold tabular-nums">
                        {item.returned_qty}
                      </span>
                      <span className="text-slate-400 mx-1 text-[10px]">/</span>
                      <span className="text-slate-500 font-medium tabular-nums">
                        {item.qty_sent}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 border-l border-slate-200/80 pl-3">
                      <button
                        onClick={() => onDrillDown(item)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-[8px] transition-colors"
                        title="Item History & Reversals"
                      >
                        <History
                          size={14}
                          strokeWidth={2.5}
                          className="w-3.5 h-3.5"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-4 mb-5 border-t border-slate-100/80 pt-5 divide-x divide-slate-100">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1.5 truncate">
                  Total Given
                </p>
                <p className="text-[18px] sm:text-[20px] font-bold text-slate-900 leading-none tabular-nums tracking-tight truncate">
                  {batch.qty_sent.toFixed(2)}
                </p>
              </div>
              <div className="text-right min-w-0 pl-4">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center justify-end gap-1 mb-1.5 truncate">
                  Total Rcvd
                </p>
                <p className="text-[18px] sm:text-[20px] font-bold text-slate-800 leading-none tabular-nums tracking-tight truncate">
                  {batch.returned_qty.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {isOpen && (
                <button
                  onClick={() => onReturn(batch)}
                  className="flex-1 h-[40px] bg-purple-600 hover:bg-purple-700 text-white font-bold text-[12px] uppercase tracking-widest rounded-[12px] transition-all shadow-[0_4px_12px_rgba(147,51,234,0.25)] flex items-center justify-center gap-2 active:scale-95 border border-purple-500 min-w-0 truncate"
                >
                  <Undo2 size={16} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">Receive Return</span>
                </button>
              )}
              {Number(batch.returned_qty) === 0 && canDelete && (
                <button
                  onClick={() => onCancelBatch(batch)}
                  className="w-[40px] h-[40px] flex items-center justify-center bg-white hover:bg-rose-50 text-rose-500 rounded-[12px] transition-all border border-rose-200/80 shadow-sm active:scale-95 shrink-0"
                  title="Reverse Entire Batch Take"
                >
                  <Ban size={16} strokeWidth={2.5} className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

const ContractorPage = () => {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("OPEN");

  const [semiStock, setSemiStock] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [semiMaster, setSemiMaster] = useState([]);
  const [finishedMaster, setFinishedMaster] = useState([]);

  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [returnModalJob, setReturnModalJob] = useState(null);
  const [drillDownJob, setDrillDownJob] = useState(null);
  const [drillDownData, setDrillDownData] = useState(null);
  const [isDrillLoading, setIsDrillLoading] = useState(false);

  const [isGeneralTakeOpen, setIsGeneralTakeOpen] = useState(false);
  const [generalReturnBatch, setGeneralReturnBatch] = useState(null);

  useEffect(() => {
    if (searchParams.get("action") === "new_job") setIsOutModalOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const delay = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(delay);
  }, [activeStatus, localSearch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/contractor?status=${activeStatus}&search=${localSearch}`;
      const [jobsRes, stockRes, personnelRes, semiRes, finishedRes] =
        await Promise.all([
          api.get(url),
          api.get("/contractor/semi-available"),
          api.get("/staff"),
          api
            .get("/products/semi-finished")
            .catch(() => ({ data: { data: [] } })),
          api.get("/products").catch(() => ({ data: { data: [] } })),
        ]);

      setJobs(
        getSafeArray(jobsRes).map((job) => {
          const sent = Number(job.qty_sent || 0);
          const returned = Number(job.qty_returned || job.returned_qty || 0);
          let pending = Number(job.pending_qty);
          if (isNaN(pending) || job.pending_qty == null)
            pending = sent - returned;
          return {
            ...job,
            qty_sent: sent,
            returned_qty: returned,
            pending_qty: pending,
          };
        }),
      );

      setSemiStock(getSafeArray(stockRes));
      setContractors(
        getSafeArray(personnelRes).filter(
          (p) => p.personnel_type === "CONTRACTOR",
        ),
      );

      setSemiMaster(getSafeArray(semiRes));
      setFinishedMaster(getSafeArray(finishedRes));
    } catch (error) {
      toast.error("Failed to load contractor data");
    } finally {
      setLoading(false);
    }
  };

  const pipeline = useMemo(() => {
    const pl = {};
    jobs.forEach((j) => {
      if (j.status === "OPEN") {
        const cName = j.contractor_name;
        if (!pl[cName])
          pl[cName] = { pending: 0, sent: 0, returned: 0, uom: j.uom };
        pl[cName].pending += Number(j.pending_qty);
        pl[cName].sent += Number(j.qty_sent);
        pl[cName].returned += Number(j.returned_qty);
      }
    });
    return pl;
  }, [jobs]);

  const displayItems = useMemo(() => {
    const bulkMap = {};
    const result = [];

    jobs.forEach((job) => {
      if (job.job_no.startsWith("GT-")) {
        const parts = job.job_no.split("-");
        const batchId = parts.slice(0, 2).join("-");
        if (!bulkMap[batchId]) {
          bulkMap[batchId] = {
            is_bulk: true,
            type: "GENERAL",
            id: batchId,
            batch_no: batchId,
            contractor_name: job.contractor_name,
            contractor_id: job.contractor_id,
            out_date: job.out_date,
            items: [],
          };
        }
        bulkMap[batchId].items.push(job);
      } else if (job.source_step_id) {
        const batchId = `PROD-${job.source_step_id}-${job.contractor_id}-${job.out_date}`;
        if (!bulkMap[batchId]) {
          bulkMap[batchId] = {
            is_bulk: true,
            type: "PRODUCTION",
            id: batchId,
            batch_no: job.job_no.replace(/-\d+$/, ""),
            contractor_name: job.contractor_name,
            contractor_id: job.contractor_id,
            out_date: job.out_date,
            source_step_id: job.source_step_id,
            production_order_id: job.production_order_id,
            items: [],
          };
        }
        bulkMap[batchId].items.push(job);
      } else {
        result.push({ ...job, is_bulk: false });
      }
    });

    Object.values(bulkMap).forEach((batch) => {
      if (batch.type === "PRODUCTION" && batch.items.length === 1) {
        result.push({ ...batch.items[0], is_bulk: false });
      } else {
        const hasOpen = batch.items.some((i) => i.status === "OPEN");
        const hasCanceled = batch.items.every((i) => i.status === "CANCELLED");
        batch.status = hasCanceled ? "CANCELLED" : hasOpen ? "OPEN" : "CLOSED";
        batch.qty_sent = batch.items.reduce(
          (sum, i) => sum + Number(i.qty_sent),
          0,
        );
        batch.returned_qty = batch.items.reduce(
          (sum, i) => sum + Number(i.returned_qty),
          0,
        );
        result.push(batch);
      }
    });

    return result.sort((a, b) => new Date(b.out_date) - new Date(a.out_date));
  }, [jobs]);

  const generalJobs = displayItems.filter(
    (item) => item.is_bulk && item.type === "GENERAL",
  );
  const productionJobs = displayItems.filter(
    (item) => !item.is_bulk || item.type === "PRODUCTION",
  );

  const handleCancelJob = async (id) => {
    if (
      !window.confirm(
        "Are you sure? This will cancel the job and return the stock to your factory.",
      )
    )
      return;
    try {
      await api.delete(`/contractor/${id}`);
      toast.success("Job canceled. Stock returned.");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to cancel job");
    }
  };

  const handleCancelBatch = async (batch) => {
    if (
      !window.confirm(
        `Are you sure you want to reverse the entire Batch (${batch.batch_no})?`,
      )
    )
      return;
    try {
      await Promise.all(
        batch.items.map((item) => api.delete(`/contractor/${item.id}`)),
      );
      toast.success("Entire batch reversed successfully.");
      fetchData();
    } catch (e) {
      toast.error("Failed to reverse some items. Check their history.");
      fetchData();
    }
  };

  const openDrillDown = async (job) => {
    setDrillDownJob(job);
    setIsDrillLoading(true);
    try {
      const res = await api.get(`/contractor/${job.id}`);
      setDrillDownData(res.data.data);
    } catch (e) {
      toast.error("Failed to load history");
      setDrillDownJob(null);
    } finally {
      setIsDrillLoading(false);
    }
  };

  const handleReverseReturn = async (returnId) => {
    if (
      !window.confirm(
        "Are you sure you want to reverse this entry? This puts balance back on the job.",
      )
    )
      return;
    try {
      await api.post(`/contractor/return/${returnId}/reverse`);
      toast.success("Entry reversed successfully.");
      setDrillDownJob(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reverse entry.");
    }
  };

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased pb-8 selection:bg-blue-500 selection:text-white">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 sm:gap-8 h-full"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-2 px-1"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1.5 flex items-center gap-3">
              Outside Work
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Track materials sent out and received back
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto min-w-0">
            <div className="relative group flex-1 w-full sm:min-w-[430px]">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={18}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search jobs..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full h-[44px] pl-11 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <div className="flex items-center p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full w-full h-[44px]">
                {["ALL", "OPEN", "CLOSED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveStatus(status)}
                    className={`flex-1 sm:flex-none px-5 h-full rounded-[10px] sm:rounded-full text-[12px] sm:text-[13px] tracking-wide transition-all duration-300 outline-none flex items-center justify-center whitespace-nowrap min-w-[70px] ${activeStatus === status ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900 font-semibold border border-transparent"}`}
                  >
                    {status === "OPEN"
                      ? "Active"
                      : status === "CLOSED"
                        ? "Finished"
                        : "All"}
                  </button>
                ))}
              </div>
            </div>

            {can?.("CONTRACTOR_IO", "can_add") && (
              <div className="flex gap-3 w-full sm:w-auto shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsGeneralTakeOpen(true)}
                  className="flex-1 sm:flex-none h-[44px] px-5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-[14px] sm:rounded-full font-bold text-[13px] tracking-wide transition-colors flex items-center justify-center gap-2 border border-purple-200/80 shadow-sm whitespace-nowrap"
                >
                  <Layers size={16} strokeWidth={2.5} className="w-4 h-4" />{" "}
                  Give
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsOutModalOpen(true)}
                  className="flex-[1.5] sm:flex-none h-[44px] px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] sm:rounded-full font-semibold text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 whitespace-nowrap"
                >
                  <Truck
                    size={16}
                    strokeWidth={1.5}
                    className="text-white/90 w-4 h-4"
                  />{" "}
                  Production
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-6 sm:gap-8 min-h-0 px-1 sm:px-0">
          <AnimatePresence>
            {Object.keys(pipeline).length > 0 && activeStatus !== "CLOSED" && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="w-full shrink-0"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={16} className="text-slate-500 w-4 h-4" />
                  <h2 className="text-[14px] sm:text-[16px] font-bold text-slate-900 tracking-tight uppercase">
                    Currently Outside
                  </h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
                  {Object.entries(pipeline).map(([name, data]) => (
                    <div key={name} className="snap-start shrink-0">
                      <PipelineCard name={name} data={data} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col w-full flex-1">
            <div className="flex items-center justify-between gap-3 mb-5 pt-1">
              <h2 className="text-[14px] sm:text-[16px] font-bold text-slate-900 tracking-tight uppercase truncate min-w-0">
                Job Records
              </h2>
              <span className="text-[12px] font-bold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-3 py-1 rounded-[8px] shadow-sm flex items-center shrink-0 whitespace-nowrap">
                {displayItems.length} Record{displayItems.length !== 1 && "s"}
              </span>
            </div>

            <div className="w-full">
              {loading ? (
                <div className="w-full h-full flex flex-col items-center justify-center min-h-[40vh] bg-transparent">
                  <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-500 w-8 h-8"
                      strokeWidth={2}
                    />
                  </div>
                </div>
              ) : displayItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full py-24 flex flex-col items-center justify-center bg-white rounded-[28px] border border-dashed border-slate-200"
                >
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-4">
                    <Truck
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400 w-7 h-7"
                    />
                  </div>
                  <p className="text-[16px] font-bold text-slate-800 tracking-tight">
                    No records found
                  </p>
                  <p className="text-[14px] font-medium text-slate-500 mt-1 text-center px-4">
                    Change your filters or send a new job out.
                  </p>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-10">
                  {generalJobs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-purple-50 border border-purple-100 text-purple-600 shrink-0">
                          <Layers
                            size={14}
                            strokeWidth={2.5}
                            className="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 tracking-tight truncate">
                            General Takes
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-500 truncate">
                            Bulk operations not tied to production
                          </p>
                        </div>
                        <div className="ml-auto flex items-center justify-center px-3 h-[24px] rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 border border-slate-200/60 shadow-sm shrink-0">
                          {generalJobs.length}
                        </div>
                      </div>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                      >
                        <AnimatePresence mode="popLayout">
                          {generalJobs.map((item) => (
                            <GeneralBatchCard
                              key={item.id}
                              batch={item}
                              onReturn={setGeneralReturnBatch}
                              onDrillDown={openDrillDown}
                              onCancelBatch={handleCancelBatch}
                              canDelete={can?.("CONTRACTOR_IO", "can_delete")}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  )}

                  {productionJobs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            className="w-4 h-4"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 tracking-tight truncate">
                            Production Linked
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-500 truncate">
                            Individual and multi-item jobs mapped to factory
                            orders
                          </p>
                        </div>
                        <div className="ml-auto flex items-center justify-center px-3 h-[24px] rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 border border-slate-200/60 shadow-sm shrink-0">
                          {productionJobs.length}
                        </div>
                      </div>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                      >
                        <AnimatePresence mode="popLayout">
                          {productionJobs.map((item) =>
                            item.is_bulk ? (
                              <ProductionBatchCard
                                key={item.id}
                                batch={item}
                                onReturn={setGeneralReturnBatch}
                                onDrillDown={openDrillDown}
                                onCancelBatch={handleCancelBatch}
                                canDelete={can?.("CONTRACTOR_IO", "can_delete")}
                              />
                            ) : (
                              <JobCard
                                key={item.id}
                                job={item}
                                onDrillDown={openDrillDown}
                                onReturn={setReturnModalJob}
                                onCancel={handleCancelJob}
                                canDelete={can?.("CONTRACTOR_IO", "can_delete")}
                              />
                            ),
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOutModalOpen && (
          <OutwardModal
            semiStock={semiStock}
            semiMaster={semiMaster}
            finishedMaster={finishedMaster}
            contractors={contractors}
            urlParams={searchParams}
            onClose={() => {
              setIsOutModalOpen(false);
              setSearchParams(new URLSearchParams());
            }}
            onSuccess={() => {
              setIsOutModalOpen(false);
              setSearchParams(new URLSearchParams());
              fetchData();
            }}
          />
        )}
        {isGeneralTakeOpen && (
          <GeneralTakeModal
            semiStock={semiStock}
            semiMaster={semiMaster}
            contractors={contractors}
            onClose={() => setIsGeneralTakeOpen(false)}
            onSuccess={() => {
              setIsGeneralTakeOpen(false);
              fetchData();
            }}
          />
        )}
        {generalReturnBatch && (
          <GeneralReturnModal
            batch={generalReturnBatch}
            semiFinishedMaster={semiMaster}
            finishedMaster={finishedMaster}
            onClose={() => setGeneralReturnBatch(null)}
            onSuccess={() => {
              setGeneralReturnBatch(null);
              fetchData();
            }}
          />
        )}
        {returnModalJob && (
          <ReturnModal
            job={returnModalJob}
            semiFinishedMaster={semiMaster}
            finishedMaster={finishedMaster}
            onClose={() => setReturnModalJob(null)}
            onSuccess={() => {
              setReturnModalJob(null);
              fetchData();
            }}
          />
        )}
        {drillDownJob && (
          <DrillDownModal
            job={drillDownJob}
            data={drillDownData}
            loading={isDrillLoading}
            onClose={() => setDrillDownJob(null)}
            onReverse={handleReverseReturn}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const OutwardModal = ({
  semiStock,
  semiMaster,
  finishedMaster,
  contractors,
  urlParams,
  onClose,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const targetItemId = urlParams.get("item_id");
  const targetQty = urlParams.get("qty");
  const sourceStepId = urlParams.get("source_step_id");
  const productionOrderId = urlParams.get("production_order_id");
  const targetContractorId = urlParams.get("contractor_id");

  const [checkedItems, setCheckedItems] = useState({});

  const [prodContext, setProdContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(!!productionOrderId);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => (document.body.style.overflow = originalStyle);
  }, []);

  useEffect(() => {
    if (productionOrderId) {
      api
        .get(`/production/${productionOrderId}`)
        .then((res) => {
          const payload = res.data?.data || res.data;

          let stepInputs = [];
          let stepOutputs = [];

          if (payload.steps && Array.isArray(payload.steps)) {
            const step = payload.steps.find(
              (s) => String(s.id) === String(sourceStepId),
            );
            if (step) {
              stepInputs = step.inputs || [];
              stepOutputs = step.outputs || [];
            }
          }

          if (stepInputs.length === 0 && targetItemId && targetQty) {
            const ids = targetItemId.split(",");
            const qtys = targetQty.split(",");
            stepInputs = ids.map((id, idx) => {
              const master = semiMaster.find(
                (m) => String(m.id) === String(id),
              );
              return {
                item_id: id,
                item_name: master
                  ? master.item_name || master.semi_finished_name
                  : `Item #${id}`,
                qty: qtys[idx] || 0,
                uom: master ? master.default_uom : "KG",
              };
            });
          }

          if (stepOutputs.length === 0 && payload.planned_outputs) {
            stepOutputs = payload.planned_outputs.filter(
              (o) =>
                !sourceStepId || String(o.step_id) === String(sourceStepId),
            );
          }

          setProdContext({
            ownership:
              payload.business_model === "JOB_WORK" ? "JOB_WORK" : "OWN",
            party_id: payload.party_id,
            production_no:
              payload.production_no ||
              payload.batch_no ||
              `PRD-${productionOrderId}`,
            inputs: stepInputs,
            outputs: stepOutputs,
          });
        })
        .catch(() => toast.error("Failed to verify production context"))
        .finally(() => setIsLoadingContext(false));
    } else {
      setIsLoadingContext(false);
    }
  }, [productionOrderId, sourceStepId, targetItemId, targetQty, semiMaster]);

  const getStockKey = (stock) =>
    `${stock.semi_finished_id}_${stock.ownership_type}_${stock.owner_party_id || "none"}`;

  const combinedStock = useMemo(() => {
    if (isLoadingContext) return [];

    let list = [...(semiStock || [])];

    if (sourceStepId && targetItemId) {
      const allowedIds = targetItemId.split(",").map(Number);
      const passedQtys = targetQty ? targetQty.split(",").map(Number) : [];

      list = list.filter((s) =>
        allowedIds.includes(Number(s.semi_finished_id)),
      );

      if (prodContext) {
        list = list.filter((s) => s.ownership_type === prodContext.ownership);
        if (prodContext.ownership === "JOB_WORK") {
          list = list.filter(
            (s) => String(s.owner_party_id) === String(prodContext.party_id),
          );
        }
      }

      list = list.map((s) => {
        const idx = allowedIds.indexOf(Number(s.semi_finished_id));
        if (
          idx !== -1 &&
          passedQtys[idx] !== undefined &&
          !isNaN(passedQtys[idx])
        ) {
          return {
            ...s,
            balance: Math.min(Number(s.balance), passedQtys[idx]),
          };
        }
        return s;
      });
    } else {
      (semiMaster || []).forEach((masterItem) => {
        const exists = list.some(
          (s) =>
            Number(s.semi_finished_id) === Number(masterItem.id) &&
            s.ownership_type === "OWN",
        );
        if (!exists) {
          list.push({
            semi_finished_id: masterItem.id,
            display_name: masterItem.item_name || masterItem.semi_finished_name,
            ownership_type: "OWN",
            owner_party_id: null,
            party_name: null,
            balance: 0,
            uom: masterItem.default_uom || "KG",
          });
        }
      });
    }

    return list.sort((a, b) =>
      a.ownership_type !== b.ownership_type
        ? a.ownership_type.localeCompare(b.ownership_type)
        : a.display_name.localeCompare(b.display_name),
    );
  }, [
    semiStock,
    semiMaster,
    sourceStepId,
    targetItemId,
    targetQty,
    prodContext,
    isLoadingContext,
  ]);

  const [form, setForm] = useState({
    job_no: `JOB-${Date.now().toString().slice(-5)}`,
    out_date: new Date().toISOString().split("T")[0],
    contractor_id: targetContractorId || "",
    remarks: "",
  });

  useEffect(() => {
    if (sourceStepId && combinedStock.length > 0 && !isLoadingContext) {
      setCheckedItems((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const autoSelected = {};
        combinedStock.forEach((stock) => {
          const key = getStockKey(stock);
          if (stock.balance > 0) {
            autoSelected[key] = {
              checked: true,
              qty_sent: stock.balance.toString(),
            };
          }
        });
        return autoSelected;
      });
    }
  }, [combinedStock, sourceStepId, isLoadingContext]);

  const handleCheck = (key) => {
    setCheckedItems((prev) => {
      const current = prev[key] || { checked: false, qty_sent: "" };
      return { ...prev, [key]: { ...current, checked: !current.checked } };
    });
  };

  const updateCheckedItem = (key, field, value) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const selectedKeys = Object.keys(checkedItems).filter(
      (k) => checkedItems[k].checked,
    );
    if (selectedKeys.length === 0)
      return toast.error("Please tick at least one material to send.");

    for (let key of selectedKeys) {
      const data = checkedItems[key];
      const stock = combinedStock.find((s) => getStockKey(s) === key);

      if (!stock) continue;
      if (!data.qty_sent || Number(data.qty_sent) <= 0)
        return toast.error(`Enter a valid quantity for ${stock.display_name}`);
      if (Number(data.qty_sent) > Number(stock.balance) + 0.001)
        return toast.error(`Exceeds stock limit for ${stock.display_name}`);
    }

    setLoading(true);
    try {
      const baseJobNo = form.job_no;
      const promises = selectedKeys.map((key, i) => {
        const stock = combinedStock.find((s) => getStockKey(s) === key);
        const data = checkedItems[key];
        const jobNo =
          selectedKeys.length > 1 ? `${baseJobNo}-${i + 1}` : baseJobNo;

        return api.post("/contractor", {
          job_no: jobNo,
          contractor_id: Number(form.contractor_id),
          out_date: form.out_date,
          ownership_type: stock.ownership_type,
          owner_party_id: stock.owner_party_id
            ? Number(stock.owner_party_id)
            : null,
          semi_finished_id: Number(stock.semi_finished_id),
          qty_sent: Number(data.qty_sent),
          uom: stock.uom,
          remarks: form.remarks,
          production_order_id: productionOrderId
            ? Number(productionOrderId)
            : null,
          source_step_id: sourceStepId ? Number(sourceStepId) : null,
        });
      });

      await Promise.all(promises);
      toast.success("Material sent out successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create job.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const filteredStock = combinedStock.filter((s) =>
    s.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedCount = Object.values(checkedItems).filter(
    (i) => i.checked,
  ).length;

  const totalQty = Object.keys(checkedItems)
    .filter((k) => checkedItems[k].checked)
    .reduce((sum, k) => sum + Number(checkedItems[k].qty_sent || 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* HEADER */}
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
              Send Material Out
            </h2>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 truncate">
              {sourceStepId
                ? "Production Linked Dispatch"
                : "Create a new outside job"}
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

      {/* WORKSPACE */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase, delay: 0.05 }}
        className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 sm:p-4 gap-4"
      >
        {/* LEFT PANE */}
        <form
          id="outward-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full"
        >
          <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
              <div className="min-w-0 flex flex-col">
                <label className={LabelPremiumClass}>Job Number</label>
                <input
                  type="text"
                  required
                  value={form.job_no}
                  onChange={(e) => setForm({ ...form, job_no: e.target.value })}
                  className={InputPremiumClass}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <label className={LabelPremiumClass}>Dispatch Date</label>
                <div className="flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border">
                  <Calendar
                    size={14}
                    strokeWidth={2}
                    className="text-slate-400 shrink-0 mr-1.5"
                  />
                  <input
                    type="date"
                    required
                    value={form.out_date}
                    onChange={(e) =>
                      setForm({ ...form, out_date: e.target.value })
                    }
                    className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1 flex flex-col min-w-0">
                <label className={LabelPremiumClass}>Select Vendor</label>
                <select
                  required
                  value={form.contractor_id}
                  onChange={(e) =>
                    setForm({ ...form, contractor_id: e.target.value })
                  }
                  className={SelectPremiumClass}
                >
                  <option value="" disabled>
                    -- Choose Vendor --
                  </option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!isLoadingContext &&
            prodContext &&
            (prodContext.inputs?.length > 0 ||
              prodContext.outputs?.length > 0) && (
              <div className="bg-blue-50/40 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-blue-100/80 shadow-sm shrink-0 w-full min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Workflow
                    size={16}
                    strokeWidth={2.5}
                    className="text-blue-500 shrink-0"
                  />
                  <h3 className="text-[13px] font-bold text-blue-900 uppercase tracking-widest truncate">
                    Production Requirements
                    {prodContext.production_no && (
                      <span className="text-blue-600/70 ml-1">
                        ({prodContext.production_no})
                      </span>
                    )}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inputs List */}
                  <div className="bg-white/80 rounded-[14px] p-3 border border-blue-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ArrowUpRight size={12} className="text-amber-500" /> Send
                      to Vendor
                    </p>
                    <ul className="space-y-1.5">
                      {prodContext.inputs.map((inp, i) => (
                        <li
                          key={i}
                          className="text-[12px] flex justify-between items-center text-slate-700"
                        >
                          <span className="font-medium truncate pr-2">
                            {inp.item_name ||
                              inp.semi_finished_name ||
                              inp.name ||
                              `Item #${inp.item_id || inp.raw_material_id || inp.semi_finished_id}`}
                          </span>
                          <span className="font-bold tabular-nums text-slate-900 shrink-0">
                            {Number(
                              inp.qty || inp.planned_qty || inp.quantity || 0,
                            ).toFixed(2)}{" "}
                            {inp.uom || "KG"}
                          </span>
                        </li>
                      ))}
                      {(!prodContext.inputs ||
                        prodContext.inputs.length === 0) && (
                        <li className="text-[12px] text-slate-400 italic">
                          No explicit inputs listed
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-white/80 rounded-[14px] p-3 border border-blue-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ArrowDownRight size={12} className="text-emerald-500" />{" "}
                      Expected Return
                    </p>
                    <ul className="space-y-1.5">
                      {prodContext.outputs.map((out, i) => {
                        const resolvedName =
                          out.item_name ||
                          out.product_name ||
                          out.semi_finished_name ||
                          out.name ||
                          `Item #${out.item_id || out.product_id || out.semi_finished_id}`;
                        return (
                          <li
                            key={i}
                            className="text-[12px] flex justify-between items-center text-slate-700"
                          >
                            <span className="font-medium truncate pr-2">
                              {resolvedName}
                            </span>
                            <span className="font-bold tabular-nums text-slate-900 shrink-0">
                              {Number(
                                out.qty || out.planned_qty || out.quantity || 0,
                              ).toFixed(2)}{" "}
                              {out.uom || "KG"}
                            </span>
                          </li>
                        );
                      })}
                      {(!prodContext.outputs ||
                        prodContext.outputs.length === 0) && (
                        <li className="text-[12px] text-slate-400 italic">
                          No specific outputs mapped
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] min-w-0 lg:overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
              <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Package size={14} className="text-slate-400" /> Select Material
              </h3>
              {!sourceStepId && (
                <div className="relative w-full sm:w-[250px]">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                    strokeWidth={2}
                  />
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`${InputPremiumClass} !pl-10 h-[36px]`}
                  />
                </div>
              )}
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-3 bg-slate-50/30 scrollbar-hide min-w-0 space-y-3">
              {isLoadingContext ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="animate-spin text-slate-400 w-6 h-6" />
                </div>
              ) : filteredStock.length === 0 ? (
                <div className="text-center py-6 text-[13px] text-slate-400 font-medium border border-dashed border-slate-200 rounded-[16px]">
                  No matching materials found for this Production Order.
                </div>
              ) : (
                filteredStock.map((stock) => {
                  const key = getStockKey(stock);
                  const data = checkedItems[key] || {};
                  const isChecked = !!data.checked;
                  const isExceeding =
                    data.qty_sent && Number(data.qty_sent) > stock.balance;
                  const isZeroStock = Number(stock.balance) === 0;

                  return (
                    <div
                      key={key}
                      className={`border transition-all duration-300 rounded-[16px] overflow-hidden ${isChecked ? "border-slate-800 bg-slate-50/60 shadow-sm" : "border-slate-200/80 hover:border-slate-300 bg-white"}`}
                    >
                      <label className="flex items-center gap-4 p-4 cursor-pointer">
                        <div
                          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-slate-800 border-slate-800 text-white" : "bg-slate-50 border-slate-300"}`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => handleCheck(key)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-widest border max-w-full truncate inline-block ${stock.ownership_type === "OWN" ? "bg-slate-100 text-slate-600 border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]" : "bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm"}`}
                            >
                              {stock.ownership_type === "OWN"
                                ? "🏭 OWN"
                                : `🤝 JOB WORK: ${stock.party_name}`}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-slate-900 truncate tracking-tight">
                            {stock.display_name}
                          </p>
                          <p
                            className={`text-[11px] font-semibold mt-1 ${isZeroStock ? "text-rose-500" : "text-slate-500"}`}
                          >
                            Avail: {stock.balance} {stock.uom}
                          </p>
                        </div>
                        {isChecked && (
                          <div
                            onClick={(e) => e.preventDefault()}
                            className="relative w-[120px] sm:w-[150px]"
                          >
                            <input
                              type="number"
                              step="0.01"
                              required={isChecked}
                              value={data.qty_sent || ""}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (val !== "") {
                                  if (Number(val) > stock.balance) {
                                    val = stock.balance.toString();
                                    toast.error(`Capped at max stock`, {
                                      id: "cap",
                                    });
                                  } else if (Number(val) < 0) val = "0";
                                }
                                updateCheckedItem(key, "qty_sent", val);
                              }}
                              placeholder="Qty"
                              className={`${InputPremiumClass} pr-12 tabular-nums ${isExceeding ? "!border-rose-500 !bg-rose-50 !text-rose-600 focus:ring-rose-500/10" : ""}`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                              <span className="text-[11px] font-bold text-slate-400 truncate max-w-[40px]">
                                {stock.uom}
                              </span>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 w-full mb-4 lg:mb-0">
            <input
              type="text"
              placeholder="Additional remarks, instructions..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={InputPremiumClass}
            />
          </div>
        </form>

        {/* RIGHT PANE: Summary */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
              <ClipboardList size={14} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                Dispatch Summary
              </h4>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                Preview & Confirm
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide min-w-0">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[12px] sm:text-[13px] font-semibold">
                  Selected Items
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                  {selectedCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-3">
                <span className="text-[12px] sm:text-[13px] font-semibold">
                  Total Quantity
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                  {totalQty.toFixed(2)}
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 max-h-[200px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Item Preview
                  </p>
                  {Object.keys(checkedItems)
                    .filter((k) => checkedItems[k].checked)
                    .map((key) => {
                      const stock = combinedStock.find(
                        (s) => getStockKey(s) === key,
                      );
                      const data = checkedItems[key];
                      if (!stock) return null;
                      return (
                        <div
                          key={key}
                          className="flex justify-between items-center py-1.5 text-[12px]"
                        >
                          <span className="text-slate-700 font-semibold truncate pr-2">
                            {stock.display_name}
                          </span>
                          <span className="text-slate-900 font-black tabular-nums shrink-0">
                            {data.qty_sent || 0} {stock.uom}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="outward-form"
              disabled={loading || selectedCount === 0 || isLoadingContext}
              className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-md hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={16} />{" "}
                  Sending...
                </>
              ) : (
                <>
                  <Truck size={16} strokeWidth={2.5} /> Confirm Dispatch
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

const GeneralTakeModal = ({
  semiStock,
  semiMaster,
  contractors,
  onClose,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const combinedStock = useMemo(() => {
    let list = [...(semiStock || [])];
    (semiMaster || []).forEach((masterItem) => {
      const exists = list.some(
        (s) =>
          Number(s.semi_finished_id) === Number(masterItem.id) &&
          s.ownership_type === "OWN",
      );
      if (!exists) {
        list.push({
          semi_finished_id: masterItem.id,
          display_name: masterItem.item_name || masterItem.semi_finished_name,
          ownership_type: "OWN",
          owner_party_id: null,
          party_name: null,
          balance: 0,
          uom: masterItem.default_uom || "KG",
        });
      }
    });
    return list.sort((a, b) =>
      a.ownership_type !== b.ownership_type
        ? a.ownership_type.localeCompare(b.ownership_type)
        : a.display_name.localeCompare(b.display_name),
    );
  }, [semiStock, semiMaster]);

  const [form, setForm] = useState({
    contractor_id: "",
    out_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = originalStyle);
  }, []);
  useEffect(() => setMounted(true), []);

  const getStockKey = (stock) =>
    `${stock.semi_finished_id}_${stock.ownership_type}`;

  const handleCheck = (key) => {
    setCheckedItems((prev) => {
      const current = prev[key] || { checked: false, qty_sent: "" };
      return { ...prev, [key]: { ...current, checked: !current.checked } };
    });
  };
  const updateCheckedItem = (key, field, value) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const selectedKeys = Object.keys(checkedItems).filter(
      (k) => checkedItems[k].checked,
    );
    if (selectedKeys.length === 0)
      return toast.error("Select at least one item to give.");

    for (let key of selectedKeys) {
      const data = checkedItems[key];
      const stock = combinedStock.find((s) => getStockKey(s) === key);
      if (!stock) continue;

      if (!data.qty_sent)
        return toast.error("Fill quantity for all selected items.");
      if (Number(data.qty_sent) > Number(stock.balance))
        return toast.error(`Exceeded stock limit for ${stock.display_name}`);
    }

    setLoading(true);
    try {
      const payload = {
        contractor_id: Number(form.contractor_id),
        out_date: form.out_date,
        remarks: form.remarks,
        items: selectedKeys.map((key) => {
          const stock = combinedStock.find((s) => getStockKey(s) === key);
          const data = checkedItems[key];
          return {
            ownership_type: stock.ownership_type,
            owner_party_id: stock.owner_party_id
              ? Number(stock.owner_party_id)
              : null,
            source_semi_finished_id: Number(stock.semi_finished_id),
            qty_sent: Number(data.qty_sent),
            uom: stock.uom,
          };
        }),
      };
      await api.post("/contractor/multi-dispatch", payload);
      toast.success("General Take recorded successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log General Take.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const filteredStock = combinedStock.filter((s) =>
    s.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const selectedCount = Object.values(checkedItems).filter(
    (i) => i.checked,
  ).length;
  const totalQty = Object.keys(checkedItems)
    .filter((k) => checkedItems[k].checked)
    .reduce((sum, k) => sum + Number(checkedItems[k].qty_sent || 0), 0);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-purple-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-purple-50 border border-purple-100 shadow-sm flex items-center justify-center text-purple-600 shrink-0">
            <Layers size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
              General Take
            </h2>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 truncate">
              Give bulk items to vendor
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
          id="general-take-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full"
        >
          <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
              <div className="flex flex-col min-w-0">
                <label className={LabelPremiumClass}>Select Vendor</label>
                <select
                  required
                  value={form.contractor_id}
                  onChange={(e) =>
                    setForm({ ...form, contractor_id: e.target.value })
                  }
                  className={SelectPremiumClass}
                >
                  <option value="" disabled>
                    -- Choose Vendor --
                  </option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col min-w-0">
                <label className={LabelPremiumClass}>Take Date</label>
                <div className="flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border">
                  <Calendar
                    size={14}
                    strokeWidth={2}
                    className="text-slate-400 shrink-0 mr-1.5"
                  />
                  <input
                    type="date"
                    required
                    value={form.out_date}
                    onChange={(e) =>
                      setForm({ ...form, out_date: e.target.value })
                    }
                    className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] min-w-0 lg:overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
              <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Box size={14} className="text-slate-400" /> Select Material
              </h3>
              <div className="relative w-full sm:w-[250px]">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search master items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${InputPremiumClass} !pl-10 h-[36px]`}
                />
              </div>
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-3 bg-slate-50/30 scrollbar-hide min-w-0 space-y-3">
              {filteredStock.length === 0 ? (
                <div className="text-center py-6 text-[13px] text-slate-400 font-medium border border-dashed border-slate-200 rounded-[16px]">
                  No materials match search.
                </div>
              ) : (
                filteredStock.map((stock) => {
                  const key = getStockKey(stock);
                  const data = checkedItems[key] || {};
                  const isChecked = !!data.checked;
                  const isExceeding =
                    data.qty_sent && Number(data.qty_sent) > stock.balance;
                  const isZeroStock = Number(stock.balance) === 0;

                  return (
                    <div
                      key={key}
                      className={`border transition-all duration-300 rounded-[16px] overflow-hidden ${isChecked ? "border-purple-300 bg-purple-50/20 shadow-sm" : "border-slate-200/80 hover:border-slate-300 bg-white"}`}
                    >
                      <label className="flex items-center gap-4 p-4 cursor-pointer">
                        <div
                          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-purple-500 border-purple-500 text-white" : "bg-slate-50 border-slate-300"}`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => handleCheck(key)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-widest border max-w-full truncate inline-block ${stock.ownership_type === "OWN" ? "bg-slate-100 text-slate-600 border-slate-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]" : "bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm"}`}
                            >
                              {stock.ownership_type === "OWN"
                                ? "🏭 OWN"
                                : `🤝 JOB WORK: ${stock.party_name}`}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-slate-900 truncate tracking-tight">
                            {stock.display_name}
                          </p>
                          <p
                            className={`text-[11px] font-semibold mt-1 ${isZeroStock ? "text-rose-500" : "text-slate-500"}`}
                          >
                            Avail: {stock.balance} {stock.uom}
                          </p>
                        </div>
                        {isChecked && (
                          <div
                            onClick={(e) => e.preventDefault()}
                            className="relative w-[120px] sm:w-[150px]"
                          >
                            <input
                              type="number"
                              step="0.01"
                              required={isChecked}
                              value={data.qty_sent || ""}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (val !== "") {
                                  if (Number(val) > stock.balance) {
                                    val = stock.balance.toString();
                                    toast.error(`Capped at max stock`, {
                                      id: "cap",
                                    });
                                  } else if (Number(val) < 0) val = "0";
                                }
                                updateCheckedItem(key, "qty_sent", val);
                              }}
                              placeholder="Qty"
                              className={`${InputPremiumClass} pr-12 tabular-nums focus:border-purple-400 focus:ring-purple-500/10 ${isExceeding ? "!border-rose-500 !bg-rose-50 !text-rose-600 focus:ring-rose-500/10" : ""}`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                              <span className="text-[11px] font-bold text-slate-400 truncate max-w-[40px]">
                                {stock.uom}
                              </span>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 w-full mb-4 lg:mb-0">
            <input
              type="text"
              placeholder="Additional remarks, instructions..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={`${InputPremiumClass} focus:border-purple-400 focus:ring-purple-500/10`}
            />
          </div>
        </form>
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
              <ClipboardList size={14} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                Take Summary
              </h4>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                Preview & Confirm
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide min-w-0">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-[12px] sm:text-[13px] font-semibold">
                  Selected Items
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                  {selectedCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-3">
                <span className="text-[12px] sm:text-[13px] font-semibold">
                  Total Quantity
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                  {totalQty.toFixed(2)}
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 max-h-[200px] overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Item Preview
                  </p>
                  {Object.keys(checkedItems)
                    .filter((k) => checkedItems[k].checked)
                    .map((key) => {
                      const stock = combinedStock.find(
                        (s) => getStockKey(s) === key,
                      );
                      const data = checkedItems[key];
                      if (!stock) return null;
                      return (
                        <div
                          key={key}
                          className="flex justify-between items-center py-1.5 text-[12px]"
                        >
                          <span className="text-slate-700 font-semibold truncate pr-2">
                            {stock.display_name}
                          </span>
                          <span className="text-slate-900 font-black tabular-nums shrink-0">
                            {data.qty_sent || 0} {stock.uom}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="general-take-form"
              disabled={loading || selectedCount === 0}
              className="w-full h-[48px] sm:h-[52px] bg-purple-600 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-[0_4px_12px_rgba(147,51,234,0.25)] hover:bg-purple-700 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 border border-purple-500"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={16} />{" "}
                  Sending...
                </>
              ) : (
                <>
                  <Layers size={16} strokeWidth={2.5} /> Save General Take
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

const ReturnModal = ({
  job,
  semiFinishedMaster,
  finishedMaster,
  onClose,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🌟 FIX: Only apply strict output logic if it's tied to Production
  const isProduction = !!job.source_step_id;
  const hasPlannedOutput = isProduction && job?.planned_outputs?.length > 0;

  const getInitialKind = () => {
    if (hasPlannedOutput) {
      return job.planned_outputs[0].output_item_kind || "SEMI_FINISHED";
    }
    return "SEMI_FINISHED";
  };

  const getInitialId = () => {
    if (hasPlannedOutput) {
      const planned = job.planned_outputs[0];
      return planned.output_item_kind === "FINISHED"
        ? planned.product_id
        : planned.semi_finished_id;
    }
    return job?.locked_return_item_id || "";
  };

  const [form, setForm] = useState({
    return_date: new Date().toISOString().split("T")[0],
    quantity: "",
    loss_type: "PERCENTAGE",
    loss_value: "",
    return_item_kind: getInitialKind(),
    return_item_id: getInitialId(),
    remarks: "",
  });

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = originalStyle);
  }, []);

  useEffect(() => setMounted(true), []);

  const pendingQty = Number(job.pending_qty);
  const enteredQty = Number(form.quantity || 0);

  const lossQty = form.loss_value
    ? form.loss_type === "PERCENTAGE"
      ? (enteredQty * Number(form.loss_value)) / 100
      : Number(form.loss_value)
    : 0;
  const physicalQty = enteredQty - lossQty;
  const totalCleared = enteredQty;

  const isOverReturn = totalCleared > pendingQty + 0.001;
  const isInvalidLoss = physicalQty < 0;

  const isLocked =
    !!job.locked_return_item_id ||
    (hasPlannedOutput && job.planned_outputs.length === 1);

  const rawList =
    form.return_item_kind === "FINISHED" ? finishedMaster : semiFinishedMaster;
  let currentList = Array.isArray(rawList) ? rawList : [];

  if (hasPlannedOutput) {
    const allowedIds = job.planned_outputs
      .filter(
        (p) =>
          p.output_item_kind === (form.return_item_kind || "SEMI_FINISHED"),
      )
      .map((p) =>
        String(
          p.output_item_kind === "FINISHED" ? p.product_id : p.semi_finished_id,
        ),
      );

    currentList = currentList.filter((item) =>
      allowedIds.includes(String(item.id)),
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (isOverReturn)
      return toast.error(`Total cleared cannot exceed ${pendingQty}`);
    if (isInvalidLoss)
      return toast.error("Loss cannot be greater than the entered quantity.");
    if (enteredQty === 0) return toast.error("Please enter a received amount.");
    if (physicalQty > 0 && !form.return_item_id)
      return toast.error("Please select what item was received.");

    setLoading(true);
    try {
      await api.post(`/contractor/${job.id}/return`, {
        contractor_job_id: job.id,
        return_date: form.return_date,
        quantity: physicalQty,
        uom: job.uom,
        remarks: form.remarks,
        loss_qty: lossQty > 0 ? lossQty : null,
        return_item_kind: form.return_item_kind,
        return_item_id: form.return_item_id
          ? Number(form.return_item_id)
          : null,
      });
      toast.success("Material collected back to factory.");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* HEADER */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
            <Undo2 size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
              Collect Material
            </h2>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 truncate">
              Record material back to factory
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
          id="return-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full"
        >
          <div className="bg-white p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0 text-center">
            <p className="text-[11px] font-bold text-slate-500 mb-2 truncate px-2">
              Waiting to get back from {job.contractor_name}
            </p>
            <p className="text-[36px] font-bold text-slate-900 tabular-nums tracking-tight leading-none">
              {pendingQty.toFixed(2)}{" "}
              <span className="text-[14px] font-semibold text-slate-500">
                {job.uom}
              </span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-4 py-1.5 rounded-[12px] shadow-sm max-w-full">
              <span className="text-[11px] font-bold text-slate-700 tracking-wide shrink-0">
                {job.job_no}
              </span>
              <span className="w-px h-3 bg-slate-300 shrink-0"></span>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide truncate">
                {job.semi_finished_name}
              </span>
            </div>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto space-y-4 scrollbar-hide min-w-0">
            <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm">
              <div className="flex flex-col min-w-0 mb-4">
                <label className={LabelPremiumClass}>Received Date</label>
                <div className="flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border">
                  <Calendar
                    size={14}
                    strokeWidth={2}
                    className="text-slate-400 shrink-0 mr-1.5"
                  />
                  <input
                    type="date"
                    required
                    value={form.return_date}
                    onChange={(e) =>
                      setForm({ ...form, return_date: e.target.value })
                    }
                    className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col justify-end">
                  <label className={LabelPremiumClass}>Gross Received</label>
                  <div
                    className={`relative flex items-center bg-slate-50/60 border rounded-[12px] sm:rounded-[14px] px-3 h-[40px] sm:h-[44px] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] ${isOverReturn ? "border-rose-400 focus-within:ring-rose-500/10 bg-white text-rose-600" : "border-slate-200/80 focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white"}`}
                  >
                    <input
                      type="number"
                      step="0.01"
                      value={form.quantity}
                      onChange={(e) =>
                        setForm({ ...form, quantity: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full h-full font-bold text-[14px] outline-none tabular-nums bg-transparent min-w-0 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                      {job.uom}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                      Process Loss
                    </label>
                    <div className="flex bg-slate-200/50 p-0.5 rounded-[8px] border border-slate-200/60 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            loss_type: "PERCENTAGE",
                            loss_value: "",
                          })
                        }
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-[6px] transition-all ${form.loss_type === "PERCENTAGE" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            loss_type: "FIXED",
                            loss_value: "",
                          })
                        }
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-[6px] transition-all uppercase ${form.loss_type === "FIXED" ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        {job.uom}
                      </button>
                    </div>
                  </div>
                  <div
                    className={`relative flex items-center bg-slate-50/60 border rounded-[12px] sm:rounded-[14px] px-3 h-[40px] sm:h-[44px] transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] border-slate-200/80 focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white`}
                  >
                    <input
                      type="number"
                      step="0.01"
                      value={form.loss_value}
                      onChange={(e) =>
                        setForm({ ...form, loss_value: e.target.value })
                      }
                      placeholder={
                        form.loss_type === "PERCENTAGE" ? "e.g. 1.5" : "0.00"
                      }
                      className="w-full h-full font-bold text-[14px] text-slate-900 outline-none tabular-nums bg-transparent min-w-0 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 uppercase truncate max-w-[40px] pointer-events-none">
                      {form.loss_type === "PERCENTAGE" ? "%" : job.uom}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className={LabelPremiumClass}>Item Type</label>
                  <select
                    value={form.return_item_kind}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        return_item_kind: e.target.value,
                        return_item_id: "",
                      })
                    }
                    className={SelectPremiumClass}
                    disabled={isLocked || physicalQty <= 0}
                  >
                    <option value="SEMI_FINISHED">Semi-Finished</option>
                    <option value="FINISHED">Finished Product</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`${LabelPremiumClass} flex items-center gap-1`}
                  >
                    Received As{" "}
                    {isLocked && <Lock size={10} className="text-amber-500" />}
                  </label>
                  <select
                    required={physicalQty > 0}
                    value={form.return_item_id}
                    disabled={isLocked || physicalQty <= 0}
                    onChange={(e) =>
                      setForm({ ...form, return_item_id: e.target.value })
                    }
                    className={SelectPremiumClass}
                  >
                    <option value="">-- Select Item --</option>
                    {currentList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.item_name ||
                          s.product_name ||
                          s.name ||
                          s.semi_finished_name ||
                          `Item #${s.id}`}
                      </option>
                    ))}
                  </select>
                  {hasPlannedOutput && form.return_item_kind !== "SCRAP" && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                      <CheckCircle2 size={12} className="shrink-0" />{" "}
                      Auto-filtered based on production routing.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 min-w-0 w-full mb-4 lg:mb-0">
              <input
                type="text"
                placeholder="Condition, quality, etc."
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className={InputPremiumClass}
              />
            </div>
          </div>
        </form>
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
              <Calculator size={14} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                Calculation Preview
              </h4>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                Check limits & return
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide min-w-0">
            <div
              className={`p-4 rounded-[16px] border transition-colors ${isOverReturn || isInvalidLoss ? "bg-rose-50/50 border-rose-200" : "bg-blue-50/30 border-blue-100"}`}
            >
              <div className="flex justify-between text-[12px] sm:text-[13px] text-slate-600 font-medium">
                <span>Gross Entered:</span>
                <span className="tabular-nums font-bold text-slate-800">
                  {enteredQty.toFixed(2)} {job.uom}
                </span>
              </div>
              {lossQty > 0 && (
                <div className="flex justify-between mt-1.5 text-[12px] sm:text-[13px] text-rose-600 font-medium">
                  <span>- Process Loss:</span>
                  <span className="tabular-nums font-bold">
                    {lossQty.toFixed(2)} {job.uom}
                  </span>
                </div>
              )}
              <div
                className={`flex justify-between mt-3 pt-3 border-t border-slate-200/60 text-[13px] sm:text-[14px] ${isOverReturn || isInvalidLoss ? "text-rose-600" : "text-slate-800"}`}
              >
                <span className="font-bold">Net Physical Return:</span>
                <span className="tabular-nums font-black">
                  {physicalQty.toFixed(2)} {job.uom}
                </span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] sm:text-[12px] text-slate-500">
                <span className="font-bold">Total Clearing from Job:</span>
                <span className="tabular-nums font-black">
                  {totalCleared.toFixed(2)} / {pendingQty.toFixed(2)} {job.uom}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="return-form"
              disabled={
                loading || isOverReturn || isInvalidLoss || enteredQty === 0
              }
              className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-md hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={16} />{" "}
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Save Record
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

const GeneralReturnModal = ({
  batch,
  semiFinishedMaster,
  finishedMaster,
  onClose,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    return_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [returnItems, setReturnItems] = useState({});

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = originalStyle);
  }, []);
  useEffect(() => setMounted(true), []);

  const handleCheck = (job) => {
    setReturnItems((prev) => {
      const isProduction = batch.type === "PRODUCTION";
      const hasPlannedOutputs =
        isProduction && job?.planned_outputs?.length > 0;

      const jobIndex = batch.items.findIndex((j) => j.id === job.id);

      let initKind = "SEMI_FINISHED";
      let initId = job.locked_return_item_id || "";

      if (!initId && hasPlannedOutputs) {
        const plannedOut =
          job.planned_outputs[jobIndex] || job.planned_outputs[0];
        initKind = plannedOut.output_item_kind || "SEMI_FINISHED";
        initId =
          plannedOut.output_item_kind === "FINISHED"
            ? plannedOut.product_id
            : plannedOut.semi_finished_id;
      }

      const current = prev[job.id] || {
        checked: false,
        qty_returned: "",
        loss_type: "PERCENTAGE",
        loss_value: "",
        return_item_kind: initKind,
        return_item_id: initId,
      };
      return { ...prev, [job.id]: { ...current, checked: !current.checked } };
    });
  };

  const updateReturnItem = (jobId, field, value) => {
    setReturnItems((prev) => {
      const current = prev[jobId];
      const updated = { ...current, [field]: value };
      if (field === "loss_type") updated.loss_value = "";
      if (field === "return_item_kind") updated.return_item_id = "";
      return { ...prev, [jobId]: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const selectedJobIds = Object.keys(returnItems).filter(
      (id) => returnItems[id].checked,
    );
    if (selectedJobIds.length === 0)
      return toast.error("Select at least one item to receive.");

    for (let jobId of selectedJobIds) {
      const data = returnItems[jobId];
      const job = batch.items.find((j) => j.id.toString() === jobId);
      const enteredQty = Number(data.qty_returned || 0);
      const lossQty = data.loss_value
        ? data.loss_type === "PERCENTAGE"
          ? (enteredQty * Number(data.loss_value)) / 100
          : Number(data.loss_value)
        : 0;
      const physicalQty = enteredQty - lossQty;
      const totalCleared = enteredQty;

      if (totalCleared === 0)
        return toast.error("Fill quantity for all selections.");
      if (physicalQty > 0 && !data.return_item_id)
        return toast.error(
          "Select received item type for all physical returns.",
        );
      if (totalCleared > Number(job.pending_qty) + 0.001)
        return toast.error(
          `Cleared amount exceeded pending quantity for ${job.semi_finished_name}`,
        );
      if (physicalQty < 0)
        return toast.error(
          `Loss cannot be greater than the entered quantity for ${job.semi_finished_name}`,
        );
    }

    setLoading(true);
    try {
      const payload = {
        return_date: form.return_date,
        remarks: form.remarks,
        returns: selectedJobIds.map((jobId) => {
          const data = returnItems[jobId];
          const job = batch.items.find((j) => j.id.toString() === jobId);
          const enteredQty = Number(data.qty_returned || 0);
          const lossQty = data.loss_value
            ? data.loss_type === "PERCENTAGE"
              ? (enteredQty * Number(data.loss_value)) / 100
              : Number(data.loss_value)
            : 0;
          const physicalQty = enteredQty - lossQty;

          return {
            contractor_job_id: Number(jobId),
            return_item_kind: data.return_item_kind || "SEMI_FINISHED",
            return_item_id: data.return_item_id
              ? Number(data.return_item_id)
              : null,
            qty_returned: physicalQty,
            uom: job.uom,
            loss_qty: lossQty > 0 ? lossQty : null,
          };
        }),
      };
      await api.post("/contractor/multi-return", payload);
      toast.success("Batch Return logged successfully!");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log Batch Return.");
      setLoading(false);
    }
  };

  if (!mounted) return null;
  const selectedCount = Object.values(returnItems).filter(
    (i) => i.checked,
  ).length;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-50 font-sans antialiased h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="h-[64px] px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm z-20"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-slate-900 shadow-md flex items-center justify-center text-white shrink-0">
            <Undo2 size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] sm:text-[16px] font-black text-slate-900 tracking-tight leading-tight truncate">
              Give Return to Factory
            </h2>
            <p className="text-[11px] sm:text-[12px] font-medium text-slate-500 tracking-tight mt-0.5 truncate">
              Collect items from {batch.contractor_name}
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
          id="general-return-form"
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col gap-4 min-w-0 lg:overflow-hidden w-full"
        >
          <div className="bg-white p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Batch ID
            </p>
            <p className="text-[18px] font-bold text-slate-900 tracking-tight">
              {batch.batch_no}
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm shrink-0 w-full min-w-0">
            <div className="flex flex-col min-w-0 max-w-[300px]">
              <label className={LabelPremiumClass}>Return Date</label>
              <div className="flex items-center w-full h-[40px] sm:h-[44px] px-2.5 sm:px-3 bg-slate-50/60 border border-slate-200/80 rounded-[12px] sm:rounded-[14px] focus-within:bg-white focus-within:border-blue-400/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden box-border">
                <Calendar
                  size={14}
                  strokeWidth={2}
                  className="text-slate-400 shrink-0 mr-1.5"
                />
                <input
                  type="date"
                  required
                  value={form.return_date}
                  onChange={(e) =>
                    setForm({ ...form, return_date: e.target.value })
                  }
                  className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[12px] sm:text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 lg:flex-1 lg:min-h-[200px] min-w-0 lg:overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center shrink-0">
              <h3 className="text-[12px] sm:text-[13px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <Box size={14} className="text-slate-400" /> Pending Items
              </h3>
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto p-3 sm:p-4 lg:p-3 bg-slate-50/30 scrollbar-hide min-w-0 space-y-3">
              {batch.items
                .filter((job) => Number(job.pending_qty) > 0)
                .map((job) => {
                  const data = returnItems[job.id] || {};
                  const isChecked = !!data.checked;
                  const enteredQty = Number(data.qty_returned || 0);
                  const lossQty = data.loss_value
                    ? data.loss_type === "PERCENTAGE"
                      ? (enteredQty * Number(data.loss_value)) / 100
                      : Number(data.loss_value)
                    : 0;
                  const physicalQty = enteredQty - lossQty;
                  const isExceeding =
                    enteredQty > Number(job.pending_qty) + 0.001;
                  const isInvalidLoss = physicalQty < 0;
                  const isProduction = batch.type === "PRODUCTION";
                  const hasPlannedOutputs =
                    isProduction && job?.planned_outputs?.length > 0;
                  const isLocked =
                    !!job.locked_return_item_id ||
                    (hasPlannedOutputs && job.planned_outputs.length === 1);

                  const rawList =
                    data.return_item_kind === "FINISHED"
                      ? finishedMaster
                      : semiFinishedMaster;
                  let currentList = Array.isArray(rawList) ? rawList : [];
                  if (hasPlannedOutputs) {
                    const allowedIds = job.planned_outputs
                      .filter(
                        (p) =>
                          p.output_item_kind ===
                          (data.return_item_kind || "SEMI_FINISHED"),
                      )
                      .map((p) =>
                        String(
                          p.output_item_kind === "FINISHED"
                            ? p.product_id
                            : p.semi_finished_id,
                        ),
                      );

                    currentList = currentList.filter((item) =>
                      allowedIds.includes(String(item.id)),
                    );
                  }

                  return (
                    <div
                      key={job.id}
                      className={`border transition-all duration-300 rounded-[16px] overflow-hidden ${isChecked ? "border-slate-800 bg-slate-50/60 shadow-sm" : "border-slate-200/80 hover:border-slate-300 bg-white"}`}
                    >
                      <label className="flex items-center gap-4 p-4 cursor-pointer">
                        <div
                          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-slate-800 border-slate-800 text-white" : "bg-slate-50 border-slate-300"}`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={() => handleCheck(job)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-widest border max-w-full truncate inline-block ${job.ownership_type === "OWN" ? "bg-slate-100 text-slate-600 border-slate-200/80 shadow-sm" : "bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm"}`}
                            >
                              {job.ownership_type === "OWN"
                                ? "🏭 OWN"
                                : `🤝 JOB WORK: ${job.party_name}`}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-slate-900 truncate tracking-tight">
                            {job.semi_finished_name}
                          </p>
                          <p className="text-[11px] font-semibold text-rose-500 mt-1">
                            Pending Return: {Number(job.pending_qty).toFixed(2)}{" "}
                            {job.uom}
                          </p>
                        </div>
                      </label>

                      <AnimatePresence>
                        {isChecked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                          >
                            <div className="p-4 border-t border-slate-200/80 bg-white flex flex-col gap-4 transition-all">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col justify-end">
                                  <label className={LabelPremiumClass}>
                                    Gross Received
                                  </label>
                                  <div
                                    className={`relative flex items-center bg-slate-50/60 border rounded-[12px] h-[40px] px-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] ${isExceeding ? "border-rose-400 text-rose-600" : "border-slate-200/80 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white"}`}
                                  >
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={data.qty_returned || ""}
                                      onChange={(e) =>
                                        updateReturnItem(
                                          job.id,
                                          "qty_returned",
                                          e.target.value,
                                        )
                                      }
                                      placeholder={`Max: ${job.pending_qty}`}
                                      className="w-full h-full font-bold text-[14px] outline-none tabular-nums bg-transparent min-w-0 pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                                      {job.uom}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col justify-end">
                                  <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                                      Process Loss
                                    </label>
                                    <div className="flex bg-slate-200/50 p-0.5 rounded-[8px] border border-slate-200/60 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateReturnItem(
                                            job.id,
                                            "loss_type",
                                            "PERCENTAGE",
                                          )
                                        }
                                        className={`px-2 py-0.5 text-[9px] font-bold rounded-[6px] transition-all ${!data.loss_type || data.loss_type === "PERCENTAGE" ? "bg-white shadow-sm text-slate-800" : "text-slate-400"}`}
                                      >
                                        %
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateReturnItem(
                                            job.id,
                                            "loss_type",
                                            "FIXED",
                                          )
                                        }
                                        className={`px-2 py-0.5 text-[9px] font-bold rounded-[6px] transition-all uppercase ${data.loss_type === "FIXED" ? "bg-white shadow-sm text-slate-800" : "text-slate-400"}`}
                                      >
                                        {job.uom}
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    className={`relative flex items-center bg-slate-50/60 border rounded-[12px] h-[40px] px-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] border-slate-200/80 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white`}
                                  >
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={data.loss_value || ""}
                                      onChange={(e) =>
                                        updateReturnItem(
                                          job.id,
                                          "loss_value",
                                          e.target.value,
                                        )
                                      }
                                      placeholder={
                                        !data.loss_type ||
                                        data.loss_type === "PERCENTAGE"
                                          ? "e.g. 1.5"
                                          : "0.00"
                                      }
                                      className="w-full h-full font-bold text-[14px] text-slate-900 outline-none tabular-nums bg-transparent min-w-0 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 uppercase truncate max-w-[40px] pointer-events-none">
                                      {!data.loss_type ||
                                      data.loss_type === "PERCENTAGE"
                                        ? "%"
                                        : job.uom}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                  <label className={LabelPremiumClass}>
                                    Item Type
                                  </label>
                                  <select
                                    value={
                                      data.return_item_kind || "SEMI_FINISHED"
                                    }
                                    onChange={(e) =>
                                      updateReturnItem(
                                        job.id,
                                        "return_item_kind",
                                        e.target.value,
                                      )
                                    }
                                    className={SelectPremiumClass}
                                    disabled={isLocked || physicalQty <= 0}
                                  >
                                    <option value="SEMI_FINISHED">
                                      Semi-Finished
                                    </option>
                                    <option value="FINISHED">
                                      Finished Product
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label
                                    className={`${LabelPremiumClass} flex items-center gap-1`}
                                  >
                                    Received As{" "}
                                    {isLocked && (
                                      <Lock
                                        size={10}
                                        className="text-amber-500"
                                      />
                                    )}
                                  </label>
                                  <select
                                    required={physicalQty > 0}
                                    value={
                                      data.return_item_id ||
                                      job.locked_return_item_id ||
                                      ""
                                    }
                                    disabled={isLocked || physicalQty <= 0}
                                    onChange={(e) =>
                                      updateReturnItem(
                                        job.id,
                                        "return_item_id",
                                        e.target.value,
                                      )
                                    }
                                    className={SelectPremiumClass}
                                  >
                                    <option value="">-- Select Item --</option>
                                    {currentList.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.item_name ||
                                          s.product_name ||
                                          s.name ||
                                          s.semi_finished_name ||
                                          `Item #${s.id}`}
                                      </option>
                                    ))}
                                  </select>
                                  {hasPlannedOutputs &&
                                    data.return_item_kind !== "SCRAP" && (
                                      <p className="text-[10px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                                        <CheckCircle2
                                          size={12}
                                          className="shrink-0"
                                        />{" "}
                                        Auto-filtered based on production
                                        routing.
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-white p-4 rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 w-full mb-4 lg:mb-0">
            <input
              type="text"
              placeholder="Additional remarks, instructions..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className={InputPremiumClass}
            />
          </div>
        </form>
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-white rounded-[20px] sm:rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col shrink-0 min-w-0 lg:overflow-hidden pb-safe">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
              <Calculator size={14} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-slate-900 tracking-tight truncate">
                Return Summary
              </h4>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                Review allocations
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto space-y-5 sm:space-y-6 scrollbar-hide min-w-0">
            <div className="flex justify-between items-center text-slate-600 mb-4">
              <span className="text-[12px] sm:text-[13px] font-semibold">
                Selected Jobs
              </span>
              <span className="text-[13px] sm:text-[14px] font-bold text-slate-900 tabular-nums">
                {selectedCount}
              </span>
            </div>

            {selectedCount > 0 &&
              Object.keys(returnItems)
                .filter((i) => returnItems[i].checked)
                .map((jobId) => {
                  const data = returnItems[jobId];
                  const job = batch.items.find(
                    (j) => j.id.toString() === jobId,
                  );
                  const enteredQty = Number(data.qty_returned || 0);
                  const lossQty = data.loss_value
                    ? data.loss_type === "PERCENTAGE"
                      ? (enteredQty * Number(data.loss_value)) / 100
                      : Number(data.loss_value)
                    : 0;
                  const physicalQty = enteredQty - lossQty;
                  const isExceeding =
                    enteredQty > Number(job.pending_qty) + 0.001;
                  const isInvalidLoss = physicalQty < 0;

                  return (
                    <div
                      key={jobId}
                      className={`p-3 rounded-[12px] border mb-3 ${isExceeding || isInvalidLoss ? "bg-rose-50 border-rose-200" : "bg-blue-50/50 border-blue-100"}`}
                    >
                      <p className="text-[11px] font-bold text-slate-800 mb-2 truncate">
                        {job.semi_finished_name}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                        <span>Gross Entered:</span>
                        <span className="tabular-nums font-bold">
                          {enteredQty.toFixed(2)} {job.uom}
                        </span>
                      </div>
                      {lossQty > 0 && (
                        <div className="flex justify-between mt-0.5 text-[11px] text-rose-600 font-medium">
                          <span>- Process Loss:</span>
                          <span className="tabular-nums font-bold">
                            {lossQty.toFixed(2)} {job.uom}
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] ${isExceeding || isInvalidLoss ? "text-rose-600" : "text-slate-800"}`}
                      >
                        <span className="font-bold">Net Physical Return:</span>
                        <span className="tabular-nums font-black">
                          {physicalQty.toFixed(2)} {job.uom}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 shrink-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="general-return-form"
              disabled={loading || selectedCount === 0}
              className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[12px] sm:rounded-[14px] text-[13px] sm:text-[14px] font-bold tracking-wide shadow-md hover:bg-slate-800 hover:shadow-lg hover:-translate-y-[1px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={16} />{" "}
                  Logging...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={2.5} /> Confirm Receipt
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

const DrillDownModal = ({ job, data, loading, onClose, onReverse }) => {
  const [mounted, setMounted] = useState(false);
  const [reversingId, setReversingId] = useState(null);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = originalStyle);
  }, []);

  useEffect(() => setMounted(true), []);

  const timeline = [];
  if (data?.outwards_history) {
    data.outwards_history.forEach((out) =>
      timeline.push({
        ...out,
        event_type: "OUT",
        sort_date: new Date(out.out_date),
      }),
    );
  }
  if (data?.returns_history) {
    data.returns_history.forEach((ret) => {
      if (Number(ret.quantity) > 0)
        timeline.push({
          ...ret,
          event_type: "IN",
          sort_date: new Date(ret.return_date),
        });
    });
  }
  timeline.sort((a, b) => a.sort_date - b.sort_date);

  const handleReverseClick = async (returnId) => {
    setReversingId(returnId);
    await onReverse(returnId);
    setReversingId(null);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.99 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex flex-col bg-slate-50 w-full h-[100dvh] overflow-hidden relative shadow-2xl pointer-events-auto"
      >
        <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex justify-between items-center shrink-0 z-20 shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 shadow-sm shrink-0">
              <History size={18} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col mt-0.5">
              <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-slate-900 leading-none mb-1 flex items-center gap-2">
                Job History
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 tracking-tight">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest border max-w-full truncate inline-block shadow-sm ${job.status === "OPEN" ? "bg-blue-50 text-blue-600 border-blue-200/60" : job.status === "CLOSED" ? "bg-slate-100 text-slate-600 border-slate-200/80" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
                >
                  {job.status === "CLOSED"
                    ? "Finished"
                    : job.status === "OPEN"
                      ? "Active"
                      : "Canceled"}
                </span>
                <span className="text-slate-400">&bull;</span>
                {job.job_no}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-500 rounded-full transition-all shadow-sm active:scale-95 shrink-0"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden">
          <div className="max-w-3xl mx-auto pb-8">
            <div className="mb-8">
              <h2 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none mb-2 truncate">
                {job.contractor_name}
              </h2>
              <p className="text-[14px] font-medium text-slate-500 tracking-tight truncate">
                {job.semi_finished_name}
              </p>
            </div>

            {loading || !data ? (
              <div className="w-full flex items-center justify-center bg-transparent py-10">
                <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-sm border border-slate-200/50">
                  <Loader2
                    size={28}
                    strokeWidth={2}
                    className="animate-spin text-blue-500 w-8 h-8"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/80 grid grid-cols-2 divide-x divide-slate-100">
                  <div className="text-center min-w-0 px-2">
                    <p className="text-[12px] font-semibold text-slate-500 mb-1 truncate">
                      Sent Out
                    </p>
                    <p className="text-[24px] font-bold text-slate-900 tracking-tight tabular-nums leading-none truncate">
                      {data.qty_sent}{" "}
                      <span className="text-[12px] font-semibold text-slate-400">
                        {data.uom}
                      </span>
                    </p>
                  </div>
                  <div className="text-center min-w-0 px-2">
                    <p className="text-[12px] font-semibold text-slate-500 mb-1 truncate">
                      Still Outside
                    </p>
                    <p
                      className={`text-[24px] font-bold tracking-tight tabular-nums leading-none truncate ${data.qty_sent - data.returned_qty > 0 ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {(data.qty_sent - data.returned_qty).toFixed(2)}{" "}
                      <span className="text-[12px] font-semibold text-slate-400">
                        {data.uom}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-[13px] font-bold text-slate-800 tracking-tight mb-6 flex items-center gap-2 uppercase">
                    <ArrowRightLeft
                      size={14}
                      strokeWidth={2.5}
                      className="text-slate-400 w-4 h-4"
                    />{" "}
                    Complete History
                  </h3>

                  <div className="relative border-l-2 border-slate-200/80 ml-[15px] space-y-6 pb-8">
                    {timeline.length === 0 ? (
                      <p className="pl-6 text-[13px] text-slate-500 font-medium">
                        No active history.
                      </p>
                    ) : (
                      timeline.map((event) =>
                        event.event_type === "OUT" ? (
                          <div
                            key={`out-${event.id}`}
                            className="relative pl-8 group"
                          >
                            <div className="absolute -left-[17px] top-1.5 w-8 h-8 bg-white border-2 border-slate-200/80 rounded-full flex items-center justify-center shadow-sm group-hover:border-blue-300 z-10 transition-colors">
                              <ArrowUpRight
                                size={14}
                                className="text-slate-500 group-hover:text-blue-500 w-4 h-4"
                                strokeWidth={2.5}
                              />
                            </div>
                            <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Sent Material
                              </p>
                              <p className="text-[18px] font-bold text-slate-900 tracking-tight tabular-nums leading-none">
                                {event.quantity}{" "}
                                <span className="text-[12px] font-semibold text-slate-400">
                                  {data.uom}
                                </span>
                              </p>
                              <p className="text-[12px] font-semibold text-slate-500 mt-2.5 flex items-center gap-1.5 tabular-nums">
                                <Calendar
                                  size={12}
                                  className="text-slate-400 w-3.5 h-3.5"
                                />{" "}
                                {new Date(event.out_date).toLocaleDateString()}
                              </p>
                              {event.remarks && (
                                <p className="text-[13px] text-slate-700 font-medium mt-3 bg-slate-50/80 p-3 rounded-[12px] border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                                  "{event.remarks}"
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            key={`in-${event.id}`}
                            className="relative pl-8 group"
                          >
                            <div className="absolute -left-[17px] top-1.5 w-8 h-8 bg-slate-900 border-2 border-slate-900 rounded-full flex items-center justify-center shadow-sm z-10">
                              <ArrowDownRight
                                size={14}
                                className="text-white w-4 h-4"
                                strokeWidth={2.5}
                              />
                            </div>
                            <div className="bg-white p-5 rounded-[20px] border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative">
                              <button
                                onClick={() => handleReverseClick(event.id)}
                                disabled={reversingId === event.id}
                                className="absolute top-5 right-5 text-[11px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-[8px] transition-colors border border-rose-100 flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {reversingId === event.id ? (
                                  <Loader2
                                    size={10}
                                    strokeWidth={2.5}
                                    className="animate-spin w-3 h-3"
                                  />
                                ) : (
                                  <Undo2
                                    size={10}
                                    strokeWidth={2.5}
                                    className="w-3 h-3"
                                  />
                                )}{" "}
                                Reverse
                              </button>
                              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Received Back
                              </p>
                              <p className="text-[18px] font-bold text-slate-900 tracking-tight tabular-nums leading-none">
                                {event.quantity}{" "}
                                <span className="text-[12px] font-semibold text-slate-400">
                                  {data.uom}
                                </span>
                              </p>
                              <p className="text-[12px] font-semibold text-slate-500 mt-2.5 flex items-center gap-1.5 tabular-nums">
                                <Calendar
                                  size={12}
                                  className="text-slate-400 w-3.5 h-3.5"
                                />{" "}
                                {new Date(event.sort_date).toLocaleDateString()}
                              </p>
                              {event.remarks && (
                                <p className="text-[13px] text-slate-700 font-medium mt-3 bg-slate-50/80 p-3 rounded-[12px] border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                                  "{event.remarks}"
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )
                    )}

                    {job.status === "CLOSED" && (
                      <div className="relative pl-8 pt-2">
                        <div className="absolute -left-[15px] top-4 w-7 h-7 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center shadow-sm z-10">
                          <CheckCircle2
                            size={12}
                            className="text-emerald-600 w-3.5 h-3.5"
                            strokeWidth={3}
                          />
                        </div>
                        <p className="text-[13px] font-bold text-slate-600 py-1.5 tracking-tight uppercase">
                          Job Finished
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default ContractorPage;
