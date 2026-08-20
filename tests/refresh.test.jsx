import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoRefresh } from '../src/lib/useAutoRefresh'

describe('Auto refresh เมื่อกลับมาที่หน้า', () => {
  it('ยิง refetch เมื่อหน้าต่างได้ focus', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { minIntervalMs: 0 }))
    act(() => { window.dispatchEvent(new Event('focus')) })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ยิง refetch เมื่อสลับแท็บกลับมา', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { minIntervalMs: 0 }))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(fn).toHaveBeenCalled()
  })

  it('ยิง refetch เมื่อกดย้อนกลับ (bfcache)', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { minIntervalMs: 0 }))
    const e = new Event('pageshow')
    Object.defineProperty(e, 'persisted', { value: true })
    act(() => { window.dispatchEvent(e) })
    expect(fn).toHaveBeenCalled()
  })

  it('กันยิงรัว — ภายในช่วงเวลาที่กำหนดยิงครั้งเดียว', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(fn, { minIntervalMs: 5000 }))
    act(() => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ถอด listener เมื่อ unmount', () => {
    const fn = vi.fn()
    const { unmount } = renderHook(() => useAutoRefresh(fn, { minIntervalMs: 0 }))
    unmount()
    act(() => { window.dispatchEvent(new Event('focus')) })
    expect(fn).not.toHaveBeenCalled()
  })
})
