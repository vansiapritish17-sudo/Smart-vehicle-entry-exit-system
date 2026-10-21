/** Reusable dark glass card — mirrors the "Loud" dashboard cards */
export default function Card({ children, className = "", hover = false }) {
  return (
    <section
      className={`glass-card ${hover ? "transition-all hover:scale-[1.01]" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
