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

1. Run the complete `supabase/schema.sql` in the Supabase SQL editor. The app needs the tables created there, including `cafe_tables` and `table_sessions`; the schema seeds tables 1-10, but does not add menu categories or items.
2. To add the example categories, 20 menu items (including offers), and add-ons, run `supabase/seed_menu.sql`. It is repeatable and does not change stock, customers, or orders; update example prices in Admin to match your cafe.
3. In Supabase Authentication > URL Configuration, set the Site URL to your production app's `/set-password` route (for example, `https://your-cafe.vercel.app/set-password`). Allow the production app and local development URLs, for example `https://your-cafe.vercel.app/**` and `http://localhost:3000/**`.
4. Invite an admin and a kitchen user from Authentication > Users. Each person sets their own password through the invitation link. Assign each user a row in `staff` using the matching Auth user ID, for example:

   ```sql
   insert into staff (user_id, role)
   select id, 'admin' from auth.users where email = 'admin@your-cafe.com'
   on conflict (user_id) do update set role = excluded.role;

   insert into staff (user_id, role)
   select id, 'kitchen' from auth.users where email = 'kitchen@your-cafe.com'
   on conflict (user_id) do update set role = excluded.role;
   ```

5. Import the GitHub repository in Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project settings. Keep the service role key server-side only, then redeploy.
6. Sign in with the Supabase Auth accounts you created (the default `admin@example.com` and `chef@example.com` credentials are local-development-only). Add or edit menu categories and items from Admin.

If table availability fails or the menu is unavailable after deployment, check the Vercel function logs for the database error and confirm the schema and all three Vercel environment variables are configured for the active deployment.

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
