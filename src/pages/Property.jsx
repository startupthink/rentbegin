import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import { GRADIENTS, AMENITIES } from '../data/mock'
import { getListing } from '../api/client'
import './Property.css'

export default function Property() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [booking, setBooking] = useState({
    moveIn: '',
    months: 12,
    people: 1,
  })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr(null)
    getListing(id)
      .then((d) => {
        if (!alive) return
        setItem(d)
        setBooking((b) => ({ ...b, moveIn: d.availableFrom, months: d.minLeaseMonths }))
      })
      .catch((e) => { if (alive) setErr(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (loading) {
    return (
      <>
        <Header />
        <div className="spin" />
      </>
    )
  }

  if (err || !item) {
    return (
      <>
        <Header />
        <div className="dwrap" style={{ textAlign: 'center', padding: '80px 30px' }}>
          <div style={{ fontSize: 44, opacity: .5, marginBottom: 12 }}>🏚️</div>
          <h2 style={{ margin: '0 0 8px' }}>ไม่พบประกาศนี้</h2>
          <p style={{ color: 'var(--sub)', marginBottom: 20 }}>ประกาศอาจถูกลบหรือปิดไปแล้ว</p>
          <Link to="/" className="btn-p" style={{ display: 'inline-block' }}>← กลับหน้าแรก</Link>
        </div>
      </>
    )
  }

  const firstMonth = item.price
  const deposit = item.price * item.depositMonths
  const total = firstMonth + deposit

  const amenityList = AMENITIES.filter((a) => item.amenities.includes(a.id))

  const facts = [
    { ic: '🛏️', k: 'ห้องนอน', v: item.bedrooms > 0 ? `${item.bedrooms} ห้อง` : 'สตูดิโอ' },
    { ic: '🚿', k: 'ห้องน้ำ', v: item.bathrooms > 0 ? `${item.bathrooms} ห้อง` : '—' },
    {
      ic: '📐',
      k: 'พื้นที่',
      v: item.landRai ? `${item.landRai} ไร่` : item.landSqw ? `${item.landSqw} ตร.ว.` : `${item.sizeSqm} ตร.ม.`,
    },
    { ic: '📍', k: 'ทำเล', v: item.district },
  ]

  return (
    <>
      <Header search={{ place: item.district, type: item.typeLabel }} />

      <div className="dwrap">
        <Link to="/" className="back">← กลับผลการค้นหา</Link>

        <h1 className="dtitle">{item.fullTitle}</h1>
        <div className="dsub">
          <b>★ {item.rating}</b>
          <span>· {item.reviewCount} รีวิว ·</span>
          {item.verified && <span className="tg tg-live">✓ เจ้าของยืนยันตัวตนแล้ว</span>}
          <span>· {item.district} {item.province}</span>
          <span className="dsub-right">♡ บันทึก &nbsp;·&nbsp; ↗ แชร์</span>
        </div>

        <div className="gal">
          {item.photos.slice(0, 5).map((p, i) => (
            <div key={i} style={{ background: GRADIENTS[p] }}>
              {i === 0 && <span className="more">📷 ดูรูปทั้งหมด {item.photoCount} รูป</span>}
            </div>
          ))}
        </div>

        <div className="dcols">
          <div>
            <div className="dsec dsec-owner">
              <div>
                <h3>{item.typeLabel}ให้เช่า โดย {item.owner.name}</h3>
                <p>{item.owner.roleLabel} · {item.owner.responseTime} · ปล่อยเช่ามาแล้ว {item.owner.yearsActive} ปี</p>
              </div>
              <div className="oav">{item.owner.initial}</div>
            </div>

            <div className="dsec">
              <div className="facts">
                {facts.map((f) => (
                  <div className="fact" key={f.k}>
                    <div className="fact-ic">{f.ic}</div>
                    <div className="fact-k">{f.k}</div>
                    <div className="fact-v">{f.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dsec">
              <h3>รายละเอียด</h3>
              {item.description.split('\n\n').map((para, i) => (
                <p key={i} className="desc">{para}</p>
              ))}
            </div>

            {amenityList.length > 0 && (
              <div className="dsec">
                <h3>สิ่งอำนวยความสะดวก</h3>
                <div className="amen">
                  {amenityList.map((a) => (
                    <div key={a.id}>{a.icon} {a.label}</div>
                  ))}
                  {!item.petAllowed && <div>🚫 ไม่อนุญาตสัตว์เลี้ยง</div>}
                </div>
              </div>
            )}

            <div className="dsec">
              <h3>เงื่อนไขการเช่า</h3>
              <div className="amen">
                <div>📝 สัญญาขั้นต่ำ {item.minLeaseMonths} เดือน</div>
                <div>💰 มัดจำ {item.depositMonths} เดือน + ล่วงหน้า {item.advanceMonths} เดือน</div>
                <div>💡 ค่าน้ำ-ไฟตามมิเตอร์จริง</div>
                <div>🗓️ เข้าอยู่ได้ {item.availableFrom}</div>
              </div>
            </div>

            <div className="dsec dsec-last">
              <h3>ทำเล</h3>
              <div className="map">
                <div className="pin"><span>🏠</span></div>
                <div className="map-note">📍 {item.district} · แสดงตำแหน่งโดยประมาณ</div>
              </div>
            </div>
          </div>

          <div className="booking">
            <div className="bk-price">
              <b>฿{item.price.toLocaleString()}</b>
              <span>/ เดือน</span>
            </div>

            <div className="bkfield">
              <div className="bkrow">
                <label htmlFor="movein">วันเข้าอยู่</label>
                <input
                  id="movein"
                  value={booking.moveIn}
                  onChange={(e) => setBooking({ ...booking, moveIn: e.target.value })}
                />
              </div>
              <div className="bkrow">
                <label htmlFor="months">ระยะสัญญา</label>
                <select
                  id="months"
                  value={booking.months}
                  onChange={(e) => setBooking({ ...booking, months: Number(e.target.value) })}
                >
                  <option value={6}>6 เดือน</option>
                  <option value={12}>12 เดือน</option>
                  <option value={24}>24 เดือน</option>
                  <option value={36}>36 เดือน</option>
                </select>
              </div>
              <div className="bkrow">
                <label htmlFor="people">ผู้เข้าอยู่</label>
                <select
                  id="people"
                  value={booking.people}
                  onChange={(e) => setBooking({ ...booking, people: Number(e.target.value) })}
                >
                  <option value={1}>1 คน</option>
                  <option value={2}>2 คน</option>
                  <option value={3}>3 คน</option>
                  <option value={4}>4 คนขึ้นไป</option>
                </select>
              </div>
            </div>

            <button className="bk-cta" onClick={() => setSent(true)} disabled={sent}>
              {sent ? '✓ ส่งคำขอนัดชมแล้ว' : '📅 นัดชมห้อง'}
            </button>
            <button className="bk-alt">💬 ทักแชตเจ้าของ</button>
            <p className="bk-note">
              {sent ? 'เจ้าของจะติดต่อกลับภายใน 24 ชม.' : 'ยังไม่มีการเรียกเก็บเงิน · นัดชมฟรี'}
            </p>

            <div className="bk-calc">
              <div className="bk-line">
                <span>ค่าเช่าเดือนแรก</span>
                <b>฿{firstMonth.toLocaleString()}</b>
              </div>
              <div className="bk-line">
                <span>มัดจำ ({item.depositMonths} เดือน)</span>
                <b>฿{deposit.toLocaleString()}</b>
              </div>
              <div className="bk-line">
                <span>ค่าธรรมเนียมแพลตฟอร์ม</span>
                <b style={{ color: 'var(--green)' }}>ฟรี</b>
              </div>
              <div className="bk-line bk-total">
                <b>รวมวันเข้าอยู่</b>
                <b>฿{total.toLocaleString()}</b>
              </div>
            </div>

            <div className="owner">
              <div className="oav sm">{item.owner.initial}</div>
              <div>
                <div className="owner-n">
                  {item.owner.name}
                  {item.owner.verified && <span className="tg tg-live">✓</span>}
                </div>
                <div className="owner-s">{item.owner.roleLabel} · {item.owner.responseTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
