-- Run once in the Supabase SQL Editor for an existing VendorPay database.

alter table public.bills
  add column if not exists attachment_path text;

insert into storage.buckets (id, name, public)
values ('bill-attachments', 'bill-attachments', false)
on conflict (id) do nothing;

drop policy if exists "bill_attachments_select" on storage.objects;
create policy "bill_attachments_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'bill-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "bill_attachments_insert" on storage.objects;
create policy "bill_attachments_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bill-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "bill_attachments_update" on storage.objects;
create policy "bill_attachments_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'bill-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'bill-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "bill_attachments_delete" on storage.objects;
create policy "bill_attachments_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'bill-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
