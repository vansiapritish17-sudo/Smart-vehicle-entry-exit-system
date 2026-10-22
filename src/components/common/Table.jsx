export default function Table({ columns, rows, empty = "No records found." }) {
  return (
    <div className="table-wrap rounded-2xl border border-white/8 bg-[var(--surface)] overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length ? (
            rows.map((row, index) => (
              <tr
                key={row.id || index}
                className="hover:bg-white/[0.03] transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-zinc-300">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-4 py-10 text-center text-zinc-600"
                colSpan={columns.length}
              >
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
