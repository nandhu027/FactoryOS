import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const Button = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  icon: Icon,
  ...props
}) => {
  const sizes = {
    sm: "h-[36px] px-3 text-[13px] rounded-[10px]",
    md: "h-[42px] px-5 text-[14px] rounded-[12px]",
    lg: "h-[48px] px-6 text-[15px] rounded-[14px]",
  };
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-0 overflow-hidden select-none";

  const variants = {
    primary:
      "bg-slate-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1.5px_1.5px_rgba(255,255,255,0.15)] hover:bg-slate-800 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1.5px_1.5px_rgba(255,255,255,0.15)] focus:ring-slate-900/20",

    secondary:
      "bg-white text-slate-700 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 focus:ring-slate-200/50",

    danger:
      "bg-rose-500 text-white shadow-[0_2px_8px_rgba(225,29,72,0.15),inset_0_1.5px_1.5px_rgba(255,255,255,0.2)] hover:bg-rose-600 focus:ring-rose-500/20",

    ghost:
      "bg-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus:ring-slate-200/50",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      disabled={isDisabled}
      className={`
        ${base} 
        ${sizes[size]}
        ${variants[variant]} 
        ${isDisabled ? "opacity-50 cursor-not-allowed saturate-[0.8]" : ""} 
        ${className}
      `}
      {...props}
    >
      <span
        className={`flex items-center gap-2 transition-opacity duration-200 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} />}
        {children}
      </span>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Loader2
              size={size === "sm" ? 16 : 18}
              strokeWidth={2.5}
              className="animate-spin text-current"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default Button;
