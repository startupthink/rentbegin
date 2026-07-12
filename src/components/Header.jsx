import { Link } from 'react-router-dom'
import './Header.css'

export default function Header({ search }) {
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
          <Link to="/member" className="lnk">ปล่อยเช่ากับเรา</Link>
          <Link to="/member" className="acct">
            <span className="bars">☰</span>
            <span className="av">?</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
