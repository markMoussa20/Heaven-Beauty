import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmDialog";
import { ErrorMessage } from "@/components/admin/ErrorMessage";
import { OrderNotificationRecipientForm } from "@/components/admin/forms/OrderNotificationRecipientForm";
import { OrderNotificationSettingsForm } from "@/components/admin/forms/OrderNotificationSettingsForm";
import { OrderNotificationTemplateForm } from "@/components/admin/forms/OrderNotificationTemplateForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteOrderNotificationRecipient } from "@/lib/admin/actions";
import { listRows } from "@/lib/admin/data";
import type {
  OrderNotificationLog,
  OrderNotificationRecipient,
  OrderNotificationSettings,
  OrderNotificationTemplate,
} from "@/types/database";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const [settingsResult, recipientsResult, templatesResult, logsResult] =
    await Promise.all([
      listRows("order_notification_settings", {
        filters: { key: "default" },
        order: "created_at",
      }),
      listRows("order_notification_recipients", {
        order: "sort_order",
        searchColumns: ["name", "email"],
      }),
      listRows("order_notification_templates", {
        order: "key",
        searchColumns: ["key", "subject", "body"],
      }),
      listRows("order_notification_logs", {
        ascending: false,
        order: "created_at",
        select: "*, orders(order_number)",
      }),
    ]);

  const settings = settingsResult.data[0] as
    | OrderNotificationSettings
    | undefined;
  const recipients = recipientsResult.data as OrderNotificationRecipient[];
  const templates = templatesResult.data as OrderNotificationTemplate[];
  const logs = logsResult.data as (OrderNotificationLog & {
    orders?: { order_number?: string | null } | null;
  })[];
  const error =
    settingsResult.error ??
    recipientsResult.error ??
    templatesResult.error ??
    logsResult.error;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description="Configure customer emails, internal order alerts, and CallMeBot messages sent after checkout."
        title="Notifications"
      />
      <ErrorMessage message={error} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Delivery settings</h2>
          <p className="text-sm text-zinc-500">
            Gmail requires an app password. CallMeBot can stay disabled until you add the API key.
          </p>
        </div>
        <OrderNotificationSettingsForm settings={settings} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Internal recipients</h2>
          <p className="text-sm text-zinc-500">
            These people receive the Shopify-style internal order email.
          </p>
        </div>
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer font-medium">
            Add internal recipient
          </summary>
          <div className="mt-4">
            <OrderNotificationRecipientForm />
          </div>
        </details>
        <AdminTable
          columns={[
            { key: "name", header: "Name", render: (row) => row.name ?? "-" },
            { key: "email", header: "Email", render: (row) => row.email },
            { key: "sort", header: "Sort", render: (row) => row.sort_order ?? "-" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.is_active ? "green" : "neutral"}>
                  {row.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              ),
            },
            {
              key: "delete",
              header: "Delete",
              render: (row) => (
                <form action={deleteOrderNotificationRecipient.bind(null, row.id)}>
                  <ConfirmSubmitButton
                    className="text-sm text-red-600 underline"
                    message="Delete this notification recipient?"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              ),
            },
          ]}
          rows={recipients}
        />
        <div className="grid gap-4">
          {recipients.map((recipient) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={recipient.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {recipient.email}
              </summary>
              <div className="mt-4">
                <OrderNotificationRecipientForm recipient={recipient} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Templates</h2>
          <p className="text-sm text-zinc-500">
            Customer confirmation is softer; internal alert follows the attached Shopify email structure.
          </p>
        </div>
        <div className="grid gap-4">
          {templates.map((template) => (
            <details
              className="rounded-lg border border-zinc-200 bg-white p-4"
              key={template.id}
            >
              <summary className="cursor-pointer font-medium">
                Edit {template.key}
              </summary>
              <div className="mt-4">
                <OrderNotificationTemplateForm template={template} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Recent logs</h2>
          <p className="text-sm text-zinc-500">
            Failed email/SMS attempts are listed here for troubleshooting.
          </p>
        </div>
        <AdminTable
          columns={[
            {
              key: "created",
              header: "Created",
              render: (row) =>
                row.created_at ? new Date(row.created_at).toLocaleString() : "-",
            },
            { key: "order", header: "Order", render: (row) => row.orders?.order_number ?? row.order_id ?? "-" },
            { key: "channel", header: "Channel", render: (row) => row.channel },
            { key: "recipient", header: "Recipient", render: (row) => row.recipient ?? "-" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.status === "sent" ? "green" : "neutral"}>
                  {row.status}
                </StatusBadge>
              ),
            },
            { key: "message", header: "Message", render: (row) => row.message ?? "-" },
          ]}
          rows={logs}
        />
      </section>
    </div>
  );
}
