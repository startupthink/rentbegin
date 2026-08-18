import { Link } from 'react-router-dom'
import '../pages/Legal.css'

// ท้ายเว็บ — ลิงก์กฎหมาย (จำเป็นสำหรับ Facebook/LINE review และ PDPA)
export default function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="sitefoot-in">
        <span>© {new Date().getFullYear()} Rentbegin</span>
        <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
        <Link to="/terms">ข้อกำหนดการใช้บริการ</Link>
        <a href="mailto:startup.think@gmail.com">ติดต่อเรา</a>
        <span className="sf-sp">แพลตฟอร์มตัวกลาง — ไม่ใช่เจ้าของทรัพย์</span>
      </div>
    </footer>
  )
}
