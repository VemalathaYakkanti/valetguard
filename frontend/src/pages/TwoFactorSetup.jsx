import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Loader2, ChevronLeft, Smartphone, Copy, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

/**
 * TwoFactorSetup.jsx
 * Shown after registration OR when a user tries to login but has no 2FA set up yet.
 * Displays a QR code for Google Authenticator, then verifies the 6-digit code.
 *
 * Expects location.state: { userId, email, password? }
 */
export default function TwoFactorSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, setMasterPassword } = useAuthStore()

  const { userId, email, password, fromLogin } = location.state || {}

  const [step, setStep] = useState('loading') // loading | scan | verify
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => {
    if (!userId) { navigate('/login'); return }
    initSetup()
  }, [userId])

  const initSetup = async () => {
    try {
      const res = await fetch(`${apiUrl}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setStep('scan')
    } catch (err) {
      toast.error(err.message || 'Failed to initialize 2FA')
      navigate('/login')
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      toast.success('Google Authenticator enabled!')

      // If this was a post-login setup, we need to go back to verify page
      if (fromLogin) {
        navigate('/verify-2fa', { state: { userId, email, password } })
      } else {
        // Post-registration — go to login
        toast.success('Account ready! Please log in.')
        navigate('/login')
      }
    } catch (err) {
      toast.error(err.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setSecretCopied(true)
    toast.success('Secret key copied!')
    setTimeout(() => setSecretCopied(false), 2000)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-200 p-10 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
            <Smartphone size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Set Up Authenticator</h1>
          <p className="text-slate-500 font-medium text-sm">
            VaultGuard requires Google Authenticator for all accounts.
            <br />This protects your vault even if your password is compromised.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1: Scan QR */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black">1</div>
              <span className="font-bold text-slate-900 text-sm">Open Google Authenticator and scan this QR code</span>
            </div>
            <div className="flex justify-center">
              {qrCode && (
                <div className="bg-white p-4 rounded-2xl border-4 border-slate-100 shadow-inner inline-block">
                  <img src={qrCode} alt="Google Authenticator QR Code" className="w-44 h-44" />
                </div>
              )}
            </div>
            {/* Manual entry option */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Can't scan? Enter manually:</p>
                <p className="font-mono text-xs text-slate-700 font-bold break-all">{secret}</p>
              </div>
              <button
                type="button"
                onClick={copySecret}
                className="ml-3 p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0"
              >
                {secretCopied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Step 2: Verify */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-black">2</div>
              <span className="font-bold text-slate-900 text-sm">Enter the 6-digit code from your app</span>
            </div>
            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                className="w-full text-center text-4xl font-black tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-2xl py-6 text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-200"
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Activate &amp; Continue</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold py-2"
        >
          <ChevronLeft size={16} />
          <span>Back to Login</span>
        </button>
      </motion.div>
    </div>
  )
}
