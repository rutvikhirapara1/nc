-- VendorPay payment reminder system
-- Run this once in the Supabase SQL Editor on an existing project.

alter table public.bills
  add column if not exists reminder_7_sent_at timestamptz,
  add column if not exists reminder_3_sent_at timestamptz;

create index if not exists bills_reminder_7_idx
  on public.bills(status, due_date, reminder_7_sent_at);

create index if not exists bills_reminder_3_idx
  on public.bills(status, due_date, reminder_3_sent_at);

-- Scheduling:
-- Use Supabase Dashboard -> Cron -> Create job -> Supabase Edge Function.
-- Function: send-payment-reminders
-- Schedule: 30 4 * * * (04:30 UTC = 10:00 AM IST)
--
-- The Edge Function uses Supabase's secret-key authentication.
-- Do NOT add the service/secret key to this SQL file.
