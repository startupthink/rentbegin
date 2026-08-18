// ===================================================================
// API CLIENT — เชื่อม Supabase จริง (ไม่ใช่ simulate อีกต่อไป)
//
// - ถ้าตั้งค่า VITE_SUPABASE_URL/ANON_KEY แล้ว → ดึงข้อมูลจาก Supabase
// - ถ้ายังไม่ตั้งค่า → fallback ไปใช้ mock (src/data/mock.js) ชั่วคราว
//
// component ทุกตัวเรียกผ่านไฟล์นี้ ชื่อฟังก์ชันเดิมไม่เปลี่ยน
// ===================================================================

import { supabase, HAS_SUPABASE } from '../lib/supabase'
import * as mock from '../data/mock'

const delay = (ms = 160) => new Promise((r) => setTimeout(r, ms))

const TYPE_LABELS = {
  condo: 'คอนโด', house: 'บ้านเดี่ยว', townhouse: 'ทาวน์เฮาส์',
  rowhouse: 'ห้องแถว', shophouse: 'ตึกแถว', office: 'ออฟฟิศ',
  warehouse: 'โกดัง', land: 'ที่ดิน',
}

// ---------- mappers (snake_case DB → camelCase ที่ UI ใช้) ----------
function yearsFrom(ts) {
  if (!ts) return 1
  const y = Math.floor((Date.now() - new Date(ts)) / (365 * 864e5))
  return Math.max(1, y)
}

function mapOwner(o) {
  if (!o) return { id: null, name: 'เจ้าของ', initial: '?', role: 'owner', roleLabel: 'เจ้าของ', verified: false, responseTime: 'ตอบไว', yearsActive: 1 }
  return {
    id: o.id, name: o.name, initial: o.initial, role: o.role,
    roleLabel: o.role_label, verified: o.verified,
    responseTime: 'ตอบไว', yearsActive: yearsFrom(o.created_at),
  }
}

function mapListing(r) {
  return {
    id: r.id, slug: r.slug, title: r.title, fullTitle: r.full_title,
    type: r.type, typeLabel: r.type_label, district: r.district, province: r.province,
    nearby: r.nearby, price: r.price, depositMonths: r.deposit_months, advanceMonths: r.advance_months,
    bedrooms: r.bedrooms, bathrooms: r.bathrooms, sizeSqm: r.size_sqm, landSqw: r.land_sqw, landRai: r.land_rai,
    rating: r.rating, reviewCount: r.review_count, verified: r.verified, hot: r.hot,
    availableFrom: r.available_from, minLeaseMonths: r.min_lease_months,
    photos: r.photos || [], photoCount: r.photo_count, amenities: r.amenities || [],
    petAllowed: r.pet_allowed, description: r.description || '', status: r.status, views: r.views,
    owner: mapOwner(r.owner),
  }
}

const LISTING_SELECT = '*, owner:profiles!listings_owner_id_fkey(id,name,initial,role,role_label,verified,created_at)'

async function myProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  return data
}

// ===================================================================
// LISTINGS
// ===================================================================
export async function getListings({ type = 'all', q = '' } = {}) {
  if (!HAS_SUPABASE) {
    await delay()
    let out = mock.listings
    if (type !== 'all') out = out.filter((l) => l.type === type)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      out = out.filter((l) =>
        l.title.toLowerCase().includes(k) ||
        l.district.toLowerCase().includes(k) ||
        l.province.toLowerCase().includes(k))
    }
    return out
  }
  let query = supabase.from('listings').select(LISTING_SELECT).eq('status', 'live').order('created_at', { ascending: false })
  if (type !== 'all') query = query.eq('type', type)
  if (q.trim()) query = query.or(`title.ilike.%${q}%,district.ilike.%${q}%,province.ilike.%${q}%`)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapListing)
}

export async function getListing(id) {
  if (!HAS_SUPABASE) {
    await delay(120)
    const found = mock.listings.find((l) => l.id === id || l.slug === id)
    if (!found) throw new Error('ไม่พบประกาศนี้')
    return found
  }
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).or(`id.eq.${id},slug.eq.${id}`).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('ไม่พบประกาศนี้')
  return mapListing(data)
}

