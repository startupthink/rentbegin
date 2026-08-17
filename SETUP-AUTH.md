# ตั้งค่าระบบสมาชิก (Supabase) — Rentbegin

ระบบสมาชิกจริงพร้อมแล้วในโค้ด สิ่งที่เหลือคือ "เสียบ" Supabase เข้าไป
ทำตามด้านล่างครั้งเดียว เว็บก็จะเลิก simulate และใช้บัญชีจริงทันที

> ระหว่างที่ยังไม่ได้ตั้งค่า เว็บจะ fallback ไปใช้ mock data ชั่วคราว (ไม่พัง)

---

## 1. สร้างโปรเจกต์ Supabase (ฟรี)

1. ไปที่ https://supabase.com → Sign in (ใช้ Startup.think@gmail.com ก็ได้)
2. **New project** → ตั้งชื่อ `rentbegin` → เลือก region **Singapore** (ใกล้ไทยสุด)
3. ตั้งรหัส database (เก็บไว้ให้ดี) → **Create**
4. รอ ~2 นาทีให้ provision เสร็จ

## 2. รัน SQL สร้างตาราง + ข้อมูลตัวอย่าง

1. เมนูซ้าย → **SQL Editor** → **New query**
2. เปิดไฟล์ `supabase/schema.sql` → คัดลอกทั้งหมด → วาง → **Run**
3. New query อีกอัน → เอา `supabase/seed.sql` มาวาง → **Run**
   (seed = ประกาศ 8 รายการ + ข้อมูลตัวอย่างแดชบอร์ด)

## 3. เอา URL + Key มาใส่ในเว็บ

1. เมนูซ้าย → **Project Settings** → **API**
2. คัดลอก 2 ค่านี้:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** key → `eyJhbGci...`
3. ที่เครื่อง: `cp .env.example .env` แล้วใส่ค่า

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

4. ทดสอบ: `npm run dev` → เปิด http://localhost:5173 → กด "เข้าสู่ระบบ"
   → สมัครด้วยอีเมล → เข้าแดชบอร์ดได้ = สำเร็จ

## 4. ตั้งค่าบน Render (โปรดักชัน)

1. dashboard.render.com → service **rentbegin** → **Environment**
2. เพิ่ม 2 ตัวแปร (ชื่อเหมือน .env เป๊ะ):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Save** → Render จะ redeploy อัตโนมัติ

> ⚠️ ตัวแปรขึ้นต้น `VITE_` ถูกฝังตอน build — ต้อง redeploy ทุกครั้งที่แก้ค่า

## 5. ตั้ง Redirect URL ให้ Supabase (จำเป็นสำหรับ OAuth)

Supabase → **Authentication** → **URL Configuration**
- **Site URL**: `https://rentbegin.com`
- **Redirect URLs** เพิ่ม:
  - `https://rentbegin.com/**`
  - `http://localhost:5173/**`

---

## 6. เปิด Google Login

1. **Google Cloud Console** → สร้าง OAuth Client (ประเภท Web application)
   - Authorized redirect URI: `https://xxxx.supabase.co/auth/v1/callback`
2. คัดลอก **Client ID** + **Client Secret**
3. Supabase → **Authentication → Sign In / Providers → Google** → เปิด → วางค่า → **Save**

เท่านี้ปุ่ม "เข้าสู่ระบบด้วย Google" ใช้ได้เลย

## 6.5 เปิด Facebook Login

1. **developers.facebook.com** → Create App → ประเภท **Consumer** → เพิ่มผลิตภัณฑ์ **Facebook Login**
2. Settings → Basic: คัดลอก **App ID** + **App Secret**
3. Facebook Login → Settings → **Valid OAuth Redirect URIs**:
   `https://xxxx.supabase.co/auth/v1/callback`
4. Supabase → **Authentication → Sign In / Providers → Facebook** → เปิด → วาง App ID/Secret → **Save**
5. ตอนทดสอบ แอป Facebook ต้องอยู่โหมด Live หรือเพิ่มบัญชีคุณเป็น Test User ก่อน

> ทั้ง Google และ Facebook ใช้ระบบ provider มาตรฐานของ Supabase — เปิดแล้วปุ่มทำงานทันที
> ส่วน LINE ต้อง deploy edge function ตามข้อ 7

## 7. เปิด LINE Login (ขั้นสูง — ผ่าน Edge Function)

LINE ไม่ใช่ provider มาตรฐานของ Supabase จึงมี edge function เตรียมไว้ให้แล้ว
ที่ `supabase/functions/line-login/`

**7.1 สร้าง LINE Channel**
1. https://developers.line.biz → สร้าง Provider → สร้าง channel แบบ **LINE Login**
2. ในหน้า channel:
   - เปิด scope: `profile`, `openid`, `email`
   - **Callback URL**: `https://xxxx.supabase.co/functions/v1/line-login`
3. เก็บ **Channel ID** และ **Channel secret**

**7.2 ติดตั้ง Supabase CLI แล้ว deploy**
```bash
npm i -g supabase
supabase login
supabase link --project-ref xxxx           # xxxx = ref ใน Project URL
supabase secrets set LINE_CHANNEL_ID=<channel id> LINE_CHANNEL_SECRET=<secret>
supabase functions deploy line-login --no-verify-jwt
```

เสร็จแล้วปุ่ม "เข้าสู่ระบบด้วย LINE" จะทำงาน

---

## 8. ตั้งบัญชีตัวเองเป็นแอดมิน

หน้า `/admin` เปิดเฉพาะ role = admin เท่านั้น

1. สมัครสมาชิกด้วยอีเมลของคุณก่อน (ผ่านหน้าเว็บ)
2. Supabase → **SQL Editor** → รัน (แก้อีเมลเป็นของคุณ):

```sql
update public.profiles
set role = 'admin', role_label = 'ผู้ดูแลระบบ'
where user_id = (select id from auth.users where email = 'you@email.com');
```

3. ล็อกอินใหม่ → เข้า `/admin` ได้

---

## เกิดอะไรขึ้นบ้าง (สรุปการเปลี่ยนแปลง)

| เดิม (simulate) | ใหม่ (จริง) |
|---|---|
| สลับบทบาทด้วยปุ่มใน localStorage | บทบาทมาจากบัญชีจริงตอนสมัคร |
| `USE_MOCK = true` | ดึงจาก Supabase (มี mock เป็น fallback) |
| ใครก็เข้า /member /admin ได้ | ต้องล็อกอิน + /admin เฉพาะแอดมิน |
| ไม่มีสมัคร/เข้าสู่ระบบ | อีเมล+รหัสผ่าน · Google · LINE |
| ข้อมูลแดชบอร์ดฝังในโค้ด | อยู่ในตาราง Postgres + RLS |

**ค่าใช้จ่าย:** Supabase Free plan พอสำหรับช่วงเริ่มต้น · เว็บยังเป็น Static Site บน Render เท่าเดิม (ไม่เพิ่มค่าโฮสต์)

**ไฟล์ที่เพิ่ม/แก้หลัก:** `src/lib/supabase.js`, `src/context/AuthContext.jsx`,
`src/pages/Login.jsx`, `src/components/ProtectedRoute.jsx`, `src/api/client.js` (เชื่อม DB),
`supabase/schema.sql`, `supabase/seed.sql`, `supabase/functions/line-login/`
