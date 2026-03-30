import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Boxes,
  Loader2,
  Layers,
  Eye,
  ShieldAlert,
  Cpu,
  UserCog,
  Package,
  Database,
  Trash2,
  Edit,
  Pencil,
  X,
  Factory,
  Box,
  ChevronDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CreateInwardModal from "./CreateInwardModal";
import RawMaterialMasterModal from "./RawMaterialMasterModal";
import InwardDetailModal from "./InwardDetailModal";

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
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount || 0,
  );

const normalizeSearch = (str) =>
  (str || "")
    .toString()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");

const RawMaterialPage = () => {
  const { can } = useAuth();
  const [activeTab, setActiveTab] = useState("LEDGER");
  const [inwards, setInwards] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState("");
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total_pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    business_model: "",
    date_filter: "ALL",
  });
  const [materials, setMaterials] = useState([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterPage, setMasterPage] = useState(1);
  const masterItemsPerPage = 10;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inwardToEdit, setInwardToEdit] = useState(null);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInwardId, setSelectedInwardId] = useState(null);
  const [selectedLines, setSelectedLines] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [tracingId, setTracingId] = useState(null);

  useEffect(() => {
    if (
      selectedLines ||
      traceabilityData ||
      showDetailModal ||
      isCreateModalOpen ||
      isMasterModalOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [
    selectedLines,
    traceabilityData,
    showDetailModal,
    isCreateModalOpen,
    isMasterModalOpen,
  ]);

  const renderMaterialPreview = (lines) => {
    if (!lines || lines.length === 0) return "Unknown Material";
    const names = [
      ...new Set(lines.map((l) => l.material_name || l.item || "Material")),
    ];
    return names.join(", ");
  };
  const fetchInwards = useCallback(
    async (pageToFetch = 1) => {
      setLedgerLoading(true);
      try {
        const query = new URLSearchParams({
          ...filters,
          page: pageToFetch,
          limit: 10,
        }).toString();
        const res = await api.get(`/raw-materials?${query}`);

        let rawData = [];
        let metaData = null;

        if (res.data?.data?.data) {
          rawData = res.data.data.data;
          metaData = res.data.data.meta;
        } else if (Array.isArray(res.data?.data)) {
          rawData = res.data.data;
          metaData = res.data?.meta;
        } else if (Array.isArray(res.data)) {
          rawData = res.data;
        }
        if (filters.search) {
          const q = normalizeSearch(filters.search);
          rawData = rawData.filter(
            (item) =>
              normalizeSearch(item.inward_no).includes(q) ||
              normalizeSearch(item.challan_no).includes(q) ||
              normalizeSearch(item.party_name).includes(q) ||
              normalizeSearch(item.business_model).includes(q) ||
              normalizeSearch(renderMaterialPreview(item.lines)).includes(q) ||
              (item.lines || []).some((line) =>
                normalizeSearch(line.raw_number).includes(q),
              ),
          );
        }

        const normalizedMeta = metaData
          ? {
              page: metaData.current_page || metaData.page || 1,
              limit: metaData.per_page || metaData.limit || 10,
              total_pages: metaData.last_page || metaData.total_pages || 1,
              total: metaData.total || rawData.length,
            }
          : null;

        if (normalizedMeta && !filters.search) {
          setInwards(rawData);
          setMeta(normalizedMeta);
        } else {
          const total = rawData.length;
          const total_pages = Math.ceil(total / 10) || 1;
          const safePage = Math.min(pageToFetch, total_pages) || 1;
          const startIdx = (safePage - 1) * 10;

          setInwards(rawData.slice(startIdx, startIdx + 10));
          setMeta({
            page: safePage,
            limit: 10,
            total_pages: total_pages,
            total: total,
          });
        }
      } catch (error) {
        toast.error("Failed to load ledgers");
      } finally {
        setLedgerLoading(false);
      }
    },
    [filters],
  );

  const fetchMaterials = useCallback(async () => {
    setMasterLoading(true);
    try {
      const res = await api.get("/raw-materials/master");
      setMaterials(res.data.data);
    } catch (error) {
      toast.error("Failed to load master list");
    } finally {
      setMasterLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "LEDGER") fetchInwards(1);
    else fetchMaterials();
  }, [activeTab, filters, fetchInwards, fetchMaterials]);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      if (activeTab === "LEDGER") {
        setFilters((prev) => ({ ...prev, search: localSearch }));
      } else {
        setMasterPage(1);
      }
    }
  };
  const handleCancelInward = async (id) => {
    if (
      !window.confirm(
        "CRITICAL: Cancelling this will reverse the stock ledger. Proceed?",
      )
    )
      return;
    try {
      await api.delete(`/raw-materials/${id}`);
      toast.success("Inward cancelled and stock reverted.");
      fetchInwards(meta.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot cancel inward");
    }
  };

  const handleDeleteMaster = async (id) => {
    if (
      !window.confirm(
        "Soft delete this raw material? It will be hidden from future dropdowns.",
      )
    )
      return;
    try {
      await api.delete(`/raw-materials/master/${id}`);
      toast.success("Material deactivated.");
      fetchMaterials();
    } catch (err) {
      toast.error("Failed to delete.");
    }
  };

  const handleTraceMaterial = async (rawMaterialId, materialName) => {
    setTracingId(rawMaterialId); // Loading only on specific row
    try {
      const res = await api.get(
        `/raw-materials/master/${rawMaterialId}/traceability`,
      );
      setTraceabilityData({ name: materialName, history: res.data.data });
    } catch (err) {
      toast.error("Failed to load traceability data");
    } finally {
      setTracingId(null);
    }
  };
  let filteredMaterials = materials;
  if (activeTab === "MASTER" && localSearch) {
    const q = normalizeSearch(localSearch);
    filteredMaterials = materials.filter(
      (m) =>
        normalizeSearch(m.material_name).includes(q) ||
        normalizeSearch(m.id?.toString()).includes(q) ||
        normalizeSearch(m.default_uom).includes(q),
    );
  }
  const indexOfLastMaster = masterPage * masterItemsPerPage;
  const indexOfFirstMaster = indexOfLastMaster - masterItemsPerPage;
  const currentMasters = filteredMaterials.slice(
    indexOfFirstMaster,
    indexOfLastMaster,
  );
  const totalMasterPages =
    Math.ceil(filteredMaterials.length / masterItemsPerPage) || 1;

  const ledgerStartCount = (meta.page - 1) * meta.limit + 1;
  const ledgerEndCount = ledgerStartCount + inwards.length - 1;

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2 shrink-0 w-full"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5">
              Raw Materials
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
              </span>
              Inventory & Traceability
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative group flex-1 w-full min-w-[200px]"
            >
              <Search
                className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none"
                size={16}
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder={`Search ${activeTab === "LEDGER" ? "Inwards, Challans, Parties..." : "Materials..."}`}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  if (activeTab === "MASTER") setMasterPage(1);
                  if (e.target.value.trim() === "") {
                    if (activeTab === "LEDGER")
                      setFilters((prev) => ({ ...prev, search: "" }));
                  }
                }}
                className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
              <button type="submit" className="hidden" />
            </form>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="w-full sm:w-[240px] shrink-0">
                <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full h-[40px] sm:h-[44px] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("LEDGER");
                      setLocalSearch("");
                      setFilters((prev) => ({ ...prev, search: "" }));
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "LEDGER"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    <Layers
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">Ledger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("MASTER");
                      setLocalSearch("");
                      setFilters((prev) => ({ ...prev, search: "" }));
                      setMasterPage(1);
                    }}
                    className={`flex-1 h-full px-2 sm:px-4 rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium tracking-wide transition-all duration-300 outline-none flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      activeTab === "MASTER"
                        ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                        : "text-slate-500 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    <Database
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 hidden sm:block"
                    />
                    <span className="truncate">Master</span>
                  </button>
                </div>
              </div>

              {activeTab === "LEDGER"
                ? can("RAW_INWARD", "can_add") && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCreateModalOpen(true)}
                      className="w-full sm:w-auto h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 shrink-0 whitespace-nowrap"
                    >
                      <Plus
                        size={16}
                        strokeWidth={2}
                        className="text-white/90"
                      />
                      Receive Stock
                    </motion.button>
                  )
                : can("RAW_INWARD", "can_add") && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedMaster(null);
                        setIsMasterModalOpen(true);
                      }}
                      className="w-full sm:w-auto h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 shrink-0 whitespace-nowrap"
                    >
                      <Plus
                        size={16}
                        strokeWidth={2}
                        className="text-white/90"
                      />
                      New Master
                    </motion.button>
                  )}
            </div>
          </div>
        </motion.div>
        <AnimatePresence>
          {activeTab === "LEDGER" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 px-2 sm:px-0 w-full shrink-0"
            >
              <div className="relative group w-full sm:w-[160px] shrink-0">
                <select
                  value={filters.date_filter}
                  onChange={(e) =>
                    setFilters({ ...filters, date_filter: e.target.value })
                  }
                  className="w-full appearance-none h-[40px] sm:h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="YESTERDAY">Yesterday</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>
              <div className="relative group w-full sm:w-[180px] shrink-0">
                <select
                  value={filters.business_model}
                  onChange={(e) =>
                    setFilters({ ...filters, business_model: e.target.value })
                  }
                  className="w-full appearance-none h-[40px] sm:h-[40px] pl-3 sm:pl-4 pr-8 sm:pr-10 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[12px] sm:text-[13px] font-semibold text-slate-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none cursor-pointer truncate"
                >
                  <option value="">All Models</option>
                  <option value="OWN_MANUFACTURING">Own Mfg</option>
                  <option value="JOB_WORK">Job Work</option>
                </select>
                <ChevronDown
                  className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                  strokeWidth={2}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">
              {activeTab === "LEDGER" ? (
                <>
                  <div className="w-[15%] pr-4">Inward Info</div>
                  <div className="w-[15%] pr-4">Challan No.</div>
                  <div className="w-[20%] pr-4">Party & Model</div>
                  <div className="w-[20%] pr-4">Material Snapshot</div>
                  <div className="w-[10%] pr-4 text-center">Batches</div>
                  <div className="w-[10%] pr-4 text-right">Total Value</div>
                  <div className="w-[10%] text-right pr-2">Action</div>
                </>
              ) : (
                <>
                  <div className="w-[10%] pr-4">Master ID</div>
                  <div className="w-[40%] pr-4">Material Composition</div>
                  <div className="w-[15%] pr-4 text-center">Default Unit</div>
                  <div className="w-[20%] pr-4 text-center">Status</div>
                  <div className="w-[15%] text-right pr-2">Settings</div>
                </>
              )}
            </div>
            <div
              className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-0 pt-2 lg:pt-3 overflow-y-auto ${
                (activeTab === "LEDGER" ? ledgerLoading : masterLoading) ||
                (activeTab === "LEDGER" && inwards.length === 0) ||
                (activeTab === "MASTER" && filteredMaterials.length === 0)
                  ? "flex-1"
                  : ""
              }`}
            >
              {(activeTab === "LEDGER" ? ledgerLoading : masterLoading) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
                  <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                    <Loader2
                      size={24}
                      className="animate-spin text-blue-500 sm:w-7 sm:h-7"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              ) : activeTab === "LEDGER" ? (
                inwards.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Boxes
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <h3 className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      No inbound ledgers found
                    </h3>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm px-4 text-center">
                      Try adjusting your search or filters.
                    </p>
                  </div>
                ) : (
                  inwards.map((inw) => (
                    <div
                      key={inw.id}
                      className="group flex flex-col w-full shrink-0"
                    >
                      <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-5 transition-all duration-300">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] tracking-tight truncate">
                              {inw.inward_no}
                            </div>
                            <div className="text-[11px] sm:text-[12px] font-medium text-slate-500 flex items-center gap-1.5 tabular-nums mt-1">
                              <Calendar
                                size={12}
                                strokeWidth={1.5}
                                className="text-slate-400"
                              />
                              {new Date(inw.inward_date).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end min-w-[80px]">
                            {inw.grand_total ? (
                              <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] tracking-tight">
                                {formatINR(inw.grand_total)}
                              </div>
                            ) : (
                              <div className="flex justify-center w-full">
                                <span className="text-[14px] sm:text-[15px] font-medium text-slate-300 text-center">
                                  —
                                </span>
                              </div>
                            )}
                            <span
                              className={`inline-flex items-center px-2.5 py-1 mt-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${
                                inw.business_model === "OWN_MANUFACTURING"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-indigo-50 text-indigo-600"
                              }`}
                            >
                              {inw.business_model === "OWN_MANUFACTURING"
                                ? "OWN MFG"
                                : "JOB WORK"}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 mt-2">
                          {inw.party_name && (
                            <div className="text-[13px] sm:text-[14px] font-bold text-slate-800 truncate block">
                              {inw.party_name}
                            </div>
                          )}
                          <div className="text-[11px] sm:text-[13px] font-semibold text-slate-600 truncate flex items-center gap-1.5 sm:gap-2 mt-1">
                            <Package
                              size={14}
                              className="text-blue-500 shrink-0 sm:w-[16px] sm:h-[16px]"
                              strokeWidth={2}
                            />
                            <span className="truncate">
                              {renderMaterialPreview(inw.lines)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3 sm:mt-4 pt-3 sm:pt-3.5 border-t border-slate-100/80">
                          <button
                            onClick={() => setSelectedLines(inw.lines)}
                            className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm px-3 sm:px-4 py-1.5 rounded-[8px] sm:rounded-[10px] transition-colors active:scale-95"
                          >
                            <Layers
                              size={12}
                              strokeWidth={2.5}
                              className="text-slate-400 sm:w-[14px] sm:h-[14px]"
                            />
                            {inw.lines?.length || 0} Batches
                          </button>

                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInwardId(inw.id);
                                setShowDetailModal(true);
                              }}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                            >
                              <Eye
                                size={14}
                                className="sm:w-[16px] sm:h-[16px]"
                                strokeWidth={2.5}
                              />
                            </button>
                            {can("RAW_INWARD", "can_edit") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInwardToEdit(inw.id);
                                  setIsCreateModalOpen(true);
                                }}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                              >
                                <Pencil
                                  size={14}
                                  className="sm:w-[16px] sm:h-[16px]"
                                  strokeWidth={2.5}
                                />
                              </button>
                            )}
                            {can("RAW_INWARD", "can_delete") && (
                              <button
                                type="button"
                                onClick={() => handleCancelInward(inw.id)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                              >
                                <Trash2
                                  size={14}
                                  className="sm:w-[16px] sm:h-[16px]"
                                  strokeWidth={2.5}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all">
                        <div className="w-[15%] pr-4 min-w-0">
                          <div className="font-bold text-slate-900 text-[14px] tracking-tight truncate block">
                            {inw.inward_no}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 tabular-nums">
                            <Calendar size={12} strokeWidth={1.5} />{" "}
                            {new Date(inw.inward_date).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="w-[15%] pr-4 text-[13px] font-bold text-slate-500 font-mono truncate">
                          {inw.challan_no ? (
                            inw.challan_no
                          ) : (
                            <span className="text-[14px] font-medium text-slate-300 flex">
                              —
                            </span>
                          )}
                        </div>

                        <div className="w-[20%] pr-4 min-w-0">
                          <span
                            className={`inline-flex mb-1.5 items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-sm ${
                              inw.business_model === "OWN_MANUFACTURING"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-indigo-50 text-indigo-600"
                            }`}
                          >
                            {inw.business_model === "OWN_MANUFACTURING"
                              ? "OWN MFG"
                              : "JOB WORK"}
                          </span>
                          {inw.party_name && (
                            <div className="text-[13px] font-bold text-slate-700 truncate block">
                              {inw.party_name}
                            </div>
                          )}
                        </div>

                        <div className="w-[20%] pr-4 min-w-0">
                          <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2 truncate">
                            <Package
                              size={16}
                              className="text-blue-500 shrink-0"
                              strokeWidth={2}
                            />
                            <span className="truncate">
                              {renderMaterialPreview(inw.lines)}
                            </span>
                          </div>
                        </div>

                        <div className="w-[10%] pr-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLines(inw.lines)}
                            className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm px-3 py-1.5 rounded-[10px] transition-colors w-full max-w-[80px] active:scale-95"
                          >
                            <Layers
                              size={14}
                              strokeWidth={2}
                              className="text-slate-400"
                            />
                            {inw.lines?.length || 0}
                          </button>
                        </div>

                        <div className="w-[10%] pr-4 flex justify-end">
                          {inw.grand_total ? (
                            <p className="text-[14px] font-bold text-slate-900 tracking-tight tabular-nums text-right">
                              {formatINR(inw.grand_total)}
                            </p>
                          ) : (
                            <p className="text-[14px] font-medium text-slate-300 text-right">
                              —
                            </p>
                          )}
                        </div>
                        <div className="w-[10%] text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInwardId(inw.id);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 text-slate-300 group-hover:text-blue-500 hover:bg-blue-50 rounded-[8px] transition-all active:scale-95 border border-transparent hover:border-blue-200"
                              title="View Invoice Details"
                            >
                              <Eye size={18} strokeWidth={2} />
                            </button>
                            {can("RAW_INWARD", "can_edit") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInwardToEdit(inw.id);
                                  setIsCreateModalOpen(true);
                                }}
                                className="p-1.5 text-slate-300 group-hover:text-amber-500 hover:bg-amber-50 rounded-[8px] transition-all active:scale-95 border border-transparent hover:border-amber-200"
                                title="Edit Inward"
                              >
                                <Pencil size={18} strokeWidth={2} />
                              </button>
                            )}
                            {can("RAW_INWARD", "can_delete") && (
                              <button
                                type="button"
                                onClick={() => handleCancelInward(inw.id)}
                                className="p-1.5 text-slate-300 group-hover:text-rose-500 hover:bg-rose-50 rounded-[8px] transition-all active:scale-95 border border-transparent hover:border-rose-200"
                                title="Cancel & Revert Stock"
                              >
                                <Trash2 size={18} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : filteredMaterials.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-slate-200/60 shadow-sm">
                    <Database
                      size={24}
                      strokeWidth={1.5}
                      className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                    />
                  </div>
                  <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-900 tracking-tight">
                    Master catalog is empty
                  </h3>
                  <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm px-4 text-center">
                    Try adjusting your search or add new materials.
                  </p>
                </div>
              ) : (
                currentMasters.map((mat) => (
                  <div
                    key={mat.id}
                    className="group flex flex-col w-full lg:hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-md rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-5 transition-all duration-300">
                      <div className="flex justify-between items-start gap-3">
                        <div className="font-bold text-slate-900 text-[14px] sm:text-[15px] flex items-center gap-2.5 min-w-0">
                          <Database
                            size={16}
                            strokeWidth={1.5}
                            className="text-slate-400 shrink-0"
                          />
                          <span className="truncate">{mat.material_name}</span>
                        </div>
                        <span
                          className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-sm ${
                            mat.is_active
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mat.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {mat.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 sm:mt-4 text-[11px] sm:text-[12px] text-slate-500 font-mono">
                        <span className="font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-[6px] border border-slate-100">
                          #{mat.id}
                        </span>
                        <span className="font-bold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm text-[10px]">
                          {mat.default_uom}
                        </span>
                      </div>
                      <div className="flex justify-end gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100/80">
                        {tracingId === mat.id ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                            <Loader2
                              size={14}
                              className="animate-spin text-slate-400 sm:w-[16px] sm:h-[16px]"
                              strokeWidth={1.5}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleTraceMaterial(mat.id, mat.material_name)
                            }
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                          >
                            <Eye
                              size={14}
                              strokeWidth={2}
                              className="sm:w-[16px] sm:h-[16px]"
                            />
                          </button>
                        )}
                        {can("RAW_INWARD", "can_edit") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMaster(mat);
                              setIsMasterModalOpen(true);
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-slate-400 hover:text-slate-900 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                          >
                            <Edit
                              size={14}
                              strokeWidth={2}
                              className="sm:w-[16px] sm:h-[16px]"
                            />
                          </button>
                        )}
                        {can("RAW_INWARD", "can_delete") && mat.is_active && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaster(mat.id)}
                            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                          >
                            <Trash2
                              size={14}
                              strokeWidth={2}
                              className="sm:w-[16px] sm:h-[16px]"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all">
                      <div className="w-[10%] pr-4">
                        <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2 py-1 rounded-full border border-slate-200/60 tabular-nums">
                          #{mat.id}
                        </span>
                      </div>
                      <div className="w-[40%] pr-4 min-w-0">
                        <div className="font-bold text-slate-900 text-[14px] flex items-center gap-2 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                          <Database
                            size={16}
                            strokeWidth={1.5}
                            className="text-slate-400 shrink-0"
                          />
                          <span className="truncate">{mat.material_name}</span>
                        </div>
                      </div>
                      <div className="w-[15%] pr-4 flex justify-center text-center">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100/80 border border-slate-200/60 px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                          {mat.default_uom}
                        </span>
                      </div>
                      <div className="w-[20%] pr-4 flex justify-center text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none shadow-sm ${
                            mat.is_active
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mat.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {mat.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="w-[15%] text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {tracingId === mat.id ? (
                            <div className="p-1.5">
                              <Loader2
                                size={18}
                                className="animate-spin text-slate-400"
                                strokeWidth={2}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleTraceMaterial(mat.id, mat.material_name)
                              }
                              className="p-1.5 text-slate-300 group-hover:text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-[8px] transition-all active:scale-95"
                              title="Material Traceability"
                            >
                              <Eye size={18} strokeWidth={2} />
                            </button>
                          )}
                          {can("RAW_INWARD", "can_edit") && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMaster(mat);
                                setIsMasterModalOpen(true);
                              }}
                              className="p-1.5 text-slate-300 group-hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-[8px] transition-all active:scale-95"
                              title="Edit Master Details"
                            >
                              <Edit size={18} strokeWidth={2} />
                            </button>
                          )}
                          {can("RAW_INWARD", "can_delete") && mat.is_active && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMaster(mat.id)}
                              className="p-1.5 text-slate-300 group-hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-[8px] transition-all active:scale-95"
                              title="Deactivate Material"
                            >
                              <Trash2 size={18} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {activeTab === "LEDGER" && !ledgerLoading && inwards.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {ledgerStartCount}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {ledgerEndCount}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {meta.total || "many"}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {meta.page} of {meta.total_pages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={meta.page <= 1}
                      onClick={() => fetchInwards(meta.page - 1, filters)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {meta.page} of {meta.total_pages}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={meta.page >= meta.total_pages}
                      onClick={() => fetchInwards(meta.page + 1, filters)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "MASTER" &&
              !masterLoading &&
              filteredMaterials.length > 0 && (
                <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                  <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                    Showing{" "}
                    <span className="font-medium text-slate-900 mx-1">
                      {indexOfFirstMaster + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-slate-900 mx-1">
                      {Math.min(indexOfLastMaster, filteredMaterials.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-slate-900 mx-1">
                      {filteredMaterials.length}
                    </span>{" "}
                    results
                  </div>
                  <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                    <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                      Page {masterPage} of {totalMasterPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={masterPage <= 1}
                        onClick={() => setMasterPage((prev) => prev - 1)}
                        className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                      >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      <div className="hidden sm:flex items-center px-2">
                        <span className="text-[13px] text-slate-600 font-medium">
                          Page {masterPage} of {totalMasterPages}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={masterPage >= totalMasterPages}
                        onClick={() => setMasterPage((prev) => prev + 1)}
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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {selectedLines && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6 antialiased selection:bg-blue-500 selection:text-white">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setSelectedLines(null)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: smoothEase }}
                  className="relative z-10 bg-slate-50 w-full max-w-[700px] flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-2xl max-h-[95dvh] sm:max-h-[90dvh] transform-gpu m-auto"
                >
                  <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-200/80 flex justify-between items-center flex-shrink-0 shadow-sm">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                      <Layers
                        className="text-blue-500 hidden sm:block"
                        size={22}
                        strokeWidth={2.5}
                      />
                      Inward Batch Breakdown
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSelectedLines(null)}
                      className="p-2 rounded-full bg-slate-100/80 border border-transparent text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm active:scale-95"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/50 scrollbar-hide overscroll-contain">
                    {selectedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 sm:p-5 bg-white border border-slate-200/80 rounded-[16px] sm:rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-sm hover:border-slate-300 transition-all gap-2"
                      >
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 text-[14px] sm:text-[15px] tracking-tight flex items-center gap-2 truncate">
                            <Box
                              size={16}
                              strokeWidth={2}
                              className="text-slate-400 shrink-0"
                            />{" "}
                            <span className="truncate">
                              {line.material_name}
                            </span>
                          </h3>
                          <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                            Batch:{" "}
                            <span className="font-mono text-slate-700 font-bold bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-[6px] shadow-sm truncate">
                              {line.raw_number}
                            </span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[16px] sm:text-[18px] text-slate-900 tracking-tight tabular-nums leading-none">
                            {line.quantity}{" "}
                            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-widest font-semibold ml-0.5">
                              {line.uom}
                            </span>
                          </p>
                          <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest bg-slate-50 border border-slate-100 inline-block px-1.5 py-0.5 rounded-md">
                            Thick: {line.thickness_mm}mm
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {traceabilityData && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 md:p-6 antialiased selection:bg-blue-500 selection:text-white">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setTraceabilityData(null)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: smoothEase }}
                  className="relative z-10 bg-slate-50 w-full max-w-[900px] flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-2xl max-h-[95dvh] sm:max-h-[90dvh] transform-gpu m-auto"
                >
                  <div className="px-5 py-5 sm:px-8 sm:py-6 bg-white border-b border-slate-200/80 flex justify-between items-center flex-shrink-0 shadow-sm">
                    <div className="min-w-0 pr-4">
                      <h2 className="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight truncate flex items-center gap-2">
                        <ShieldAlert
                          className="text-blue-500 hidden sm:block"
                          size={22}
                          strokeWidth={2.5}
                        />
                        Material Traceability
                      </h2>
                      <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 tracking-tight mt-1 flex items-center gap-1.5 truncate">
                        <Eye
                          size={14}
                          strokeWidth={2}
                          className="text-slate-400 shrink-0"
                        />{" "}
                        Target:{" "}
                        <span className="font-semibold text-slate-700 truncate">
                          {traceabilityData.name}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTraceabilityData(null)}
                      className="p-2 rounded-full bg-slate-100/80 border border-transparent text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors shadow-sm active:scale-95 shrink-0"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 scrollbar-hide overscroll-contain">
                    {traceabilityData.history.length === 0 ? (
                      <div className="py-16 text-center bg-white rounded-[20px] sm:rounded-[24px] border border-dashed border-slate-200/80 shadow-sm flex flex-col items-center">
                        <ShieldAlert
                          size={40}
                          strokeWidth={1.5}
                          className="text-slate-300 mb-3"
                        />
                        <p className="text-[15px] sm:text-[16px] font-bold text-slate-900 tracking-tight">
                          No History Found
                        </p>
                        <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1">
                          This material has not entered production yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-5 relative before:absolute before:inset-y-0 before:left-[19px] sm:before:left-[23px] before:w-[2px] before:bg-slate-200/80">
                        {traceabilityData.history.map((step, idx) => (
                          <div
                            key={idx}
                            className="relative pl-10 sm:pl-12 pr-1 sm:pr-2 group"
                          >
                            <div className="absolute left-[14px] sm:left-[18px] top-5 sm:top-6 w-3 h-3 rounded-full bg-white border-2 border-slate-300 shadow-[0_0_0_4px_#f8fafc] group-hover:border-blue-500 transition-colors" />

                            <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-[16px] sm:rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 sm:mb-5">
                                <div>
                                  <h3 className="font-bold text-slate-900 text-[14px] sm:text-[15px] flex items-center gap-2 tracking-tight">
                                    <Factory
                                      size={16}
                                      strokeWidth={2}
                                      className="text-slate-400"
                                    />{" "}
                                    Batch:{" "}
                                    <span className="font-mono text-slate-700 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-[6px] shadow-sm">
                                      {step.batch_no}
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-2 mt-2 sm:mt-2.5">
                                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 sm:px-2.5 rounded-[6px] sm:rounded-[8px] flex items-center gap-1.5 tabular-nums border border-slate-200/60 shadow-sm">
                                      <Calendar size={12} strokeWidth={1.5} />{" "}
                                      {new Date(
                                        step.production_date,
                                      ).toLocaleDateString()}
                                    </span>
                                    <span
                                      className={`text-[8.5px] sm:text-[9px] font-bold px-2 py-1 sm:px-2.5 rounded-[6px] uppercase tracking-widest border shadow-sm ${
                                        step.business_model === "JOB_WORK"
                                          ? "bg-slate-50 text-slate-600 border-slate-200/60"
                                          : "bg-slate-100 text-slate-700 border-slate-300/60"
                                      }`}
                                    >
                                      {step.business_model === "JOB_WORK"
                                        ? `Job Work (${step.job_work_party})`
                                        : "Own Mfg"}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-left sm:text-right bg-slate-50 px-4 py-2.5 sm:px-5 sm:py-3 rounded-[12px] sm:rounded-[16px] border border-slate-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] w-full sm:w-auto">
                                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">
                                    Consumed
                                  </p>
                                  <p className="font-bold text-[16px] sm:text-[20px] text-slate-900 tracking-tight leading-none tabular-nums">
                                    {step.input_qty}{" "}
                                    <span className="text-[10px] sm:text-[12px] text-slate-500 font-semibold ml-0.5">
                                      {step.input_uom}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-slate-50/50 rounded-[12px] sm:rounded-[16px] border border-slate-100/80">
                                  <div className="mt-0.5 text-slate-500">
                                    <Cpu
                                      size={14}
                                      strokeWidth={2}
                                      className="sm:w-[16px] sm:h-[16px]"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                      Routing
                                    </p>
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-slate-700 tracking-tight leading-snug truncate">
                                      {step.step_name}{" "}
                                      <span className="text-slate-400 font-medium text-[11px] sm:text-[12px]">
                                        on
                                      </span>{" "}
                                      {step.machine_name}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-slate-50/50 rounded-[12px] sm:rounded-[16px] border border-slate-100/80">
                                  <div className="mt-0.5 text-slate-500">
                                    <UserCog
                                      size={14}
                                      strokeWidth={2}
                                      className="sm:w-[16px] sm:h-[16px]"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                      Operators
                                    </p>
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-slate-700 tracking-tight leading-snug truncate">
                                      {step.workers?.join(", ") || "Unknown"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-slate-50/50 rounded-[12px] sm:rounded-[16px] border border-slate-100/80">
                                  <div className="mt-0.5 text-slate-500">
                                    <Package
                                      size={14}
                                      strokeWidth={2}
                                      className="sm:w-[16px] sm:h-[16px]"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                      Yield Output
                                    </p>
                                    <p className="text-[12px] sm:text-[13px] font-semibold text-slate-700 tracking-tight leading-snug truncate">
                                      {step.products_made
                                        ?.map((p) => `${p.qty} ${p.product}`)
                                        .join(" + ")}
                                      {step.scrap_qty > 0 && (
                                        <span className="text-slate-500 block mt-1 font-medium">
                                          + {step.scrap_qty} Scrap
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {isCreateModalOpen && (
        <CreateInwardModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setInwardToEdit(null);
          }}
          inwardId={inwardToEdit}
          onSuccess={() => fetchInwards(meta.page)}
        />
      )}

      {isMasterModalOpen && (
        <RawMaterialMasterModal
          isOpen={isMasterModalOpen}
          onClose={() => {
            setIsMasterModalOpen(false);
            setSelectedMaster(null);
          }}
          masterData={selectedMaster}
          onSuccess={fetchMaterials}
        />
      )}

      {showDetailModal && (
        <InwardDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInwardId(null);
          }}
          inwardId={selectedInwardId}
        />
      )}
    </div>
  );
};

export default RawMaterialPage;
