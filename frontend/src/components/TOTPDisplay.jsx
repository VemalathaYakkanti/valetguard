import { useState, useEffect } from 'react'
import { Copy, Clock, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { decryptData } from '../lib/encryption'
import { generateTOTP } from '../lib/totp'

/**
 * TOTPDisplay
 * Props:
 *   encryptedTotpSecret  – base64 ciphertext
 *   iv                   – base64 IV
 *   salt                 – base64 salt
 *   masterPassword       – plaintext master password (never stored)
 */
export default function TOTPDisplay({ encryptedTotpSecret, iv, salt, masterPassword }) {
  const [secret, setSecret] = useState(null)
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [error, setError] = useState(false)

  // Decrypt once on mount
  useEffect(() => {
    if (!encryptedTotpSecret || !iv || !salt || !masterPassword) return
    decryptData(encryptedTotpSecret, iv, salt, masterPassword)
      .then((s) => setSecret(s.replace(/\s/g, '')))
      .catch(() => setError(true))
  }, [encryptedTotpSecret, iv, salt, masterPassword])

  // Generate code + countdown every second
  useEffect(() => {
    if (!secret) return
    const tick = async () => {
      const epoch = Math.floor(Date.now() / 1000)
      setTimeLeft(30 - (epoch % 30))
      try {
        const otp = await generateTOTP(secret)
        setCode(otp)
      } catch {
        setCode('INVALID')
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [secret])

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-500 text-xs font-bold">
        <ShieldAlert size={14} />
        <span>Decrypt failed</span>
      </div>
    )
  }

  if (!secret) return null

  const RADIUS = 14
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * timeLeft) / 30

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    toast.success('TOTP code copied!')
  }

  return (
    <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
      {/* Circular countdown ring */}
      <div className="relative w-9 h-9 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16" cy="16" r={RADIUS}
            stroke="#BFDBFE" strokeWidth="3" fill="transparent"
          />
          <circle
            cx="16" cy="16" r={RADIUS}
            stroke={timeLeft <= 5 ? '#ef4444' : '#2563eb'}
            strokeWidth="3" fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-blue-600">
          {timeLeft}
        </span>
      </div>

      {/* Code */}
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1 flex items-center">
          <Clock size={9} className="mr-1" /> Auth Code
        </span>
        <span className="text-lg font-black text-blue-900 tracking-[0.15em] leading-none font-mono">
          {code.slice(0, 3)} {code.slice(3)}
        </span>
      </div>

      {/* Copy */}
      <button
        type="button"
        onClick={handleCopy}
        className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0"
        title="Copy code"
      >
        <Copy size={14} />
      </button>
    </div>
  )
}
