import { useEffect, useState } from "react";
import api from "../../api/axios";
import PartyForm from "./PartyForm";
import PartyDetailModal from "./PartyDetailModal";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Building2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";

const typeOptions = [
  { label: "All", value: "" },
  { label: "Purchase", value: "PURCHASE" },
  { label: "Sale", value: "SALE" },
  { label: "Job Work", value: "JOB_WORK" },
];

const themeSpring = { type: "spring", stiffness: 300, damping: 30, mass: 0.8 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeScale = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: themeSpring },
};

const PartiesPage = () => {
  const [parties, setParties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchParties = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get("/parties", { params });
      const normalized = res.data.data.map((p) => ({
        ...p,
        types: Array.isArray(p.types) ? p.types : [],
      }));
      setParties(normalized);
    } catch (error) {
      toast.error("Failed to fetch parties");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchParties();
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchParties();
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to deactivate/delete this party?")
    ) {
      try {
        const res = await api.delete(`/parties/${id}`);
        toast.success(res.data.message || "Party successfully removed.");
        fetchParties();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete party.");
      }
    }
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case "PURCHASE":
        return {
          label: "Purchase",
          style: "bg-sky-50 text-sky-600",
        };
      case "SALE":
        return {
          label: "Sale",
          style: "bg-indigo-50 text-indigo-600",
        };
      case "JOB_WORK":
        return {
          label: "Job Work",
          style: "bg-amber-50 text-amber-600",
        };
      default:
        return {
          label: type,
          style: "bg-slate-50 text-slate-600",
        };
    }
  };
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentParties = parties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(parties.length / itemsPerPage);

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
        className="flex flex-col flex-1 w-full min-h-0 gap-3 sm:gap-8 pt-1 sm:pt-0"
      >
        <motion.div
          variants={fadeScale}
          className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-5 px-2 sm:px-0 mb-0 sm:mb-2"
        >
          <div className="flex-shrink-0 mt-1">
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5">
              Party Directory
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
              </span>
              Manage customers, suppliers & job workers
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full xl:flex-1 shrink-0">
              <form
                onSubmit={handleSearchSubmit}
                className="relative group w-full sm:flex-1 min-w-[200px]"
              >
                <Search
                  className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  size={16}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search by name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                <button type="submit" className="hidden" />
              </form>
              <div className="flex items-center p-1 sm:p-1.5 bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full w-full sm:w-auto overflow-x-auto scrollbar-hide shrink-0 h-[40px] sm:h-[44px]">
                {typeOptions.map((opt) => {
                  const isActive = typeFilter === opt.value;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setTypeFilter(opt.value)}
                      className={`flex-1 shrink-0 min-w-[70px] sm:min-w-0 sm:flex-none px-2 sm:px-5 h-full rounded-[8px] sm:rounded-full text-[11px] sm:text-[13px] font-medium capitalize transition-all duration-300 outline-none flex items-center justify-center whitespace-nowrap ${
                        isActive
                          ? "bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-slate-900 font-semibold"
                          : "text-slate-500 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto shrink-0"
            >
              <button
                onClick={() => {
                  setSelectedParty(null);
                  setShowForm(true);
                }}
                className="h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2} className="text-white/90" /> Add
                Party
              </button>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          variants={fadeScale}
          className="flex-1 min-h-0 flex flex-col w-full px-1 sm:px-0"
        >
          <div className="flex-1 flex flex-col w-full min-h-0">
            <div className="hidden lg:flex items-center px-4 py-3 border-b border-slate-200/80 w-full text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0 gap-4">
              <div className="w-[80px]">Record ID</div>
              <div className="flex-1 min-w-[200px]">Party Profile</div>
              <div className="w-[150px]">Contact</div>
              <div className="w-[180px]">Designations</div>
              <div className="w-[100px]">Status</div>
              <div className="w-[120px] text-right pr-2">Actions</div>
            </div>

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
            ) : (
              <div
                className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${currentParties.length === 0 ? "flex-1" : ""} overflow-y-auto`}
              >
                {currentParties.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Users
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      No parties found
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm text-center px-4">
                      Try adjusting your search or filter settings to find what
                      you're looking for.
                    </p>
                  </div>
                ) : (
                  currentParties.map((party) => (
                    <div
                      key={party.id}
                      className="group flex flex-col w-full shrink-0"
                    >
                      <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-3 sm:p-5">
                        <div className="flex justify-between items-start gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0 border border-slate-700/50">
                              <Building2
                                size={18}
                                strokeWidth={1.5}
                                className="sm:w-[20px] sm:h-[20px]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                {party.party_name}
                              </h4>
                              <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                                {party.phone || "No contact info"}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-[4px] sm:rounded-[6px] border border-slate-100 tabular-nums shrink-0 mt-0.5 shadow-sm">
                            #{party.id}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2.5 sm:mt-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                              party.is_active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-50 text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${party.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                            {party.is_active ? "Active" : "Inactive"}
                          </span>

                          {party.types.length > 0 ? (
                            party.types.map((type) => {
                              const config = getTypeConfig(type);
                              return (
                                <span
                                  key={type}
                                  className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${config.style}`}
                                >
                                  {config.label}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 italic ml-1">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100/80">
                          <button
                            onClick={() => {
                              setSelectedParty(party);
                              setShowDetails(true);
                            }}
                            className="text-[11px] sm:text-[12px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[8px] sm:rounded-[10px] transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 border border-blue-100/50 tracking-wide"
                          >
                            <Eye
                              size={12}
                              strokeWidth={2.5}
                              className="sm:w-[14px] sm:h-[14px]"
                            />{" "}
                            View Profile
                          </button>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedParty(party);
                                setShowForm(true);
                              }}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-slate-400 hover:text-slate-900 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                            >
                              <Pencil
                                size={14}
                                className="sm:w-[16px] sm:h-[16px]"
                                strokeWidth={2}
                              />
                            </button>
                            {party.is_active && (
                              <button
                                onClick={() => handleDelete(party.id)}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                              >
                                <Trash2
                                  size={14}
                                  className="sm:w-[16px] sm:h-[16px]"
                                  strokeWidth={2}
                                />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                        <div className="w-[80px]">
                          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2 py-1 rounded-full border border-slate-200/60 tabular-nums">
                            #{party.id}
                          </span>
                        </div>

                        <div className="flex-1 min-w-[200px] flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-[10px] bg-white border border-slate-200 shadow-sm text-slate-700 flex items-center justify-center shrink-0">
                            <Building2 size={16} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                              {party.party_name}
                            </h4>
                          </div>
                        </div>

                        <div className="w-[150px] min-w-0">
                          <span className="text-[13px] font-medium text-slate-600 truncate block">
                            {party.phone || "—"}
                          </span>
                        </div>
                        <div className="w-[180px] flex items-center">
                          <div className="flex flex-wrap gap-2">
                            {party.types.length > 0 ? (
                              party.types.map((type) => {
                                const config = getTypeConfig(type);
                                return (
                                  <span
                                    key={type}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.style}`}
                                  >
                                    {config.label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400 italic">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-[100px] flex items-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              party.is_active
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-50 text-slate-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${party.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                            />
                            {party.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="w-[120px] text-right flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedParty(party);
                              setShowDetails(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="View Full Profile"
                          >
                            <Eye size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParty(party);
                              setShowForm(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="Edit Party Details"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                          {party.is_active && (
                            <button
                              onClick={() => handleDelete(party.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                              title="Delete Party"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {!isLoading && parties.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {Math.min(indexOfLastItem, parties.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {parties.length}
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
        {showForm && (
          <PartyForm
            party={selectedParty}
            onClose={() => {
              setShowForm(false);
              fetchParties();
            }}
          />
        )}
        {showDetails && (
          <PartyDetailModal
            partyId={selectedParty.id}
            onClose={() => setShowDetails(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartiesPage;
