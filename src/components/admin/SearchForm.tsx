export function SearchForm({
  placeholder = "Search...",
  filters,
}: {
  placeholder?: string;
  filters?: React.ReactNode;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row">
      <input
        className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
        defaultValue=""
        name="q"
        placeholder={placeholder}
      />
      {filters}
      <button
        className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
