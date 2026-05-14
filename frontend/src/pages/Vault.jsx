import { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel
} from '@tanstack/react-table'
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Copy, 
  ExternalLink, 
  Eye, 
  Grid, 
  List,
  Lock,
  Star,
  Globe,
  Key,
  ShieldCheck,
  X,
  Loader2,
  EyeOff,
  Trash2,
  Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { encryptData, decryptData } from '../lib/encryption'
import { authenticator } from 'otplib'
import { Clock } from 'lucide-react'
import PasswordGenerator from '../components/PasswordGenerator'

// TOTP Display Component
const TOTPDisplay = ({ secret }) => {
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    if (!secret) return

    const updateTOTP = () => {
      try {
        const newCode = authenticator.generate(secret)
        setCode(newCode)
        const epoch = Math.floor(Date.now() / 1000)
        setTimeLeft(30 - (epoch % 30))
      } catch (e) {
        setCode('INVALID')
      }
    }

    updateTOTP()
    const timer = setInterval(updateTOTP, 1000)
    return () => clearInterval(timer)
  }, [secret])

  if (!secret) return null

  return (
    <div className="flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1 flex items-center">
          <Clock size={10} className="mr-1" /> Auth Code
        </span>
        <span className="text-xl font-black text-blue-900 tracking-[0.1em] leading-none">
          {code.slice(0,3)} {code.slice(3)}
        </span>
      </div>
      <div className="relative w-8 h-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="16" cy="16" r="14"
            stroke="currentColor" strokeWidth="3" fill="transparent"
            className="text-blue-200"
          />
          <circle
            cx="16" cy="16" r="14"
            stroke="currentColor" strokeWidth="3" fill="transparent"
            strokeDasharray={88}
            strokeDashoffset={88 - (88 * timeLeft) / 30}
            className="text-blue-600 transition-all duration-1000"
          />
        </svg>
      </div>
    </div>
  )
}

