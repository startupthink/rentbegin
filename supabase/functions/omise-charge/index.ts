// ===================================================================
// OMISE CHARGE — Supabase Edge Function (Deno)
//
// สร้างรายการชำระเงิน (PromptPay QR หรือบัตรเครดิต) สำหรับมัดจำ/ค่าเช่า
// เงินเข้าบัญชี Omise ของคุณ แล้วโอนออกตามรอบที่ตั้งไว้
//
// ⚠️ ต้องมี Omise merchant account ก่อน (สมัครที่ omise.co ใช้เอกสารนิติบุคคล)
// ตั้ง secret ก่อน deploy:
//   supabase secrets set OMISE_SECRET_KEY=skey_xxx OMISE_PUBLIC_KEY=pkey_xxx
//   supabase functions deploy omise-charge
//
// เรียกจาก frontend:  POST { bookingId, method: 'promptpay' | 'card', token? }
// ===================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OMISE_SECRET = Deno.env.get('OMISE_SECRET_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// เรียก Omise API ด้วย HTTP Basic auth (secret key เป็น username)
async function omise(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.omise.co${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(OMISE_SECRET + ':'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  if (!OMISE_SECRET) {
    return json({
      error: 'ยังไม่ได้ตั้งค่า OMISE_SECRET_KEY — ดู SETUP-PAYMENTS.md',
      configured: false,
    }, 503)
  }

  // ---------- ตรวจสิทธิ์ผู้เรียก ----------
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401)

  const { data: profile } = await admin
    .from('profiles').select('id').eq('user_id', userData.user.id).maybeSingle()
  if (!profile) return json({ error: 'ไม่พบโปรไฟล์' }, 400)

  // ---------- อ่าน booking ----------
  const { bookingId, method = 'promptpay', token, returnUri } = await req.json()
  const { data: booking } = await admin
    .from('bookings').select('*').eq('id', bookingId).maybeSingle()

  if (!booking) return json({ error: 'ไม่พบรายการจอง' }, 404)
  if (booking.renter_id !== profile.id) return json({ error: 'ไม่ใช่รายการของคุณ' }, 403)
  if (booking.status === 'paid') return json({ error: 'ชำระเงินแล้ว' }, 409)

  const amountSatang = Math.round(Number(booking.total) * 100) // Omise ใช้หน่วยสตางค์
  if (!amountSatang || amountSatang < 2000) {
    return json({ error: 'ยอดชำระไม่ถูกต้อง (ขั้นต่ำ 20 บาท)' }, 400)
  }

  // ---------- สร้าง source/charge ----------
  let charge: Record<string, unknown>

  if (method === 'promptpay') {
    const source = await omise('/sources', {
      type: 'promptpay',
      amount: String(amountSatang),
      currency: 'THB',
    })
    if (source.object === 'error') return json({ error: source.message }, 400)

    charge = await omise('/charges', {
      amount: String(amountSatang),
      currency: 'THB',
      source: source.id as string,
      description: `Rentbegin ${booking.id} — มัดจำ+ค่าเช่าล่วงหน้า`,
      'metadata[booking_id]': booking.id,
      ...(returnUri ? { return_uri: returnUri } : {}),
    })
  } else if (method === 'card') {
    if (!token) return json({ error: 'ต้องส่ง card token' }, 400)
    charge = await omise('/charges', {
      amount: String(amountSatang),
      currency: 'THB',
      card: token,
      description: `Rentbegin ${booking.id} — มัดจำ+ค่าเช่าล่วงหน้า`,
      'metadata[booking_id]': booking.id,
      ...(returnUri ? { return_uri: returnUri } : {}),
    })
  } else {
    return json({ error: 'method ไม่รองรับ' }, 400)
  }

  if ((charge as { object?: string }).object === 'error') {
    return json({ error: (charge as { message?: string }).message }, 400)
  }

  // ---------- บันทึกลง payments ----------
  const src = (charge as { source?: { scannable_code?: { image?: { download_uri?: string } } } }).source
  const qrUrl = src?.scannable_code?.image?.download_uri ?? null
  const chargeStatus = (charge as { status?: string }).status
  const paid = chargeStatus === 'successful'

  const { data: payment } = await admin.from('payments').insert({
    booking_id: booking.id,
    payer_id: profile.id,
    amount: booking.total,
    method,
    purpose: 'deposit',
    status: paid ? 'held' : 'pending',   // จ่ายแล้ว = พักเงินไว้ (escrow)
    omise_charge_id: (charge as { id?: string }).id ?? null,
    qr_url: qrUrl,
    paid_at: paid ? new Date().toISOString() : null,
  }).select().maybeSingle()

  if (paid) {
    await admin.from('bookings').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', booking.id)
    await admin.from('escrow_ledger').insert({
      payment_id: payment?.id, booking_id: booking.id,
      action: 'hold', amount: booking.total, actor: 'system',
      note: 'พักเงินมัดจำอัตโนมัติเมื่อชำระสำเร็จ',
    })
  }

  return json({
    ok: true,
    paymentId: payment?.id,
    chargeId: (charge as { id?: string }).id,
    status: chargeStatus,
    qrUrl,
    authorizeUri: (charge as { authorize_uri?: string }).authorize_uri ?? null,
    amount: booking.total,
  })
})
