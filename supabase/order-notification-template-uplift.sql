update public.order_notification_templates
set
  subject = 'Your Heaven Beauty order {orderNumber} is confirmed',
  body = 'Hi {customerName},

Thank you for shopping with Heaven Beauty. Your order {orderNumber} is confirmed, and our team is preparing it with care.

Order summary:
{itemsText}

Subtotal: {subtotal}
Delivery: {shippingFee}
Total: {total}

Delivery address:
{addressLine}
{shippingAreaName}

Payment method: {paymentMethod}

We will contact you if we need any extra delivery details.

With love,
Heaven Beauty',
  is_active = true,
  updated_at = now()
where key = 'customer_order_confirmation';

update public.order_notification_templates
set
  subject = '[Heaven Beauty] New order {orderNumber} - {customerName}',
  body = 'New order {orderNumber}

Customer:
{customerName}
{customerPhone}
{customerEmail}

Order summary:
{itemsText}

Subtotal: {subtotal}
Shipping: {shippingFee}
Total: {total}

Payment processing method:
{paymentMethod}

Delivery method:
{shippingAreaName}

Delivery address:
{customerName}
{addressLine}
{shippingAreaName}
{customerPhone}
{customerEmail}

Notes:
{notes}',
  is_active = true,
  updated_at = now()
where key = 'internal_order_alert';

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
