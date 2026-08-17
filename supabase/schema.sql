-- ===================================================================
-- RENTBEGIN — SUPABASE SCHEMA + RLS
-- วางทั้งไฟล์นี้ใน Supabase Dashboard → SQL Editor → Run
-- (รันครั้งเดียว) จากนั้นรัน seed.sql เพื่อใส่ข้อมูลตัวอย่าง
-- ===================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ===================================================================
-- 1) PROFILES  (โปรไฟล์สมาชิก — ผูกกับ auth.users แบบ 1:1)
--    profile ตัวอย่าง (seed) จะมี user_id = null ได้
-- ===================================================================
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  name        text not null default 'สมาชิกใหม่',
  initial     text not null default '?',
  role        text not null default 'renter'
                check (role in ('renter','owner','agent','admin')),
  role_label  text not null default 'ผู้เช่า',
  verified    boolean not null default false,
  rating      numeric(2,1),
  phone       text,
  avatar      text,             -- gradient key หรือ url
  created_at  timestamptz not null default now()
);

-- ---------- helper functions (SECURITY DEFINER = ข้าม RLS ได้) ----------
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- trigger: สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name  text;
  v_role  text;
  v_label text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(new.raw_user_meta_data->>'role', 'renter');
  if v_role not in ('renter','owner','agent','admin') then v_role := 'renter'; end if;
  v_label := case v_role
    when 'owner' then 'เจ้าของ'
    when 'agent' then 'นายหน้า'
    when 'admin' then 'ผู้ดูแลระบบ'
    else 'ผู้เช่า' end;

  insert into public.profiles (user_id, name, initial, role, role_label)
  values (new.id, v_name, upper(left(v_name, 1)), v_role, v_label);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================================================================
-- 2) LISTINGS  (ประกาศทรัพย์ — id ใช้รหัส RB-xxxx เดิม)
-- ===================================================================
create table if not exists public.listings (
  id             text primary key,
  slug           text unique,
  owner_id       uuid references public.profiles(id) on delete set null,
  title          text not null,
  full_title     text,
  type           text not null,
  type_label     text,
  district       text,
  province       text,
  nearby         text,
  price          integer not null,
  deposit_months integer default 2,
  advance_months integer default 1,
  bedrooms       integer default 0,
  bathrooms      integer default 0,
  size_sqm       numeric,
  land_sqw       numeric,
  land_rai       numeric,
  rating         numeric(2,1),
  review_count   integer default 0,
  verified       boolean default false,
  hot            boolean default false,
  available_from text,
  min_lease_months integer,
  photos         text[] default '{}',
  photo_count    integer default 0,
  amenities      text[] default '{}',
  pet_allowed    boolean default false,
  description    text,
  status         text not null default 'live'
                   check (status in ('live','pending','rented','rejected')),
  views          integer default 0,
  created_at     timestamptz not null default now()
);
create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists listings_status_idx on public.listings(status);

-- ===================================================================
-- 3) SAVED  (รายการที่กดหัวใจ — ย้ายจาก localStorage)
-- ===================================================================
create table if not exists public.saved (
  profile_id  uuid references public.profiles(id) on delete cascade,
  listing_id  text references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

-- ===================================================================
-- 4) VIEWINGS  (นัดชม)
-- ===================================================================
create table if not exists public.viewings (
  id           text primary key default ('V-' || substr(gen_random_uuid()::text,1,8)),
  listing_id   text references public.listings(id) on delete cascade,
  owner_id     uuid references public.profiles(id) on delete cascade,
  renter_id    uuid references public.profiles(id) on delete set null,
  renter_name  text,
  property     text,
  when_text    text,
  status       text not null default 'pending'
                 check (status in ('pending','confirmed','done','cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists viewings_owner_idx on public.viewings(owner_id);

-- ===================================================================
-- 5) MESSAGE THREADS + MESSAGES  (แชต)
-- ===================================================================
create table if not exists public.threads (
  id          text primary key default ('M-' || substr(gen_random_uuid()::text,1,8)),
  owner_id    uuid references public.profiles(id) on delete cascade,
  from_name   text,
  photo       text,
  property    text,
  unread      integer default 0,
  time_text   text,
  created_at  timestamptz not null default now()
);
create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  thread_id   text references public.threads(id) on delete cascade,
  is_me       boolean default false,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(thread_id);

-- ===================================================================
-- 6) CONTRACTS  (สัญญาเช่า)
-- ===================================================================
create table if not exists public.contracts (
  id          text primary key,
  owner_id    uuid references public.profiles(id) on delete cascade,
  property    text,
  tenant      text,
  start_text  text,
  months      integer,
  rent        integer,
  status      text default 'active' check (status in ('active','ending','ended')),
  created_at  timestamptz not null default now()
);

-- ===================================================================
-- 7) TRANSACTIONS + RECEIPTS  (การเงิน)
-- ===================================================================
create table if not exists public.transactions (
  id          text primary key,
  owner_id    uuid references public.profiles(id) on delete cascade,
  date_text   text,
  descr       text,
  amount      integer,
  type        text check (type in ('in','out','hold')),
  created_at  timestamptz not null default now()
);
create table if not exists public.receipts (
  id          text primary key,
  owner_id    uuid references public.profiles(id) on delete cascade,
  date_text   text,
  descr       text,
  amount      integer,
  created_at  timestamptz not null default now()
);

