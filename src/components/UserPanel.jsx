import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GRADIENTS, memberProfile, memberListings, listings } from '../data/mock'
import { useSaved } from '../context/SavedContext'
import './UserPanel.css'

// ===================================================================
// แถบซ้ายแบบ Facebook — ข้อมูลผู้ใช้ตามบทบาท
// บทบาทที่เลือกจำไว้ใน localStorage (demo — ของจริงมาจาก auth)
// ===================================================================

const ROLES = [
  { id: 'renter', label: 'ผู้เช่า', icon: '🔑' },
  { id: 'owner',  label: 'เจ้าของ', icon: '🙋' },
  { id: 'agent',  label: 'นายหน้า', icon: '💼' },
]

export default function UserPanel() {
  const { ids, count } = useSaved()
  const [role, setRole] = useState(() => localStorage.getItem('rentbegin_role') || 'renter')

  useEffect(() => {
    try { localStorage.setItem('rentbegin_role', role) } catch { /* noop */ }
  }, [role])

  const savedItems = listings.filter((l) => ids.includes(l.id)).slice(0, 3)
  const isLister = role === 'owner' || role === 'agent'

  return (
    <aside className="upanel">
      {/* --- การ์ดผู้ใช้ --- */}
      <div className="up-card">
        <div className="up-me">
          <div className="up-av">{isLister ? memberProfile.initial : 'พ'}</div>
          <div>
            <div className="up-name">{isLister ? memberProfile.name : 'คุณผู้เยี่ยมชม'}</div>
            <div className="up-role">
              {ROLES.find((r) => r.id === role)?.label}
              {isLister && memberProfile.verified ? ' · ยืนยันแล้ว ✓' : ''}
            </div>
          </div>
        </div>
        <div className="up-roles">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className={`up-rolechip ${role === r.id ? 'on' : ''}`}
              onClick={() => setRole(r.id)}
            >
              {r.icon} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- ตะกร้าที่บันทึก --- */}
      <div className="up-card">
        <div className="up-head">
          <h4>♥ ที่บันทึกไว้</h4>
          <span className="up-count">{count}</span>
        </div>
        {count === 0 ? (
          <p className="up-empty">กดหัวใจที่ประกาศ<br />เพื่อเก็บไว้ดูทีหลัง</p>
        ) : (
          <>
            {savedItems.map((l) => (
              <Link to={`/property/${l.id}`} className="up-mini" key={l.id}>
                <div className="up-thumb" style={{ background: GRADIENTS[l.photos[0]] }} />
                <div className="up-mini-t">
                  <div className="t">{l.title}</div>
                  <div className="s">฿{l.price.toLocaleString()}/ด.</div>
                </div>
              </Link>
            ))}
            <Link to="/saved" className="up-more">ดูทั้งหมด →</Link>
          </>
        )}
      </div>

      {/* --- ทรัพย์ของฉัน (เจ้าของ/นายหน้า) --- */}
      {isLister && (
        <div className="up-card">
          <div className="up-head">
            <h4>🏠 ทรัพย์ของฉัน</h4>
            <span className="up-count">{memberListings.length}</span>
          </div>
          {memberListings.slice(0, 3).map((l) => (
            <div className="up-mini" key={l.id}>
              <div className="up-thumb" style={{ background: GRADIENTS[l.photo] }} />
              <div className="up-mini-t">
                <div className="t">{l.title}</div>
                <div className="s">
                  ฿{l.price.toLocaleString()}/ด.
                  {l.views ? ` · ${l.views.toLocaleString()} วิว` : ''}
                </div>
              </div>
              <span className={`up-dot ${l.status}`} title={l.status} />
            </div>
          ))}
          <Link to="/member" className="up-more">ไปแดชบอร์ด →</Link>
        </div>
      )}

      {/* --- สำหรับผู้เช่า --- */}
      {!isLister && (
        <div className="up-card">
          <div className="up-head"><h4>🎯 ที่ฉันกำลังหา</h4></div>
          <div className="up-pref"><span>ทำเล</span><b>รัชดา · นนทบุรี</b></div>
          <div className="up-pref"><span>งบ/เดือน</span><b>฿10,000 – 20,000</b></div>
          <div className="up-pref"><span>ประเภท</span><b>คอนโด, ทาวน์เฮาส์</b></div>
          <button className="up-more as-btn">แก้ไขเงื่อนไข</button>
        </div>
      )}

      {/* --- เมนูลัด --- */}
      <div className="up-card up-menu">
        <a>📅 นัดชมของฉัน <span className="up-badge">2</span></a>
        <a>💬 ข้อความ <span className="up-badge">4</span></a>
        <Link to="/saved">♥ ที่บันทึกไว้ {count > 0 && <span className="up-badge">{count}</span>}</Link>
        {isLister && <Link to="/member">📋 จัดการประกาศ</Link>}
        <a>⚙️ ตั้งค่าบัญชี</a>
      </div>

      {isLister ? (
        <Link to="/member" className="up-cta">+ ลงประกาศปล่อยเช่า</Link>
      ) : (
        <Link to="/member" className="up-cta alt">มีห้องว่าง? ลงประกาศฟรี</Link>
      )}
    </aside>
  )
}
