import { useEffect, useState, useCallback } from 'react'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import PropertyCard from '../components/PropertyCard'
import { Link } from 'react-router-dom'
import { PROPERTY_TYPES, AMENITIES, ROOM_FEATURES, LISTING_TYPES } from '../data/constants'
import { photoStyle } from '../lib/photo'
import {
  getMemberProfile, getMemberStats, getMemberTasks,
  getMemberListings, getMemberViewings, createListing,
  getMemberMessages, getMemberContracts, getMemberTransactions,
  getMemberReceipts, getMemberReviews, updateMyProfile,
  uploadListingPhotos, deleteListingPhoto,
  updateListing, deleteListing, setListingStatus, getListingForEdit,
  getMyBookings, respondBooking, payBooking,
  createContractFromBooking, getMyContracts, signContract,
} from '../api/client'
import './Dashboard.css'

// ตัวเลขบนเมนู = จำนวนจริงของบัญชีนี้
const buildNav = ({ listings = 0, viewings = 0, bookings = 0, rating } = {}) => [
  { id: 'overview',  icon: '🏠', label: 'ภาพรวม' },
  { id: 'listings',  icon: '📋', label: 'ประกาศของฉัน', count: listings || undefined },
  { id: 'viewings',  icon: '📅', label: 'นัดชม', count: viewings || undefined },
  { id: 'bookings',  icon: '🔒', label: 'การจอง / มัดจำ', count: bookings || undefined },
  { id: 'messages',  icon: '💬', label: 'ข้อความ' },
  { id: 'contracts', icon: '📝', label: 'สัญญาเช่า' },
  { group: 'เงิน' },
  { id: 'revenue',   icon: '💳', label: 'รายรับ / มัดจำ' },
  { id: 'receipts',  icon: '🧾', label: 'ใบเสร็จ' },
  { group: 'บัญชี' },
  { id: 'reviews',   icon: '⭐', label: rating ? `รีวิว ${rating}` : 'รีวิว' },
  { id: 'settings',  icon: '⚙️', label: 'ตั้งค่า' },
]

const STATUS = {
  live:    { cls: 'tg-live', label: 'เผยแพร่' },
  pending: { cls: 'tg-wait', label: 'รอตรวจสอบ' },
  rented:  { cls: 'tg-off',  label: 'เช่าแล้ว' },
}

