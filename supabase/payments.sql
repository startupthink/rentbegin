-- ===================================================================
-- RENTBEGIN — ระบบจอง / มัดจำ / ชำระเงิน / สัญญาดิจิทัล
-- รันใน Supabase → SQL Editor หลัง schema.sql (รันครั้งเดียว)
-- ===================================================================

-- ---------- 1) BOOKINGS (คำขอจอง + มัดจำ) ----------
create table if not exists public.bookings (
  id             text primary key default ('BK-' || upper(substr(gen_random_uuid()::text,1,8))),
  listing_id     text references public.listings(id) on delete cascade,
  renter_id      uuid references public.profiles(id) on delete set null,
  owner_id       uuid references public.profiles(id) on delete cascade,
  move_in_text   text,
  months         integer default 12,
  occupants      integer default 1,
  rent           integer not null,              -- ค่าเช่า/เดือน
  deposit        integer not null default 0,    -- มัดจำรวม
  advance        integer not null default 0,    -- ค่าเช่าล่วงหน้า
  fee            integer not null default 0,    -- ค่าธรรมเนียมแพลตฟอร์ม 1%
  total          integer not null default 0,    -- ยอดที่ต้องชำระวันเข้าอยู่
  status         text not null default 'pending'
                   check (status in ('pending','accepted','paid','active','completed','cancelled','rejected')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists bookings_owner_idx  on public.bookings(owner_id);
create index if not exists bookings_renter_idx on public.bookings(renter_id);

-- ---------- 2) PAYMENTS (รายการชำระเงินจริงผ่าน Omise) ----------
create table if not exists public.payments (
  id              text primary key default ('PM-' || upper(substr(gen_random_uuid()::text,1,8))),
  booking_id      text references public.bookings(id) on delete cascade,
  payer_id        uuid references public.profiles(id) on delete set null,
  amount          integer not null,              -- หน่วยเป็นบาท
  currency        text not null default 'THB',
  method          text check (method in ('promptpay','card','transfer')),
  purpose         text not null default 'deposit'
                    check (purpose in ('deposit','rent','fee','refund')),
  status          text not null default 'pending'
                    check (status in ('pending','paid','failed','refunded','held','released')),
  omise_charge_id text,
  qr_url          text,                          -- URL รูป QR PromptPay
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments(booking_id);

-- ---------- 3) ESCROW LEDGER (บันทึกการพักเงิน/ปล่อยเงิน) ----------
create table if not exists public.escrow_ledger (
  id          bigint generated always as identity primary key,
  payment_id  text references public.payments(id) on delete cascade,
  booking_id  text references public.bookings(id) on delete cascade,
  action      text check (action in ('hold','release','refund')),
  amount      integer not null,
  actor       text,           -- 'system' | 'admin' | profile id
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- 4) ต่อยอดตาราง contracts เดิม ให้รองรับ e-signature ----------
alter table public.contracts add column if not exists booking_id     text references public.bookings(id) on delete set null;
alter table public.contracts add column if not exists listing_id     text references public.listings(id) on delete set null;
alter table public.contracts add column if not exists renter_id      uuid references public.profiles(id) on delete set null;
alter table public.contracts add column if not exists body           text;   -- เนื้อสัญญา
alter table public.contracts add column if not exists terms          jsonb;  -- เงื่อนไขแบบมีโครงสร้าง
alter table public.contracts add column if not exists owner_signed_at  timestamptz;
alter table public.contracts add column if not exists renter_signed_at timestamptz;
alter table public.contracts add column if not exists owner_sign_name  text;
alter table public.contracts add column if not exists renter_sign_name text;
alter table public.contracts add column if not exists sign_ip        text;

-- ขยายสถานะสัญญาให้ครอบคลุมขั้นลงนาม
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('draft','awaiting_signatures','active','ending','ended','cancelled'));

-- ---------- 5) RLS ----------
alter table public.bookings      enable row level security;
alter table public.payments      enable row level security;
alter table public.escrow_ledger enable row level security;

-- bookings: ผู้เช่าและเจ้าของที่เกี่ยวข้อง (+admin) เท่านั้น
drop policy if exists bookings_read   on public.bookings;
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_update on public.bookings;

create policy bookings_read on public.bookings for select
  using (renter_id = public.current_profile_id()
      or owner_id  = public.current_profile_id()
      or public.is_admin());

create policy bookings_insert on public.bookings for insert
  with check (renter_id = public.current_profile_id());

create policy bookings_update on public.bookings for update
  using (renter_id = public.current_profile_id()
      or owner_id  = public.current_profile_id()
      or public.is_admin());

-- payments: อ่านได้เฉพาะคู่กรณีของ booking นั้น
drop policy if exists payments_read   on public.payments;
drop policy if exists payments_insert on public.payments;

create policy payments_read on public.payments for select
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.renter_id = public.current_profile_id()
        or b.owner_id  = public.current_profile_id()
        or public.is_admin())
  ));

create policy payments_insert on public.payments for insert
  with check (payer_id = public.current_profile_id());

-- escrow: แอดมินเท่านั้น (ผู้ใช้เห็นผ่าน payments)
drop policy if exists escrow_admin on public.escrow_ledger;
create policy escrow_admin on public.escrow_ledger for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 6) ฟังก์ชันคำนวณยอด (ใช้ฝั่ง server ได้) ----------
create or replace function public.calc_booking_total(
  p_rent integer, p_deposit_months integer, p_advance_months integer
) returns table (deposit integer, advance integer, fee integer, total integer)
language sql immutable as $$
  select
    p_rent * coalesce(p_deposit_months, 2)                         as deposit,
    p_rent * coalesce(p_advance_months, 1)                         as advance,
    round(p_rent * coalesce(p_advance_months, 1) * 0.01)::integer  as fee,
    p_rent * coalesce(p_deposit_months, 2)
      + p_rent * coalesce(p_advance_months, 1)
      + round(p_rent * coalesce(p_advance_months, 1) * 0.01)::integer as total;
$$;
