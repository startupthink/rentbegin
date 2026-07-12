import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Property from './pages/Property'
import Member from './pages/Member'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/property/:id" element={<Property />} />
      <Route path="/member" element={<Member />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
