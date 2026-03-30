import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Loader2,
  Users,
  Truck,
  Wrench,
  HardHat,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  TrendingUp,
  Layers,
  ShoppingCart,
  CreditCard,
  LineChart,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../api/axios";

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const diffInMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const hrs = Math.floor(diffInMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatShortINR = (amount) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount}`;
};

const formatLocalYMD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseMetricValue = (val) => {
  if (typeof val === "string")
    return parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0;
  return Number(val) || 0;
};

const isToday = (dateInput) => {
  if (!dateInput) return false;

  const today = new Date();
  const localYMD = formatLocalYMD(today);

  if (typeof dateInput === "string" && dateInput.startsWith(localYMD)) {
    return true;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return false;

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dateObj = new Date(label);
    const displayDate = !isNaN(dateObj)
      ? dateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : label;

    return (
      <div className="bg-white/95 backdrop-blur-3xl px-4 py-3 rounded-[16px] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.15)] border border-slate-200/80 z-50">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
          {displayDate}
        </p>
        <p className="text-[16px] font-bold text-slate-900 tracking-tight tabular-nums flex items-baseline gap-1.5">
          {payload[0].value.toFixed(2)}{" "}
          <span className="text-[12px] font-medium text-slate-500">MT</span>
        </p>
      </div>
    );
  }
  return null;
};

const BaseCard = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200/80 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 rounded-[28px] relative flex flex-col w-full min-h-0 ${className}`}
  >
    {children}
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [compareMode, setCompareMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(new Date());

  const isMounted = useRef(true);

  const getMonthRanges = useCallback(() => {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      current: {
        start: formatLocalYMD(currentStart),
        end: formatLocalYMD(currentEnd),
      },
      prev: { start: formatLocalYMD(prevStart), end: formatLocalYMD(prevEnd) },
    };
  }, []);

  const fetchCurrentMonth = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      setError(null);
      try {
        const { current } = getMonthRanges();
        const res = await api.get(
          `/dashboard?startDate=${current.start}&endDate=${current.end}`,
        );
        if (isMounted.current) {
          setData(res.data.data);
          setLastSynced(new Date());
        }
      } catch (err) {
        if (isMounted.current && !isBackground) {
          setError(
            err.response?.data?.message || "Failed to load overview data.",
          );
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [getMonthRanges],
  );

  const fetchPrevMonth = useCallback(async () => {
    try {
      const { prev } = getMonthRanges();
      const res = await api.get(
        `/dashboard?startDate=${prev.start}&endDate=${prev.end}`,
      );
      if (isMounted.current) {
        setPrevData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to preload previous month data", err);
    }
  }, [getMonthRanges]);

  useEffect(() => {
    isMounted.current = true;
    fetchCurrentMonth(false);
    fetchPrevMonth();

    const interval = setInterval(() => fetchCurrentMonth(true), 30000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchCurrentMonth, fetchPrevMonth]);

  const trends = useMemo(() => {
    if (!data || !prevData || !compareMode) return null;

    const calc = (
      currRaw,
      prevRaw,
      isExpenseMetric = false,
      isCurrency = true,
    ) => {
      const c = parseMetricValue(currRaw);
      const p = parseMetricValue(prevRaw);

      if (p === 0 && c === 0)
        return {
          deltaText: "0%",
          color: "text-slate-400 bg-slate-100",
          previousValue: isCurrency ? formatShortINR(0) : "0",
        };
      if (p === 0 && c > 0)
        return {
          deltaText: "+100%",
          color: isExpenseMetric
            ? "text-rose-600 bg-rose-50"
            : "text-emerald-600 bg-emerald-50",
          previousValue: isCurrency ? formatShortINR(0) : "0",
        };
      if (p === 0 && c < 0)
        return {
          deltaText: "-100%",
          color: "text-slate-400 bg-slate-100",
          previousValue: isCurrency ? formatShortINR(0) : "0",
        };

      const diff = c - p;
      const perc = ((diff / Math.abs(p)) * 100).toFixed(1);
      const isUp = diff > 0;
      const isDown = diff < 0;

      let color = "text-slate-500 bg-slate-100";

      if (isUp)
        color = isExpenseMetric
          ? "text-rose-700 bg-rose-50"
          : "text-emerald-700 bg-emerald-50";
      if (isDown)
        color = isExpenseMetric
          ? "text-emerald-700 bg-emerald-50"
          : "text-rose-700 bg-rose-50";

      return {
        deltaText: `${isUp ? "↑" : isDown ? "↓" : "~"} ${Math.abs(perc)}%`,
        color,
        previousValue: isCurrency ? formatShortINR(p) : `${p.toFixed(2)} MT`,
      };
    };

    return {
      netCashflow: calc(
        data.finance?.net_cashflow,
        prevData.finance?.net_cashflow,
        false,
        true,
      ),
      sales: calc(
        data.finance?.sales_billed,
        prevData.finance?.sales_billed,
        false,
        true,
      ),
      purchases: calc(
        data.finance?.purchases_billed,
        prevData.finance?.purchases_billed,
        true,
        true,
      ),
      received: calc(
        data.finance?.amount_received,
        prevData.finance?.amount_received,
        false,
        true,
      ),
      suppliersPaid: calc(
        data.finance?.supplier_payments,
        prevData.finance?.supplier_payments,
        true,
        true,
      ),
      expenses: calc(
        data.finance?.total_expenses,
        prevData.finance?.total_expenses,
        true,
        true,
      ),
      payroll: calc(
        data.finance?.total_payroll,
        prevData.finance?.total_payroll,
        true,
        true,
      ),
      yield: calc(
        data.kpis?.yield_tonnes,
        prevData.kpis?.yield_tonnes,
        false,
        false,
      ),
      dispatch: calc(
        data.kpis?.dispatch_qty,
        prevData.kpis?.dispatch_qty,
        false,
        false,
      ),
    };
  }, [data, prevData, compareMode]);

  const todaysData = useMemo(() => {
    if (!data) return null;

    return {
      attendance:
        data.attendance?.details?.filter((item) =>
          isToday(
            item.attendance_date ||
              item.date ||
              item.created_at ||
              item.timestamp,
          ),
        ) || [],
      expenses:
        data.recent_expenses?.filter((item) =>
          isToday(item.expense_date || item.date || item.created_at),
        ) || [],
      payments:
        data.recent_payments?.filter((item) =>
          isToday(item.payment_date || item.date || item.created_at),
        ) || [],
      timeline:
        data.timeline?.filter((item) =>
          isToday(item.event_time || item.created_at || item.timestamp),
        ) || [],
    };
  }, [data]);

  const todayAttendanceCounts = useMemo(() => {
    let present = 0;
    let halfday = 0;
    let absent = 0;

    if (todaysData?.attendance) {
      todaysData.attendance.forEach((staff) => {
        if (staff.status === "PRESENT") present++;
        else if (staff.status === "HALF_DAY") halfday++;
        else if (staff.status === "ABSENT") absent++;
      });
    }

    return { present, halfday, absent };
  }, [todaysData?.attendance]);

  if (loading && !data) return <LoadingScreen />;
  if (error && !data)
    return (
      <ErrorScreen error={error} onRetry={() => fetchCurrentMonth(false)} />
    );
  if (!data) return null;

  const netCashflow = data?.finance?.net_cashflow || 0;
  const isPositiveCashflow = netCashflow >= 0;

  const totalReceivables =
    data?.pending_receivables?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPayables =
    data?.pending_payables?.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col font-sans antialiased pb-8">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 sm:gap-8"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-2 px-1"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1.5">
              Monthly Overview
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live updating &bull; Current Month
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto min-w-0">
            <div className="w-full sm:w-auto shrink-0">
              <div className="flex items-center p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full w-full h-[44px]">
                <button
                  onClick={() => setCompareMode(false)}
                  className={`flex-1 sm:flex-none px-5 h-full rounded-[10px] sm:rounded-full text-[12px] sm:text-[13px] tracking-wide transition-all duration-300 outline-none ${
                    !compareMode
                      ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-bold"
                      : "text-slate-500 hover:text-slate-900 font-semibold border border-transparent"
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => {
                    setCompareMode(true);
                    if (!prevData) fetchPrevMonth();
                  }}
                  className={`flex-1 sm:flex-none px-5 h-full rounded-[10px] sm:rounded-full text-[12px] sm:text-[13px] tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-2 ${
                    compareMode
                      ? "bg-white border border-blue-200/80 shadow-[0_2px_8px_rgba(59,130,246,0.15)] text-blue-600 font-bold"
                      : "text-slate-500 hover:text-slate-900 font-semibold border border-transparent"
                  }`}
                >
                  <LineChart size={14} strokeWidth={2.5} />
                  <span className="hidden sm:inline">
                    Compare vs Prev Month
                  </span>
                  <span className="sm:hidden">Compare</span>
                </button>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex-shrink-0"
            >
              <Link
                to="/production"
                className="h-[44px] px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[14px] sm:rounded-full font-semibold text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2.5 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50"
              >
                <Layers size={16} strokeWidth={1.5} className="text-white/90" />{" "}
                New Batch
              </Link>
            </motion.div>
          </div>
        </motion.div>
        <motion.div variants={fadeScale} className="w-full">
          <BaseCard className="p-6 sm:p-8">
            <div className="flex flex-col xl:flex-row gap-8 xl:items-center w-full">
              <div className="xl:w-[30%] border-b xl:border-b-0 xl:border-r border-slate-200/80 pb-8 xl:pb-0 xl:pr-8 shrink-0 flex flex-col justify-center">
                <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Monthly Cash Flow
                </p>
                <div className="flex flex-col items-start gap-1">
                  <h2
                    className={`text-[44px] sm:text-[56px] font-bold tracking-tighter leading-none tabular-nums truncate ${
                      isPositiveCashflow ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatINR(Math.abs(netCashflow))}
                  </h2>
                  {trends?.netCashflow && (
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-[6px] ${trends.netCashflow.color}`}
                      >
                        {trends.netCashflow.deltaText}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        vs Prev: {trends.netCashflow.previousValue}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-3.5 border-t border-slate-100 pt-5">
                  <div className="flex justify-between items-center text-[14px] font-semibold text-slate-600 tracking-tight">
                    <span className="flex items-center gap-2">
                      <ArrowDownRight size={16} className="text-emerald-500" />{" "}
                      Money In
                    </span>
                    <span className="text-emerald-600 tabular-nums">
                      +{formatINR(data?.finance?.amount_received || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[14px] font-semibold text-slate-600 tracking-tight">
                    <span className="flex items-center gap-2">
                      <ArrowUpRight size={16} className="text-rose-500" /> Money
                      Out
                    </span>
                    <span className="text-rose-600 tabular-nums">
                      -{formatINR(data?.finance?.amount_paid || 0)}
                    </span>
                  </div>
                </div>

                <div
                  className={`mt-6 px-4 py-3 rounded-[16px] flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest uppercase border w-full shadow-sm ${
                    isPositiveCashflow
                      ? "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                      : "bg-rose-50 border-rose-200/60 text-rose-600"
                  }`}
                >
                  {isPositiveCashflow ? "Cash Surplus" : "Cash Shortage"}
                </div>
              </div>
              <div className="xl:w-[70%] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                <DataSnippet
                  label="Total Sales"
                  value={formatINR(data?.finance?.sales_billed || 0)}
                  icon={Receipt}
                  trend={trends?.sales}
                />
                <DataSnippet
                  label="Total Purchases"
                  value={formatINR(data?.finance?.purchases_billed || 0)}
                  icon={ShoppingCart}
                  trend={trends?.purchases}
                />
                <DataSnippet
                  label="Money Collected"
                  value={formatINR(data?.finance?.amount_received || 0)}
                  icon={Coins}
                  color="text-emerald-700"
                  bg="bg-emerald-50/50 hover:bg-emerald-50/80"
                  borderColor="border-emerald-100/60"
                  iconColor="text-emerald-600"
                  trend={trends?.received}
                />
                <DataSnippet
                  label="Suppliers Paid"
                  value={formatINR(data?.finance?.supplier_payments || 0)}
                  icon={Truck}
                  color="text-rose-700"
                  bg="bg-rose-50/50 hover:bg-rose-50/80"
                  borderColor="border-rose-100/60"
                  iconColor="text-rose-600"
                  trend={trends?.suppliersPaid}
                />
                <DataSnippet
                  label="Other Costs"
                  value={formatINR(data?.finance?.total_expenses || 0)}
                  icon={CreditCard}
                  color="text-rose-700"
                  bg="bg-rose-50/50 hover:bg-rose-50/80"
                  borderColor="border-rose-100/60"
                  iconColor="text-rose-600"
                  trend={trends?.expenses}
                />
                <DataSnippet
                  label="Staff Pay"
                  value={formatINR(data?.finance?.total_payroll || 0)}
                  icon={Users}
                  color="text-rose-700"
                  bg="bg-rose-50/50 hover:bg-rose-50/80"
                  borderColor="border-rose-100/60"
                  iconColor="text-rose-600"
                  trend={trends?.payroll}
                />
              </div>
            </div>
          </BaseCard>
        </motion.div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <motion.div
            variants={fadeScale}
            className="xl:col-span-4 h-full flex flex-col"
          >
            <BaseCard className="flex flex-col h-full min-h-[420px] p-6 lg:p-7">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Activity
                      size={16}
                      className="text-emerald-600"
                      strokeWidth={2}
                    />
                  </div>
                  Monthly Production
                </h2>
                <Link
                  to="/production"
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                >
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
              <div className="flex-1 flex flex-col w-full">
                <div className="grid grid-cols-2 gap-4 mb-auto">
                  {/* Total Made Box */}
                  <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200/60 rounded-[24px] shadow-sm flex flex-col">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                      Total Made
                    </p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[36px] sm:text-[42px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                        {data?.kpis?.yield_tonnes || 0}
                      </span>
                      <span className="text-[14px] font-bold text-slate-400 tracking-wide">
                        MT
                      </span>
                    </div>
                    {trends?.yield && (
                      <div className="flex items-center gap-1.5 mt-auto pt-2">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-[4px] ${trends.yield.color}`}
                        >
                          {trends.yield.deltaText}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 truncate">
                          Prev: {trends.yield.previousValue}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 sm:p-6 bg-slate-50 border border-slate-200/60 rounded-[24px] shadow-sm flex flex-col">
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                      Sent Out
                    </p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-[36px] sm:text-[42px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                        {parseFloat(data?.kpis?.dispatch_qty || 0).toFixed(2)}
                      </span>
                      <span className="text-[14px] font-bold text-slate-400 tracking-wide">
                        MT
                      </span>
                    </div>
                    {trends?.dispatch && (
                      <div className="flex items-center gap-1.5 mt-auto pt-2">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-[4px] ${trends.dispatch.color}`}
                        >
                          {trends.dispatch.deltaText}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 truncate">
                          Prev: {trends.dispatch.previousValue}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 shrink-0 mt-auto pt-6">
                  <OpsPill
                    label="Running"
                    value={data?.machines?.active || 0}
                    dotColor="bg-emerald-500"
                  />
                  <OpsPill
                    label="Stopped"
                    value={data?.machines?.idle || 0}
                    dotColor="bg-amber-500"
                  />
                  <OpsPill
                    label="Fixing"
                    value={data?.machines?.maintenance || 0}
                    dotColor="bg-slate-400"
                  />
                </div>
                {data?.kpis?.stuck_alerts > 0 && (
                  <div className="mt-4 p-4 rounded-[16px] bg-rose-50 border border-rose-200/60 flex items-center justify-center gap-2.5 text-rose-600 shadow-sm shrink-0">
                    <ShieldAlert
                      size={18}
                      strokeWidth={2}
                      className="shrink-0"
                    />
                    <span className="text-[13px] font-bold tracking-tight">
                      {data.kpis.stuck_alerts} tasks are stuck
                    </span>
                  </div>
                )}
              </div>
            </BaseCard>
          </motion.div>

          <motion.div variants={fadeScale} className="xl:col-span-8 h-full">
            <BaseCard className="p-6 sm:p-8 flex flex-col h-full min-h-[420px]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <TrendingUp
                      size={16}
                      className="text-blue-600"
                      strokeWidth={2}
                    />
                  </div>
                  Production Timeline
                </h3>
              </div>
              <div className="w-full flex-1 relative min-h-[250px] -ml-4 mt-2">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={data?.chartData || []}>
                    <defs>
                      <linearGradient
                        id="colorYield"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#e2e8f0"
                      strokeOpacity={0.6}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                      dy={12}
                      minTickGap={25}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return isNaN(d.getTime())
                          ? val
                          : d.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                      dx={-12}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "#3b82f6",
                        strokeWidth: 1.5,
                        strokeDasharray: "4 4",
                        opacity: 0.4,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="yield"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorYield)"
                      activeDot={{
                        r: 5,
                        strokeWidth: 0,
                        fill: "#3b82f6",
                        stroke: "#ffffff",
                        style: {
                          filter:
                            "drop-shadow(0px 4px 8px rgba(59,130,246,0.3))",
                        },
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BaseCard>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch lg:min-h-[440px]">
          {/* Inventory */}
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight">
                  Stock Levels
                </h2>
                <Link
                  to="/stock"
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
                >
                  <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto scrollbar-hide p-5">
                  <StockListRow
                    label="Raw Materials"
                    value={data?.stock?.RAW || 0}
                    icon={Boxes}
                  />
                  <StockListRow
                    label="In Progress"
                    value={data?.stock?.SEMI_FINISHED || 0}
                    icon={Wrench}
                  />
                  <StockListRow
                    label="Ready to Sell"
                    value={data?.stock?.FINISHED || 0}
                    icon={Truck}
                    isPrimary
                  />
                  <StockListRow
                    label="Scrap / Waste"
                    value={data?.stock?.SCRAP || 0}
                    icon={AlertTriangle}
                    isAlert
                  />
                </div>
              </div>
            </BaseCard>
          </motion.div>
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col flex-1 overflow-hidden p-6 lg:p-7">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight">
                  Workers & Staff
                </h2>
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/60 text-blue-600 flex items-center justify-center shadow-sm">
                  <Users size={14} strokeWidth={2} />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 w-full">
                <div className="shrink-0 mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1 text-center sm:text-left">
                    Today's Attendance
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <OpsPill
                      label="Present"
                      value={todayAttendanceCounts.present}
                      dotColor="bg-emerald-500"
                    />
                    <OpsPill
                      label="Half Day"
                      value={todayAttendanceCounts.halfday}
                      dotColor="bg-amber-500"
                    />
                    <OpsPill
                      label="Absent"
                      value={todayAttendanceCounts.absent}
                      dotColor="bg-rose-500"
                    />
                  </div>
                </div>

                <div className="flex-1 relative min-h-[120px] w-full">
                  <div className="absolute inset-0 overflow-y-auto scrollbar-hide border border-slate-100/80 rounded-[20px] bg-slate-50/50 p-2 space-y-1">
                    {todaysData.attendance.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-[12px] font-medium italic">
                        No attendance records for today.
                      </div>
                    ) : (
                      todaysData.attendance.map((staff, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center px-3 py-2.5 hover:bg-white rounded-[14px] transition-colors border border-transparent hover:border-slate-200/60 hover:shadow-sm"
                        >
                          <span className="text-[13px] font-semibold text-slate-700 truncate pr-3 tracking-tight">
                            {staff.staff_name}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${staff.status === "PRESENT" ? "bg-emerald-50 border-emerald-200/60 text-emerald-600" : staff.status === "HALF_DAY" ? "bg-amber-50 border-amber-200/60 text-amber-600" : "bg-rose-50 border-rose-200/60 text-rose-600"}`}
                          >
                            {staff.status.replace("_", " ")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/60 flex justify-between items-center px-2 shrink-0">
                  <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-2">
                    <HardHat size={16} className="text-slate-400" /> Outside
                    Contractors
                  </span>
                  <span className="text-[18px] font-bold text-slate-900 tabular-nums">
                    {data?.workforce?.active_contractors || 0}
                  </span>
                </div>
              </div>
            </BaseCard>
          </motion.div>
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col h-full min-h-[420px] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight">
                  Global Pending Ledgers
                </h3>
                <Link
                  to="/settlements"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50 tracking-wide"
                >
                  Go to Settlements
                </Link>
              </div>

              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-6 space-y-8">
                  <div>
                    <h4 className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-3 px-2">
                      <span>Money to Collect</span>
                      {totalReceivables > 0 && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Total: {formatShortINR(totalReceivables)}
                        </span>
                      )}
                    </h4>
                    {!data?.pending_receivables ||
                    data.pending_receivables.length === 0 ? (
                      <p className="text-[14px] text-slate-400 px-2 py-2 italic">
                        Nobody owes us money right now.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {data.pending_receivables.map((party) => (
                          <div
                            key={party.name}
                            className="flex justify-between items-center px-3 py-3 hover:bg-slate-50 rounded-[16px] transition-colors"
                          >
                            <span className="text-[14px] font-semibold text-slate-700 truncate pr-4">
                              {party.name}
                            </span>
                            <span className="text-[14px] font-bold text-emerald-600 tabular-nums shrink-0">
                              {formatINR(party.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100/80 pt-6">
                    <h4 className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-rose-600 mb-3 px-2">
                      <span>Money to Pay</span>
                      {totalPayables > 0 && (
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200/50">
                          Total: {formatShortINR(totalPayables)}
                        </span>
                      )}
                    </h4>
                    {!data?.pending_payables ||
                    data.pending_payables.length === 0 ? (
                      <p className="text-[14px] text-slate-400 px-2 py-2 italic">
                        No bills due to suppliers.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {data.pending_payables.map((party) => (
                          <div
                            key={party.name}
                            className="flex justify-between items-center px-3 py-3 hover:bg-slate-50 rounded-[16px] transition-colors"
                          >
                            <span className="text-[14px] font-semibold text-slate-700 truncate pr-4">
                              {party.name}
                            </span>
                            <span className="text-[14px] font-bold text-rose-600 tabular-nums shrink-0">
                              {formatINR(party.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </BaseCard>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col min-h-[420px] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-rose-50 border border-rose-100/60">
                    <CreditCard size={16} className="text-rose-500" />
                  </div>
                  Today's Costs
                </h3>
                <Link
                  to="/expenses"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50 tracking-wide"
                >
                  See All
                </Link>
              </div>

              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-2">
                  {todaysData.expenses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p className="text-[14px] font-medium italic">
                        No costs registered today.
                      </p>
                    </div>
                  ) : (
                    todaysData.expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex justify-between items-center p-4 hover:bg-slate-50/80 rounded-[20px] transition-colors border border-transparent hover:border-slate-100/60"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate mb-1">
                            {exp.reason || "General Item"}
                          </p>
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-[8px] bg-slate-100 border border-slate-200/60 text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate max-w-[140px]">
                              {exp.category_name}
                            </span>
                            <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
                              {new Date(
                                exp.expense_date || exp.created_at,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-[15px] font-bold text-rose-600 tabular-nums shrink-0">
                          -{formatINR(exp.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </BaseCard>
          </motion.div>
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col min-h-[420px] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-rose-50 border border-rose-100/60">
                    <Users size={16} className="text-rose-500" />
                  </div>
                  Today's Payments
                </h3>
                <Link
                  to="/payments"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50 tracking-wide"
                >
                  See All
                </Link>
              </div>

              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-2">
                  {todaysData.payments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p className="text-[14px] font-medium italic">
                        Nobody paid today.
                      </p>
                    </div>
                  ) : (
                    todaysData.payments.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex justify-between items-center p-4 hover:bg-slate-50/80 rounded-[20px] transition-colors border border-transparent hover:border-slate-100/60"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate mb-1">
                            {pay.full_name}
                          </p>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-2.5 py-1 rounded-[8px] border text-[10px] font-bold uppercase tracking-widest ${pay.personnel_type === "STAFF" ? "bg-blue-50 border-blue-100/60 text-blue-600" : "bg-amber-50 border-amber-100/60 text-amber-600"}`}
                            >
                              {pay.personnel_type}
                            </span>
                            <span className="text-[12px] text-slate-500 truncate max-w-[140px] font-medium">
                              {pay.reason || "Wages"}
                            </span>
                          </div>
                        </div>
                        <div className="text-[15px] font-bold text-rose-600 tabular-nums shrink-0">
                          -{formatINR(pay.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </BaseCard>
          </motion.div>
          <motion.div
            variants={fadeScale}
            className="w-full h-full flex flex-col"
          >
            <BaseCard className="flex flex-col flex-1 min-h-[420px] overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between shrink-0 border-b border-slate-100/80 bg-slate-50/30">
                <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">
                  Today's Activity
                </h2>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              </div>
              <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 overflow-y-auto p-2 scrollbar-hide">
                  {todaysData.timeline.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200/60">
                        <Activity
                          size={20}
                          strokeWidth={1.5}
                          className="text-slate-400"
                        />
                      </div>
                      <p className="text-[14px] font-semibold tracking-tight text-slate-900">
                        Everything is running smooth
                      </p>
                      <p className="text-[13px] font-medium tracking-tight mt-1 text-slate-500">
                        No new updates today.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100/80">
                      {todaysData.timeline.map((log, i) => {
                        const isSuccess = log.type === "success";
                        return (
                          <div
                            key={i}
                            className="p-4 hover:bg-slate-50 rounded-[20px] transition-colors cursor-default flex gap-4 group"
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-sm ${isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-200/60" : "bg-rose-50 text-rose-600 border-rose-200/60"}`}
                              >
                                {isSuccess ? (
                                  <CheckCircle2 size={16} strokeWidth={1.5} />
                                ) : (
                                  <AlertTriangle size={16} strokeWidth={1.5} />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[14px] font-semibold leading-snug tracking-tight truncate ${!isSuccess ? "text-rose-600" : "text-slate-900"}`}
                              >
                                {log.title}
                              </p>
                              <p className="text-[12px] font-medium tracking-tight text-slate-500 mt-1 uppercase tracking-widest truncate">
                                {log.machine}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1.5 tracking-tight">
                                <Clock size={12} strokeWidth={1.5} />{" "}
                                {formatTimeAgo(log.event_time)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </BaseCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
const DataSnippet = ({
  label,
  value,
  icon: Icon,
  color = "text-slate-900",
  bg = "bg-slate-50/60 hover:bg-white",
  borderColor = "border-slate-200/60",
  iconColor = "text-slate-500",
  trend,
}) => (
  <div
    className={`flex flex-col p-5 sm:p-6 rounded-[24px] ${bg} border ${borderColor} transition-colors shadow-sm`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0">
          <Icon size={14} strokeWidth={2} className={iconColor} />
        </div>
        <p className="text-[12px] font-semibold text-slate-500 tracking-tight truncate">
          {label}
        </p>
      </div>
    </div>

    <div className="flex flex-col gap-1">
      <p
        className={`text-[20px] sm:text-[22px] font-bold tracking-tight tabular-nums truncate ${color}`}
      >
        {value}
      </p>
      {trend && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`px-1.5 py-0.5 text-[9px] font-bold rounded-[4px] border ${trend.color}`}
          >
            {trend.deltaText}
          </span>
          <span className="text-[10px] font-medium text-slate-400 truncate">
            Prev: {trend.previousValue}
          </span>
        </div>
      )}
    </div>
  </div>
);

const OpsPill = ({ label, value, dotColor }) => (
  <div className="flex-1 py-3.5 flex flex-col items-center justify-center rounded-[20px] bg-white border border-slate-200/80 transition-shadow hover:shadow-md shadow-sm">
    <span className="text-[18px] sm:text-[20px] font-bold tracking-tight text-slate-900 leading-none mb-1.5 tabular-nums">
      {value || 0}
    </span>
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5 w-full px-1 overflow-hidden">
      <span
        className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${dotColor}`}
      ></span>
      <span className="truncate">{label}</span>
    </span>
  </div>
);

const StockListRow = ({ label, value, icon: Icon, isPrimary, isAlert }) => (
  <div
    className={`flex items-center justify-between p-4 rounded-[20px] border transition-all ${isPrimary ? "bg-slate-900 border-slate-800 shadow-md" : isAlert ? "bg-rose-50/50 border-rose-200/60" : "bg-slate-50/50 border-slate-200/80 hover:shadow-sm"}`}
  >
    <div className="flex items-center gap-4 overflow-hidden">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border shrink-0 ${isPrimary ? "bg-slate-800 border-slate-700 text-white" : isAlert ? "bg-white border-rose-200/80 text-rose-500" : "bg-white border-slate-200/60 text-slate-500"}`}
      >
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <span
        className={`text-[14px] font-semibold tracking-tight truncate ${isPrimary ? "text-white" : "text-slate-900"}`}
      >
        {label}
      </span>
    </div>
    <div className="text-right shrink-0 ml-3">
      <span
        className={`text-[15px] font-bold tracking-tight tabular-nums ${isPrimary ? "text-white" : "text-slate-900"}`}
      >
        {Number(value).toLocaleString()}{" "}
        <span
          className={`text-[10px] font-semibold ml-0.5 ${isPrimary ? "text-slate-400" : "text-slate-500"}`}
        >
          KG
        </span>
      </span>
    </div>
  </div>
);

const LoadingScreen = () => (
  <div className="w-full h-full flex flex-col items-center justify-center min-h-[60vh]">
    <div className="p-5 bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
      <Loader2
        size={28}
        className="animate-spin text-blue-500"
        strokeWidth={1.5}
      />
    </div>
  </div>
);

const ErrorScreen = ({ error, onRetry }) => (
  <div className="w-full h-full flex flex-col items-center justify-center text-center px-6 min-h-[60vh]">
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
      onClick={onRetry}
      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] font-semibold transition-colors shadow-md"
    >
      Try Again
    </button>
  </div>
);

export default Dashboard;
