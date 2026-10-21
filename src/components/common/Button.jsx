export default function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 active:scale-[0.97]",
    secondary:
      "bg-transparent text-zinc-300 border border-white/15 hover:bg-white/8 hover:border-white/25 active:scale-[0.97]",
    violet:
      "bg-violet-600 text-white hover:bg-violet-500 active:scale-[0.97]",
    danger:
      "bg-red-600 text-white hover:bg-red-500 active:scale-[0.97]",
    ghost:
      "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/6 active:scale-[0.97]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] ?? variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
