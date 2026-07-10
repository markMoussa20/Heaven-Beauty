import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveOrderNotificationTemplate } from "@/lib/admin/actions";
import type { OrderNotificationTemplate } from "@/types/database";

const placeholders = [
  "{orderNumber}",
  "{customerName}",
  "{customerPhone}",
  "{customerEmail}",
  "{itemsCompactText}",
  "{itemsText}",
  "{subtotal}",
  "{shippingFee}",
  "{total}",
  "{addressLine}",
  "{shippingAreaName}",
  "{paymentMethod}",
  "{notes}",
];

export function OrderNotificationTemplateForm({
  template,
}: {
  template?: Partial<OrderNotificationTemplate>;
}) {
  const action = saveOrderNotificationTemplate.bind(null, template?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <div className="grid gap-4 md:grid-cols-[0.4fr_1fr_auto]">
        <AdminFormField label="Template key">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={template?.key ?? ""}
            name="key"
            placeholder="customer_order_confirmation"
            required
          />
        </AdminFormField>
        <AdminFormField label="Subject">
          <input
            className="h-10 rounded-md border border-zinc-300 px-3"
            defaultValue={template?.subject ?? ""}
            name="subject"
          />
        </AdminFormField>
        <div className="flex items-end">
          <InlineCheckbox
            defaultChecked={template?.is_active ?? true}
            label="Active"
            name="is_active"
          />
        </div>
      </div>
      <AdminFormField
        hint={`Available placeholders: ${placeholders.join(" ")}`}
        label="Email/SMS body"
      >
        <textarea
          className="min-h-72 rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          defaultValue={template?.body ?? ""}
          name="body"
        />
      </AdminFormField>
      <div>
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save template
        </SubmitButton>
      </div>
    </form>
  );
}
