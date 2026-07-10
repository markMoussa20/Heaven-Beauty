update public.order_notification_templates
set
  subject = 'New Heaven Beauty order {orderNumber}',
  body = 'New order {orderNumber}
{customerName} - {customerPhone}
{itemsCompactText}
Delivery: {shippingAreaName}
Total: {total}',
  is_active = true,
  updated_at = now()
where key = 'sms_order_alert';
