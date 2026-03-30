import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import Topbar from "../layouts/Topbar";
import { motion, AnimatePresence } from "framer-motion";

const springTransition = { type: "spring", damping: 28, stiffness: 200 };
const pageTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] };

const pageVariants = {
  initial: { opacity: 0, y: 10, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: {
    opacity: 0,
    y: -4,
    filter: "blur(2px)",
    transition: { duration: 0.2 },
  },
};

const MainLayout = () => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className="
        min-h-[100dvh] w-full flex flex-col lg:flex-row text-slate-900 
        bg-white lg:bg-[#fafafa]
        lg:h-screen lg:overflow-hidden antialiased 
        selection:bg-slate-900 selection:text-white
        lg:px-2 lg:py-2 xl:px-3 xl:py-3 gap-0 lg:gap-2
      "
    >
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={springTransition}
              className="fixed inset-y-0 left-0 z-[70] w-[280px] lg:hidden flex sm:px-2 sm:pt-[max(env(safe-area-inset-top),0.5rem)] sm:pb-[max(env(safe-area-inset-bottom),0.5rem)]"
            >
              <Sidebar onMobileClose={() => setIsMobileSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div className="hidden lg:block relative z-20 flex-shrink-0 h-full">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col gap-0 lg:gap-2 min-w-0 relative z-10 lg:h-full bg-white lg:bg-transparent">
        <header className="sticky top-0 z-40 flex-shrink-0 w-full">
          <Topbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />
        </header>
        <main
          id="main-content"
          className="
            flex-1 flex flex-col w-full relative
            lg:overflow-y-auto lg:overflow-x-hidden 
            bg-white lg:border border-slate-200/80
            lg:shadow-sm lg:rounded-[20px] xl:rounded-[24px] 
          "
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="flex-1 w-full flex flex-col p-3 md:p-4 lg:p-5 pb-[calc(env(safe-area-inset-bottom)+32px)] lg:pb-5"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
