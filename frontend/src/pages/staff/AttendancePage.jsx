import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
  X,
  Save,
  Edit2,
  Trash2,
  BarChart3,
  ArrowLeft,
  Sun,
  Moon,
  CalendarDays,
  PartyPopper,
  Lock,
  Unlock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
  Calculator,
} from "lucide-react";
import api from "../../api/axios";

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

const BaseCard = ({ children, className = "", onClick, clickable }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-slate-200/80 shadow-sm transition-all duration-500 rounded-[24px] sm:rounded-[28px] relative flex flex-col w-full min-h-0 ${clickable || onClick ? "cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 active:scale-[0.98]" : "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"} ${className}`}
  >
    {children}
  </div>
);

const toLocalISODate = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
};

const parseDateStr = (dateString) => {
  if (!dateString) return "";
  if (dateString.length === 10 && dateString.includes("-")) return dateString;
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getMonthDates = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDates = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const nextDay = new Date(year, month - 1, i);
    monthDates.push({
      dateStr: toLocalISODate(nextDay),
      dayName: nextDay.toLocaleDateString("en-US", { weekday: "short" }),
      dateNum: nextDay.getDate(),
    });
  }
  return monthDates;
};

const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState("REGISTER");
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [fullPageKpiView, setFullPageKpiView] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [year, month] = currentMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

      const queryParams = new URLSearchParams({
        date_filter: "CUSTOM",
        startDate,
        endDate,
      });
      if (selectedStaff) queryParams.append("personnel_id", selectedStaff.id);

      const [attRes, sumRes] = await Promise.all([
        api.get(`/attendance?${queryParams.toString()}`),
        api.get(`/attendance/summary?${queryParams.toString()}`),
      ]);
      setAttendance(attRes.data.data);
      setSummary(sumRes.data.data);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBulkAddOpen) {
      fetchData();
    }
  }, [currentMonth, selectedStaff, isBulkAddOpen]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/attendance/${id}`);
      fetchData();
    } catch (error) {
      alert("Failed to delete record.");
    }
  };

  const kpiStaffCounts = useMemo(() => {
    if (selectedStaff) {
      let present = 0,
        absent = 0,
        halfDay = 0;
      attendance.forEach((log) => {
        if (log.status === "PRESENT") present++;
        if (log.status === "ABSENT") absent++;
        if (log.status === "HALF_DAY") halfDay++;
      });
      return { present, absent, halfDay };
    }

    const presentIds = new Set();
    const absentIds = new Set();
    const halfDayIds = new Set();

    attendance.forEach((log) => {
      if (log.status === "PRESENT") presentIds.add(log.personnel_id);
      if (log.status === "ABSENT") absentIds.add(log.personnel_id);
      if (log.status === "HALF_DAY") halfDayIds.add(log.personnel_id);
    });

    return {
      present: presentIds.size,
      absent: absentIds.size,
      halfDay: halfDayIds.size,
    };
  }, [attendance, selectedStaff]);

  const uniqueHolidayDays = useMemo(() => {
    const holidayDates = attendance
      .filter((log) => log.status === "HOLIDAY")
      .map((log) => parseDateStr(log.attendance_date));
    return new Set(holidayDates).size;
  }, [attendance]);

  const currentPeriodInfo = useMemo(
    () => getMonthDates(currentMonth),
    [currentMonth],
  );

  const daysInCurrentMonth = currentPeriodInfo.length;

  const matrixData = useMemo(() => {
    const map = {};
    attendance.forEach((log) => {
      if (!map[log.personnel_id]) {
        map[log.personnel_id] = {
          id: log.personnel_id,
          name: log.staff_name,
          logs: {},
        };
      }
      const dateStr = parseDateStr(log.attendance_date);
      map[log.personnel_id].logs[dateStr] = log;
    });

    return Object.values(map)
      .filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toString().includes(search),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attendance, search]);

  const filteredSummary = useMemo(() => {
    return summary.filter(
      (s) =>
        s.staff_name.toLowerCase().includes(search.toLowerCase()) ||
        s.personnel_id.toString().includes(search),
    );
  }, [summary, search]);

  const handleStaffClick = (id, name) => setSelectedStaff({ id, name });
  const handleBackClick = () => {
    setSelectedStaff(null);
    setActiveTab("REGISTER");
  };

  const monthDisplay = useMemo(() => {
    const [year, month] = currentMonth.split("-");
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  }, [currentMonth]);

  const todayIsoStr = toLocalISODate(new Date());

  const monthNavigatorBox = (
    <div className="flex items-center bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full p-1 sm:p-1.5 w-full sm:w-auto h-[40px] sm:h-[44px] min-w-0 shrink-0">
      <button
        onClick={() => {
          const [y, m] = currentMonth.split("-").map(Number);
          const prev = new Date(y, m - 2, 1);
          setCurrentMonth(
            `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
          );
        }}
        className="p-1.5 sm:p-2 bg-white rounded-[8px] sm:rounded-full text-slate-500 hover:text-slate-900 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-95 shrink-0"
      >
        <ChevronLeft size={16} strokeWidth={3} />
      </button>
      <div className="relative flex items-center justify-center min-w-0 sm:min-w-[140px] group flex-1 overflow-hidden">
        <Calendar
          size={14}
          className="text-slate-400 absolute left-3 sm:left-4 group-hover:text-blue-500 transition-colors shrink-0 hidden sm:block"
        />
        <span className="text-[12px] sm:text-[13px] font-bold text-slate-800 tracking-wide z-10 pointer-events-none pl-2 sm:pl-6 truncate pr-2">
          {monthDisplay}
        </span>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => {
            if (e.target.value) setCurrentMonth(e.target.value);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <button
        onClick={() => {
          const [y, m] = currentMonth.split("-").map(Number);
          const next = new Date(y, m, 1);
          setCurrentMonth(
            `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
          );
        }}
        className="p-1.5 sm:p-2 bg-white rounded-[8px] sm:rounded-full text-slate-500 hover:text-slate-900 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-95 shrink-0"
      >
        <ChevronRight size={16} strokeWidth={3} />
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <AnimatePresence mode="wait">
        {fullPageKpiView ? (
          <motion.div
            key="kpi-full-page"
            variants={fadeScale}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex flex-col flex-1 w-full min-h-0 gap-4 sm:gap-6 pb-4 sm:pb-0 pt-2 sm:pt-0"
          >
            <KpiFullPage
              type={fullPageKpiView}
              summaryData={summary}
              attendanceData={attendance}
              dateFilter={monthDisplay}
              onClose={() => setFullPageKpiView(null)}
              onStaffClick={(id, name) => {
                setFullPageKpiView(null);
                handleStaffClick(id, name);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
          >
            <motion.div
              variants={fadeScale}
              className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 shrink-0 w-full"
            >
              <div className="flex-shrink-0 mt-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-1.5">
                  <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none">
                    Attendance
                  </h1>
                  {selectedStaff && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-[8px] text-[11px] font-bold tracking-wide shadow-sm flex items-center gap-1.5 mt-0.5">
                      {selectedStaff.name}
                      <button
                        onClick={handleBackClick}
                        className="hover:text-blue-900 ml-1 active:scale-95 transition-transform"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                  </span>
                  {selectedStaff
                    ? `Viewing records for ${selectedStaff.name}.`
                    : "Workforce \u2022 Live Register"}
                </div>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0 justify-end">
                {!selectedStaff ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full xl:flex-1 shrink-0">
                    <div className="relative group w-full sm:flex-1 min-w-[200px]">
                      <Search
                        className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                        size={16}
                        strokeWidth={2}
                      />
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                      />
                    </div>

                    <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full sm:w-auto shrink-0 h-[40px] sm:h-[44px]">
                      <button
                        onClick={() => setActiveTab("REGISTER")}
                        className={`flex-1 sm:flex-none h-full px-2 sm:px-5 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "REGISTER" ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 border border-transparent"}`}
                      >
                        <CalendarDays size={14} className="hidden sm:block" />{" "}
                        Matrix
                      </button>
                      <button
                        onClick={() => setActiveTab("SUMMARY")}
                        className={`flex-1 sm:flex-none h-full px-2 sm:px-5 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "SUMMARY" ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900 border border-transparent"}`}
                      >
                        <BarChart3 size={14} className="hidden sm:block" />{" "}
                        Summary
                      </button>
                    </div>

                    {monthNavigatorBox}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full xl:w-auto shrink-0 justify-end">
                    {monthNavigatorBox}
                  </div>
                )}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto shrink-0"
                >
                  <button
                    onClick={() => setIsBulkAddOpen(true)}
                    className="h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 whitespace-nowrap"
                  >
                    <Plus size={16} strokeWidth={2} className="text-white/90" />{" "}
                    Mark Attendance
                  </button>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              variants={fadeScale}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full shrink-0 px-2 sm:px-0"
            >
              <StatCard
                title="Absent"
                value={kpiStaffCounts.absent}
                unit={selectedStaff ? "Days" : "Staff"}
                icon={UserX}
                color="text-rose-500"
                onClick={() => setFullPageKpiView("ABSENT")}
                clickable={!selectedStaff}
              />
              <StatCard
                title="Present"
                value={kpiStaffCounts.present}
                unit={selectedStaff ? "Days" : "Staff"}
                icon={UserCheck}
                color="text-emerald-500"
                onClick={() => setFullPageKpiView("PRESENT")}
                clickable={!selectedStaff}
              />
              <StatCard
                title="Half Day"
                value={kpiStaffCounts.halfDay}
                unit={selectedStaff ? "Days" : "Staff"}
                icon={UserMinus}
                color="text-amber-500"
                onClick={() => setFullPageKpiView("HALF_DAY")}
                clickable={!selectedStaff}
              />
              <StatCard
                title="Holidays"
                value={uniqueHolidayDays}
                unit={uniqueHolidayDays === 1 ? "Day" : "Days"}
                icon={PartyPopper}
                color="text-purple-500"
              />
            </motion.div>

            <motion.div
              variants={fadeScale}
              className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0 mt-2"
            >
              <div className="flex-1 flex flex-col w-full min-h-0">
                {selectedStaff ? (
                  <>
                    <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                      <div className="flex items-center gap-3 w-[200px]">
                        <button
                          onClick={handleBackClick}
                          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 shadow-sm px-3 py-1 rounded-[8px] transition-all text-[11px] font-bold active:scale-95"
                        >
                          <ArrowLeft size={14} /> Back
                        </button>
                      </div>
                      <div className="w-[120px]">Date</div>
                      <div className="w-[120px]">Day</div>
                      <div className="w-[120px]">Status</div>
                      <div className="w-[120px]">OT Hrs</div>
                      <div className="flex-1 min-w-[150px]">Remarks</div>
                      <div className="w-[100px] text-right pr-2">Actions</div>
                    </div>

                    <div
                      className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 overflow-y-auto ${attendance.length === 0 ? "flex-1" : ""}`}
                    >
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
                      ) : attendance.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <CalendarDays
                              size={24}
                              strokeWidth={1.5}
                              className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                            />
                          </div>
                          <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                            No logs found
                          </p>
                          <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 text-center px-4">
                            There are no attendance records for this month.
                          </p>
                        </div>
                      ) : (
                        attendance.map((row) => (
                          <div
                            key={row.id}
                            className="group flex flex-col w-full shrink-0"
                          >
                            <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] p-3 sm:p-5 mx-1">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col min-w-0">
                                  <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] tracking-tight">
                                    {new Date(
                                      row.attendance_date,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="text-[11px] sm:text-[12px] font-medium text-slate-500 mt-0.5">
                                    {new Date(
                                      row.attendance_date,
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                    })}
                                  </div>
                                </div>
                                <StatusBadge status={row.status} />
                              </div>

                              {(row.morning_ot_value > 0 ||
                                row.evening_ot_value > 0) && (
                                <div className="flex flex-wrap gap-2 mt-2.5">
                                  {row.morning_ot_value > 0 && (
                                    <OTBadge
                                      type={row.morning_ot_type}
                                      value={row.morning_ot_value}
                                    />
                                  )}
                                  {row.evening_ot_value > 0 && (
                                    <OTBadge
                                      type={row.evening_ot_type}
                                      value={row.evening_ot_value}
                                    />
                                  )}
                                </div>
                              )}

                              {row.remarks && (
                                <div className="mt-2 text-[11px] sm:text-[12px] font-medium text-slate-600 bg-slate-50 p-2.5 rounded-[10px] border border-slate-100/80 leading-snug">
                                  <span className="font-bold text-slate-400 mr-1.5 uppercase tracking-widest text-[9px]">
                                    Note:
                                  </span>
                                  {row.remarks}
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-3 border-t border-slate-100/80 mt-3">
                                <button
                                  onClick={() => setEditRecord(row)}
                                  className="flex-1 bg-slate-50 hover:bg-blue-50 text-blue-600 font-bold text-[11px] sm:text-[12px] py-2 rounded-[8px] flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-blue-100"
                                >
                                  <Edit2 size={14} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="flex-1 bg-slate-50 hover:bg-rose-50 text-rose-600 font-bold text-[11px] sm:text-[12px] py-2 rounded-[8px] flex items-center justify-center gap-1.5 transition-colors border border-transparent hover:border-rose-100"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </div>

                            <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-slate-50 border-b border-slate-200/60 transition-all gap-4">
                              <div className="w-[200px] flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-[13px] font-bold text-slate-600 shrink-0 shadow-sm">
                                  <CalendarDays size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[14px] font-bold text-slate-800 tracking-tight truncate">
                                    {selectedStaff.name}
                                  </p>
                                </div>
                              </div>
                              <div className="w-[120px] font-bold text-[13px] text-slate-900 tabular-nums tracking-tight">
                                {new Date(
                                  row.attendance_date,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="w-[120px]">
                                <span className="text-[13px] font-medium text-slate-500">
                                  {new Date(
                                    row.attendance_date,
                                  ).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}
                                </span>
                              </div>
                              <div className="w-[120px]">
                                <StatusBadge status={row.status} />
                              </div>
                              <div className="w-[120px] flex flex-col gap-1">
                                {row.morning_ot_value > 0 && (
                                  <OTBadge
                                    type={row.morning_ot_type}
                                    value={row.morning_ot_value}
                                  />
                                )}
                                {row.evening_ot_value > 0 && (
                                  <OTBadge
                                    type={row.evening_ot_type}
                                    value={row.evening_ot_value}
                                  />
                                )}
                                {row.morning_ot_value === 0 &&
                                  row.evening_ot_value === 0 && (
                                    <span className="text-[13px] text-slate-400">
                                      —
                                    </span>
                                  )}
                              </div>
                              <div className="flex-1 min-w-[150px] text-[13px] font-medium text-slate-500 truncate">
                                {row.remarks || "—"}
                              </div>
                              <div className="w-[100px] text-right pr-2 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditRecord(row)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                                  title="Edit Record"
                                >
                                  <Edit2 size={16} strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => handleDelete(row.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                                  title="Delete Record"
                                >
                                  <Trash2 size={16} strokeWidth={2} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : activeTab === "REGISTER" ? (
                  <>
                    <div className="flex-1 overflow-x-auto relative pb-3 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 transition-colors">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md">
                            <th className="px-4 py-3 sticky left-0 z-20 w-[200px] bg-slate-50/90 backdrop-blur-md border-r border-slate-200/50 shadow-[4px_0_12px_rgba(0,0,0,0.02)] align-middle">
                              Staff Member
                            </th>
                            {currentPeriodInfo.map((day) => {
                              const isCurrentDay = day.dateStr === todayIsoStr;
                              return (
                                <th
                                  key={day.dateStr}
                                  className="px-2 py-3 text-center min-w-[50px] align-middle"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider ${isCurrentDay ? "text-blue-500" : "text-slate-400"}`}
                                    >
                                      {day.dayName.charAt(0)}
                                    </span>
                                    <span
                                      className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${isCurrentDay ? "bg-blue-500 text-white shadow-sm" : "text-slate-800"}`}
                                    >
                                      {day.dateNum}
                                    </span>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="pt-2">
                          {loading ? (
                            <tr>
                              <td
                                colSpan={daysInCurrentMonth + 1}
                                className="p-12 text-center"
                              >
                                <Loader2
                                  size={28}
                                  className="animate-spin text-blue-500 mx-auto"
                                />
                              </td>
                            </tr>
                          ) : matrixData.length === 0 ? (
                            <tr>
                              <td
                                colSpan={daysInCurrentMonth + 1}
                                className="p-16 text-center text-[13px] text-slate-400 font-medium"
                              >
                                No attendance data found for this period.
                              </td>
                            </tr>
                          ) : (
                            matrixData.map((staff) => (
                              <tr
                                key={staff.id}
                                className="hover:bg-slate-50 group transition-colors border-b border-slate-100/50"
                              >
                                <td className="px-4 py-3 sticky left-0 z-10 w-[200px] border-r border-slate-100/50 shadow-[4px_0_12px_rgba(0,0,0,0.02)] bg-white group-hover:bg-slate-50 transition-colors">
                                  <div
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() =>
                                      handleStaffClick(staff.id, staff.name)
                                    }
                                  >
                                    <div className="w-8 h-8 rounded-[10px] bg-slate-100 border border-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shadow-sm">
                                      {staff.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                                        {staff.name}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                {currentPeriodInfo.map((day) => {
                                  const log = staff.logs[day.dateStr];
                                  return (
                                    <td
                                      key={day.dateStr}
                                      className="px-1 py-3 text-center align-middle border-r border-slate-50/50 last:border-0"
                                    >
                                      {log ? (
                                        <MatrixCell log={log} />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 inline-block"></span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                      <div className="w-[200px]">Staff Member</div>
                      <div className="w-[100px] text-center">Present</div>
                      <div className="w-[100px] text-center">Absent</div>
                      <div className="w-[100px] text-center">Half Days</div>
                      <div className="w-[100px] text-center">Holidays</div>
                      <div className="w-[120px] text-center">OT Hrs</div>
                      <div className="w-[160px] text-center flex flex-col items-center justify-center">
                        <span className="flex items-center gap-1.5">
                          <Calculator size={12} /> Payable Days
                        </span>
                        <span className="text-[9px] text-blue-500 font-bold tracking-tighter lowercase">
                          (30-day basis)
                        </span>
                      </div>
                      <div className="flex-1 text-right pr-2">Action</div>
                    </div>

                    <div
                      className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-0 pt-2 lg:pt-3 overflow-y-auto ${filteredSummary.length === 0 ? "flex-1" : ""}`}
                    >
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
                      ) : filteredSummary.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <BarChart3
                              size={24}
                              strokeWidth={1.5}
                              className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                            />
                          </div>
                          <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                            No summary found
                          </p>
                          <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm px-4 text-center">
                            Try adjusting your search criteria.
                          </p>
                        </div>
                      ) : (
                        filteredSummary.map((row) => {
                          const presentDays = Number(row.total_days_present);
                          const holidayDays = Number(row.total_holidays);

                          const actualDaysWorkedAndHolidays =
                            presentDays + holidayDays;
                          const payableDays30 = (
                            (actualDaysWorkedAndHolidays / daysInCurrentMonth) *
                            30
                          ).toFixed(1);

                          return (
                            <div
                              key={row.personnel_id}
                              className="group flex flex-col w-full shrink-0"
                            >
                              <div
                                onClick={() =>
                                  handleStaffClick(
                                    row.personnel_id,
                                    row.staff_name,
                                  )
                                }
                                className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] p-4 mx-1 cursor-pointer active:scale-[0.98] transition-all"
                              >
                                <div className="flex items-center gap-3 border-b border-slate-100/80 pb-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-[14px] text-slate-600 border border-slate-200/80 shadow-sm">
                                    {row.staff_name.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-[15px] text-slate-900 tracking-tight truncate">
                                      {row.staff_name}
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-400 tracking-widest uppercase mt-0.5">
                                      ID: {row.personnel_id}
                                    </div>
                                  </div>
                                  <ArrowRight
                                    size={16}
                                    className="text-slate-300"
                                  />
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-3">
                                  <div className="bg-emerald-50/50 p-2 rounded-[10px] text-center border border-emerald-100/50">
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">
                                      Present
                                    </p>
                                    <p className="text-[13px] font-bold text-emerald-700 tabular-nums">
                                      {presentDays}
                                    </p>
                                  </div>
                                  <div className="bg-rose-50/50 p-2 rounded-[10px] text-center border border-rose-100/50">
                                    <p className="text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-0.5">
                                      Absent
                                    </p>
                                    <p className="text-[13px] font-bold text-rose-700 tabular-nums">
                                      {Number(row.total_absent)}
                                    </p>
                                  </div>
                                  <div className="bg-amber-50/50 p-2 rounded-[10px] text-center border border-amber-100/50">
                                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">
                                      Halfday
                                    </p>
                                    <p className="text-[13px] font-bold text-amber-700 tabular-nums">
                                      {Number(row.total_half_days)}
                                    </p>
                                  </div>
                                  <div className="bg-purple-50/50 p-2 rounded-[10px] text-center border border-purple-100/50">
                                    <p className="text-[9px] font-bold text-purple-600 uppercase tracking-widest mb-0.5">
                                      Holiday
                                    </p>
                                    <p className="text-[13px] font-bold text-purple-700 tabular-nums">
                                      {holidayDays}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2.5 rounded-[10px]">
                                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                                    Payable (30-day base)
                                  </span>
                                  <span className="text-[16px] font-black text-blue-600">
                                    {payableDays30}
                                  </span>
                                </div>
                              </div>

                              <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-slate-50 border-b border-slate-200/60 transition-all gap-4">
                                <div
                                  className="w-[200px] flex items-center gap-3.5 cursor-pointer"
                                  onClick={() =>
                                    handleStaffClick(
                                      row.personnel_id,
                                      row.staff_name,
                                    )
                                  }
                                >
                                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-[13px] font-bold text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200/50 transition-colors shadow-sm">
                                    {row.staff_name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                                      {row.staff_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-0.5">
                                      ID: {row.personnel_id}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-[100px] text-center text-[14px] font-bold text-emerald-600 tabular-nums">
                                  {presentDays}
                                </div>
                                <div className="w-[100px] text-center text-[14px] font-bold text-rose-600 tabular-nums">
                                  {Number(row.total_absent)}
                                </div>
                                <div className="w-[100px] text-center text-[14px] font-bold text-amber-600 tabular-nums">
                                  {Number(row.total_half_days)}
                                </div>
                                <div className="w-[100px] text-center text-[14px] font-bold text-purple-600 tabular-nums">
                                  {holidayDays}
                                </div>
                                <div className="w-[120px] text-center text-[13px] font-bold text-slate-600 tabular-nums">
                                  {Number(row.total_ot_hours)} hrs
                                </div>
                                <div className="w-[160px] text-center flex justify-center">
                                  <div className="bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-[8px] shadow-sm">
                                    <span className="text-[15px] font-black text-blue-600 tracking-tight tabular-nums">
                                      {payableDays30}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 text-right pr-2">
                                  <button
                                    onClick={() =>
                                      handleStaffClick(
                                        row.personnel_id,
                                        row.staff_name,
                                      )
                                    }
                                    className="px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-[8px] transition-colors active:scale-95 border border-blue-100/50 hover:border-blue-600 shadow-sm inline-flex items-center gap-1.5"
                                  >
                                    <CalendarDays size={12} strokeWidth={2.5} />{" "}
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkAddOpen && (
          <BulkAddFullPage
            onClose={() => setIsBulkAddOpen(false)}
            onSuccess={() => {
              setIsBulkAddOpen(false);
              fetchData();
            }}
          />
        )}
        {editRecord && (
          <EditRecordModal
            record={editRecord}
            onClose={() => setEditRecord(null)}
            onSuccess={() => {
              setEditRecord(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const BulkAddFullPage = ({ onClose, onSuccess }) => {
  const [date, setDate] = useState(toLocalISODate(new Date()));
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isFactoryHoliday, setIsFactoryHoliday] = useState(false);
  const [isExistingHolidayLocked, setIsExistingHolidayLocked] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const fetchDayData = async () => {
      setLoading(true);
      try {
        const [staffRes, attRes] = await Promise.all([
          api.get("/staff?personnel_type=STAFF"),
          api.get(
            `/attendance?date_filter=CUSTOM&startDate=${date}&endDate=${date}`,
          ),
        ]);

        const existingData = attRes.data.data || [];
        const staffList = staffRes.data.data || [];

        const existingMap = {};
        existingData.forEach((r) => (existingMap[r.personnel_id] = r));

        const merged = staffList.map((s) => {
          const ex = existingMap[s.id];
          return {
            personnel_id: s.id,
            name: s.full_name,
            status: ex ? ex.status : "PRESENT",
            morning_ot_type: ex ? ex.morning_ot_type : "NONE",
            morning_ot_value: ex ? Number(ex.morning_ot_value) : 0,
            evening_ot_type: ex ? ex.evening_ot_type : "NONE",
            evening_ot_value: ex ? Number(ex.evening_ot_value) : 0,
            remarks: ex ? ex.remarks : "",
          };
        });

        setStaff(merged);

        const isHoliday =
          existingData.length > 0 &&
          existingData.every((r) => r.status === "HOLIDAY");
        setIsExistingHolidayLocked(isHoliday);
        setIsFactoryHoliday(isHoliday);
      } catch (error) {
        console.error("Failed to load date info", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDayData();
  }, [date]);

  const updateRow = (id, field, value) => {
    if (isExistingHolidayLocked) return;
    setStaff((prev) =>
      prev.map((s) => {
        if (s.personnel_id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === "morning_ot_type" && value === "NONE")
          updated.morning_ot_value = 0;
        if (field === "evening_ot_type" && value === "NONE")
          updated.evening_ot_value = 0;
        return updated;
      }),
    );
  };

  const handleRevokeHoliday = () => {
    if (
      !window.confirm(
        "Are you sure you want to revoke this holiday? You will need to manually mark attendance for everyone.",
      )
    )
      return;
    setIsExistingHolidayLocked(false);
    setIsFactoryHoliday(false);
    setStaff((prev) =>
      prev.map((s) => ({ ...s, status: "PRESENT", remarks: "" })),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalRecords = isFactoryHoliday
        ? staff.map((s) => ({
            ...s,
            status: "HOLIDAY",
            morning_ot_type: "NONE",
            morning_ot_value: 0,
            evening_ot_type: "NONE",
            evening_ot_value: 0,
            remarks: "Factory Holiday",
          }))
        : staff;

      await api.post("/attendance", {
        attendance_date: date,
        records: finalRecords,
      });
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.35, ease: smoothEase }}
      className="fixed inset-0 z-[999] bg-white flex flex-col font-sans antialiased overflow-hidden"
    >
      <div className="flex flex-col h-full w-full max-w-[1440px] mx-auto p-0 sm:p-2 lg:p-0 gap-0 sm:gap-2 lg:gap-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-full hover:bg-slate-50 hover:shadow transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={18} className="text-slate-600 sm:w-5 sm:h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-[24px] sm:text-[30px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 truncate">
                Mark Attendance
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight truncate">
                Log daily attendance and OT hours for your workforce.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
            <div className="relative w-full sm:w-[200px] min-w-0">
              <div className="flex items-center w-full h-[40px] px-3 sm:px-4 bg-white border border-slate-200/80 shadow-sm rounded-[10px] focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all overflow-hidden box-border">
                <Calendar
                  size={16}
                  strokeWidth={2}
                  className="text-slate-400 shrink-0 mr-2"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 w-full min-w-0 max-w-full appearance-none bg-transparent border-none outline-none text-[13px] font-bold text-slate-900 cursor-pointer p-0 m-0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 shrink-0 border-b border-slate-100/80">
          {isExistingHolidayLocked ? (
            <div className="px-5 py-3 bg-rose-50 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[12px] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Lock size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-rose-900 tracking-tight">
                    Attendance is Locked
                  </p>
                  <p className="text-[11px] font-medium text-rose-700/80">
                    A Factory Holiday is already declared for this date.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRevokeHoliday}
                className="h-[36px] px-4 bg-white text-rose-600 border border-rose-200 rounded-[8px] text-[12px] font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors active:scale-95 w-full sm:w-auto tracking-wide"
              >
                <Unlock size={14} strokeWidth={2.5} /> Revoke Holiday
              </button>
            </div>
          ) : (
            <div className="px-5 py-3 bg-purple-50/50 border border-purple-100/60 flex items-center justify-between rounded-[12px] transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isFactoryHoliday ? "bg-purple-500 text-white shadow-sm" : "bg-purple-100 text-purple-600"}`}
                >
                  <PartyPopper size={16} />
                </div>
                <div>
                  <p
                    className={`text-[13px] font-bold tracking-tight ${isFactoryHoliday ? "text-purple-900" : "text-slate-700"}`}
                  >
                    Declare Factory Holiday
                  </p>
                  <p className="text-[11px] font-medium text-purple-600/80 hidden sm:block">
                    Override all inputs and mark everyone as Holiday.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFactoryHoliday(!isFactoryHoliday)}
                className={`relative w-12 h-[26px] rounded-full transition-colors duration-300 shadow-inner outline-none shrink-0 ${isFactoryHoliday ? "bg-purple-500" : "bg-slate-300"}`}
              >
                <motion.div
                  layout
                  className={`absolute top-1 left-1 w-[18px] h-[18px] rounded-full bg-white shadow-sm ${isFactoryHoliday ? "translate-x-[22px]" : "translate-x-0"}`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col w-full relative">
          <AnimatePresence>
            {isFactoryHoliday && !isExistingHolidayLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <div className="bg-white p-8 rounded-[24px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.2)] border border-purple-100 max-w-sm text-center">
                  <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm">
                    <PartyPopper size={28} />
                  </div>
                  <h3 className="text-[18px] font-bold text-slate-900 mb-1.5 tracking-tight">
                    Holiday Mode Active
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                    Saving will automatically log all{" "}
                    <b className="text-slate-700">{staff.length} staff</b> as
                    "FACTORY HOLIDAY".
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex flex-col w-full min-h-0 relative z-10 bg-white">
            <div className="hidden lg:flex items-center px-6 py-2.5 border-b border-slate-200/80 w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-2 bg-slate-50/50">
              <div className="w-[240px]">Staff Member</div>
              <div className="w-[260px] text-center">Status</div>
              <div className="w-[320px]">Overtime (Morn / Eve)</div>
              <div className="flex-1 min-w-[100px]">Remarks</div>
            </div>

            {loading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Loader2
                  size={32}
                  className="animate-spin text-blue-500 mb-4"
                  strokeWidth={1.5}
                />
                <p className="text-[14px] font-semibold text-slate-500 tracking-tight">
                  Loading roster...
                </p>
              </div>
            ) : (
              <div className="flex flex-col relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {staff.map((s) => (
                  <div
                    key={s.personnel_id}
                    className={`group flex flex-col w-full shrink-0 transition-all ${isExistingHolidayLocked || isFactoryHoliday ? "opacity-50 grayscale-[0.6] pointer-events-none" : ""}`}
                  >
                    <div className="flex flex-col lg:hidden border-b border-slate-200/80 p-4 gap-4 bg-white">
                      <div className="flex items-center gap-3.5 border-b border-slate-100/80 pb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[14px] font-bold text-slate-600 shrink-0 shadow-sm">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-slate-900 tracking-tight truncate">
                            {s.name}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                            ID: {s.personnel_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex bg-slate-100/70 p-1 rounded-full border border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] gap-1 w-full">
                        {["ABSENT", "PRESENT", "HALF_DAY"].map((status) => {
                          const isActive = s.status === status;
                          const activeClass =
                            status === "PRESENT"
                              ? "bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                              : status === "ABSENT"
                                ? "bg-rose-500 text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)]"
                                : "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.3)]";

                          return (
                            <button
                              key={status}
                              onClick={() =>
                                updateRow(s.personnel_id, "status", status)
                              }
                              className={`flex-1 py-2 px-1 rounded-full text-[10px] font-bold tracking-wide transition-all duration-300 outline-none ${
                                isActive
                                  ? activeClass
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                              }`}
                            >
                              {status.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-row items-center gap-3 w-full">
                        <OTMiniInput
                          label="Morn"
                          icon={Sun}
                          valueType={s.morning_ot_type}
                          valueVal={s.morning_ot_value}
                          onChangeType={(v) =>
                            updateRow(s.personnel_id, "morning_ot_type", v)
                          }
                          onChangeVal={(v) =>
                            updateRow(s.personnel_id, "morning_ot_value", v)
                          }
                          compact={false}
                        />
                        <div className="w-px h-8 bg-slate-200 shrink-0"></div>
                        <OTMiniInput
                          label="Eve"
                          icon={Moon}
                          valueType={s.evening_ot_type}
                          valueVal={s.evening_ot_value}
                          onChangeType={(v) =>
                            updateRow(s.personnel_id, "evening_ot_type", v)
                          }
                          onChangeVal={(v) =>
                            updateRow(s.personnel_id, "evening_ot_value", v)
                          }
                          compact={false}
                        />
                      </div>

                      <div className="w-full">
                        <input
                          type="text"
                          value={s.remarks}
                          onChange={(e) =>
                            updateRow(s.personnel_id, "remarks", e.target.value)
                          }
                          className="w-full h-[40px] px-4 rounded-[10px] bg-slate-50/80 border border-slate-200/80 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.01)]"
                          placeholder="Add remark..."
                        />
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center w-full px-6 py-2 hover:bg-slate-50 border-b border-slate-100 transition-colors gap-2">
                      <div className="w-[240px] flex items-center gap-3 shrink-0 pr-2">
                        <div className="w-9 h-9 rounded-[8px] bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 font-bold text-[13px] shrink-0 shadow-sm">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-slate-900 tracking-tight truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-[1px]">
                            ID: {s.personnel_id}
                          </p>
                        </div>
                      </div>

                      <div className="w-[260px] shrink-0 flex justify-center">
                        <div className="flex bg-slate-100/70 p-0.5 rounded-[8px] border border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] w-full gap-0.5">
                          {["ABSENT", "PRESENT", "HALF_DAY"].map((status) => {
                            const isActive = s.status === status;
                            const activeClass =
                              status === "PRESENT"
                                ? "bg-emerald-500 text-white shadow-sm"
                                : status === "ABSENT"
                                  ? "bg-rose-500 text-white shadow-sm"
                                  : "bg-amber-500 text-white shadow-sm";

                            return (
                              <button
                                key={status}
                                onClick={() =>
                                  updateRow(s.personnel_id, "status", status)
                                }
                                className={`flex-1 py-1.5 px-1 rounded-[6px] text-[10px] font-bold tracking-wide transition-all duration-200 outline-none ${
                                  isActive
                                    ? activeClass
                                    : "text-slate-500 hover:text-slate-900 hover:bg-white"
                                }`}
                              >
                                {status.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="w-[320px] shrink-0 flex items-center gap-2 pl-4">
                        <OTMiniInput
                          label="Morn"
                          icon={Sun}
                          valueType={s.morning_ot_type}
                          valueVal={s.morning_ot_value}
                          onChangeType={(v) =>
                            updateRow(s.personnel_id, "morning_ot_type", v)
                          }
                          onChangeVal={(v) =>
                            updateRow(s.personnel_id, "morning_ot_value", v)
                          }
                          compact={true}
                        />
                        <div className="w-px h-6 bg-slate-200 shrink-0"></div>
                        <OTMiniInput
                          label="Eve"
                          icon={Moon}
                          valueType={s.evening_ot_type}
                          valueVal={s.evening_ot_value}
                          onChangeType={(v) =>
                            updateRow(s.personnel_id, "evening_ot_type", v)
                          }
                          onChangeVal={(v) =>
                            updateRow(s.personnel_id, "evening_ot_value", v)
                          }
                          compact={true}
                        />
                      </div>

                      <div className="flex-1 min-w-0 pl-2">
                        <input
                          type="text"
                          value={s.remarks}
                          onChange={(e) =>
                            updateRow(s.personnel_id, "remarks", e.target.value)
                          }
                          className="w-full h-[32px] px-3 rounded-[8px] bg-slate-50 border border-slate-200/80 text-[12px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all shadow-sm hover:border-slate-300"
                          placeholder="Remarks..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200/80 flex flex-row items-center justify-between shrink-0 bg-white">
          <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
            Total Staff:{" "}
            <span className="text-slate-700 ml-1">{staff.length}</span>
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none h-[40px] px-5 rounded-[10px] text-[13px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors active:scale-95 bg-white tracking-wide"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || isExistingHolidayLocked}
              className={`flex-[2] sm:flex-none h-[40px] px-8 rounded-[10px] text-white text-[14px] font-semibold tracking-wide flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95 ${isFactoryHoliday ? "bg-purple-600 hover:bg-purple-700 shadow-purple-200" : "bg-slate-900 hover:bg-slate-800"}`}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} strokeWidth={2.5} />
              )}
              {isFactoryHoliday ? "Save Holiday" : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
};

const KpiFullPage = ({
  type,
  summaryData,
  attendanceData,
  dateFilter,
  onClose,
  onStaffClick,
}) => {
  const [search, setSearch] = useState("");

  const config = {
    PRESENT: {
      title: "Present Details",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200/60",
      iconColor: "text-emerald-600",
      icon: UserCheck,
      getCount: (r) => Number(r.total_days_present || 0),
      unit: "Day(s)",
    },
    ABSENT: {
      title: "Absent Details",
      color: "text-rose-700 bg-rose-50 border-rose-200/60",
      iconColor: "text-rose-600",
      icon: UserX,
      getCount: (r) => Number(r.total_absent || 0),
      unit: "Day(s)",
    },
    HALF_DAY: {
      title: "Half Days Details",
      color: "text-amber-700 bg-amber-50 border-amber-200/60",
      iconColor: "text-amber-600",
      icon: UserMinus,
      getCount: (r) => Number(r.total_half_days || 0),
      unit: "Half Day(s)",
    },
  }[type];

  const ModalIcon = config.icon;

  const displayData = summaryData
    .map((r) => {
      const count = config.getCount(r);
      const dates = attendanceData
        .filter(
          (log) => log.personnel_id === r.personnel_id && log.status === type,
        )
        .map((log) =>
          new Date(log.attendance_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
        );
      return { ...r, count, dates };
    })
    .filter(
      (r) =>
        r.count > 0 &&
        r.staff_name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 px-1 mt-1">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2.5 bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-full hover:bg-slate-50 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1.5 flex items-center gap-3">
              {config.title}
            </h1>
            <p className="text-[13px] font-medium text-slate-500 tracking-tight">
              Filtered by{" "}
              <strong className="text-slate-700 uppercase tracking-wide">
                {dateFilter}
              </strong>
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full xl:w-auto min-w-0 shrink-0">
          <div className="relative w-full sm:w-[320px] group">
            <Search
              size={16}
              strokeWidth={2.5}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors"
            />
            <input
              type="text"
              placeholder="Search staff members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[44px] pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[14px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full p-4 sm:p-6 overflow-y-auto bg-white border border-slate-200/80 shadow-sm rounded-[24px] sm:rounded-[28px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {displayData.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center py-10">
            <ModalIcon
              size={48}
              strokeWidth={1}
              className="text-slate-200 mb-4"
            />
            <h3 className="text-[18px] font-bold text-slate-700 tracking-tight">
              No records found
            </h3>
            <p className="text-[14px] text-slate-500 font-medium mt-1 max-w-sm text-center px-4">
              We couldn't find any staff members matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-start">
            {displayData.map((staff) => (
              <div
                key={staff.personnel_id}
                onClick={() =>
                  onStaffClick(staff.personnel_id, staff.staff_name)
                }
                className="flex flex-col p-5 bg-white border border-slate-200/80 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-[14px] font-bold text-slate-600 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm">
                      {staff.staff_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight truncate">
                        {staff.staff_name}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
                        ID: {staff.personnel_id}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3.5 py-1.5 rounded-[12px] border shadow-sm flex items-center gap-1.5 shrink-0 ml-3 ${config.color}`}
                  >
                    <span className="text-[16px] font-bold">{staff.count}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {config.unit}
                    </span>
                  </div>
                </div>

                {staff.dates && staff.dates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100/80 w-full">
                    {staff.dates.map((d, i) => (
                      <span
                        key={i}
                        className="text-[10.5px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-[6px] border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] whitespace-nowrap tracking-wide"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  color,
  onClick,
  clickable,
}) => (
  <motion.div variants={fadeScale} className="h-full w-full">
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 lg:p-6 h-full flex flex-col justify-center bg-white border border-slate-200/80 transition-all duration-500 rounded-[20px] lg:rounded-[24px] shadow-sm relative ${clickable ? "cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 active:scale-[0.98]" : "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"}`}
    >
      <div className="flex items-center justify-between w-full mb-2 sm:mb-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 flex items-center justify-center shadow-sm border border-slate-200/60 shrink-0">
            <Icon size={14} strokeWidth={2.5} className={color} />
          </div>
          <p className="text-[12px] font-semibold text-slate-500 tracking-tight truncate">
            {title}
          </p>
        </div>
      </div>
      <p className="text-[22px] sm:text-[28px] font-bold tracking-tight tabular-nums text-slate-900 leading-none truncate mt-0.5">
        {value}{" "}
        {unit && (
          <span className="text-[12px] sm:text-[13px] font-semibold text-slate-400 ml-0.5">
            {unit}
          </span>
        )}
      </p>
    </div>
  </motion.div>
);

const StatusBadge = ({ status }) => {
  const styles =
    {
      PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      ABSENT: "bg-rose-50 text-rose-700 border-rose-200/60",
      HALF_DAY: "bg-amber-50 text-amber-700 border-amber-200/60",
      HOLIDAY: "bg-purple-50 text-purple-700 border-purple-200/60",
    }[status] || "bg-slate-50 text-slate-700 border-slate-200/60";

  return (
    <span
      className={`px-2.5 py-1 rounded-[8px] text-[10px] font-bold tracking-widest uppercase border shadow-sm whitespace-nowrap ${styles}`}
    >
      {status === "HOLIDAY" ? "Holiday" : status.replace("_", " ")}
    </span>
  );
};

const MatrixCell = ({ log }) => {
  const { status } = log;

  const statusConfig = {
    PRESENT: {
      label: "Present",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    },
    ABSENT: {
      label: "Absent",
      color: "bg-rose-50 text-rose-700 border-rose-200/60",
    },
    HALF_DAY: {
      label: "Halfday",
      color: "bg-amber-50 text-amber-700 border-amber-200/60",
    },
    HOLIDAY: {
      label: "Holiday",
      color: "bg-purple-50 text-purple-700 border-purple-200/60",
    },
  }[status] || {
    label: "—",
    color: "bg-transparent text-slate-300 border-transparent",
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full py-1">
      <div
        className={`px-1.5 py-1 rounded-[6px] border text-[10px] font-bold tracking-tight shadow-sm whitespace-nowrap ${statusConfig.color}`}
      >
        {statusConfig.label}
      </div>
    </div>
  );
};

const OTBadge = ({ type, value }) => {
  if (!type || type === "NONE" || value === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-indigo-50 text-[10.5px] sm:text-[11px] font-bold tracking-tight text-indigo-700 border border-indigo-200/60 shadow-sm whitespace-nowrap">
      <Clock size={10} strokeWidth={2.5} />
      {value} {type === "HOURLY" ? "Hr(s)" : "Halfday"}
    </span>
  );
};

const OTMiniInput = ({
  valueType,
  valueVal,
  onChangeType,
  onChangeVal,
  label,
  icon: Icon,
  disabled,
  compact = false,
}) => (
  <div
    className={`flex flex-col gap-1 w-full flex-1 min-w-0 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
  >
    <div
      className={`flex items-center bg-slate-50/50 border border-slate-200/80 ${compact ? "rounded-[8px] h-[32px]" : "rounded-[10px] h-[36px]"} overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all shadow-[inset_0_1px_4px_rgba(0,0,0,0.01)] group hover:border-slate-300`}
    >
      <select
        value={valueType}
        onChange={(e) => {
          onChangeType(e.target.value);
          if (e.target.value === "NONE") onChangeVal(0);
        }}
        className={`h-full pl-2 pr-5 bg-transparent ${compact ? "text-[10px]" : "text-[11px]"} font-bold text-slate-700 outline-none cursor-pointer border-r border-slate-200/80 appearance-none flex-1 min-w-0 tracking-tight transition-colors group-hover:bg-slate-100/50`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: "right 0.2rem center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1em 1em",
        }}
      >
        <option value="NONE">{label} OT</option>
        <option value="HOURLY">Hr(s)</option>
        <option value="HALF_DAY_SHIFT">Shift</option>
      </select>
      <input
        type="number"
        min="0"
        step="0.5"
        disabled={valueType === "NONE"}
        value={valueType === "NONE" ? "" : valueVal}
        onChange={(e) => onChangeVal(Number(e.target.value))}
        className={`w-[40px] h-full px-1 bg-white ${compact ? "text-[11px]" : "text-[12px]"} font-bold text-slate-900 outline-none text-center disabled:bg-slate-50/50 disabled:text-slate-300 placeholder:text-slate-300`}
        placeholder="0"
      />
    </div>
  </div>
);

const EditRecordModal = ({ record, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    status: record.status,
    morning_ot_type: record.morning_ot_type || "NONE",
    morning_ot_value: record.morning_ot_value || 0,
    evening_ot_type: record.evening_ot_type || "NONE",
    evening_ot_value: record.evening_ot_value || 0,
    remarks: record.remarks || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.morning_ot_type === "NONE") payload.morning_ot_value = 0;
      if (payload.evening_ot_type === "NONE") payload.evening_ot_value = 0;
      await api.patch(`/attendance/${record.id}`, payload);
      onSuccess();
    } catch (error) {
      alert("Failed to update record");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="relative z-10 w-full max-w-md bg-white rounded-[28px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] border border-slate-200/80 flex flex-col overflow-hidden max-h-[90vh]"
      >
        <div className="px-6 py-5 bg-slate-50/30 border-b border-slate-100/80 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1.5">
              Edit Record
            </h2>
            <p className="text-[12px] font-medium text-slate-500 tracking-tight">
              {record.staff_name} &bull;{" "}
              {new Date(record.attendance_date).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 rounded-full transition-colors active:scale-95 text-slate-400 hover:text-slate-900"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto bg-white [-webkit-overflow-scrolling:touch]">
          <div className="flex bg-slate-100/70 p-1.5 rounded-[16px] sm:rounded-full border border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] gap-1 flex-wrap sm:flex-nowrap">
            {["ABSENT", "PRESENT", "HALF_DAY", "HOLIDAY"].map((st) => {
              const isActive = formData.status === st;
              let activeClass =
                "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-slate-900";
              if (st === "HOLIDAY")
                activeClass =
                  "bg-purple-500 text-white shadow-[0_2px_10px_rgba(168,85,247,0.3)] border-transparent";
              else if (st === "PRESENT")
                activeClass =
                  "bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.3)] border-transparent";
              else if (st === "ABSENT")
                activeClass =
                  "bg-rose-500 text-white shadow-[0_2px_10px_rgba(244,63,94,0.3)] border-transparent";
              else if (st === "HALF_DAY")
                activeClass =
                  "bg-amber-500 text-white shadow-[0_2px_10px_rgba(245,158,11,0.3)] border-transparent";

              return (
                <button
                  key={st}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      status: st,
                      ...(st === "HOLIDAY" && {
                        morning_ot_type: "NONE",
                        evening_ot_type: "NONE",
                      }),
                    })
                  }
                  className={`flex-1 py-2 px-1 text-[10px] sm:text-[11px] font-bold tracking-wide rounded-full transition-all duration-300 outline-none ${
                    isActive
                      ? activeClass
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {st === "HALF_DAY"
                    ? "HALF DAY"
                    : st === "HOLIDAY"
                      ? "HOLIDAY"
                      : st}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 p-5 bg-slate-50/50 rounded-[20px] border border-slate-100/80">
            <OTMiniInput
              label="Morning"
              icon={Sun}
              disabled={formData.status === "HOLIDAY"}
              valueType={formData.morning_ot_type}
              valueVal={formData.morning_ot_value}
              onChangeType={(val) =>
                setFormData({ ...formData, morning_ot_type: val })
              }
              onChangeVal={(val) =>
                setFormData({ ...formData, morning_ot_value: val })
              }
            />
            <div className="w-full h-px bg-slate-200/60"></div>
            <OTMiniInput
              label="Evening"
              icon={Moon}
              disabled={formData.status === "HOLIDAY"}
              valueType={formData.evening_ot_type}
              valueVal={formData.evening_ot_value}
              onChangeType={(val) =>
                setFormData({ ...formData, evening_ot_type: val })
              }
              onChangeVal={(val) =>
                setFormData({ ...formData, evening_ot_value: val })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              Remarks
            </label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              placeholder="Add a note..."
              className="w-full h-[44px] px-4 rounded-full bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-[13px] font-medium text-slate-900 outline-none shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] transition-all"
            />
          </div>
        </div>

        <div className="px-6 py-5 bg-slate-50/30 border-t border-slate-100/80 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="h-[44px] px-6 rounded-full text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors active:scale-95 bg-slate-100/80 tracking-wide"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[44px] px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-[14px] font-semibold tracking-wide shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} strokeWidth={2.5} />
            )}
            Save Updates
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default AttendancePage;
