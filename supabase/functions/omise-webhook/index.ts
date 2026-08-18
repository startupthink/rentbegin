// ===================================================================
// OMISE WEBHOOK — รับแจ้งผลชำระเงินจาก Omise
//
// PromptPay ผู้ใช้สแกนจ่ายทีหลัง → Omise ยิง webhook มาบอกว่าจ่ายแล้ว
// ตั้งค่าใน Omise Dashboard → Webhooks → เพิ่ม endpoint:
//   https://<project>.supabase.co/functions/v1/omise-webhook
//
// deploy: supabase functions deploy omise-webhook --no-verify-jwt
// ===================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const OMISE_SECRET = Deno.env.get('OMISE_SECRET_KEY') ?? ''

// ยืนยันกับ Omise อีกครั้งว่า charge นี้จ่ายจริง (กันการปลอม webhook)
async function verifyCharge(chargeId: string) {
  const res = await fetch(`https://api.omise.co/charges/${chargeId}`, {
    headers: { Authorization: 'Basic ' + btoa(OMISE_SECRET + ':') },
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')

  const event = await req.json()
  const key = event?.key as string | undefined
  const chargeId = event?.data?.id as string | undefined
  if (!chargeId || !key?.startsWith('charge.')) return new Response('ignored')

  // ตรวจสอบกับ Omise โดยตรง ไม่เชื่อ payload ที่ส่งมาอย่างเดียว
  const charge = await verifyCharge(chargeId)
  if (charge?.object === 'error') return new Response('charge not found', { status: 400 })

  const { data: payment } = await admin
    .from('payments').select('*').eq('omise_charge_id', chargeId).maybeSingle()
  if (!payment) return new Response('payment not found')

  if (charge.status === 'successful' && payment.status !== 'held') {
    await admin.from('payments')
      .update({ status: 'held', paid_at: new Date().toISOString() })
      .eq('id', payment.id)

    await admin.from('bookings')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.booking_id)

    await admin.from('escrow_ledger').insert({
      payment_id: payment.id, booking_id: payment.booking_id,
      action: 'hold', amount: payment.amount, actor: 'system',
      note: 'พักเงินมัดจำ (ยืนยันผ่าน webhook)',
    })

    // ออกใบเสร็จอัตโนมัติให้เจ้าของทรัพย์
    const { data: booking } = await admin
      .from('bookings').select('*, listings(title)').eq('id', payment.booking_id).maybeSingle()
    if (booking) {
      const now = new Date()
      const dateText = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
      await admin.from('receipts').insert({
        id: 'RC-' + Date.now().toString().slice(-7),
        owner_id: booking.owner_id,
        date_text: dateText,
        descr: `รับชำระมัดจำ+ค่าเช่าล่วงหน้า — ${booking.listings?.title ?? booking.listing_id}`,
        amount: payment.amount,
      })
      await admin.from('transactions').insert({
        id: 'T-' + Date.now().toString().slice(-7),
        owner_id: booking.owner_id,
        date_text: dateText,
        descr: `มัดจำเข้าระบบพักเงิน — ${booking.listings?.title ?? booking.listing_id}`,
        amount: payment.amount,
        type: 'hold',
      })
    }
  }

  if (charge.status === 'failed' && payment.status === 'pending') {
    await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
  }

  return new Response('ok')
})
