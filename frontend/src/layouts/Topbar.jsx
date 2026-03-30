import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  Bell,
  Search,
  Activity,
  Menu,
  Command,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Building,
  Cpu,
  Database,
  Factory,
  Truck,
  Receipt,
  Banknote,
  History,
  Package,
  Boxes,
  UserCog,
  Loader2,
  ChevronRight,
  Layers,
  Download,
  ShieldCheck,
  SendToBack,
  Info,
  CalendarDays,
  LayoutDashboard,
  Landmark,
  CalendarCheck,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const topbarSpring = { type: "spring", stiffness: 350, damping: 35, mass: 0.8 };

const iconDictionary = {
  Users,
  Building,
  Cpu,
  Package,
  Layers,
  Boxes,
  Database,
  Factory,
  Truck,
  SendToBack,
  Download,
  Receipt,
  Banknote,
  ShieldCheck,
  UserCog,
  Activity,
  History,
  LayoutDashboard,
  Landmark,
  CalendarCheck,
  KeyRound,
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const diffInMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  const hrs = Math.floor(diffInMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getNotificationStyles = (type) => {
  switch (type) {
    case "alert":
      return {
        icon: AlertTriangle,
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-200",
      };
    case "success":
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-200",
      };
    case "info":
    default:
      return {
        icon: Info,
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
      };
  }
};

const Topbar = ({ onOpenSidebar }) => {
  const { user, permissions } = useAuth();
  const navigate = useNavigate();

  const searchInputRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const searchResultsRef = useRef(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dbResults, setDbResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(window.navigator.userAgent.toLowerCase().includes("mac"));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(currentTime);
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(currentTime);

  const currentHour = currentTime.getHours();
  let greeting = "Good evening";
  if (currentHour >= 0 && currentHour < 12) greeting = "Good morning";
  else if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";

  const displayName = user?.full_name?.split(" ")[0] || user?.username || "";

  const searchableModules = useMemo(
    () =>
      [
        {
          label: "Dashboard",
          path: "/",
          module: "DASHBOARD",
          icon: LayoutDashboard,
        },
        {
          label: "Live JobBook",
          path: "/jobbook",
          module: "JOBBOOK",
          icon: Activity,
        },
        {
          label: "Raw Materials",
          path: "/raw-materials",
          module: "RAW_INWARD",
          icon: Boxes,
        },
        {
          label: "Product Master",
          path: "/products",
          module: "PRODUCTS",
          icon: Package,
        },
        {
          label: "Stock Engine",
          path: "/stock",
          module: "STOCK_ENGINE",
          icon: Database,
        },
        {
          label: "Production Orders",
          path: "/production",
          module: "PRODUCTION",
          icon: Factory,
        },
        {
          label: "Contractor Portal",
          path: "/contractor",
          module: "CONTRACTOR_IO",
          icon: Truck,
        },
        {
          label: "Dispatch & Sales",
          path: "/dispatch",
          module: "DISPATCH",
          icon: SendToBack,
        },
        {
          label: "Parties Master",
          path: "/parties",
          module: "PARTIES",
          icon: Building,
        },
        {
          label: "Bills & Settlements",
          path: "/settlements",
          module: "SETTLEMENTS",
          icon: Landmark,
        },
        {
          label: "Payment Ledger",
          path: "/payments",
          module: "PAYMENTS",
          icon: Banknote,
        },
        {
          label: "Expense Tracker",
          path: "/expenses",
          module: "EXPENSES",
          icon: Receipt,
        },
        {
          label: "Staff & Contractors",
          path: "/staff",
          module: "STAFF_CONTRACTORS",
          icon: UserCog,
        },
        {
          label: "Attendance & OT",
          path: "/attendance",
          module: "STAFF_ATTENDANCE",
          icon: CalendarCheck,
        },
        {
          label: "Machines Center",
          path: "/machines",
          module: "MACHINES",
          icon: Cpu,
        },
        {
          label: "System Users",
          path: "/users",
          module: "ADMIN_USERS",
          icon: Users,
        },
        {
          label: "Access Roles",
          path: "/roles",
          module: "ADMIN_USERS",
          icon: KeyRound,
        },
        {
          label: "Audit Logs",
          path: "/audit-logs",
          module: "AUDIT_LOG",
          icon: History,
        },
      ].filter(
        (m) =>
          m.module === "DASHBOARD" ||
          user?.is_super_admin ||
          permissions === "ALL" ||
          permissions?.find((p) => p.module_code === m.module && p.can_view),
      ),
    [user, permissions],
  );

  const performSearch = useCallback(async (query) => {
    if (query.trim().length < 2) {
      setDbResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(
        `/search/global?q=${encodeURIComponent(query)}`,
      );
      setDbResults(res.data.data || []);
      setSelectedIndex(0);
    } catch (err) {
      console.error("Global search failed", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const allResults = useMemo(() => {
    const moduleMatches = searchableModules.filter((m) =>
      m.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return [...moduleMatches, ...dbResults].slice(0, 8);
  }, [searchQuery, searchableModules, dbResults]);

  const handleNav = (item) => {
    let targetPath = item.path || "";
    if (item.type === "Contractor Job" || targetPath.startsWith("/contractor/"))
      targetPath = `/contractor?search=${encodeURIComponent(item.label)}`;
    else if (
      item.type === "Production Batch" ||
      targetPath.startsWith("/production/")
    )
      targetPath = `/production`;

    navigate(targetPath);
    setSearchQuery("");
    setIsSearchFocused(false);
    setSelectedIndex(0);
    searchInputRef.current?.blur();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (isSearchFocused && allResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % allResults.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) => (prev - 1 + allResults.length) % allResults.length,
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (allResults[selectedIndex]) handleNav(allResults[selectedIndex]);
        } else if (e.key === "Escape") {
          setIsSearchFocused(false);
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchFocused, allResults, selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(e.target)
      )
        setIsNotifOpen(false);
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(e.target)
      )
        setIsSearchFocused(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/dashboard");
        const timeline = res.data.data.timeline || [];
        setNotifications(timeline);
        const lastSeenStr = localStorage.getItem("lastSeenNotifications");
        const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        setUnreadCount(
          timeline.filter(
            (t) => new Date(t.event_time).getTime() > lastSeenTime,
          ).length,
        );
      } catch (err) {
        console.error("Failed to fetch notifications");
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState) {
      localStorage.setItem("lastSeenNotifications", new Date().toISOString());
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = (notif) => {
    setIsNotifOpen(false);
    const title = notif.title.toLowerCase();
    if (title.includes("stock")) navigate("/stock");
    else if (title.includes("machine")) navigate("/machines");
    else if (title.includes("contractor")) navigate("/contractor");
    else if (title.includes("payment") || title.includes("settlement"))
      navigate("/settlements");
    else if (title.includes("dispatch")) navigate("/dispatch");
    else if (title.includes("production") || title.includes("batch"))
      navigate("/production");
    else navigate("/jobbook");
  };

  return (
    <div
      className="
      w-full flex-shrink-0 flex items-center justify-between px-3 sm:px-5 gap-3 lg:gap-6 
      bg-white/90 supports-[backdrop-filter]:bg-white/60 backdrop-blur-2xl 
      border-b border-slate-100 lg:border-white 
      shadow-sm lg:shadow-[0_2px_15px_rgba(0,0,0,0.03)] 
      font-sans antialiased relative z-50
      pt-[max(env(safe-area-inset-top),12px)] lg:pt-0
      pb-3 lg:pb-0
      h-auto lg:h-[68px] 
      rounded-none lg:rounded-[20px]
    "
    >
      <div className="flex items-center gap-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenSidebar}
          className="lg:hidden w-[42px] h-[42px] flex items-center justify-center rounded-full text-slate-500 bg-white border border-slate-200/60 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Menu size={18} strokeWidth={1.5} />
        </motion.button>

        <div className="hidden lg:flex items-center gap-2.5 pl-1">
          <h2 className="text-[14px] font-medium text-slate-500 tracking-tight flex items-center gap-1.5">
            {greeting},{" "}
            <span className="font-semibold text-slate-900">{displayName}</span>
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50/80 border border-emerald-100/50 text-[9px] font-semibold tracking-widest uppercase text-emerald-600 shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Online
          </div>
        </div>
      </div>
      <div
        ref={searchResultsRef}
        className="flex flex-1 justify-center w-full min-w-0 relative"
      >
        <div
          className={`relative group flex items-center w-full max-w-2xl xl:max-w-3xl h-[42px] gap-2.5 px-3.5 rounded-full transition-all duration-300 border ${
            isSearchFocused
              ? "bg-white border-blue-400/40 shadow-[0_4px_20px_rgba(59,130,246,0.12)] ring-4 ring-blue-500/10"
              : "bg-slate-100/60 border-slate-200/80 hover:bg-white hover:border-slate-300/80 hover:shadow-sm"
          }`}
        >
          {isSearching ? (
            <Loader2
              size={16}
              className="animate-spin text-blue-500 shrink-0"
              strokeWidth={1.5}
            />
          ) : (
            <Search
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 transition-colors ${isSearchFocused ? "text-blue-500" : "text-slate-400 group-hover:text-slate-500"}`}
            />
          )}
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search batches, staff, machines..."
            className="bg-transparent outline-none text-[14px] text-slate-900 placeholder-slate-400 w-full font-medium h-full tracking-tight"
          />
          <div className="hidden md:flex shrink-0 items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-[10px] text-slate-500 font-semibold tracking-wide shadow-sm">
            {isMac ? (
              <Command size={11} strokeWidth={1.5} />
            ) : (
              <span className="text-[9px] uppercase tracking-widest mt-[1px]">
                Ctrl
              </span>
            )}
            <span>K</span>
          </div>
        </div>
        <AnimatePresence>
          {isSearchFocused && searchQuery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={topbarSpring}
              className="absolute top-[calc(100%+12px)] w-full max-w-2xl xl:max-w-3xl mx-auto bg-white/95 backdrop-blur-3xl border border-slate-200/80 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] rounded-[20px] overflow-hidden z-[110] p-2.5 transform-gpu"
            >
              {allResults.length === 0 && !isSearching ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <Search
                      size={20}
                      strokeWidth={1.5}
                      className="text-slate-300"
                    />
                  </div>
                  <p className="text-slate-900 text-[13px] font-semibold tracking-tight">
                    No exact matches found
                  </p>
                  <p className="text-slate-500 text-[12px] mt-0.5 font-medium tracking-tight">
                    Try searching by partial IDs or names.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  {allResults.map((result, idx) => {
                    const RenderedIcon =
                      typeof result.icon === "string"
                        ? iconDictionary[result.icon] || Search
                        : result.icon || Search;
                    const isSelected = selectedIndex === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleNav(result)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full group flex items-center justify-between p-2.5 rounded-2xl transition-all outline-none ${
                          isSelected
                            ? "bg-blue-50/80 border border-blue-200/60 shadow-sm"
                            : "bg-transparent border border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${isSelected ? "bg-blue-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500 group-hover:text-blue-600"}`}
                          >
                            <RenderedIcon size={14} strokeWidth={1.5} />
                          </div>
                          <div className="text-left min-w-0 flex flex-col">
                            <p
                              className={`text-[13px] font-semibold tracking-tight truncate ${isSelected ? "text-blue-900" : "text-slate-900"}`}
                            >
                              {result.label}
                            </p>
                            <p
                              className={`text-[11px] font-medium tracking-tight truncate ${isSelected ? "text-blue-600/80" : "text-slate-500"}`}
                            >
                              {result.sublabel || result.path}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          <span
                            className={`hidden sm:flex text-[8px] uppercase tracking-widest font-semibold px-2 py-1 rounded-full border ${isSelected ? "bg-white border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-400"}`}
                          >
                            {result.module ? "System Module" : result.type}
                          </span>
                          {isSelected && (
                            <ChevronRight
                              size={14}
                              strokeWidth={1.5}
                              className="text-blue-600"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-2.5 sm:gap-6 flex-shrink-0">
        <div className="hidden xl:flex items-center p-1 h-[42px] rounded-full bg-slate-100/60 border border-slate-200/60 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-1.5 px-3 h-full rounded-full bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <CalendarDays
              size={14}
              strokeWidth={1.5}
              className="text-blue-500"
            />
            <span className="text-[12px] font-medium text-slate-600 tracking-tight">
              {formattedDate}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 h-full">
            <Clock size={14} strokeWidth={1.5} className="text-slate-400" />
            <span className="text-[13px] font-semibold text-slate-900 tracking-tight tabular-nums">
              {formattedTime}
            </span>
          </div>
        </div>
        <div ref={notifDropdownRef} className="relative">
          <motion.button
            onClick={toggleNotifications}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-[42px] h-[42px] flex items-center justify-center rounded-full border shadow-sm transition-all ${
              isNotifOpen
                ? "bg-blue-50 border-blue-200 text-blue-600 ring-4 ring-blue-500/10"
                : "bg-white/80 border-slate-200/60 text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Bell size={18} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 border-2 border-white text-[9px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </motion.button>
          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={topbarSpring}
                className="absolute right-0 top-[calc(100%+12px)] w-[320px] sm:w-[380px] bg-white border border-slate-200/80 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] rounded-[20px] overflow-hidden z-[110] transform-gpu"
              >
                <div className="px-4 py-3.5 border-b border-slate-100/80 bg-white flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900 text-[14px] tracking-tight">
                    System Feed
                  </h3>
                  <button className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2.5 py-1 rounded-full">
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[380px] overflow-y-auto scrollbar-hide">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Bell
                          size={20}
                          strokeWidth={1.5}
                          className="text-slate-300"
                        />
                      </div>
                      <p className="text-[13px] font-semibold tracking-tight text-slate-900">
                        All systems nominal
                      </p>
                      <p className="text-[12px] font-medium tracking-tight mt-0.5 text-slate-500">
                        No recent alerts or events.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100/80 p-1.5">
                      {notifications.map((notif, idx) => {
                        const style = getNotificationStyles(notif.type);
                        const NotifIcon = style.icon;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleNotificationClick(notif)}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer flex gap-3 group"
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${style.bg} ${style.text} ${style.border}`}
                              >
                                <NotifIcon size={14} strokeWidth={1.5} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[13px] font-semibold leading-snug tracking-tight truncate ${notif.type === "alert" ? "text-rose-600" : "text-slate-900"}`}
                              >
                                {notif.title}
                              </p>
                              <p className="text-[11px] font-medium tracking-tight text-slate-400 mt-0.5 uppercase tracking-widest truncate">
                                {notif.machine}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400/80 mt-1 flex items-center gap-1 tracking-tight">
                                <Clock size={10} strokeWidth={1.5} />{" "}
                                {formatTimeAgo(notif.event_time)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
