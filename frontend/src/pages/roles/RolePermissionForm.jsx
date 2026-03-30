import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import {
  X,
  CheckSquare,
  Square,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const RolePermissionsForm = ({ role, onClose }) => {
  const [permissions, setPermissions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [modRes, permRes] = await Promise.all([
          api.get("/roles/modules"),
          api.get(`/roles/${role.id}/permissions`),
        ]);

        const allModules = modRes.data.data;
        const existingPerms = permRes.data.data;

        const merged = allModules.map((mod) => {
          const found = existingPerms.find(
            (p) => p.module_code === mod.module_code,
          );
          return (
            found || {
              module_code: mod.module_code,
              module_name: mod.module_name,
              can_add: false,
              can_edit: false,
              can_delete: false,
              can_view: false,
            }
          );
        });

        setPermissions(merged);
      } catch (error) {
        toast.error("Failed to load module policies.");
      } finally {
        setIsFetching(false);
      }
    };

    if (role?.id) fetchData();
  }, [role.id]);

  const toggle = (index, field) => {
    setPermissions((prev) => {
      const updated = [...prev];
      const modulePerm = { ...updated[index] };
      const newValue = !modulePerm[field];
      modulePerm[field] = newValue;

      if (newValue && ["can_add", "can_edit", "can_delete"].includes(field)) {
        modulePerm.can_view = true;
      }

      if (!newValue && field === "can_view") {
        modulePerm.can_add = false;
        modulePerm.can_edit = false;
        modulePerm.can_delete = false;
      }

      updated[index] = modulePerm;
      return updated;
    });
  };

  const toggleAllForModule = (index, grantAll) => {
    setPermissions((prev) => {
      const updated = [...prev];
      const modulePerm = { ...updated[index] };
      modulePerm.can_add = grantAll;
      modulePerm.can_edit = grantAll;
      modulePerm.can_delete = grantAll;
      modulePerm.can_view = grantAll;
      updated[index] = modulePerm;
      return updated;
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await api.put(`/roles/${role.id}/permissions`, {
        permissions,
      });
      toast.success("Policies successfully applied.");
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save permissions.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const permissionLabels = {
    can_view: "View",
    can_add: "Add",
    can_edit: "Edit",
    can_delete: "Delete",
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-indigo-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          onClick={!isSaving && !isFetching ? onClose : undefined}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="w-full max-w-[580px] max-h-[90vh] bg-slate-50 rounded-[20px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden relative z-10 flex flex-col transform-gpu"
        >
          <div className="px-5 pt-5 pb-4 flex items-start justify-between bg-white border-b border-slate-200/80 relative shrink-0">
            <div className="flex gap-3.5 items-center pr-8">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shadow-sm border shrink-0 bg-indigo-50 border-indigo-200/60 text-indigo-600">
                <ShieldAlert size={18} strokeWidth={1.5} />
              </div>
              <div className="min-w-0 mt-0.5">
                <h3 className="text-[16px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  Role Permissions
                </h3>
                <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1">
                  Configuring policies for{" "}
                  <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-[4px] border border-slate-200/80">
                    {role.role_name}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="absolute top-5 right-5 p-1.5 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-3.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {isFetching ? (
              <div className="py-16 flex flex-col items-center justify-center bg-white rounded-[16px] border border-slate-200/60">
                <Loader2
                  size={24}
                  strokeWidth={1.5}
                  className="animate-spin text-indigo-500 mb-2.5"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Loading Policies...
                </p>
              </div>
            ) : (
              permissions.map((perm, index) => {
                const allGranted =
                  perm.can_add &&
                  perm.can_edit &&
                  perm.can_delete &&
                  perm.can_view;
                const noneGranted =
                  !perm.can_add &&
                  !perm.can_edit &&
                  !perm.can_delete &&
                  !perm.can_view;

                return (
                  <div
                    key={perm.module_code}
                    className={`p-4 rounded-[16px] border transition-all ${
                      noneGranted
                        ? "border-slate-200/80 bg-white"
                        : "border-indigo-200/60 bg-indigo-50/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3.5 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/60 shrink-0">
                          <Settings2 size={12} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold text-slate-900 tracking-tight block truncate">
                            {perm.module_name}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-[4px] border border-slate-100 mt-0.5 inline-block">
                            {perm.module_code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-1 rounded-lg shrink-0">
                        <button
                          onClick={() => toggleAllForModule(index, true)}
                          disabled={allGranted}
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-[6px] transition-colors flex items-center gap-1 ${
                            allGranted
                              ? "opacity-40 cursor-not-allowed text-slate-400"
                              : "text-indigo-600 hover:bg-indigo-100/50"
                          }`}
                        >
                          <CheckSquare size={10} strokeWidth={2} /> All
                        </button>
                        <div className="w-px h-3 bg-slate-200" />
                        <button
                          onClick={() => toggleAllForModule(index, false)}
                          disabled={noneGranted}
                          className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-[6px] transition-colors flex items-center gap-1 ${
                            noneGranted
                              ? "opacity-40 cursor-not-allowed text-slate-400"
                              : "text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <Square size={10} strokeWidth={2} /> None
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {Object.keys(permissionLabels).map((field) => {
                        const isChecked = perm[field];
                        const isDelete = field === "can_delete";

                        return (
                          <button
                            key={field}
                            onClick={() => toggle(index, field)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-[10px] border transition-all active:scale-[0.98]
                              ${
                                isChecked
                                  ? isDelete
                                    ? "bg-rose-50 text-rose-700 border-rose-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                          >
                            <div
                              className={`w-[14px] h-[14px] rounded-[4px] flex items-center justify-center transition-colors shrink-0 ${
                                isChecked
                                  ? isDelete
                                    ? "bg-rose-600 border-transparent shadow-sm"
                                    : "bg-indigo-600 border-transparent shadow-sm"
                                  : "bg-slate-50 border border-slate-300"
                              }`}
                            >
                              <motion.svg
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{
                                  scale: isChecked ? 1 : 0,
                                  opacity: isChecked ? 1 : 0,
                                }}
                                transition={{ duration: 0.2 }}
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </motion.svg>
                            </div>
                            {permissionLabels[field]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex items-center gap-2.5 relative z-10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 h-[40px] text-[12px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[12px] transition-colors disabled:opacity-50 active:scale-95"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSaving || isFetching}
              className="flex-[2] h-[40px] bg-slate-900 text-white rounded-[12px] text-[12px] font-semibold transition-all hover:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.1)] active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2
                  size={14}
                  strokeWidth={2}
                  className="animate-spin text-slate-400"
                />
              ) : (
                <>
                  <CheckCircle2 size={14} strokeWidth={2} />
                  Save Permissions
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default RolePermissionsForm;
