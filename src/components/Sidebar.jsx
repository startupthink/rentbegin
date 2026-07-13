import { Link } from 'react-router-dom'
import './Sidebar.css'

// patch02: เมนูกดได้จริง — ส่ง onSelect(id) กลับไปให้หน้า dashboard สลับแท็บ
export default function Sidebar({ variant = 'member', profile, items, active, onSelect }) {
  const isAdmin = variant === 'admin'

  return (
    <aside className={`side ${isAdmin ? 'side-admin' : ''}`}>
      {isAdmin && (
        <Link to="/" className="abrand">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" fill="#ff5a5f" />
          </svg>
          rentbegin <span className="atag">admin</span>
        </Link>
      )}

      <div className="who">
        <div className="who-av" style={isAdmin ? { background: 'linear-gradient(135deg,#7b61ff,#4a37b8)' } : undefined}>
          {profile.initial}
        </div>
        <div>
          <div className="who-n">{profile.name}</div>
          <div className="who-r">
            {profile.roleLabel}
            {profile.verified ? ' · ยืนยันแล้ว ✓' : ''}
          </div>
        </div>
      </div>

      <nav className="nv">
        {items.map((it, i) =>
          it.group ? (
            <div key={`g${i}`} className="gp">{it.group}</div>
          ) : (
            <a
              key={it.id}
              className={it.id === active ? 'on' : ''}
              onClick={() => onSelect?.(it.id)}
            >
              <span className="i">{it.icon}</span>
              {it.label}
              {it.count ? <span className="c">{it.count}</span> : null}
            </a>
          )
        )}
      </nav>

      <Link to="/" className="back-home">← กลับหน้าเว็บ</Link>
    </aside>
  )
}
