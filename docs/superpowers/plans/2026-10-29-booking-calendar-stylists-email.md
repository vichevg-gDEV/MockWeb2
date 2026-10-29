# Booking approval, calendar, editable stylists and confirmation email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner accepts or declines booking requests from a calendar, stylists are editable and shown in a booking-form dropdown, and accepting sends the customer a confirmation email.

**Architecture:** Stylists move into `store.catalog.stylists` and ride along the existing catalog API. A new dependency-free `server/mailer.mjs` speaks SMTP over `node:net`/`node:tls`; the booking PATCH route calls it when a booking becomes `confirmed`. The React admin gets a Team tab and a `BookingCalendar` component.

**Tech Stack:** Node 22 (built-ins only on the server, `node --test`), React 19 + TypeScript, Tailwind 4. No new packages.

**Spec:** `docs/superpowers/specs/2026-10-29-booking-calendar-stylists-email-design.md`

## Global Constraints

- No new npm dependencies (npm registry is unreachable in the build workspace; the server uses Node built-ins only).
- UI text and emails in Bulgarian; error messages follow the existing `bad(...)` / `HttpError` style.
- `any` ("First available stylist") is virtual: never stored, never editable.
- Stylists: max 30; name required ≤100; role and experience ≤150.
- Email: required on new bookings, ≤120 chars; old bookings without email remain valid.
- SMTP env vars: `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS, 465 TLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SALON_ADDRESS`, `SALON_PHONE`. The password is never logged or returned.
- Email result values: `sent`, `failed`, `disabled`, `no_address`. A failed email never undoes Accept.
- Decline (`cancelled`) sends no email; the email is sent only on a change to `confirmed`.
- Dates are salon-local `YYYY-MM-DD` strings; no timezone conversion.
- Calendar hides `cancelled` bookings; Monday-first weeks.

## Review Focus

- Email address containing CR/LF or `>` (header injection) must be rejected or neutralised, never reach SMTP headers.
- SMTP server that hangs, refuses auth or drops mid-DATA must produce `failed` within ~10 s and leave the booking confirmed.
- Existing `store.json` without `catalog.stylists` must load and show the seed stylists.
- Removing a stylist who has upcoming bookings must not break those bookings' display.
- Pressing Accept twice (or confirm → done → confirm) must not send duplicate emails on a plain refresh; only a status change to `confirmed` or the Resend button sends.

---

### Task 1: Stylists in the store, catalog API and admin endpoint

**Files:**
- Modify: `server/store.mjs`, `server/validate.mjs`, `server/app.mjs`
- Test: `server/server.test.mjs`

**Interfaces:**
- Produces: `parseStylists(raw: unknown): Stylist[]` in `validate.mjs` (assigns `st-<8 hex>` ids to items without one); `store.state.catalog.stylists`; `GET /api/catalog` includes `stylists`; `PUT /api/admin/stylists` body `{ items }` → `catalogResponse()`; import/reset handle `stylists`.

- [ ] **Step 1: Write failing tests** in `describe('stylists')`: catalog contains `silvia` and no `any`; admin PUT adds/renames/removes and `GET /api/catalog` reflects it; PUT rejects empty name, 31 items, non-array (400); unauthenticated PUT is 401; a legacy `store.json` with no `catalog.stylists` (written to a temp dir before `startApp(…, dir)`) loads with seed stylists; reset restores seed stylists; export/import round-trips `stylists`.
- [ ] **Step 2: Run** `node --test server/server.test.mjs` — new tests FAIL.
- [ ] **Step 3: Implement** `parseStylists` in `validate.mjs`; in `store.mjs` seed `catalog.stylists` (seed list minus `id === 'any'`) for new stores and backfill when missing on load; in `app.mjs` add the PUT route (limit 64 KB), include `stylists` in reset and import (`body.stylists !== undefined`).
- [ ] **Step 4: Run** the full suite — all PASS.
- [ ] **Step 5: Commit** `feat(server): editable stylists in the catalog`.

### Task 2: Booking carries an email; stylists validated from the store

**Files:**
- Modify: `server/validate.mjs` (`parseBookingInput`), `server/app.mjs` (`createBooking`, `bookingResponse`)
- Test: `server/server.test.mjs` (update the `booking()` helper to include `email: 'klient@example.com'`)

**Interfaces:**
- Consumes: Task 1 `store.state.catalog.stylists`.
- Produces: booking records and the inbox include `email`; `parseBookingInput(body, stylists, config)` now receives `[ANY_STYLIST, ...catalog.stylists]` and returns `email`.

