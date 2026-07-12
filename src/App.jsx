import { Routes, Route, Navigate } from 'react-router-dom'
import { SavedProvider } from './context/SavedContext'
import Home from './pages/Home'
import Property from './pages/Property'
import Saved from './pages/Saved'
import Member from './pages/Member'
import Admin from './pages/Admin'

export default function App() {
  return (
    <SavedProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/property/:id" element={<Property />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/member" element={<Member />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SavedProvider>
  )
}
