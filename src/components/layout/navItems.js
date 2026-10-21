import { Activity, AlertTriangle, BarChart3, Car, ClipboardList, Gauge, LogIn, LogOut, Search, Settings, Shield, User, Users } from "lucide-react";

export const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Gauge, roles: ["Administrator", "Security Operator"] },
  { label: "Vehicle Management", to: "/vehicles", icon: Car, roles: ["Administrator"] },
  { label: "Vehicle Search", to: "/vehicles/search", icon: Search, roles: ["Administrator", "Security Operator"] },
  { label: "Vehicle Entry", to: "/movements/entry", icon: LogIn, roles: ["Administrator", "Security Operator"] },
  { label: "Vehicle Exit", to: "/movements/exit", icon: LogOut, roles: ["Administrator", "Security Operator"] },
  { label: "Live Monitoring", to: "/monitoring", icon: Activity, roles: ["Administrator", "Security Operator"] },
  { label: "Alerts", to: "/alerts", icon: AlertTriangle, roles: ["Administrator", "Security Operator"] },
  { label: "History & Analytics", to: "/history", icon: BarChart3, roles: ["Administrator"] },
  { label: "History", to: "/history", icon: ClipboardList, roles: ["Security Operator"] },
  { label: "User Management", to: "/users", icon: Users, roles: ["Administrator"] },
  { label: "System Configuration", to: "/configuration", icon: Settings, roles: ["Administrator"] },
  { label: "Profile", to: "/profile", icon: User, roles: ["Security Operator"] },
];

export const roleHome = {
  Administrator: "/dashboard",
  "Security Operator": "/dashboard",
};
