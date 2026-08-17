// ===================================================================
// SUPABASE CLIENT
// อ่านค่าจาก .env (ดู .env.example)
//   VITE_SUPABASE_URL       = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY  = eyJhbGci...
//
// ถ้ายังไม่ได้ตั้งค่า env → supabase = null และระบบจะ fallback
// ไปใช้ mock data (src/data/mock.js) โดยอัตโนมัติ
// เมื่อใส่ค่า env แล้ว → ทุกอย่างวิ่งผ่าน Supabase จริง (ไม่ใช่ simulate)
// ===================================================================

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// เปิดใช้ Supabase เมื่อมีทั้ง url และ key เท่านั้น
export const HAS_SUPABASE = Boolean(url && anonKey)

export const supabase = HAS_SUPABASE
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // จำเป็นสำหรับ OAuth (Google/LINE) redirect
      },
    })
  : null

if (!HAS_SUPABASE && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[rentbegin] ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — ' +
      'ระบบกำลังใช้ mock data ชั่วคราว ดูวิธีตั้งค่าใน SETUP-AUTH.md'
  )
}
