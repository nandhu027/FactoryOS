import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import RoleForm from "./RoleForm";
import RolePermissionsForm from "./RolePermissionForm";
import {
  ShieldCheck,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Settings2,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedRole, setSelectedRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const fetchRoles = useCallback(
    async (silent = false) => {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await api.get("/roles", {
          params: {
            page: meta.page,
            limit: meta.limit,
            search: searchQuery || undefined,
          },
        });
        setRoles(res.data.data);
        setMeta(res.data.meta);
      } catch (error) {
        toast.error("Failed to fetch roles.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [meta.page, meta.limit, searchQuery],
  );

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to permanently delete this role?")
    )
      return;
    try {
      await api.delete(`/roles/${id}`);
      toast.success("Role deleted successfully.");
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete role.");
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" || e.type === "submit") {
      e.preventDefault();
      setMeta((prev) => ({ ...prev, page: 1 }));
      setSearchQuery(localSearch);
    }
  };

  const indexOfFirstItem = (meta.page - 1) * meta.limit;
  const indexOfLastItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="w-full max-w-[1440px] h-full mx-auto flex flex-col flex-1 font-sans antialiased selection:bg-indigo-500 selection:text-white overflow-hidden pb-0 sm:pb-0.5">
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
            <h1 className="text-[26px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-1 sm:mb-1.5 flex items-center gap-3">
              Role Management
              <button
                onClick={() => fetchRoles(true)}
                className={`p-1.5 sm:p-2 bg-white border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md rounded-full transition-all active:scale-95 ${
                  isRefreshing
                    ? "animate-spin text-indigo-500"
                    : "text-slate-400 hover:text-indigo-600"
                }`}
                title="Refresh Roles"
              >
                <RefreshCw
                  size={14}
                  strokeWidth={2}
                  className="sm:w-4 sm:h-4"
                />
              </button>
            </h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-medium text-slate-500 tracking-tight">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-indigo-500"></span>
              </span>
              System Security &bull; Access Control
            </div>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-2 sm:gap-4 w-full xl:flex-1 xl:ml-8 min-w-0 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full xl:flex-1 shrink-0">
              <form
                onSubmit={handleSearchSubmit}
                className="relative group w-full sm:flex-1 min-w-[200px]"
              >
                <Search
                  className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                  size={16}
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder="Search security roles..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    if (e.target.value.trim() === "") {
                      setSearchQuery("");
                      setMeta((prev) => ({ ...prev, page: 1 }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearchSubmit(e);
                  }}
                  className="w-full h-[40px] sm:h-[44px] pl-9 sm:pl-10 pr-4 bg-white border border-slate-200/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] rounded-[12px] sm:rounded-full text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                />
                <button type="submit" className="hidden" />
              </form>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto shrink-0"
            >
              <button
                onClick={() => {
                  setSelectedRole(null);
                  setShowForm(true);
                }}
                className="h-[40px] sm:h-[44px] px-5 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[12px] sm:rounded-full font-semibold text-[13px] sm:text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 sm:gap-2.5 w-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-slate-700/50 whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2} className="text-white/90" /> New
                Role
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
              <div className="flex-1 min-w-[200px]">Security Profile</div>
              <div className="w-[200px] text-right pr-2">Actions</div>
            </div>

            {isLoading && roles.length === 0 ? (
              <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-3xl rounded-[20px] sm:rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50">
                  <Loader2
                    size={24}
                    className="animate-spin text-indigo-500 sm:w-7 sm:h-7"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            ) : (
              <div
                className={`flex flex-col relative gap-3 sm:gap-4 lg:gap-1 pt-2 lg:pt-3 ${roles.length === 0 ? "flex-1" : ""} overflow-y-auto`}
              >
                {roles.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200/80 rounded-[20px] bg-slate-50/50 min-h-[300px] m-1 sm:m-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-slate-200/60 shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <ShieldAlert
                        size={24}
                        strokeWidth={1.5}
                        className="text-slate-400 sm:w-[28px] sm:h-[28px]"
                      />
                    </div>
                    <p className="text-[15px] sm:text-[16px] font-bold tracking-tight text-slate-900">
                      No roles found
                    </p>
                    <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 mt-1 max-w-xs sm:max-w-sm text-center px-4">
                      Try adjusting your search or create a new security
                      profile.
                    </p>
                  </div>
                ) : (
                  roles.map((role) => (
                    <div
                      key={role.id}
                      className="group flex flex-col w-full shrink-0"
                    >
                      <div className="flex flex-col lg:hidden bg-white border border-slate-200/80 shadow-sm rounded-[16px] sm:rounded-[20px] p-3 sm:p-5">
                        <div className="flex justify-between items-start gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] sm:rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0 border border-indigo-200/60">
                              <ShieldCheck
                                size={18}
                                strokeWidth={1.5}
                                className="sm:w-[20px] sm:h-[20px]"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[14px] sm:text-[16px] text-slate-900 truncate leading-tight">
                                {role.role_name}
                              </h4>
                              <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 truncate mt-0.5">
                                Security Group
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-[4px] sm:rounded-[6px] border border-slate-100 tabular-nums shrink-0 mt-0.5 shadow-sm">
                            #{role.id}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100/80">
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowPermissions(true);
                            }}
                            className="text-[11px] sm:text-[12px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[8px] sm:rounded-[10px] transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 border border-indigo-100/50 tracking-wide"
                          >
                            <Settings2
                              size={12}
                              strokeWidth={2.5}
                              className="sm:w-[14px] sm:h-[14px]"
                            />{" "}
                            Config Access
                          </button>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setSelectedRole(role);
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
                            <button
                              onClick={() => handleDelete(role.id)}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-slate-200/80 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 text-slate-500 rounded-[8px] sm:rounded-[12px] shadow-sm transition-all active:scale-95"
                            >
                              <Trash2
                                size={14}
                                className="sm:w-[16px] sm:h-[16px]"
                                strokeWidth={2}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center w-full px-4 py-3.5 hover:bg-white border-b border-slate-200/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-transparent rounded-[14px] transition-all gap-4">
                        <div className="w-[80px]">
                          <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100/60 px-2 py-1 rounded-full border border-slate-200/60 tabular-nums">
                            #{role.id}
                          </span>
                        </div>

                        <div className="flex-1 min-w-[200px] flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-[10px] bg-indigo-50 border border-indigo-200/80 shadow-sm text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-[14px] text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                              {role.role_name}
                            </h4>
                          </div>
                        </div>

                        <div className="w-[200px] text-right flex items-center justify-end gap-1.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowPermissions(true);
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 border border-indigo-100/50 active:scale-95 shadow-sm mr-2"
                            title="Manage Clearances"
                          >
                            <Settings2 size={14} strokeWidth={2.5} /> Config
                            Access
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowForm(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="Edit Role Name"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleDelete(role.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 hover:shadow-sm rounded-[10px] transition-all active:scale-95"
                            title="Delete Role"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {!isLoading && roles.length > 0 && (
              <div className="flex items-center justify-between px-2 sm:px-4 pt-2 pb-0 sm:pb-0.5 mt-auto shrink-0">
                <div className="hidden sm:flex flex-1 text-[13px] text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfFirstItem + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {indexOfLastItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 mx-1">
                    {meta.total}
                  </span>{" "}
                  results
                </div>
                <div className="flex items-center justify-between sm:justify-end flex-1 gap-2 sm:gap-4">
                  <span className="sm:hidden text-[13px] text-slate-500 font-medium">
                    Page {meta.page} of {meta.totalPages || 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setMeta((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={meta.page <= 1}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-[8px] border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1 transition-all text-[13px] font-medium"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                    <div className="hidden sm:flex items-center px-2">
                      <span className="text-[13px] text-slate-600 font-medium">
                        Page {meta.page} of {meta.totalPages || 1}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setMeta((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={meta.page >= (meta.totalPages || 1)}
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
          <RoleForm
            initialData={selectedRole}
            onClose={() => {
              setShowForm(false);
              fetchRoles();
            }}
          />
        )}

        {showPermissions && (
          <RolePermissionsForm
            role={selectedRole}
            onClose={() => setShowPermissions(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RolesPage;
