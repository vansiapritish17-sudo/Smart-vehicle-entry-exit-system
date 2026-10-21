export default function StatCard({ label, value, icon: Icon, tone = "text-violet-300", iconBg = "bg-violet-500/15" }) {
  return (
    <div className="glass-card flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-zinc-100">{value}</p>
      </div>
      {Icon && (
        <div className={`shrink-0 grid h-10 w-10 place-items-center rounded-full ${iconBg}`}>
          <Icon className={tone} size={18} />
        </div>
      )}
    </div>
  );
}
