import { type ReactNode, useState } from 'react'
import {
  LayoutDashboard, Calendar, Car, ArrowLeftRight, RotateCcw,
  FileText, LogOut, ChevronRight, Menu, X, ChevronDown, Upload, PlusCircle,
} from 'lucide-react'
import type { Screen, NavFn } from '../data'
import { Avatar } from './shared'
import { logout, session } from '../api'

type Role = 'staff' | 'admin'

// The admin section is intentionally not shown - it has no backend.
const staffNav = [
  { id: 'staff-dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'staff-bookings',   label: 'Bookings',   icon: Calendar },
  { id: 'staff-on-spot',    label: 'On-spot Booking', icon: PlusCircle },
  { id: 'staff-vehicles',   label: 'Vehicles',   icon: Car },
  { id: 'staff-handover',   label: 'Hand-over',  icon: ArrowLeftRight },
  { id: 'staff-returns',    label: 'Returns',    icon: RotateCcw },
  { id: 'staff-invoice',    label: 'Invoices',   icon: FileText },
  { id: 'staff-excel',      label: 'Excel Upload', icon: Upload },
]

export function Layout({ children, screen, nav, role = 'staff' }: {
  children: ReactNode; screen: Screen; nav: NavFn; role?: Role
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const navItems = staffNav

  const currentLabel = navItems.find(n => n.id === screen)?.label ?? 'Dashboard'

  const staff = session.getStaff()
  const user = {
    name: staff ? `${staff.firstName} ${staff.lastName}`.trim() : 'Staff Member',
    role: 'Hub Staff',
    email: staff?.email ?? '',
  }

  const handleSignOut = () => {
    logout()
    nav('landing')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface font-sans">
      {/* Sidebar */}
      <aside className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-100 shadow-card flex-shrink-0 z-20`}>
        {/* Logo */}
        <div className={`flex items-center h-[4.5rem] border-b border-slate-200 px-4 gap-3 flex-shrink-0`}>
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in overflow-hidden">
              <span className="font-black text-slate-900 text-xl tracking-tight">FLEMAN</span>
              <span className="block text-xs font-medium px-1.5 py-0.5 rounded-md text-blue-700 bg-blue-50 w-fit">
                Staff
              </span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5 px-2">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = screen === item.id
            return (
              <button
                key={item.id + item.label}
                onClick={() => nav(item.id as Screen)}
                className={`sidebar-item w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left ${isActive ? 'sidebar-item-active font-semibold' : 'text-slate-600 font-medium'}`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-[15px] flex-1 animate-fade-in whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: User + Switcher */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors animate-fade-in">
              <Avatar name={user.name} size="sm" />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.role}</p>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex-1 flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="h-[4.5rem] bg-white border-b border-slate-200 flex items-center px-8 gap-4 shadow-card flex-shrink-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[15px]">Staff</span>
            <ChevronRight size={15} className="text-slate-300" />
            <span className="text-slate-900 font-bold text-[15px]">{currentLabel}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Avatar name={user.name} size="sm" />
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{user.name.split(' ')[0]}</p>
                  <p className="text-xs text-slate-500">{user.role.split(' ')[0]}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-float border border-slate-100 z-50 animate-scale-in py-2">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="border-t border-slate-100 mt-2 pt-2">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
