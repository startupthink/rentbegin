import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { GRADIENTS } from '../data/mock'
import {
  getAdminStats, getReviewQueue, getDisputes,
  approveListing, rejectListing,
} from '../api/client'
import './Dashboard.css'

const NAV = [
  { id: 'dash',      icon: '📊', label: 'แดชบอร์ด' },
  { id: 'review',    icon: '📋', label: 'ตรวจประกาศ', count: 11 },
  { id: 'kyc',       icon: '🪪', label: 'ยืนยันตัวตน', count: 7 },
  { id: 'disputes',  icon: '⚠️', label: 'ข้อพิพาท', count: 3 },
  { group: 'จัดการ' },
  { id: 'members',   icon: '👥', label: 'สมาชิก' },
  { id: 'listings',  icon: '🏠', label: 'ประกาศทั้งหมด' },
  { id: 'contracts', icon: '📝', label: 'สัญญาเช่า' },
  { group: 'ระบบ' },
  { id: 'finance',   icon: '💳', label: 'การเงิน' },
  { id: 'audit',     icon: '📜', label: 'บันทึกการใช้งาน' },
  { id: 'settings',  icon: '⚙️', label: 'ตั้งค่า' },
]

const ADMIN_PROFILE = {
  name: 'ผู้ดูแลระบบ',
  initial: 'A',
  roleLabel: 'master',
  verified: false,
}

const TONE = {
  live:   'tg-live',
  wait:   'tg-wait',
  danger: 'tg-danger',
  new:    'tg-new',
}

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([getAdminStats(), getReviewQueue(), getDisputes()])
      .then(([s, q, d]) => {
        if (!alive) return
        setStats(s); setQueue(q); setDisputes(d)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  async function handle(id, action) {
    setBusy(id)
    try {
      if (action === 'approve') {
        await approveListing(id)
        setFlash(`✓ อนุมัติประกาศ ${id} แล้ว`)
      } else {
        await rejectListing(id)
        setFlash(`✕ ปฏิเสธประกาศ ${id} แล้ว — แจ้งผู้ลงประกาศอัตโนมัติ`)
      }
      setQueue((q) => q.filter((x) => x.id !== id))
      setTimeout(() => setFlash(''), 3500)
    } finally {
      setBusy(null)
    }
  }

  if (loading || !stats) return <div className="spin" />

  return (
    <div className="app is-admin">
      <Sidebar variant="admin" profile={ADMIN_PROFILE} items={NAV} active="dash" />

      <main className="main">
        <div className="phead">
          <div>
            <h2>แดชบอร์ด</h2>
            <p>อัปเดตล่าสุด 21 มิ.ย. 21:40 · มี {queue.length} ประกาศรอตรวจ</p>
          </div>
          <div className="phead-act">
            <button className="btn-o">↓ ส่งออกรายงาน</button>
            <button className="btn-p">📢 ประกาศข่าว</button>
          </div>
        </div>

        {flash && <div className="flash">{flash}</div>}

        <div className="kpis">
          <Kpi tone="k1" ic="👥" k="สมาชิกทั้งหมด" v={stats.totalMembers.toLocaleString()} d={`▲ ${stats.membersDelta} สัปดาห์นี้`} up />
          <Kpi tone="k2" ic="🏠" k="ประกาศเปิดอยู่" v={stats.activeListings.toLocaleString()} d={`▲ ${stats.listingsDeltaPct}%`} up />
          <Kpi tone="k3" ic="📝" k="สัญญาที่ดำเนินอยู่" v={stats.activeContracts} d={stats.contractsValue} />
          <Kpi tone="k4" ic="💳" k="ค่าธรรมเนียมเดือนนี้" v={`฿${Math.round(stats.feesThisMonth / 1000)}K`} d={`▲ ${stats.feesDeltaPct}%`} up />
        </div>

        <div className="two-col">
          <div className="pn">
            <div className="pn-h">
              <h3>ประกาศรอตรวจสอบ</h3>
              <span className="tg tg-wait">{queue.length} รายการ</span>
            </div>

            {queue.length === 0 ? (
              <div className="done-all">🎉 ตรวจครบแล้ว ไม่มีประกาศค้าง</div>
            ) : (
              queue.map((r) => (
                <div className="rev" key={r.id}>
                  <div className="rev-img" style={{ background: GRADIENTS[r.photo] }} />
                  <div className="rev-c">
                    <h4>{r.title}</h4>
                    <div className="rev-m">{r.meta}</div>
                    <div className="rev-fl">
                      {r.flags.map((f, i) => (
                        <span key={i} className={`tg ${TONE[f.tone]}`}>{f.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rev-a">
                    <button
                      className="btn-ok"
                      disabled={busy === r.id}
                      onClick={() => handle(r.id, 'approve')}
                    >
                      {busy === r.id ? '...' : 'อนุมัติ'}
                    </button>
                    <button
                      className="btn-no"
                      disabled={busy === r.id}
                      onClick={() => handle(r.id, 'reject')}
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <div className="pn pn-pad">
              <h3 className="pn-title">ค่าธรรมเนียม 7 วัน</h3>
              <div className="big">฿{stats.feesWeek.toLocaleString()}</div>
              <div className="delta up">▲ {stats.feesWeekDeltaPct}% จากสัปดาห์ก่อน</div>
              <div className="chart">
                {stats.feesChart.map((b) => (
                  <div className="b" key={b.label}>
                    <i style={{ height: `${b.value}%` }} />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pn">
              <div className="pn-h">
                <h3>ข้อพิพาท</h3>
                <span className="tg tg-danger">{disputes.length} ใหม่</span>
              </div>
              {disputes.map((d) => (
                <div className="dsp" key={d.id}>
                  <div className="dsp-r1">
                    <b>#{d.id} · {d.title}</b>
                    <span className={`tg ${d.status === 'urgent' ? 'tg-danger' : 'tg-wait'}`}>
                      {d.statusLabel}
                    </span>
                  </div>
                  <div className="dsp-r2">{d.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Kpi({ tone, ic, k, v, d, up }) {
  return (
    <div className="kpi">
      <div className={`kpi-ic ${tone}`}>{ic}</div>
      <div className="kpi-k">{k}</div>
      <div className="kpi-v">{v}</div>
      <div className={`kpi-d ${up ? 'up' : ''}`}>{d}</div>
    </div>
  )
}
