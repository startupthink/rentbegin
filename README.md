# Rentbegin.com

ตลาดกลางเช่าอสังหาริมทรัพย์ — คอนโด บ้าน ทาวน์เฮาส์ ตึกแถว โกดัง ที่ดิน

**สถานะปัจจุบัน:** Frontend React + mock data (ยังไม่มี backend)

---

## Stack

| ส่วน | ตอนนี้ | เป้าหมาย |
|---|---|---|
| Frontend | React 18 + Vite + React Router | เหมือนเดิม |
| Data | mock data ในไฟล์ | Express + Prisma + PostgreSQL |
| Deploy | Render Static Site | Render Web Service |

---

## รันบนเครื่อง

```bash
npm install
npm run dev
```

เปิด http://localhost:5173

---

## หน้าที่มี

| Route | หน้า |
|---|---|
| `/` | หน้าแรก — ค้นหา + กริดประกาศ |
| `/property/:id` | รายละเอียดทรัพย์ + นัดชม |
| `/member` | แดชบอร์ดสมาชิก (เจ้าของ/นายหน้า) + ฟอร์มลงประกาศ |
| `/admin` | แดชบอร์ดแอดมิน — ตรวจประกาศ, ข้อพิพาท |

ลอง: `/property/RB-3041`

---

## โครงสร้างไฟล์

```
src/
  api/client.js      ← จุดเชื่อม backend (แก้ที่นี่ที่เดียว)
  data/mock.js       ← ข้อมูลจำลอง
  components/        ← Header, PropertyCard, Sidebar
  pages/             ← Home, Property, Member, Admin
  styles/global.css  ← design tokens + utility class
```

---

## Deploy บน Render

1. Push repo นี้ขึ้น GitHub
2. Render → **New +** → **Static Site** → เลือก repo
3. ตั้งค่า:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Create

> ไฟล์ `render.yaml` มี rewrite rule ให้แล้ว — จำเป็นสำหรับ React Router
> ถ้าไม่มี เวลารีเฟรชที่ `/property/RB-3041` จะขึ้น 404

### ผูกโดเมน (rentbegin.com — DNS อยู่ที่ Cloudflare)

1. Render → Settings → Custom Domains → เพิ่ม `rentbegin.com` + `www.rentbegin.com`
2. ก๊อป DNS record ที่ Render ให้มา
3. Cloudflare → DNS → เพิ่ม record — **ตั้งเป็นเมฆเทา (DNS only)** ก่อน
4. รอ Render ออก SSL (ขึ้น ✓ Certificate Issued)
5. Cloudflare → SSL/TLS → **Full (strict)**
6. เปิดเมฆส้ม (proxied) ได้ถ้าต้องการ CDN

---

## ต่อ backend ในอนาคต

ทุก component เรียกข้อมูลผ่าน `src/api/client.js` เท่านั้น — ไม่มี component ไหน import mock โดยตรง

**ขั้นตอน:**

1. เขียน Express + Prisma ให้ endpoint ตรงกับที่ประกาศไว้ใน `client.js`:

   ```
   GET  /api/listings?type=&q=
   GET  /api/listings/:id
   POST /api/listings
   GET  /api/me
   GET  /api/me/stats
   GET  /api/me/tasks
   GET  /api/me/listings
   GET  /api/me/viewings
   GET  /api/admin/stats
   GET  /api/admin/review-queue
   GET  /api/admin/disputes
   POST /api/admin/listings/:id/approve
   POST /api/admin/listings/:id/reject
   ```

2. `src/api/client.js` → เปลี่ยน `USE_MOCK = true` เป็น `false`
3. สร้าง `.env`: `VITE_API_URL=https://api.rentbegin.com`
4. เปลี่ยน Render จาก Static Site → Web Service

**Prisma model** ให้ดูโครงสร้าง object ใน `src/data/mock.js` — ออกแบบไว้ให้ตรงกับที่ควรเป็นแล้ว

---

## ที่ยังไม่ได้ทำ

- Auth (login/register)
- อัปโหลดรูปจริง (ตอนนี้ใช้ gradient placeholder)
- แผนที่จริง (ตอนนี้เป็น mock)
- แชต / ระบบข้อความ
- ระบบสัญญา + มัดจำ (escrow)
- LINE Login
