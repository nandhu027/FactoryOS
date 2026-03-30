import { motion } from "framer-motion";
import { Loader2, Factory } from "lucide-react";

const smoothEase = [0.22, 1, 0.36, 1];

const Loader = ({ fullScreen = false, text = "Syncing Data..." }) => {
  if (!fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: smoothEase }}
        className="flex flex-col items-center justify-center p-8 gap-4 w-full h-full min-h-[200px]"
      >
        <div className="relative flex items-center justify-center">
          <Loader2
            size={28}
            strokeWidth={1.5}
            className="animate-spin text-blue-600 relative z-10"
          />
          <div className="absolute inset-0 bg-blue-500 blur-[20px] opacity-20 rounded-full animate-pulse" />
        </div>
        {text && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {text}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 selection:bg-blue-500 selection:text-white antialiased"
    >
      <div className="flex flex-col items-center justify-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: smoothEase }}
          className="flex items-center gap-4 select-none"
        >
          <div className="w-14 h-14 rounded-[16px] bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center text-white shrink-0 border border-slate-700/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
            <Factory size={24} strokeWidth={1.5} className="relative z-10" />
          </div>
          <div className="flex flex-col justify-center text-left min-w-0">
            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-none mb-1.5">
              FactoryOS
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-blue-600 uppercase leading-none">
              Manufacturing
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: smoothEase }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative flex items-center justify-center mb-1">
            <Loader2
              size={32}
              strokeWidth={1.5}
              className="animate-spin text-blue-600 relative z-10"
            />
            <div className="absolute inset-0 bg-blue-500 blur-[24px] opacity-30 rounded-full animate-pulse" />
          </div>
          {text && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {text}
            </span>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Loader;
