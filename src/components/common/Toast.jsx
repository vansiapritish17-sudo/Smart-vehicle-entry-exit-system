import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "../../state/AppContext";

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const isWarning = toast.tone === "warning";
  const Icon = isWarning ? AlertTriangle : CheckCircle2;
  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1e] px-4 py-3.5 text-sm font-medium text-zinc-100 shadow-2xl shadow-black/50 animate-fade-up">
      <div className={`rounded-full p-1.5 ${isWarning ? "bg-amber-500/15" : "bg-lime-400/15"}`}>
        <Icon className={isWarning ? "text-amber-400" : "text-lime-400"} size={16} />
      </div>
      {toast.message}
    </div>
  );
}
