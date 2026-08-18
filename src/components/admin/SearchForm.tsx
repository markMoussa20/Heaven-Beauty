import { SubmitButton } from "@/components/ui/SubmitButton";

export function SearchForm({
  defaultQuery = "",
  placeholder = "Search...",
  filters,
}: {
  defaultQuery?: string;
  placeholder?: string;
  filters?: React.ReactNode;
}) {
  return (
    <form className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row">
      <input
        className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm"
        defaultValue={defaultQuery}
        name="q"
        placeholder={placeholder}
      />
      {filters}
      <SubmitButton
        className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
        pendingLabel="Searching..."
      >
        Search
      </SubmitButton>
    </form>
  );
}
