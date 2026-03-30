import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
import { API_ENDPOINTS } from "../../api/endpoints";
import {
  X,
  User,
  Lock,
  IdCard,
  Loader2,
  ShieldAlert,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const smoothEase = [0.22, 1, 0.36, 1];

const UserForm = ({ user, onClose }) => {
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(
    user?.is_super_admin ?? false,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!user) {
      if (!username.trim()) return setError("Username is required.");
      if (!fullName.trim()) return setError("Full name is required.");
      if (!password) return setError("Password is required.");
      if (password.length < 6)
        return setError("Password must be at least 6 characters.");
      if (password !== confirmPassword)
        return setError("Passwords do not match.");
    } else {
      if (password || confirmPassword) {
        if (password.length < 6)
          return setError("New password must be at least 6 characters.");
        if (password !== confirmPassword)
          return setError("Passwords do not match.");
      }
    }

    setLoading(true);
    try {
      if (user) {
        const payload = {
          is_active: isActive,
          is_super_admin: isSuperAdmin,
          full_name: fullName,
        };
        if (password) payload.password = password;

        await api.patch(`${API_ENDPOINTS.USERS}/${user.id}`, payload);
        toast.success("User updated successfully.");
      } else {
        await api.post(API_ENDPOINTS.USERS, {
          username,
          full_name: fullName,
          password,
        });
        toast.success("User created successfully.");
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save user. Please check your inputs.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="w-full max-w-[440px] bg-white rounded-[24px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/60 overflow-hidden relative z-10 flex flex-col transform-gpu"
        >
          <div className="px-6 pt-6 pb-5 flex items-start justify-between gap-4 bg-white border-b border-slate-100/80">
            <div className="flex gap-4 items-center min-w-0">
              <div
                className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm border shrink-0 ${
                  user
                    ? "bg-blue-50 border-blue-200/60 text-blue-600"
                    : "bg-emerald-50 border-emerald-200/60 text-emerald-600"
                }`}
              >
                {user ? (
                  <ShieldCheck size={22} strokeWidth={1.5} />
                ) : (
                  <UserPlus size={22} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
                  {user ? "Edit User" : "Add User"}
                </h3>
                <p className="text-[12px] font-medium text-slate-500 truncate">
                  {user
                    ? `Editing @${user.username}`
                    : "Create a new user account"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-slate-400 bg-slate-50 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="space-y-4">
              {!user && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <User size={16} strokeWidth={1.5} />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      disabled={loading}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <IdCard size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    disabled={loading}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full h-[42px] pl-10 pr-4 bg-slate-50/60 border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-[20px] space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  {user ? "New Password (Optional)" : "Password"}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      user
                        ? "Leave blank to keep current"
                        : "Minimum 6 characters"
                    }
                    className="w-full h-[42px] pl-10 pr-10 bg-white border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-sm disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors outline-none"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                  {user ? "Confirm New Password" : "Confirm Password"}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <CheckCircle2 size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={
                      user ? "Retype new password" : "Retype password"
                    }
                    className="w-full h-[42px] pl-10 pr-4 bg-white border border-slate-200/80 rounded-[14px] text-[14px] font-medium focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400 shadow-sm disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
            {user && (
              <div className="flex flex-col gap-1 p-3 bg-slate-50/50 border border-slate-200/80 rounded-[20px]">
                <label className="flex items-center justify-between cursor-pointer group p-2 rounded-[14px] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/60">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[13px] font-semibold text-slate-900 tracking-tight">
                      Active Account
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                      Allow user to log in to the system
                    </span>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isActive}
                      onChange={() => setIsActive(!isActive)}
                    />
                    <div className="w-[36px] h-[20px] bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                  </div>
                </label>

                <div className="h-px w-[calc(100%-16px)] mx-auto bg-slate-200/60 my-0.5" />

                <label className="flex items-center justify-between cursor-pointer group p-2 rounded-[14px] hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/60">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[13px] font-semibold text-slate-900 tracking-tight">
                      Super Admin Access
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                      Give full access to all features
                    </span>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isSuperAdmin}
                      onChange={() => setIsSuperAdmin(!isSuperAdmin)}
                    />
                    <div className="w-[36px] h-[20px] bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-blue-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"></div>
                  </div>
                </label>
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 text-rose-600 text-[13px] font-medium bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-[16px]">
                    <ShieldAlert
                      size={16}
                      strokeWidth={1.5}
                      className="shrink-0 mt-0.5 text-rose-500"
                    />
                    <span className="leading-tight">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100/80 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-[44px] text-[13px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-[14px] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-[2] h-[44px] bg-slate-900 text-white rounded-[14px] text-[13px] font-semibold transition-all hover:bg-slate-800 shadow-sm active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2
                    size={16}
                    strokeWidth={2}
                    className="animate-spin text-slate-400"
                  />
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2} />
                    {user ? "Save Changes" : "Create User"}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default UserForm;
