import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import UserPanel from '../components/UserPanel'
import PropertyCard from '../components/PropertyCard'
import { PROPERTY_TYPES } from '../data/mock'
import { getListings } from '../api/client'
import './Home.css'

export default function Home() {
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    place: '',
    type: 'condo',
    budget: '฿10,000 – ฿20,000',
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    getListings({ type, q })
      .then((data) => { if (alive) setItems(data) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [type, q])

  function doSearch(e) {
    e.preventDefault()
    setQ(form.place)
    setType(form.type)
  }

  return (
    <>
      <Header />

      {/* patch01: แถบหมวด fix ติดใต้ header ตลอดเวลา */}
      <div className="rail rail-sticky">
        <div className="rail-in">
          <div className="rail-scroll">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.id}
                className={`ftype ${type === t.id ? 'on' : ''}`}
                onClick={() => setType(t.id)}
              >
                <span className="ic">{t.icon}</span>
                {t.label}
              </button>
            ))}
            <button className="ftype"><span className="ic">🚇</span>ติดรถไฟฟ้า</button>
            <button className="ftype"><span className="ic">🛋️</span>เฟอร์ครบ</button>
            <button className="ftype"><span className="ic">🐾</span>เลี้ยงสัตว์ได้</button>
            <button className="ftype"><span className="ic">🏊</span>มีสระ</button>
          </div>
          <button className="fbtn">⚙ ตัวกรอง</button>
        </div>
      </div>

      {/* patch01: layout แบบ Facebook — แถบ user ซ้าย + เนื้อหาขวา */}
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
                <p>คอนโด บ้าน ทาวน์เฮาส์ ตึกแถว ที่ดิน — ตรงจากเจ้าของและนายหน้าที่ยืนยันตัวตนแล้ว</p>

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
                    <select
                      id="ptype"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sf">
                    <label htmlFor="budget">งบต่อเดือน</label>
                    <input
                      id="budget"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="sbtn">🔍 ค้นหา</button>
                </form>
              </div>
            </div>
          </section>

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
              <p>ลองเปลี่ยนทำเลหรือประเภททรัพย์ดู</p>
              <button className="btn-o" onClick={() => { setQ(''); setType('all'); setForm({ ...form, place: '' }) }}>
                ล้างตัวกรอง
              </button>
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
          <span>© 2568 Rentbegin.com — ตลาดกลางเช่าอสังหาริมทรัพย์</span>
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
