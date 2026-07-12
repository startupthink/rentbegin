import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import PropertyCard from '../components/PropertyCard'
import { GRADIENTS, PROPERTY_TYPES, AMENITIES } from '../data/mock'
import {
  getMemberProfile, getMemberStats, getMemberTasks,
  getMemberListings, getMemberViewings, createListing,
} from '../api/client'
import './Dashboard.css'

const NAV = [
  { id: 'overview',  icon: '🏠', label: 'ภาพรวม' },
  { id: 'listings',  icon: '📋', label: 'ประกาศของฉัน', count: 9 },
  { id: 'viewings',  icon: '📅', label: 'นัดชม', count: 6 },
  { id: 'messages',  icon: '💬', label: 'ข้อความ', count: 4 },
  { id: 'contracts', icon: '📝', label: 'สัญญาเช่า' },
  { group: 'เงิน' },
  { id: 'revenue',   icon: '💳', label: 'รายรับ / มัดจำ' },
  { id: 'receipts',  icon: '🧾', label: 'ใบเสร็จ' },
  { group: 'บัญชี' },
  { id: 'reviews',   icon: '⭐', label: 'รีวิว 4.8' },
  { id: 'settings',  icon: '⚙️', label: 'ตั้งค่า' },
]

const STATUS = {
  live:    { cls: 'tg-live', label: 'เผยแพร่' },
  pending: { cls: 'tg-wait', label: 'รอตรวจสอบ' },
  rented:  { cls: 'tg-off',  label: 'เช่าแล้ว' },
}

