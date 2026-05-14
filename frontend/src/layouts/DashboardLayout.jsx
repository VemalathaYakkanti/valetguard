import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { motion } from 'framer-motion'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[#fcfdfe]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-10"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
