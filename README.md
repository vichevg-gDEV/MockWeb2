# VIP Beauty House — Luxury Hair Extensions & Salon

Website, online boutique and booking system for **VIP Beauty House** (Varna, Bulgaria): premium Slavic hair extensions, AirTouch & balayage, hair care products.

The site is a React 19 + Vite + Tailwind 4 front end served by a small Node.js server (`server/`, no extra packages). The server is the single source of truth for products, stock, orders, bookings and stylists, so every visitor sees the same data and the owner receives every order and booking.

> **GitHub Pages is not enough any more.** Pages only hosts static files, but the shop, bookings and admin login need the Node server. Run the server on your own machine (see below).

## Features

- **Shop:** cart, stock checked on the server (two customers can never buy the last item), cash on delivery with Econt / Speedy, free delivery over a threshold.
- **Booking:** customer picks service, stylist (dropdown), date, time and leaves name, phone and **email**.
- **Owner's admin panel** (`/#admin` or `Ctrl/Cmd + Shift + A`):
  - **Orders** and **Bookings** inbox with status changes; new items show a counter and can also be pushed to your phone (Telegram, ntfy, Discord or Slack).
  - **Bookings calendar:** month view; pending requests are amber, accepted ones green. Press **Приеми** (accept) or **Откажи** (decline). Accepting sends the customer a confirmation email; declining frees the slot and sends nothing.
  - **Stock & shop:** add products with photos, quick stock +/−, prices.
  - **Services & prices**, and **Team** (add, edit, remove stylists; the booking form follows immediately).
  - **Settings:** change the passcode, export / import a JSON backup.

## Requirements

Node.js 22 or newer.

## Install and run

```bash
npm install
npm run build        # builds the website into dist/
cp .env.example .env # then edit .env (everything is optional)
npm start            # serves the site and the API on http://127.0.0.1:8080
```

On the very first start the server creates the admin passcode: from `ADMIN_PASSWORD` in `.env`, or a random one printed once in the console. It is stored hashed and never appears in the website's code. Change it later in the admin panel (Settings) or with `npm run set-pin`.

For development with live reload run `npm run dev` (front end only; start `npm start` as well and proxy `/api` to it if you need the API).

## Settings (`.env`)

The full list with comments is in `.env.example`. The file stays on the server and is never committed.

| Setting | Purpose |
|---|---|
| `PORT`, `HOST` | where the server listens (keep `HOST=127.0.0.1` behind a reverse proxy) |
| `TRUST_PROXY=1` | set when behind nginx / Caddy so limits use the visitor's real IP |
| `ADMIN_PASSWORD` | first-start admin passcode (min. 8 characters) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `NOTIFY_WEBHOOK_URL` | phone alerts for new orders and bookings |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | confirmation emails (see next section) |
| `SALON_ADDRESS`, `SALON_PHONE` | printed at the bottom of the confirmation email |
| `SHIPPING_FEE`, `FREE_SHIPPING_OVER` | delivery pricing (lv.) |
| `BOOKING_OPEN`, `BOOKING_CLOSE` | bookings are only accepted between these times |
| `DATA_DIR`, `DIST_DIR` | where data is stored / which built site is served |

Restart the server after editing `.env`.

## Confirmation emails (Gmail example)

1. In the Gmail account the emails should come from, turn on **2-Step Verification** (myaccount.google.com → Security).
2. Open myaccount.google.com/apppasswords, create an app password and copy the 16 characters (spaces are ignored).
3. In `.env` set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=yourname@gmail.com
   SMTP_PASS=your16characterapppassword
   SMTP_FROM=yourname@gmail.com
   ```
4. Restart. The start-up message says `confirmation emails: on`.
5. Make a test booking with your own address and press Accept. If sending fails, the booking stays accepted, the panel shows the reason and a **Изпрати отново** (resend) button.

Port 587 uses STARTTLS and 465 uses TLS from the start; the password is never sent unencrypted. Some internet providers block outgoing mail ports, so try 465 if 587 fails. Without SMTP settings the panel says emails are switched off.

## Running it at home

- Put a reverse proxy (Caddy or nginx) in front for HTTPS, and set `TRUST_PROXY=1`.
- Back up the `data/` folder (it holds `store.json`, uploaded photos and the hashed passcode). The admin panel can also export a JSON backup of the catalog.
- Keep the machine and Node.js updated, since it is reachable from the internet.

## Tests

```bash
npm test             # server tests, including a fake mail server
```

## Project layout

- `src/` — React front end (`components/AdminPanel.tsx`, `components/BookingCalendar.tsx`, `api.ts`, …)
- `server/` — Node server: `app.mjs` (routes), `store.mjs` (JSON database), `auth.mjs`, `mailer.mjs` (SMTP), `notify.mjs` (phone alerts), `*.test.mjs`
- `public/` — static files copied into the build

© 2026 VIP Beauty House. All rights reserved.
