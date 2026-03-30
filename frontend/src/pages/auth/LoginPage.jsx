import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    tag: "Intelligence",
    title: "Live Factory JobBook",
    desc: "Real-time visibility into active operations and global inventory from a single, cloud-native dashboard.",
  },
  {
    tag: "Manufacturing",
    title: "Furnace & Production Tracking",
    desc: "Monitor raw material inputs, scrap usage, and furnace yields to optimize the core steel-making process.",
  },
  {
    tag: "Logistics",
    title: "Smart Transaction Flow",
    desc: "Streamlined purchase, sales, and dispatch management featuring automated stock ledger reversals to maintain absolute data integrity.",
  },
  {
    tag: "Accuracy",
    title: "Ledger-Driven Stock",
    desc: "Eliminate inventory discrepancies with strict quantity enforcement and ledger-accurate real-time tracking.",
  },
  {
    tag: "Finance",
    title: "Complete Financial Pulse",
    desc: "Integrated daybook, cash, and bank modules to track every daily expense and trace complete money flow seamlessly.",
  },
  {
    tag: "Operations",
    title: "Workforce & Contractor Management",
    desc: "A unified platform to manage staff shifts, oversee contractor workloads, and handle payroll efficiently.",
  },
];

const smoothEase = [0.22, 1, 0.36, 1];
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: smoothEase } },
};

