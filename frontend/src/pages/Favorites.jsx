import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Key, Copy, Eye, EyeOff, MoreHorizontal, Loader2, ShieldCheck, Trash2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { decryptData, encryptData } from '../lib/encryption'
import { cn } from '../lib/utils'
import TOTPDisplay from '../components/TOTPDisplay'
import PasswordGenerator from '../components/PasswordGenerator'

export default function Favorites() {
  const { token, masterPassword, logout } = useAuthStore()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [decryptedPasswords, setDecryptedPasswords] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [formData, setFormData] = useState({ title: '', username: '', password: '', description: '', url: '', totpSecret: '' })

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to fetch')
      const all = await res.json()
      setData(all.filter(c => c.is_favorite))
    } catch {
      toast.error('Could not load favorites')
    } finally {
      setLoading(false)
    }
  }, [token, logout])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const toggleShowPassword = async (item) => {
    if (decryptedPasswords[item.id]) {
      const n = { ...decryptedPasswords }; delete n[item.id]; setDecryptedPasswords(n); return
    }
    try {
      const d = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword)
      setDecryptedPasswords(prev => ({ ...prev, [item.id]: d }))
    } catch { toast.error('Decryption failed') }
  }

  const copyPassword = async (item) => {
    try {
      const d = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword)
      await navigator.clipboard.writeText(d)
      toast.success('Password copied')
    } catch { toast.error('Failed to copy') }
  }

  const handleOpenEdit = async (item) => {
    try {
      const decryptedPwd = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword)
      let decryptedNotes = ''
      if (item.encrypted_notes) {
        const notesObj = JSON.parse(item.encrypted_notes)
        decryptedNotes = await decryptData(notesObj.ciphertext, notesObj.iv, notesObj.salt, masterPassword)
      }
      let decryptedTotp = ''
      if (item.encrypted_totp_secret) {
        decryptedTotp = await decryptData(item.encrypted_totp_secret, item.totp_iv, item.totp_salt, masterPassword)
      }
      setFormData({ title: item.title, username: item.username, password: decryptedPwd, description: decryptedNotes, url: item.url || '', totpSecret: decryptedTotp })
      setEditingId(item.id)
      setShowAddModal(true)
    } catch { toast.error('Failed to decrypt for editing') }
  }

  const resetForm = () => {
    setShowAddModal(false); setEditingId(null)
    setFormData({ title: '', username: '', password: '', description: '', url: '', totpSecret: '' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.username || !formData.password) { toast.error('Fill in all required fields'); return }
    setIsSaving(true)
    try {
      const encPwd = await encryptData(formData.password, masterPassword)
      let encNotes = null
      if (formData.description) { const n = await encryptData(formData.description, masterPassword); encNotes = JSON.stringify(n) }
      let encTotp = null
      if (formData.totpSecret) { encTotp = await encryptData(formData.totpSecret.replace(/\s/g,''), masterPassword) }
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const url = editingId ? `${apiUrl}/credentials/${editingId}` : `${apiUrl}/credentials`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: formData.title, username: formData.username, url: formData.url, encrypted_password: encPwd.ciphertext, iv: encPwd.iv, salt: encPwd.salt, encrypted_notes: encNotes, encrypted_totp_secret: encTotp?.ciphertext || null, totp_iv: encTotp?.iv || null, totp_salt: encTotp?.salt || null, tags: [] })
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success(editingId ? 'Updated' : 'Saved')
      resetForm(); fetchFavorites()
    } catch { toast.error('Failed to save') } finally { setIsSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this credential?')) return
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/credentials/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      toast.success('Deleted'); fetchFavorites()
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
          Favorites <Star size={22} className="ml-3 text-amber-400 fill-amber-400" />
        </h2>
        <p className="text-slate-500 font-medium text-sm">Your starred credentials — quick access to essentials.</p>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Favorites...</p>
        </div>
      ) : data.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4">
          <div className="inline-flex p-6 bg-amber-50 rounded-3xl text-amber-300">
            <Star size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No favorites yet</h3>
          <p className="text-slate-500 max-w-xs mx-auto">Star a credential in the Vault to pin it here for fast access.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Star size={24} fill="currentColor" />
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => handleOpenEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><MoreHorizontal size={16} /></button>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 font-medium mb-4">{item.username}</p>

              {item.encrypted_totp_secret && (
                <div className="mb-4">
                  <TOTPDisplay encryptedTotpSecret={item.encrypted_totp_secret} iv={item.totp_iv} salt={item.totp_salt} masterPassword={masterPassword} />
                </div>
              )}

              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category || 'General'}</span>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <button onClick={() => copyPassword(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900" title="Copy password"><Copy size={16} /></button>
                  <button onClick={() => toggleShowPassword(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900">{decryptedPasswords[item.id] ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              {decryptedPasswords[item.id] && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Password</p>
                  <p className="font-mono text-blue-900 break-all text-sm">{decryptedPasswords[item.id]}</p>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetForm} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><ShieldCheck size={24} /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Edit Credential</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted</p>
                  </div>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400"><Key size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title *</label>
                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="Google Account" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username *</label>
                    <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="john@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password *</label>
                    <button type="button" onClick={() => setShowGenerator(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Generate</button>
                  </div>
                  <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono" placeholder="••••••••••••" />
                </div>
                <div className="pt-4 flex space-x-3">
                  <button type="button" onClick={resetForm} className="flex-1 px-6 py-4 rounded-xl font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-xs">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center uppercase tracking-widest text-xs">
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PasswordGenerator isOpen={showGenerator} onClose={() => setShowGenerator(false)} onUse={(pwd) => setFormData(f => ({ ...f, password: pwd }))} />

      <div className="flex items-center justify-center pt-10">
        <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
          <Lock size={12} className="text-emerald-500" />
          <span>AES-256 Encrypted</span>
        </div>
      </div>
    </div>
  )
}
