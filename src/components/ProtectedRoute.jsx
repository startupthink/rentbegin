import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ===================================================================
// ป้องกันหน้า — ต้องล็อกอินก่อน (และเป็น admin ถ้า requireAdmin)
// ===================================================================

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthed, isAdmin, loading, hasSupabase } = useAuth()
  const loc = useLocation()

  // ยังไม่ตั้งค่า Supabase → ปล่อยผ่าน (โหมด mock เดิม จะได้ดู UI ได้)
  if (!hasSupabase) return children

  if (loading) return <div className="spin" />

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/member" replace />
  }
  return children
}