- [ ] **Step 1: Write failing tests:** booking without email → 400; `'not-an-email'`, `'a@b'`, an address with `\r\n` or `>` or spaces, and one longer than 120 chars → 400; valid email is stored on the record and returned by the inbox; booking for a stylist added through Task 1's endpoint works; booking for a removed stylist → 400; the existing slot-clash test still passes.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the email check (single `@`, no whitespace/control characters/`<>,;"`, a dot in the domain, ≤120) in `parseBookingInput`; build the stylist list from the store in `createBooking`; store `email` on the record.
- [ ] **Step 4: Run** full suite — PASS.
- [ ] **Step 5: Commit** `feat(server): collect customer email on bookings`.

### Task 3: SMTP mailer

**Files:**
- Create: `server/mailer.mjs`
- Modify: `server/config.mjs`, `.env.example`
- Test: `server/mailer.test.mjs` (in-process fake SMTP server on `127.0.0.1:0`)

**Interfaces:**
- Produces: `createMailer(config, log): { enabled: boolean, send({ to, subject, text }): Promise<void> }`; `send` throws `Error` with a short message on any failure. `buildBookingEmail(booking, config): { subject: string, text: string }` (Bulgarian; date, time, service, stylist, `config.salonAddress`, `config.salonPhone`). Config gains `smtp: { host, port, user, pass, from, secure }`, `salonAddress`, `salonPhone`; `smtp.secure` is true for port 465.

- [ ] **Step 1: Write failing tests** against the fake server: plain AUTH PLAIN delivery (assert MAIL FROM, RCPT TO, decoded base64 UTF-8 body containing the Cyrillic service name, `Subject:` RFC 2047 encoded); STARTTLS path (fake server upgrades with a self-signed cert, mailer accepts it via `config.smtp.rejectUnauthorized = false`, used only in tests); a body line starting with `.` is dot-stuffed; `\r\n` in recipient or subject cannot add a header or RCPT; server replying `535` → rejects with a short message that does not contain the password; server that never answers → rejects within the 10 s timeout (use an injectable `timeoutMs` of 300 in the test); `enabled` is false when host or user or pass is missing.
- [ ] **Step 2: Run** `node --test server/mailer.test.mjs` — FAIL.
- [ ] **Step 3: Implement** `server/mailer.mjs` (EHLO → optional STARTTLS → AUTH PLAIN, falling back to LOGIN → MAIL FROM → RCPT TO → DATA → QUIT; line-based reply parser handling multi-line `250-` replies; strip CR/LF from every header value; app password spaces removed). Add config fields to `loadConfig` and document the variables in `.env.example`.
- [ ] **Step 4: Run** the mailer tests — PASS.
- [ ] **Step 5: Commit** `feat(server): dependency-free SMTP mailer`.

### Task 4: Accept sends the email; Resend

**Files:**
- Modify: `server/app.mjs` (booking PATCH route, new resend route, `createApp` accepts an injectable `mailer` for tests), `server/notify.mjs` unchanged
- Test: `server/server.test.mjs`

**Interfaces:**
- Consumes: Task 3 `createMailer`, `buildBookingEmail`; Task 2 booking `email`.
- Produces: `PATCH /api/admin/bookings/:id` → `{ booking, email: 'sent'|'failed'|'disabled'|'no_address'|null }` (`null` when the status did not change to `confirmed`); `POST /api/admin/bookings/:id/email` → same shape, 409 unless the booking is `confirmed`; booking fields `emailSentAt`, `emailError`; `GET /api/admin/inbox` also returns `emailEnabled: boolean`.

- [ ] **Step 1: Write failing tests** using a stub mailer: `new → confirmed` calls `send` once with the customer's address and returns `sent` and stores `emailSentAt`; `new → cancelled` never calls `send`; `confirmed → confirmed` again does not send; a throwing mailer returns `failed`, status is still `confirmed`, `emailError` is set and contains no secret; booking without email returns `no_address`; mailer disabled returns `disabled`; resend sends again and updates `emailSentAt`; resend on a non-confirmed booking is 409; the inbox exposes `emailEnabled`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** in `app.mjs`: change the status in the transaction, then (outside it) send and record the result with a second transaction; never let the send throw out of the route.
- [ ] **Step 4: Run** full suite — PASS.
- [ ] **Step 5: Commit** `feat(server): confirmation email on accept, with resend`.

