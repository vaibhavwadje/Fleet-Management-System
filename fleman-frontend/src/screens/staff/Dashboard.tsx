import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Calendar, Car, Clock, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react'
import type { NavFn } from '../../data'
import { api, session } from '../../api'
import type { BookingResponse, BookingStatsResponse, CarResponse } from '../../api'
import { StatCard, Card, Badge, Avatar, Button, SectionHeader, EmptyState } from '../../components/shared'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONFIRMED: '#2563EB',
  COMPLETED: '#16A34A',
  CANCELLED: '#DC2626',
}

const CAR_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#16A34A',
  RENTED: '#2563EB',
  MAINTENANCE: '#D97706',
  RETIRED: '#94A3B8',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function StaffDashboard({ nav }: { nav: NavFn }) {
  const [stats, setStats] = useState<BookingStatsResponse | null>(null)
  const [recent, setRecent] = useState<BookingResponse[]>([])
  const [cars, setCars] = useState<CarResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hubId = session.getStaffHubId()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsData, page] = await Promise.all([
        api.staffBookingStats(),
        api.staffBookings(0, 5),
      ])
      setStats(statsData)
      setRecent(page.bookings ?? [])

      if (hubId) {
        setCars(await api.carsByHub(hubId))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle size={28} className="text-red-500 mx-auto mb-3" />
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <Button onClick={load} variant="outline" size="sm">Try again</Button>
      </Card>
    )
  }

  const bookingChart = [
    { name: 'Pending', value: stats?.pending ?? 0, key: 'PENDING' },
    { name: 'Confirmed', value: stats?.confirmed ?? 0, key: 'CONFIRMED' },
    { name: 'Completed', value: stats?.completed ?? 0, key: 'COMPLETED' },
    { name: 'Cancelled', value: stats?.cancelled ?? 0, key: 'CANCELLED' },
  ]

  const carCounts = cars.reduce<Record<string, number>>((acc, car) => {
    acc[car.status] = (acc[car.status] ?? 0) + 1
    return acc
  }, {})

  const carChart = Object.entries(carCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }))

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Hub Dashboard"
        subtitle="Live figures for the hub you are signed in to"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bookings"
          value={stats?.total ?? 0}
          icon={<Calendar size={20} />}
          color="blue"
        />
        <StatCard
          title="Booked Today"
          value={stats?.todayBookings ?? 0}
          icon={<Clock size={20} />}
          color="purple"
        />
        <StatCard
          title="Awaiting Hand-over"
          value={stats?.pending ?? 0}
          icon={<AlertTriangle size={20} />}
          color="amber"
        />
        <StatCard
          title="Vehicles Available"
          value={cars.filter(c => c.status === 'AVAILABLE').length}
          icon={<Car size={20} />}
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Bookings by status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bookingChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {bookingChart.map(entry => (
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Fleet status</h3>
          {carChart.length === 0 ? (
            <EmptyState icon={<Car size={28} />} title="No vehicles at this hub yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={carChart}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {carChart.map(entry => (
                    <Cell
                      key={entry.name}
                      fill={CAR_STATUS_COLORS[entry.name] ?? '#94A3B8'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent bookings */}
      <Card className="p-5">
        <SectionHeader
          title="Latest bookings"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => nav('staff-bookings')}
              iconRight={<ArrowRight size={14} />}
            >
              View all
            </Button>
          }
        />

        {recent.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} />}
            title="No bookings yet"
            description="New bookings for this hub will appear here."
          />
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {recent.map(b => (
              <div key={b.bookingId} className="flex items-center gap-4 py-3">
                <Avatar name={b.customerName || 'Guest'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {b.customerName || 'Guest'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    #{b.bookingId} · {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </p>
                </div>
                <div className="hidden sm:block text-sm font-semibold text-slate-700">
                  ₹{Number(b.grandTotal ?? 0).toLocaleString('en-IN')}
                </div>
                <Badge label={b.bookingStatus} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 size={13} /> Figures come straight from the booking and
        vehicle APIs for your hub.
      </p>
    </div>
  )
}
