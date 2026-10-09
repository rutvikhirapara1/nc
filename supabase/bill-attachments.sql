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