export default function Vault() {
  const [viewMode, setViewMode] = useState('list')
  const [globalFilter, setGlobalFilter] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [decryptedPasswords, setDecryptedPasswords] = useState({}) // { id: decryptedText }
  const [showGenerator, setShowGenerator] = useState(false)

  const { token, masterPassword, logout } = useAuthStore()

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    username: '',
    password: '',
    description: '',
    url: '',
    totpSecret: ''
  })

  const [decryptedTOTP, setDecryptedTOTP] = useState({}) // { id: secret }

  const fetchCredentials = useCallback(async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        logout()
        toast.error('Session expired. Please login again.')
        return
      }

      if (!res.ok) throw new Error('Failed to fetch')
      const credentials = await res.json()
      setData(credentials)
    } catch (err) {
      toast.error('Could not load credentials')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchCredentials()
  }, [fetchCredentials])

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
      
      setFormData({
        title: item.title,
        username: item.username,
        password: decryptedPwd,
        description: decryptedNotes,
        url: item.url || '',
        totpSecret: decryptedTotp
      })
      setEditingId(item.id)
      setShowAddModal(true)
    } catch (err) {
      toast.error('Failed to decrypt for editing')
    }
  }

  const resetForm = () => {
    setShowAddModal(false)
    setEditingId(null)
    setFormData({ title: '', username: '', password: '', description: '', url: '', totpSecret: '' })
  }

  const handleSaveCredential = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.username || !formData.password) {
      toast.error('Please fill in all mandatory fields')
      return
    }

    setIsSaving(true)
    try {
      // 1. Encrypt password
      const encryptedPwd = await encryptData(formData.password, masterPassword)
      
      // 2. Encrypt notes (description) if present
      let encryptedNotes = null
      if (formData.description) {
        const notesData = await encryptData(formData.description, masterPassword)
        encryptedNotes = JSON.stringify(notesData)
      }

      // 3. Encrypt TOTP secret if present
      let encryptedTotp = null
      if (formData.totpSecret) {
        encryptedTotp = await encryptData(formData.totpSecret.replace(/\s/g, ''), masterPassword)
      }

      // 4. Send to API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const url = editingId 
        ? `${apiUrl}/credentials/${editingId}`
        : `${apiUrl}/credentials`
      
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          username: formData.username,
          url: formData.url || '',
          encrypted_password: encryptedPwd.ciphertext,
          iv: encryptedPwd.iv,
          salt: encryptedPwd.salt,
          encrypted_notes: encryptedNotes,
          encrypted_totp_secret: encryptedTotp?.ciphertext || null,
          totp_iv: encryptedTotp?.iv || null,
          totp_salt: encryptedTotp?.salt || null,
          tags: []
        })
      })

      if (res.status === 401) {
        logout()
        toast.error('Session expired. Please login again.')
        return
      }

      if (!res.ok) throw new Error('Failed to save')
      
      toast.success(editingId ? 'Credential updated' : 'Credential saved')
      setShowAddModal(false)
      setEditingId(null)
      setFormData({ title: '', username: '', password: '', description: '', url: '', totpSecret: '' })
      fetchCredentials()
    } catch (err) {
      toast.error('Failed to save credential')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleShowPassword = async (row) => {
    if (decryptedPasswords[row.id]) {
      const newPasswords = { ...decryptedPasswords }
      delete newPasswords[row.id]
      setDecryptedPasswords(newPasswords)
      return
    }

    try {
      const decrypted = await decryptData(
        row.encrypted_password,
        row.iv,
        row.salt,
        masterPassword
      )
      setDecryptedPasswords(prev => ({ ...prev, [row.id]: decrypted }))
    } catch (err) {
      toast.error('Decryption failed')
    }
  }

  const copyToClipboard = async (text, label) => {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this credential?')) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/credentials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Credential deleted')
      fetchCredentials()
    } catch (err) {
      toast.error('Failed to delete credential')
    }
  }

  const columns = useMemo(() => [
    {
      accessorKey: 'is_favorite',
      header: '',
      cell: ({ row }) => (
        <button className={cn("transition-colors", row.original.is_favorite ? "text-amber-400" : "text-slate-300 hover:text-slate-400")}>
          <Star size={16} fill={row.original.is_favorite ? "currentColor" : "none"} />
        </button>
      ),
      size: 40
    },
    {
      accessorKey: 'title',
      header: 'Item Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Globe size={16} />
          </div>
          <span className="font-bold text-slate-900">{row.original.title}</span>
        </div>
      )
    },
    {
      accessorKey: 'username',
      header: 'Username',
      cell: ({ getValue }) => <span className="text-slate-500 font-medium">{getValue()}</span>
    },
    {
      accessorKey: 'password',
      header: 'Password',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs text-slate-400">
            {decryptedPasswords[row.original.id] ? decryptedPasswords[row.original.id] : '••••••••••••'}
          </span>
          <button 
            onClick={() => toggleShowPassword(row.original)}
            className="p-1 hover:bg-slate-100 rounded text-slate-400"
          >
            {decryptedPasswords[row.original.id] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {row.original.encrypted_totp_secret && (
            <div className="ml-4">
              {decryptedTOTP[row.original.id] ? (
                <TOTPDisplay secret={decryptedTOTP[row.original.id]} />
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      const secret = await decryptData(row.original.encrypted_totp_secret, row.original.totp_iv, row.original.totp_salt, masterPassword)
                      setDecryptedTOTP(prev => ({ ...prev, [row.original.id]: secret }))
                    } catch(e) { toast.error('Failed to decrypt TOTP'); }
                  }}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Show TOTP
                </button>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={async () => {
              try {
                const decrypted = await decryptData(row.original.encrypted_password, row.original.iv, row.original.salt, masterPassword);
                copyToClipboard(decrypted, 'Password');
              } catch(e) { toast.error('Failed to decrypt'); }
            }} 
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900"
            title="Copy Password"
          >
            <Copy size={16} />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => handleOpenEdit(row.original)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
            title="Edit"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      ),
      size: 120
    }
  ], [decryptedPasswords, masterPassword])

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            My Vault
            <ShieldCheck size={24} className="ml-3 text-blue-600" />
          </h2>
          <p className="text-slate-500 font-medium text-sm">Securely managing {data.length} credentials.</p>
        </div>

        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Fuzzy search vault (Cmd + K)..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-2xl shadow-xl shadow-slate-200 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* View Toggle & Stats */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">
          <span className="text-blue-600">All Items ({data.length})</span>
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Shared</span>
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Personal</span>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex items-center">
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
          >
            <List size={16} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Unlocking Vault...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div 
              key="list" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden"
            >
              {data.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                  <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-300">
                    <Key size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Your vault is empty</h3>
                  <p className="text-slate-500 max-w-xs mx-auto">Start by adding your first password to see it here.</p>
                  <button onClick={() => setShowAddModal(true)} className="text-blue-600 font-bold hover:underline">Add Password Now</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id} className="bg-slate-50/50 border-b border-slate-100">
                        {headerGroup.headers.map(header => (
                          <th key={header.id} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-5">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="grid" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {data.map(item => (
                <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Key size={24} />
                    </div>
                    <div className="flex space-x-1">
                      <button className={cn("p-2 rounded-lg", item.is_favorite ? "text-amber-400" : "text-slate-300")}><Star size={16} fill={item.is_favorite ? "currentColor" : "none"} /></button>
                    <button 
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 font-medium mb-4">{item.username}</p>

                  {item.encrypted_totp_secret && (
                    <div className="mb-4">
                      {decryptedTOTP[item.id] ? (
                        <TOTPDisplay secret={decryptedTOTP[item.id]} />
                      ) : (
                        <button 
                          onClick={async () => {
                            try {
                              const secret = await decryptData(item.encrypted_totp_secret, item.totp_iv, item.totp_salt, masterPassword)
                              setDecryptedTOTP(prev => ({ ...prev, [item.id]: secret }))
                            } catch(e) { toast.error('Failed to decrypt TOTP'); }
                          }}
                          className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                        >
                          Show Authenticator Code
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.category || 'General'}</span>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                      <button onClick={async () => {
                         try {
                           const decrypted = await decryptData(item.encrypted_password, item.iv, item.salt, masterPassword);
                           copyToClipboard(decrypted, 'Password');
                         } catch(e) { toast.error('Failed to decrypt'); }
                      }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900"><Copy size={16} /></button>
                      <button 
                        onClick={() => toggleShowPassword(item)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900"
                      >
                        {decryptedPasswords[item.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {decryptedPasswords[item.id] && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Revealed Password</p>
                      <p className="font-mono text-blue-900 break-all">{decryptedPasswords[item.id]}</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Add Credential Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {editingId ? 'Edit Password' : 'Add New Password'}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted</p>
                  </div>
                </div>
                <button 
                  onClick={resetForm}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCredential} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Name *</label>
                    <input 
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="e.g. Google Account"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / Email *</label>
                    <input 
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowGenerator(true)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Generate Strong Password
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">2FA / TOTP Secret (Optional)</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.totpSecret}
                      onChange={(e) => setFormData({...formData, totpSecret: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono uppercase"
                      placeholder="JBSWY3DPEHPK3PXP"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold ml-1 uppercase tracking-wider italic">Enter the secret key provided by the service to enable the built-in authenticator.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Description / Notes (Optional)</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[100px] resize-none"
                    placeholder="Add extra details here..."
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-4 rounded-xl font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest text-xs"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <span>Save to Vault</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Generator Modal */}
      <PasswordGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onUse={(pwd) => setFormData(f => ({ ...f, password: pwd }))}
      />

      {/* Lock Indicator */}
      <div className="flex items-center justify-center pt-10">
        <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest shadow-sm">
          <Lock size={12} className="text-emerald-500" />
          <span>AES-256 Vault Locked to this browser</span>
        </div>
      </div>
    </div>
  )
}
