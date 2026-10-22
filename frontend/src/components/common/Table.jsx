import { Skeleton } from "./PageHeader";

/**
 * Data table. `loading` shows placeholder rows while live data arrives; `empty`
 * may be a string or a node (e.g. an EmptyState). `bare` drops the table's own
 * card so it can sit inside another one.
 */
export default function Table({ columns, rows, empty = "No records found.", loading = false, bare = false }) {
  return (
    <div
      className={`table-wrap ${
        bare ? "" : "rounded-2xl border border-white/[0.08] bg-[var(--surface)] shadow-[var(--card-shadow)]"
      }`}
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {loading && !rows.length ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3.5">
                    <Skeleton className="h-3.5 w-full max-w-28" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id || index} className="transition-colors hover:bg-white/[0.025]">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-zinc-300">
                    {column.render ? column.render(row) : row[column.key] || <span className="text-zinc-600">—</span>}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-4" colSpan={columns.length}>
                {typeof empty === "string" ? (
                  <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>
                ) : (
                  empty
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
