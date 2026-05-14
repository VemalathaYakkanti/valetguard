import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Copy, X, Zap, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'

const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'

function calcEntropy(length, charsetSize) {
  if (charsetSize === 0) return 0
  return Math.floor(length * Math.log2(charsetSize))
}

function getStrength(entropy) {
  if (entropy < 28) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600', pct: 15 }
  if (entropy < 50) return { label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600', pct: 40 }
  if (entropy < 70) return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600', pct: 72 }
  return { label: 'Very Strong', color: 'bg-blue-600', textColor: 'text-blue-600', pct: 100 }
}

function generatePassword(length, opts) {
  let charset = ''
  if (opts.uppercase) charset += UPPERCASE
  if (opts.lowercase) charset += LOWERCASE
  if (opts.numbers) charset += NUMBERS
  if (opts.symbols) charset += SYMBOLS
  if (!charset) charset = LOWERCASE

  // Use crypto.getRandomValues for true randomness
  const arr = new Uint32Array(length)
  window.crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((x) => charset[x % charset.length])
    .join('')
}

export default function PasswordGenerator({ isOpen, onClose, onUse }) {
  const [length, setLength] = useState(20)
  const [opts, setOpts] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  })
  const [password, setPassword] = useState('')

  const generate = useCallback(() => {
    setPassword(generatePassword(length, opts))
  }, [length, opts])

  // Auto-generate when modal opens or options change
  useEffect(() => {
    if (isOpen) generate()
  }, [isOpen, generate])

  const charsetSize =
    (opts.uppercase ? 26 : 0) +
    (opts.lowercase ? 26 : 0) +
    (opts.numbers ? 10 : 0) +
    (opts.symbols ? SYMBOLS.length : 0)

  const entropy = calcEntropy(length, charsetSize || 26)
  const strength = getStrength(entropy)

  const handleCopy = () => {
    navigator.clipboard.writeText(password)
    toast.success('Password copied!')
  }

  const handleUse = () => {
    if (onUse) onUse(password)
    onClose()
    toast.success('Password applied to form')
  }

  const Toggle = ({ label, value, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all',
        value
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      )}
    >
      <div
        className={cn(
          'w-3 h-3 rounded-full border-2 transition-all',
          value ? 'bg-white border-white' : 'border-slate-300'
        )}
      />
      <span>{label}</span>
    </button>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">Password Generator</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Cryptographically Secure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Password Preview */}
              <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="font-mono text-lg font-bold text-slate-900 break-all leading-relaxed tracking-wider pr-8">
                  {password || '—'}
                </p>
                <button
                  type="button"
                  onClick={generate}
                  className="absolute top-3 right-3 p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
                  title="Regenerate"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Strength Meter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Strength
                  </span>
                  <span className={cn('text-[11px] font-black uppercase tracking-wider', strength.textColor)}>
                    {strength.label} · {entropy} bits
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full transition-all', strength.color)}
                    animate={{ width: `${strength.pct}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  />
                </div>
              </div>

              {/* Length Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Length
                  </label>
                  <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                    {length}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>8</span>
                  <span>64</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Character Types
                </label>
                <div className="flex flex-wrap gap-2">
                  <Toggle
                    label="A–Z"
                    value={opts.uppercase}
                    onChange={(v) => setOpts((o) => ({ ...o, uppercase: v }))}
                  />
                  <Toggle
                    label="a–z"
                    value={opts.lowercase}
                    onChange={(v) => setOpts((o) => ({ ...o, lowercase: v }))}
                  />
                  <Toggle
                    label="0–9"
                    value={opts.numbers}
                    onChange={(v) => setOpts((o) => ({ ...o, numbers: v }))}
                  />
                  <Toggle
                    label="!@#"
                    value={opts.symbols}
                    onChange={(v) => setOpts((o) => ({ ...o, symbols: v }))}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-3.5 rounded-xl transition-all uppercase tracking-widest text-xs"
                >
                  <Copy size={16} />
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={handleUse}
                  className="flex-[2] flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl shadow-xl shadow-slate-200 transition-all uppercase tracking-widest text-xs"
                >
                  <ShieldCheck size={16} />
                  <span>Use This Password</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