export default function Member() {
  const [tab, setTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [listings, setListings] = useState([])
  const [viewings, setViewings] = useState([])
  const [loading, setLoading] = useState(true)
  const [doneTasks, setDoneTasks] = useState([])
  const [bookingCount, setBookingCount] = useState(0)

  // โหลดข้อมูลทั้งหมด — เรียกซ้ำได้หลังแก้ไข/ลบ
  const reload = useCallback(async () => {
    const [p, s, t, l, v, b] = await Promise.all([
      getMemberProfile(), getMemberStats(), getMemberTasks(),
      getMemberListings(), getMemberViewings(), getMyBookings(),
    ])
    setProfile(p); setStats(s); setTasks(t); setListings(l); setViewings(v)
    setBookingCount((b || []).filter((x) => ['pending', 'accepted'].includes(x.status)).length)
  }, [])

  useEffect(() => {
    let alive = true
    reload()
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [reload])

  if (loading) return (<><Header /><div className="spin" /></>)

  // โหลดโปรไฟล์ไม่ได้ (เช่น trigger ไม่ทำงาน) — แสดงทางแก้แทนหมุนค้าง
  if (!profile || !stats) {
    return (
      <>
        <Header />
        <div className="empty" style={{ padding: '70px 20px', textAlign: 'center' }}>
          <div className="empty-ic" style={{ fontSize: 44, opacity: .5 }}>⚠️</div>
          <h3>โหลดข้อมูลบัญชีไม่สำเร็จ</h3>
          <p style={{ color: 'var(--sub)', margin: '6px 0 18px' }}>
            อาจเป็นเพราะการเชื่อมต่อขัดข้อง หรือบัญชียังไม่มีโปรไฟล์ในระบบ
          </p>
          <button className="btn-p" onClick={() => { setLoading(true); reload().finally(() => setLoading(false)) }}>
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="app">
        <Sidebar
          variant="member"
          profile={profile}
          items={buildNav({
            listings: listings.length, viewings: viewings.length,
            bookings: bookingCount, rating: profile.rating,
          })}
          active={tab}
          onSelect={setTab}
        />
        <main className="main">
          {tab === 'overview' && (
            <OverviewTab
              profile={profile} stats={stats} tasks={tasks} listings={listings}
              viewings={viewings} doneTasks={doneTasks} setDoneTasks={setDoneTasks}
              goTab={setTab}
            />
          )}
          {tab === 'listings' && <ListingsTab listings={listings} profile={profile} onChanged={reload} />}
          {tab === 'viewings' && <ViewingsTab initial={viewings} />}
          {tab === 'bookings' && <BookingsTab />}
          {tab === 'messages' && <MessagesTab />}
          {tab === 'contracts' && <ContractsTab />}
          {tab === 'revenue' && <RevenueTab stats={stats} />}
          {tab === 'receipts' && <ReceiptsTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'settings' && <SettingsTab profile={profile} onChanged={reload} />}
        </main>
      </div>
    </>
  )
}

/* ==================== ภาพรวม ==================== */
function OverviewTab({ profile, stats, tasks, listings, viewings, doneTasks, setDoneTasks, goTab }) {
  const visibleTasks = tasks.filter((t) => !doneTasks.includes(t.id))
  return (
    <>
      <div className="phead">
        <div>
          <h2>สวัสดี {(profile.name || 'คุณ').split(' ')[0]} 👋</h2>
          <p>
            {viewings.length > 0 ? `มีนัดชม ${viewings.length} รายการ` : 'ยังไม่มีนัดชม'}
            {visibleTasks.length > 0 ? ` · ${visibleTasks.length} รายการต้องทำ` : ''}
          </p>
        </div>
        <button className="btn-p" onClick={() => goTab('listings')}>+ ลงประกาศใหม่</button>
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
            <div className="pn-h"><h3>ต้องทำวันนี้</h3><span className="tg tg-hot">{visibleTasks.length} รายการ</span></div>
            {visibleTasks.length === 0 ? (
              <div className="done-all">🎉 เคลียร์หมดแล้ว ไม่มีอะไรค้าง</div>
            ) : visibleTasks.map((t) => (
              <div className="lrow" key={t.id}>
                <div className="th" style={photoStyle(t.photo)} />
                <div className="info">
                  <div className="info-t">{t.title}</div>
                  <div className="info-s">{t.sub}</div>
                </div>
                <div className="act">
                  {t.actions.map((a, i) => (
                    <button key={i}
                      className={a.variant === 'ok' ? 'btn-ok' : a.variant === 'primary' ? 'btn-p btn-s' : 'btn-o btn-s'}
                      onClick={() => setDoneTasks((d) => [...d, t.id])}
                    >{a.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pn">
            <div className="pn-h"><h3>ประกาศของฉัน</h3><button className="btn-o btn-s" onClick={() => goTab('listings')}>ดูทั้งหมด</button></div>
            {listings.slice(0, 3).map((l) => (
              <div className="lrow" key={l.id}>
                <div className="th" style={photoStyle(l.photo)} />
                <div className="info"><div className="info-t">{l.title}</div><div className="info-s">{l.sub}</div></div>
                <div className="num"><div className="num-n">฿{Number(l.price || 0).toLocaleString()}</div><div className="num-l">{l.views ? `${l.views.toLocaleString()} วิว` : '—'}</div></div>
                <div className="act"><span className={`tg ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span></div>
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
                <div className="b" key={b.label}><i style={{ height: `${b.value}%` }} /><span>{b.label}</span></div>
              ))}
            </div>
            <button className="btn-o btn-s full" onClick={() => goTab('revenue')}>ดูรายละเอียด</button>
          </div>

          <div className="pn">
            <div className="pn-h"><h3>นัดชมที่จะถึง</h3><button className="btn-o btn-s" onClick={() => goTab('viewings')}>จัดการ</button></div>
            {viewings.map((v) => (
              <div className="dsp" key={v.id}>
                <div className="dsp-r1"><b>{v.name}</b>
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
    </>
  )
}

/* ==================== ประกาศของฉัน + ฟอร์มลงประกาศ ==================== */
function ListingsTab({ listings, profile, onChanged }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [editingId, setEditingId] = useState(null)   // null = สร้างใหม่
  const [busyId, setBusyId] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const BLANK = {
    type: 'condo', listingType: 'rent', title: '', district: '', province: 'กรุงเทพฯ',
    availableFrom: '', bedrooms: 1, bathrooms: 1, sizeSqm: 30,
    price: 15000, salePrice: '', amenities: ['aircon', 'furnished'],
    rooms: ['living', 'kitchen'], depositMonths: 2, minLeaseMonths: 12,
    description: '', floorNo: '', totalFloors: '', contactPhone: '', contactLine: '',
  }
  const [form, setForm] = useState(BLANK)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [upErr, setUpErr] = useState('')

  const isEditing = Boolean(editingId)

  function toggleIn(field, id) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter((a) => a !== id) : [...f[field], id],
    }))
  }

  // ---------- อัปโหลดรูป ----------
  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    if (photos.length + files.length > 10) { setUpErr('อัปโหลดได้สูงสุด 10 รูป'); return }
    setUpErr(''); setUploading(true)
    try {
      const urls = await uploadListingPhotos(files, editingId || 'draft')
      setPhotos((p) => [...p, ...urls])
    } catch (e) { setUpErr(e.message) } finally { setUploading(false) }
  }

  function removePhoto(url) {
    setPhotos((p) => p.filter((x) => x !== url))
    deleteListingPhoto(url).catch(() => {})
  }

  function movePhotoFirst(url) {
    setPhotos((p) => [url, ...p.filter((x) => x !== url)])
  }

  // ---------- เปิดฟอร์มแก้ไข ----------
  async function startEdit(id) {
    setBusyId(id); setSavedMsg('')
    try {
      const d = await getListingForEdit(id)
      if (!d) { setSavedMsg('✕ ไม่พบประกาศนี้'); return }
      setForm({ ...BLANK, ...d })
      setPhotos((d.photos || []).filter((p) => typeof p === 'string' && p.startsWith('http')))
      setEditingId(id); setStep(1); setShowForm(true)
      window.scrollTo({ top: 320, behavior: 'smooth' })
    } catch (e) { setSavedMsg('✕ ' + e.message) } finally { setBusyId(null) }
  }

  function startNew() {
    setForm(BLANK); setPhotos([]); setEditingId(null); setStep(1); setShowForm(true)
    setSavedMsg('')
  }

  function cancelForm() {
    setForm(BLANK); setPhotos([]); setEditingId(null); setStep(1); setShowForm(false)
  }

  // ---------- บันทึก ----------
  async function submitListing() {
    if (!form.title.trim()) { setSavedMsg('✕ กรุณาใส่ชื่อประกาศ'); setStep(1); return }
    if (!form.district.trim()) { setSavedMsg('✕ กรุณาใส่ทำเล'); setStep(1); return }
    setSaving(true); setSavedMsg('')
    try {
      if (isEditing) {
        await updateListing(editingId, { ...form, photos })
        setSavedMsg('✓ บันทึกการแก้ไขแล้ว')
      } else {
        await createListing({ ...form, photos })
        setSavedMsg('✓ ส่งประกาศเพื่อตรวจสอบแล้ว — แอดมินจะตรวจภายใน 24 ชม.')
      }
      cancelForm()
      onChanged?.()
    } catch (e) {
      setSavedMsg('✕ ' + e.message)
    } finally { setSaving(false) }
  }

  // ---------- ลบ / เปลี่ยนสถานะ ----------
  async function doDelete(id) {
    setBusyId(id)
    try {
      await deleteListing(id)
      setSavedMsg('✓ ลบประกาศแล้ว')
      setConfirmDel(null)
      if (editingId === id) cancelForm()
      onChanged?.()
    } catch (e) { setSavedMsg('✕ ' + e.message) } finally { setBusyId(null) }
  }

  async function changeStatus(id, status) {
    setBusyId(id)
    try {
      await setListingStatus(id, status)
      setSavedMsg(status === 'rented' ? '✓ ทำเครื่องหมายว่าปล่อยเช่าแล้ว' : '✓ เปิดประกาศอีกครั้ง')
      onChanged?.()
    } catch (e) { setSavedMsg('✕ ' + e.message) } finally { setBusyId(null) }
  }

  const previewItem = {
    id: 'preview',
    title: form.title || 'ชื่อประกาศของคุณ',
    typeLabel: PROPERTY_TYPES.find((t) => t.id === form.type)?.label || 'คอนโด',
    district: form.district || 'ทำเล',
    nearby: `โดย ${profile.name}`,
    price: Number(form.price) || 0,
    salePrice: Number(form.salePrice) || 0,
    listingType: form.listingType,
    bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
    sizeSqm: Number(form.sizeSqm), type: form.type,
    rating: 0, verified: profile.verified, hot: false,
    photos: photos.length ? photos : ['g1', 'g6', 'g3'],
  }

  const forRent = form.listingType !== 'sale'
  const forSale = form.listingType === 'sale' || form.listingType === 'both'

  return (
    <>
      <div className="phead">
        <div><h2>ประกาศของฉัน</h2><p>{listings.length} รายการ · แก้ไข ปิด หรือลบได้ที่นี่</p></div>
        <button className="btn-p" onClick={startNew}>+ ลงประกาศใหม่</button>
      </div>

      {savedMsg && <div className={`flash ${savedMsg.startsWith('✕') ? 'err' : ''}`}>{savedMsg}</div>}

      <div className="pn" style={{ marginBottom: 28 }}>
        {listings.length === 0 ? (
          <div className="done-all">ยังไม่มีประกาศ — กด &ldquo;ลงประกาศใหม่&rdquo; เพื่อเริ่ม</div>
        ) : listings.map((l) => (
          <div key={l.id}>
            <div className="lrow">
              <div className="th" style={photoStyle(l.photo)} />
              <div className="info">
                <div className="info-t">{l.title}</div>
                <div className="info-s">{l.sub}</div>
              </div>
              <div className="num">
                <div className="num-n">฿{Number(l.price || 0).toLocaleString()}</div>
                <div className="num-l">{l.views ? `${l.views.toLocaleString()} วิว` : '—'}</div>
              </div>
              <div className="act">
                <span className={`tg ${(STATUS[l.status] || STATUS.pending).cls}`}>
                  {(STATUS[l.status] || STATUS.pending).label}
                </span>
                <button className="ib" title="แก้ไข" disabled={busyId === l.id}
                  onClick={() => startEdit(l.id)}>✏️</button>
                <Link className="ib" title="ดูหน้าประกาศ" to={`/property/${l.id}`}>👁️</Link>
                {l.status === 'live' ? (
                  <button className="ib" title="ทำเครื่องหมายว่าปล่อยเช่าแล้ว" disabled={busyId === l.id}
                    onClick={() => changeStatus(l.id, 'rented')}>✅</button>
                ) : l.status === 'rented' ? (
                  <button className="ib" title="เปิดประกาศอีกครั้ง" disabled={busyId === l.id}
                    onClick={() => changeStatus(l.id, 'live')}>↩︎</button>
                ) : null}
                <button className="ib danger" title="ลบประกาศ" disabled={busyId === l.id}
                  onClick={() => setConfirmDel(l.id)}>🗑️</button>
              </div>
            </div>

            {confirmDel === l.id && (
              <div className="confirmbar">
                <span>ลบ &ldquo;{l.title}&rdquo; ถาวร? รูปทั้งหมดจะถูกลบด้วย และกู้คืนไม่ได้</span>
                <div className="cb-act">
                  <button className="btn-o btn-s" onClick={() => setConfirmDel(null)}>ยกเลิก</button>
                  <button className="btn-no" disabled={busyId === l.id} onClick={() => doDelete(l.id)}>
                    {busyId === l.id ? 'กำลังลบ...' : 'ยืนยันลบ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!showForm ? null : (
        <>
          <div className="phead">
            <div>
              <h2>{isEditing ? 'แก้ไขประกาศ' : 'ลงประกาศใหม่'}</h2>
              <p>{isEditing ? `กำลังแก้ไข #${editingId}` : 'กรอก 3 ขั้นตอน เสร็จใน 3 นาที'}</p>
            </div>
            <button className="btn-o" onClick={cancelForm}>ยกเลิก</button>
          </div>

          <div className="steps">
            {['ข้อมูลทรัพย์', 'รูปภาพ', 'ราคา & เงื่อนไข'].map((s, i) => (
              <button key={s} className={`step ${step === i + 1 ? 'on' : ''}`} onClick={() => setStep(i + 1)}>
                <span className="step-n">{i + 1}</span> {s}
              </button>
            ))}
          </div>

          <div className="two-col">
            <div className="pn pn-form">
              {step === 1 && (
                <>
                  <div className="fr"><label>ประกาศนี้ต้องการ</label>
                    <div className="chips">
                      {LISTING_TYPES.map((t) => (
                        <button key={t.id} className={`chip ${form.listingType === t.id ? 'on' : ''}`}
                          onClick={() => setForm({ ...form, listingType: t.id })}>{t.icon} {t.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="fr"><label>ประเภททรัพย์</label>
                    <div className="chips">
                      {PROPERTY_TYPES.filter((t) => t.id !== 'all').map((t) => (
                        <button key={t.id} className={`chip ${form.type === t.id ? 'on' : ''}`}
                          onClick={() => setForm({ ...form, type: t.id })}>{t.icon} {t.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="fr"><label htmlFor="ftitle">ชื่อประกาศ *</label>
                    <input id="ftitle" placeholder="เช่น The Base รัชดา 1 ห้องนอน ชั้น 22 วิวเมือง"
                      value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>

                  <div className="g2c">
                    <div className="fr"><label htmlFor="fdist">ทำเล / เขต *</label>
                      <input id="fdist" placeholder="เช่น ห้วยขวาง" value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
                    <div className="fr"><label htmlFor="fprov">จังหวัด</label>
                      <input id="fprov" placeholder="เช่น กรุงเทพฯ" value={form.province}
                        onChange={(e) => setForm({ ...form, province: e.target.value })} /></div>
                  </div>

                  <div className="g2c">
                    <div className="fr"><label htmlFor="favail">{forRent ? 'เข้าอยู่ได้' : 'พร้อมโอน'}</label>
                      <input id="favail" placeholder="เช่น 1 ก.ย. 2569" value={form.availableFrom}
                        onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} /></div>
                    <div className="fr"><label htmlFor="ffloor">ชั้นที่ (ถ้ามี)</label>
                      <input id="ffloor" placeholder="เช่น 22" value={form.floorNo}
                        onChange={(e) => setForm({ ...form, floorNo: e.target.value })} /></div>
                  </div>

                  <div className="g3c">
                    <div className="fr"><label htmlFor="fbed">ห้องนอน</label>
                      <input id="fbed" type="number" min="0" value={form.bedrooms}
                        onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></div>
                    <div className="fr"><label htmlFor="fbath">ห้องน้ำ</label>
                      <input id="fbath" type="number" min="0" value={form.bathrooms}
                        onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></div>
                    <div className="fr"><label htmlFor="fsize">ตร.ม.</label>
                      <input id="fsize" type="number" min="0" value={form.sizeSqm}
                        onChange={(e) => setForm({ ...form, sizeSqm: e.target.value })} /></div>
                  </div>

                  <div className="fr"><label>ห้องและพื้นที่ใช้สอย</label>
                    <div className="chips">
                      {ROOM_FEATURES.map((r) => (
                        <button key={r.id} className={`chip ${form.rooms.includes(r.id) ? 'on' : ''}`}
                          onClick={() => toggleIn('rooms', r.id)}>{r.icon} {r.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="fr"><label>จุดเด่น / สิ่งอำนวยความสะดวก</label>
                    <div className="chips">
                      {AMENITIES.map((a) => (
                        <button key={a.id} className={`chip ${form.amenities.includes(a.id) ? 'on' : ''}`}
                          onClick={() => toggleIn('amenities', a.id)}>{a.icon} {a.label}</button>
                      ))}
                    </div>
                  </div>

                  <button className="btn-p full big-btn" onClick={() => setStep(2)}>ถัดไป →</button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="fr">
                    <label>รูปภาพ ({photos.length}/10)</label>
                    <label className={`drop ${uploading ? 'busy' : ''}`}>
                      <input type="file" accept="image/*" multiple hidden disabled={uploading}
                        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
                      {uploading ? (<>⏳ กำลังอัปโหลด...</>) : (
                        <>📷 กดเพื่อ <b>เลือกไฟล์รูป</b><br />
                          <span className="drop-sub">รูปแรกเป็นรูปปก · แนะนำอย่างน้อย 5 รูป · ไม่เกิน 5 MB ต่อรูป</span></>
                      )}
                    </label>
                  </div>

                  {upErr && <div className="flash err">{upErr}</div>}

                  {photos.length > 0 && (
                    <div className="fr">
                      <label>รูปที่อัปโหลดแล้ว — กดรูปเพื่อตั้งเป็นปก</label>
                      <div className="photogrid">
                        {photos.map((url, i) => (
                          <div className="photoitem" key={url} style={photoStyle(url)}
                            onClick={() => movePhotoFirst(url)} title="ตั้งเป็นรูปปก">
                            {i === 0 && <span className="photocover">ปก</span>}
                            <button className="photodel"
                              onClick={(e) => { e.stopPropagation(); removePhoto(url) }} title="ลบรูปนี้">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="btn-pair">
                    <button className="btn-o full" onClick={() => setStep(1)}>← ย้อนกลับ</button>
                    <button className="btn-p full big-btn" onClick={() => setStep(3)}>ถัดไป →</button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  {forRent && (
                    <div className="g2c">
                      <div className="fr"><label htmlFor="fprice">ค่าเช่า / เดือน (฿)</label>
                        <input id="fprice" type="number" min="0" value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                      <div className="fr"><label htmlFor="fdep">มัดจำ (เดือน)</label>
                        <select id="fdep" value={form.depositMonths}
                          onChange={(e) => setForm({ ...form, depositMonths: e.target.value })}>
                          <option value="1">1 เดือน</option><option value="2">2 เดือน</option><option value="3">3 เดือน</option>
                        </select></div>
                    </div>
                  )}

                  {forSale && (
                    <div className="fr"><label htmlFor="fsale">ราคาขาย (฿)</label>
                      <input id="fsale" type="number" min="0" placeholder="เช่น 2500000" value={form.salePrice}
                        onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></div>
                  )}

                  {forRent && (
                    <div className="fr"><label htmlFor="flease">สัญญาขั้นต่ำ</label>
                      <select id="flease" value={form.minLeaseMonths}
                        onChange={(e) => setForm({ ...form, minLeaseMonths: e.target.value })}>
                        <option value="6">6 เดือน</option><option value="12">12 เดือน</option><option value="24">24 เดือน</option>
                      </select></div>
                  )}

                  <div className="g2c">
                    <div className="fr"><label htmlFor="fphone">เบอร์ติดต่อ</label>
                      <input id="fphone" placeholder="08x-xxx-xxxx" value={form.contactPhone}
                        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
                    <div className="fr"><label htmlFor="fline">LINE ID</label>
                      <input id="fline" placeholder="@yourline" value={form.contactLine}
                        onChange={(e) => setForm({ ...form, contactLine: e.target.value })} /></div>
                  </div>

                  <div className="fr"><label htmlFor="fdesc">รายละเอียด</label>
                    <textarea id="fdesc" rows="5" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="บอกจุดเด่นของทรัพย์ ทำเล การเดินทาง สิ่งอำนวยความสะดวก..." /></div>

                  <div className="btn-pair">
                    <button className="btn-o full" onClick={() => setStep(2)}>← ย้อนกลับ</button>
                    <button className="btn-p full big-btn" onClick={submitListing} disabled={saving}>
                      {saving ? 'กำลังบันทึก...' : isEditing ? '💾 บันทึกการแก้ไข' : 'ส่งประกาศเพื่อตรวจสอบ'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="prev">
              <div className="prev-l">ตัวอย่างที่ผู้ค้นหาจะเห็น</div>
              <div className="prev-body"><PropertyCard item={previewItem} preview /></div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ==================== นัดชม ==================== */
function ViewingsTab({ initial }) {
  const [items, setItems] = useState(initial)
  const confirm = (id) => setItems((s) => s.map((v) => v.id === id ? { ...v, status: 'confirmed' } : v))
  const cancel = (id) => setItems((s) => s.filter((v) => v.id !== id))

  return (
    <>
      <div className="phead"><div><h2>นัดชม</h2><p>{items.length} รายการ · ยืนยัน เลื่อน หรือยกเลิกได้ที่นี่</p></div></div>
      <div className="pn">
        {items.length === 0 ? (
          <div className="done-all">ไม่มีนัดชมค้างอยู่</div>
        ) : items.map((v) => (
          <div className="lrow" key={v.id}>
            <div className="info">
              <div className="info-t">{v.name} — {v.property}</div>
              <div className="info-s">📅 {v.when}</div>
            </div>
            <div className="act">
              <span className={`tg ${v.status === 'confirmed' ? 'tg-live' : 'tg-wait'}`}>
                {v.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
              </span>
              {v.status !== 'confirmed' && <button className="btn-ok" onClick={() => confirm(v.id)}>ยืนยัน</button>}
              <button className="btn-o btn-s" onClick={() => cancel(v.id)}>ยกเลิก</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ==================== การจอง / มัดจำ ==================== */
const BK_STATUS = {
  pending:   { cls: 'tg-wait',   label: 'รอเจ้าของตอบรับ' },
  accepted:  { cls: 'tg-new',    label: 'รอชำระมัดจำ' },
  paid:      { cls: 'tg-live',   label: 'ชำระแล้ว · พักเงิน' },
  active:    { cls: 'tg-live',   label: 'เข้าอยู่แล้ว' },
  completed: { cls: 'tg-off',    label: 'จบสัญญา' },
  cancelled: { cls: 'tg-off',    label: 'ยกเลิก' },
  rejected:  { cls: 'tg-danger', label: 'ถูกปฏิเสธ' },
}

function BookingsTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [flash, setFlash] = useState('')
  const [qr, setQr] = useState(null)

  const load = () => getMyBookings().then(setRows).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function respond(id, accept) {
    setBusy(id)
    try {
      await respondBooking(id, accept)
      setFlash(accept ? '✓ ตอบรับคำขอจองแล้ว — รอผู้เช่าชำระมัดจำ' : '✕ ปฏิเสธคำขอจองแล้ว')
      await load()
      setTimeout(() => setFlash(''), 3500)
    } catch (e) { setFlash('✕ ' + e.message) } finally { setBusy(null) }
  }

  async function pay(id) {
    setBusy(id); setQr(null)
    try {
      const out = await payBooking(id, 'promptpay')
      if (out.qrUrl) setQr({ url: out.qrUrl, amount: out.amount, id })
      else setFlash(out.message || '✓ เริ่มรายการชำระเงินแล้ว')
      await load()
    } catch (e) { setFlash('✕ ' + e.message) } finally { setBusy(null) }
  }

  async function makeContract(id) {
    setBusy(id)
    try {
      await createContractFromBooking(id)
      setFlash('✓ สร้างสัญญาเช่าแล้ว — ไปลงนามที่แท็บ "สัญญาเช่า"')
      setTimeout(() => setFlash(''), 4000)
    } catch (e) { setFlash('✕ ' + e.message) } finally { setBusy(null) }
  }

  if (loading) return (<><div className="phead"><div><h2>การจอง / มัดจำ</h2></div></div><div className="spin" /></>)

  return (
    <>
      <div className="phead">
        <div><h2>การจอง / มัดจำ</h2><p>{rows.length} รายการ · เงินมัดจำพักในระบบจนกว่าจะเข้าอยู่</p></div>
      </div>
      {flash && <div className={`flash ${flash.startsWith('✕') ? 'err' : ''}`}>{flash}</div>}

      {qr && (
        <div className="pn pn-pad qrbox">
          <h3 className="pn-title">สแกนจ่ายด้วย PromptPay</h3>
          <img src={qr.url} alt="PromptPay QR" className="qrimg" />
          <div className="big">฿{Number(qr.amount).toLocaleString()}</div>
          <p className="qr-note">เปิดแอปธนาคาร → สแกน QR → ระบบจะอัปเดตอัตโนมัติเมื่อจ่ายสำเร็จ</p>
          <button className="btn-o btn-s" onClick={() => { setQr(null); load() }}>ปิด / รีเฟรชสถานะ</button>
        </div>
      )}

      <div className="pn">
        {rows.length === 0 ? (
          <div className="done-all">ยังไม่มีรายการจอง</div>
        ) : rows.map((b) => {
          const st = BK_STATUS[b.status] || BK_STATUS.pending
          return (
            <div className="lrow" key={b.id}>
              <div className="th" style={photoStyle(b.photo)} />
              <div className="info">
                <div className="info-t">{b.title}</div>
                <div className="info-s">
                  #{b.id} · เข้าอยู่ {b.moveIn || '-'} · {b.months} เดือน
                  {b.isOwner ? ' · คุณเป็นผู้ให้เช่า' : ' · คุณเป็นผู้เช่า'}
                </div>
              </div>
              <div className="num">
                <div className="num-n">฿{Number(b.total).toLocaleString()}</div>
                <div className="num-l">มัดจำ+ล่วงหน้า</div>
              </div>
              <div className="act">
                <span className={`tg ${st.cls}`}>{st.label}</span>

                {b.isOwner && b.status === 'pending' && (
                  <>
                    <button className="btn-ok" disabled={busy === b.id} onClick={() => respond(b.id, true)}>ตอบรับ</button>
                    <button className="btn-no" disabled={busy === b.id} onClick={() => respond(b.id, false)}>ปฏิเสธ</button>
                  </>
                )}

                {!b.isOwner && b.status === 'accepted' && (
                  <button className="btn-p btn-s" disabled={busy === b.id} onClick={() => pay(b.id)}>
                    {busy === b.id ? 'กำลังสร้าง QR...' : '💳 ชำระมัดจำ'}
                  </button>
                )}

                {b.status === 'paid' && b.isOwner && (
                  <button className="btn-o btn-s" disabled={busy === b.id} onClick={() => makeContract(b.id)}>
                    📝 สร้างสัญญา
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ==================== ข้อความ (แชต) ==================== */
function MessagesTab() {
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const active = threads.find((t) => t.id === activeId)

  useEffect(() => {
    let alive = true
    getMemberMessages().then((d) => {
      if (!alive) return
      setThreads(d || [])
      setActiveId((d && d[0]?.id) || null)
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return (<><div className="phead"><div><h2>ข้อความ</h2></div></div><div className="spin" /></>)
  if (threads.length === 0) return (
    <>
      <div className="phead"><div><h2>ข้อความ</h2><p>คุยกับผู้สนใจโดยตรง ทุกแชตผูกกับประกาศ</p></div></div>
      <div className="pn"><div className="done-all">ยังไม่มีข้อความ</div></div>
    </>
  )

  function send() {
    if (!draft.trim()) return
    setThreads((s) => s.map((t) =>
      t.id === activeId ? { ...t, msgs: [...t.msgs, { me: true, text: draft.trim() }], unread: 0 } : t
    ))
    setDraft('')
  }

  return (
    <>
      <div className="phead"><div><h2>ข้อความ</h2><p>คุยกับผู้สนใจโดยตรง ทุกแชตผูกกับประกาศ</p></div></div>
      <div className="pn chatwrap">
        <div className="threads">
          {threads.map((t) => (
            <div key={t.id} className={`thread ${t.id === activeId ? 'on' : ''}`}
              onClick={() => { setActiveId(t.id); setThreads((s) => s.map((x) => x.id === t.id ? { ...x, unread: 0 } : x)) }}>
              <div className="th" style={photoStyle(t.photo)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="t">{t.from}</div>
                <div className="s">{t.property} · {t.time}</div>
              </div>
              {t.unread > 0 && <span className="up-badge">{t.unread}</span>}
            </div>
          ))}
        </div>
        <div className="chatpane">
          <div className="chathead"><b>{active.from}</b><span> · {active.property}</span></div>
          <div className="chatlog">
            {active.msgs.map((m, i) => (
              <div key={i} className={`bub ${m.me ? 'me' : ''}`}>{m.text}</div>
            ))}
          </div>
          <div className="chatin">
            <input
              placeholder="พิมพ์ข้อความ..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn-p" onClick={send}>ส่ง</button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ==================== สัญญาเช่า ==================== */
const C_STATUS = {
  draft:               { cls: 'tg-off',  label: 'ร่าง' },
  awaiting_signatures: { cls: 'tg-wait', label: 'รอลงนาม' },
  active:              { cls: 'tg-live', label: 'มีผลบังคับใช้' },
  ending:              { cls: 'tg-wait', label: 'ใกล้ครบกำหนด' },
  ended:               { cls: 'tg-off',  label: 'สิ้นสุด' },
  cancelled:           { cls: 'tg-off',  label: 'ยกเลิก' },
}

function ContractsTab() {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(null)     // สัญญาที่กางอ่านอยู่
  const [signName, setSignName] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  const load = () => getMyContracts().then((d) => setRows(d || []))
  useEffect(() => { load() }, [])

  async function doSign(c) {
    if (signName.trim().length < 3) { setFlash('✕ กรุณาพิมพ์ชื่อ-นามสกุลเต็มเพื่อลงนาม'); return }
    setBusy(true)
    try {
      await signContract(c.id, signName.trim(), c.isOwner)
      setFlash('✓ ลงนามเรียบร้อย')
      setSignName(''); setOpen(null)
      await load()
      setTimeout(() => setFlash(''), 3500)
    } catch (e) { setFlash('✕ ' + e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="phead"><div><h2>สัญญาเช่า</h2><p>{rows.length} ฉบับ · ลงนามดิจิทัลได้ในระบบ</p></div></div>
      {flash && <div className={`flash ${flash.startsWith('✕') ? 'err' : ''}`}>{flash}</div>}

      <div className="pn">
        {rows.length === 0 ? <div className="done-all">ยังไม่มีสัญญา</div> : rows.map((c) => {
          const st = C_STATUS[c.status] || C_STATUS.draft
          const mySigned = c.isOwner ? c.ownerSigned : c.renterSigned
          return (
            <div key={c.id}>
              <div className="lrow">
                <div className="info">
                  <div className="info-t">{c.property}</div>
                  <div className="info-s">
                    #{c.id} · เริ่ม {c.start} · {c.months} เดือน · ฿{Number(c.rent).toLocaleString()}/ด.
                  </div>
                  <div className="signrow">
                    <span className={c.ownerSigned ? 'ok' : ''}>
                      {c.ownerSigned ? '✓' : '○'} ผู้ให้เช่า{c.ownerSignName ? ` (${c.ownerSignName})` : ''}
                    </span>
                    <span className={c.renterSigned ? 'ok' : ''}>
                      {c.renterSigned ? '✓' : '○'} ผู้เช่า{c.renterSignName ? ` (${c.renterSignName})` : ''}
                    </span>
                  </div>
                </div>
                <div className="act">
                  <span className={`tg ${st.cls}`}>{st.label}</span>
                  <button className="btn-o btn-s" onClick={() => setOpen(open === c.id ? null : c.id)}>
                    {open === c.id ? 'ปิด' : 'ดูสัญญา'}
                  </button>
                </div>
              </div>

              {open === c.id && (
                <div className="contractbox">
                  <pre className="contracttext">{c.body || 'ไม่มีเนื้อหาสัญญา'}</pre>
                  {!mySigned && c.status === 'awaiting_signatures' ? (
                    <div className="signbox">
                      <label>ลงนามดิจิทัล — พิมพ์ชื่อ-นามสกุลเต็มของคุณ</label>
                      <div className="signinput">
                        <input
                          value={signName}
                          onChange={(e) => setSignName(e.target.value)}
                          placeholder="เช่น สมชาย ใจดี"
                        />
                        <button className="btn-p" disabled={busy} onClick={() => doSign(c)}>
                          {busy ? 'กำลังลงนาม...' : '✍️ ลงนาม'}
                        </button>
                      </div>
                      <p className="signnote">
                        การพิมพ์ชื่อและกดลงนาม ถือเป็นการแสดงเจตนาผูกพันตามสัญญาฉบับนี้
                        ระบบจะบันทึกชื่อและเวลาที่ลงนามไว้เป็นหลักฐาน
                      </p>
                    </div>
                  ) : (
                    <p className="signnote">
                      {mySigned ? '✓ คุณลงนามในสัญญาฉบับนี้แล้ว' : 'สัญญานี้ไม่อยู่ในขั้นตอนลงนาม'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ==================== รายรับ / มัดจำ ==================== */
function RevenueTab({ stats }) {
  const [txs, setTxs] = useState([])
  useEffect(() => { let a = true; getMemberTransactions().then((d) => a && setTxs(d || [])); return () => { a = false } }, [])
  return (
    <>
      <div className="phead"><div><h2>รายรับ / มัดจำ</h2><p>สรุปเงินเข้า-ออก และมัดจำที่พักอยู่ในระบบ</p></div></div>
      <div className="kpis">
        <Kpi tone="k4" ic="💰" k="รายรับเดือนนี้" v={`฿${stats.revenueThisMonth.toLocaleString()}`} d={`▲ ${stats.revenueDeltaPct}%`} up />
        <Kpi tone="k2" ic="🔒" k="มัดจำในระบบพักเงิน" v="฿30,000" d="1 รายการ" />
        <Kpi tone="k3" ic="🧾" k="ค่าธรรมเนียมเดือนนี้" v="฿590" d="1% ของรายรับ" />
        <Kpi tone="k1" ic="🏦" k="รอโอนเข้าบัญชี" v="฿26,000" d="รอบโอน 25 มิ.ย." />
      </div>
      <div className="pn">
        <div className="pn-h"><h3>ธุรกรรมล่าสุด</h3></div>
        <table className="tbl">
          <thead><tr><th>วันที่</th><th>รายการ</th><th style={{ textAlign: 'right' }}>จำนวน</th></tr></thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id}>
                <td>{t.date}</td><td>{t.desc}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={t.type === 'out' ? 'amt-out' : t.type === 'hold' ? '' : 'amt-in'}>
                    {t.amount > 0 && t.type !== 'hold' ? '+' : ''}{t.amount.toLocaleString()} ฿
                    {t.type === 'hold' ? ' (พักเงิน)' : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ==================== ใบเสร็จ ==================== */
function ReceiptsTab() {
  const [rows, setRows] = useState([])
  useEffect(() => { let a = true; getMemberReceipts().then((d) => a && setRows(d || [])); return () => { a = false } }, [])

  // เปิดหน้าต่างพิมพ์ — ผู้ใช้เลือก "บันทึกเป็น PDF" ได้จากเมนูพิมพ์
  function printReceipt(r) {
    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) { alert('เบราว์เซอร์บล็อกป๊อปอัป — กรุณาอนุญาตแล้วลองใหม่'); return }
    w.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8">
      <title>ใบเสร็จ ${r.id}</title>
      <style>
        body{font-family:-apple-system,'Noto Sans Thai',sans-serif;padding:44px;color:#1c1c1e;line-height:1.7}
        h1{font-size:22px;margin:0 0 4px}
        .sub{color:#6e7377;font-size:13px;margin-bottom:28px}
        .box{border:1px solid #e8e6e1;border-radius:14px;padding:24px}
        .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1f0ee;font-size:14px}
        .row:last-child{border-bottom:0}
        .total{font-size:19px;font-weight:800;padding-top:14px;margin-top:8px;border-top:2px solid #1c1c1e}
        .ft{margin-top:26px;font-size:12px;color:#6e7377}
      </style></head><body>
      <h1>ใบเสร็จรับเงิน</h1>
      <div class="sub">Rentbegin.com · เลขที่ ${r.id}</div>
      <div class="box">
        <div class="row"><span>วันที่</span><b>${r.date}</b></div>
        <div class="row"><span>รายการ</span><b>${r.desc}</b></div>
        <div class="row"><span>เลขที่ใบเสร็จ</span><b>${r.id}</b></div>
        <div class="row total"><span>จำนวนเงิน</span><span>฿${Number(r.amount).toLocaleString()}</span></div>
      </div>
      <div class="ft">เอกสารนี้ออกโดยระบบอัตโนมัติของ Rentbegin.com<br/>พิมพ์เมื่อ ${new Date().toLocaleString('th-TH')}</div>
      </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <>
      <div className="phead"><div><h2>ใบเสร็จ</h2><p>{rows.length} ใบ · กดเพื่อพิมพ์หรือบันทึกเป็น PDF</p></div></div>
      <div className="pn">
        {rows.length === 0 ? <div className="done-all">ยังไม่มีใบเสร็จ</div> : rows.map((r) => (
          <div className="lrow" key={r.id}>
            <div className="info"><div className="info-t">{r.desc}</div><div className="info-s">{r.id} · {r.date}</div></div>
            <div className="num"><div className="num-n">฿{r.amount.toLocaleString()}</div></div>
            <div className="act">
              <button className="btn-o btn-s" onClick={() => printReceipt(r)}>⬇ บันทึก PDF</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ==================== รีวิว ==================== */
function ReviewsTab() {
  const [rows, setRows] = useState([])
  useEffect(() => { let a = true; getMemberReviews().then((d) => a && setRows(d || [])); return () => { a = false } }, [])
  return (
    <>
      <div className="phead"><div><h2>รีวิวจากผู้เช่า</h2><p>{rows.length} รีวิวจากผู้เช่า</p></div></div>
      <div className="pn">
        {rows.length === 0 && <div className="done-all">ยังไม่มีรีวิว</div>}
        {rows.map((r) => (
          <div className="rvw" key={r.id}>
            <div className="dsp-r1">
              <b>{r.name} <span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></b>
              <span style={{ fontSize: 12.5, color: 'var(--sub)' }}>{r.time}</span>
            </div>
            <div style={{ fontSize: 14, margin: '4px 0 2px' }}>{r.text}</div>
            <div className="dsp-r2">เช่า: {r.property}</div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ==================== ตั้งค่า ==================== */
function SettingsTab({ profile, onChanged }) {
  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [notif, setNotif] = useState(['msg', 'viewing'])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const NOTIF = [
    { id: 'msg', label: '💬 ข้อความใหม่' },
    { id: 'viewing', label: '📅 นัดชม' },
    { id: 'weekly', label: '📈 สรุปรายสัปดาห์' },
  ]

  async function save() {
    if (!name.trim()) { setMsg('✕ กรุณาใส่ชื่อที่แสดง'); return }
    setSaving(true); setMsg('')
    try {
      await updateMyProfile({ name, phone })
      setMsg('✓ บันทึกการตั้งค่าแล้ว')
      onChanged?.()
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setMsg('✕ ' + e.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="phead"><div><h2>ตั้งค่าบัญชี</h2><p>ข้อมูลที่แสดงบนประกาศของคุณ</p></div></div>
      {msg && <div className={`flash ${msg.startsWith('✕') ? 'err' : ''}`}>{msg}</div>}
      <div className="pn pn-form" style={{ maxWidth: 560 }}>
        <div className="fr"><label htmlFor="sname">ชื่อที่แสดง</label>
          <input id="sname" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="fr"><label htmlFor="sphone">เบอร์ติดต่อ</label>
          <input id="sphone" placeholder="08x-xxx-xxxx" value={phone}
            onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="fr"><label>บทบาท</label>
          <input value={profile.roleLabel || '-'} disabled /></div>
        <div className="fr"><label>แจ้งเตือน</label>
          <div className="chips">
            {NOTIF.map((n) => (
              <button key={n.id} className={`chip ${notif.includes(n.id) ? 'on' : ''}`}
                onClick={() => setNotif((v) => v.includes(n.id) ? v.filter((x) => x !== n.id) : [...v, n.id])}>
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-p" onClick={save} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
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
