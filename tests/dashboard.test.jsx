import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../src/lib/supabase', () => ({ HAS_SUPABASE: false, supabase: null }))

// ---- mock ข้อมูลสมาชิกให้เหมือนล็อกอินแล้ว ----
const LISTINGS = [
  { id: 'RB-1001', photo: 'g1', title: 'คอนโดทดสอบ', sub: 'คอนโด · ห้วยขวาง', price: 15000, views: 120, status: 'live' },
  { id: 'RB-1002', photo: 'g2', title: 'บ้านทดสอบ', sub: 'บ้านเดี่ยว · นนท์', price: 28000, views: null, status: 'pending' },
]
vi.mock('../src/api/client', async () => {
  const actual = await vi.importActual('../src/api/client')
  const { vi: v } = await import('vitest')
  const spies = {
    deleteListing: v.fn(async () => ({ ok: true })),
    setListingStatus: v.fn(async () => ({ ok: true })),
    updateListing: v.fn(async () => ({ ok: true })),
  }
  globalThis.__spies = spies
  return {
    ...actual,
    getMemberProfile: async () => ({ id: 'p1', name: 'คุณทดสอบ', initial: 'ท', role: 'owner', roleLabel: 'เจ้าของ', verified: true, rating: 4.8 }),
    getMemberStats: async () => ({
      activeListings: 1, pendingReview: 1, viewingsThisWeek: 0, viewingsDelta: 0,
      totalViews: 120, viewsDeltaPct: 0, closedThisMonth: 0,
      revenueThisMonth: 0, revenueDeltaPct: 0, revenueChart: [],
    }),
    getMemberTasks: async () => [],
    getMemberListings: async () => LISTINGS,
    getMemberViewings: async () => [],
    getMyBookings: async () => [],
    getMemberMessages: async () => [],
    getMemberContracts: async () => [],
    getMyContracts: async () => [],
    getMemberTransactions: async () => [],
    getMemberReceipts: async () => [{ id: 'RC-1', date: '1 ส.ค. 2569', desc: 'ค่าเช่า', amount: 15000 }],
    getMemberReviews: async () => [],
    ...spies,
    getListingForEdit: async (id) => ({
      id, title: 'คอนโดทดสอบ', type: 'condo', listingType: 'rent', salePrice: '',
      district: 'ห้วยขวาง', province: 'กรุงเทพฯ', price: 15000, bedrooms: 1, bathrooms: 1,
      sizeSqm: 30, availableFrom: 'ว่างแล้ว', minLeaseMonths: 12, depositMonths: 2,
      description: 'ทดสอบ', amenities: ['aircon'], rooms: ['living'],
      floorNo: '', totalFloors: '', contactPhone: '', contactLine: '', photos: [], status: 'live',
    }),
  }
})

import Member from '../src/pages/Member'
import { AuthProvider } from '../src/context/AuthContext'
import { SavedProvider } from '../src/context/SavedContext'
const { deleteListing: deleteSpy, setListingStatus: statusSpy, updateListing: updateSpy } = globalThis.__spies

const renderMember = () => render(
  <MemoryRouter>
    <AuthProvider><SavedProvider><Member /></SavedProvider></AuthProvider>
  </MemoryRouter>
)

