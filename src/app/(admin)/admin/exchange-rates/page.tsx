import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { ExchangeRateForm } from "@/components/admin/forms/ExchangeRateForm";
import { deleteRow } from "@/lib/admin/actions";
import { listRows } from "@/lib/admin/data";
import type { ExchangeRate } from "@/types/database";

export const metadata = { title: "Exchange Rates" };

export default async function AdminExchangeRatesPage() {
  const { data, error } = await listRows("exchange_rates", {
    order: "rate_date",
    ascending: false,
  });
  const rates = data as ExchangeRate[];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Exchange Rates" description="Admin helper rates only. They do not calculate public checkout totals." />
      <ExchangeRateForm />
      <ErrorMessage message={error} />
      <AdminTable
        columns={[
          { key: "base", header: "Base", render: (row) => row.base_currency_code ?? row.base_currency ?? "-" },
          { key: "target", header: "Target", render: (row) => row.target_currency_code ?? row.target_currency ?? "-" },
          { key: "rate", header: "Rate", render: (row) => row.rate },
          { key: "source", header: "Source", render: (row) => row.source ?? "-" },
          { key: "date", header: "Date", render: (row) => row.rate_date ?? "-" },
          {
            key: "delete",
            header: "Delete",
            render: (row) => (
              <form action={deleteRow.bind(null, "exchange_rates", row.id, "/admin/exchange-rates")}>
                <ConfirmSubmitButton className="text-sm text-red-600 underline" message="Delete this exchange rate?">
                  Delete
                </ConfirmSubmitButton>
              </form>
            ),
          },
        ]}
        rows={rates}
      />
      <div className="grid gap-4">
        {rates.map((rate) => (
          <details className="rounded-lg border border-zinc-200 bg-white p-4" key={rate.id}>
            <summary className="cursor-pointer font-medium">
              Edit {rate.base_currency_code ?? rate.base_currency} to{" "}
              {rate.target_currency_code ?? rate.target_currency}
            </summary>
            <div className="mt-4">
              <ExchangeRateForm rate={rate} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
