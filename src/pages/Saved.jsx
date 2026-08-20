import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyCard from '../components/PropertyCard'
import { getListingsByIds } from '../api/client'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { useSaved } from '../context/SavedContext'
import './Home.css'
import './Saved.css'

export default function Saved() {
  const { ids, count, clear } = useSaved()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // ดึงประกาศจริงตาม id ที่บันทึกไว้
  const load = useCallback(async (showSpinner = true) => {
    if (!ids.length) { setItems([]); setLoading(false); return }
    if (showSpinner) setLoading(true)
    try { setItems(await getListingsByIds(ids)) }
    catch { setItems([]) }
    finally { setLoading(false) }
  }, [ids])

  useEffect(() => { load(true) }, [load])
  useAutoRefresh(() => load(false))

  return (
    <>
      <Header />
      <div className="wrap saved-wrap">
        <div className="saved-head">
          <div>
            <h1>♥ ที่บันทึกไว้</h1>
            <p>{count === 0 ? 'ยังไม่มีรายการที่บันทึก' : `${count} รายการ · กดหัวใจซ้ำเพื่อเอาออก`}</p>
          </div>
          {count > 0 && (
            <button className="btn-o" onClick={clear}>ล้างทั้งหมด</button>
          )}
        </div>

        {count === 0 ? (
          <div className="saved-empty">
            <div className="ic">🤍</div>
            <h3>ตะกร้ายังว่างอยู่</h3>
            <p>เจอที่ถูกใจ กดหัวใจมุมขวาบนของประกาศ<br />แล้วกลับมาดูรวมกันที่นี่ได้เลย</p>
            <Link to="/" className="btn-p">ไปหาที่เช่า →</Link>
          </div>
        ) : loading ? (
          <div className="spin" />
        ) : (
          <div className="grid">
            {items.map((it) => (
              <PropertyCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
