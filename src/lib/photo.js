import { GRADIENTS } from '../data/mock'

// ===================================================================
// ตัวช่วยแสดงรูป — รองรับทั้ง URL จริง (Supabase Storage)
// และ gradient key เดิม (g1..g8) เพื่อให้ประกาศเก่ายังแสดงได้
// ===================================================================

export const isPhotoUrl = (p) => typeof p === 'string' && p.startsWith('http')

// style สำหรับ div พื้นหลัง — ใช้ได้ทั้งสองแบบ
export function photoStyle(p) {
  if (isPhotoUrl(p)) {
    return {
      backgroundImage: `url(${p})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { background: GRADIENTS[p] || GRADIENTS.g1 }
}
