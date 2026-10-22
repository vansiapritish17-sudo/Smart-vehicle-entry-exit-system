import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Mark from "../components/common/Mark";
import { useApp } from "../state/AppContext";

export default function ProtectedRoute({ roles }) {
  const { currentUser, authReady } = useApp();

  // Firebase restores a persisted session asynchronously. Redirecting before that
  // resolves would sign the user out on every page refresh.
  if (!authReady) return <Splash />;

  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/* Restoring usually takes a few hundred milliseconds, so stay blank at first —
   a splash that flashes for a frame looks worse than none. */
function Splash() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-[#09090b]" aria-busy="true">
      {visible && (
        <div className="animate-fade-up flex flex-col items-center gap-4" role="status" aria-label="Loading">
          <Mark className="h-9 w-9" />
          <span className="h-[2px] w-24 overflow-hidden rounded-full bg-white/[0.06]">
            <span className="splash-bar block h-full w-1/3 rounded-full bg-lime-300/70" />
          </span>
        </div>
      )}
    </div>
  );
}
