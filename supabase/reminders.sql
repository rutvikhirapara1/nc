-- VendorPay payment reminder system
-- Run this once in the Supabase SQL Editor on an existing project.

alter table public.bills
  add column if not exists reminder_7_sent_at timestamptz,
  add column if not exists reminder_3_sent_at timestamptz;

create index if not exists bills_reminder_7_idx
  on public.bills(status, due_date, reminder_7_sent_at);

create index if not exists bills_reminder_3_idx
  on public.bills(status, due_date, reminder_3_sent_at);

-- Supabase Cron / pg_net setup
-- 1. Enable extensions if they are not already enabled:
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

-- 2. Store the shared secret used by the scheduled function.
-- Replace YOUR_CRON_SECRET with a long random value.
-- Example: select vault.create_secret('YOUR_CRON_SECRET', 'payment_reminder_cron_secret');

-- 3. After the Edge Function is deployed, schedule it once per day at
-- 10:00 AM IST (04:30 UTC):
--
-- select cron.schedule(
--   'send-payment-reminders-daily',
--   '30 4 * * *',
--   $$
--   select net.http_post(
--     url := 'https://ihcmeocjudyxqukahyqy.supabase.co/functions/v1/send-payment-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret',
--       (select decrypted_secret
--        from vault.decrypted_secrets
--        where name = 'payment_reminder_cron_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To remove the schedule later:
-- select cron.unschedule('send-payment-reminders-daily');
