import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Register from './pages/Register'
import Vault from './pages/Vault'
import Settings from './pages/Settings'

import Activity from './pages/Activity'
import TwoFactorVerify from './pages/TwoFactorVerify'
import TwoFactorSetup from './pages/TwoFactorSetup'
import Favorites from './pages/Favorites'
import Trash from './pages/Trash'
import ShareAccess from './pages/ShareAccess'
import GuestLogin from './pages/GuestLogin'
import GuestVault from './pages/GuestVault'
import Employees from './pages/Employees'
import DashboardLayout from './layouts/DashboardLayout'
import FolderView from './pages/FolderView'
import { useAuthStore } from './store/authStore'

// Placeholder modules
const Dashboard = () => <h2 className="text-2xl font-bold text-slate-900">Workspace Overview</h2>;
const Documentation = () => <h2 className="text-2xl font-bold text-slate-900">Note Documentation</h2>;
const Operations = () => <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>;

function App() {
  const { user } = useAuthStore()

  return (
    <Router>
      <Toaster position="bottom-right" />
      <Routes>
        {/* ─── Public Auth Routes ─── */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/vault" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/vault" />} />
        <Route path="/verify-2fa" element={<TwoFactorVerify />} />
        <Route path="/setup-2fa" element={<TwoFactorSetup />} />

        {/* ─── Guest Portal (completely separate from main app) ─── */}
        <Route path="/guest-login" element={<GuestLogin />} />
        <Route path="/guest-vault" element={<GuestVault />} />

        {/* ─── Protected Dashboard Routes ─── */}
        <Route element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/notes" element={<Documentation />} />
          <Route path="/tasks" element={<Operations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/share-access" element={<ShareAccess />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/folder/:id" element={<FolderView />} />
        </Route>

        <Route path="/" element={<Navigate to={user ? "/vault" : "/login"} />} />
      </Routes>
    </Router>
  )
}

export default App
