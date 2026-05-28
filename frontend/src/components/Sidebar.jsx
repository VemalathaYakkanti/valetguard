import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Shield,
  LayoutGrid,
  Star,
  Folder,
  Hash,
  Trash2,
  Settings,
  LogOut,
  Plus,
  FileSpreadsheet,
  Share2,
  History,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'

const SidebarItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group font-semibold text-sm',
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )
    }
  >
    <div className="flex items-center space-x-3 truncate">
      <Icon size={18} className="transition-transform group-hover:scale-110 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </div>
    {badge && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{badge}</span>}
  </NavLink>
)

export default function Sidebar() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  // Storage key for custom folders added by user
  const [customFolders, setCustomFolders] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('vg_custom_folders')
    if (saved) {
      try {
        setCustomFolders(JSON.parse(saved))
      } catch {
        setCustomFolders([])
      }
    }
  }, [])

  const handleAddFolder = () => {
    const name = window.prompt('Enter new folder name:')
    if (!name || !name.trim()) return

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
    if (!slug) return

    // Avoid duplicates
    if (customFolders.some(f => f.slug === slug) || ['work', 'personal', 'banking'].includes(slug)) {
      window.alert('A folder with this name already exists.')
      return
    }

    const newFolderObj = { id: 'cf_' + Date.now(), name: name.trim(), slug }
    const updated = [...customFolders, newFolderObj]
    setCustomFolders(updated)
    localStorage.setItem('vg_custom_folders', JSON.stringify(updated))

    // Automatically navigate to the newly created folder
    navigate(`/folder/${slug}`)
  }

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen overflow-hidden sticky top-0 flex-shrink-0">
      {/* Brand */}
      <div className="p-8 pb-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">VaultGuard</span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Enterprise</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-7 scrollbar-hide">
        {/* Main Items */}
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-2">Vault</p>
          <SidebarItem to="/vault" icon={LayoutGrid} label="All Credentials" />
          <SidebarItem to="/spreadsheets" icon={FileSpreadsheet} label="Credential Sheets" />
          <SidebarItem to="/favorites" icon={Star} label="Favorites" />
          <SidebarItem to="/trash" icon={Trash2} label="Trash" />
        </div>

        {/* Sharing */}
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-2">Collaboration</p>
          <SidebarItem to="/share-access" icon={Share2} label="Share Access" />
          <SidebarItem to="/employees" icon={Users} label="Employee List" />
          <SidebarItem to="/activity" icon={History} label="Activity Log" />
        </div>

        {/* Folders */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Folders</span>
            <button
              onClick={handleAddFolder}
              className="text-slate-400 hover:text-blue-600 transition-colors p-1"
              title="Add New Folder"
            >
              <Plus size={14} />
            </button>
          </div>
          <SidebarItem to="/folder/work" icon={Folder} label="Work" />
          <SidebarItem to="/folder/personal" icon={Folder} label="Personal" />
          <SidebarItem to="/folder/banking" icon={Folder} label="Banking" />
          
          {/* Custom user folders rendered */}
          {customFolders.map(folder => (
            <SidebarItem
              key={folder.id}
              to={`/folder/${folder.slug}`}
              icon={Folder}
              label={folder.name}
            />
          ))}
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tags</span>
          </div>
          <div className="px-3 flex flex-wrap gap-2">
            {['Azure', 'High Priority', 'Client Data'].map(tag => (
              <span key={tag} className="flex items-center px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 cursor-pointer transition-all">
                <Hash size={10} className="mr-1" />{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-100 space-y-4">
        <NavLink
          to="/settings"
          className="flex items-center space-x-3 px-4 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all font-semibold text-sm"
        >
          <Settings size={18} />
          <span>Security Settings</span>
        </NavLink>

        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm flex-shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-[12px] font-bold text-slate-900 truncate">{user?.email?.split('@')[0]}</p>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest truncate">2FA Active</p>
              </div>
            </div>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
