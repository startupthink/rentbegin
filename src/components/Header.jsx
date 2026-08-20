import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import { PROPERTY_TYPES, BUDGET_RANGES } from '../data/constants'
import './Header.css'

export default function Header({ search }) {
  const { count } = useSaved()
  const { isAuthed, isAdmin, profile, signOut, mode, setMode } = useAuth()
  const nav = useNavigate()

  const [open, setOpen] = useState(false)          // แผงค้นหาบน header
  const [menuOpen, setMenuOpen] = useState(false)  // เมนูบัญชี
  const [f, setF] = useState({ place: '', type: 'all', budget: 'any' })
  const boxRef = useRef(null)
  const menuRef = useRef(null)

  // คลิกนอกพื้นที่ → ปิด
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    nav('/')
  }

  function switchMode(m) {
    setMode(m)
    nav(m === 'list' ? '/member' : '/')
  }

  function submitSearch(e) {
    e?.preventDefault()
    const p = new URLSearchParams()
    if (f.place.trim()) p.set('q', f.place.trim())
    if (f.type !== 'all') p.set('type', f.type)
    if (f.budget !== 'any') p.set('budget', f.budget)
    setOpen(false)
    nav(`/?${p.toString()}`)
  }

  const budgetLabel = BUDGET_RANGES.find((b) => b.id === f.budget)?.label
  const typeLabel = PROPERTY_TYPES.find((t) => t.id === f.type)?.label

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="logo">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" fill="#ff5a5f" />
          </svg>
          rentbegin
        </Link>

        {/* ---------- ช่องค้นหา (กดได้จริง) ---------- */}
        <div className="psearch-wrap" ref={boxRef}>
          <button className="psearch" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <span className="seg2">{search?.place || (f.place || 'ทุกทำเล')}</span>
            <span className="seg2 dim">{search?.type || (f.type !== 'all' ? typeLabel : 'ทุกประเภท')}</span>
            <span className="seg2 dim">{search?.budget || (f.budget !== 'any' ? budgetLabel : 'งบเท่าไหร่')}</span>
            <span className="go">🔍</span>
          </button>

          {open && (
            <form className="psearch-pop" onSubmit={submitSearch}>
              <div className="pp-f">
                <label htmlFor="hplace">ทำเล</label>
                <input
                  id="hplace" autoFocus
                  placeholder="เช่น รัชดา, ห้วยขวาง, นนทบุรี"
                  value={f.place}
                  onChange={(e) => setF({ ...f, place: e.target.value })}
                />
              </div>
              <div className="pp-f">
                <label htmlFor="htype">ประเภท</label>
                <select id="htype" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  {PROPERTY_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="pp-f">
                <label htmlFor="hbudget">งบต่อเดือน</label>
                <select id="hbudget" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })}>
                  {BUDGET_RANGES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-p pp-go">🔍 ค้นหา</button>
            </form>
          )}
        </div>

        <div className="hdr-right">
          <Link to="/saved" className="hdr-fav" title="ที่บันทึกไว้">
            ♥
            {count > 0 && <span className="hdr-fav-n">{count}</span>}
          </Link>

          {isAuthed ? (
            <>
              {!isAdmin && (
                <div className="modesw" role="tablist" aria-label="สลับโหมด">
                  <button
                    className={`modesw-b ${mode === 'rent' ? 'on' : ''}`}
                    onClick={() => switchMode('rent')}
                  >🔑 หาเช่า</button>
                  <button
                    className={`modesw-b ${mode === 'list' ? 'on' : ''}`}
                    onClick={() => switchMode('list')}
                  >🏠 ปล่อยเช่า</button>
                </div>
              )}

              {/* ---------- เมนูบัญชี ---------- */}
              <div className="acct-wrap" ref={menuRef}>
                <button className="acct" onClick={() => setMenuOpen((v) => !v)} title={profile?.name}>
                  <span className="bars">☰</span>
                  <span className="av">{profile?.initial || 'ผ'}</span>
                </button>
                {menuOpen && (
                  <div className="acct-menu">
                    <div className="am-head">
                      <b>{profile?.name || 'สมาชิก'}</b>
                      <span>{profile?.roleLabel}</span>
                    </div>
                    <Link to="/member" onClick={() => setMenuOpen(false)}>📋 แดชบอร์ดของฉัน</Link>
                    <Link to="/saved" onClick={() => setMenuOpen(false)}>♥ ที่บันทึกไว้</Link>
                    {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>🛡️ แผงแอดมิน</Link>}
                    <Link to="/privacy" onClick={() => setMenuOpen(false)}>📄 นโยบายความเป็นส่วนตัว</Link>
                    <button onClick={handleSignOut}>↩︎ ออกจากระบบ</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="lnk">ปล่อยเช่ากับเรา</Link>
              <Link to="/login" className="acct">
                <span className="bars">☰</span>
                <span className="av">?</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
