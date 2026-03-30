import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Tags,
  Receipt,
  Inbox,
  Activity,
  ChevronDown,
  X,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";
import ExpenseSummaryCards from "./ExpenseSummaryCards";
import CategoryDetailsModal from "./CategoryDeatilModal";
import ExpenseForm from "./ExpenseFormModal";
import CategoryForm from "./CategoryForm";
import toast from "react-hot-toast";

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const formatINR = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const ExpensePage = () => {
  const [activeTab, setActiveTab] = useState("expenses");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [localSearch, setLocalSearch] = useState("");
  const [expenseFilters, setExpenseFilters] = useState({
    search: "",
    date_filter: "month",
    category_id: "",
    start_date: "",
    end_date: "",
  });
  const [expenseModal, setExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [categoryList, setCategoryList] = useState([]);
  const [viewCategoryStats, setViewCategoryStats] = useState(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get("/expenses/categories");
      setCategories(res.data.rows || []);
      setCategoryList(res.data.rows || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    if (
      expenseFilters.date_filter === "custom" &&
      (!expenseFilters.start_date || !expenseFilters.end_date)
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(expenseFilters).filter(([_, value]) => value !== ""),
      );
      cleanFilters._t = Date.now();
      const res = await api.get("/expenses", { params: cleanFilters });
      setExpenses(res.data.rows || []);
    } catch (err) {
      toast.error("Failed to fetch expenses");
    } finally {
      setIsLoading(false);
    }
  }, [expenseFilters, refreshTrigger]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setCurrentPage(1);
    loadExpenses();
  }, [loadExpenses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setExpenseFilters((prev) => ({ ...prev, search: localSearch }));
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?"))
      return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted successfully");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error("Failed to delete expense");
    }
  };

  const deleteCategory = async (id) => {
    if (
      !window.confirm("Delete this category? Ensure no expenses are attached.")
    )
      return;
    try {
      await api.delete(`/expenses/categories/${id}`);
      toast.success("Category deleted");
      loadCategories();
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cannot delete category");
    }
  };
  const activeData = activeTab === "expenses" ? expenses : categoryList;
  const filteredData =
    activeTab === "categories" && localSearch
      ? activeData.filter((c) =>
          c.category_name.toLowerCase().includes(localSearch.toLowerCase()),
        )
      : activeData;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-6 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 w-full min-w-0"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 truncate">
              Expense Engine
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-rose-500"></span>
              </span>
              <span className="truncate">Financials &bull; Outflow Ledger</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:flex-1 xl:ml-8 min-w-0">
            {/* Main Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative group flex-1 w-full min-w-[150px]"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder={
                  activeTab === "expenses"
                    ? "Search expenses..."
                    : "Search categories..."
                }
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (e.target.value === "") {
                    setExpenseFilters((prev) => ({ ...prev, search: "" }));
                  }
                }}
                className="w-full h-[40px] sm:h-[44px] pl-10 sm:pl-11 pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none min-w-0"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setExpenseFilters((prev) => ({ ...prev, search: "" }));
                  }}
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </form>
            <div className="flex flex-row items-center gap-3 w-full md:w-auto shrink-0 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
              <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full h-[40px] sm:h-[44px] shrink-0">
                <button
                  onClick={() => {
                    setActiveTab("expenses");
                    setCurrentPage(1);
                  }}
                  className={`px-3 sm:px-5 h-full rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === "expenses"
                      ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                      : "text-slate-500 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <Receipt
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 hidden sm:block"
                  />{" "}
                  Ledger
                </button>
                <button
                  onClick={() => {
                    setActiveTab("categories");
                    setCurrentPage(1);
                  }}
                  className={`px-3 sm:px-5 h-full rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === "categories"
                      ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                      : "text-slate-500 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <Tags
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 hidden sm:block"
                  />{" "}
                  Categories
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (activeTab === "expenses") {
                    setEditExpense(null);
                    setExpenseModal(true);
                  } else {
                    setEditCategory(null);
                    setCategoryModal(true);
                  }
                }}
                className="h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                  className="text-white/90 shrink-0"
                />
                <span>
                  {activeTab === "expenses" ? "Log Expense" : "New Category"}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeScale} className="w-full shrink-0 px-1">
          <ExpenseSummaryCards refreshTrigger={refreshTrigger} />
        </motion.div>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          {activeTab === "expenses" && (
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 sm:gap-3 mb-3 w-full shrink-0 min-w-0">
              <div className="relative group w-full sm:w-[180px] shrink-0">
                <Filter
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                />
                <select
                  value={expenseFilters.category_id}
                  onChange={(e) =>
                    setExpenseFilters({
                      ...expenseFilters,
                      category_id: e.target.value,
                    })
                  }
                  className="w-full h-[40px] pl-8 pr-8 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[10px] sm:rounded-full text-[12px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <div className="relative group w-full sm:w-[160px] shrink-0">
                <Calendar
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                />
                <select
                  value={expenseFilters.date_filter}
                  onChange={(e) =>
                    setExpenseFilters({
                      ...expenseFilters,
                      date_filter: e.target.value,
                      start_date: "",
                      end_date: "",
                    })
                  }
                  className="w-full h-[40px] pl-8 pr-8 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[10px] sm:rounded-full text-[12px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer truncate"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <AnimatePresence>
                {expenseFilters.date_filter === "custom" && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="flex items-center gap-2 overflow-hidden w-full sm:w-auto shrink-0"
                  >
                    <input
                      type="date"
                      value={expenseFilters.start_date}
                      onChange={(e) =>
                        setExpenseFilters({
                          ...expenseFilters,
                          start_date: e.target.value,
                        })
                      }
                      className="flex-1 w-full h-[40px] px-3 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[10px] text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input
                      type="date"
                      value={expenseFilters.end_date}
                      onChange={(e) =>
                        setExpenseFilters({
                          ...expenseFilters,
                          end_date: e.target.value,
                        })
                      }
                      className="flex-1 w-full h-[40px] px-3 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[10px] text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex-1 flex flex-col w-full min-h-0">
            {activeTab === "expenses" && (
              <>
                <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                  <div className="w-[120px]">Date</div>
                  <div className="w-[180px]">Category</div>
                  <div className="flex-1 min-w-[200px]">Reason</div>
                  <div className="w-[120px] text-right">Amount</div>
                  <div className="w-[100px] text-right pr-2">Actions</div>
                </div>

                <div
                  className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${currentItems.length === 0 ? "flex-1" : ""} overflow-y-auto`}
                >
                  {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                      <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                        <Loader2
                          size={24}
                          className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                  ) : currentItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Inbox
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                        />
                      </div>
                      <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                        No expenses found
                      </p>
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 text-center px-4">
                        Try adjusting your filters or log a new expense.
                      </p>
                    </div>
                  ) : (
                    currentItems.map((e) => (
                      <div
                        key={e.id}
                        className="group flex flex-col w-full shrink-0"
                      >
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-4 mx-1">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[9px] sm:text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-600 uppercase tracking-widest shadow-sm truncate max-w-full">
                                {e.category_name}
                              </span>
                              <p className="text-[13px] sm:text-[14px] font-bold text-slate-900 mt-2 leading-snug break-words">
                                {e.reason}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] sm:text-[16px] font-black text-rose-600 tabular-nums">
                                {formatINR(e.amount)}
                              </p>
                              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-1">
                                {new Date(e.expense_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100/80">
                            <button
                              onClick={() => {
                                setEditExpense(e);
                                setExpenseModal(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200/80 hover:border-slate-400 text-slate-500 rounded-[8px] shadow-sm transition-all"
                            >
                              <Edit2 size={14} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 text-slate-500 rounded-[8px] shadow-sm transition-all"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                          <div className="w-[120px]">
                            <span className="text-[12px] font-bold text-slate-700">
                              {new Date(e.expense_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="w-[180px] min-w-0 pr-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-600 uppercase tracking-widest shadow-sm truncate max-w-full">
                              {e.category_name}
                            </span>
                          </div>
                          <div className="flex-1 min-w-[200px] pr-4">
                            <span className="text-[13px] text-slate-700 font-medium truncate block">
                              {e.reason}
                            </span>
                          </div>
                          <div className="w-[120px] text-right">
                            <span className="text-[14px] font-black text-slate-900 tabular-nums">
                              {formatINR(e.amount)}
                            </span>
                          </div>
                          <div className="w-[100px] text-right flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <button
                              onClick={() => {
                                setEditExpense(e);
                                setExpenseModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Edit Expense"
                            >
                              <Edit2 size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => deleteExpense(e.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Delete Expense"
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
            )}
            {activeTab === "categories" && (
              <>
                <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
                  <div className="w-[80px]">ID</div>
                  <div className="flex-1 min-w-[200px]">Category Name</div>
                  <div className="w-[150px]">Status</div>
                  <div className="w-[120px] text-right pr-2">Actions</div>
                </div>

                <div
                  className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${currentItems.length === 0 ? "flex-1" : ""} overflow-y-auto`}
                >
                  {isLoading ? (
                    <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                      <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                        <Loader2
                          size={24}
                          className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>
                  ) : currentItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Tags
                          size={24}
                          strokeWidth={1.5}
                          className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                        />
                      </div>
                      <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                        No categories found
                      </p>
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 text-center px-4">
                        Create a new category to organize expenses.
                      </p>
                    </div>
                  ) : (
                    currentItems.map((c) => (
                      <div
                        key={c.id}
                        className="group flex flex-col w-full shrink-0"
                      >
                        <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md rounded-[16px] sm:rounded-[20px] p-4 mx-1">
                          <div className="flex justify-between items-center mb-3 gap-3">
                            <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-[6px] border border-slate-100 shadow-sm shrink-0">
                              #{c.id}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border shadow-sm shrink-0 ${c.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-slate-50 text-slate-500 border-slate-200/80"}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"}`}
                              />
                              {c.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-tight truncate">
                            {c.category_name}
                          </div>
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100/80">
                            <button
                              onClick={() => setViewCategoryStats(c)}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200/80 hover:border-emerald-300 hover:text-emerald-600 text-slate-500 rounded-[8px] shadow-sm transition-all"
                            >
                              <Activity size={14} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => {
                                setEditCategory(c);
                                setCategoryModal(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200/80 hover:border-slate-400 hover:text-slate-900 text-slate-500 rounded-[8px] shadow-sm transition-all"
                            >
                              <Edit2 size={14} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => deleteCategory(c.id)}
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 text-slate-500 rounded-[8px] shadow-sm transition-all"
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                          <div className="w-[80px]">
                            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2 py-1 rounded-full border border-slate-200/60 tabular-nums">
                              #{c.id}
                            </span>
                          </div>
                          <div className="flex-1 min-w-[200px] text-[14px] font-bold text-slate-900 truncate pr-4 group-hover:text-blue-600 transition-colors">
                            {c.category_name}
                          </div>
                          <div className="w-[150px] pr-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${c.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-200/80" : "bg-slate-50 text-slate-500 border-slate-200/80"}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                              />
                              {c.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="w-[120px] flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                            <button
                              onClick={() => setViewCategoryStats(c)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="View Analytics"
                            >
                              <Activity size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => {
                                setEditCategory(c);
                                setCategoryModal(true);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Edit Category"
                            >
                              <Edit2 size={16} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => deleteCategory(c.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Delete Category"
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
            )}
            {!isLoading && filteredData.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0 border-t border-slate-100 lg:border-none">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {Math.min(indexOfLastItem, filteredData.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {filteredData.length}
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
        <AnimatePresence>
          {expenseModal && (
            <ExpenseForm
              expense={editExpense}
              categories={categories}
              onClose={() => setExpenseModal(false)}
              onSaved={() => {
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          )}

          {categoryModal && (
            <CategoryForm
              category={editCategory}
              onClose={() => setCategoryModal(false)}
              onSaved={loadCategories}
            />
          )}
          {viewCategoryStats && (
            <CategoryDetailsModal
              category={viewCategoryStats}
              onClose={() => setViewCategoryStats(null)}
              onUpdate={() => {
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ExpensePage;