// ---------- อัปโหลดรูปประกาศ (Supabase Storage) ----------
// คืนค่าเป็น array ของ public URL — เก็บลงคอลัมน์ photos ได้เลย
// ถ้ายังไม่ตั้งค่า Supabase จะคืน gradient key เดิมเพื่อให้เดโมทำงานต่อได้
export async function uploadListingPhotos(files, listingId = 'draft', onProgress) {
  if (!HAS_SUPABASE) {
    await delay(400)
    return ['g1', 'g6', 'g3'].slice(0, Math.max(1, files.length))
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ต้องเข้าสู่ระบบก่อนอัปโหลดรูป')

  const urls = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) continue
    if (file.size > 5 * 1024 * 1024) throw new Error(`ไฟล์ ${file.name} ใหญ่เกิน 5 MB`)

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${listingId}/${Date.now()}-${i}.${ext}`

    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(path, file, { cacheControl: '31536000', upsert: false })
    if (error) throw new Error(`อัปโหลดไม่สำเร็จ: ${error.message}`)

    const { data } = supabase.storage.from('listing-photos').getPublicUrl(path)
    urls.push(data.publicUrl)
    onProgress?.(i + 1, files.length)
  }
  return urls
}

export async function deleteListingPhoto(url) {
  if (!HAS_SUPABASE || !url?.startsWith('http')) return
  const marker = '/listing-photos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from('listing-photos').remove([path])
}

export async function createListing(payload) {
  if (!HAS_SUPABASE) { await delay(300); return { ok: true, id: 'RB-NEW', ...payload } }
  const prof = await myProfile()
  if (!prof) throw new Error('ต้องเข้าสู่ระบบก่อน')
  const id = 'RB-' + Math.floor(1000 + Math.random() * 9000)
  const row = {
    id,
    slug: (payload.title || id).toString().trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40) + '-' + id.slice(-4),
    owner_id: prof.id,
    title: payload.title || 'ประกาศใหม่',
    full_title: payload.title || 'ประกาศใหม่',
    type: payload.type,
    type_label: TYPE_LABELS[payload.type] || payload.type,
    district: payload.district,
    province: payload.province || 'กรุงเทพฯ',
    price: Number(payload.price) || 0,
    bedrooms: Number(payload.bedrooms) || 0,
    bathrooms: Number(payload.bathrooms) || 0,
    size_sqm: Number(payload.sizeSqm) || null,
    available_from: payload.availableFrom || 'ว่างแล้ว',
    min_lease_months: Number(payload.minLeaseMonths) || 12,
    deposit_months: Number(payload.depositMonths) || 2,
    description: payload.description || '',
    amenities: payload.amenities || [],
    photos: payload.photos?.length ? payload.photos : ['g1', 'g6', 'g3'],
    photo_count: payload.photos?.length || 3,
    status: 'pending',
    verified: prof.verified,
  }
  const { error } = await supabase.from('listings').insert(row)
  if (error) throw error
  return { ok: true, id }
}

// ===================================================================
// MEMBER
// ===================================================================
export async function getMemberProfile() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberProfile }
  const p = await myProfile()
  if (!p) return mock.memberProfile
  return { id: p.id, name: p.name, initial: p.initial, role: p.role, roleLabel: p.role_label, verified: p.verified, rating: p.rating }
}

export async function getMemberStats() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberStats }
  const p = await myProfile()
  if (!p) return mock.memberStats
  const [listings, viewings, contracts, txs] = await Promise.all([
    supabase.from('listings').select('status,views').eq('owner_id', p.id),
    supabase.from('viewings').select('id').eq('owner_id', p.id),
    supabase.from('contracts').select('id').eq('owner_id', p.id),
    supabase.from('transactions').select('amount,type,date_text').eq('owner_id', p.id),
  ])
  const L = listings.data || [], T = txs.data || []
  const income = T.filter((t) => t.type === 'in')
  const revenue = income.reduce((s, t) => s + (t.amount || 0), 0)
  const max = Math.max(1, ...income.map((t) => t.amount || 0))
  return {
    activeListings: L.filter((l) => l.status === 'live').length,
    pendingReview: L.filter((l) => l.status === 'pending').length,
    viewingsThisWeek: (viewings.data || []).length,
    viewingsDelta: 0,
    totalViews: L.reduce((s, l) => s + (l.views || 0), 0),
    viewsDeltaPct: 0,
    closedThisMonth: (contracts.data || []).length,
    revenueThisMonth: revenue,
    revenueDeltaPct: 0,
    revenueChart: income.slice(0, 6).map((t) => ({
      label: (t.date_text || '').split(' ')[1] || '—',
      value: Math.round(((t.amount || 0) / max) * 100),
    })),
  }
}

export async function getMemberTasks() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberTasks }
  const p = await myProfile()
  if (!p) return []
  const [vw, th, ls] = await Promise.all([
    supabase.from('viewings').select('*').eq('owner_id', p.id).eq('status', 'pending'),
    supabase.from('threads').select('*, messages(text)').eq('owner_id', p.id).gt('unread', 0),
    supabase.from('listings').select('*').eq('owner_id', p.id).in('status', ['pending', 'rejected']),
  ])
  const tasks = []
  for (const v of vw.data || [])
    tasks.push({ id: 'vw-' + v.id, kind: 'viewing', photo: 'g1', title: `${v.renter_name} ขอนัดชม — ${v.property}`, sub: `${v.when_text} · ผู้เช่ายืนยันตัวตนแล้ว ✓`, actions: [{ label: 'ยืนยันนัด', variant: 'ok' }, { label: 'เลื่อน', variant: 'outline' }] })
  for (const t of th.data || [])
    tasks.push({ id: 'th-' + t.id, kind: 'message', photo: t.photo || 'g3', title: `${t.from_name} ถามเรื่อง — ${t.property}`, sub: `"${t.messages?.[0]?.text || ''}" · ${t.time_text}`, actions: [{ label: '💬 ตอบกลับ', variant: 'primary' }] })
  for (const l of ls.data || [])
    tasks.push({ id: 'ls-' + l.id, kind: 'rejected', photo: (l.photos || [])[0] || 'g4', title: `${l.status === 'rejected' ? 'ประกาศถูกตีกลับ' : 'ประกาศรอตรวจสอบ'} — ${l.title}`, sub: l.status === 'rejected' ? 'แอดมินขอเอกสารเพิ่ม' : 'อยู่ระหว่างตรวจสอบ', actions: [{ label: '📎 แนบเอกสาร', variant: 'outline' }] })
  return tasks
}

export async function getMemberListings() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberListings }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('listings').select('*').eq('owner_id', p.id).order('created_at', { ascending: false })
  if (error) throw error
  const okStatus = { live: 'live', pending: 'pending', rented: 'rented', rejected: 'pending' }
  return (data || []).map((l) => ({
    id: l.id, photo: (l.photos || [])[0] || 'g1', title: l.title,
    sub: `${l.type_label} · ${l.district}${l.available_from ? ' · ' + l.available_from : ''}`,
    price: l.price, views: l.views || null, status: okStatus[l.status] || 'pending',
  }))
}

export async function getMemberViewings() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberViewings }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('viewings').select('*').eq('owner_id', p.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((v) => ({ id: v.id, name: v.renter_name, when: v.when_text, property: v.property, status: v.status }))
}

export async function getMemberMessages() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberMessages }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('threads').select('*, messages(is_me,text,created_at)').eq('owner_id', p.id).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((t) => ({
    id: t.id, from: t.from_name, photo: t.photo, property: t.property, unread: t.unread, time: t.time_text,
    msgs: (t.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((m) => ({ me: m.is_me, text: m.text })),
  }))
}

export async function getMemberContracts() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberContracts }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('contracts').select('*').eq('owner_id', p.id)
  if (error) throw error
  return (data || []).map((c) => ({ id: c.id, property: c.property, tenant: c.tenant, start: c.start_text, months: c.months, rent: c.rent, status: c.status }))
}

export async function getMemberTransactions() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberTransactions }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('transactions').select('*').eq('owner_id', p.id)
  if (error) throw error
  return (data || []).map((t) => ({ id: t.id, date: t.date_text, desc: t.descr, amount: t.amount, type: t.type }))
}

export async function getMemberReceipts() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberReceipts }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('receipts').select('*').eq('owner_id', p.id)
  if (error) throw error
  return (data || []).map((r) => ({ id: r.id, date: r.date_text, desc: r.descr, amount: r.amount }))
}

export async function getMemberReviews() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberReviewsList }
  const p = await myProfile()
  if (!p) return []
  const { data, error } = await supabase.from('reviews').select('*').eq('owner_id', p.id)
  if (error) throw error
  return (data || []).map((r) => ({ id: r.id, name: r.reviewer, stars: r.stars, text: r.text, time: r.time_text, property: r.property }))
}

// ===================================================================
// BOOKINGS / PAYMENTS  (จอง · มัดจำ · ชำระเงิน)
// ===================================================================

// คำนวณยอดที่ต้องจ่ายวันเข้าอยู่ (ค่าธรรมเนียม 1% ของค่าเช่าล่วงหน้า)
export function calcBooking(listing, months = 12) {
  const rent = listing?.price || 0
  const depositMonths = listing?.depositMonths ?? 2
  const advanceMonths = listing?.advanceMonths ?? 1
  const deposit = rent * depositMonths
  const advance = rent * advanceMonths
  const fee = Math.round(advance * 0.01)
  return { rent, months, depositMonths, advanceMonths, deposit, advance, fee, total: deposit + advance + fee }
}

// สร้างคำขอจอง — ผู้เช่ากดจากหน้าประกาศ
export async function createBooking({ listing, moveIn, months, occupants }) {
  if (!HAS_SUPABASE) { await delay(350); return { ok: true, id: 'BK-DEMO', demo: true } }
  const prof = await myProfile()
  if (!prof) throw new Error('ต้องเข้าสู่ระบบก่อนจอง')

  const c = calcBooking(listing, months)
  const { data, error } = await supabase.from('bookings').insert({
    listing_id: listing.id,
    renter_id: prof.id,
    owner_id: listing.owner?.id || null,
    move_in_text: moveIn,
    months: Number(months) || 12,
    occupants: Number(occupants) || 1,
    rent: c.rent, deposit: c.deposit, advance: c.advance, fee: c.fee, total: c.total,
    status: 'pending',
  }).select().maybeSingle()
  if (error) throw error
  return { ok: true, id: data.id, ...c }
}

export async function getMyBookings() {
  if (!HAS_SUPABASE) { await delay(); return [] }
  const prof = await myProfile()
  if (!prof) return []
  const { data, error } = await supabase
    .from('bookings')
    .select('*, listings(title, photos, district), payments(status, qr_url, amount)')
    .or(`renter_id.eq.${prof.id},owner_id.eq.${prof.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((b) => ({
    id: b.id,
    listingId: b.listing_id,
    title: b.listings?.title || b.listing_id,
    photo: (b.listings?.photos || [])[0] || 'g1',
    district: b.listings?.district,
    moveIn: b.move_in_text,
    months: b.months,
    rent: b.rent, deposit: b.deposit, advance: b.advance, fee: b.fee, total: b.total,
    status: b.status,
    isOwner: b.owner_id === prof.id,
    payment: b.payments?.[0] || null,
    createdAt: b.created_at,
  }))
}

// เจ้าของกดรับ/ปฏิเสธคำขอจอง
export async function respondBooking(id, accept = true) {
  if (!HAS_SUPABASE) { await delay(250); return { ok: true } }
  const { error } = await supabase.from('bookings')
    .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return { ok: true }
}

// เริ่มชำระเงิน — เรียก edge function omise-charge
export async function payBooking(bookingId, method = 'promptpay', token = null) {
  if (!HAS_SUPABASE) {
    await delay(500)
    return { ok: true, demo: true, status: 'pending', qrUrl: null,
      message: 'โหมดสาธิต — ยังไม่ได้เชื่อม Omise' }
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('ต้องเข้าสู่ระบบก่อน')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omise-charge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookingId, method, token, returnUri: `${window.location.origin}/member` }),
  })
  const out = await res.json()
  if (!res.ok) throw new Error(out.error || 'ชำระเงินไม่สำเร็จ')
  return out
}

