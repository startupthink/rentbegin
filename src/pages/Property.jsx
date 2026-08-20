import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Lightbox from '../components/Lightbox'
import { AMENITIES, APPLIANCES, ROOM_FEATURES, LISTING_TYPES } from '../data/constants'
import { photoStyle } from '../lib/photo'
import { getListing, createBooking, calcBooking } from '../api/client'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { useSaved } from '../context/SavedContext'
import { useAuth } from '../context/AuthContext'
import './Property.css'

export default function Property() {
  const { id } = useParams()
  const { isSaved, toggle } = useSaved()
  const { isAuthed } = useAuth()
  const nav = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [booking, setBooking] = useState({
    moveIn: '',
    months: 12,
    people: 1,
  })
  const [sent, setSent] = useState(false)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookMsg, setBookMsg] = useState('')
  const [lightbox, setLightbox] = useState(null)   // index รูปที่เปิดดูเต็มจอ
  const [shared, setShared] = useState(false)

  // ติดต่อเจ้าของ — โทรถ้ามีเบอร์, ไม่งั้นพาไปล็อกอินเพื่อแชต
  function contactOwner() {
    if (item?.contactPhone) { window.location.href = `tel:${item.contactPhone}`; return }
    if (item?.contactLine) { window.open(`https://line.me/ti/p/~${item.contactLine.replace('@', '')}`, '_blank'); return }
    if (!isAuthed) { nav('/login', { state: { from: `/property/${id}` } }); return }
    nav('/member')
  }

  // แชร์ประกาศ — ใช้ Web Share บนมือถือ, คัดลอกลิงก์บนเดสก์ท็อป
  async function doShare() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: item?.title || 'Rentbegin', url })
      } else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2200)
      }
    } catch { /* ผู้ใช้ยกเลิก — ไม่ต้องทำอะไร */ }
  }

  // จองจริง — สร้างรายการใน DB แล้วไปจ่ายที่แดชบอร์ด
  async function handleBook() {
    if (!isAuthed) { nav('/login', { state: { from: `/property/${id}` } }); return }
    setBookingBusy(true); setBookMsg('')
    try {
      await createBooking({
        listing: item,
        moveIn: booking.moveIn,
        months: booking.months,
        occupants: booking.people,
      })
      setBookMsg('✓ ส่งคำขอจองแล้ว — ไปชำระมัดจำที่แดชบอร์ด')
      setTimeout(() => nav('/member'), 1600)
    } catch (e) {
      setBookMsg('✕ ' + e.message)
    } finally { setBookingBusy(false) }
  }

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) { setLoading(true); setErr(null) }
    try {
      const d = await getListing(id)
      setItem(d)
      setBooking((b) => ({
        ...b,
        moveIn: b.moveIn || d.availableFrom,
        months: b.months || d.minLeaseMonths,
      }))
    } catch (e) {
      if (showSpinner) setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load(true) }, [load])

  // กลับมาที่หน้านี้ → ดึงข้อมูลล่าสุด (เห็นราคาที่เพิ่งแก้ทันที)
  useAutoRefresh(() => load(false))

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

  const calc = calcBooking(item, booking.months)
  const firstMonth = calc.advance
  const deposit = calc.deposit
  const total = calc.total

  const amenityList = AMENITIES.filter((a) => (item.amenities || []).includes(a.id))
  const roomList = ROOM_FEATURES.filter((r) => (item.rooms || []).includes(r.id))
  const applianceList = APPLIANCES.filter((a) => (item.appliances || []).includes(a.id))
  const forSale = item.listingType === 'sale' || item.listingType === 'both'
  const forRent = item.listingType !== 'sale'
  const listingBadge = LISTING_TYPES.find((l) => l.id === item.listingType)
  // ถ้าไม่มีรูปเลย ใช้ gradient สำรองเพื่อไม่ให้แกลเลอรีว่าง
  const gallery = item.photos?.length ? item.photos : ['g1', 'g6', 'g3']

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
          {listingBadge && item.listingType !== 'rent' && (
            <span className="tg tg-new">{listingBadge.icon} {listingBadge.label}</span>
          )}
          <span className="dsub-right">
            <button
              className={`dsave ${isSaved(item.id) ? 'on' : ''}`}
              onClick={() => toggle(item.id)}
            >
              {isSaved(item.id) ? '♥ บันทึกแล้ว' : '♡ บันทึก'}
            </button>
            <button className="dsave" onClick={doShare}>
              {shared ? '✓ คัดลอกลิงก์แล้ว' : '↗ แชร์'}
            </button>
          </span>
        </div>

        <div className="gal">
          {gallery.slice(0, 5).map((p, i) => (
            <div key={i} style={photoStyle(p)} className="gal-cell" onClick={() => setLightbox(i)}>
              {i === 0 && (
                <span className="more" onClick={(e) => { e.stopPropagation(); setLightbox(0) }}>
                  📷 ดูรูปทั้งหมด {gallery.length} รูป
                </span>
              )}
            </div>
          ))}
        </div>

        {lightbox !== null && (
          <Lightbox photos={gallery} startIndex={lightbox} onClose={() => setLightbox(null)} />
        )}

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
              {(item.description || 'เจ้าของยังไม่ได้ใส่รายละเอียด').split('\n\n').map((para, i) => (
                <p key={i} className="desc">{para}</p>
              ))}
            </div>

            {roomList.length > 0 && (
              <div className="dsec">
                <h3>ห้องและพื้นที่ใช้สอย</h3>
                <div className="amen">
                  {roomList.map((r) => (
                    <div key={r.id}>{r.icon} {r.label}</div>
                  ))}
                </div>
              </div>
            )}

            {applianceList.length > 0 && (
              <div className="dsec">
                <h3>เครื่องใช้ไฟฟ้าและเฟอร์นิเจอร์</h3>
                <div className="amen">
                  {applianceList.map((a) => (
                    <div key={a.id}>{a.icon} {a.label}</div>
                  ))}
                </div>
              </div>
            )}

            {amenityList.length > 0 && (
              <div className="dsec">
                <h3>สิ่งอำนวยความสะดวกส่วนกลาง</h3>
                <div className="amen">
                  {amenityList.map((a) => (
                    <div key={a.id}>{a.icon} {a.label}</div>
                  ))}
                  {!item.petAllowed && <div>🚫 ไม่อนุญาตสัตว์เลี้ยง</div>}
                </div>
              </div>
            )}

            <div className="dsec">
              <h3>{forRent ? 'เงื่อนไขการเช่า' : 'เงื่อนไข'}</h3>
              <div className="amen">
                {forRent && <div>📝 สัญญาขั้นต่ำ {item.minLeaseMonths} เดือน</div>}
                {forRent && <div>💰 มัดจำ {item.depositMonths} เดือน + ล่วงหน้า {item.advanceMonths} เดือน</div>}
                {forSale && item.salePrice && <div>🏷️ ราคาขาย ฿{Number(item.salePrice).toLocaleString()}</div>}
                <div>💡 ค่าน้ำ-ไฟตามมิเตอร์จริง</div>
                <div>🗓️ {forRent ? 'เข้าอยู่ได้' : 'พร้อมโอน'} {item.availableFrom}</div>
                {item.floorNo && <div>🏢 ชั้น {item.floorNo}{item.totalFloors ? ` จาก ${item.totalFloors} ชั้น` : ''}</div>}
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
            {forRent && (
              <div className="bk-price">
                <b>฿{Number(item.price || 0).toLocaleString()}</b>
                <span>/ เดือน</span>
              </div>
            )}
            {forSale && item.salePrice && (
              <div className={`bk-price ${forRent ? 'bk-price-alt' : ''}`}>
                <b>฿{Number(item.salePrice).toLocaleString()}</b>
                <span>ราคาขาย</span>
              </div>
            )}

            <div className="bkfield" hidden={!forRent}>
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
              {sent ? '✓ ส่งคำขอนัดชมแล้ว' : '📅 นัดชมทรัพย์'}
            </button>
            {forRent && (
              <button className="bk-book" onClick={handleBook} disabled={bookingBusy}>
                {bookingBusy ? 'กำลังส่งคำขอ...' : '🔒 จองและวางมัดจำ'}
              </button>
            )}
            {bookMsg && <p className={`bk-msg ${bookMsg.startsWith('✕') ? 'err' : ''}`}>{bookMsg}</p>}
            <button className="bk-alt" onClick={contactOwner}>
              {item.contactPhone ? '📞 ติดต่อเจ้าของ' : '💬 ทักแชตเจ้าของ'}
            </button>
            <p className="bk-note">
              {sent ? 'เจ้าของจะติดต่อกลับภายใน 24 ชม.' : 'นัดชมฟรี · จองแล้วเงินมัดจำพักในระบบจนเข้าอยู่'}
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
                <span>ค่าธรรมเนียมแพลตฟอร์ม (1%)</span>
                <b>฿{calc.fee.toLocaleString()}</b>
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
