export function AdminSelect({
  name,
  defaultValue,
  options,
  placeholder = "Select...",
  required,
}: {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <select
      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
      defaultValue={defaultValue ?? ""}
      name={name}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
