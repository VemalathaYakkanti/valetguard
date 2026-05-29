import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, RefreshCw, Key, Folder, FileText, Loader2, Star, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import ConfirmModal from '../components/ConfirmModal'

export default function Trash() {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ credentials: [], folders: [], files: [] })
  const [activeTab, setActiveTab] = useState('credentials')
  const [purgingItem, setPurgingItem] = useState(null) // { type, id, name }

  const fetchTrash = useCallback(async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to load trash')
      const items = await res.json()
      setData(items)
    } catch (err) {
      toast.error(err.message || 'Could not load trash')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRestore = async (type, id, name) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/trash/restore/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Restore failed')
      toast.success(`"${name}" restored successfully`)
      fetchTrash()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handlePurge = async () => {
    if (!purgingItem) return
    const { type, id, name } = purgingItem
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${apiUrl}/trash/purge/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Purge failed')
      toast.success(`"${name}" deleted permanently`)
      fetchTrash()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPurgingItem(null)
    }
  }

  const activeCount = data[activeTab]?.length || 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            Trash
            <Trash2 size={22} className="ml-3 text-slate-400" />
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Restore recently deleted items or permanently purge them.
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'credentials', label: 'Credentials', icon: Key, count: data.credentials.length },
          { id: 'folders', label: 'Folders', icon: Folder, count: data.folders.length },
          { id: 'files', label: 'Documents & Files', icon: FileText, count: data.files.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-bold text-sm transition-all uppercase tracking-wider ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-black ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading trash...</p>
        </div>
      ) : activeCount === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-6 shadow-sm"
        >
          <div className="inline-flex p-8 bg-slate-50 rounded-3xl text-slate-200">
            <Trash2 size={56} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">No deleted {activeTab}</h3>
            <p className="text-slate-400 font-medium text-sm max-w-xs mx-auto">
              Items you delete in Vault or Folders will appear here for recovery.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activeTab === 'credentials' &&
            data.credentials.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 w-fit">
                    <Key size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{item.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold">{item.username}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-5 mt-5 border-t border-slate-50">
                  <button
                    onClick={() => handleRestore('credential', item.id, item.title)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Restore"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setPurgingItem({ type: 'credential', id: item.id, name: item.title })}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

          {activeTab === 'folders' &&
            data.folders.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-500 w-fit">
                    <Folder size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{item.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">/{item.slug}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-5 mt-5 border-t border-slate-50">
                  <button
                    onClick={() => handleRestore('folder', item.id, item.name)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Restore folder & contents"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setPurgingItem({ type: 'folder', id: item.id, name: item.name })}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                    title="Purge folder & contents permanently"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

          {activeTab === 'files' &&
            data.files.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div className="space-y-3">
                  <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl text-sky-500 w-fit">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight truncate">{item.name}</h3>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mt-1">
                      <span>Folder: {item.folder_slug}</span>
                      <span className="font-mono">{item.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-5 mt-5 border-t border-slate-50">
                  <button
                    onClick={() => handleRestore('file', item.id, item.name)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors"
                    title="Restore file"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setPurgingItem({ type: 'file', id: item.id, name: item.name })}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                    title="Purge file permanently"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
        </motion.div>
      )}

      <ConfirmModal
        isOpen={!!purgingItem}
        title="Permanently Delete Item"
        message={`Are you sure you want to permanently delete "${purgingItem?.name}"? This action is IRREVERSIBLE and cannot be undone.`}
        onConfirm={handlePurge}
        onCancel={() => setPurgingItem(null)}
        confirmText="Delete Permanently"
      />
    </div>
  )
}
