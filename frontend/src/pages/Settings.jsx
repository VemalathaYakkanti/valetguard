import { useState } from 'react'
import { Shield, Key, Smartphone, RefreshCw, Loader2, CheckCircle2, QrCode, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ─── Reset Authenticator Modal ─── */
function ResetAuthenticatorModal({ onClose, token }) {
  const [step, setStep] = useState('verify') // verify | scan
  const [currentOtp, setCurrentOtp] = useState('')
  const [newQr, setNewQr] = useState('')
  const [newSecret, setNewSecret] = useState('')
  const [newOtp, setNewOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)
  const { user } = useAuthStore()

  const handleVerifyAndReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Step 1: Verify current TOTP and reset
      const res = await fetch(`${apiUrl}/2fa/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentToken: currentOtp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Step 2: Generate new QR code for re-enrollment
      const setupRes = await fetch(`${apiUrl}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const setupData = await setupRes.json()
      if (!setupRes.ok) throw new Error(setupData.message)

      setNewQr(setupData.qrCode)
      setNewSecret(setupData.secret)
      setStep('scan')
      toast.success('Old authenticator cleared. Scan the new QR code.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleActivateNew = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token: newOtp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success('New authenticator activated successfully!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(newSecret)
    setSecretCopied(true)
    toast.success('Secret copied!')
    setTimeout(() => setSecretCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-8"
      >
        {step === 'verify' ? (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-amber-50 rounded-2xl text-amber-600 mb-2">
                <RefreshCw size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Reset Authenticator</h2>
              <p className="text-sm text-slate-500">
                To switch to a new authenticator (e.g., give access to a colleague),
                enter your <strong>current 6-digit code</strong> first as proof.
              </p>
            </div>
            <form onSubmit={handleVerifyAndReset} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current TOTP Code</label>
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  value={currentOtp}
                  onChange={(e) => setCurrentOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  className="w-full text-center text-3xl font-black tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-2xl py-5 text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={currentOtp.length !== 6 || loading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <><RefreshCw size={18} /><span>Reset & Generate New QR</span></>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-2">
                <QrCode size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Scan New QR Code</h2>
              <p className="text-sm text-slate-500">
                The new person should scan this with their Google Authenticator app.
              </p>
            </div>
            {newQr && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl border-4 border-slate-100 shadow-inner">
                  <img src={newQr} alt="New 2FA QR Code" className="w-44 h-44" />
                </div>
              </div>
            )}
            {/* Manual key */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manual Entry Key</p>
                <p className="font-mono text-xs text-slate-700 font-bold break-all">{newSecret}</p>
              </div>
              <button onClick={copySecret} className="ml-3 p-2 hover:bg-slate-200 rounded-lg text-slate-400 flex-shrink-0">
                {secretCopied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <form onSubmit={handleActivateNew} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter New Code to Confirm</label>
                <input
                  type="text"
                  maxLength={6}
                  value={newOtp}
                  onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  className="w-full text-center text-3xl font-black tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-2xl py-5 text-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={newOtp.length !== 6 || loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <><CheckCircle2 size={18} /><span>Activate New Authenticator</span></>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}

/* ─── Main Settings Page ─── */
export default function Settings() {
  const { token, user } = useAuthStore()
  const [showResetModal, setShowResetModal] = useState(false)

  return (
    <div className="max-w-4xl space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Security Settings</h2>
        <p className="text-slate-500 font-medium">Protect your workspace with enterprise-grade security.</p>
      </motion.div>

      <div className="grid gap-6">
        {/* Account Info */}
        <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm">
          <div className="flex items-center space-x-5">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-100">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{user?.email}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm text-emerald-600 font-bold">2FA Active · Google Authenticator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Password (placeholder) */}
        <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-60">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Key size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Master Password</h3>
              <p className="text-sm text-slate-500 font-medium">Change requires re-encrypting all vault credentials.</p>
            </div>
          </div>
          <button className="px-8 py-3 bg-slate-50 text-slate-400 rounded-xl font-bold cursor-not-allowed">
            Coming Soon
          </button>
        </div>

        {/* Google Authenticator — Reset */}
        <div className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Smartphone size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Google Authenticator</h3>
              <p className="text-sm text-slate-500 font-medium">
                Switch devices or hand access to a colleague. You'll verify your current code first.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-200 flex items-center space-x-2 whitespace-nowrap"
          >
            <RefreshCw size={16} />
            <span>Reset Authenticator</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-600 rounded-xl text-white flex-shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Zero-Knowledge Architecture</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Your master password and all vault data are encrypted client-side before being sent to our servers.
                We never see your passwords. 2FA is mandatory on all accounts to ensure no one can access your vault
                even if your email and password are compromised.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <ResetAuthenticatorModal
            onClose={() => setShowResetModal(false)}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
