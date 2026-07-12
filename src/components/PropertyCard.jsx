import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GRADIENTS } from '../data/mock'
import './PropertyCard.css'

export default function PropertyCard({ item, preview = false }) {
  const nav = useNavigate()
  const [fav, setFav] = useState(false)
  const [slide, setSlide] = useState(0)

  const photos = item.photos || ['g1']

  function toggleFav(e) {
    e.stopPropagation()
    setFav((f) => !f)
  }

  function open() {
    if (!preview) nav(`/property/${item.id}`)
  }

  const specs = []
  if (item.bedrooms > 0) specs.push(`${item.bedrooms} นอน`)
  else if (item.type === 'condo') specs.push('สตูดิโอ')
  if (item.bathrooms > 0) specs.push(`${item.bathrooms} น้ำ`)
  if (item.landRai) specs.push(`${item.landRai} ไร่`)
  else if (item.landSqw) specs.push(`${item.landSqw} ตร.ว.`)
  else if (item.sizeSqm) specs.push(`${item.sizeSqm} ตร.ม.`)

  return (
    <div className={`card ${preview ? 'is-preview' : ''}`} onClick={open}>
      <div className="ph">
        <div className="bg" style={{ background: GRADIENTS[photos[slide]] || GRADIENTS.g1 }} />

        {item.verified && <span className="pill verified">✓ ยืนยันแล้ว</span>}
        {item.hot && !item.verified && <span className="pill hot">🔥 คนดูเยอะ</span>}

        <button
          className={`fav ${fav ? 'on' : ''}`}
          onClick={toggleFav}
          aria-label="บันทึก"
        >
          {fav ? '♥' : '♡'}
        </button>

        {photos.length > 1 && (
          <div className="dots">
            {photos.map((_, i) => (
              <i
                key={i}
                className={i === slide ? 'on' : ''}
                onClick={(e) => { e.stopPropagation(); setSlide(i) }}
              />
            ))}
          </div>
        )}

        <span className="type">{item.typeLabel}</span>
      </div>

      <div className="r1">
        <h3>{item.title}</h3>
        <span className="star">★ {preview ? 'ใหม่' : item.rating}</span>
      </div>
      <p className="meta">
        {item.district}
        {item.nearby ? ` · ${item.nearby}` : ''}
      </p>
      <p className="spec">{specs.join(' · ')}</p>
      <p className="cost">
        ฿{item.price.toLocaleString()} <span>/ เดือน</span>
      </p>
    </div>
  )
}