// เช็กสถานะการชำระ (ใช้ polling ตอนรอสแกน PromptPay)
export async function getPaymentStatus(bookingId) {
  if (!HAS_SUPABASE) return null
  const { data } = await supabase
    .from('payments').select('status, qr_url, amount, paid_at')
    .eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data
}

// ===================================================================
// CONTRACTS — สัญญาเช่าดิจิทัล + e-signature
// ===================================================================

export async function createContractFromBooking(bookingId) {
  if (!HAS_SUPABASE) { await delay(300); return { ok: true, id: 'C-DEMO' } }
  const { data: b } = await supabase
    .from('bookings').select('*, listings(title, district, province, type_label)')
    .eq('id', bookingId).maybeSingle()
  if (!b) throw new Error('ไม่พบรายการจอง')

  const id = 'C-' + Date.now().toString().slice(-6)
  const body = buildContractText(b)
  const { error } = await supabase.from('contracts').insert({
    id,
    booking_id: b.id,
    listing_id: b.listing_id,
    owner_id: b.owner_id,
    renter_id: b.renter_id,
    property: b.listings?.title || b.listing_id,
    tenant: '',
    start_text: b.move_in_text,
    months: b.months,
    rent: b.rent,
    status: 'awaiting_signatures',
    body,
    terms: {
      deposit: b.deposit, advance: b.advance, fee: b.fee, total: b.total,
      district: b.listings?.district, province: b.listings?.province,
    },
  })
  if (error) throw error
  return { ok: true, id }
}

