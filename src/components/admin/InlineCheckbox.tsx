export function InlineCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {label}
    </label>
  );
}
