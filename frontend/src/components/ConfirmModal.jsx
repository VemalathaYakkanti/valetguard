import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden p-8 text-center space-y-5"
        >
          {/* Warning Icon */}
          <div className="inline-flex p-4 bg-red-50 rounded-3xl text-red-500 shadow-inner">
            <AlertTriangle size={32} />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{title}</h3>
            <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">{message}</p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest text-[10px]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-red-100 hover:shadow-xl transition-all uppercase tracking-widest text-[10px]"
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
