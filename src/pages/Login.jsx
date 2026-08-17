import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

// ===================================================================
// หน้าเข้าสู่ระบบ / สมัครสมาชิก (จริง)
// รองรับ: Google · LINE · Facebook · อีเมล+รหัสผ่าน
// ===================================================================

const USAGE = [
  { id: 'rent', label: 'หาเช่า', icon: '🔑', hint: 'หาที่พัก' },
  { id: 'list', label: 'ปล่อยเช่า', icon: '🏠', hint: 'ลงประกาศ' },
  { id: 'both', label: 'ทั้งสอง', icon: '🤝', hint: 'เช่า+ปล่อย' },
]
const LISTER = [
  { id: 'owner', label: 'เจ้าของ', icon: '🙋', hint: 'ปล่อยเช่าเอง' },
  { id: 'agent', label: 'นายหน้า', icon: '💼', hint: 'ตัวแทนหลายทรัพย์' },
]

export default function Login() {
  const { signInEmail, signUp, signInGoogle, signInFacebook, signInLine, hasSupabase } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const dest = loc.state?.from || '/member'

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [usage, setUsage] = useState('rent')
  const [listerType, setListerType] = useState('owner')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'login') {
        await signInEmail({ email, password })
        nav(dest, { replace: true })
      } else {
        // แปลงตัวเลือกการใช้งาน → role + โหมดเริ่มต้น
        const role = usage === 'rent' ? 'renter' : listerType
        const defaultMode = usage === 'list' ? 'list' : 'rent'
        const res = await signUp({ email, password, name, role, defaultMode, usage })
        // ถ้าเปิด email confirmation ไว้ จะยังไม่มี session
        if (res?.session) nav(usage === 'list' ? '/member' : '/', { replace: true })
        else setMsg('สมัครสำเร็จ! ตรวจอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ')
      }
    } catch (e2) {
      setErr(translate(e2.message))
    } finally {
      setBusy(false)
    }
  }

  async function oauth(fn) {
    setErr('')
    // ถ้ากำลังสมัคร → จำ intent (หาเช่า/ปล่อยเช่า/ทั้งสอง) ไว้ใช้หลัง redirect กลับมา
    if (mode === 'register') {
      try { localStorage.setItem('rentbegin_pending_usage', JSON.stringify({ usage, listerType })) } catch { /* noop */ }
    }
    try { await fn() } catch (e2) { setErr(translate(e2.message)) }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
            <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" fill="#ff5a5f" />
          </svg>
          rentbegin
        </Link>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>เข้าสู่ระบบ</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>สมัครสมาชิก</button>
        </div>

        {!hasSupabase && (
          <p className="auth-warn">⚠ ยังไม่ได้เชื่อม Supabase — ปุ่มด้านล่างจะยังใช้ไม่ได้จนกว่าจะตั้งค่าตาม SETUP-AUTH.md</p>
        )}

        {mode === 'register' && (
          <div className="auth-intent">
            <div className="auth-q">อยากใช้ Rentbegin แบบไหน? (สลับได้ทุกเมื่อภายหลัง)</div>
            <div className="auth-roles">
              {USAGE.map((r) => (
                <button type="button" key={r.id}
                  className={`auth-role ${usage === r.id ? 'on' : ''}`}
                  onClick={() => setUsage(r.id)}>
                  <span className="ic">{r.icon}</span>
                  <b>{r.label}</b>
                  <small>{r.hint}</small>
                </button>
              ))}
            </div>
            {usage !== 'rent' && (
              <>
                <div className="auth-q">ลงประกาศในฐานะ</div>
                <div className="auth-roles auth-roles-2">
                  {LISTER.map((r) => (
                    <button type="button" key={r.id}
                      className={`auth-role ${listerType === r.id ? 'on' : ''}`}
                      onClick={() => setListerType(r.id)}>
                      <span className="ic">{r.icon}</span>
                      <b>{r.label}</b>
                      <small>{r.hint}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* --- Social login (หลัก) --- */}
        <div className="auth-oauth">
          <button className="oauth-btn google" onClick={() => oauth(signInGoogle)}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.5 7l7 5.4c4.1-3.8 6.5-9.4 6.5-16.9z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6.1C.9 15.9 0 19.8 0 23.5s.9 7.6 2.6 10.9l7.8-6.1z"/><path fill="#34A853" d="M24 47c6.2 0 11.4-2 15.2-5.5l-7-5.4c-2 1.3-4.5 2.1-8.2 2.1-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 47 24 47z"/></svg>
            {mode === 'register' ? 'สมัครด้วย Google' : 'เข้าสู่ระบบด้วย Google'}
          </button>
          <button className="oauth-btn facebook" onClick={() => oauth(signInFacebook)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
            {mode === 'register' ? 'สมัครด้วย Facebook' : 'เข้าสู่ระบบด้วย Facebook'}
          </button>
          <button className="oauth-btn line" onClick={() => oauth(signInLine)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.5 2 2 5.7 2 10.2c0 4 3.5 7.4 8.3 8.1.3.06.75.2.86.47.1.24.06.6.03.85l-.14.83c-.04.24-.2.96.84.52 1.04-.44 5.6-3.3 7.64-5.65C21 12.9 22 11.66 22 10.2 22 5.7 17.5 2 12 2z"/></svg>
            {mode === 'register' ? 'สมัครด้วย LINE' : 'เข้าสู่ระบบด้วย LINE'}
          </button>
        </div>

        <div className="auth-or"><span>หรือใช้อีเมล</span></div>

        {/* --- Email/password (สำรอง) --- */}
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label>ชื่อที่แสดง
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น คุณสมชาย" required />
            </label>
          )}
          <label>อีเมล
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </label>
          <label>รหัสผ่าน
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} required />
          </label>

          {err && <p className="auth-err">{err}</p>}
          {msg && <p className="auth-ok">{msg}</p>}

          <button className="btn-o auth-submit" disabled={busy}>
            {busy ? 'กำลังดำเนินการ…' : mode === 'login' ? 'เข้าสู่ระบบด้วยอีเมล' : 'สมัครด้วยอีเมล'}
          </button>
        </form>

        <p className="auth-foot">การใช้งานถือว่ายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว</p>
      </div>
    </div>
  )
}

function translate(m = '') {
  const t = m.toLowerCase()
  if (t.includes('invalid login')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (t.includes('already registered') || t.includes('already been registered')) return 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ'
  if (t.includes('password')) return 'รหัสผ่านไม่ผ่านเงื่อนไข (อย่างน้อย 6 ตัวอักษร)'
  if (t.includes('email') && t.includes('confirm')) return 'ยังไม่ได้ยืนยันอีเมล — ตรวจกล่องจดหมาย'
  return m || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'
}
