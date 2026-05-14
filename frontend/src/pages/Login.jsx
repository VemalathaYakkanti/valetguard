import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Loader2, Mail, Key, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { setAuth, setMasterPassword } = useAuthStore()

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Authentication failed')

      // Case 1: User has never set up 2FA → force setup
      if (result.requiresTwoFactorSetup) {
        navigate('/setup-2fa', {
          state: { userId: result.userId, email: result.email, password, fromLogin: true },
        })
        return
      }

      // Case 2: 2FA is set up → go to verify
      if (result.twoFactorRequired) {
        navigate('/verify-2fa', {
          state: { userId: result.userId, email: result.email, password },
        })
        return
      }

      // Should not reach here with mandatory 2FA, but safety net:
      setAuth(result.user, result.token)
      setMasterPassword(password)
      toast.success('Access Granted')
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200 p-10 space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
            <Shield size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">VaultGuard</h1>
          <p className="text-slate-500 font-medium text-sm">Secure your digital life with confidence.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[13px] font-bold text-slate-700">Master Password</label>
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="••••••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <span>Open Your Vault</span>}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-slate-100 space-y-3">
          <p className="text-sm text-slate-500 font-medium">
            New here? <Link to="/register" className="text-blue-600 font-bold hover:underline">Create a Vault</Link>
          </p>
          <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">
            Protected by Google Authenticator + AES-256
          </p>
        </div>
      </motion.div>
    </div>
  )
}
