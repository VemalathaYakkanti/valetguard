import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Trash2, Edit2, Mail, Building2, User, Briefcase,
  CheckCircle2, X, Loader2, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* ─── Add/Edit Employee Modal ─── */
function EmployeeModal({ onClose, token, employee = null }) {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    company_name: employee?.company_name || '',
    role: employee?.role || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error('Name and Email are required.')
      return
    }

    setLoading(true)
    try {
      const url = employee ? `${apiUrl}/employees/${employee.id}` : `${apiUrl}/employees`
      const method = employee ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Operation failed')

      toast.success(employee ? 'Employee updated successfully!' : 'Employee added successfully!')
      onClose(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onClose(false)}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
              <User size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {employee ? 'Edit Employee' : 'Add Employee'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Enter employee details below.</p>
            </div>
          </div>
          <button onClick={() => onClose(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
              <User size={11} /> <span>Employee Name *</span>
            </label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
              <Mail size={11} /> <span>Email Address *</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              placeholder="jane@company.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
              <Building2 size={11} /> <span>Company Name</span>
            </label>
            <input
              value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              placeholder="Acme Corp"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
              <Briefcase size={11} /> <span>Role / Position</span>
            </label>
            <input
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              placeholder="Lead Engineer"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200 flex items-center space-x-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <span>Save Details</span>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ─── Employees Page ─── */
export default function Employees() {
  const { token } = useAuthStore()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load employee list.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee ${name}?`)) return
    try {
      const res = await fetch(`${apiUrl}/employees/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      toast.success(`${name} removed successfully!`)
      fetchEmployees()
    } catch {
      toast.error('Failed to delete employee.')
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    (emp.company_name && emp.company_name.toLowerCase().includes(search.toLowerCase())) ||
    (emp.role && emp.role.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-5xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
      >
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            Employee List <Users size={24} className="ml-3 text-blue-600" />
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Manage your team or client contacts. These contacts are automatically available when configuring sharing privileges.
          </p>
        </div>
        <button
          onClick={() => { setEditingEmployee(null); setShowModal(true) }}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-slate-200 transition-all text-sm"
        >
          <Plus size={18} />
          <span>Add Employee</span>
        </button>
      </motion.div>

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees by name, email, role..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm shadow-sm"
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center space-x-4 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Registered</span>
          <span className="text-2xl font-black text-slate-900">{employees.length}</span>
        </div>
      </div>

      {/* Employees Table/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading employee database...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-20 text-center space-y-4 shadow-sm">
          <div className="inline-flex p-8 bg-slate-50 rounded-3xl text-slate-200">
            <Users size={56} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No employees found</h3>
          <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto">
            Add contacts to your database or automatically seed them when you share folders or credentials.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Added</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                    <td className="p-6 text-sm text-slate-500 font-semibold">{emp.email}</td>
                    <td className="p-6 text-sm text-slate-600 font-bold">{emp.company_name || '—'}</td>
                    <td className="p-6">
                      {emp.role ? (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full uppercase tracking-widest">
                          {emp.role}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-6 text-xs text-slate-400 font-medium">
                      {new Date(emp.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => { setEditingEmployee(emp); setShowModal(true) }}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit details"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove employee"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <EmployeeModal
            onClose={(refresh) => { setShowModal(false); if (refresh) fetchEmployees() }}
            token={token}
            employee={editingEmployee}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
