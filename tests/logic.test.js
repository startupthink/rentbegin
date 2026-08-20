import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/lib/supabase', () => ({ HAS_SUPABASE: false, supabase: null }))
import { calcBooking } from '../src/api/client'
import { photoStyle, isPhotoUrl } from '../src/lib/photo'
import { PROPERTY_TYPES, ROOM_FEATURES, LISTING_TYPES, BUDGET_RANGES, BEDROOM_OPTIONS, AMENITIES } from '../src/data/constants'

describe('คำนวณยอดจอง', () => {
  it('ค่าเช่า 15000 มัดจำ 2 ล่วงหน้า 1 → รวมถูกต้อง', () => {
    const c = calcBooking({ price: 15000, depositMonths: 2, advanceMonths: 1 }, 12)
    expect(c.deposit).toBe(30000)
    expect(c.advance).toBe(15000)
    expect(c.fee).toBe(150)            // 1% ของค่าเช่าล่วงหน้า
    expect(c.total).toBe(45150)
  })
  it('ไม่ระบุค่า → ใช้ค่าเริ่มต้น ไม่ NaN', () => {
    const c = calcBooking(null)
    expect(c.total).toBe(0)
    expect(Number.isNaN(c.total)).toBe(false)
  })
  it('ค่าเช่าเป็น 0 → ไม่พัง', () => {
    const c = calcBooking({ price: 0 }, 12)
    expect(c.total).toBe(0)
  })
})

describe('ตัวช่วยรูปภาพ', () => {
  it('URL จริง → ใช้ backgroundImage', () => {
    const st = photoStyle('https://x.supabase.co/a.jpg')
    expect(st.backgroundImage).toContain('https://x.supabase.co/a.jpg')
    expect(st.backgroundSize).toBe('cover')
  })
  it('gradient key เดิม → ยังใช้ได้', () => {
    expect(photoStyle('g3').background).toContain('linear-gradient')
  })
  it('ค่าว่าง/undefined → fallback ไม่พัง', () => {
    expect(photoStyle(undefined).background).toContain('linear-gradient')
    expect(photoStyle(null).background).toContain('linear-gradient')
  })
  it('isPhotoUrl แยกถูก', () => {
    expect(isPhotoUrl('https://a.com/x.png')).toBe(true)
    expect(isPhotoUrl('g1')).toBe(false)
    expect(isPhotoUrl(undefined)).toBe(false)
  })
})

describe('ค่าคงที่ครบถ้วน', () => {
  it('มีห้องแถวในประเภททรัพย์', () => {
    expect(PROPERTY_TYPES.find((t) => t.id === 'rowhouse')?.label).toBe('ห้องแถว')
  })
  it('มีตัวเลือกห้องที่ผู้ใช้ขอ', () => {
    const ids = ROOM_FEATURES.map((r) => r.id)
    expect(ids).toContain('living')    // ห้องนั่งเล่น
    expect(ids).toContain('kitchen')   // ห้องครัว
    expect(ids).toContain('bathtub')
    expect(ROOM_FEATURES.length).toBeGreaterThanOrEqual(10)
  })
  it('มีโหมดเช่า/ขาย/ทั้งสอง', () => {
    expect(LISTING_TYPES.map((l) => l.id)).toEqual(['rent', 'sale', 'both'])
  })
  it('ช่วงราคาเรียงถูกและไม่ทับซ้อนผิด', () => {
    const real = BUDGET_RANGES.filter((b) => b.id !== 'any')
    real.forEach((b) => {
      if (b.max != null) expect(b.max).toBeGreaterThan(b.min)
    })
  })
  it('ตัวเลือกห้องนอนมีค่า min ถูกต้อง', () => {
    expect(BEDROOM_OPTIONS.find((b) => b.id === 'any').min).toBe(null)
    expect(BEDROOM_OPTIONS.find((b) => b.id === '2').min).toBe(2)
  })
  it('id ทุกชุดไม่ซ้ำ', () => {
    for (const list of [PROPERTY_TYPES, ROOM_FEATURES, AMENITIES, LISTING_TYPES, BUDGET_RANGES, BEDROOM_OPTIONS]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
