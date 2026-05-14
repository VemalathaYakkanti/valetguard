import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Key, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * GuestLogin.jsx
 * Standalone login page for invited guests.
 * URL: /guest-login
 * Uses: email + temporaryPassword + one-time OTP from invitation email
 */
export default function GuestLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter a valid 6-digit OTP'); return }
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/shares/guest/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Store guest token separately from regular auth
      sessionStorage.setItem('vg_guest_token', data.token)
      sessionStorage.setItem('vg_guest_info', JSON.stringify(data.guest))

      toast.success(`Welcome, ${data.guest.name}!`)
      navigate('/guest-vault')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.4)] border border-white/20 p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
              <Shield size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Guest Vault Access</h1>
              <p className="text-slate-500 font-medium text-sm mt-2">
                Use the credentials from the invitation email you received.
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-black text-blue-700 uppercase tracking-widest">How to login</p>
            <p className="text-xs text-blue-600 font-medium leading-relaxed">
              Enter the <strong>email</strong>, <strong>temporary password</strong>, and <strong>one-time OTP</strong>
              from the VaultGuard invitation email you received.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 ml-1">Your Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Temporary Password */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 ml-1">Temporary Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  placeholder="Vg-••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* OTP */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 ml-1">One-Time OTP (from email)</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-black text-xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="000000"
                  required
                />
              </div>
              <p className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">
                This OTP expires 24 hours after the invitation was sent
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Access Shared Vault</span>}
            </button>
          </form>

          <div className="pt-4 text-center border-t border-slate-100">
            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest">
              Read-only · Time-limited access · AES-256 Encrypted
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-slate-400 text-sm font-medium">
          Have your own VaultGuard account?{' '}
          <button onClick={() => navigate('/login')} className="text-blue-400 font-bold hover:underline">Sign in here</button>
        </p>
      </motion.div>
    </div>
  )
}
