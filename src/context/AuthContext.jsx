import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, HAS_SUPABASE } from '../lib/supabase'

// ===================================================================
// AUTH CONTEXT — ระบบสมาชิกจริง (ไม่ใช่ simulate อีกต่อไป)
// เก็บ session + profile (role มาจากตาราง profiles ใน Supabase)
// ถ้ายังไม่ได้ตั้งค่า Supabase → ทำงานแบบ guest (ยังเข้าเว็บดูได้)
// ===================================================================

const AuthContext = createContext(null)

// โหมดการใช้งาน — ทุกบัญชีสลับได้อิสระ (renter = หาเช่า, lister = ปล่อยเช่า)
function initialMode(user, prof) {
  const uid = user?.id
  try {
    const saved = uid && localStorage.getItem('rentbegin_mode_' + uid)
    if (saved === 'rent' || saved === 'list') return saved
  } catch { /* noop */ }
  const meta = user?.user_metadata?.default_mode
  if (meta === 'rent' || meta === 'list') return meta
  return prof?.role === 'owner' || prof?.role === 'agent' ? 'list' : 'rent'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setModeState] = useState('rent')

  const loadProfile = useCallback(async (userId) => {
    if (!userId || !supabase) { setProfile(null); return null }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setProfile(data || null)
    return data || null
  }, [])

  // หลัง OAuth (Google/LINE/Facebook) กลับมา → ใส่ intent ที่เลือกไว้ก่อน redirect
  const applyPending = useCallback(async (uid) => {
    if (!uid || !supabase) return false
    let pending = null
    try { pending = JSON.parse(localStorage.getItem('rentbegin_pending_usage') || 'null') } catch { /* noop */ }
    if (!pending) return false
    localStorage.removeItem('rentbegin_pending_usage')
    const desired = pending.usage === 'list' ? 'list' : 'rent'
    try { await supabase.auth.updateUser({ data: { default_mode: desired, usage: pending.usage } }) } catch { /* noop */ }
    if (pending.usage !== 'rent' && pending.listerType) {
      try {
        await supabase.from('profiles').update({
          role: pending.listerType,
          role_label: pending.listerType === 'agent' ? 'นายหน้า' : 'เจ้าของ',
        }).eq('user_id', uid)
      } catch { /* noop */ }
    }
    await loadProfile(uid)
    setModeState(desired)
    try { localStorage.setItem('rentbegin_mode_' + uid, desired) } catch { /* noop */ }
    return true
  }, [loadProfile])

  useEffect(() => {
    if (!HAS_SUPABASE) { setLoading(false); return }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      const p = await loadProfile(data.session?.user?.id)
      if (data.session?.user) {
        const applied = await applyPending(data.session.user.id)
        if (!applied) setModeState(initialMode(data.session.user, p))
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      const p = await loadProfile(s?.user?.id)
      if (s?.user) {
        const applied = await applyPending(s.user.id)
        if (!applied) setModeState(initialMode(s.user, p))
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile, applyPending])

  // สลับโหมด — จำไว้ทั้งเครื่องนี้ (localStorage) และข้ามอุปกรณ์ (user metadata)
  const setMode = useCallback(async (m) => {
    setModeState(m)
    const uid = session?.user?.id
    try { if (uid) localStorage.setItem('rentbegin_mode_' + uid, m) } catch { /* noop */ }
    if (!supabase || !uid) return
    try { await supabase.auth.updateUser({ data: { default_mode: m } }) } catch { /* noop */ }
    // ถ้าผู้เช่าเริ่มเข้าโหมดปล่อยเช่า → ยกระดับเป็นเจ้าของอัตโนมัติ (จะได้มีป้ายถูก)
    if (m === 'list' && profile?.role === 'renter') {
      try {
        await supabase.from('profiles').update({ role: 'owner', role_label: 'เจ้าของ' }).eq('user_id', uid)
        await loadProfile(uid)
      } catch { /* noop */ }
    }
  }, [session, profile, loadProfile])

  // ---------- email + password ----------
  async function signUp({ email, password, name, role = 'renter', defaultMode = 'rent', usage = 'rent' }) {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู SETUP-AUTH.md)')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, default_mode: defaultMode, usage } },
    })
    if (error) throw error
    return data
  }

  async function signInEmail({ email, password }) {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู SETUP-AUTH.md)')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ---------- Google / Facebook OAuth (Supabase รองรับ native) ----------
  async function signInGoogle() {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู SETUP-AUTH.md)')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  async function signInFacebook() {
    if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู SETUP-AUTH.md)')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  // ---------- LINE Login (ผ่าน Supabase Edge Function) ----------
  // LINE ไม่ใช่ provider มาตรฐานของ Supabase จึงต้องผ่าน edge function
  // ดู supabase/functions/line-login/ + SETUP-AUTH.md
  async function signInLine() {
    const base = import.meta.env.VITE_SUPABASE_URL
    if (!base) throw new Error('ยังไม่ได้ตั้งค่า Supabase (ดู SETUP-AUTH.md)')
    const redirect = encodeURIComponent(`${window.location.origin}/`)
    window.location.href = `${base}/functions/v1/line-login?redirect=${redirect}`
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    role: profile?.role || null,
    isAuthed: Boolean(session?.user),
    isAdmin: profile?.role === 'admin',
    // โหมดปัจจุบัน — ทุกบัญชีสลับได้
    mode,                       // 'rent' | 'list'
    setMode,
    isListMode: mode === 'list',
    usage: session?.user?.user_metadata?.usage || null,  // 'rent' | 'list' | 'both'
    loading,
    hasSupabase: HAS_SUPABASE,
    reloadProfile: () => loadProfile(session?.user?.id),
    signUp,
    signInEmail,
    signInGoogle,
    signInFacebook,
    signInLine,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องอยู่ใน <AuthProvider>')
  return ctx
}
