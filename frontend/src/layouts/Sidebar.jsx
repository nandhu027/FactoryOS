import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Building2,
  HardHat,
  Package,
  Cog,
  Layers,
  Warehouse,
  Factory,
  ArrowRightLeft,
  Truck,
  CalendarClock,
  ScrollText,
  Banknote,
  CreditCard,
  UserCog,
  ShieldCheck,
  History,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/", module: "DASHBOARD", icon: LayoutDashboard },
  {
    label: "JobBook Live",
    path: "/jobbook",
    module: "JOBBOOK",
    icon: Activity,
  },
  { label: "Parties", path: "/parties", module: "PARTIES", icon: Building2 },
  {
    label: "Staff & Contractors",
    path: "/staff",
    module: "STAFF_CONTRACTORS",
    icon: HardHat,
  },
  { label: "Products", path: "/products", module: "PRODUCTS", icon: Package },
  { label: "Machines", path: "/machines", module: "MACHINES", icon: Cog },
  {
    label: "Raw Materials",
    path: "/raw-materials",
    module: "RAW_INWARD",
    icon: Layers,
  },
  { label: "Stock", path: "/stock", module: "STOCK_ENGINE", icon: Warehouse },
  {
    label: "Production",
    path: "/production",
    module: "PRODUCTION",
    icon: Factory,
  },
  {
    label: "Contractor IO",
    path: "/contractor",
    module: "CONTRACTOR_IO",
    icon: ArrowRightLeft,
  },
  { label: "Dispatch", path: "/dispatch", module: "DISPATCH", icon: Truck },
  {
    label: "Attendance & OT",
    path: "/attendance",
    module: "STAFF_ATTENDANCE",
    icon: CalendarClock,
  },
  {
    label: "Bills & Settlements",
    path: "/settlements",
    module: "SETTLEMENTS",
    icon: ScrollText,
  },
  { label: "Payments", path: "/payments", module: "PAYMENTS", icon: Banknote },
  {
    label: "Expenses",
    path: "/expenses",
    module: "EXPENSES",
    icon: CreditCard,
  },
  { label: "Users", path: "/users", module: "ADMIN_USERS", icon: UserCog },
  { label: "Roles", path: "/roles", module: "ADMIN_USERS", icon: ShieldCheck },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    module: "AUDIT_LOG",
    icon: History,
  },
];

const sidebarSpring = {
  type: "spring",
  stiffness: 350,
  damping: 35,
  mass: 0.8,
};
const mobileTransition = { type: "tween", ease: "easeOut", duration: 0.25 };

const Sidebar = ({ onMobileClose }) => {
  const { user, permissions, logout } = useAuth();
  const location = useLocation();

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 1024);
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if (item.module === "DASHBOARD") return true;
    if (user?.is_super_admin) return true;
    if (permissions === "ALL") return true;
    const perm = permissions?.find((p) => p.module_code === item.module);
    return perm?.can_view === true;
  });

  const isExpanded = isMobile || isPinned || isHovered;

  return (
    <div className="relative flex-shrink-0 z-50 h-full w-full lg:w-auto">
      {!isMobile && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsPinned(!isPinned);
          }}
          className="absolute -right-3.5 top-15 w-7 h-7 z-[60] cursor-pointer bg-white border border-slate-200/80 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-800 hover:border-slate-300 transition-all duration-200"
        >
          <motion.div
            animate={{ rotate: isPinned ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronRight size={14} strokeWidth={2} />
          </motion.div>
        </motion.button>
      )}
      <motion.aside
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        initial={{ width: isMobile ? "100%" : 80 }}
        animate={{ width: isMobile ? "100%" : isExpanded ? 260 : 80 }}
        transition={isMobile ? mobileTransition : sidebarSpring}
        className="
          relative h-full flex flex-col 
          rounded-none sm:rounded-[24px] 
          bg-white sm:bg-white/80 sm:supports-[backdrop-filter]:bg-white/60 sm:backdrop-blur-2xl 
          border-r sm:border border-slate-100 sm:border-white 
          shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:shadow-[0_4px_20px_rgba(0,0,0,0.03)]
          overflow-hidden font-sans antialiased w-full
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0
        "
      >
        <div className="px-4 py-6 flex items-center justify-between relative flex-shrink-0">
          <div className="absolute bottom-0 left-5 right-5 h-[1px] bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />
          <div className="flex items-center w-full min-w-0">
            <div className="w-[48px] min-w-[48px] flex items-center justify-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white text-[13px] font-semibold tracking-wider shadow-sm border border-slate-700/50">
                FOS
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="flex flex-col justify-center overflow-hidden whitespace-nowrap ml-2 min-w-0"
                >
                  <h1 className="text-[16px] font-semibold text-slate-900 tracking-tight leading-none truncate">
                    FactoryOS
                  </h1>
                  <p className="text-[10px] font-medium tracking-widest text-slate-500 uppercase mt-1 truncate">
                    Manufacturing
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isMobile && onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1.5 bg-slate-100/80 rounded-full text-slate-400 hover:text-slate-800 flex-shrink-0 ml-2 transition-colors"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className="relative group flex items-center h-[42px] rounded-full text-[14px] outline-none"
              >
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <div className="absolute inset-0 bg-slate-400/0 group-hover:bg-slate-100/60 rounded-full transition-colors duration-200" />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="active-sidebar-tab"
                        className="absolute inset-0 bg-white/80 border border-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-full backdrop-blur-md"
                        transition={isMobile ? mobileTransition : sidebarSpring}
                      />
                    )}
                    <div
                      className={`relative z-10 w-[48px] min-w-[48px] flex items-center justify-center transition-colors duration-300 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                    </div>
                    <div
                      className={`relative z-10 overflow-hidden whitespace-nowrap tracking-tight transition-all duration-300 ${isExpanded ? "w-full opacity-100 ml-1" : "w-0 opacity-0 ml-0"} ${isActive ? "text-slate-900 font-semibold" : "text-slate-500 group-hover:text-slate-700 font-medium"}`}
                    >
                      {item.label}
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 mt-auto relative z-10 flex-shrink-0 w-full">
          <div
            className={`relative flex items-center h-[52px] rounded-full transition-all duration-300 group w-full ${isExpanded ? "bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/60 pl-2 pr-2.5" : "bg-transparent border-transparent justify-center"}`}
          >
            <div
              className={`${isExpanded ? "w-auto" : "w-[48px] flex items-center justify-center"} transition-all flex-shrink-0`}
            >
              <div className="w-9 h-9 min-w-[36px] rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 text-white text-[13px] font-semibold shadow-sm border border-slate-700/50 transition-colors group-hover:bg-slate-800">
                {(user?.full_name || user?.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
            <div
              className={`flex flex-col justify-center overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? "opacity-100 flex-1 ml-3" : "opacity-0 w-0 ml-0"}`}
            >
              <span className="text-[13px] font-semibold tracking-tight text-slate-900 truncate">
                {user?.full_name || user?.username || "Admin User"}
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                {user?.is_super_admin ? "Super Admin" : "System User"}
              </span>
            </div>
            {isExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                className="flex-shrink-0 p-2 rounded-full bg-white border border-slate-200/80 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors duration-200 shadow-sm ml-2"
              >
                <LogOut size={16} strokeWidth={1.5} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
};

export default Sidebar;
