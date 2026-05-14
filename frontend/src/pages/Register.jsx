import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, UserPlus, Loader2, Mail, Lock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Master password must be at least 8 characters'); return }
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return }

    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || result.errors?.[0]?.msg || 'Registration failed')

      toast.success('Vault created! Set up your authenticator to continue.')

      // Redirect to mandatory 2FA setup
      navigate('/setup-2fa', {
        state: { userId: result.userId, email: result.email, fromLogin: false },
      })
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
        className="w-full max-w-md bg-white rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200 p-10 space-y-8"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
            <UserPlus size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Vault</h1>
          <p className="text-slate-500 font-medium text-sm">Join VaultGuard and secure your data today.</p>
        </div>

        {/* 2FA notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-3">
          <Shield size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-bold text-blue-700 leading-relaxed">
            VaultGuard requires Google Authenticator. After registration, you'll scan a QR code to protect your account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
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
            <label className="text-[13px] font-bold text-slate-700 ml-1">Master Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-700 ml-1">Confirm Master Password</label>
            <div className="relative">
              <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all",
                  confirmPassword && confirmPassword !== password && "border-red-400"
                )}
                placeholder="••••••••••••"
                required
              />
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-[11px] font-bold text-red-500 ml-1 uppercase tracking-wider">Passwords don't match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : <span>Create Your Vault</span>}
          </button>
        </form>

        <div className="pt-6 text-center border-t border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            Already have a vault? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
