import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

const smoothEase = [0.22, 1, 0.36, 1];

const Input = ({
  label,
  error,
  icon: Icon,
  className = "",
  wrapperClassName = "",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[13px] font-semibold text-slate-700 tracking-tight ml-0.5"
        >
          {label}
        </label>
      )}

      <div className="relative group">
        {Icon && (
          <div
            className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${
              error
                ? "text-rose-400"
                : "text-slate-400 group-focus-within:text-blue-500"
            }`}
          >
            <Icon size={18} strokeWidth={1.5} />
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full h-11 sm:h-12 rounded-[12px] outline-none transition-all duration-300 
            text-[14px] sm:text-[15px] font-medium tracking-tight shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] 
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? "pl-10 pr-4" : "px-4 py-3"}
            ${
              error
                ? "bg-rose-50/50 border border-rose-200 text-rose-900 placeholder:text-rose-300 focus:bg-white focus:border-rose-400/50 focus:ring-4 focus:ring-rose-500/10 focus:shadow-[0_2px_8px_rgba(225,29,72,0.08)]"
                : "bg-slate-100/60 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 hover:bg-slate-100 hover:border-slate-300/80 focus:bg-white focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 focus:shadow-[0_2px_12px_rgba(59,130,246,0.08)]"
            }
            ${className}
          `}
          {...props}
        />
      </div>
      <AnimatePresence>
        {error && typeof error === "string" && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 6 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 text-[12px] font-medium tracking-tight text-rose-500 ml-0.5">
              <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Input;
