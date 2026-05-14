import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Smartphone, Loader2, ShieldCheck, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function TwoFactorVerify() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  
  const { userId, email, password } = location.state || {}

  if (!userId) {
    navigate('/login')
    return null
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token })
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Invalid code')

      setAuth(result.user, result.token)
      if (password) useAuthStore.getState().setMasterPassword(password)
      
      toast.success('Identity Verified')
      navigate('/vault')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200 p-10 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Check</h1>
          <p className="text-slate-500 font-medium text-sm">
            Enter the 6-digit code from your authenticator app for <span className="text-slate-900 font-bold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-4 text-center">
            <div className="relative inline-block w-full">
              <input 
                type="text"
                autoFocus
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-4xl font-black tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-2xl py-6 text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-200"
              />
              <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200" size={24} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Verification Required</p>
          </div>

          <button 
            type="submit"
            disabled={token.length !== 6 || loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <span>Verify Identity</span>}
          </button>

          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold py-2"
          >
            <ChevronLeft size={16} />
            <span>Back to Login</span>
          </button>
        </form>
      </motion.div>
    </div>
  )
}
