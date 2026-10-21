import { NavLink } from "react-router-dom";
import { ShieldCheck, X } from "lucide-react";
import { navItems } from "./navItems";
import { useApp } from "../../state/AppContext";

export default function Sidebar({ open, onClose }) {
  const { currentUser } = useApp();
  const items = navItems.filter((item) => item.roles.includes(currentUser?.role));
  return (
    <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-72 bg-slate-950 text-white transition lg:static lg:translate-x-0`}>
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-400" size={28} />
          <div>
            <p className="text-sm font-bold leading-4 tracking-wide">BARBICAN</p>
            <p className="text-xs text-slate-400">Vehicle Access Intelligence</p>
          </div>
        </div>
        <button className="lg:hidden" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
      </div>
      <nav className="grid gap-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={`${item.label}-${item.to}`} to={item.to} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}>
              <Icon size={18} /> {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
