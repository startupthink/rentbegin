import { Link, useNavigate } from 'react-router-dom'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import './Header.css'

export default function Header({ search }) {
  const { count } = useSaved()
  const { isAuthed, isAdmin, profile, signOut, mode, setMode } = useAuth()
  const nav = useNavigate()

  async function handleSignOut() {
    await signOut()
    nav('/')
  }

  function switchMode(m) {
    setMode(m)
    if (m === 'list') nav('/member')
    else nav('/')
  }

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="logo">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" fill="#ff5a5f" />
          </svg>
          rentbegin
        </Link>

        <div className="psearch">
          <span className="seg2">{search?.place || 'ทุกทำเล'}</span>
          <span className="seg2 dim">{search?.type || 'ทุกประเภท'}</span>
          <span className="seg2 dim">{search?.budget || 'งบเท่าไหร่'}</span>
          <span className="go">🔍</span>
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
                    title="โหมดหาเช่า"
                  >🔑 หาเช่า</button>
                  <button
                    className={`modesw-b ${mode === 'list' ? 'on' : ''}`}
                    onClick={() => switchMode('list')}
                    title="โหมดปล่อยเช่า"
                  >🏠 ปล่อยเช่า</button>
                </div>
              )}
              {isAdmin && <Link to="/admin" className="lnk">แผงแอดมิน</Link>}
              <Link to={isAdmin ? '/admin' : '/member'} className="acct" title={profile?.name}>
                <span className="av">{profile?.initial || 'ผ'}</span>
              </Link>
              <button className="lnk" onClick={handleSignOut}>ออกจากระบบ</button>
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