function buildContractText(b) {
  const t = b.listings || {}
  return `สัญญาเช่า${t.type_label || 'อสังหาริมทรัพย์'}

ทรัพย์ที่เช่า: ${t.title || b.listing_id}
ที่ตั้ง: ${t.district || '-'} ${t.province || ''}

1. ระยะเวลาเช่า ${b.months} เดือน เริ่ม ${b.move_in_text || '-'}
2. ค่าเช่าเดือนละ ${Number(b.rent).toLocaleString()} บาท ชำระทุกวันที่ 1 ของเดือน
3. เงินประกัน (มัดจำ) ${Number(b.deposit).toLocaleString()} บาท คืนเมื่อสิ้นสุดสัญญาและไม่มีความเสียหาย
4. ค่าเช่าล่วงหน้า ${Number(b.advance).toLocaleString()} บาท
5. ค่าน้ำ ค่าไฟ ผู้เช่าเป็นผู้ชำระตามมิเตอร์จริง
6. ผู้เช่าต้องดูแลรักษาทรัพย์ที่เช่า ห้ามดัดแปลงโครงสร้างโดยไม่ได้รับอนุญาต
7. ห้ามให้เช่าช่วงโดยไม่ได้รับความยินยอมเป็นลายลักษณ์อักษร
8. การบอกเลิกสัญญาก่อนกำหนดต้องแจ้งล่วงหน้าไม่น้อยกว่า 30 วัน
9. หากผิดนัดชำระเกิน 7 วัน ผู้ให้เช่ามีสิทธิ์บอกเลิกสัญญา
10. คู่สัญญาได้อ่านและเข้าใจข้อความข้างต้นโดยตลอดแล้ว จึงลงลายมือชื่อดิจิทัลไว้เป็นสำคัญ`
}

