import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import {
  Users, Car, DollarSign, TrendingUp, ArrowRight, Shield,
  Activity, Globe, Server, CheckCircle2, AlertTriangle, Bell
} from 'lucide-react'
import { bookings, staffMembers, vehicles, revenueData } from '../../data'
import type { NavFn } from '../../data'
import { StatCard, Card, Badge, Avatar, Button, SectionHeader, ProgressBar } from '../../components/shared'

const systemMetrics = [
  { time: '00:00', uptime: 100, load: 12 }, { time: '04:00', uptime: 100, load: 8 },
  { time: '08:00', uptime: 100, load: 45 }, { time: '12:00', uptime: 99.8, load: 82 },
  { time: '16:00', uptime: 100, load: 76 }, { time: '20:00', uptime: 100, load: 64 },
  { time: '23:59', uptime: 100, load: 38 },
]

export default function AdminDashboard({ nav }: { nav: NavFn }) {
  const totalRevenue = bookings.reduce((s, b) => s + b.total, 0)
  const activeBookings = bookings.filter(b => b.status === 'Active').length
  const availableVehicles = vehicles.filter(v => v.available).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Admin Control Panel</h1>
          <p className="text-slate-500 mt-1">System overview and management — Sunday, Dec 22, 2024</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => nav('admin-notifications')} variant="outline" size="sm">
            <Bell size={14} /> Notifications <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-0.5">5</span>
          </Button>
          <Button onClick={() => nav('admin-settings')} size="sm"><Shield size={14} /> System Settings</Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(0)}K`} change="23%" changeType="up" icon={<DollarSign size={22} />} color="blue" />
        <StatCard title="Total Customers" value="12,480" change="8%" changeType="up" icon={<Users size={22} />} color="green" />
        <StatCard title="Active Bookings" value={activeBookings} change="12%" changeType="up" icon={<Activity size={22} />} color="purple" />
        <StatCard title="Fleet Size" value={vehicles.length} icon={<Car size={22} />} color="amber" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Staff Members', value: staffMembers.length, sub: `${staffMembers.filter(s => s.status === 'Active').length} active`, color: 'text-blue-600 bg-blue-50' },
          { label: 'Locations', value: '50+', sub: 'Across 8 cities', color: 'text-green-600 bg-green-50' },
          { label: 'Fleet Utilization', value: '72%', sub: 'Avg this month', color: 'text-purple-600 bg-purple-50' },
          { label: 'System Uptime', value: '99.9%', sub: 'Last 30 days', color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-black mt-1">{s.value}</p>
            <p className="text-xs font-medium opacity-60 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid xl:grid-cols-3 gap-5">
        <Card className="p-5 xl:col-span-2">
          <SectionHeader title="Revenue Analytics" subtitle="Monthly performance" />
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bk2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#rev2)" />
                <Area type="monotone" dataKey="bookings" stroke="#16A34A" strokeWidth={2} fill="url(#bk2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Fleet Utilization" subtitle="By category" />
          <div className="mt-4 space-y-3">
            {[
              { cat: 'Luxury', pct: 88, color: 'blue' as const },
              { cat: 'SUV', pct: 76, color: 'green' as const },
              { cat: 'Electric', pct: 92, color: 'green' as const },
              { cat: 'Sedan', pct: 65, color: 'amber' as const },
              { cat: 'Compact', pct: 48, color: 'amber' as const },
            ].map(c => (
              <ProgressBar key={c.cat} value={c.pct} label={c.cat} color={c.color} />
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-3xl font-black text-blue-600">72%</p>
              <p className="text-xs text-slate-400 font-medium">Overall Utilization</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Staff + System Health */}
      <div className="grid xl:grid-cols-2 gap-5">
        {/* Staff Overview */}
        <Card className="p-5">
          <SectionHeader
            title="Staff Overview"
            subtitle={`${staffMembers.length} team members`}
            action={<Button onClick={() => nav('admin-staff')} variant="ghost" size="xs">Manage <ArrowRight size={12} /></Button>}
          />
          <div className="mt-4 space-y-3">
            {staffMembers.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.role} · {s.location}</p>
                </div>
                <Badge label={s.status} dot={true} />
              </div>
            ))}
          </div>
        </Card>

        {/* System Health */}
        <Card className="p-5">
          <SectionHeader title="System Health" subtitle="Live monitoring" />
          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemMetrics} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="load" stroke="#2563EB" strokeWidth={2} dot={false} name="CPU Load" />
                <Line type="monotone" dataKey="uptime" stroke="#16A34A" strokeWidth={2} dot={false} name="Uptime %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'CPU', value: '38%', ok: true, icon: Server },
              { label: 'Memory', value: '61%', ok: true, icon: Activity },
              { label: 'Uptime', value: '99.9%', ok: true, icon: Globe },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <m.icon size={14} className={`mx-auto mb-1 ${m.ok ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-lg font-black text-slate-800">{m.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-5">
        <SectionHeader title="Recent Admin Activity" subtitle="System-wide events" action={<Button onClick={() => nav('admin-audit')} variant="ghost" size="xs">View audit log <ArrowRight size={12} /></Button>} />
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {[
            { icon: CheckCircle2, text: 'New staff member onboarded: Suresh Pillai', time: '2h ago', color: 'text-green-500' },
            { icon: Car, text: 'Vehicle added: Hyundai Ioniq 6 (MH08OP9012)', time: '4h ago', color: 'text-blue-500' },
            { icon: AlertTriangle, text: 'Failed login attempt from 203.45.67.89', time: '5h ago', color: 'text-red-500' },
            { icon: DollarSign, text: 'Pricing rule updated: SUV Weekend Rate +10%', time: '6h ago', color: 'text-amber-500' },
            { icon: Users, text: 'Customer tier upgrade: Arjun Mehta → Gold', time: '8h ago', color: 'text-purple-500' },
            { icon: Shield, text: 'Role permissions updated by Amit Sinha', time: '1d ago', color: 'text-blue-500' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <a.icon size={16} className={`flex-shrink-0 ${a.color}`} />
              <p className="text-sm text-slate-700 flex-1">{a.text}</p>
              <span className="text-xs text-slate-400 flex-shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
