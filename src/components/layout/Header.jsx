import { Bell, LogOut, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../../state/AppContext";
import { useTheme } from "../../state/theme";
import Mark from "../common/Mark";

const adminTabs = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Vehicles", to: "/vehicles" },
  { label: "Entry", to: "/movements/entry" },
  { label: "Exit", to: "/movements/exit" },
  { label: "Monitoring", to: "/monitoring" },
  { label: "Alerts", to: "/alerts" },
  { label: "History", to: "/history" },
  { label: "Users", to: "/users" },
  { label: "Settings", to: "/configuration" },
];

const operatorTabs = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Search", to: "/vehicles/search" },
  { label: "Entry", to: "/movements/entry" },
  { label: "Exit", to: "/movements/exit" },
  { label: "Monitoring", to: "/monitoring" },
  { label: "Alerts", to: "/alerts" },
  { label: "History", to: "/history" },
];

export default function Header({ mobileMenuOpen, setMobileMenuOpen }) {
  const { currentUser, alerts, loading, signOut, syncError } = useApp();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const openAlerts = alerts.filter((a) => a.status === "OPEN").length;
  const tabs = currentUser?.role === "Administrator" ? adminTabs : operatorTabs;
  const initials = currentUser?.name?.slice(0, 2).toUpperCase() || "U";

  const logout = async () => {
    // Await so the Firestore listeners are torn down before we navigate.
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 h-[60px]">

        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            to="/dashboard"
            aria-label="Barbican — go to dashboard"
            className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <Mark className="h-6 w-6" />
            <span className="hidden text-sm font-bold tracking-[0.18em] text-zinc-100 sm:block">BARBICAN</span>
          </Link>
          {/* Shown only when something needs attention: loading or offline */}
          {syncError ? (
            <span
              title={syncError}
              className="hidden sm:flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              OFFLINE
            </span>
          ) : loading ? (
            <span className="hidden sm:flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
              LOADING
            </span>
          ) : null}
        </div>

        {/* Desktop tabs — pill nav */}
        <nav className="hidden lg:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-0.5 rounded-full bg-white/5 border border-white/8 p-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  isActive
                    ? "nav-pill-active px-3 py-1.5 text-xs xl:px-4"
                    : "nav-pill px-3 py-1.5 text-xs xl:px-4"
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Right icons */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The icon shows the theme you'll switch to */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <NavLink
            to="/vehicles/search"
            className="hidden sm:grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition"
            aria-label="Search"
          >
            <Search size={16} />
          </NavLink>

          <NavLink
            to="/alerts"
            className="relative grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition"
            aria-label="Alerts"
          >
            <Bell size={16} />
            {openAlerts > 0 && (
              <span className="pulse-dot absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            )}
          </NavLink>

          {/* User avatar */}
          <div className="relative group">
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-bold text-on-accent shadow"
              aria-label="User menu"
            >
              {initials}
            </button>
            {/* Dropdown */}
            <div className="pointer-events-none absolute right-0 top-12 w-48 opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 transition-opacity duration-150 rounded-2xl border border-white/10 bg-[var(--surface-2)] p-2 shadow-[var(--popover-shadow)]">
              <p className="px-3 py-2 text-xs font-semibold text-zinc-200">{currentUser?.name}</p>
              <p className="px-3 pb-2 text-[10px] text-zinc-500">{currentUser?.role}</p>
              <hr className="border-white/8 mb-1" />
              <NavLink
                to="/profile"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:bg-white/8 hover:text-zinc-100 transition"
              >
                <User size={13} /> Profile
              </NavLink>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:bg-white/8 hover:text-red-400 transition"
              >
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="grid lg:hidden h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="lg:hidden border-t border-white/8 bg-[var(--bg)] px-4 py-3 grid gap-1">
          {[...tabs, { label: "Search", to: "/vehicles/search" }, { label: "Profile", to: "/profile" }]
            .filter((tab, i, all) => all.findIndex((t) => t.to === tab.to) === i)
            .map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                isActive
                  ? "rounded-xl bg-zinc-100 text-zinc-950 px-4 py-2.5 text-sm font-bold"
                  : "rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-white/6 hover:text-zinc-100 transition"
              }
            >
              {tab.label}
            </NavLink>
          ))}
          <hr className="border-white/8 my-1" />
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-500 hover:bg-white/6 hover:text-red-400 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
