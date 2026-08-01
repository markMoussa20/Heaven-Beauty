alter table public.order_notification_settings
  add column if not exists smtp_username text,
  add column if not exists smtp_password text;

update public.order_notification_settings
set
  smtp_username = coalesce(smtp_username, gmail_user),
  smtp_password = coalesce(smtp_password, gmail_app_password)
where
  smtp_username is null
  or smtp_password is null;

comment on column public.order_notification_settings.smtp_username is
  'Username used to authenticate with the configured SMTP provider.';

comment on column public.order_notification_settings.smtp_password is
  'App password or password used to authenticate with the configured SMTP provider.';
