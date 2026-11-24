# Cafe QR ordering

Next.js 14 + Tailwind + Supabase. Customers scan a table QR, order and pay; the kitchen and admin see everything live.

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`. For an existing project, run `supabase/migrations/20261124_auto_unpaid_bills.sql` to enable automatic unpaid bills and staff payment-status badges.
2. In Authentication > Users, create one admin and one kitchen user, then run the two `insert into staff` lines at the bottom of the schema with their emails.
3. Copy `.env.example` to `.env.local` and fill it in (Project Settings > API for the keys).
4. `npm install` then `npm run dev`.
5. Sign in at `/login`. Add categories, items, ingredients, recipes and add-ons in Admin, then print the QR codes from Admin > Tables & QR.

## Pages

| Route | Who | What |
| --- | --- | --- |
| `/t/5` | Customer | Menu, cart, live order status, waiter bell, bill, feedback |
| `/kitchen` | Kitchen, admin | Live orders with add-ons. Start, then Done (amounts pre-filled), then Served |
| `/admin` | Admin | Overview, orders, bills, menu, stock, expenses, reports, feedback, QR codes |

## Deploy

Push to GitHub and import in Vercel. Add the same variables from `.env.local`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## WhatsApp thank-you (n8n)

1. Import `n8n/thanks-workflow.json` into n8n and activate it.
2. Put your WhatsApp Cloud API phone number ID and token in the second node.
3. In Meta Business, create a message template named `thanks_for_visiting` with one variable, for example: "Hi {{1}}, thank you for visiting us. We hope to see you again soon!"
4. Set `N8N_WEBHOOK_URL` to the production webhook URL (`.../webhook/cafe-events`).

The message goes out when the admin marks a bill as paid. WhatsApp only allows a business to start a chat with an approved template, so plain text will not work.

## Notes

- The menu works offline after the first visit (service worker). Ordering, the bell, status and the bill need internet.
- Reports use Pakistan time (Asia/Karachi). Change it in `supabase/schema.sql` and `src/lib/util.ts` if needed.
- Menu photos are links (for example Supabase Storage public URLs).
