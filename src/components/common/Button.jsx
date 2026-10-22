export default function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary:
      "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
    secondary:
      "bg-transparent text-zinc-300 border border-white/10 hover:bg-white/[0.06] hover:border-white/20 hover:text-zinc-100",
    violet:
      "bg-violet-600 text-on-accent hover:bg-violet-500",
    danger:
      "bg-red-600 text-on-accent hover:bg-red-500",
    ghost:
      "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06]",
  };
  const sizes = {
    sm: "h-8 px-2.5 text-xs",
    md: "h-9 px-3.5 text-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
