import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---- mock Supabase ให้ไม่ยิงเน็ตจริง ----
vi.mock('../src/lib/supabase', () => ({
  HAS_SUPABASE: false,
  supabase: null,
}))

import App from '../src/App'
import { AuthProvider } from '../src/context/AuthContext'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>
  )
}

describe('ทุกหน้าเรนเดอร์ได้โดยไม่ crash', () => {
  const errors = []
  beforeEach(() => {
    errors.length = 0
    vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')))
  })

  it('หน้าแรก', async () => {
    renderAt('/')
    await waitFor(() => expect(screen.getByText(/บ้านหลังต่อไป/)).toBeInTheDocument())
  })

  it('หน้าเข้าสู่ระบบ', async () => {
    renderAt('/login')
    expect(screen.getAllByText(/เข้าสู่ระบบ/).length).toBeGreaterThan(0)
  })

  it('หน้านโยบายความเป็นส่วนตัว', () => {
    renderAt('/privacy')
    expect(screen.getByText('นโยบายความเป็นส่วนตัว')).toBeInTheDocument()
  })

  it('หน้าข้อกำหนด', () => {
    renderAt('/terms')
    expect(screen.getByText('ข้อกำหนดการใช้บริการ')).toBeInTheDocument()
  })

  it('หน้าที่บันทึกไว้', async () => {
    renderAt('/saved')
    await waitFor(() => expect(screen.getByText(/ที่บันทึกไว้/)).toBeInTheDocument())
  })

  it('หน้าประกาศที่ไม่มีอยู่ → แสดงข้อความไม่พบ ไม่จอขาว', async () => {
    renderAt('/property/NOT-EXIST')
    await waitFor(() => expect(screen.getByText('ไม่พบประกาศนี้')).toBeInTheDocument())
  })

  it('route มั่วๆ → เด้งกลับหน้าแรก', async () => {
    renderAt('/abcxyz')
    await waitFor(() => expect(screen.getByText(/บ้านหลังต่อไป/)).toBeInTheDocument())
  })
})

describe('ตัวกรองหน้าแรกทำงาน', () => {
  it('กดชิปประเภทแล้วไม่ crash', async () => {
    renderAt('/')
    await waitFor(() => screen.getByText(/บ้านหลังต่อไป/))
    const chip = screen.getAllByText('ห้องแถว')[0]
    fireEvent.click(chip)
    await waitFor(() => expect(screen.getAllByText('ห้องแถว').length).toBeGreaterThan(0))
  })

  it('เปิดแผงตัวกรองได้', async () => {
    renderAt('/')
    await waitFor(() => screen.getByText(/บ้านหลังต่อไป/))
    fireEvent.click(screen.getByText(/⚙ ตัวกรอง/))
    // "สิ่งอำนวยความสะดวก" มีเฉพาะในแผงตัวกรอง
    await waitFor(() => expect(screen.getByText('สิ่งอำนวยความสะดวก')).toBeInTheDocument())
  })

  it('ค้นหาด้วยฟอร์ม hero ได้', async () => {
    renderAt('/')
    await waitFor(() => screen.getByText(/บ้านหลังต่อไป/))
    fireEvent.change(screen.getByLabelText('ทำเล'), { target: { value: 'รัชดา' } })
    fireEvent.click(screen.getByText('🔍 ค้นหา'))
    await waitFor(() => expect(screen.getByText(/ค้นหา: รัชดา/)).toBeInTheDocument())
  })
})
