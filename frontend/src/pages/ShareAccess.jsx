import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2, Plus, Trash2, Calendar, Mail, Building2, User,
  CheckCircle2, X, Loader2, Shield, Clock, Eye, Copy, RefreshCw,
  Users, Lock, AlertTriangle, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ─── Create Share Modal ─── */
function CreateShareModal({ onClose, token, credentials, folders, files }) {
  const [form, setForm] = useState({
    recipientName: '',
    employerName: '',
    recipientEmail: '',
    durationMode: 'days', // 'hours' | 'days'
    durationValue: 30,
    permissions: { canViewPassword: true, canCopyPassword: true, canViewNotes: false },
  })
  const [selectedCreds, setSelectedCreds] = useState([])
  const [selectedFolders, setSelectedFolders] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('details') // details | credentials | confirm | success
  const [successData, setSuccessData] = useState(null)
  const [copied, setCopied] = useState(false)

  const toggleCred = (id) => {
    setSelectedCreds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    if (!form.recipientName || !form.recipientEmail || (!selectedCreds.length && !selectedFolders.length && !selectedFiles.length)) {
      toast.error('Fill in all fields and select at least one item to share')
      return
    }
    setLoading(true)
    try {
      const payload = {
        recipientName: form.recipientName,
        employerName: form.employerName,
        recipientEmail: form.recipientEmail,
        permissions: form.permissions,
        credentialIds: selectedCreds,
        folderSlugs: selectedFolders,
        fileIds: selectedFiles,
      }

      if (form.durationMode === 'hours') {
        payload.expiresInHours = form.durationValue
      } else {
        payload.expiresInDays = form.durationValue
      }

      const res = await fetch(`${apiUrl}/shares`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setSuccessData(data)
      setStep('success')
      toast.success(data.emailSent ? `Invitation sent to ${form.recipientEmail}!` : 'Access generated successfully!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyAllCredentials = () => {
    if (!successData) return
    const text = `VaultGuard Shared Access Credentials\n\nRecipient: ${form.recipientName}\nEmail: ${form.recipientEmail}\nLogin URL: ${successData.loginUrl}\nTemporary Password: ${successData.tempPassword}\nOne-Time OTP: ${successData.otp}\n\nNote: OTP expires in 24 hours.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Credentials copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const PermToggle = ({ label, field }) => (
    <button
      type="button"
      onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [field]: !f.permissions[field] } }))}
      className={cn(
        'flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all',
        form.permissions[field]
          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
      )}
    >
      <div className={cn('w-3 h-3 rounded-full border-2 transition-all', form.permissions[field] ? 'bg-white border-white' : 'border-slate-300')} />
      <span>{label}</span>
    </button>
  )

  const hoursOptions = [1, 2, 4, 8, 12, 24]
  const daysOptions = [7, 14, 30, 90]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => step === 'success' ? onClose(true) : onClose(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><Share2 size={22} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {step === 'success' ? 'Access Generated Successfully' : 'Share Vault Access'}
              </h3>
              {step !== 'success' && (
                <div className="flex space-x-1 mt-1.5">
                  {['Recipient Details', 'Select Credentials', 'Confirm & Send'].map((s, i) => (
                    <div key={s} className={cn('h-1.5 rounded-full transition-all', i === ['details', 'credentials', 'confirm'].indexOf(step) ? 'w-8 bg-blue-600' : 'w-3 bg-slate-200')} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => step === 'success' ? onClose(true) : onClose(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Recipient Details */}
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5"><User size={11} /><span>Recipient Name *</span></label>
                    <input value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="Jane Smith" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5"><Building2 size={11} /><span>Employer / Company</span></label>
                    <input value={form.employerName} onChange={e => setForm(f => ({ ...f, employerName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="Acme Corp" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5"><Mail size={11} /><span>Recipient Email *</span></label>
                  <input type="email" value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                    placeholder="jane@example.com" />
                </div>

                {/* Duration Mode & Value */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5"><Clock size={11} /><span>Access Duration Limit</span></label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, durationMode: 'hours', durationValue: 4 }))}
                        className={cn('px-2.5 py-1 rounded-md text-xs font-bold transition-all', form.durationMode === 'hours' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
                      >
                        Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, durationMode: 'days', durationValue: 30 }))}
                        className={cn('px-2.5 py-1 rounded-md text-xs font-bold transition-all', form.durationMode === 'days' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
                      >
                        Days
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {(form.durationMode === 'hours' ? hoursOptions : daysOptions).map(val => (
                      <button key={val} type="button" onClick={() => setForm(f => ({ ...f, durationValue: val }))}
                        className={cn('py-2.5 rounded-xl font-bold text-xs transition-all', form.durationValue === val ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-400')}>
                        {val} {form.durationMode === 'hours' ? (val === 1 ? 'hour' : 'hours') : 'days'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permissions</label>
                  <div className="flex flex-wrap gap-2">
                    <PermToggle label="View Password" field="canViewPassword" />
                    <PermToggle label="Copy Password" field="canCopyPassword" />
                    <PermToggle label="View Notes" field="canViewNotes" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Items */}
            {step === 'credentials' && (
              <motion.div key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm text-slate-500 font-medium">Select the items to share with <strong className="text-slate-900">{form.recipientName}</strong>:</p>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  
                  {/* Credentials Section */}
                  {credentials.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white z-10 py-1">Vault Credentials</p>
                      {credentials.map(cred => (
                        <button key={cred.id} type="button" onClick={() => toggleCred(cred.id)}
                          className={cn('w-full flex items-center space-x-4 p-4 rounded-2xl border transition-all text-left', selectedCreds.includes(cred.id) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}>
                          <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0', selectedCreds.includes(cred.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                            {selectedCreds.includes(cred.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{cred.title}</p>
                            <p className="text-xs text-slate-500 font-medium truncate">{cred.username}</p>
                          </div>
                          <Shield size={14} className="text-slate-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Folders Section */}
                  {folders.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white z-10 py-1">Entire Folders</p>
                      {folders.map(folder => (
                        <button key={folder.slug} type="button" onClick={() => setSelectedFolders(prev => prev.includes(folder.slug) ? prev.filter(s => s !== folder.slug) : [...prev, folder.slug])}
                          className={cn('w-full flex items-center space-x-4 p-4 rounded-2xl border transition-all text-left', selectedFolders.includes(folder.slug) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}>
                          <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0', selectedFolders.includes(folder.slug) ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                            {selectedFolders.includes(folder.slug) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{folder.name}</p>
                          </div>
                          <Shield size={14} className="text-slate-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Specific Documents Section */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white z-10 py-1">Specific Documents</p>
                      {files.map(file => (
                        <button key={file.id} type="button" onClick={() => setSelectedFiles(prev => prev.includes(file.id) ? prev.filter(f => f !== file.id) : [...prev, file.id])}
                          className={cn('w-full flex items-center space-x-4 p-4 rounded-2xl border transition-all text-left', selectedFiles.includes(file.id) ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300')}>
                          <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0', selectedFiles.includes(file.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                            {selectedFiles.includes(file.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500 font-medium truncate">in {file.folder_slug}</p>
                          </div>
                          <Shield size={14} className="text-slate-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(selectedCreds.length + selectedFolders.length + selectedFiles.length) > 0 && (
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                    {selectedCreds.length + selectedFolders.length + selectedFiles.length} item(s) selected
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">Share Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400 font-bold">To:</span> <span className="font-bold text-slate-900">{form.recipientName}</span></div>
                    <div><span className="text-slate-400 font-bold">Company:</span> <span className="font-bold text-slate-900">{form.employerName || '—'}</span></div>
                    <div className="col-span-2"><span className="text-slate-400 font-bold">Email:</span> <span className="font-bold text-slate-900">{form.recipientEmail}</span></div>
                    <div><span className="text-slate-400 font-bold">Duration:</span> <span className="font-bold text-slate-900">{form.durationValue} {form.durationMode}</span></div>
                    <div><span className="text-slate-400 font-bold">Items:</span> <span className="font-bold text-slate-900">{selectedCreds.length + selectedFolders.length + selectedFiles.length} shared</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-bold text-amber-700 leading-relaxed">
                    An email with a temporary password and one-time OTP will be generated for <strong>{form.recipientEmail}</strong>.
                    If email delivery fails, you will be able to copy the credentials manually on the next screen.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Success Display */}
            {step === 'success' && successData && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                {!successData.emailSent ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
                    <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Email delivery skipped or unavailable</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Please copy the credentials below and send them to the recipient directly via secure messaging.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3">
                    <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Invitation Email Sent Successfully!</p>
                      <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                        The recipient has been emailed their link and codes. You can also copy them below as a backup.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Login Details</span>
                    <span className="text-xs font-bold text-blue-600">{form.recipientEmail}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Login Portal URL</span>
                      <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl">
                        <span className="font-mono text-xs text-slate-800 truncate">{successData.loginUrl}</span>
                        <a href={successData.loginUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 ml-2">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">Temporary Password</span>
                        <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl font-mono text-xs font-bold text-slate-900">
                          {successData.tempPassword}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">One-Time OTP</span>
                        <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl font-mono text-xs font-bold text-blue-600 tracking-wider">
                          {successData.otp}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyAllCredentials}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xl shadow-slate-200"
                >
                  {copied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy All Credentials'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-100 flex space-x-3">
          {step !== 'details' && step !== 'success' && (
            <button type="button"
              onClick={() => setStep(step === 'confirm' ? 'credentials' : 'details')}
              className="px-6 py-3.5 rounded-xl font-black text-slate-400 hover:text-slate-600 text-xs uppercase tracking-widest">
              ← Back
            </button>
          )}
          <div className="flex-1" />
          {step === 'details' && (
            <button type="button"
              onClick={() => { if (!form.recipientName || !form.recipientEmail) { toast.error('Fill in name and email'); return } setStep('credentials') }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all">
              Select Credentials →
            </button>
          )}
          {step === 'credentials' && (
            <button type="button"
              onClick={() => { if (!(selectedCreds.length + selectedFolders.length + selectedFiles.length)) { toast.error('Select at least one item'); return } setStep('confirm') }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all">
              Review & Generate →
            </button>
          )}
          {step === 'confirm' && (
            <button type="button" onClick={handleSend} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200 flex items-center space-x-2 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={16} /><span>Generate Access</span></>}
            </button>
          )}
          {step === 'success' && (
            <button type="button" onClick={() => onClose(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200">
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main ShareAccess Page ─── */
export default function ShareAccess() {
  const { token } = useAuthStore()
  const [shares, setShares] = useState([])
  const [credentials, setCredentials] = useState([])
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sharesRes, credsRes, foldersRes] = await Promise.all([
        fetch(`${apiUrl}/shares`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/credentials`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/folders/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ])
      const sharesData = await sharesRes.json()
      const credsData = await credsRes.json()
      const foldersData = await foldersRes.json()
      
      setShares(Array.isArray(sharesData) ? sharesData : [])
      setCredentials(Array.isArray(credsData) ? credsData : [])
      setFolders(Array.isArray(foldersData?.folders) ? foldersData.folders : [])
      setFiles(Array.isArray(foldersData?.files) ? foldersData.files : [])
    } catch (err) {
      toast.error('Failed to load sharing data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRevoke = async (guestId, name) => {
    if (!window.confirm(`Revoke access for ${name}? This will immediately lock them out.`)) return
    try {
      const res = await fetch(`${apiUrl}/shares/${guestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast.success(`Access revoked for ${name}`)
      fetchData()
    } catch {
      toast.error('Failed to revoke access')
    }
  }

  const handleExtend = async (guestId, name, type, amount) => {
    try {
      const body = type === 'hours' ? { hours: amount } : { days: amount }
      const res = await fetch(`${apiUrl}/shares/${guestId}/extend`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(`Extended ${name}'s access by ${amount} ${type}`)
      fetchData()
    } catch {
      toast.error('Failed to extend access')
    }
  }

  const isExpired = (date) => new Date(date) < new Date()

  return (
    <div className="max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            Shared Access <Users size={24} className="ml-3 text-blue-600" />
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Share specific vault credentials with team members or clients — fine-grained duration limits (hours/days).
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-slate-200 transition-all text-sm"
        >
          <Plus size={18} />
          <span>Share Access</span>
        </button>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Shares', value: shares.length, icon: Share2, color: 'text-blue-600' },
          { label: 'Active', value: shares.filter(s => !isExpired(s.expires_at)).length, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Expired', value: shares.filter(s => isExpired(s.expires_at)).length, icon: Clock, color: 'text-slate-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Shares List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading shares...</p>
        </div>
      ) : shares.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-8 bg-slate-50 rounded-3xl text-slate-200"><Share2 size={56} strokeWidth={1.5} /></div>
          <h3 className="text-xl font-bold text-slate-900">No active shares</h3>
          <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto">
            Click "Share Access" to securely share specific credentials with customizable hourly/daily access.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map(share => {
            const expired = isExpired(share.expires_at)
            return (
              <motion.div
                key={share.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'bg-white border rounded-[1.5rem] p-6 shadow-sm transition-all',
                  expired ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:shadow-md'
                )}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-5">
                    {/* Avatar */}
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg', expired ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-100')}>
                      {share.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-black text-slate-900">{share.name}</h4>
                        {share.is_activated && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>}
                        {!share.is_activated && !expired && <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-widest">Pending</span>}
                        {expired && <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-widest">Expired</span>}
                      </div>
                      <div className="flex items-center space-x-3 mt-0.5">
                        <span className="text-xs text-slate-500 font-medium">{share.email}</span>
                        {share.employer && <span className="text-xs text-slate-400 font-medium">· {share.employer}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 flex-wrap gap-2 justify-end">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {expired ? 'Expired At' : 'Expires'}
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {new Date(share.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {share.credential_count || 0} creds, {share.folder_count || 0} folders, {share.file_count || 0} files
                      </p>
                    </div>

                    {/* Quick Extend Buttons */}
                    {!expired && (
                      <div className="flex items-center space-x-1 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                        <span className="text-[9px] font-black text-slate-400 px-1.5 uppercase tracking-widest">Extend:</span>
                        <button
                          onClick={() => handleExtend(share.id, share.name, 'hours', 1)}
                          className="px-2 py-1 bg-white hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-blue-600 rounded-lg shadow-sm transition-all"
                          title="Extend by 1 Hour"
                        >
                          +1h
                        </button>
                        <button
                          onClick={() => handleExtend(share.id, share.name, 'hours', 4)}
                          className="px-2 py-1 bg-white hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-blue-600 rounded-lg shadow-sm transition-all"
                          title="Extend by 4 Hours"
                        >
                          +4h
                        </button>
                        <button
                          onClick={() => handleExtend(share.id, share.name, 'days', 1)}
                          className="px-2 py-1 bg-white hover:bg-blue-50 text-[11px] font-bold text-slate-600 hover:text-blue-600 rounded-lg shadow-sm transition-all"
                          title="Extend by 1 Day"
                        >
                          +1d
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleRevoke(share.id, share.name)}
                      className="p-2.5 bg-slate-100 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Share Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateShareModal
            onClose={(refresh) => { setShowCreate(false); if (refresh) fetchData() }}
            token={token}
            credentials={credentials}
            folders={folders}
            files={files}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
