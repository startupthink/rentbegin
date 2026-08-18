// ===================================================================
// ค่าคงที่ของ UI — ไม่ใช่ข้อมูลตัวอย่าง
// (ข้อมูลจริงทั้งหมดมาจาก Supabase ผ่าน src/api/client.js)
// ===================================================================

export const PROPERTY_TYPES = [
  { id: 'all',       label: 'ทั้งหมด',    icon: '✨' },
  { id: 'condo',     label: 'คอนโด',      icon: '🏙️' },
  { id: 'house',     label: 'บ้านเดี่ยว',  icon: '🏡' },
  { id: 'townhouse', label: 'ทาวน์เฮาส์',  icon: '🏘️' },
  { id: 'rowhouse',  label: 'ห้องแถว',     icon: '🏚️' },
  { id: 'shophouse', label: 'ตึกแถว',      icon: '🏬' },
  { id: 'office',    label: 'ออฟฟิศ',      icon: '🏢' },
  { id: 'warehouse', label: 'โกดัง',       icon: '📦' },
  { id: 'land',      label: 'ที่ดิน',       icon: '🌾' },
]

export const AMENITIES = [
  { id: 'aircon',    label: 'แอร์',            icon: '❄️' },
  { id: 'furnished', label: 'เฟอร์ครบ',        icon: '🛋️' },
  { id: 'washer',    label: 'เครื่องซักผ้า',   icon: '🧺' },
  { id: 'bts',       label: 'ติดรถไฟฟ้า',      icon: '🚇' },
  { id: 'parking',   label: 'ที่จอดรถ',        icon: '🅿️' },
  { id: 'pet',       label: 'เลี้ยงสัตว์ได้',   icon: '🐾' },
  { id: 'pool',      label: 'สระว่ายน้ำ',      icon: '🏊' },
  { id: 'gym',       label: 'ฟิตเนส',          icon: '🏋️' },
  { id: 'security',  label: 'รปภ. 24 ชม.',     icon: '🛡️' },
]

// สีพื้นหลังสำรอง — ใช้เมื่อประกาศยังไม่มีรูปจริง
export const GRADIENTS = {
  g1: 'linear-gradient(140deg,#7bc6cc,#3a8fb7 60%,#2b5f8e)',
  g2: 'linear-gradient(140deg,#ffd08a,#f2915c 55%,#d4653f)',
  g3: 'linear-gradient(140deg,#b8e3a8,#5eb87f 60%,#2f8f63)',
  g4: 'linear-gradient(140deg,#c9b6f2,#8b6fd6 60%,#5f4bab)',
  g5: 'linear-gradient(140deg,#ffb3bd,#ff6b7f 60%,#d63f5c)',
  g6: 'linear-gradient(140deg,#a8d8f2,#5b9fd6 60%,#3a6fa8)',
  g7: 'linear-gradient(140deg,#f2d99b,#d6b25b 60%,#a68539)',
  g8: 'linear-gradient(140deg,#9fdcd6,#4fb3ab 60%,#2d8a83)',
}
