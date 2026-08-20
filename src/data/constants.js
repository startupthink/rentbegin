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

// สิ่งอำนวยความสะดวกของโครงการ / ทำเล (ไม่ใช่ของในห้อง)
export const AMENITIES = [
  { id: 'bts',       label: 'ติดรถไฟฟ้า',     icon: '🚇' },
  { id: 'parking',   label: 'ที่จอดรถ',       icon: '🅿️' },
  { id: 'pet',       label: 'เลี้ยงสัตว์ได้',  icon: '🐾' },
  { id: 'pool',      label: 'สระว่ายน้ำ',     icon: '🏊' },
  { id: 'gym',       label: 'ฟิตเนส',         icon: '🏋️' },
  { id: 'security',  label: 'รปภ. 24 ชม.',    icon: '🛡️' },
  { id: 'cctv',      label: 'กล้องวงจรปิด',   icon: '📹' },
  { id: 'lift',      label: 'ลิฟต์',          icon: '🛗' },
  { id: 'coworking', label: 'Co-working',     icon: '💼' },
  { id: 'market',    label: 'ใกล้ตลาด/ร้านค้า', icon: '🏪' },
  { id: 'school',    label: 'ใกล้โรงเรียน',    icon: '🏫' },
  { id: 'hospital',  label: 'ใกล้โรงพยาบาล',  icon: '🏥' },
]

// เครื่องใช้ไฟฟ้าและเฟอร์นิเจอร์ในห้อง
export const APPLIANCES = [
  { id: 'furnished',  label: 'เฟอร์นิเจอร์ครบ',  icon: '🛋️' },
  { id: 'aircon',     label: 'เครื่องปรับอากาศ', icon: '❄️' },
  { id: 'waterheat',  label: 'เครื่องทำน้ำอุ่น', icon: '🚿' },
  { id: 'washer',     label: 'เครื่องซักผ้า',    icon: '🧺' },
  { id: 'fridge',     label: 'ตู้เย็น',          icon: '🧊' },
  { id: 'tv',         label: 'โทรทัศน์',         icon: '📺' },
  { id: 'microwave',  label: 'ไมโครเวฟ',        icon: '📡' },
  { id: 'stove',      label: 'เตาไฟฟ้า/แก๊ส',   icon: '🔥' },
  { id: 'hood',       label: 'เครื่องดูดควัน',   icon: '💨' },
  { id: 'oven',       label: 'เตาอบ',           icon: '🍞' },
  { id: 'dishwasher', label: 'เครื่องล้างจาน',   icon: '🍽️' },
  { id: 'bathtub',    label: 'อ่างอาบน้ำ',       icon: '🛁' },
  { id: 'bed',        label: 'เตียง + ที่นอน',   icon: '🛏️' },
  { id: 'wardrobe',   label: 'ตู้เสื้อผ้า',      icon: '👔' },
  { id: 'desk',       label: 'โต๊ะทำงาน',        icon: '🪑' },
  { id: 'internet',   label: 'อินเทอร์เน็ต/WiFi', icon: '📶' },
]

// ประเภทประกาศ — เช่า / ขาย / ทั้งสอง
export const LISTING_TYPES = [
  { id: 'rent', label: 'ให้เช่า',      icon: '🔑', short: 'เช่า' },
  { id: 'sale', label: 'ขาย',          icon: '🏷️', short: 'ขาย' },
  { id: 'both', label: 'เช่าหรือขาย',  icon: '🤝', short: 'เช่า/ขาย' },
]

// ห้องและพื้นที่ใช้สอย — เฉพาะ "ห้อง/พื้นที่" เท่านั้น
// (เครื่องใช้ไฟฟ้าอยู่ใน APPLIANCES · ส่วนกลางอยู่ใน AMENITIES)
export const ROOM_FEATURES = [
  { id: 'living',   label: 'ห้องนั่งเล่น',    icon: '🛋️' },
  { id: 'kitchen',  label: 'ห้องครัว',        icon: '🍳' },
  { id: 'dining',   label: 'ห้องอาหาร',       icon: '🍽️' },
  { id: 'workroom', label: 'ห้องทำงาน',       icon: '💻' },
  { id: 'storage',  label: 'ห้องเก็บของ',     icon: '📦' },
  { id: 'maidroom', label: 'ห้องแม่บ้าน',     icon: '🚪' },
  { id: 'walkin',   label: 'ห้องแต่งตัว',     icon: '👗' },
  { id: 'prayer',   label: 'ห้องพระ',         icon: '🙏' },
  { id: 'laundry',  label: 'ห้องซักรีด',      icon: '🧺' },
  { id: 'balcony',  label: 'ระเบียง',         icon: '🌤️' },
  { id: 'terrace',  label: 'ดาดฟ้า / เฉลียง', icon: '🏙️' },
  { id: 'garden',   label: 'สวน / พื้นที่นอกบ้าน', icon: '🌳' },
  { id: 'garage',   label: 'โรงจอดรถในตัว',   icon: '🚗' },
]

// ช่วงราคาสำหรับตัวกรอง (บาท/เดือน)
export const BUDGET_RANGES = [
  { id: 'any',    label: 'ทุกงบ',            min: 0,     max: null },
  { id: 'u10k',   label: 'ต่ำกว่า ฿10,000',  min: 0,     max: 10000 },
  { id: '10-20k', label: '฿10,000 – 20,000', min: 10000, max: 20000 },
  { id: '20-35k', label: '฿20,000 – 35,000', min: 20000, max: 35000 },
  { id: '35-60k', label: '฿35,000 – 60,000', min: 35000, max: 60000 },
  { id: 'o60k',   label: 'มากกว่า ฿60,000',  min: 60000, max: null },
]

export const BEDROOM_OPTIONS = [
  { id: 'any', label: 'ไม่ระบุ', min: null },
  { id: '0',   label: 'สตูดิโอ', min: 0 },
  { id: '1',   label: '1 นอน+',  min: 1 },
  { id: '2',   label: '2 นอน+',  min: 2 },
  { id: '3',   label: '3 นอน+',  min: 3 },
  { id: '4',   label: '4 นอน+',  min: 4 },
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
