import { useEffect, useState, useMemo, memo, useCallback } from "react";
import api from "../../api/axios";
import StockLedgerModal from "./StockLedgerModal";
import StockConversionForm from "./StockConversionForm";
import StockConversionHistory from "./StockConversionHistory";
import {
  Package,
  Truck,
  Search,
  Loader2,
  Building2,
  Inbox,
  PackageOpen,
  ChevronDown,
  Repeat,
  History,
  LayoutGrid,
  Box,
  Layers,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];
const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const BaseCard = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-slate-200/80 shadow-sm transition-all duration-500 rounded-[24px] sm:rounded-[28px] relative flex flex-col w-full min-h-0 overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] ${className}`}
  >
    {children}
  </div>
);

const CATEGORY_CONFIG = [
  { key: "RAW", label: "Raw Materials", icon: Box },
  { key: "SEMI_FINISHED", label: "Semi-Finished Goods", icon: Layers },
  { key: "FINISHED", label: "Finished Products", icon: Package },
  { key: "SCRAP", label: "Factory Scrap", icon: AlertCircle },
];

const kindOptions = [
  { label: "All Categories", value: "ALL" },
  { label: "Finished Goods", value: "FINISHED" },
  { label: "Raw Materials", value: "RAW" },
  { label: "Semi-Finished", value: "SEMI_FINISHED" },
  { label: "Factory Scrap", value: "SCRAP" },
];

const formatNum = (num) => Number(num || 0).toLocaleString();

const normalizeText = (text) => {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
};

const UnifiedStockCard = memo(({ row, onClick, isJobWork }) => {
  const isOutOfStock = Number(row.balance) <= 0;
  const categoryConfig =
    CATEGORY_CONFIG.find((c) => c.key === row.item_kind) || CATEGORY_CONFIG[0];
  const Icon = categoryConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={themeSpring}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex flex-col p-3.5 sm:p-5 bg-white rounded-[16px] sm:rounded-[24px] border border-slate-200/60 hover:border-slate-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer min-h-[130px] sm:min-h-[150px]"
    >
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[12px] bg-slate-50/80 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
          <Icon
            size={16}
            strokeWidth={1.5}
            className="sm:w-[18px] sm:h-[18px] w-3.5 h-3.5"
          />
        </div>
        <div className="text-right min-w-0 pl-2">
          {isJobWork ? (
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                At Party
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold text-slate-700 truncate max-w-[120px] sm:max-w-[140px] mt-0.5">
                {row.party_name}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] sm:rounded-full bg-slate-50 border border-slate-100 shrink-0 shadow-sm">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? "bg-slate-300" : "bg-emerald-400"}`}
              />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {isOutOfStock ? "Empty" : "In Stock"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 mb-2 pr-2">
        <h3 className="text-[13px] sm:text-[15px] font-bold text-slate-900 leading-snug tracking-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
          {row.display_name}
        </h3>
        {row.item_code && (
          <p className="text-[10px] sm:text-[11px] font-bold font-mono text-slate-400 mt-1 truncate">
            {row.item_code}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between mt-auto pt-3 sm:pt-4 border-t border-slate-50/80">
        <span className="text-[10px] sm:text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
          {isJobWork ? "Holding" : "Balance"}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className={`text-[18px] sm:text-[24px] font-black tabular-nums tracking-tight leading-none ${isOutOfStock ? "text-slate-300" : "text-slate-900"}`}
          >
            {formatNum(row.balance)}
          </span>
          <span className="text-[10px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">
            {row.uom}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

const StockPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKind, setActiveKind] = useState("ALL");
  const [activeTab, setActiveTab] = useState("OWN");

  const [selectedItem, setSelectedItem] = useState(null);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [showConversionHistory, setShowConversionHistory] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchQuery || undefined,
        item_kind: activeKind === "ALL" ? undefined : activeKind,
      };
      const res = await api.get("/stock/snapshot", { params });
      setData(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load live stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [searchQuery, activeKind]);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setSearchQuery(localSearch);
    }
  };

  const currentTabStock = useMemo(() => {
    const normalizedQuery = normalizeText(localSearch);

    return data.filter((row) => {
      if (row.ownership_type !== activeTab) return false;

      if (normalizedQuery) {
        const nameMatch = normalizeText(row.display_name).includes(
          normalizedQuery,
        );
        const codeMatch = normalizeText(row.item_code).includes(
          normalizedQuery,
        );
        const partyMatch = normalizeText(row.party_name).includes(
          normalizedQuery,
        );

        if (!nameMatch && !codeMatch && !partyMatch) return false;
      }

      return true;
    });
  }, [data, activeTab, localSearch]);

  const groupedStock = useMemo(() => {
    const grouped = {};
    currentTabStock.forEach((row) => {
      if (!grouped[row.item_kind]) grouped[row.item_kind] = [];
      grouped[row.item_kind].push(row);
    });
    return grouped;
  }, [currentTabStock]);

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-4 sm:pb-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-3 sm:px-1 mb-0 sm:mb-2 shrink-0 w-full"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 flex items-center gap-2.5 sm:gap-3">
              Live Stock
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight mt-1">
              <LayoutGrid size={14} className="text-blue-500 shrink-0" />
              Inventory Ledger System
            </div>
          </div>

          <div className="flex flex-col xl:flex-row items-center gap-2 sm:gap-4 w-full xl:w-auto xl:flex-1 min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative group w-full xl:flex-1 min-w-[200px] shrink-0"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search items or parties..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit(e);
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" />
            </form>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0">
              <div className="relative group w-full sm:w-[160px] shrink-0">
                <select
                  value={activeKind}
                  onChange={(e) => setActiveKind(e.target.value)}
                  className="w-full appearance-none h-[40px] sm:h-[44px] pl-3 sm:pl-4 pr-8 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[11px] sm:text-[13px] font-bold text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all outline-none cursor-pointer tracking-wide truncate"
                >
                  {kindOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                  strokeWidth={2}
                />
              </div>

              <div className="grid grid-cols-2 p-1 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full sm:w-[220px] h-[40px] sm:h-[44px] gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab("OWN")}
                  className={`w-full h-full flex items-center justify-center gap-1.5 px-2 rounded-[8px] sm:rounded-full text-[11px] sm:text-[12px] font-bold tracking-wide transition-all duration-300 outline-none whitespace-nowrap ${
                    activeTab === "OWN"
                      ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                      : "text-slate-500 hover:text-slate-900 border-transparent"
                  }`}
                >
                  <Building2
                    size={14}
                    strokeWidth={2.5}
                    className="shrink-0 hidden sm:block"
                  />{" "}
                  Internal
                </button>
                <button
                  onClick={() => setActiveTab("JOB_WORK")}
                  className={`w-full h-full flex items-center justify-center gap-1.5 px-2 rounded-[8px] sm:rounded-full text-[11px] sm:text-[12px] font-bold tracking-wide transition-all duration-300 outline-none whitespace-nowrap ${
                    activeTab === "JOB_WORK"
                      ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900"
                      : "text-slate-500 hover:text-slate-900 border-transparent"
                  }`}
                >
                  <Truck
                    size={14}
                    strokeWidth={2.5}
                    className="shrink-0 hidden sm:block"
                  />{" "}
                  Job Work
                </button>
              </div>

              <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConversionHistory(true)}
                  className="col-span-1 h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-[12px] sm:rounded-full font-bold text-[11px] sm:text-[12px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <History size={14} strokeWidth={2.5} className="shrink-0" />
                  <span className="hidden sm:inline">History</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowConversionForm(true)}
                  className="col-span-2 h-[40px] sm:h-[44px] px-4 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[12px] sm:text-[13px] tracking-wide transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] whitespace-nowrap"
                >
                  <Repeat
                    size={14}
                    strokeWidth={2.5}
                    className="text-white/90 shrink-0"
                  />
                  Quick Convert
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-2 sm:px-0"
        >
          <BaseCard className="flex flex-col flex-1 min-h-0 overflow-hidden w-full bg-slate-50/50 mb-0">
            <div className="flex-1 overflow-y-auto p-2 sm:p-5 lg:p-6 scrollbar-hide">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                  <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                    <Loader2
                      size={28}
                      className="animate-spin text-blue-500"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : currentTabStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-[20px] flex items-center justify-center mb-4 sm:mb-5 border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                    {activeTab === "OWN" ? (
                      <Inbox
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    ) : (
                      <PackageOpen
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    )}
                  </div>
                  <h3 className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight">
                    No {activeTab === "OWN" ? "Internal" : "External"} Stock
                    Found
                  </h3>
                  <p className="text-[13px] sm:text-[14px] font-medium text-slate-500 mt-1 px-4 text-center">
                    Try adjusting your category filter or search term.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  {CATEGORY_CONFIG.map((category) => {
                    const rows = groupedStock[category.key];
                    if (!rows || rows.length === 0) return null;

                    const CategoryIcon = category.icon;

                    return (
                      <div key={category.key}>
                        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 px-1 sm:px-2">
                          <span className="text-[9.5px] sm:text-[11px] font-bold text-slate-600 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[8px] sm:rounded-full border border-slate-200/80 uppercase tracking-widest shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <CategoryIcon
                              size={12}
                              strokeWidth={2.5}
                              className="text-slate-400 shrink-0"
                            />
                            {category.label}
                          </span>
                          <div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4">
                          {rows.map((row, i) => (
                            <UnifiedStockCard
                              key={row.id || i}
                              row={row}
                              isJobWork={activeTab === "JOB_WORK"}
                              onClick={() => setSelectedItem(row)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </BaseCard>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {selectedItem && (
          <StockLedgerModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {showConversionForm && (
          <StockConversionForm
            onClose={() => setShowConversionForm(false)}
            onSuccess={() => {
              setShowConversionForm(false);
              fetchStock();
            }}
          />
        )}
        {showConversionHistory && (
          <StockConversionHistory
            onClose={() => setShowConversionHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StockPage;
