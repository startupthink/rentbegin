-- ===================================================================
-- อัปเกรดตาราง listings — รองรับขาย/เช่า, ห้องต่างๆ, และการแก้ไข
-- รันใน Supabase → SQL Editor (รันซ้ำได้ ปลอดภัย)
-- ===================================================================

-- ---------- 1) ประเภทประกาศ: เช่า / ขาย / ทั้งสอง ----------
alter table public.listings add column if not exists listing_type text not null default 'rent';
alter table public.listings drop constraint if exists listings_listing_type_check;
alter table public.listings add constraint listings_listing_type_check
  check (listing_type in ('rent', 'sale', 'both'));

-- ราคาขาย (ใช้เมื่อ listing_type = 'sale' หรือ 'both')
alter table public.listings add column if not exists sale_price bigint;

-- ---------- 2) ห้อง/พื้นที่ใช้สอยภายใน ----------
-- เก็บเป็น array ของ key เช่น {living,kitchen,balcony}
alter table public.listings add column if not exists rooms text[] default '{}';

-- ---------- 3) ข้อมูลเพิ่มเติมที่ผู้เช่ามักถาม ----------
alter table public.listings add column if not exists floor_no      text;   -- ชั้นที่
alter table public.listings add column if not exists total_floors  text;   -- อาคารสูงกี่ชั้น
alter table public.listings add column if not exists direction     text;   -- ทิศ
alter table public.listings add column if not exists contact_phone text;
alter table public.listings add column if not exists contact_line  text;
alter table public.listings add column if not exists updated_at    timestamptz default now();

-- ---------- 4) index ช่วยค้นหา ----------
create index if not exists listings_type_idx       on public.listings(listing_type);
create index if not exists listings_price_idx      on public.listings(price);
create index if not exists listings_bedrooms_idx   on public.listings(bedrooms);

-- ---------- 5) trigger อัปเดตเวลาแก้ไข ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_touch on public.listings;
create trigger listings_touch
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- ---------- 6) ตรวจว่า policy แก้ไข/ลบ มีครบ ----------
-- (schema.sql สร้างไว้แล้ว แต่รันซ้ำเพื่อความแน่ใจ)
drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings for update
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());

drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings for delete
  using (owner_id = public.current_profile_id() or public.is_admin());

-- ---------- 7) ตรวจผล ----------
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'listings'
  and column_name in ('listing_type','sale_price','rooms','floor_no','contact_phone','updated_at')
order by column_name;