export default function ERPLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authErrorType, setAuthErrorType] = useState(null);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentSlide]);

  const handleDotClick = (index) => {
    if (index !== currentSlide) {
      setCurrentSlide(index);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (authErrorType) {
      setAuthErrorType(null);
    }
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!formData.username || !formData.password) return;
    setError("");
    setAuthErrorType(null);
    setLoading(true);

    try {
      await login(formData.username, formData.password, formData.rememberMe);
      setTimeout(() => navigate("/"), 400);
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.message || err.message;
      let displayError = apiMessage || "Authentication failed.";

      let errType = "password";
      if (status === 404 || status === 403) {
        errType = "user";
      }

      setAuthErrorType(errType);
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-blue-500/30 selection:text-blue-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-slate-200/50 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-[420px] lg:max-w-[1100px] xl:max-w-[1280px] min-h-[500px] lg:min-h-[650px] xl:min-h-[750px] flex flex-col lg:flex-row items-stretch bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-2xl rounded-[32px] sm:rounded-[36px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.12)] border border-white overflow-hidden relative z-10">
        <div className="hidden lg:flex w-full lg:w-[45%] xl:w-[48%] relative overflow-hidden flex-col p-10 xl:p-14 shrink-0 z-0 rounded-l-[32px] sm:rounded-l-[36px]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#020617_100%)] opacity-80" />

            <motion.div
              animate={{
                x: ["-20%", "20%", "-20%"],
                y: ["10%", "-10%", "10%"],
                rotate: [0, 5, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[20%] w-[120%] h-[120%] bg-indigo-500/15 rounded-full blur-[160px] opacity-70"
              style={{ mixBlendMode: "plus-lighter" }}
            />

            <motion.div
              animate={{
                x: ["20%", "-20%", "20%"],
                y: ["-10%", "10%", "-10%"],
                rotate: [0, -5, 0],
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -right-[20%] w-[120%] h-[120%] bg-sky-500/10 rounded-full blur-[140px]"
              style={{ mixBlendMode: "plus-lighter" }}
            />

            <motion.div
              animate={{ opacity: [0.1, 0.25, 0.1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px bg-white/20 rounded-full shadow-[0_0_180px_100px_rgba(59,130,246,0.3)]"
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1024 1024' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="absolute right-0 top-0 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />

          <div className="relative z-20 flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-[12px] flex items-center justify-center text-white shadow-lg text-[13px] font-black tracking-widest">
              FOS
            </div>
            <span className="text-white text-[20px] font-bold tracking-tight">
              FactoryOS
            </span>
          </div>

          <div className="relative z-20 flex flex-col justify-end w-full max-w-[90%] mt-auto min-h-[240px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.5, ease: smoothEase }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-[2px] w-6 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span className="text-blue-400 text-[11px] font-bold uppercase tracking-[0.2em]">
                    {slides[currentSlide].tag}
                  </span>
                </div>
                <h2 className="text-white text-[32px] xl:text-[40px] font-bold leading-[1.1] mb-5 tracking-tight drop-shadow-sm">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-slate-400 text-[15px] xl:text-[16px] leading-relaxed font-medium">
                  {slides[currentSlide].desc}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-2.5 mt-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={`relative h-1.5 rounded-full transition-all duration-500 ease-out focus:outline-none overflow-hidden ${
                    i === currentSlide
                      ? "w-12 bg-slate-700/80"
                      : "w-2.5 bg-slate-700/40 hover:bg-slate-600/80"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                >
                  {i === currentSlide && (
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center w-full px-6 py-12 sm:px-12 lg:px-16 xl:px-24 relative z-10 min-w-0 bg-white/50">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="w-full max-w-[400px] mx-auto lg:mx-0 flex flex-col justify-center h-full lg:h-auto min-w-0"
          >
            <motion.header variants={fadeUp} className="mb-10 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-[14px] flex items-center justify-center mb-6 shadow-md lg:hidden text-white text-[14px] font-bold tracking-widest">
                FOS
              </div>
              <h2 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-slate-900 leading-none mb-2.5 truncate">
                Welcome back
              </h2>
              <p className="text-[14px] text-slate-500 font-medium tracking-tight leading-relaxed">
                Enter your credentials to access the execution and inventory
                control system.
              </p>
            </motion.header>

            <motion.form
              variants={fadeUp}
              onSubmit={handleLogin}
              className="space-y-6 min-w-0"
            >
              <div className="space-y-2 min-w-0">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Username"
                  className={`w-full min-w-0 h-[52px] px-4 bg-slate-100/60 border ${
                    authErrorType === "user"
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10 focus:shadow-[0_4px_20px_rgba(225,29,72,0.1)]"
                      : "border-slate-200/80 hover:bg-white hover:border-slate-300 focus:border-blue-400/50 focus:ring-blue-500/10 focus:shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
                  } rounded-[20px] text-[14px] font-medium text-slate-900 focus:bg-white focus:ring-4 transition-all duration-300 outline-none placeholder-slate-400`}
                />
              </div>

              <div className="space-y-2 min-w-0">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Password
                </label>
                <div className="relative group w-full min-w-0">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    className={`w-full min-w-0 h-[52px] pl-4 pr-12 bg-slate-100/60 border ${
                      authErrorType === "password"
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10 focus:shadow-[0_4px_20px_rgba(225,29,72,0.1)]"
                        : "border-slate-200/80 hover:bg-white hover:border-slate-300 focus:border-blue-400/50 focus:ring-blue-500/10 focus:shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
                    } rounded-[20px] text-[14px] font-medium tracking-widest focus:bg-white focus:ring-4 transition-all duration-300 outline-none placeholder-slate-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none rounded-full shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={2} />
                    ) : (
                      <Eye size={16} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between min-w-0 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 rounded-[4px] border border-slate-300 bg-slate-50 group-hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="peer sr-only"
                    />
                    <svg
                      className={`w-2.5 h-2.5 text-blue-600 pointer-events-none transition-opacity ${
                        formData.rememberMe ? "opacity-100" : "opacity-0"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors select-none tracking-tight">
                    Remember me
                  </span>
                </label>
              </div>

              <div className="h-auto min-h-[24px] flex items-center min-w-0">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-rose-600 text-[13px] font-semibold tracking-tight bg-rose-50/80 border border-rose-200 p-3.5 rounded-[16px] w-full flex items-start gap-2 shadow-sm"
                    >
                      <ShieldAlert
                        size={16}
                        className="shrink-0 mt-0.5 text-rose-500"
                        strokeWidth={2}
                      />
                      <span className="leading-snug">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-2 min-w-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-w-0 h-[52px] bg-slate-900 hover:bg-slate-800 text-white rounded-[18px] text-[15px] font-semibold tracking-wide transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98] shadow-[0_4px_16px_rgba(15,23,42,0.15)] border border-slate-700/50"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin text-slate-300"
                        strokeWidth={2.5}
                      />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Secure Login</span>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
