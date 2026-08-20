import { useEffect, useState, useCallback, useRef } from 'react'
import { photoStyle, isPhotoUrl } from '../lib/photo'
import './Lightbox.css'

// ===================================================================
// ดูรูปเต็มจอ — ลูกศรซ้าย/ขวา, ESC ปิด, ปัดนิ้วบนมือถือ, thumbnail ด้านล่าง
// ===================================================================

export default function Lightbox({ photos = [], startIndex = 0, onClose }) {
  const [i, setI] = useState(startIndex)
  const touchX = useRef(null)
  const total = photos.length

  const next = useCallback(() => setI((v) => (v + 1) % total), [total])
  const prev = useCallback(() => setI((v) => (v - 1 + total) % total), [total])

  // คีย์บอร์ด
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    // ล็อกไม่ให้หน้าเลื่อนตอนเปิด
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [next, prev, onClose])

  if (!total) return null

  function onTouchStart(e) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 45) (dx < 0 ? next() : prev())
    touchX.current = null
  }

  return (
    <div className="lb" onClick={onClose}>
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        <span className="lb-count">{i + 1} / {total}</span>
        <button className="lb-x" onClick={onClose} aria-label="ปิด">✕</button>
      </div>

      <div
        className="lb-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {total > 1 && (
          <button className="lb-nav prev" onClick={prev} aria-label="รูปก่อนหน้า">‹</button>
        )}

        {isPhotoUrl(photos[i]) ? (
          <img className="lb-img" src={photos[i]} alt={`รูปที่ ${i + 1}`} />
        ) : (
          <div className="lb-img lb-grad" style={photoStyle(photos[i])} />
        )}

        {total > 1 && (
          <button className="lb-nav next" onClick={next} aria-label="รูปถัดไป">›</button>
        )}
      </div>

      {total > 1 && (
        <div className="lb-thumbs" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, k) => (
            <button
              key={k}
              className={`lb-th ${k === i ? 'on' : ''}`}
              style={photoStyle(p)}
              onClick={() => setI(k)}
              aria-label={`ไปรูปที่ ${k + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
