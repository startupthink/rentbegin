import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import UserPanel from '../components/UserPanel'
import PropertyCard from '../components/PropertyCard'
import {
  PROPERTY_TYPES, LISTING_TYPES, AMENITIES,
  BUDGET_RANGES, BEDROOM_OPTIONS,
} from '../data/constants'
import { getListings } from '../api/client'
import './Home.css'

// ชิปกรองด่วน — map ไปยัง amenity จริงในฐานข้อมูล
const QUICK_CHIPS = [
  { id: 'bts',       label: 'ติดรถไฟฟ้า',   icon: '🚇' },
  { id: 'furnished', label: 'เฟอร์ครบ',     icon: '🛋️' },
  { id: 'pet',       label: 'เลี้ยงสัตว์ได้', icon: '🐾' },
  { id: 'pool',      label: 'มีสระ',        icon: '🏊' },
  { id: 'parking',   label: 'ที่จอดรถ',     icon: '🅿️' },
  { id: 'gym',       label: 'ฟิตเนส',       icon: '🏋️' },
]

export default function Home() {
  // ---------- อ่านตัวกรองจาก URL (แชร์ลิงก์ได้) ----------
  const [params, setParams] = useSearchParams()
  const type = params.get('type') || 'all'
  const q = params.get('q') || ''
  const listingType = params.get('for') || 'all'
  const budgetId = params.get('budget') || 'any'
  const bedroomId = params.get('bed') || 'any'
  const chips = (params.get('chips') || '').split(',').filter(Boolean)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [form, setForm] = useState({ place: q, type, budget: budgetId })

  // อัปเดต URL — ตัวเดียวจบ ใช้ได้ทุกที่
  const setParam = useCallback((patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all' || v === 'any') next.delete(k)
      else next.set(k, v)
    })
    setParams(next, { replace: true })
  }, [params, setParams])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const budget = BUDGET_RANGES.find((b) => b.id === budgetId) || BUDGET_RANGES[0]
    const bed = BEDROOM_OPTIONS.find((b) => b.id === bedroomId) || BEDROOM_OPTIONS[0]

    getListings({
      type, q, listingType,
      minPrice: budget.min || null,
      maxPrice: budget.max,
      minBedrooms: bed.min,
      amenities: chips,
    })
      .then((data) => { if (alive) setItems(data) })
      .catch(() => { if (alive) setItems([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q, listingType, budgetId, bedroomId, params.get('chips')])

  function doSearch(e) {
    e.preventDefault()
    setParam({ q: form.place, type: form.type, budget: form.budget })
  }

  function toggleChip(id) {
    const next = chips.includes(id) ? chips.filter((c) => c !== id) : [...chips, id]
    setParam({ chips: next.join(',') })
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true })
    setForm({ place: '', type: 'all', budget: 'any' })
    setShowFilter(false)
  }

  const activeFilterCount =
    chips.length +
    (budgetId !== 'any' ? 1 : 0) +
    (bedroomId !== 'any' ? 1 : 0) +
    (listingType !== 'all' ? 1 : 0)

  return (
    <>
      <Header />

      {/* แถบหมวด sticky */}
      <div className="rail rail-sticky">
        <div className="rail-in">
          <div className="rail-scroll">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.id}
                className={`ftype ${type === t.id ? 'on' : ''}`}
                onClick={() => setParam({ type: t.id })}
              >
                <span className="ic">{t.icon}</span>
                {t.label}
              </button>
            ))}
            {QUICK_CHIPS.map((c) => (
              <button
                key={c.id}
                className={`ftype ${chips.includes(c.id) ? 'on' : ''}`}
                onClick={() => toggleChip(c.id)}
              >
                <span className="ic">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
          <button className={`fbtn ${activeFilterCount ? 'on' : ''}`} onClick={() => setShowFilter((v) => !v)}>
            ⚙ ตัวกรอง{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>

      {/* แผงตัวกรองเพิ่มเติม */}
      {showFilter && (
        <div className="filterpanel">
          <div className="fp-in">
            <div className="fp-grp">
              <label>ต้องการ</label>
              <div className="fp-chips">
                <button className={listingType === 'all' ? 'on' : ''} onClick={() => setParam({ for: 'all' })}>ทั้งหมด</button>
                {LISTING_TYPES.filter((l) => l.id !== 'both').map((l) => (
                  <button key={l.id} className={listingType === l.id ? 'on' : ''}
                    onClick={() => setParam({ for: l.id })}>{l.icon} {l.label}</button>
                ))}
              </div>
            </div>

            <div className="fp-grp">
              <label>งบต่อเดือน</label>
              <div className="fp-chips">
                {BUDGET_RANGES.map((b) => (
                  <button key={b.id} className={budgetId === b.id ? 'on' : ''}
                    onClick={() => setParam({ budget: b.id })}>{b.label}</button>
                ))}
              </div>
            </div>

            <div className="fp-grp">
              <label>ห้องนอน</label>
              <div className="fp-chips">
                {BEDROOM_OPTIONS.map((b) => (
                  <button key={b.id} className={bedroomId === b.id ? 'on' : ''}
                    onClick={() => setParam({ bed: b.id })}>{b.label}</button>
                ))}
              </div>
            </div>

            <div className="fp-grp">
              <label>สิ่งอำนวยความสะดวก</label>
              <div className="fp-chips">
                {AMENITIES.map((a) => (
                  <button key={a.id} className={chips.includes(a.id) ? 'on' : ''}
                    onClick={() => toggleChip(a.id)}>{a.icon} {a.label}</button>
                ))}
              </div>
            </div>

            <div className="fp-act">
              <button className="btn-o" onClick={clearAll}>ล้างทั้งหมด</button>
              <button className="btn-p" onClick={() => setShowFilter(false)}>
                ดูผลลัพธ์ {items.length} รายการ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="wrap home-body">
        <UserPanel />

        <div className="home-main">
          <section className="hero hero-slim">
            <div className="hero-box">
              <div className="art">
                <i style={{ width: 150, height: 150, top: -36, right: 60, transform: 'rotate(18deg)' }} />
                <i style={{ width: 100, height: 100, bottom: -26, right: 240, transform: 'rotate(-12deg)', opacity: .6 }} />
                <i style={{ width: 80, height: 80, top: 50, right: -18, transform: 'rotate(28deg)', opacity: .5 }} />
              </div>
              <div className="hero-in">
                <h1>บ้านหลังต่อไป เริ่มต้นที่นี่</h1>
                <p>คอนโด บ้าน ทาวน์เฮาส์ ห้องแถว ตึกแถว ที่ดิน — เช่าและขาย ตรงจากเจ้าของและนายหน้า</p>

                <form className="searchcard" onSubmit={doSearch}>
                  <div className="sf">
                    <label htmlFor="place">ทำเล</label>
                    <input
                      id="place"
                      placeholder="เช่น รัชดา, ห้วยขวาง, นนทบุรี"
                      value={form.place}
                      onChange={(e) => setForm({ ...form, place: e.target.value })}
                    />
                  </div>
                  <div className="sf">
                    <label htmlFor="ptype">ประเภท</label>
                    <select id="ptype" value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sf">
                    <label htmlFor="budget">งบต่อเดือน</label>
                    <select id="budget" value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="sbtn">🔍 ค้นหา</button>
                </form>
              </div>
            </div>
          </section>

          {/* แสดงตัวกรองที่ใช้อยู่ */}
          {(q || activeFilterCount > 0 || type !== 'all') && (
            <div className="activefilters">
              <span className="af-n">{loading ? 'กำลังค้นหา…' : `พบ ${items.length} รายการ`}</span>
              {q && <span className="af-tag">ค้นหา: {q} <button onClick={() => { setParam({ q: '' }); setForm({ ...form, place: '' }) }}>✕</button></span>}
              {type !== 'all' && (
                <span className="af-tag">
                  {PROPERTY_TYPES.find((t) => t.id === type)?.label}
                  <button onClick={() => setParam({ type: 'all' })}>✕</button>
                </span>
              )}
              {budgetId !== 'any' && (
                <span className="af-tag">
                  {BUDGET_RANGES.find((b) => b.id === budgetId)?.label}
                  <button onClick={() => setParam({ budget: 'any' })}>✕</button>
                </span>
              )}
              {bedroomId !== 'any' && (
                <span className="af-tag">
                  {BEDROOM_OPTIONS.find((b) => b.id === bedroomId)?.label}
                  <button onClick={() => setParam({ bed: 'any' })}>✕</button>
                </span>
              )}
              {chips.map((c) => {
                const a = AMENITIES.find((x) => x.id === c) || QUICK_CHIPS.find((x) => x.id === c)
                return (
                  <span className="af-tag" key={c}>
                    {a?.label || c}
                    <button onClick={() => toggleChip(c)}>✕</button>
                  </span>
                )
              })}
              <button className="af-clear" onClick={clearAll}>ล้างทั้งหมด</button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="skel" style={{ aspectRatio: '20/19', marginBottom: 11 }} />
                  <div className="skel" style={{ height: 15, width: '75%', marginBottom: 7 }} />
                  <div className="skel" style={{ height: 13, width: '55%', marginBottom: 7 }} />
                  <div className="skel" style={{ height: 15, width: '40%' }} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">🔍</div>
              <h3>ไม่พบประกาศที่ตรงกับที่ค้นหา</h3>
              <p>ลองเปลี่ยนทำเล ประเภททรัพย์ หรือขยายช่วงราคาดู</p>
              <button className="btn-o" onClick={clearAll}>ล้างตัวกรอง</button>
            </div>
          ) : (
            <div className="grid grid-3">
              {items.map((it) => (
                <PropertyCard key={it.id} item={it} />
              ))}
            </div>
          )}

          <div className="band band-inhome">
            <div className="band-in">
              <div>
                <h2>มีห้องว่าง? ลงประกาศฟรี</h2>
                <p>ลงประกาศได้ใน 3 นาที ทั้งเจ้าของเองและนายหน้า ระบบช่วยนัดชม ทำสัญญา และเก็บมัดจำให้ครบจบในที่เดียว</p>
              </div>
              <Link to="/member" className="btn-w">เริ่มลงประกาศ →</Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="ftr">
        <div className="ftr-in">
          <span>© {new Date().getFullYear() + 543} Rentbegin.com — ตลาดกลางเช่าและขายอสังหาริมทรัพย์</span>
          <span className="ftr-links">
            <Link to="/saved">ที่บันทึกไว้</Link>
            <Link to="/member">สำหรับผู้ปล่อยเช่า</Link>
            <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
            <Link to="/terms">ข้อกำหนดการใช้บริการ</Link>
          </span>
        </div>
      </footer>
    </>
  )
}
