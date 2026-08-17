import { Routes, Route, Navigate } from 'react-router-dom'
import { SavedProvider } from './context/SavedContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Property from './pages/Property'
import Saved from './pages/Saved'
import Member from './pages/Member'
import Admin from './pages/Admin'
import Login from './pages/Login'

export default function App() {
  return (
    <SavedProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/property/:id" element={<Property />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/login" element={<Login />} />
        <Route path="/member" element={<ProtectedRoute><Member /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SavedProvider>
  )
}
