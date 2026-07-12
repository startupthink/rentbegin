// ===================================================================
// API CLIENT
// ตอนนี้ USE_MOCK = true → ดึงจาก src/data/mock.js
//
// เวลาต่อ backend จริง (Express + Prisma):
//   1. เปลี่ยน USE_MOCK เป็น false
//   2. ตั้ง VITE_API_URL ใน .env
//   3. เขียน endpoint ฝั่ง Express ให้ตรงกับ path ข้างล่าง
// component ทุกตัวเรียกผ่านไฟล์นี้ ไม่ต้องแก้อะไรอีก
// ===================================================================

import * as mock from '../data/mock'

const USE_MOCK = true
const BASE = import.meta.env.VITE_API_URL || ''

// จำลอง network latency ให้เห็น loading state
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))

async function http(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json()
}

// ---------- Listings ----------

// GET /api/listings?type=condo&q=รัชดา
export async function getListings({ type = 'all', q = '' } = {}) {
  if (USE_MOCK) {
    await delay()
    let out = mock.listings
    if (type !== 'all') out = out.filter((l) => l.type === type)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      out = out.filter(
        (l) =>
          l.title.toLowerCase().includes(k) ||
          l.district.toLowerCase().includes(k) ||
          l.province.toLowerCase().includes(k)
      )
    }
    return out
  }
  const params = new URLSearchParams({ type, q })
  return http(`/api/listings?${params}`)
}

// GET /api/listings/:id
export async function getListing(id) {
  if (USE_MOCK) {
    await delay(180)
    const found = mock.listings.find((l) => l.id === id || l.slug === id)
    if (!found) throw new Error('ไม่พบประกาศนี้')
    return found
  }
  return http(`/api/listings/${id}`)
}

// POST /api/listings
export async function createListing(payload) {
  if (USE_MOCK) {
    await delay(400)
    return { ok: true, id: 'RB-NEW', ...payload }
  }
  return http('/api/listings', { method: 'POST', body: JSON.stringify(payload) })
}

// ---------- Member ----------

// GET /api/me
export async function getMemberProfile() {
  if (USE_MOCK) { await delay(120); return mock.memberProfile }
  return http('/api/me')
}

// GET /api/me/stats
export async function getMemberStats() {
  if (USE_MOCK) { await delay(160); return mock.memberStats }
  return http('/api/me/stats')
}

// GET /api/me/tasks
export async function getMemberTasks() {
  if (USE_MOCK) { await delay(160); return mock.memberTasks }
  return http('/api/me/tasks')
}

// GET /api/me/listings
export async function getMemberListings() {
  if (USE_MOCK) { await delay(160); return mock.memberListings }
  return http('/api/me/listings')
}

// GET /api/me/viewings
export async function getMemberViewings() {
  if (USE_MOCK) { await delay(160); return mock.memberViewings }
  return http('/api/me/viewings')
}

// ---------- Admin ----------

// GET /api/admin/stats
export async function getAdminStats() {
  if (USE_MOCK) { await delay(160); return mock.adminStats }
  return http('/api/admin/stats')
}

// GET /api/admin/review-queue
export async function getReviewQueue() {
  if (USE_MOCK) { await delay(180); return mock.adminReviewQueue }
  return http('/api/admin/review-queue')
}

// GET /api/admin/disputes
export async function getDisputes() {
  if (USE_MOCK) { await delay(160); return mock.adminDisputes }
  return http('/api/admin/disputes')
}

// POST /api/admin/listings/:id/approve
export async function approveListing(id) {
  if (USE_MOCK) { await delay(300); return { ok: true, id, status: 'approved' } }
  return http(`/api/admin/listings/${id}/approve`, { method: 'POST' })
}

// POST /api/admin/listings/:id/reject
export async function rejectListing(id, reason = '') {
  if (USE_MOCK) { await delay(300); return { ok: true, id, status: 'rejected' } }
  return http(`/api/admin/listings/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
