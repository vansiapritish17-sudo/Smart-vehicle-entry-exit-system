import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import Alerts from "./pages/Alerts";
import Configuration from "./pages/Configuration";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Login from "./pages/Login";
import Monitoring from "./pages/Monitoring";
import MovementForm from "./pages/MovementForm";
import Profile from "./pages/Profile";
import UserManagement from "./pages/Users";
import VehicleDetails from "./pages/VehicleDetails";
import VehicleSearch from "./pages/VehicleSearch";
import Vehicles from "./pages/Vehicles";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vehicles/search" element={<VehicleSearch />} />
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
          <Route element={<ProtectedRoute roles={["Administrator"]} />}>
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/configuration" element={<Configuration />} />
          </Route>
          <Route path="/movements/entry" element={<MovementForm mode="entry" />} />
          <Route path="/movements/exit" element={<MovementForm mode="exit" />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Navigate to="/history" replace />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
