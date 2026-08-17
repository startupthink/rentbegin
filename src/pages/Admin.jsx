import { useEffect, useState } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { GRADIENTS } from '../data/mock'
import {
  getAdminStats, getReviewQueue, getDisputes,
  approveListing, rejectListing,
  getAdminKyc, getAdminMembers, getAdminListings, getAdminContracts,
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

const ADMIN_PROFILE = { name: 'ผู้ดูแลระบบ', initial: 'A', roleLabel: 'master', verified: false }
const TONE = { live: 'tg-live', wait: 'tg-wait', danger: 'tg-danger', new: 'tg-new' }

export default function Admin() {
  const [tab, setTab] = useState('dash')
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([getAdminStats(), getReviewQueue(), getDisputes()])
      .then(([s, q, d]) => { if (!alive) return; setStats(s); setQueue(q); setDisputes(d) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  async function handle(id, action) {
    setBusy(id)
    try {
      if (action === 'approve') { await approveListing(id); setFlash(`✓ อนุมัติประกาศ ${id} แล้ว`) }
      else { await rejectListing(id); setFlash(`✕ ปฏิเสธประกาศ ${id} แล้ว — แจ้งผู้ลงประกาศอัตโนมัติ`) }
      setQueue((q) => q.filter((x) => x.id !== id))
      setTimeout(() => setFlash(''), 3500)
    } finally { setBusy(null) }
  }

  if (loading || !stats) return (<><Header /><div className="spin" /></>)

  return (
    <>
      <Header />
      <div className="app admin">
        <Sidebar variant="admin" profile={ADMIN_PROFILE} items={NAV} active={tab} onSelect={setTab} />
        <main className="main">
          {flash && <div className="flash">{flash}</div>}

          {tab === 'dash' && <DashTab stats={stats} queue={queue} disputes={disputes} busy={busy} handle={handle} goTab={setTab} />}
          {tab === 'review' && <ReviewTab queue={queue} busy={busy} handle={handle} />}
          {tab === 'kyc' && <KycTab />}
          {tab === 'disputes' && <DisputesTab initial={disputes} />}
          {tab === 'members' && <MembersTab />}
          {tab === 'listings' && <AllListingsTab />}
          {tab === 'contracts' && <ContractsTab />}
          {tab === 'finance' && <FinanceTab stats={stats} />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </>
  )
}

function DashTab({ stats, queue, disputes, busy, handle, goTab }) {
  return (
    <>
      <div className="phead">
        <div><h2>แดชบอร์ด</h2><p>อัปเดตล่าสุดวันนี้ · มี {queue.length} ประกาศรอตรวจ</p></div>
        <div className="phead-act"><button className="btn-o">↓ ส่งออกรายงาน</button><button className="btn-p">📢 ประกาศข่าว</button></div>
      </div>

      <div className="kpis">
        <Kpi tone="k1" ic="👥" k="สมาชิกทั้งหมด" v={stats.totalMembers.toLocaleString()} d={`▲ ${stats.membersDelta} สัปดาห์นี้`} up />
        <Kpi tone="k2" ic="🏠" k="ประกาศเปิดอยู่" v={stats.activeListings.toLocaleString()} d={`▲ ${stats.listingsDeltaPct}%`} up />
        <Kpi tone="k3" ic="📝" k="สัญญาที่ดำเนินอยู่" v={stats.activeContracts} d={stats.contractsValue} />
        <Kpi tone="k4" ic="💳" k="ค่าธรรมเนียมเดือนนี้" v={`฿${Math.round(stats.feesThisMonth / 1000)}K`} d={`▲ ${stats.feesDeltaPct}%`} up />
      </div>

      <div className="two-col">
        <div className="pn">
          <div className="pn-h"><h3>ประกาศรอตรวจสอบ</h3><button className="btn-o btn-s" onClick={() => goTab('review')}>ดูทั้งหมด</button></div>
          {queue.length === 0 ? (
            <div className="done-all">🎉 ตรวจครบแล้ว ไม่มีประกาศค้าง</div>
          ) : queue.slice(0, 3).map((r) => (
            <ReviewRow key={r.id} r={r} busy={busy} handle={handle} />
          ))}
        </div>

        <div className="stack">
          <div className="pn pn-pad">
            <h3 className="pn-title">ค่าธรรมเนียม 7 วัน</h3>
            <div className="big">฿{stats.feesWeek.toLocaleString()}</div>
            <div className="delta up">▲ {stats.feesWeekDeltaPct}% จากสัปดาห์ก่อน</div>
            <div className="chart">
              {stats.feesChart.map((b) => (
                <div className="b" key={b.label}><i style={{ height: `${b.value}%` }} /><span>{b.label}</span></div>
              ))}
            </div>
          </div>

          <div className="pn">
            <div className="pn-h"><h3>ข้อพิพาท</h3><button className="btn-o btn-s" onClick={() => goTab('disputes')}>จัดการ</button></div>
            {disputes.map((d) => (
              <div className="dsp" key={d.id}>
                <div className="dsp-r1"><b>#{d.id} · {d.title}</b>
                  <span className={`tg ${d.status === 'urgent' ? 'tg-danger' : 'tg-wait'}`}>{d.statusLabel}</span>
                </div>
                <div className="dsp-r2">{d.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function ReviewRow({ r, busy, handle }) {
  return (
    <div className="rev">
      <div className="rev-img" style={{ background: GRADIENTS[r.photo] }} />
      <div className="rev-c">
        <h4>{r.title}</h4>
        <div className="rev-m">{r.meta}</div>
        <div className="rev-fl">
          {r.flags.map((f, i) => (<span key={i} className={`tg ${TONE[f.tone]}`}>{f.label}</span>))}
        </div>
      </div>
      <div className="rev-a">
        <button className="btn-ok" disabled={busy === r.id} onClick={() => handle(r.id, 'approve')}>{busy === r.id ? '...' : 'อนุมัติ'}</button>
        <button className="btn-no" disabled={busy === r.id} onClick={() => handle(r.id, 'reject')}>ปฏิเสธ</button>
      </div>
    </div>
  )
}

function ReviewTab({ queue, busy, handle }) {
  return (
    <>
      <div className="phead"><div><h2>ตรวจประกาศ</h2><p>{queue.length} รายการรอตรวจ · อนุมัติหรือปฏิเสธพร้อมเหตุผล</p></div></div>
      <div className="pn">
        {queue.length === 0 ? <div className="done-all">🎉 ตรวจครบทุกรายการแล้ว</div>
          : queue.map((r) => <ReviewRow key={r.id} r={r} busy={busy} handle={handle} />)}
      </div>
    </>
  )
}

function KycTab() {
  const [items, setItems] = useState([])
  useEffect(() => { let a = true; getAdminKyc().then((d) => a && setItems(d || [])); return () => { a = false } }, [])
  const act = (id) => setItems((s) => s.filter((x) => x.id !== id))
  return (
    <>
      <div className="phead"><div><h2>ยืนยันตัวตน</h2><p>{items.length} คำขอ · ตรวจเอกสารก่อนติดป้าย ✓ ให้ผู้ใช้</p></div></div>
      <div className="pn">
        {items.length === 0 ? <div className="done-all">🎉 ตรวจครบแล้ว</div> : items.map((k) => (
          <div className="rev" key={k.id}>
            <div className="rev-img" style={{ background: GRADIENTS[k.photo], width: 70, height: 70, borderRadius: '50%' }} />
            <div className="rev-c">
              <h4>{k.name} <span className="tg tg-new">{k.role}</span></h4>
              <div className="rev-m">เอกสาร: {k.doc} · ส่งเมื่อ {k.time}</div>
            </div>
            <div className="rev-a">
              <button className="btn-ok" onClick={() => act(k.id)}>✓ อนุมัติ</button>
              <button className="btn-no" onClick={() => act(k.id)}>ขอเอกสารเพิ่ม</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function DisputesTab({ initial }) {
  const [items, setItems] = useState(initial)
  const resolve = (id) => setItems((s) => s.filter((x) => x.id !== id))
  return (
    <>
      <div className="phead"><div><h2>ข้อพิพาท</h2><p>{items.length} เคสเปิดอยู่ · ไกล่เกลี่ยพร้อมหลักฐานในระบบ</p></div></div>
      <div className="pn">
        {items.length === 0 ? <div className="done-all">🎉 ไม่มีข้อพิพาทค้าง</div> : items.map((d) => (
          <div className="lrow" key={d.id}>
            <div className="info">
              <div className="info-t">#{d.id} · {d.title}</div>
              <div className="info-s">{d.detail}</div>
            </div>
            <div className="act">
              <span className={`tg ${d.status === 'urgent' ? 'tg-danger' : 'tg-wait'}`}>{d.statusLabel}</span>
              <button className="btn-o btn-s">ดูหลักฐาน</button>
              <button className="btn-ok" onClick={() => resolve(d.id)}>ปิดเคส</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function MembersTab() {
  const [items, setItems] = useState([])
  useEffect(() => { let a = true; getAdminMembers().then((d) => a && setItems(d || [])); return () => { a = false } }, [])
  const toggle = (id) => setItems((s) => s.map((m) => m.id === id ? { ...m, status: m.status === 'active' ? 'suspended' : 'active' } : m))
  return (
    <>
      <div className="phead"><div><h2>สมาชิก</h2><p>{items.length} บัญชี (ตัวอย่าง) · ระงับ/ปลดล็อกได้</p></div></div>
      <div className="pn">
        <table className="tbl">
          <thead><tr><th>ID</th><th>ชื่อ</th><th>บทบาท</th><th>สมัครเมื่อ</th><th>ประกาศ</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td><b>{m.id}</b></td><td>{m.name}</td><td>{m.role}</td><td>{m.joined}</td><td>{m.listings}</td>
                <td><span className={`tg ${m.status === 'active' ? 'tg-live' : 'tg-danger'}`}>{m.status === 'active' ? 'ปกติ' : 'ถูกระงับ'}</span></td>
                <td><button className="btn-o btn-s" onClick={() => toggle(m.id)}>{m.status === 'active' ? 'ระงับ' : 'ปลดล็อก'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const LST_STATUS = {
  live: { cls: 'tg-live', label: 'เผยแพร่' },
  pending: { cls: 'tg-wait', label: 'รอตรวจ' },
  rented: { cls: 'tg-off', label: 'เช่าแล้ว' },
  rejected: { cls: 'tg-danger', label: 'ตีกลับ' },
}
function AllListingsTab() {
  const [rows, setRows] = useState([])
  useEffect(() => { let a = true; getAdminListings().then((d) => a && setRows(d || [])); return () => { a = false } }, [])
  return (
    <>
      <div className="phead"><div><h2>ประกาศทั้งหมด</h2><p>{rows.length} รายการในระบบ</p></div></div>
      <div className="pn">
        <table className="tbl">
          <thead><tr><th>ID</th><th>ทรัพย์</th><th>ประเภท</th><th>ผู้ลง</th><th>ค่าเช่า/ด.</th><th>สถานะ</th></tr></thead>
          <tbody>
            {rows.map((l) => {
              const st = LST_STATUS[l.status] || LST_STATUS.live
              return (
                <tr key={l.id}>
                  <td><b>{l.id}</b></td><td>{l.title}</td><td>{l.typeLabel}</td>
                  <td>{l.owner?.name}</td><td>฿{l.price.toLocaleString()}</td>
                  <td><span className={`tg ${st.cls}`}>{st.label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ContractsTab() {
  const [rows, setRows] = useState([])
  useEffect(() => { let a = true; getAdminContracts().then((d) => a && setRows(d || [])); return () => { a = false } }, [])
  return (
    <>
      <div className="phead"><div><h2>สัญญาเช่า</h2><p>{rows.length} ฉบับที่ทำผ่านระบบ</p></div></div>
      <div className="pn">
        <table className="tbl">
          <thead><tr><th>เลขที่</th><th>ทรัพย์</th><th>ผู้เช่า</th><th>เริ่ม</th><th>ระยะ</th><th>ค่าเช่า/ด.</th><th>สถานะ</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><b>{c.id}</b></td><td>{c.property}</td><td>{c.tenant}</td>
                <td>{c.start}</td><td>{c.months} เดือน</td><td>฿{c.rent.toLocaleString()}</td>
                <td><span className={`tg ${c.status === 'active' ? 'tg-live' : 'tg-wait'}`}>{c.status === 'active' ? 'ใช้งานอยู่' : 'ใกล้ครบ'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FinanceTab({ stats }) {
  return (
    <>
      <div className="phead"><div><h2>การเงิน</h2><p>ค่าธรรมเนียมและเงินพักในระบบ</p></div></div>
      <div className="kpis">
        <Kpi tone="k4" ic="💳" k="ค่าธรรมเนียมเดือนนี้" v={`฿${stats.feesThisMonth.toLocaleString()}`} d={`▲ ${stats.feesDeltaPct}%`} up />
        <Kpi tone="k2" ic="🔒" k="มัดจำพักในระบบ" v="฿1.86M" d="62 รายการ" />
        <Kpi tone="k3" ic="🏦" k="รอบโอนถัดไป" v="25 มิ.ย." d="฿412,000" />
        <Kpi tone="k1" ic="📈" k="อัตราค่าธรรมเนียม" v="1%" d="ของค่าเช่าที่จ่ายผ่านระบบ" />
      </div>
      <div className="pn pn-pad">
        <h3 className="pn-title">ค่าธรรมเนียม 7 วัน</h3>
        <div className="big">฿{stats.feesWeek.toLocaleString()}</div>
        <div className="chart">
          {stats.feesChart.map((b) => (
            <div className="b" key={b.label}><i style={{ height: `${b.value}%` }} /><span>{b.label}</span></div>
          ))}
        </div>
      </div>
    </>
  )
}

function AuditTab() {
  const logs = [
    ['20:41', 'admin', 'อนุมัติประกาศ RB-2995'],
    ['20:38', 'admin', 'ขอเอกสารเพิ่ม U-438 (KYC)'],
    ['19:12', 'system', 'ออกใบเสร็จ RC-3320 อัตโนมัติ'],
    ['18:55', 'admin', 'ปิดเคสข้อพิพาท RB-2799'],
    ['17:30', 'system', 'โอนเงินรอบ 20 มิ.ย. — ฿388,500 (34 บัญชี)'],
  ]
  return (
    <>
      <div className="phead"><div><h2>บันทึกการใช้งาน</h2><p>ทุกการกระทำของแอดมินและระบบถูกเก็บ log</p></div></div>
      <div className="pn">
        <table className="tbl">
          <thead><tr><th>เวลา</th><th>โดย</th><th>รายการ</th></tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i}><td>{l[0]}</td><td><span className={`tg ${l[1] === 'admin' ? 'tg-new' : 'tg-off'}`}>{l[1]}</span></td><td>{l[2]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SettingsTab() {
  const [saved, setSaved] = useState(false)
  return (
    <>
      <div className="phead"><div><h2>ตั้งค่าระบบ</h2><p>ค่ากลางของแพลตฟอร์ม</p></div></div>
      {saved && <div className="flash">✓ บันทึกแล้ว</div>}
      <div className="pn pn-form" style={{ maxWidth: 560 }}>
        <div className="g2c">
          <div className="fr"><label>ค่าธรรมเนียม (%)</label><input type="number" defaultValue="1" /></div>
          <div className="fr"><label>โดเมนอีเมลระบบ</label><input defaultValue="no-reply@rentbegin.com" /></div>
        </div>
        <div className="fr"><label>โหมดตรวจประกาศ</label>
          <div className="chips">
            <button className="chip on">ตรวจก่อนเผยแพร่ทุกรายการ</button>
            <button className="chip">เผยแพร่ทันที (สุ่มตรวจ)</button>
          </div>
        </div>
        <button className="btn-p" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}>บันทึก</button>
      </div>
    </>
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
