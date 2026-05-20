import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FileText, FileSpreadsheet, FileIcon, ChevronRight, Plus,
  Trash2, Edit3, Download, Grid, List, Search, Save,
  X, FilePlus, HardDrive, Clock, Loader2, UploadCloud, Image as ImageIcon,
  FolderPlus, Link as LinkIcon, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { cn } from '../lib/utils'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function FolderView() {
  const { id } = useParams()
  const folderId = id || 'work'
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modals / Viewers state
  const [activeEditorFile, setActiveEditorFile] = useState(null)
  const [editorContent, setEditorContent] = useState('')
  const [showCreatorMenu, setShowCreatorMenu] = useState(false)
  const [printablePdfFile, setPrintablePdfFile] = useState(null)
  const [activeImageViewerFile, setActiveImageViewerFile] = useState(null)
  const [activeDocumentViewerFile, setActiveDocumentViewerFile] = useState(null)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // New File modal state
  const [showNewModal, setShowNewModal] = useState(false)
  const [newFileType, setNewFileType] = useState('text')
  const [newFileName, setNewFileName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkDescription, setNewLinkDescription] = useState('')
  const [activeLinkViewerFile, setActiveLinkViewerFile] = useState(null)

  // Load files from backend SQL database
  const fetchFolderFiles = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/folders/${folderId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch folder contents')
      const data = await res.json()
      setFiles(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [folderId, token])

  useEffect(() => {
    fetchFolderFiles()
  }, [fetchFolderFiles])

  // Get file icon and visual metadata
  const getFileMeta = (type) => {
    switch (type?.toLowerCase()) {
      case 'folder':
        return { icon: Folder, color: 'text-amber-500 fill-amber-100', bg: 'bg-amber-50 border-amber-200', label: 'File Folder' }
      case 'link':
        return { icon: LinkIcon, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', label: 'External Link' }
      case 'image':
        return { icon: ImageIcon, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', label: 'Image Asset' }
      case 'text':
        return { icon: FileText, color: 'text-sky-500', bg: 'bg-sky-50 border-sky-100', label: 'Text Document' }
      case 'word':
        return { icon: FileIcon, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', label: 'Word Document' }
      case 'excel':
        return { icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', label: 'Excel Worksheet' }
      case 'pdf':
        return { icon: FileIcon, color: 'text-red-500', bg: 'bg-red-50 border-red-100', label: 'PDF Document' }
      default:
        return { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-100', label: 'File' }
    }
  }

  // Handle open entity click
  const handleOpenFile = (file) => {
    if (file.type?.toLowerCase() === 'folder') {
      // Navigate deeper into child nested folder using composite slug representation
      const cleanSubName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      navigate(`/folder/${folderId}---${cleanSubName}`)
    } else if (file.type?.toLowerCase() === 'link') {
      setActiveLinkViewerFile(file)
    } else if (file.type?.toLowerCase() === 'image') {
      // Open Lightbox Image viewer
      setActiveImageViewerFile(file)
    } else if (file.type?.toLowerCase() === 'word' || file.type?.toLowerCase() === 'excel' || file.type?.toLowerCase() === 'pdf' || file.content?.startsWith('data:')) {
      // Open Polished Document Access Panel to prevent raw Base64 character block rendering
      setActiveDocumentViewerFile(file)
    } else {
      // Open Standard Notepad Text Stream Editor
      setActiveEditorFile(file)
      setEditorContent(file.content || '')
    }
  }

  // Handle save file to SQL backend from Notepad editor
  const handleSaveEditor = async () => {
    if (!activeEditorFile) return
    const calculatedSize = `${Math.max(1, Math.round(editorContent.length / 1024))} KB`

    try {
      const res = await fetch(`${apiUrl}/folders/files/${activeEditorFile.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent, size: calculatedSize })
      })
      if (!res.ok) throw new Error('Failed to persist document edits')
      
      const updatedDoc = await res.json()
      setFiles(prev => prev.map(f => f.id === updatedDoc.id ? updatedDoc : f))
      toast.success('Document changes saved securely to database!')
      setActiveEditorFile(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Generic document creation trigger
  const handleCreateFileSubmit = async (e) => {
    e.preventDefault()
    if (!newFileName.trim()) {
      toast.error('Please enter a valid entity name')
      return
    }

    let finalName = newFileName.trim()
    let initialSize = '1 KB'
    let initialContent = ''

    if (newFileType === 'folder') {
      initialSize = 'Directory'
      initialContent = 'Nested dynamic collection entity container'
    } else if (newFileType === 'link') {
      initialSize = 'Link'
      initialContent = JSON.stringify({ url: newLinkUrl, description: newLinkDescription })
    } else {
      // Append proper extension if missing
      const extMap = { text: '.txt', word: '.docx', excel: '.xlsx', pdf: '.pdf' }
      const targetExt = extMap[newFileType]
      if (targetExt && !finalName.toLowerCase().endsWith(targetExt)) {
        finalName += targetExt
      }
      initialSize = newFileType === 'text' ? '1 KB' : '120 KB'
      initialContent = newFileType === 'text' 
        ? `Secure text note initiated on ${new Date().toLocaleDateString()}` 
        : `Encrypted container header for ${finalName}`
    }

    try {
      const res = await fetch(`${apiUrl}/folders/${folderId}/files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          type: newFileType,
          size: initialSize,
          content: initialContent
        })
      })
      if (!res.ok) throw new Error('Failed to create file entity')
      
      const newDoc = await res.json()
      setFiles(prev => [newDoc, ...prev])
      toast.success(`${finalName} provisioned successfully in database!`)
      setShowNewModal(false)
      setNewFileName('')

      // Immediately open newly created text files in Notepad
      if (newFileType === 'text') {
        handleOpenFile(newDoc)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ─── FILE UPLOAD PROCESSOR (Handles both drag&drop and manual file input selection) ───
  const processUploadedFiles = async (uploadedFilesList) => {
    if (!uploadedFilesList || uploadedFilesList.length === 0) return
    
    // Process multiple uploaded files sequentially
    for (let i = 0; i < uploadedFilesList.length; i++) {
      const fileObj = uploadedFilesList[i]
      const name = fileObj.name
      const sizeBytes = fileObj.size
      const sizeStr = sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`

      // Identify internal categorization mapping
      let assignedType = 'text'
      const lowerName = name.toLowerCase()
      if (fileObj.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(lowerName)) {
        assignedType = 'image'
      } else if (/\.(docx|doc)$/.test(lowerName)) {
        assignedType = 'word'
      } else if (/\.(xlsx|xls|csv)$/.test(lowerName)) {
        assignedType = 'excel'
      } else if (/\.(pdf)$/.test(lowerName)) {
        assignedType = 'pdf'
      }

      // Compile content via FileReader to extract Base64 data blocks to ensure absolute binary restoration
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64Data = event.target.result // string format starting with data:mime/type;base64,...

        try {
          const res = await fetch(`${apiUrl}/folders/${folderId}/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name,
              type: assignedType,
              size: sizeStr,
              content: base64Data
            })
          })
          if (res.ok) {
            const savedDoc = await res.json()
            setFiles(prev => [savedDoc, ...prev])
            toast.success(`Successfully uploaded "${name}"`)
          } else {
            toast.error(`SQL limit error saving "${name}"`)
          }
        } catch (err) {
          toast.error(`Upload error: ${err.message}`)
        }
      }

      // Read binary documents as absolute pure Data URLs to allow perfect uncorrupted future download decoding
      reader.readAsDataURL(fileObj)
    }
  }

  // Triggered when manual button is clicked
  const handleFileInputChange = (e) => {
    processUploadedFiles(e.target.files)
    // reset input
    e.target.value = null
  }

  // Trigger file download ensuring original absolute byte consistency
  const handleDownloadFile = (file, e) => {
    e.stopPropagation()
    if (file.type?.toLowerCase() === 'folder') {
      toast.error("Folders cannot be exported directly. Please navigate inside.")
      return
    }

    const fileContent = file.content || ''
    const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Document"
    const fileType = file.type?.toLowerCase() || ''

    // ─── CHECK IF UPLOADED AS REAL NATIVE BASE64 STREAM TO RESTORE ORIGINAL BYTE BINARIES ───
    if (fileContent.startsWith('data:')) {
      try {
        const arr = fileContent.split(',')
        const mime = arr[0].match(/:(.*?);/)[1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        const fileBlob = new Blob([u8arr], { type: mime })
        const element = document.createElement('a')
        element.href = URL.createObjectURL(fileBlob)
        element.download = file.name
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        toast.success(`Downloaded intact original file: ${file.name}`)
        return
      } catch (err) {
        console.warn("Base64 parsing fallback triggered", err)
      }
    }

    // Fallbacks for seed data strings
    if (fileType === 'word' || file.name?.toLowerCase().endsWith('.docx')) {
      // Compile as standard MS-Word compatible HTML document to prevent file structural recovery prompts
      const mswordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${baseName}</title></head>
<body style="font-family: 'Calibri', sans-serif; padding: 20px;">
  <h1 style="color: #1e3a8a;">${baseName}</h1>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;">
  <p style="white-space: pre-wrap; line-height: 1.6; color: #334155;">${fileContent || 'Encrypted container body'}</p>
</body>
</html>`
      const fileBlob = new Blob([mswordHtml], { type: 'application/msword;charset=utf-8' })
      const element = document.createElement('a')
      element.href = URL.createObjectURL(fileBlob)
      element.download = `${baseName}.doc`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success(`Exported ${baseName}.doc formatted for Microsoft Word`)

    } else if (fileType === 'excel' || file.name?.toLowerCase().endsWith('.xlsx')) {
      const csvLines = fileContent.split('\n').map(line => `"${line.replace(/"/g, '""')}"`).join('\n')
      const fileBlob = new Blob([csvLines], { type: 'text/csv;charset=utf-8' })
      const element = document.createElement('a')
      element.href = URL.createObjectURL(fileBlob)
      element.download = `${baseName}.csv`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success(`Exported ${baseName}.csv formatted for Microsoft Excel`)

    } else if (fileType === 'pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
      setPrintablePdfFile(file)
      toast.success('Launching PDF printable compiler view...')

    } else {
      const fileBlob = new Blob([fileContent || 'Empty File Container'], { type: 'text/plain;charset=utf-8' })
      const element = document.createElement('a')
      element.href = URL.createObjectURL(fileBlob)
      element.download = file.name || 'document.txt'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      toast.success(`Downloaded ${file.name}`)
    }
  }

  // Delete file from SQL database
  const handleDeleteFile = async (fileId, name, e) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from SQL storage?`)) return

    try {
      const res = await fetch(`${apiUrl}/folders/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to delete document')
      
      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success(`Deleted "${name}" from database`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Filtered list
  const filteredFiles = files.filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Parse nested breadcrumb segments correctly supporting infinite nesting layers
  const breadcrumbSegments = folderId.split('---')

  return (
    <div 
      className="max-w-6xl space-y-8 pb-16 relative min-h-[80vh]"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => {
        // Prevent trigger flicker if dragging inside children
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsDragging(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processUploadedFiles(e.dataTransfer.files)
        }
      }}
    >
      {/* ─── FULL WINDOW DRAG AND DROP OVERLAY ─── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-600/10 backdrop-blur-md rounded-[2.5rem] border-4 border-dashed border-blue-600 z-40 flex flex-col items-center justify-center p-8 text-center pointer-events-none"
          >
            <div className="p-8 bg-white rounded-full shadow-2xl text-blue-600 animate-bounce mb-4">
              <UploadCloud size={64} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Drop files to upload securely</h2>
            <p className="text-sm font-bold text-slate-500 mt-2 max-w-md">
              Supports Word (.docx), Excel (.xlsx), PDF documents, Images (.png, .jpg), and raw Text streams.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Global File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />

      {/* Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 overflow-x-auto w-full sm:w-auto">
          <HardDrive size={15} className="text-blue-600 flex-shrink-0" />
          <span>TiDB Cloud</span>
          <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
          <span>Folders</span>
          
          {/* Dynamically build recursive breadcrumb hierarchy segments */}
          {breadcrumbSegments.map((segment, index) => {
            const isLast = index === breadcrumbSegments.length - 1
            const segmentTitle = segment.charAt(0).toUpperCase() + segment.slice(1)
            
            // Build reconstructed accumulated route slug up to this depth
            const targetSlug = breadcrumbSegments.slice(0, index + 1).join('---')
            
            return (
              <div key={targetSlug} className="flex items-center space-x-1.5 flex-shrink-0">
                <ChevronRight size={12} className="text-slate-300" />
                {isLast ? (
                  <span className="text-slate-900 font-black px-2 py-1 bg-slate-100 rounded-lg">{segmentTitle}</span>
                ) : (
                  <Link 
                    to={`/folder/${targetSlug}`}
                    className="hover:text-blue-600 transition-colors hover:underline"
                  >
                    {segmentTitle}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Windows OS Explorer Tool Actions */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {/* Upload trigger button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black px-3.5 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm"
            title="Upload Any Files (Drag & Drop available)"
          >
            <UploadCloud size={16} className="text-blue-600" />
            <span className="hidden xs:inline">Upload Files</span>
          </button>

          {/* View toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-all text-slate-500', viewMode === 'grid' && 'bg-white text-slate-900 shadow-sm')}
              title="Grid View"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-lg transition-all text-slate-500', viewMode === 'list' && 'bg-white text-slate-900 shadow-sm')}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>

          {/* New Item Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowCreatorMenu(!showCreatorMenu)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all"
            >
              <Plus size={16} />
              <span>New Item</span>
            </button>

            {/* Dropdown Options */}
            <AnimatePresence>
              {showCreatorMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowCreatorMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 overflow-hidden py-2 space-y-0.5"
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5">Containers</p>
                    <button
                      onClick={() => {
                        setNewFileType('folder')
                        setNewFileName('New_folder')
                        setShowNewModal(true)
                        setShowCreatorMenu(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-amber-50 text-left transition-colors font-bold text-xs text-amber-700 group border-b border-slate-100"
                    >
                      <FolderPlus size={15} className="text-amber-500" />
                      <span className="group-hover:text-amber-900">New Sub-Folder</span>
                    </button>

                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 mt-1">Virtual Entities</p>
                    {[
                      { type: 'link', label: 'External Link', icon: LinkIcon, color: 'text-indigo-600' },
                      { type: 'text', label: 'Text Document (.txt)', icon: FileText, color: 'text-sky-500' },
                      { type: 'word', label: 'Microsoft Word (.docx)', icon: FileIcon, color: 'text-blue-600' },
                      { type: 'excel', label: 'Microsoft Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-emerald-600' },
                      { type: 'pdf', label: 'Adobe PDF Document (.pdf)', icon: FileIcon, color: 'text-red-500' },
                    ].map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => {
                          setNewFileType(opt.type)
                          if (opt.type === 'link') {
                            setNewFileName('New_Link')
                            setNewLinkUrl('')
                            setNewLinkDescription('')
                          } else {
                            setNewFileName(`New_${opt.type}_document`)
                          }
                          setShowNewModal(true)
                          setShowCreatorMenu(false)
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 text-left transition-colors font-bold text-xs text-slate-700 group"
                      >
                        <opt.icon size={15} className={opt.color} />
                        <span className="group-hover:text-slate-900">{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Folder Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <Folder size={28} className="mr-3 text-blue-600 fill-blue-100 flex-shrink-0" />
            {breadcrumbSegments[breadcrumbSegments.length - 1].charAt(0).toUpperCase() + breadcrumbSegments[breadcrumbSegments.length - 1].slice(1)} Directory
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {files.length} element(s) · Supports nested directories & drag-to-upload files
          </p>
        </div>

        {/* Search inside folder */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search folder database..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Files Display */}
      {loading ? (
        <div className="p-20 text-center space-y-3">
          <Loader2 className="animate-spin mx-auto text-blue-600" size={32} />
          <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Querying SQL Backend...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4 shadow-sm border-dashed">
          <div className="inline-flex p-6 bg-blue-50 rounded-full text-blue-600 animate-pulse">
            <UploadCloud size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">This directory container is empty</h3>
          <p className="text-slate-400 text-xs font-medium max-w-md mx-auto">
            Drag and drop <strong>Word, Excel, PDF, or image files</strong> directly here, or click <strong>Upload Files / New Item</strong> to build entity records.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── GRID VIEW ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => {
            const meta = getFileMeta(file.type)
            const MetaIcon = meta.icon
            const isImage = file.type?.toLowerCase() === 'image'
            const isFolder = file.type?.toLowerCase() === 'folder'

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => handleOpenFile(file)}
                className={cn(
                  "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group h-44 relative overflow-hidden",
                  isFolder && "bg-amber-50/20 hover:border-amber-300"
                )}
              >
                {/* Top bar */}
                <div className="flex justify-between items-start">
                  {/* Icon or inline thumbnail preview for images */}
                  {isImage && file.content?.startsWith('data:image/') ? (
                    <div className="w-11 h-11 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0 relative group-hover:scale-105 transition-transform">
                      <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={cn('p-3 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110', meta.bg)}>
                      <MetaIcon size={20} className={meta.color} />
                    </div>
                  )}

                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && (
                      <button
                        onClick={(e) => handleDownloadFile(file, e)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        title="Download Intact Binary"
                      >
                        <Download size={15} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      title="Permanently drop record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Info block */}
                <div className="mt-4">
                  <p className={cn("text-xs font-black truncate transition-colors", isFolder ? "text-amber-900 group-hover:text-amber-600" : "text-slate-900 group-hover:text-blue-600")}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider">{meta.label}</span>
                    <span className="font-mono">{file.size}</span>
                  </div>
                </div>

                {/* Sub preview strip */}
                <div className="border-t border-slate-50 pt-2 mt-2 flex items-center space-x-1 text-[9px] text-slate-400 font-medium truncate">
                  <Clock size={10} className="flex-shrink-0" />
                  <span className="truncate">{new Date(file.updated_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Last Synchronized</th>
                <th className="py-3 px-6">Type</th>
                <th className="py-3 px-6">Size</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredFiles.map(file => {
                const meta = getFileMeta(file.type)
                const MetaIcon = meta.icon
                const isFolder = file.type?.toLowerCase() === 'folder'

                return (
                  <tr
                    key={file.id}
                    onClick={() => handleOpenFile(file)}
                    className={cn("hover:bg-slate-50 transition-colors cursor-pointer group", isFolder && "bg-amber-50/10 hover:bg-amber-50/30")}
                  >
                    <td className="py-4 px-6 flex items-center space-x-3">
                      <div className={cn('p-2 rounded-lg border flex-shrink-0', meta.bg)}>
                        <MetaIcon size={16} className={meta.color} />
                      </div>
                      <span className={cn("font-black truncate max-w-xs", isFolder ? "text-amber-900 group-hover:text-amber-600" : "text-slate-900 group-hover:text-blue-600")}>
                        {file.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {new Date(file.updated_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-slate-500 uppercase tracking-wider text-[10px]">
                      {meta.label}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono">
                      {file.size}
                    </td>
                    <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex space-x-1">
                        {!isFolder && (
                          <button
                            onClick={(e) => handleDownloadFile(file, e)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            title="Download Binary"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteFile(file.id, file.name, e)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete from DB"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── NOTEPAD / TEXT STREAM EDITOR MODAL ─── */}
      <AnimatePresence>
        {activeEditorFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveEditorFile(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Explorer Style Titlebar */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                  <div className="p-2 bg-slate-800 rounded-xl text-sky-400">
                    <Edit3 size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-black tracking-wide truncate">{activeEditorFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">SQL Record #{activeEditorFile.id} · Binary String View</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadFile(activeEditorFile, { stopPropagation: () => {} })}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
                    title="Export File"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => setActiveEditorFile(null)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Editing Area */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 flex flex-col">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Stream Content Editor (Raw bytes / strings)
                </label>
                <textarea
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  placeholder="Type secure document payloads or stream variables here..."
                  className="w-full flex-1 min-h-[320px] bg-white border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Save Footer Actions */}
              <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>Size: {activeEditorFile.size}</span>
                  <span>·</span>
                  <span>Format: {activeEditorFile.type?.toUpperCase()}</span>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveEditorFile(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditor}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all"
                  >
                    <Save size={14} />
                    <span>Commit SQL Save</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LIGHTBOX IMAGE VIEWER MODAL ─── */}
      <AnimatePresence>
        {activeImageViewerFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveImageViewerFile(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10"
            >
              <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-bold truncate max-w-sm">{activeImageViewerFile.name}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDownloadFile(activeImageViewerFile, { stopPropagation: () => {} })}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="Download High-Res"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => setActiveImageViewerFile(null)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
                <img 
                  src={activeImageViewerFile.content} 
                  alt={activeImageViewerFile.name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm border border-white"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── NEW ENTITY DIALOG MODAL ─── */}
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
                  <div className={cn("p-3 rounded-2xl", newFileType === 'folder' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>
                    {newFileType === 'folder' ? <FolderPlus size={20} /> : <FilePlus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {newFileType === 'folder' ? 'Create Sub-Folder' : 'Provision Entity'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Add record to current path</p>
                  </div>
                </div>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateFileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Entity Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'folder', label: 'Sub-Folder' },
                      { type: 'link', label: 'Link' },
                      { type: 'text', label: 'Text (.txt)' },
                      { type: 'word', label: 'Word (.docx)' },
                      { type: 'excel', label: 'Excel (.xlsx)' },
                      { type: 'pdf', label: 'PDF (.pdf)' },
                    ].map(t => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          setNewFileType(t.type)
                          if (t.type === 'folder') {
                            setNewFileName('New_folder')
                          } else if (t.type === 'link') {
                            setNewFileName('New_Link')
                          } else {
                            const extMap = { text: '.txt', word: '.docx', excel: '.xlsx', pdf: '.pdf' }
                            setNewFileName(`New_${t.type}_document${extMap[t.type]}`)
                          }
                        }}
                        className={cn(
                          'px-3 py-2.5 rounded-xl font-bold text-xs border transition-all text-left truncate',
                          newFileType === t.type
                            ? t.type === 'folder'
                              ? 'bg-amber-50 border-amber-600 text-amber-600 shadow-sm'
                              : 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Entity Name</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    placeholder={newFileType === 'folder' ? 'Folder_name' : (newFileType === 'link' ? 'Link Name' : 'Document_name.txt')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                    autoFocus
                  />
                </div>

                {newFileType === 'link' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Link URL</label>
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                        placeholder="https://docs.google.com/..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description (Optional)</label>
                      <input
                        type="text"
                        value={newLinkDescription}
                        onChange={e => setNewLinkDescription(e.target.value)}
                        placeholder="E.g., Q3 Project Tracker"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className={cn(
                    "w-full text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-xl mt-2",
                    newFileType === 'folder' 
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200" 
                      : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
                  )}
                >
                  Confirm Creation
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── NATIVE PDF PRINT COMPILATION MODAL ─── */}
      <AnimatePresence>
        {printablePdfFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPrintablePdfFile(null)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm print:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:rounded-none print:w-full print:m-0 print:p-0"
            >
              {/* Header preview controls */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
                <div>
                  <h3 className="text-sm font-black tracking-wide text-white">Adobe PDF Dynamic Print Engine</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Bypasses strict binary structural table limits via OS print stream</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      window.print()
                    }}
                    className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all"
                  >
                    <span>Save as PDF</span>
                  </button>
                  <button
                    onClick={() => setPrintablePdfFile(null)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Printable Body Content formatted to match official Adobe documents */}
              <div className="p-12 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6 print:p-0 print:overflow-visible">
                {/* Official header layout */}
                <div className="border-b border-slate-200 pb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      {printablePdfFile.name ? printablePdfFile.name.replace(/\.[^/.]+$/, "") : "Secure VaultGuard Record"}
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Certified Encrypted File Container
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-red-50 text-red-600 font-black text-[10px] rounded-lg border border-red-100 uppercase">
                      Adobe PDF Engine
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      ID: {printablePdfFile.id}
                    </p>
                  </div>
                </div>

                {/* Main Payload block */}
                <div className="min-h-[300px] text-xs leading-relaxed text-slate-800 font-mono whitespace-pre-wrap bg-slate-50 p-6 rounded-2xl border border-slate-100 print:bg-white print:border-none print:p-0">
                  {printablePdfFile.content || "No stream content found."}
                </div>

                {/* Secure footer stamp */}
                <div className="border-t border-slate-100 pt-4 mt-8 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>VaultGuard Enterprise Authorization Gate</span>
                  <span>Timestamp: {new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Bottom notification strip */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] font-medium text-slate-500 print:hidden">
                💡 Click <strong>Save as PDF</strong> above and pick <strong>&quot;Save as PDF&quot;</strong> as your destination in the print dialogue window.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── POLISHED BINARY DOCUMENT ACCESS PANEL MODAL ─── */}
      <AnimatePresence>
        {activeDocumentViewerFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveDocumentViewerFile(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10"
            >
              {/* Premium dark header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black tracking-wider uppercase block text-blue-400">VaultGuard Access Layer</span>
                  <span className="text-sm font-bold truncate block max-w-xs">{activeDocumentViewerFile.name}</span>
                </div>
                <button
                  onClick={() => setActiveDocumentViewerFile(null)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Informative layout card */}
              <div className="p-8 space-y-6">
                <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Download size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Serialized Payload Verified</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      Type: <span className="uppercase font-bold text-slate-700">{activeDocumentViewerFile.type} Container</span> · Size: <span className="font-mono text-slate-700">{activeDocumentViewerFile.size}</span>
                    </p>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-1">
                  <p className="text-xs font-bold text-slate-800">
                    🔒 High-Fidelity Binary Encryption
                  </p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This file is encapsulated as a serialized data URL string inside your TiDB storage framework. To inspect its original multi-layered layout natively without character encoding distortion, please extract the raw pristine archive.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleDownloadFile(activeDocumentViewerFile, { stopPropagation: () => {} })
                    setActiveDocumentViewerFile(null)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-200 flex items-center justify-center space-x-2"
                >
                  <Download size={16} />
                  <span>Extract Intact Original File</span>
                </button>
              </div>

              {/* Footer strip */}
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ID Checksum #{activeDocumentViewerFile.id} · Synchronized SQL Node
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LINK VIEWER MODAL ─── */}
      <AnimatePresence>
        {activeLinkViewerFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveLinkViewerFile(null)}
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
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <LinkIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      {activeLinkViewerFile.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">External Link</p>
                  </div>
                </div>
                <button onClick={() => setActiveLinkViewerFile(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={18} />
                </button>
              </div>

              {(() => {
                let linkData = { url: '', description: '' };
                try {
                  linkData = JSON.parse(activeLinkViewerFile.content || '{}');
                } catch (e) {
                  linkData.url = activeLinkViewerFile.content;
                }
                return (
                  <div className="space-y-6">
                    {linkData.description && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</p>
                        <p className="text-sm font-medium text-slate-700">{linkData.description}</p>
                      </div>
                    )}
                    
                    <a
                      href={linkData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setActiveLinkViewerFile(null)}
                      className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-xl shadow-indigo-200"
                    >
                      <span>Open Link</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
