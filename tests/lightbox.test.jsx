import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
vi.mock('../src/lib/supabase', () => ({ HAS_SUPABASE: false, supabase: null }))
import Lightbox from '../src/components/Lightbox'

const PHOTOS = ['https://x.co/1.jpg', 'https://x.co/2.jpg', 'g3']

describe('Lightbox ดูรูปเต็มจอ', () => {
  it('เปิดแล้วแสดงรูปแรกและจำนวนถูกต้อง', () => {
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={() => {}} />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('กดถัดไป → เลื่อนรูป', () => {
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('รูปถัดไป'))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('กดก่อนหน้าที่รูปแรก → วนไปรูปสุดท้าย', () => {
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('รูปก่อนหน้า'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('ลูกศรคีย์บอร์ดใช้ได้', () => {
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('กด ESC → เรียก onClose', () => {
    const onClose = vi.fn()
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('กดปุ่มปิด → เรียก onClose', () => {
    const onClose = vi.fn()
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('ปิด'))
    expect(onClose).toHaveBeenCalled()
  })

  it('กด thumbnail → ไปรูปนั้น', () => {
    render(<Lightbox photos={PHOTOS} startIndex={0} onClose={() => {}} />)
    fireEvent.click(screen.getByLabelText('ไปรูปที่ 3'))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('รูปเดียว → ไม่มีปุ่มเลื่อน ไม่ crash', () => {
    render(<Lightbox photos={['g1']} startIndex={0} onClose={() => {}} />)
    expect(screen.queryByLabelText('รูปถัดไป')).toBeNull()
  })

  it('ไม่มีรูปเลย → ไม่ crash', () => {
    const { container } = render(<Lightbox photos={[]} onClose={() => {}} />)
    expect(container).toBeTruthy()
  })

  it('gradient key แสดงได้ ไม่ใช่แค่ URL', () => {
    render(<Lightbox photos={['g3']} startIndex={0} onClose={() => {}} />)
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })
})
