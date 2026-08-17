# Rentbegin — สรุปงาน + แผน Deploy ขึ้นเว็บ

อ่านทั้งหมดก่อน แล้วค่อยบอกผมให้เริ่ม deploy

---

## 1. สถานะตอนนี้

- ระบบสมาชิกจริงบน Supabase เสร็จแล้ว ตัด simulate ออกหมด
- `npm run build` ผ่าน · dev server ที่ localhost ใช้งานได้
- Supabase โปรเจกต์ `rentbegin` ต่อกับเว็บเรียบร้อย (ตาราง + ข้อมูลตัวอย่างครบ)
- **ยังไม่ได้ push ขึ้น git / ยังไม่ได้ deploy** ← ขั้นตอนนี้คือสิ่งที่จะทำต่อ

---

## 2. สิ่งที่เปลี่ยน (ฝั่งโค้ด)

- **Auth จริง** — สมัคร/เข้าสู่ระบบด้วย Google · Facebook · LINE + อีเมล (สำรอง)
- **บทบาทยืดหยุ่น** — ทุกบัญชีทำได้ทั้งหาเช่าและปล่อยเช่า มีปุ่มสลับโหมดเห็นตลอด (บน header + แถบซ้าย) ตอนสมัครเลือกได้ หาเช่า/ปล่อยเช่า/ทั้งสอง
- **ป้องกันหน้า** — `/member` ต้องล็อกอิน · `/admin` เฉพาะแอดมิน
- **ข้อมูลจาก DB จริง** — ทุกแท็บของแดชบอร์ดสมาชิก/แอดมินดึงจาก Supabase (มี mock เป็น fallback ถ้ายังไม่ตั้งค่า)

## 3. ไฟล์ที่เพิ่ม/แก้

**เพิ่มใหม่**
- `src/lib/supabase.js` — ตัวเชื่อม Supabase
- `src/context/AuthContext.jsx` — session, โปรไฟล์, โหมด, ฟังก์ชัน auth
- `src/pages/Login.jsx` + `Login.css` — หน้าเข้าสู่ระบบ/สมัคร
- `src/components/ProtectedRoute.jsx` — กันหน้า
- `supabase/schema.sql` · `supabase/seed.sql` — โครงสร้าง DB + ข้อมูลตัวอย่าง
- `supabase/functions/line-login/index.ts` — edge function สำหรับ LINE
- `.env.example` · `SETUP-AUTH.md` · `DEPLOY.md`

**แก้ไข**
- `src/api/client.js` (เชื่อม Supabase), `App.jsx`, `main.jsx`
- `components/Header.*`, `components/UserPanel.*` (ปุ่มสลับโหมด + auth)
- `pages/Member.jsx`, `pages/Admin.jsx` (ดึงข้อมูลจริง)
- `package.json` (+@supabase/supabase-js), `.gitignore`

## 4. Supabase ที่ตั้งค่าไว้แล้ว

- Project URL: `https://hrgzmbdsuarsfmhrzmhk.supabase.co` (region Singapore/Sydney)
- Publishable key ใส่ใน `.env` แล้ว (ไฟล์ `.env` ถูก gitignore — คีย์ไม่ขึ้น git ✓)
- รัน `schema.sql` + `seed.sql` แล้ว → 12 ตาราง + RLS + ประกาศ 8 รายการ
- ปิด **Confirm email** แล้ว (สมัครด้วยอีเมลเข้าได้ทันที)
- Site URL = `http://localhost:5173` (ตอน deploy ต้องเพิ่ม production URL)

---

## 5. แผน Deploy ขึ้น Render (ขั้นตอนที่จะทำ)

**ขั้น A — push โค้ดขึ้น GitHub**
```
cd ~/Desktop/rentbegin
git add .
git commit -m "feat: ระบบสมาชิกจริง (Supabase auth + social login + สลับโหมด)"
git push
```
> ถ้าติด error `index.lock` → `rm -f ~/Desktop/rentbegin/.git/index.lock` ก่อน แล้ว commit ใหม่

**ขั้น B — ใส่ Environment ใน Render**
dashboard.render.com → service **rentbegin** → **Environment** → เพิ่ม 2 ตัว:
- `VITE_SUPABASE_URL` = `https://hrgzmbdsuarsfmhrzmhk.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (publishable key ตัวเดียวกับใน .env)

**ขั้น C — Render redeploy อัตโนมัติ** หลัง push + Save env (~1–2 นาที)
> สำคัญ: ค่า `VITE_*` ถูกฝังตอน build — ต้องมี env ครบ**ก่อน** build ถึงจะทำงาน

**ขั้น D — เพิ่ม production URL ใน Supabase**
Authentication → URL Configuration:
- Site URL: `https://rentbegin.com`
- Redirect URLs เพิ่ม: `https://rentbegin.com/**`

## 6. ทดสอบหลัง deploy

- เปิด https://rentbegin.com → หน้าแรกโชว์ประกาศจาก Supabase
- กดเข้าสู่ระบบ → สมัครด้วยอีเมล → เข้าแดชบอร์ดได้
- ตั้งบัญชีตัวเองเป็นแอดมิน (SETUP-AUTH.md ข้อ 8) → เข้า `/admin`

## 7. ยังเหลือ (ทำเมื่อพร้อม ไม่บังคับตอน deploy)

- เปิด Google / Facebook provider ใน Supabase (SETUP-AUTH.md ข้อ 6, 6.5)
- Deploy LINE edge function (ข้อ 7)
- ปุ่ม social จะยังกดไม่ติดจนกว่าจะเปิด provider — แต่ **อีเมลใช้ได้เลย**

## 8. ข้อควรระวัง

- `.env` ต้องไม่ขึ้น git (ตอนนี้ ignore แล้ว ✓) — คีย์ที่ใช้เป็น publishable ปลอดภัยกับ browser อยู่แล้วเพราะมี RLS
- แก้ค่า env ใน Render ทุกครั้งต้อง redeploy
- ตอนนี้ยังใช้ Render Static Site เหมือนเดิม — ไม่เพิ่มค่าโฮสต์
