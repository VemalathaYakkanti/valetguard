import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, LogOut, Copy, Eye, EyeOff, Key, Globe, Loader2,
  Clock, Lock, Star, ShieldCheck, Folder, FileText, Download, Link as LinkIcon, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { decryptData } from '../lib/encryption'
import { cn } from '../lib/utils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * GuestVault.jsx
 * Restricted dashboard shown to guest users after login.
 * Shows only the credentials shared with them, respecting permission flags.
 */
export default function GuestVault() {
  const [credentials, setCredentials] = useState([])
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [guestInfo, setGuestInfo] = useState(null)
  const [sharedBy, setSharedBy] = useState('')
  const [loading, setLoading] = useState(true)
  const [decryptedPasswords, setDecryptedPasswords] = useState({})
  const [activeTab, setActiveTab] = useState('credentials')
  const [masterPassword, setMasterPassword] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true)
  const [promptPwd, setPromptPwd] = useState('')
  const navigate = useNavigate()

  const guestToken = sessionStorage.getItem('vg_guest_token')
  const storedGuestInfo = sessionStorage.getItem('vg_guest_info')

  useEffect(() => {
    if (!guestToken) { navigate('/guest-login'); return }
    if (storedGuestInfo) setGuestInfo(JSON.parse(storedGuestInfo))
  }, [])

  const handleUnlock = async (e) => {
    e.preventDefault()
    setMasterPassword(promptPwd)
    setShowPasswordPrompt(false)
    fetchCredentials(promptPwd)
  }

  const fetchCredentials = async (pwd) => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/shares/guest/credentials`, {
        headers: { 'Authorization': `Bearer ${guestToken}` },
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) { toast.error('Access expired'); navigate('/guest-login'); return }
        throw new Error(data.message)
      }
      setCredentials(data.credentials || [])
      setFolders(data.folders || [])
      setFiles(data.files || [])
      setSharedBy(data.guestInfo?.sharedBy || '')
    } catch (err) {
      toast.error(err.message || 'Failed to load shared credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleRevealPassword = async (item) => {
    if (decryptedPasswords[item.id]) {
      const n = { ...decryptedPasswords }; delete n[item.id]; setDecryptedPasswords(n); return
    }
    if (!item.encrypted_password || !item.iv || !item.salt) {
      toast.error('You don\'t have permission to view this password'); return
    }
    try {
      const d = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword)
      setDecryptedPasswords(prev => ({ ...prev, [item.id]: d }))
    } catch {
      toast.error('Could not decrypt — verify your master password is correct')
    }
  }

  const handleCopyPassword = async (item) => {
    if (!item.can_copy_password) { toast.error('Copy permission not granted'); return }
    if (decryptedPasswords[item.id]) {
      await navigator.clipboard.writeText(decryptedPasswords[item.id])
      toast.success('Password copied!')
      return
    }
    try {
      const d = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword)
      await navigator.clipboard.writeText(d)
      toast.success('Password copied!')
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('vg_guest_token')
    sessionStorage.removeItem('vg_guest_info')
    navigate('/guest-login')
  }

  const handleDownloadFile = (file) => {
    const fileContent = file.content || ''
    
    if (fileContent.startsWith('data:')) {
      try {
        const arr = fileContent.split(',')
        const mime = arr[0].match(/:(.*?);/)[1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) { u8arr[n] = bstr.charCodeAt(n) }
        const fileBlob = new Blob([u8arr], { type: mime })
        const element = document.createElement('a')
        element.href = URL.createObjectURL(fileBlob)
        element.download = file.name
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        toast.success(`Downloaded ${file.name}`)
        return
      } catch (err) {}
    }
    
    // Fallback for text/links
    if (file.type?.toLowerCase() === 'link') {
       let url = '';
       try { url = JSON.parse(fileContent).url; } catch(e) { url = fileContent; }
       window.open(url, '_blank');
       return;
    }

    const fileBlob = new Blob([fileContent || 'Empty File Container'], { type: 'text/plain;charset=utf-8' })
    const element = document.createElement('a')
    element.href = URL.createObjectURL(fileBlob)
    element.download = file.name || 'document.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success(`Downloaded ${file.name}`)
  }

  const getFileMeta = (type) => {
    switch (type?.toLowerCase()) {
      case 'folder': return { icon: Folder, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'File Folder' }
      case 'link': return { icon: LinkIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', label: 'External Link' }
      case 'image': return { icon: Globe, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', label: 'Image Asset' }
      default: return { icon: FileText, color: 'text-sky-500', bg: 'bg-sky-50 border-sky-100', label: 'Document' }
    }
  }

  const expiresAt = guestInfo?.expiresAt
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  /* ─── Password Prompt ─── */
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 space-y-6 text-center"
        >
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Enter Decryption Key</h2>
            <p className="text-slate-500 text-sm font-medium mt-2">
              Enter the master password used to encrypt these credentials.
              Ask the person who shared the vault with you.
            </p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={promptPwd}
              onChange={e => setPromptPwd(e.target.value)}
              autoFocus
              placeholder="Master password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-mono focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-center"
              required
            />
            <button type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-slate-200">
              Unlock Vault
            </button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Guest Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
              <Shield size={20} />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight">VaultGuard</span>
              <span className="ml-2 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-widest">Guest</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Expiry indicator */}
            {daysLeft !== null && (
              <div className={cn('flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-full border', daysLeft <= 3 ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-500 bg-slate-50 border-slate-200')}>
                <Clock size={12} />
                <span>{daysLeft}d remaining</span>
              </div>
            )}
            {guestInfo && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center text-xs font-black text-slate-700">
                  {guestInfo.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-bold text-slate-700">{guestInfo.name}</span>
              </div>
            )}
            <button onClick={handleLogout} className="flex items-center space-x-1.5 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold p-2">
              <LogOut size={16} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Shared-by banner */}
      {guestInfo && (
        <div className="bg-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center space-x-3">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <p className="text-sm font-bold">
              Shared with you by <strong>{guestInfo.email?.split('@')[0] || 'an admin'}</strong>
              {expiresAt && <> · Access expires {new Date(expiresAt).toLocaleDateString()}</>}
            </p>
          </div>
        </div>
      )}

      {/* Credentials & Files Grid */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Shared Access
          </h1>
          
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
            <button onClick={() => setActiveTab('credentials')} className={cn("px-4 py-2 font-bold text-sm transition-all border-b-2", activeTab === 'credentials' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              Credentials ({credentials.length})
            </button>
            <button onClick={() => setActiveTab('folders')} className={cn("px-4 py-2 font-bold text-sm transition-all border-b-2", activeTab === 'folders' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              Folders ({folders.length})
            </button>
            <button onClick={() => setActiveTab('files')} className={cn("px-4 py-2 font-bold text-sm transition-all border-b-2", activeTab === 'files' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              Documents ({files.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Decrypting Vault...</p>
          </div>
        ) : (
          <>
            {activeTab === 'credentials' && (
              credentials.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4 shadow-sm">
                  <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-200"><Key size={48} /></div>
                  <h3 className="text-xl font-bold text-slate-900">No credentials shared</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {credentials.map(item => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Key size={22} />
                        </div>
                        {item.is_favorite && <Star size={16} className="text-amber-400 fill-amber-400" />}
                      </div>

                      <h3 className="text-xl font-black text-slate-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-500 font-medium mb-1">{item.username}</p>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-xs text-blue-500 font-bold hover:underline mb-4">
                          <Globe size={11} />
                          <span className="truncate">{item.url}</span>
                        </a>
                      )}

                      <div className="pt-4 border-t border-slate-100 mt-4">
                        {item.encrypted_password ? (
                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Password</p>
                              <p className="font-mono text-sm text-slate-700 truncate">{decryptedPasswords[item.id] || '••••••••••••'}</p>
                            </div>
                            <div className="flex space-x-1">
                              {item.can_view_password && (
                                <button onClick={() => handleRevealPassword(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                                  {decryptedPasswords[item.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              )}
                              {item.can_copy_password && (
                                <button onClick={() => handleCopyPassword(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                  <Copy size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-slate-300">
                            <Lock size={14} />
                            <span className="text-xs font-bold uppercase tracking-widest">Password hidden</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'folders' && (
              folders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4 shadow-sm">
                  <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-200"><Folder size={48} /></div>
                  <h3 className="text-xl font-bold text-slate-900">No folders shared</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {folders.map(folder => (
                    <div key={folder.id} className="bg-amber-50/30 border border-amber-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm h-32 group">
                      <div className="p-3 rounded-xl bg-amber-100 w-12 h-12 flex items-center justify-center">
                        <Folder size={20} className="text-amber-600 fill-amber-600" />
                      </div>
                      <p className="text-sm font-black text-amber-900 mt-3 truncate">{folder.name}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'files' && (
              files.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4 shadow-sm">
                  <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-200"><FileText size={48} /></div>
                  <h3 className="text-xl font-bold text-slate-900">No documents shared</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {files.map(file => {
                    const meta = getFileMeta(file.type)
                    const MetaIcon = meta.icon
                    return (
                      <div key={file.id} onClick={() => handleDownloadFile(file)} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group h-40">
                        <div className="flex justify-between items-start">
                          <div className={cn('p-3 rounded-xl border', meta.bg)}>
                            <MetaIcon size={20} className={meta.color} />
                          </div>
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 group-hover:text-blue-600 transition-colors">
                            {file.type?.toLowerCase() === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
                          </button>
                        </div>
                        <div className="mt-4">
                          <p className="text-xs font-black text-slate-900 truncate group-hover:text-blue-600">{file.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{meta.label} · {file.size}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center pt-16">
          <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
            <Lock size={12} className="text-emerald-500" />
            <span>Read-only · AES-256 · Guest Session</span>
          </div>
        </div>
      </main>
    </div>
  )
}
