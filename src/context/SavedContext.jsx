import { createContext, useContext, useEffect, useState } from 'react'

// ===================================================================
// "ตะกร้า" รายการที่บันทึก — เก็บ id ประกาศที่ผู้ใช้กดหัวใจ
// เก็บใน localStorage → ปิดเบราว์เซอร์แล้วกลับมา รายการยังอยู่
// เวลาต่อ backend จริง: ย้ายไปเก็บที่ /api/me/saved แทน
// ===================================================================

const KEY = 'rentbegin_saved'
const SavedContext = createContext(null)

export function SavedProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids))
    } catch {
      /* private mode ฯลฯ — ใช้ต่อแบบ in-memory */
    }
  }, [ids])

  const isSaved = (id) => ids.includes(id)
  const toggle = (id) =>
    setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const remove = (id) => setIds((s) => s.filter((x) => x !== id))
  const clear = () => setIds([])

  return (
    <SavedContext.Provider value={{ ids, count: ids.length, isSaved, toggle, remove, clear }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  const ctx = useContext(SavedContext)
  if (!ctx) throw new Error('useSaved ต้องอยู่ใน <SavedProvider>')
  return ctx
}
