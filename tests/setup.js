import '@testing-library/jest-dom/vitest'
// stub สิ่งที่ jsdom ไม่มี
globalThis.matchMedia = globalThis.matchMedia || (() => ({
  matches: false, addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {},
}))
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true })
