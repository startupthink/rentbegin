-- ===================================================================
-- แยกหมวด: ห้อง / เครื่องใช้ไฟฟ้า / สิ่งอำนวยความสะดวก
-- รันใน Supabase → SQL Editor (รันซ้ำได้ ปลอดภัย)
-- ===================================================================

-- 1) คอลัมน์ใหม่สำหรับเครื่องใช้ไฟฟ้า/เฟอร์นิเจอร์
alter table public.listings add column if not exists appliances text[] default '{}';

-- 2) ย้ายข้อมูลเดิม — แอร์ / เฟอร์ครบ / เครื่องซักผ้า
--    เคยอยู่ในหมวด amenities ต้องย้ายมาที่ appliances
update public.listings
set appliances = (
      select coalesce(array_agg(distinct x), '{}')
      from unnest(coalesce(appliances, '{}') || coalesce(amenities, '{}')) as x
      where x in ('aircon','furnished','washer','waterheat','bathtub')
    )
where amenities && array['aircon','furnished','washer','waterheat','bathtub'];

-- 3) เอาของที่ย้ายแล้วออกจาก amenities
update public.listings
set amenities = (
      select coalesce(array_agg(x), '{}')
      from unnest(coalesce(amenities, '{}')) as x
      where x not in ('aircon','furnished','washer','waterheat','bathtub')
    )
where amenities && array['aircon','furnished','washer','waterheat','bathtub'];

-- 4) ย้ายของที่ไม่ใช่ "ห้อง" ออกจาก rooms ไปไว้ที่ appliances
update public.listings
set appliances = (
      select coalesce(array_agg(distinct x), '{}')
      from unnest(coalesce(appliances, '{}') || coalesce(rooms, '{}')) as x
      where x in ('bathtub','waterheat','aircon','furnished','washer')
    )
where rooms && array['bathtub','waterheat'];

update public.listings
set rooms = (
      select coalesce(array_agg(x), '{}')
      from unnest(coalesce(rooms, '{}')) as x
      where x not in ('bathtub','waterheat','aircon','furnished','washer')
    )
where rooms && array['bathtub','waterheat','aircon','furnished','washer'];

-- 5) index ช่วยกรอง
create index if not exists listings_appliances_idx on public.listings using gin(appliances);
create index if not exists listings_amenities_idx  on public.listings using gin(amenities);
create index if not exists listings_rooms_idx      on public.listings using gin(rooms);

-- 6) ตรวจผล
select id, title,
       rooms      as "ห้อง",
       appliances as "เครื่องใช้ไฟฟ้า",
       amenities  as "สิ่งอำนวยความสะดวก"
from public.listings
order by created_at desc
limit 20;
