export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
      <h3 className="text-base font-semibold text-zinc-950">{title}</h3>
      {text ? <p className="mt-2 text-sm text-zinc-500">{text}</p> : null}
    </div>
  );
}
