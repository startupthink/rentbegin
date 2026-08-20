import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')

describe('Responsive ทุกอุปกรณ์', () => {
  it('viewport ไม่ล็อกความกว้าง 1280 แล้ว', () => {
    const html = read('index.html')
    expect(html).not.toMatch(/width=1280/)
    expect(html).toMatch(/width=device-width/)
  })

  it('ทุกไฟล์ CSS หลักมี breakpoint มือถือ', () => {
    const files = [
      'src/pages/Home.css', 'src/pages/Property.css', 'src/pages/Dashboard.css',
      'src/components/Header.css', 'src/components/Sidebar.css',
      'src/pages/Login.css', 'src/pages/Legal.css', 'src/components/Lightbox.css',
    ]
    files.forEach((f) => {
      expect(read(f), `${f} ไม่มี @media`).toMatch(/@media/)
    })
  })

  it('มีเมนูแนวนอนสำหรับมือถือใน dashboard', () => {
    expect(read('src/components/Sidebar.jsx')).toMatch(/mnav/)
    expect(read('src/components/Sidebar.css')).toMatch(/\.mnav\{display:none\}/)
  })

  it('กัน overflow แนวนอน', () => {
    expect(read('src/styles/global.css')).toMatch(/overflow-x:\s*hidden/)
  })
})

describe('ไม่มีข้อมูลตัวอย่างหลงเหลือในโค้ด', () => {
  it('ไม่มีไฟล์ mock.js ถูก import แล้ว', () => {
    const files = []
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name)
      e.isDirectory() ? walk(p) : (p.endsWith('.jsx') || p.endsWith('.js')) && files.push(p)
    })
    walk('src')
    files.forEach((f) => {
      expect(read(f), `${f} ยัง import mock`).not.toMatch(/from '.*data\/mock'/)
    })
  })
})
