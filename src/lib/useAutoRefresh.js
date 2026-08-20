import { useEffect, useRef } from 'react'

// ===================================================================
// ดึงข้อมูลใหม่อัตโนมัติเมื่อผู้ใช้กลับมาที่หน้า
// - สลับแท็บกลับมา (visibilitychange)
// - กลับมาที่หน้าต่างเบราว์เซอร์ (focus)
// - กดปุ่มย้อนกลับแล้วหน้าถูกกู้จาก bfcache (pageshow persisted)
//
// แก้ปัญหา "แก้ข้อมูลแล้วกลับมาหน้าเดิมยังเห็นของเก่า"
// ===================================================================

export function useAutoRefresh(refetch, { minIntervalMs = 1500 } = {}) {
  const fnRef = useRef(refetch)
  const lastRef = useRef(0)
  fnRef.current = refetch

  useEffect(() => {
    // กันเรียกรัวเกินไป (เช่น focus + visibility ยิงพร้อมกัน)
    const run = () => {
      const now = Date.now()
      if (now - lastRef.current < minIntervalMs) return
      lastRef.current = now
      fnRef.current?.()
    }

    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    const onPageShow = (e) => { if (e.persisted) run() }

    window.addEventListener('focus', run)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('focus', run)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [minIntervalMs])
}
