/**
 * Tells the owner when an order or booking arrives (Telegram and/or a webhook such as ntfy,
 * Discord or Slack). Failures are logged and never block the customer's request.
 * Without any channel configured the owner still sees everything in the admin panel.
 */
export function createNotifier(config, log) {
  const channels = [];

  if (config.telegramToken && config.telegramChatId) {
    channels.push({
      name: 'telegram',
      send: (text) =>
        post(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, 'application/json', {
          chat_id: config.telegramChatId,
          text,
          disable_web_page_preview: true
        })
    });
  }

  if (config.webhookUrl) {
    const url = config.webhookUrl;
    channels.push({
      name: 'webhook',
      send: (text) => {
        if (url.includes('discord.com/api/webhooks')) return post(url, 'application/json', { content: text.slice(0, 1900) });
        if (url.includes('hooks.slack.com')) return post(url, 'application/json', { text });
        return post(url, 'text/plain; charset=utf-8', text); // ntfy.sh and similar
      }
    });
  }

  async function post(url, contentType, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  return {
    channels: channels.map((c) => c.name),
    async notify(text) {
      await Promise.all(
        channels.map(async (channel) => {
          try {
            await channel.send(text);
          } catch (err) {
            log(`Notification via ${channel.name} failed: ${err.message}`);
          }
        })
      );
    }
  };
}

const COURIERS = { econt: 'Еконт', speedy: 'Спиди' };

export function formatOrder(order) {
  const lines = order.items.map((i) => `• ${i.quantity} × ${i.title} (${i.price} лв.)`);
  return [
    `🛍 Нова поръчка ${order.id}`,
    '',
    `Клиент: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    order.customer.email ? `Имейл: ${order.customer.email}` : null,
    `Доставка: ${COURIERS[order.courier] || order.courier}, ${order.customer.city}, ${order.customer.address}`,
    'Плащане: наложен платеж',
    '',
    ...lines,
    '',
    `Междинна сума: ${order.subtotal} лв.`,
    `Доставка: ${order.shipping} лв.`,
    `ОБЩО: ${order.total} лв.`,
    order.customer.notes ? `\nБележка: ${order.customer.notes}` : null
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export function formatBooking(booking) {
  return [
    `📅 Нова резервация ${booking.id}`,
    '',
    `Услуга: ${booking.service}`,
    `Стилист: ${booking.stylistName}`,
    `Кога: ${booking.date} в ${booking.time}`,
    `Клиент: ${booking.name}`,
    `Телефон: ${booking.phone}`,
    booking.email ? `Имейл: ${booking.email}` : null,
    booking.notes ? `\nБележка: ${booking.notes}` : null
  ]
    .filter((l) => l !== null)
    .join('\n');
}
