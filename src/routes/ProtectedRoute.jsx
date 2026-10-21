import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";

export default function ProtectedRoute({ roles }) {
  const { currentUser, authReady } = useApp();

  // Firebase restores a persisted session asynchronously. Redirecting before that
  // resolves would sign the user out on every page refresh.
  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#09090b]">
        <p className="text-sm text-zinc-500">Restoring session…</p>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
