import Link from "next/link";

import { EmptyState } from "@/components/admin/EmptyState";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  editHref,
}: {
  rows: T[];
  columns: AdminTableColumn<T>[];
  editHref?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No records found" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column.key}>
                {column.header}
              </th>
            ))}
            {editHref ? <th className="px-4 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr className="text-zinc-700" key={row.id}>
              {columns.map((column) => (
                <td className="px-4 py-3 align-top" key={column.key}>
                  {column.render(row)}
                </td>
              ))}
              {editHref ? (
                <td className="px-4 py-3 align-top">
                  <Link
                    className="font-medium text-zinc-950 underline-offset-4 hover:underline"
                    href={editHref(row)}
                  >
                    Edit
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