export async function getMyContracts() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberContracts }
  const prof = await myProfile()
  if (!prof) return []
  const { data, error } = await supabase.from('contracts').select('*')
    .or(`owner_id.eq.${prof.id},renter_id.eq.${prof.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((c) => ({
    id: c.id, property: c.property, tenant: c.tenant, start: c.start_text,
    months: c.months, rent: c.rent, status: c.status, body: c.body, terms: c.terms,
    isOwner: c.owner_id === prof.id,
    ownerSigned: Boolean(c.owner_signed_at),
    renterSigned: Boolean(c.renter_signed_at),
    ownerSignName: c.owner_sign_name, renterSignName: c.renter_sign_name,
  }))
}

// ลงนามดิจิทัล — พิมพ์ชื่อเต็มเพื่อยืนยัน (เก็บเวลาและฝ่ายที่ลง)
export async function signContract(id, fullName, asOwner) {
  if (!HAS_SUPABASE) { await delay(300); return { ok: true } }
  const now = new Date().toISOString()
  const patch = asOwner
    ? { owner_signed_at: now, owner_sign_name: fullName }
    : { renter_signed_at: now, renter_sign_name: fullName, tenant: fullName }
  const { error } = await supabase.from('contracts').update(patch).eq('id', id)
  if (error) throw error

  // ถ้าลงนามครบสองฝ่าย → สัญญามีผล
  const { data: c } = await supabase.from('contracts')
    .select('owner_signed_at, renter_signed_at').eq('id', id).maybeSingle()
  if (c?.owner_signed_at && c?.renter_signed_at) {
    await supabase.from('contracts').update({ status: 'active' }).eq('id', id)
  }
  return { ok: true }
}

// ===================================================================
// ADMIN
// ===================================================================
export async function getAdminStats() {
  if (!HAS_SUPABASE) { await delay(); return mock.adminStats }
  const [members, live, contracts, txs] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('contracts').select('rent'),
    supabase.from('transactions').select('amount,type,date_text'),
  ])
  const C = contracts.data || [], T = txs.data || []
  const fees = Math.abs(T.filter((t) => t.type === 'out').reduce((s, t) => s + (t.amount || 0), 0))
  const income = T.filter((t) => t.type === 'in')
  const max = Math.max(1, ...income.map((t) => t.amount || 0))
  const monthly = C.reduce((s, c) => s + (c.rent || 0), 0)
  return {
    totalMembers: members.count || 0, membersDelta: 0,
    activeListings: live.count || 0, listingsDeltaPct: 0,
    activeContracts: C.length, contractsValue: `฿${(monthly / 1e6).toFixed(1)}M / เดือน`,
    feesThisMonth: fees, feesDeltaPct: 0,
    feesWeek: fees, feesWeekDeltaPct: 0,
    feesChart: income.slice(0, 7).map((t) => ({
      label: (t.date_text || '').split(' ').slice(0, 2).join(' ') || '•',
      value: Math.round(((t.amount || 0) / max) * 100),
    })),
  }
}

export async function getReviewQueue() {
  if (!HAS_SUPABASE) { await delay(); return mock.adminReviewQueue }
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => ({
    id: r.id, photo: (r.photos || [])[0] || 'g4', title: r.title,
    meta: `${r.owner?.name || 'ผู้ใช้'} (${r.owner?.role_label || ''}) · ฿${(r.price || 0).toLocaleString()}/ด.`,
    flags: [r.owner?.verified ? { label: '✓ ยืนยันตัวตน', tone: 'live' } : { label: '🆕 ผู้ใช้ใหม่', tone: 'new' }],
  }))
}

export async function getDisputes() {
  if (!HAS_SUPABASE) { await delay(); return mock.adminDisputes }
  const { data, error } = await supabase.from('disputes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((d) => ({ id: d.id, title: d.title, detail: d.detail, status: d.status, statusLabel: d.status_label }))
}

export async function approveListing(id) {
  if (!HAS_SUPABASE) { await delay(300); return { ok: true, id, status: 'approved' } }
  const { error } = await supabase.from('listings').update({ status: 'live' }).eq('id', id)
  if (error) throw error
  return { ok: true, id, status: 'live' }
}

export async function rejectListing(id, reason = '') {
  if (!HAS_SUPABASE) { await delay(300); return { ok: true, id, status: 'rejected' } }
  const { error } = await supabase.from('listings').update({ status: 'rejected' }).eq('id', id)
  if (error) throw error
  return { ok: true, id, status: 'rejected', reason }
}

export async function getAdminKyc() {
  if (!HAS_SUPABASE) { await delay(); return mock.adminKycQueue }
  const { data, error } = await supabase.from('kyc_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((k) => ({ id: k.id, name: k.name, role: k.role_label, doc: k.doc, time: k.time_text, photo: k.photo }))
}

export async function getAdminMembers() {
  if (!HAS_SUPABASE) { await delay(); return mock.adminMembersList }
  const { data, error } = await supabase.from('profiles').select('*, listings(count)').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((m) => ({
    id: m.id.slice(0, 8), name: m.name, role: m.role_label,
    joined: m.created_at ? new Date(m.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' }) : '—',
    listings: m.listings?.[0]?.count || 0, status: 'active',
  }))
}

export async function getAdminListings() {
  if (!HAS_SUPABASE) { await delay(); return mock.listings }
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapListing)
}

export async function getAdminContracts() {
  if (!HAS_SUPABASE) { await delay(); return mock.memberContracts }
  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((c) => ({ id: c.id, property: c.property, tenant: c.tenant, start: c.start_text, months: c.months, rent: c.rent, status: c.status }))
}
