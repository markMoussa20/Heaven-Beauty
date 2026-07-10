import { AdminFormField } from "@/components/admin/AdminFormField";
import { InlineCheckbox } from "@/components/admin/InlineCheckbox";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveOrderNotificationSettings } from "@/lib/admin/actions";
import type { OrderNotificationSettings } from "@/types/database";

export function OrderNotificationSettingsForm({
  settings,
}: {
  settings?: Partial<OrderNotificationSettings>;
}) {
  const action = saveOrderNotificationSettings.bind(null, settings?.id ?? null);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-2"
    >
      <AdminFormField label="Sender name">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.sender_name ?? "Heaven Beauty"}
          name="sender_name"
          required
        />
      </AdminFormField>
      <AdminFormField label="Sender email">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.sender_email ?? ""}
          name="sender_email"
          placeholder="service@myheavenbeauty.com"
          type="email"
        />
      </AdminFormField>
      <AdminFormField label="Reply-to email">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.reply_to_email ?? ""}
          name="reply_to_email"
          type="email"
        />
      </AdminFormField>
      <AdminFormField
        hint="For Gmail SMTP this is usually the same Gmail mailbox as the sender."
        label="Gmail username"
      >
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.gmail_user ?? ""}
          name="gmail_user"
          type="email"
        />
      </AdminFormField>
      <AdminFormField
        hint="Use a Gmail app password, not the normal Gmail login password."
        label="Gmail app password"
      >
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.gmail_app_password ?? ""}
          name="gmail_app_password"
          type="password"
        />
      </AdminFormField>
      <AdminFormField label="SMTP host">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.smtp_host ?? "smtp.gmail.com"}
          name="smtp_host"
        />
      </AdminFormField>
      <AdminFormField label="SMTP port">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.smtp_port ?? 465}
          name="smtp_port"
          type="number"
        />
      </AdminFormField>
      <AdminFormField
        hint="Template placeholders: {phone}, {apiKey}, {message}."
        label="CallMeBot endpoint template"
      >
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={
            settings?.callmebot_endpoint_template ??
            "https://api.callmebot.com/whatsapp.php?phone={phone}&text={message}&apikey={apiKey}"
          }
          name="callmebot_endpoint_template"
        />
      </AdminFormField>
      <AdminFormField
        hint="Use the phone shown in the CallMeBot activation message, digits only, for example 96170427107."
        label="CallMeBot phone"
      >
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.callmebot_phone ?? ""}
          name="callmebot_phone"
          placeholder="96170427107"
        />
      </AdminFormField>
      <AdminFormField label="CallMeBot API key">
        <input
          className="h-10 rounded-md border border-zinc-300 px-3"
          defaultValue={settings?.callmebot_api_key ?? ""}
          name="callmebot_api_key"
          type="password"
        />
      </AdminFormField>
      <div className="grid gap-3 md:col-span-2 md:grid-cols-4">
        <InlineCheckbox
          defaultChecked={settings?.is_active ?? true}
          label="Notifications active"
          name="is_active"
        />
        <InlineCheckbox
          defaultChecked={settings?.customer_email_enabled ?? true}
          label="Customer email"
          name="customer_email_enabled"
        />
        <InlineCheckbox
          defaultChecked={settings?.internal_email_enabled ?? true}
          label="Internal email"
          name="internal_email_enabled"
        />
        <InlineCheckbox
          defaultChecked={settings?.sms_enabled ?? false}
          label="CallMeBot SMS"
          name="sms_enabled"
        />
        <InlineCheckbox
          defaultChecked={settings?.smtp_secure ?? true}
          label="Secure SMTP"
          name="smtp_secure"
        />
      </div>
      <div className="md:col-span-2">
        <SubmitButton
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Save notification settings
        </SubmitButton>
      </div>
    </form>
  );
}
