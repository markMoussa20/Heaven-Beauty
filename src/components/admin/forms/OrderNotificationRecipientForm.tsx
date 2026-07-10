import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveOrderNotificationRecipient } from "@/lib/admin/actions";
import type { OrderNotificationRecipient } from "@/types/database";

export function OrderNotificationRecipientForm({
  recipient,
}: {
  recipient?: Partial<OrderNotificationRecipient>;
}) {
  const action = saveOrderNotificationRecipient.bind(null, recipient?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-4"
    >
      <AdminFormField label="Name">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={recipient?.name ?? ""}
          name="name"
        />
      </AdminFormField>
      <AdminFormField label="Email">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={recipient?.email ?? ""}
          name="email"
          required
          type="email"
        />
      </AdminFormField>
      <AdminFormField label="Sort order">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={recipient?.sort_order ?? 10}
          name="sort_order"
          type="number"
        />
      </AdminFormField>
      <div className="grid gap-3">
        <InlineCheckbox
          defaultChecked={recipient?.is_active ?? true}
          label="Active"
          name="is_active"
        />
        <InlineCheckbox
          defaultChecked={recipient?.receive_order_email ?? true}
          label="Order emails"
          name="receive_order_email"
        />
      </div>
      <div className="md:col-span-4">
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save recipient
        </SubmitButton>
      </div>
    </form>
  );
}
