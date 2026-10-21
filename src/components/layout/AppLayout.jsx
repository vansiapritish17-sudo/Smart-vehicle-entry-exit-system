import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Toast from "../common/Toast";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 animate-fade-up">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
