// ===================================================================
// LINE LOGIN — Supabase Edge Function (Deno)
//
// LINE ไม่ใช่ provider มาตรฐานของ Supabase จึงต้องมี function นี้เป็นตัวกลาง
//   1) ผู้ใช้กดปุ่ม "เข้าสู่ระบบด้วย LINE" → เว็บพามาที่ /functions/v1/line-login
//   2) function พาไปหน้าอนุญาตของ LINE
//   3) LINE ส่งกลับมาพร้อม code → function แลก token + ดึงโปรไฟล์
//   4) สร้าง/ค้นหา user ใน Supabase แล้วออก magic link เพื่อ log in
//   5) เด้งกลับหน้าเว็บ (ล็อกอินสำเร็จ)
//
// ต้องตั้ง Secrets ก่อน deploy:
//   supabase secrets set LINE_CHANNEL_ID=xxxx LINE_CHANNEL_SECRET=xxxx
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติใน edge function)
//
// deploy:  supabase functions deploy line-login --no-verify-jwt
// ===================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!

// URL ของ function นี้ (ต้องตรงกับ Callback URL ที่ตั้งใน LINE Developers)
const CALLBACK = `${SUPABASE_URL}/functions/v1/line-login`

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function b64urlDecode(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(s + '==='.slice((s.length + 3) % 4)))
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // ---------- ขั้นที่ 1: เริ่ม flow → พาไป LINE ----------
  if (!code) {
    const redirect = url.searchParams.get('redirect') || SUPABASE_URL
    const state = btoa(JSON.stringify({ redirect }))
    const auth = new URL('https://access.line.me/oauth2/v2.1/authorize')
    auth.searchParams.set('response_type', 'code')
    auth.searchParams.set('client_id', LINE_CHANNEL_ID)
    auth.searchParams.set('redirect_uri', CALLBACK)
    auth.searchParams.set('state', state)
    auth.searchParams.set('scope', 'profile openid email')
    return Response.redirect(auth.toString(), 302)
  }

  // ---------- ขั้นที่ 2: callback → แลก token ----------
  const state = url.searchParams.get('state')
  let dest = SUPABASE_URL
  try { dest = JSON.parse(atob(state || '')).redirect || dest } catch { /* noop */ }

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK,
      client_id: LINE_CHANNEL_ID,
      client_secret: LINE_CHANNEL_SECRET,
    }),
  })
  const token = await tokenRes.json()
  if (!token.id_token) {
    return new Response('LINE token error: ' + JSON.stringify(token), { status: 400 })
  }

  // ---------- ขั้นที่ 3: อ่านโปรไฟล์จาก id_token ----------
  const claims = b64urlDecode(token.id_token.split('.')[1])
  const lineId = claims.sub as string
  const name = (claims.name as string) || 'สมาชิก LINE'
  const email = (claims.email as string) || `${lineId}@line.rentbegin.local`

  // ---------- ขั้นที่ 4: สร้าง/ค้นหา user ----------
  // ลองสร้างก่อน — ถ้ามีอยู่แล้วจะ error ก็ข้ามได้
  await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name, role: 'renter', provider: 'line', line_id: lineId },
  }).catch(() => {})

  // ---------- ขั้นที่ 5: ออก magic link แล้วเด้งกลับเว็บ ----------
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: dest },
  })
  if (error || !data?.properties?.action_link) {
    return new Response('generateLink error: ' + (error?.message || 'unknown'), { status: 400 })
  }
  return Response.redirect(data.properties.action_link, 302)
})
