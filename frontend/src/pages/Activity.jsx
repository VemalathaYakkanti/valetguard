import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  History, Activity as ActivityIcon, Shield, Clock, Search, 
  Key, Share2, LogIn, Lock, RefreshCw, Trash2, FileText, CheckCircle2 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function Activity() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL | SECURITY | CREDENTIALS | SHARING

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiUrl}/activity`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  // Helper to parse details column cleanly
  const parseDetails = (detailsStr) => {
    if (!detailsStr) return null;
    try {
      const parsed = JSON.parse(detailsStr);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([k, v]) => (
          <span key={k} className="inline-flex items-center space-x-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-600 mr-1.5 mt-1">
            <strong className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</strong>
            <span className="truncate max-w-[150px]">{String(v)}</span>
          </span>
        ));
      }
      return <span className="text-xs text-slate-500 font-medium block mt-0.5">{String(parsed)}</span>;
    } catch {
      return <span className="text-xs text-slate-500 font-medium block mt-0.5">{detailsStr}</span>;
    }
  };

  // Determine Icon and style based on action string
  const getActionMeta = (action) => {
    const upper = action?.toUpperCase() || '';
    if (upper.includes('LOGIN')) return { icon: LogIn, bg: 'bg-blue-50 border-blue-100 text-blue-600' };
    if (upper.includes('2FA') || upper.includes('MFA') || upper.includes('TOTP')) return { icon: Shield, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' };
    if (upper.includes('SHARE')) return { icon: Share2, bg: 'bg-indigo-50 border-indigo-100 text-indigo-600' };
    if (upper.includes('CREDENTIAL')) return { icon: Key, bg: 'bg-amber-50 border-amber-100 text-amber-600' };
    if (upper.includes('DELETE') || upper.includes('REVOKE')) return { icon: Trash2, bg: 'bg-red-50 border-red-100 text-red-600' };
    if (upper.includes('RESET')) return { icon: RefreshCw, bg: 'bg-violet-50 border-violet-100 text-violet-600' };
    return { icon: ActivityIcon, bg: 'bg-slate-50 border-slate-100 text-slate-600' };
  };

  // Filter logs based on category and search query
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const action = log.action?.toUpperCase() || '';
      const details = log.details?.toUpperCase() || '';
      const query = searchQuery.toUpperCase();

      // Search match
      const matchesSearch = action.includes(query) || details.includes(query);
      if (!matchesSearch) return false;

      // Category filter match
      if (selectedFilter === 'SECURITY') {
        return action.includes('LOGIN') || action.includes('2FA') || action.includes('TOTP') || action.includes('RESET');
      }
      if (selectedFilter === 'CREDENTIALS') {
        return action.includes('CREDENTIAL');
      }
      if (selectedFilter === 'SHARING') {
        return action.includes('SHARE');
      }
      return true;
    });
  }, [logs, searchQuery, selectedFilter]);

  // Statistics
  const stats = useMemo(() => {
    let securityCount = 0;
    let sharingCount = 0;
    let credCount = 0;

    logs.forEach(log => {
      const a = log.action?.toUpperCase() || '';
      if (a.includes('LOGIN') || a.includes('2FA') || a.includes('TOTP')) securityCount++;
      else if (a.includes('SHARE')) sharingCount++;
      else if (a.includes('CREDENTIAL')) credCount++;
    });

    return { total: logs.length, securityCount, sharingCount, credCount };
  }, [logs]);

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
          Activity History <History size={24} className="ml-3 text-blue-600" />
        </h2>
        <p className="text-slate-500 font-medium text-sm">
          Comprehensive, zero-knowledge metadata logs and workspace audit trails.
        </p>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', val: stats.total, color: 'text-slate-900' },
          { label: 'Security & Auth', val: stats.securityCount, color: 'text-emerald-600' },
          { label: 'Sharing Operations', val: stats.sharingCount, color: 'text-indigo-600' },
          { label: 'Vault Actions', val: stats.credCount, color: 'text-amber-600' },
        ].map((s, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{s.label}</span>
            <p className={cn('text-2xl font-black', s.color)}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Controls: Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl">
          {['ALL', 'SECURITY', 'CREDENTIALS', 'SHARING'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize',
                selectedFilter === cat 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {cat.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter logs by action or detail..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center space-y-3">
            <RefreshCw className="animate-spin mx-auto text-blue-600" size={32} />
            <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Loading audit trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-20 text-center space-y-3">
            <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-300">
              <FileText size={40} strokeWidth={1.5} />
            </div>
            <p className="font-black text-slate-800 text-base">No matching logs found</p>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              No events matched the selected category filter or search query.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log, index) => {
              const meta = getActionMeta(log.action);
              const MetaIcon = meta.icon;
              return (
                <motion.div 
                  key={log.id || index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50/70 transition-colors gap-3"
                >
                  <div className="flex items-start space-x-4 min-w-0">
                    <div className={cn('w-10 h-10 border rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
                      <MetaIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {log.action?.replace(/_/g, ' ')}
                        </h4>
                      </div>
                      <div className="mt-0.5">
                        {parseDetails(log.details)}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 flex-shrink-0">
                    <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock size={11} className="mr-1" />
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secured</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
