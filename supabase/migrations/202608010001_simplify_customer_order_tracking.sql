update public.order_notification_templates
set
  subject = 'Delivery update for order {orderNumber}',
  body = E'Hi {customerName},\n\nThere is a delivery update for your Heaven Beauty order {orderNumber}.\n\nView your order details and latest delivery status:\n{orderTrackingUrl}\n\nWith love,\nHeaven Beauty'
where key = 'customer_delivery_tracking';
