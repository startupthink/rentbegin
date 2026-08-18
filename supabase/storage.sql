-- ===================================================================
-- RENTBEGIN — STORAGE (อัปโหลดรูปประกาศจริง)
-- รันใน Supabase → SQL Editor (รันครั้งเดียว)
-- ===================================================================

-- bucket สาธารณะสำหรับรูปประกาศ (อ่านได้ทุกคน เขียนได้เฉพาะเจ้าของ)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos', 'listing-photos', true,
  5242880,  -- 5 MB ต่อไฟล์
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- ---------- RLS ของไฟล์ใน bucket ----------
-- โครงสร้าง path: <user_id>/<listing_id>/<filename>
-- โฟลเดอร์ชั้นแรกเป็น user_id → ผู้ใช้แก้ได้เฉพาะของตัวเอง

drop policy if exists "listing photos public read"   on storage.objects;
drop policy if exists "listing photos owner insert"  on storage.objects;
drop policy if exists "listing photos owner update"  on storage.objects;
drop policy if exists "listing photos owner delete"  on storage.objects;

create policy "listing photos public read"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "listing photos owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing photos owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing photos owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
