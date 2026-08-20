import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { photoStyle } from '../lib/photo'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import { getMemberListings, getListingsByIds } from '../api/client'
import './UserPanel.css'

// ===================================================================
// แถบซ้ายแบบ Facebook — ข้อมูลผู้ใช้จาก auth จริง (ไม่มี role toggle แล้ว)
// - ยังไม่ล็อกอิน → การ์ดเชิญให้เข้าสู่ระบบ
// - ล็อกอินแล้ว → โปรไฟล์จริง + บทบาทจริง (renter/owner/agent/admin)
// ===================================================================

const ROLE_LABEL = { renter: 'ผู้เช่า', owner: 'เจ้าของ', agent: 'นายหน้า', admin: 'ผู้ดูแลระบบ' }

export default function UserPanel() {
  const { ids, count } = useSaved()
  const { isAuthed, profile, role, signOut, mode, setMode } = useAuth()
  const [myListings, setMyListings] = useState([])
  const [savedItems, setSavedItems] = useState([])

  const isLister = mode === 'list'

  // ประกาศที่บันทึกไว้ — ดึงของจริงตาม id
  useEffect(() => {
    let alive = true
    if (!ids.length) { setSavedItems([]); return }
    getListingsByIds(ids.slice(0, 3))
      .then((d) => { if (alive) setSavedItems(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [ids])

  useEffect(() => {
    let alive = true
    if (isAuthed && isLister) {
      getMemberListings().then((l) => { if (alive) setMyListings(l || []) }).catch(() => {})
    } else {
      setMyListings([])
    }
    return () => { alive = false }
  }, [isAuthed, isLister])

  return (
    <aside className="upanel">
      {/* --- การ์ดผู้ใช้ --- */}
      {isAuthed ? (
        <div className="up-card">
          <div className="up-me">
            <div className="up-av">{profile?.initial || 'ผ'}</div>
            <div>
              <div className="up-name">{profile?.name || 'สมาชิก'}</div>
              <div className="up-role">
                {ROLE_LABEL[role] || 'สมาชิก'}
                {profile?.verified ? ' · ยืนยันแล้ว ✓' : ''}
              </div>
            </div>
          </div>
          <div className="up-mode">
            <span className="up-mode-lbl">โหมดตอนนี้</span>
            <div className="up-mode-sw">
              <button className={mode === 'rent' ? 'on' : ''} onClick={() => setMode('rent')}>🔑 หาเช่า</button>
              <button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}>🏠 ปล่อยเช่า</button>
            </div>
          </div>
          <button className="up-more as-btn" onClick={signOut}>ออกจากระบบ</button>
        </div>
      ) : (
        <div className="up-card up-guest">
          <div className="up-me">
            <div className="up-av guest">?</div>
            <div>
              <div className="up-name">ยินดีต้อนรับ</div>
              <div className="up-role">เข้าสู่ระบบเพื่อลงประกาศและบันทึกทรัพย์</div>
            </div>
          </div>
          <Link to="/login" className="up-cta">เข้าสู่ระบบ / สมัครสมาชิก</Link>
        </div>
      )}

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
                <div className="up-thumb" style={photoStyle(l.photos?.[0])} />
                <div className="up-mini-t">
                  <div className="t">{l.title}</div>
                  <div className="s">฿{Number(l.price || 0).toLocaleString()}/ด.</div>
                </div>
              </Link>
            ))}
            <Link to="/saved" className="up-more">ดูทั้งหมด →</Link>
          </>
        )}
      </div>

      {/* --- ทรัพย์ของฉัน (เจ้าของ/นายหน้า ที่ล็อกอิน) --- */}
      {isAuthed && isLister && (
        <div className="up-card">
          <div className="up-head">
            <h4>🏠 ทรัพย์ของฉัน</h4>
            <span className="up-count">{myListings.length}</span>
          </div>
          {myListings.length === 0 ? (
            <p className="up-empty">ยังไม่มีประกาศ<br />เริ่มลงประกาศแรกได้เลย</p>
          ) : myListings.slice(0, 3).map((l) => (
            <div className="up-mini" key={l.id}>
              <div className="up-thumb" style={photoStyle(l.photo)} />
              <div className="up-mini-t">
                <div className="t">{l.title}</div>
                <div className="s">
                  ฿{Number(l.price || 0).toLocaleString()}/ด.
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
      {isAuthed && !isLister && (
        <div className="up-card">
          <div className="up-head"><h4>🎯 ที่ฉันกำลังหา</h4></div>
          <div className="up-pref"><span>ที่บันทึกไว้</span><b>{count} รายการ</b></div>
          <div className="up-pref"><span>สถานะ</span><b>{profile?.verified ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}</b></div>
          <Link to="/" className="up-more as-btn">ค้นหาทรัพย์</Link>
        </div>
      )}

      {/* --- เมนูลัด --- */}
      <div className="up-card up-menu">
        <Link to="/saved">♥ ที่บันทึกไว้ {count > 0 && <span className="up-badge">{count}</span>}</Link>
        {isAuthed && isLister && <Link to="/member">📋 จัดการประกาศ</Link>}
        {isAuthed ? <Link to="/member">⚙️ ตั้งค่าบัญชี</Link> : <Link to="/login">🔑 เข้าสู่ระบบ</Link>}
      </div>

      {isAuthed && isLister ? (
        <Link to="/member" className="up-cta">+ ลงประกาศปล่อยเช่า</Link>
      ) : (
        <Link to={isAuthed ? '/member' : '/login'} className="up-cta alt">มีห้องว่าง? ลงประกาศฟรี</Link>
      )}
    </aside>
  )
}
