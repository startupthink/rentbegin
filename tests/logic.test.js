import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/lib/supabase', () => ({ HAS_SUPABASE: false, supabase: null }))
import { calcBooking } from '../src/api/client'
import { photoStyle, isPhotoUrl } from '../src/lib/photo'
import { PROPERTY_TYPES, ROOM_FEATURES, APPLIANCES, LISTING_TYPES, BUDGET_RANGES, BEDROOM_OPTIONS, AMENITIES } from '../src/data/constants'

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
  it('หมวดห้อง มีเฉพาะห้อง/พื้นที่ ไม่มีเครื่องใช้ไฟฟ้า', () => {
    const ids = ROOM_FEATURES.map((r) => r.id)
    expect(ids).toContain('living')    // ห้องนั่งเล่น
    expect(ids).toContain('kitchen')   // ห้องครัว
    expect(ids).toContain('balcony')
    // ต้องไม่มีเครื่องใช้ไฟฟ้า/ของใช้ปนอยู่
    for (const bad of ['bathtub', 'waterheat', 'aircon', 'washer', 'furnished', 'tv', 'fridge']) {
      expect(ids, `ROOM_FEATURES ไม่ควรมี ${bad}`).not.toContain(bad)
    }
    expect(ROOM_FEATURES.length).toBeGreaterThanOrEqual(10)
  })

  it('หมวดเครื่องใช้ไฟฟ้า แยกออกมาแล้วและครบ', () => {
    const ids = APPLIANCES.map((a) => a.id)
    for (const need of ['aircon', 'washer', 'fridge', 'tv', 'waterheat', 'bathtub', 'furnished', 'microwave', 'stove']) {
      expect(ids, `APPLIANCES ต้องมี ${need}`).toContain(need)
    }
    expect(APPLIANCES.length).toBeGreaterThanOrEqual(12)
  })

  it('หมวดสิ่งอำนวยความสะดวก เป็นของส่วนกลาง/ทำเล เท่านั้น', () => {
    const ids = AMENITIES.map((a) => a.id)
    expect(ids).toContain('pool')
    expect(ids).toContain('gym')
    expect(ids).toContain('bts')
    // เครื่องใช้ไฟฟ้าต้องไม่อยู่ในหมวดนี้แล้ว
    for (const bad of ['aircon', 'washer', 'furnished', 'waterheat', 'bathtub']) {
      expect(ids, `AMENITIES ไม่ควรมี ${bad}`).not.toContain(bad)
    }
  })

  it('3 หมวดไม่มี id ทับซ้อนกัน', () => {
    const r = new Set(ROOM_FEATURES.map((x) => x.id))
    const a = new Set(APPLIANCES.map((x) => x.id))
    const m = new Set(AMENITIES.map((x) => x.id))
    for (const id of r) {
      expect(a.has(id), `${id} ซ้ำระหว่างห้องกับเครื่องใช้ไฟฟ้า`).toBe(false)
      expect(m.has(id), `${id} ซ้ำระหว่างห้องกับส่วนกลาง`).toBe(false)
    }
    for (const id of a) {
      expect(m.has(id), `${id} ซ้ำระหว่างเครื่องใช้ไฟฟ้ากับส่วนกลาง`).toBe(false)
    }
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
    for (const list of [PROPERTY_TYPES, ROOM_FEATURES, APPLIANCES, AMENITIES, LISTING_TYPES, BUDGET_RANGES, BEDROOM_OPTIONS]) {
      const ids = list.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
