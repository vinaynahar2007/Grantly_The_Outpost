import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";

export function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const handleOpenMobile = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#0F172A]">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#6D28D9] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={handleCloseMobile}
      />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <TopHeader onOpenMobileMenu={handleOpenMobile} />

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
