import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Toast from "../common/Toast";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // A new page starts at its header, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Keyed on the route so each page change replays the entrance. */}
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <Toast />
    </div>
  );
}