### Task 5: Front-end types, API client and booking form

**Files:**
- Modify: `src/types.ts`, `src/api.ts`, `src/App.tsx`, `src/components/Booking.tsx`

**Interfaces:**
- Consumes: Tasks 1–4 endpoints.
- Produces: `Catalog.stylists: Stylist[]`; `BookingRecord.email?`, `emailSentAt?`, `emailError?`; `BookingFormState.email`; `type EmailResult`; `api.adminSaveStylists(items)`, `api.adminSetBookingStatus` returning `{ booking, email }`, `api.adminResendBookingEmail(id)`, `AdminInbox.emailEnabled`; `Booking` takes a `stylists: Stylist[]` prop.

- [ ] **Step 1: Implement** the type and client changes; in `App.tsx` keep `stylists` in state next to `products` (set in `applyCatalog`) and pass to `Booking`.
- [ ] **Step 2: In `Booking.tsx`** replace the stylist cards with a `<select name="stylist">` whose first option is `value="any"` "Първи свободен стилист" followed by `stylists`; add a required `type="email"` field named `email`; send `email` in the payload; show it on the success card.
- [ ] **Step 3: Verify** with the browser check in Task 8 (the front end cannot be unit-tested here; type-check with `/home/claude/.npm-global/bin/tsc --noEmit` if it can resolve types, otherwise rely on the esbuild build succeeding).
- [ ] **Step 4: Commit** `feat(web): stylist dropdown and email field on the booking form`.

### Task 6: Team tab

**Files:**
- Modify: `src/components/AdminPanel.tsx`, `src/App.tsx` (handler passed as prop)

**Interfaces:**
- Consumes: `api.adminSaveStylists`, `stylists` prop, `onCatalogChanged`.
- Produces: new tab `'team'` labelled "Екип".

- [ ] **Step 1: Implement** a Team tab with an editable list (name, role, experience), Add, Remove, and one Save button that calls `adminSaveStylists` and applies the returned catalog. Removing a stylist who has `new` or `confirmed` bookings dated today or later asks `confirm()` first, naming the count.
- [ ] **Step 2: Verify** in the browser check (Task 8): add, rename, remove; the booking form dropdown changes after Save.
- [ ] **Step 3: Commit** `feat(web): admin team tab for editing stylists`.

### Task 7: Calendar, Accept / Decline, email status, button fix

**Files:**
- Create: `src/components/BookingCalendar.tsx`
- Modify: `src/components/AdminPanel.tsx`, and every component using the undefined `gold-btn` class (`grep -rn "gold-btn " src`) to use the defined `gold-btn-gradient`

**Interfaces:**
- Produces: `BookingCalendar({ bookings, onAccept, onDecline, onStatus, onResend, emailEnabled })` where `onAccept(b)`, `onDecline(b)`, `onResend(b)` take a `BookingRecord`, and `onStatus(b, status)` handles Done / No-show / Cancel.

- [ ] **Step 1: Implement** the month grid (Monday first, previous / next / Today), chips by status (amber `new`, green `confirmed`, grey `done`), highlight days with pending requests, day panel sorted by time with tap-to-call, Accept (calls `adminSetBookingStatus(id,'confirmed')`) and Decline (confirm dialog, then `'cancelled'`), a same-stylist same-time warning for two `confirmed` bookings, `cancelled` hidden.
- [ ] **Step 2: In `AdminPanel`** add the List / Calendar toggle on the Bookings tab, show the email result after Accept (toast: sent / failed with reason / no address / emails switched off) and a persistent per-booking line with a Resend button when `emailError` is set.
- [ ] **Step 3: Replace `gold-btn`** with `gold-btn-gradient`; confirm the button text is readable in the screenshots.
- [ ] **Step 4: Commit** `feat(web): booking calendar with accept and decline`.

### Task 8: Docs, end-to-end browser check, push

**Files:**
- Modify: `README.md` (remove the old PIN `1234` / `vip2026` text, describe server, admin passcode, email setup), `.env.example`

- [ ] **Step 1: Build** the site with the scratchpad esbuild + Tailwind script, start the real server with a throwaway data folder and a fake SMTP listener, submit sample bookings (including one with a stylist from the Team tab), Accept one, Decline one, and capture screenshots of: booking form dropdown + email, Team tab, calendar month, day panel, accept result.
- [ ] **Step 2: Run** `node --test server/` — all PASS.
- [ ] **Step 3: Commit and push** the branch; send the screenshots.