describe('แดชบอร์ดสมาชิก', () => {
  beforeEach(() => { deleteSpy.mockClear(); statusSpy.mockClear(); updateSpy.mockClear() })

  it('โหลดแล้วแสดงชื่อผู้ใช้', async () => {
    renderMember()
    await waitFor(() => expect(screen.getByText(/สวัสดี คุณทดสอบ/)).toBeInTheDocument())
  })

  it('มีแท็บครบทุกอัน', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    for (const t of ['ประกาศของฉัน', 'นัดชม', 'การจอง / มัดจำ', 'สัญญาเช่า', 'ใบเสร็จ', 'ตั้งค่า']) {
      expect(screen.getAllByText(new RegExp(t)).length).toBeGreaterThan(0)
    }
  })

  it('แท็บประกาศของฉัน → แสดงรายการ + ปุ่มแก้ไข/ลบ', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => expect(screen.getByText('คอนโดทดสอบ')).toBeInTheDocument())
    expect(screen.getAllByTitle('แก้ไข').length).toBe(2)
    expect(screen.getAllByTitle('ลบประกาศ').length).toBe(2)
    expect(screen.getAllByTitle('ดูหน้าประกาศ').length).toBe(2)
  })

  it('กดลบ → ต้องยืนยันก่อน แล้วจึงลบจริง', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))

    fireEvent.click(screen.getAllByTitle('ลบประกาศ')[0])
    await waitFor(() => expect(screen.getByText(/ถาวร\?/)).toBeInTheDocument())
    expect(deleteSpy).not.toHaveBeenCalled()   // ยังไม่ลบจนกว่าจะยืนยัน

    fireEvent.click(screen.getByText('ยืนยันลบ'))
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('RB-1001'))
  })

  it('กดยกเลิกในกล่องยืนยัน → ไม่ลบ', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getAllByTitle('ลบประกาศ')[0])
    await waitFor(() => screen.getByText('ยกเลิก'))
    fireEvent.click(screen.getByText('ยกเลิก'))
    await waitFor(() => expect(screen.queryByText('ยืนยันลบ')).toBeNull())
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('กดปุ่มปล่อยเช่าแล้ว → เปลี่ยนสถานะ', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getByTitle('ทำเครื่องหมายว่าปล่อยเช่าแล้ว'))
    await waitFor(() => expect(statusSpy).toHaveBeenCalledWith('RB-1001', 'rented'))
  })

  it('กดแก้ไข → ฟอร์มเปิดพร้อมข้อมูลเดิม', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getAllByTitle('แก้ไข')[0])
    await waitFor(() => expect(screen.getByText('แก้ไขประกาศ')).toBeInTheDocument())
    expect(screen.getByLabelText('ชื่อประกาศ *')).toHaveValue('คอนโดทดสอบ')
  })

  it('ฟอร์มลงประกาศใหม่ มีโหมดขายและตัวเลือกห้อง', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getByText('+ ลงประกาศใหม่'))
    await waitFor(() => expect(screen.getByText('ประกาศนี้ต้องการ')).toBeInTheDocument())
    expect(screen.getByText(/🏷️ ขาย/)).toBeInTheDocument()
    expect(screen.getByText(/🤝 เช่าหรือขาย/)).toBeInTheDocument()
    expect(screen.getByText(/ห้องนั่งเล่น/)).toBeInTheDocument()
    expect(screen.getByText(/ห้องครัว/)).toBeInTheDocument()
    expect(screen.getByText(/ระเบียง/)).toBeInTheDocument()
  })

  it('เลือกโหมดขาย → ขั้นที่ 3 มีช่องราคาขาย', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getByText('+ ลงประกาศใหม่'))
    await waitFor(() => screen.getByText('ประกาศนี้ต้องการ'))
    fireEvent.click(screen.getByText(/🏷️ ขาย/))
    fireEvent.click(screen.getByText(/ราคา & เงื่อนไข/))
    await waitFor(() => expect(screen.getByLabelText('ราคาขาย (฿)')).toBeInTheDocument())
  })

  it('บันทึกโดยไม่กรอกชื่อ → เตือน ไม่ยิง API', async () => {
    renderMember()
    await waitFor(() => screen.getByText(/สวัสดี/))
    fireEvent.click(screen.getAllByText('ประกาศของฉัน')[0])
    await waitFor(() => screen.getByText('คอนโดทดสอบ'))
    fireEvent.click(screen.getAllByTitle('แก้ไข')[0])
    await waitFor(() => screen.getByText('แก้ไขประกาศ'))
    fireEvent.change(screen.getByLabelText('ชื่อประกาศ *'), { target: { value: '' } })
    fireEvent.click(screen.getByText(/ราคา & เงื่อนไข/))
    fireEvent.click(screen.getByText('💾 บันทึกการแก้ไข'))
    await waitFor(() => expect(screen.getByText(/กรุณาใส่ชื่อประกาศ/)).toBeInTheDocument())
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
