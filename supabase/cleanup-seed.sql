-- ===================================================================
-- ลบข้อมูลตัวอย่าง (seed) ออกจากฐานข้อมูล
--
-- ⚠️ คำสั่งนี้ลบข้อมูลถาวร — ตรวจให้แน่ใจก่อนรัน
-- ✓ ลบเฉพาะรายการที่ seed.sql สร้างไว้ (ระบุ id ตายตัว)
-- ✓ บัญชีจริงของคุณ ประกาศที่คุณลงเอง และรูปที่อัปโหลด จะไม่ถูกแตะต้อง
--
-- รันใน Supabase → SQL Editor
-- ===================================================================

begin;

-- 1) ข้อความในแชตตัวอย่าง (ลบก่อนเพราะอ้างถึง threads)
delete from public.messages
where thread_id in ('M-1', 'M-2', 'M-3', 'M-4');

-- 2) แชต / นัดชม ตัวอย่าง
delete from public.threads  where id in ('M-1', 'M-2', 'M-3', 'M-4');
delete from public.viewings where id in ('V-1', 'V-2', 'V-3');

-- 3) การเงินตัวอย่าง
delete from public.transactions where id in ('T-901', 'T-899', 'T-897', 'T-885');
delete from public.receipts     where id in ('RC-3320', 'RC-3311', 'RC-3290');
delete from public.reviews      where id in ('R-1', 'R-2', 'R-3');

-- 4) สัญญาตัวอย่าง
delete from public.contracts where id in ('C-2201', 'C-2188', 'C-2140');

-- 5) ข้อพิพาท / คำขอยืนยันตัวตน ตัวอย่าง
delete from public.disputes        where id in ('RB-2901', 'RB-2887', 'RB-2860');
delete from public.kyc_submissions where id in ('U-441', 'U-438', 'U-433');

-- 6) ประกาศตัวอย่าง 8 รายการ (cascade ลบ saved/viewings/bookings ที่ผูกอยู่)
delete from public.listings
where id in ('RB-3041', 'RB-3036', 'RB-3030', 'RB-3028',
             'RB-3020', 'RB-3015', 'RB-3010', 'RB-3005');

-- 7) โปรไฟล์ตัวอย่าง 4 คน (user_id = null คือบัญชีปลอม ไม่ใช่คนจริง)
delete from public.profiles
where id in ('00000000-0000-0000-0000-000000000101',
             '00000000-0000-0000-0000-000000000102',
             '00000000-0000-0000-0000-000000000103',
             '00000000-0000-0000-0000-000000000104')
  and user_id is null;   -- กันพลาด: ลบเฉพาะที่ไม่ได้ผูกบัญชีจริง

commit;

-- ===================================================================
-- ตรวจผลหลังลบ — ควรเหลือเฉพาะข้อมูลจริงของคุณ
-- ===================================================================
select 'listings' as ตาราง, count(*) as จำนวนที่เหลือ from public.listings
union all select 'profiles',     count(*) from public.profiles
union all select 'viewings',     count(*) from public.viewings
union all select 'threads',      count(*) from public.threads
union all select 'contracts',    count(*) from public.contracts
union all select 'transactions', count(*) from public.transactions
union all select 'receipts',     count(*) from public.receipts
union all select 'reviews',      count(*) from public.reviews
union all select 'disputes',     count(*) from public.disputes
union all select 'kyc_submissions', count(*) from public.kyc_submissions;
