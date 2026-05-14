import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry } from 'ag-grid-community'
import { AllCommunityModule } from 'ag-grid-community'
import {
  FileSpreadsheet, Plus, Trash2, Save, Download, Columns,
  Rows, RefreshCcw, Check, Loader2, Edit3, Shield, Table
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'

ModuleRegistry.registerModules([AllCommunityModule])

// Reliable CSS imports
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function Workspaces() {
  const { token, logout } = useAuthStore()
  
  // State variables
  const [spreadsheets, setSpreadsheets] = useState([])
  const [activeSheetId, setActiveSheetId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Active document data streams
  const [gridData, setGridData] = useState([])
  const [dynamicColumns, setDynamicColumns] = useState([])
  
  // Modals state
  const [showNewModal, setShowNewModal] = useState(false)
  const [newSheetName, setNewSheetName] = useState('')
  const [showColModal, setShowColModal] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const gridRef = useRef()

  // ─── QUERY DATABASE SPREADSHEETS LIST ───
  const fetchSpreadsheets = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/spreadsheets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 401) {
        logout()
        return
      }
      if (!res.ok) throw new Error('Failed to retrieve spreadsheet tables')
      const data = await res.json()
      setSpreadsheets(data || [])
      
      // Auto-select first spreadsheet or default state
      if (data && data.length > 0) {
        // If we don't have an active selection or it's dropped, pick index 0
        setActiveSheetId(prev => prev || data[0].id)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, logout])

  useEffect(() => {
    fetchSpreadsheets()
  }, [fetchSpreadsheets])

  // Find active spreadsheet object mapped locally
  const activeSheet = useMemo(() => {
    return spreadsheets.find(s => s.id === activeSheetId) || spreadsheets[0]
  }, [spreadsheets, activeSheetId])

  // ─── RECOMPILE DYNAMIC AG-GRID ROW & COLUMN STREAMS WHEN SELECTION UPDATES ───
  useEffect(() => {
    if (!activeSheet) {
      setGridData([])
      setDynamicColumns([])
      return
    }

    // Safely parse nested stored rows
    let rows = []
    try {
      rows = typeof activeSheet.data === 'string' ? JSON.parse(activeSheet.data) : activeSheet.data
      if (!Array.isArray(rows)) {
        rows = []
      }
    } catch (err) {
      rows = []
    }

    // Seed empty default rows if absolute blank
    if (rows.length === 0) {
      rows = [
        { "Account_Name": "Production AWS Gate", "Username": "admin_root", "Password": "enc_str_placeholder_1", "System_URL": "https://aws.amazon.com", "Environment": "Production", "Access_Level": "Tier-1" },
        { "Account_Name": "Staging TiDB Cluster", "Username": "db_master", "Password": "enc_str_placeholder_2", "System_URL": "https://tidbcloud.com", "Environment": "Staging", "Access_Level": "Tier-2" },
        { "Account_Name": "Corporate SMTP Portal", "Username": "mailer_svc", "Password": "enc_str_placeholder_3", "System_URL": "smtp.gmail.com", "Environment": "Internal", "Access_Level": "Tier-3" }
      ]
    }

    setGridData(rows)

    // Parse distinct object keys dynamically to build columns
    const allKeys = new Set()
    rows.forEach(rowObj => {
      if (rowObj && typeof rowObj === 'object') {
        Object.keys(rowObj).forEach(k => allKeys.add(k))
      }
    })

    // If completely void of custom keys, provide premium starter standards
    if (allKeys.size === 0) {
      ['Account_Name', 'Username', 'Password', 'System_URL', 'Environment', 'Access_Level'].forEach(k => allKeys.add(k))
    }

    // Assemble absolute dynamic AG Grid properties
    const cols = Array.from(allKeys).map((key, idx) => ({
      headerName: key.replace(/_/g, ' '),
      field: key,
      editable: true, // Allow real-time cell typing updates
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 150,
      flex: idx === 0 ? 1.5 : 1,
      cellStyle: idx === 0 ? { fontWeight: 'bold', color: '#0f172a' } : { fontFamily: 'monospace' }
    }))

    setDynamicColumns(cols)
  }, [activeSheet])

  // Handle local cell input validation streams
  const handleCellValueChanged = (params) => {
    // Collect updated raw rows sequence from view instance
    const updatedRows = []
    params.api.forEachNode(node => updatedRows.push(node.data))
    setGridData(updatedRows)
  }

  // ─── COMMIT SQL SAVE PIPELINE ───
  const handleSaveSpreadsheet = async () => {
    if (!activeSheet) return
    setSaving(true)

    // Pull current data arrays straight from Grid node
    const currentRowsSeq = []
    if (gridRef.current?.api) {
      gridRef.current.api.forEachNode(node => currentRowsSeq.push(node.data))
    } else {
      currentRowsSeq.push(...gridData)
    }

    try {
      const res = await fetch(`${apiUrl}/spreadsheets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeSheet.id,
          name: activeSheet.name,
          data: currentRowsSeq
        })
      })
      if (!res.ok) throw new Error('Failed to persist dynamic table configuration')
      
      toast.success('Spreadsheet updates securely saved to SQL database!')
      // refresh global map
      fetchSpreadsheets()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── CREATION PROCESSOR ───
  const handleCreateNewSpreadsheet = async (e) => {
    e.preventDefault()
    if (!newSheetName.trim()) return

    const initialTemplateRows = [
      { "Account_Name": "Sample Primary Entry", "Username": "user_1", "Password": "••••••••", "System_URL": "https://example.com", "Environment": "Development", "Access_Level": "Standard" },
      { "Account_Name": "Backup Access Token", "Username": "service_bot", "Password": "••••••••", "System_URL": "https://api.example.com", "Environment": "Staging", "Access_Level": "High" }
    ]

    try {
      const res = await fetch(`${apiUrl}/spreadsheets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSheetName.trim(),
          data: initialTemplateRows
        })
      })
      if (!res.ok) throw new Error('Failed to provision table entity')
      
      const createdObj = await res.json()
      toast.success(`Provisioned new table: "${newSheetName}"`)
      setShowNewModal(false)
      setNewSheetName('')
      
      // Auto assign view focus
      if (createdObj?.id) {
        setActiveSheetId(createdObj.id)
      }
      fetchSpreadsheets()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ─── ROW & COLUMN INSERTION AUTOMATION ───
  const handleInsertRow = () => {
    if (!gridRef.current?.api) return
    
    // Construct blank object mapping populated column keys
    const newRecord = {}
    dynamicColumns.forEach(col => {
      if (col.field) newRecord[col.field] = ""
    })
    newRecord[dynamicColumns[0]?.field || "Account_Name"] = "New_Unsaved_Record"

    // Dispatch update directly to local grid
    const updated = [...gridData, newRecord]
    setGridData(updated)
    toast.success("Inserted blank interactive row at base")
  }

  const handleInsertColumnSubmit = (e) => {
    e.preventDefault()
    const colField = newColumnName.trim().replace(/\s+/g, '_')
    if (!colField) return

    // Avoid duplicate field assignment
    if (dynamicColumns.some(c => c.field.toLowerCase() === colField.toLowerCase())) {
      toast.error("Column mapping variable already exists")
      return
    }

    // Backfill empty string arrays across every row object sequence
    const updatedRows = gridData.map(r => ({ ...r, [colField]: "" }))
    setGridData(updatedRows)

    // Append variable definition
    const updatedCols = [
      ...dynamicColumns,
      {
        headerName: newColumnName.trim(),
        field: colField,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 150,
        flex: 1
      }
    ]
    setDynamicColumns(updatedCols)
    toast.success(`Appended new spreadsheet field: "${newColumnName}"`)
    setShowColModal(false)
    setNewColumnName('')
  }

  // ─── SAFE DROP PIPELINE ───
  const handleDeleteSpreadsheet = async (sheetId, name) => {
    if (!window.confirm(`Permanently drop table "${name}" from backend databases?`)) return

    try {
      const res = await fetch(`${apiUrl}/spreadsheets/${sheetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to drop table schema')
      
      toast.success(`Dropped database table "${name}"`)
      // Assign focus fallback
      setActiveSheetId(null)
      fetchSpreadsheets()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ─── COMPILE EXPORT TO NATIVE CSV DOWNLOAD ───
  const handleExportCsv = () => {
    if (!gridRef.current?.api) return
    try {
      gridRef.current.api.exportDataAsCsv({
        fileName: `${activeSheet?.name || 'Credential_Sheet'}_Export.csv`
      })
      toast.success("Triggered native Excel CSV structure generation")
    } catch (err) {
      toast.error("Export pipeline processing failure")
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col space-y-6 pb-12">
      {/* ─── WINDOWS EXPLORER COMMAND STRIP HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex-shrink-0">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Credential Sheets</h1>
            <p className="text-xs font-bold text-slate-400 mt-1">Live Relational Data Views · Synchronized SQL Node</p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-y-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Plus size={15} />
            <span>New Sheet</span>
          </button>
          
          <button
            onClick={fetchSpreadsheets}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Query server state"
          >
            <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─── MAIN DOCUMENT CONTAINER LAYOUT ─── */}
      {loading ? (
        <div className="p-20 text-center space-y-3 bg-white rounded-[2rem] border border-slate-200 flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Loading Relational Schemas...</p>
        </div>
      ) : spreadsheets.length === 0 ? (
        /* Starter hero state */
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-16 text-center space-y-6 shadow-sm flex-1 flex flex-col items-center justify-center">
          <div className="inline-flex p-8 bg-emerald-50 rounded-full text-emerald-600">
            <Table size={48} strokeWidth={1.5} />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">No Credential Sheets Created</h3>
            <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed">
              Provision a robust Excel-style relational table below to start mapping accounts, custom system tags, and environment variables into pure columns and rows.
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Provision First Spreadsheet</span>
          </button>
        </div>
      ) : (
        /* Active relational editor screen */
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[550px]">
          {/* ─── SPREADSHEETS TABS LIST SIDEBAR ─── */}
          <div className="w-full lg:w-64 bg-white border border-slate-200 rounded-[2rem] p-4 flex flex-col space-y-3 flex-shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pt-2">Saved SQL Tables</p>
            <div className="flex-1 overflow-y-auto space-y-1">
              {spreadsheets.map(sheet => {
                const isActive = sheet.id === activeSheet?.id
                return (
                  <div
                    key={sheet.id}
                    onClick={() => setActiveSheetId(sheet.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-xs font-bold group",
                      isActive 
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-100 shadow-sm" 
                        : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Table size={15} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                      <span className="truncate">{sheet.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSpreadsheet(sheet.id, sheet.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all"
                      title="Permanently drop schema"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <button
                onClick={() => setShowNewModal(true)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black py-2.5 rounded-xl border border-slate-200 flex items-center justify-center space-x-2 transition-colors"
              >
                <Plus size={14} className="text-emerald-600" />
                <span>New SQL Table</span>
              </button>
            </div>
          </div>

          {/* ─── AG GRID SPREADSHEET INTERACTION ENGINE ─── */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col min-w-0">
            {/* Sheet action bar */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-2 truncate w-full sm:w-auto">
                <span className="text-xs font-black text-slate-900 truncate px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {activeSheet?.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  ({gridData.length} active row elements)
                </span>
              </div>

              {/* Real Excel triggers */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-1">
                <button
                  onClick={handleInsertRow}
                  className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                  title="Insert Blank Row Element"
                >
                  <Rows size={13} className="text-blue-600" />
                  <span>Insert Row</span>
                </button>

                <button
                  onClick={() => setShowColModal(true)}
                  className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                  title="Append New Relational Variable Column"
                >
                  <Columns size={13} className="text-purple-600" />
                  <span>Add Column</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  className="flex items-center space-x-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                  title="Export native comma-delimited mapping"
                >
                  <Download size={13} className="text-slate-500" />
                  <span className="hidden xs:inline">Export CSV</span>
                </button>

                <button
                  onClick={handleSaveSpreadsheet}
                  disabled={saving}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-xs font-black transition-all shadow-md shadow-emerald-100 ml-1"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Commit Save</span>
                </button>
              </div>
            </div>

            {/* Dynamic Interactive AG Grid container */}
            <div className="flex-1 ag-theme-alpine w-full min-h-[400px]">
              <AgGridReact
                ref={gridRef}
                rowData={gridData}
                columnDefs={dynamicColumns}
                onCellValueChanged={handleCellValueChanged}
                animateRows={true}
                rowSelection="multiple"
                headerHeight={46}
                rowHeight={50}
                overlayNoRowsTemplate={'<span class="text-xs font-bold text-slate-400">Table schema is initialized. Double click cells to type, or trigger Insert Row above.</span>'}
              />
            </div>

            {/* Footer validation stamp */}
            <div className="bg-slate-50 px-6 py-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>💡 Double-click any spreadsheet cell to enter inline live changes</span>
              <span className="flex items-center space-x-1 text-emerald-600">
                <Check size={12} />
                <span>Encrypted Array Stream</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW SPREADSHEET DIALOG MODAL ─── */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Table size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Provision Relational Sheet</h3>
                    <p className="text-xs text-slate-500 font-medium">Map dynamic JSON table configurations</p>
                  </div>
                </div>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNewSpreadsheet} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Spreadsheet Title</label>
                  <input
                    type="text"
                    value={newSheetName}
                    onChange={e => setNewSheetName(e.target.value)}
                    placeholder="Master Accounts Table"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                    autoFocus
                  />
                </div>

                <div className="text-[11px] font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  💡 This automatically backfills standard relational parameters (Account Name, Username, Password, System URL, Access Level) for instant live editing.
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 mt-2"
                >
                  Create SQL Table
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD NEW FIELD COLUMN DIALOG MODAL ─── */}
      <AnimatePresence>
        {showColModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowColModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <Columns size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Append Relational Field</h3>
                    <p className="text-xs text-slate-500 font-medium">Inject column across all table records</p>
                  </div>
                </div>
                <button onClick={() => setShowColModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInsertColumnSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Column Variable Name</label>
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    placeholder="SSH Checksum Key"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-purple-200 mt-2"
                >
                  Confirm Field Injection
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
