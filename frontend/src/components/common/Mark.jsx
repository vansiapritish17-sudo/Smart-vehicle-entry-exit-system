/* ── Brand mark: a crenellated gatehouse with an open arch ── */
export default function Mark({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 text-lime-400 ${className}`} aria-hidden>
      <path
        d="M3 21V5h3v2.5h2V5h3v2.5h2V5h3v2.5h2V5h3v16h-6.5v-5a2.5 2.5 0 0 0-5 0v5Z"
        fill="currentColor"
      />
    </svg>
  );
}
