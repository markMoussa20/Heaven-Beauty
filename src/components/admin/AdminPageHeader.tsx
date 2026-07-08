import Link from "next/link";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {action ? (
        <Link
          className="inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
          href={action.href}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