export default function Member() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [listings, setListings] = useState([])
  const [viewings, setViewings] = useState([])
  const [loading, setLoading] = useState(true)
  const [doneTasks, setDoneTasks] = useState([])

  // ฟอร์มลงประกาศ
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [form, setForm] = useState({
    postAs: 'agent',
    type: 'condo',
    title: '',
    district: '',
    availableFrom: '',
    bedrooms: 1,
    bathrooms: 1,
    sizeSqm: 30,
    price: 15000,
    amenities: ['aircon', 'furnished', 'bts', 'washer'],
  })

  useEffect(() => {
    let alive = true
    Promise.all([
      getMemberProfile(),
      getMemberStats(),
      getMemberTasks(),
      getMemberListings(),
      getMemberViewings(),
    ])
      .then(([p, s, t, l, v]) => {
        if (!alive) return
        setProfile(p); setStats(s); setTasks(t); setListings(l); setViewings(v)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  function toggleAmenity(id) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(id)
        ? f.amenities.filter((a) => a !== id)
        : [...f.amenities, id],
    }))
  }

  async function submitListing() {
    setSaving(true)
    setSavedMsg('')
    try {
      await createListing(form)
      setSavedMsg('✓ ส่งประกาศเพื่อตรวจสอบแล้ว — แอดมินจะตรวจภายใน 24 ชม.')
      setStep(1)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile || !stats) {
    return <div className="spin" />
  }

  // ทรัพย์ตัวอย่างสำหรับ preview card
  const previewItem = {
    id: 'preview',
    title: form.title || 'ชื่อประกาศของคุณ',
    typeLabel: PROPERTY_TYPES.find((t) => t.id === form.type)?.label || 'คอนโด',
    district: form.district || 'ทำเล',
    nearby: `โดย ${profile.name}`,
    price: Number(form.price) || 0,
    bedrooms: Number(form.bedrooms),
    bathrooms: Number(form.bathrooms),
    sizeSqm: Number(form.sizeSqm),
    type: form.type,
    rating: 0,
    verified: profile.verified,
    hot: false,
    photos: ['g1', 'g6', 'g3'],
  }

  const visibleTasks = tasks.filter((t) => !doneTasks.includes(t.id))

  return (
    <div className="app">
      <Sidebar variant="member" profile={profile} items={NAV} active="overview" />

      <main className="main">
        <div className="phead">
          <div>
            <h2>สวัสดี {profile.name.split(' ')[0]} 👋</h2>
            <p>วันนี้มีนัดชม 2 รายการ และข้อความใหม่ 4 ข้อความ</p>
          </div>
          <button className="btn-p" onClick={() => document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' })}>
            + ลงประกาศใหม่
          </button>
        </div>

        <div className="kpis">
          <Kpi tone="k1" ic="📋" k="ประกาศเปิดอยู่" v={stats.activeListings} d={`${stats.pendingReview} รอตรวจสอบ`} />
          <Kpi tone="k2" ic="📅" k="นัดชมสัปดาห์นี้" v={stats.viewingsThisWeek} d={`▲ ${stats.viewingsDelta} จากสัปดาห์ก่อน`} up />
          <Kpi tone="k3" ic="👁️" k="คนเข้าชมประกาศ" v={stats.totalViews.toLocaleString()} d={`▲ ${stats.viewsDeltaPct}%`} up />
          <Kpi tone="k4" ic="✅" k="ปล่อยเช่าสำเร็จ" v={stats.closedThisMonth} d="เดือนนี้" />
        </div>

        <div className="two-col">
          <div className="stack">
            <div className="pn">
              <div className="pn-h">
                <h3>ต้องทำวันนี้</h3>
                <span className="tg tg-hot">{visibleTasks.length} รายการ</span>
              </div>
              {visibleTasks.length === 0 ? (
                <div className="done-all">🎉 เคลียร์หมดแล้ว ไม่มีอะไรค้าง</div>
              ) : (
                visibleTasks.map((t) => (
                  <div className="lrow" key={t.id}>
                    <div className="th" style={{ background: GRADIENTS[t.photo] }} />
                    <div className="info">
                      <div className="info-t">{t.title}</div>
                      <div className="info-s">{t.sub}</div>
                    </div>
                    <div className="act">
                      {t.actions.map((a, i) => (
                        <button
                          key={i}
                          className={
                            a.variant === 'ok' ? 'btn-ok'
                            : a.variant === 'primary' ? 'btn-p btn-s'
                            : 'btn-o btn-s'
                          }
                          onClick={() => setDoneTasks((d) => [...d, t.id])}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pn">
              <div className="pn-h">
                <h3>ประกาศของฉัน</h3>
                <button className="btn-o btn-s">+ เพิ่ม</button>
              </div>
              {listings.map((l) => (
                <div className="lrow" key={l.id}>
                  <div className="th" style={{ background: GRADIENTS[l.photo] }} />
                  <div className="info">
                    <div className="info-t">{l.title}</div>
                    <div className="info-s">{l.sub}</div>
                  </div>
                  <div className="num">
                    <div className="num-n">฿{l.price.toLocaleString()}</div>
                    <div className="num-l">{l.views ? `${l.views.toLocaleString()} วิว` : '—'}</div>
                  </div>
                  <div className="act">
                    <span className={`tg ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span>
                    <button className="ib">✏️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stack">
            <div className="pn pn-pad">
              <h3 className="pn-title">รายรับเดือนนี้</h3>
              <div className="big">฿{stats.revenueThisMonth.toLocaleString()}</div>
              <div className="delta up">▲ {stats.revenueDeltaPct}% จากเดือนก่อน</div>
              <div className="chart">
                {stats.revenueChart.map((b) => (
                  <div className="b" key={b.label}>
                    <i style={{ height: `${b.value}%` }} />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
              <button className="btn-o btn-s full">ดูรายละเอียด</button>
            </div>

            <div className="pn">
              <div className="pn-h"><h3>นัดชมที่จะถึง</h3></div>
              {viewings.map((v) => (
                <div className="dsp" key={v.id}>
                  <div className="dsp-r1">
                    <b>{v.name}</b>
                    <span className={`tg ${v.status === 'confirmed' ? 'tg-live' : 'tg-wait'}`}>
                      {v.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                    </span>
                  </div>
                  <div className="dsp-r2">{v.when} · {v.property}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- ฟอร์มลงประกาศ ---------- */}
        <div className="phead" id="post-form" style={{ marginTop: 34 }}>
          <div>
            <h2>ลงประกาศ</h2>
            <p>กรอก 3 ขั้นตอน เสร็จใน 3 นาที</p>
          </div>
        </div>

        {savedMsg && <div className="flash">{savedMsg}</div>}

        <div className="steps">
          {['ข้อมูลทรัพย์', 'รูปภาพ', 'ราคา & เงื่อนไข'].map((s, i) => (
            <button
              key={s}
              className={`step ${step === i + 1 ? 'on' : ''}`}
              onClick={() => setStep(i + 1)}
            >
              <span className="step-n">{i + 1}</span> {s}
            </button>
          ))}
        </div>

        <div className="two-col">
          <div className="pn pn-form">
            {step === 1 && (
              <>
                <div className="fr">
                  <label>ลงในฐานะ</label>
                  <div className="chips">
                    <button
                      className={`chip ${form.postAs === 'owner' ? 'on' : ''}`}
                      onClick={() => setForm({ ...form, postAs: 'owner' })}
                    >🙋 เจ้าของเอง</button>
                    <button
                      className={`chip ${form.postAs === 'agent' ? 'on' : ''}`}
                      onClick={() => setForm({ ...form, postAs: 'agent' })}
                    >💼 นายหน้า</button>
                  </div>
                </div>

                <div className="fr">
                  <label>ประเภททรัพย์</label>
                  <div className="chips">
                    {PROPERTY_TYPES.filter((t) => t.id !== 'all').map((t) => (
                      <button
                        key={t.id}
                        className={`chip ${form.type === t.id ? 'on' : ''}`}
                        onClick={() => setForm({ ...form, type: t.id })}
                      >{t.icon} {t.label}</button>
                    ))}
                  </div>
                </div>

                <div className="fr">
                  <label htmlFor="ftitle">ชื่อประกาศ</label>
                  <input
                    id="ftitle"
                    placeholder="เช่น The Base รัชดา 1 ห้องนอน ชั้น 22 วิวเมือง"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="g2c">
                  <div className="fr">
                    <label htmlFor="fdist">ทำเล / เขต</label>
                    <input
                      id="fdist"
                      placeholder="เช่น ห้วยขวาง กรุงเทพฯ"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value })}
                    />
                  </div>
                  <div className="fr">
                    <label htmlFor="favail">เข้าอยู่ได้</label>
                    <input
                      id="favail"
                      placeholder="เช่น 1 ก.ค. 2568"
                      value={form.availableFrom}
                      onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                    />
                  </div>
                </div>

                <div className="g3c">
                  <div className="fr">
                    <label htmlFor="fbed">ห้องนอน</label>
                    <input id="fbed" type="number" min="0" value={form.bedrooms}
                      onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                  </div>
                  <div className="fr">
                    <label htmlFor="fbath">ห้องน้ำ</label>
                    <input id="fbath" type="number" min="0" value={form.bathrooms}
                      onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                  </div>
                  <div className="fr">
                    <label htmlFor="fsize">ตร.ม.</label>
                    <input id="fsize" type="number" min="0" value={form.sizeSqm}
                      onChange={(e) => setForm({ ...form, sizeSqm: e.target.value })} />
                  </div>
                </div>

                <div className="fr">
                  <label>จุดเด่น</label>
                  <div className="chips">
                    {AMENITIES.map((a) => (
                      <button
                        key={a.id}
                        className={`chip ${form.amenities.includes(a.id) ? 'on' : ''}`}
                        onClick={() => toggleAmenity(a.id)}
                      >{a.icon} {a.label}</button>
                    ))}
                  </div>
                </div>

                <button className="btn-p full big-btn" onClick={() => setStep(2)}>ถัดไป →</button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="fr">
                  <label>รูปภาพ</label>
                  <div className="drop">
                    📷 ลากรูปมาวาง หรือ <b>เลือกไฟล์</b>
                    <br />
                    <span className="drop-sub">รูปแรกจะเป็นรูปปก · แนะนำอย่างน้อย 5 รูป</span>
                  </div>
                </div>
                <div className="fr">
                  <label>วิดีโอ (ไม่บังคับ)</label>
                  <div className="drop">
                    🎥 อัปโหลดวิดีโอพาชม 1 คลิป
                    <br />
                    <span className="drop-sub">ประกาศที่มีวิดีโอมีคนดูมากกว่า 2 เท่า</span>
                  </div>
                </div>
                <div className="btn-pair">
                  <button className="btn-o full" onClick={() => setStep(1)}>← ย้อนกลับ</button>
                  <button className="btn-p full big-btn" onClick={() => setStep(3)}>ถัดไป →</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="g2c">
                  <div className="fr">
                    <label htmlFor="fprice">ค่าเช่า / เดือน (฿)</label>
                    <input id="fprice" type="number" value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div className="fr">
                    <label htmlFor="fdep">มัดจำ (เดือน)</label>
                    <select id="fdep" defaultValue="2">
                      <option value="1">1 เดือน</option>
                      <option value="2">2 เดือน</option>
                      <option value="3">3 เดือน</option>
                    </select>
                  </div>
                </div>
                <div className="fr">
                  <label htmlFor="flease">สัญญาขั้นต่ำ</label>
                  <select id="flease" defaultValue="12">
                    <option value="6">6 เดือน</option>
                    <option value="12">12 เดือน</option>
                    <option value="24">24 เดือน</option>
                  </select>
                </div>
                <div className="fr">
                  <label htmlFor="fdesc">รายละเอียด</label>
                  <textarea id="fdesc" rows="4" placeholder="บอกจุดเด่นของทรัพย์ ทำเล การเดินทาง สิ่งอำนวยความสะดวก..." />
                </div>
                <div className="btn-pair">
                  <button className="btn-o full" onClick={() => setStep(2)}>← ย้อนกลับ</button>
                  <button className="btn-p full big-btn" onClick={submitListing} disabled={saving}>
                    {saving ? 'กำลังส่ง...' : 'ส่งประกาศเพื่อตรวจสอบ'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="prev">
            <div className="prev-l">ตัวอย่างที่คนเช่าจะเห็น</div>
            <div className="prev-body">
              <PropertyCard item={previewItem} preview />
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