-- ===================================================================
-- 8) REVIEWS  (รีวิว — อ่านได้ทั่วไป)
-- ===================================================================
create table if not exists public.reviews (
  id          text primary key default ('R-' || substr(gen_random_uuid()::text,1,8)),
  owner_id    uuid references public.profiles(id) on delete cascade,
  listing_id  text references public.listings(id) on delete set null,
  reviewer    text,
  stars       integer check (stars between 1 and 5),
  text        text,
  property    text,
  time_text   text,
  created_at  timestamptz not null default now()
);

-- ===================================================================
-- 9) DISPUTES + KYC  (เฉพาะแอดมิน)
-- ===================================================================
create table if not exists public.disputes (
  id           text primary key,
  title        text,
  detail       text,
  status       text default 'wait',
  status_label text,
  created_at   timestamptz not null default now()
);
create table if not exists public.kyc_submissions (
  id           text primary key,
  profile_id   uuid references public.profiles(id) on delete cascade,
  name         text,
  role_label   text,
  doc          text,
  photo        text,
  time_text    text,
  status       text default 'pending' check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now()
);

-- ===================================================================
-- RLS POLICIES
-- ===================================================================
alter table public.profiles         enable row level security;
alter table public.listings         enable row level security;
alter table public.saved            enable row level security;
alter table public.viewings         enable row level security;
alter table public.threads          enable row level security;
alter table public.messages         enable row level security;
alter table public.contracts        enable row level security;
alter table public.transactions     enable row level security;
alter table public.receipts         enable row level security;
alter table public.reviews          enable row level security;
alter table public.disputes         enable row level security;
alter table public.kyc_submissions  enable row level security;

-- ---- profiles ----
create policy profiles_read_all   on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_admin_all  on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- listings ----
create policy listings_read on public.listings for select
  using (status = 'live' or owner_id = public.current_profile_id() or public.is_admin());
create policy listings_insert on public.listings for insert
  with check (owner_id = public.current_profile_id());
create policy listings_update_own on public.listings for update
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());
create policy listings_delete_own on public.listings for delete
  using (owner_id = public.current_profile_id() or public.is_admin());

-- ---- saved ----
create policy saved_own on public.saved for all
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- ---- viewings ----
create policy viewings_read on public.viewings for select
  using (owner_id = public.current_profile_id()
      or renter_id = public.current_profile_id() or public.is_admin());
create policy viewings_insert on public.viewings for insert
  with check (renter_id = public.current_profile_id() or renter_id is null);
create policy viewings_update on public.viewings for update
  using (owner_id = public.current_profile_id() or public.is_admin());

-- ---- threads + messages (เจ้าของ thread เท่านั้น + admin) ----
create policy threads_own on public.threads for all
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());
create policy messages_own on public.messages for all
  using (exists (select 1 from public.threads t
                 where t.id = thread_id
                   and (t.owner_id = public.current_profile_id() or public.is_admin())))
  with check (exists (select 1 from public.threads t
                 where t.id = thread_id
                   and (t.owner_id = public.current_profile_id() or public.is_admin())));

-- ---- contracts / transactions / receipts (เจ้าของ + admin) ----
create policy contracts_own on public.contracts for all
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());
create policy transactions_own on public.transactions for all
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());
create policy receipts_own on public.receipts for all
  using (owner_id = public.current_profile_id() or public.is_admin())
  with check (owner_id = public.current_profile_id() or public.is_admin());

-- ---- reviews (อ่านได้ทั่วไป, เขียน = ล็อกอิน) ----
create policy reviews_read on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert
  with check (auth.uid() is not null);
create policy reviews_admin on public.reviews for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- disputes + kyc (แอดมินเท่านั้น) ----
create policy disputes_admin on public.disputes for all
  using (public.is_admin()) with check (public.is_admin());
create policy kyc_admin on public.kyc_submissions for all
  using (public.is_admin()) with check (public.is_admin());
-- ผู้ใช้ส่ง KYC ของตัวเองได้
create policy kyc_insert_own on public.kyc_submissions for insert
  with check (profile_id = public.current_profile_id());
create policy kyc_read_own on public.kyc_submissions for select
  using (profile_id = public.current_profile_id() or public.is_admin());
