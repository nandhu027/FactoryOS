import { Search, Calendar, Filter, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const smoothEase = [0.22, 1, 0.36, 1];

const ExpenseFilters = ({ filters, setFilters, onApply }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onApply();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: smoothEase }}
      onSubmit={handleSubmit}
      className="bg-white p-2.5 sm:p-3 rounded-[16px] sm:rounded-[20px] border border-slate-200/80 shadow-sm flex flex-col xl:flex-row gap-2.5 mb-4 transform-gpu [contain:content]"
    >
      <div className="relative group w-full xl:flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
          <Search size={14} strokeWidth={2} />
        </div>
        <input
          type="text"
          placeholder="Search expenses by reason or reference..."
          value={filters.search || ""}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full h-[36px] pl-9 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[10px] text-[12px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none tracking-tight shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] placeholder:text-slate-400"
        />
      </div>
      <div className="hidden xl:block w-px bg-slate-100 my-1 mx-1" />
      <div className="flex flex-col sm:flex-row gap-2.5 w-full xl:w-auto">
        <div className="relative group flex items-center w-full sm:w-auto flex-1 sm:flex-none">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
            <Calendar size={14} strokeWidth={2} />
          </div>
          <select
            value={filters.date_filter || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                date_filter: e.target.value,
                start_date: "",
                end_date: "",
              })
            }
            className="w-full sm:min-w-[150px] appearance-none h-[36px] pl-9 pr-8 bg-white border border-slate-200/80 rounded-[10px] text-[12px] font-bold text-slate-700 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] relative z-0"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors z-10">
            <ChevronDown size={14} strokeWidth={2} />
          </div>
        </div>
        <AnimatePresence>
          {filters.date_filter === "custom" && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex items-center gap-1.5 overflow-hidden shrink-0"
            >
              <input
                type="date"
                value={filters.start_date || ""}
                onChange={(e) =>
                  setFilters({ ...filters, start_date: e.target.value })
                }
                className="h-[36px] px-2.5 bg-white border border-slate-200/80 rounded-[10px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all text-[11px] font-bold text-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
              <span className="text-slate-400 text-[12px] font-bold">-</span>
              <input
                type="date"
                value={filters.end_date || ""}
                onChange={(e) =>
                  setFilters({ ...filters, end_date: e.target.value })
                }
                className="h-[36px] px-2.5 bg-white border border-slate-200/80 rounded-[10px] outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all text-[11px] font-bold text-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="submit"
          className="h-[36px] px-5 bg-slate-900 text-white rounded-[10px] text-[12px] font-bold tracking-wide transition-all hover:bg-slate-800 shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 active:scale-95"
        >
          <Filter size={14} strokeWidth={2} />
          Apply
        </button>
      </div>
    </motion.form>
  );
};

export default ExpenseFilters;
