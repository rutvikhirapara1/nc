create extension if not exists "uuid-ossp";
create table if not exists public.vendors(id uuid primary key default uuid_generate_v4(),user_id uuid references auth.users(id) on delete cascade not null,name text not null,gst_number text,contact_person text,phone text,email text,default_credit_days integer not null default 30,active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.bills(id uuid primary key default uuid_generate_v4(),user_id uuid references auth.users(id) on delete cascade not null,vendor_id uuid references public.vendors(id) on delete cascade not null,po_number text,bill_number text not null,bill_date date not null,credit_period integer not null default 30,due_date date not null,amount numeric(12,2) not null check(amount>=0),status text not null default 'pending' check(status in ('pending','paid')),paid_date date,remarks text,created_at timestamptz not null default now());
alter table public.vendors enable row level security; alter table public.bills enable row level security;
drop policy if exists vendors_all on public.vendors; create policy vendors_all on public.vendors for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists bills_all on public.bills; create policy bills_all on public.bills for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create index if not exists bills_due_date_idx on public.bills(user_id,due_date); create index if not exists bills_vendor_idx on public.bills(vendor_id); create index if not exists bills_status_idx on public.bills(user_id,status);

alter table public.bills
  add column if not exists reminder_7_sent_at timestamptz,
  add column if not exists reminder_3_sent_at timestamptz;
create index if not exists bills_reminder_7_idx on public.bills(status,due_date,reminder_7_sent_at);
create index if not exists bills_reminder_3_idx on public.bills(status,due_date,reminder_3_sent_at);