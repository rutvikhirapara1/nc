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

alter table public.bills
  add column if not exists attachment_path text;

insert into storage.buckets (id, name, public)
values ('bill-attachments', 'bill-attachments', false)
on conflict (id) do nothing;

 drop policy if exists "bill_attachments_select" on storage.objects;
create policy "bill_attachments_select"
on storage.objects for select to authenticated
using (bucket_id = 'bill-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "bill_attachments_insert" on storage.objects;
create policy "bill_attachments_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'bill-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "bill_attachments_update" on storage.objects;
create policy "bill_attachments_update"
on storage.objects for update to authenticated
using (bucket_id = 'bill-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'bill-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "bill_attachments_delete" on storage.objects;
create policy "bill_attachments_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'bill-attachments' and (storage.foldername(name))[1] = auth.uid()::text);


-- Multiple bill attachments
-- Run once for existing VendorPay databases.

create table if not exists public.bill_attachments(
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid references public.bills(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique(bill_id,file_path)
);

create index if not exists bill_attachments_bill_idx on public.bill_attachments(bill_id);
create index if not exists bill_attachments_user_idx on public.bill_attachments(user_id);

alter table public.bill_attachments enable row level security;

drop policy if exists "bill_attachments_rows_select" on public.bill_attachments;
create policy "bill_attachments_rows_select"
on public.bill_attachments for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "bill_attachments_rows_insert" on public.bill_attachments;
create policy "bill_attachments_rows_insert"
on public.bill_attachments for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "bill_attachments_rows_update" on public.bill_attachments;
create policy "bill_attachments_rows_update"
on public.bill_attachments for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "bill_attachments_rows_delete" on public.bill_attachments;
create policy "bill_attachments_rows_delete"
on public.bill_attachments for delete to authenticated
using (auth.uid() = user_id);

-- Migrate any existing single attachment_path records into the new table.
insert into public.bill_attachments(bill_id,user_id,file_name,file_path)
select
  id,
  user_id,
  coalesce(nullif(split_part(attachment_path,'/',array_length(string_to_array(attachment_path,'/'),1)),''),'Bill attachment'),
  attachment_path
from public.bills
where attachment_path is not null
on conflict (bill_id,file_path) do nothing;
