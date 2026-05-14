import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'

export default function Trash() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
          Trash
          <Trash2 size={22} className="ml-3 text-slate-400" />
        </h2>
        <p className="text-slate-500 font-medium text-sm">
          Deleted credentials are permanently removed — no soft-delete yet.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-6 shadow-sm"
      >
        <div className="inline-flex p-8 bg-slate-50 rounded-3xl text-slate-200">
          <Trash2 size={56} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">No deleted items</h3>
          <p className="text-slate-400 font-medium text-sm max-w-xs mx-auto">
            When soft-delete is implemented, recovered and permanently deleted credentials will appear here.
          </p>
        </div>
        <div className="inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Soft-delete coming soon
        </div>
      </motion.div>
    </div>
  )
}
