import { AdminFormField } from "@/components/admin/AdminFormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveExchangeRate } from "@/lib/admin/actions";
import type { ExchangeRate } from "@/types/database";

export function ExchangeRateForm({ rate }: { rate?: Partial<ExchangeRate> }) {
  const action = saveExchangeRate.bind(null, rate?.id ?? null);

  return (
    <form action={action} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3">
      <AdminFormField label="Base currency">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={rate?.base_currency_code ?? rate?.base_currency ?? ""} name="base_currency_code" required />
      </AdminFormField>
      <AdminFormField label="Target currency">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={rate?.target_currency_code ?? rate?.target_currency ?? ""} name="target_currency_code" required />
      </AdminFormField>
      <AdminFormField label="Rate">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={String(rate?.rate ?? "")} min="0" name="rate" required step="0.000001" type="number" />
      </AdminFormField>
      <AdminFormField label="Source">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={rate?.source ?? ""} name="source" />
      </AdminFormField>
      <AdminFormField label="Rate date">
        <input className="h-10 rounded-md border border-zinc-300 px-3" defaultValue={rate?.rate_date ?? ""} name="rate_date" type="date" />
      </AdminFormField>
      <div className="flex items-end">
        <SubmitButton className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
          Save rate
        </SubmitButton>
      </div>
    </form>
  );
}
