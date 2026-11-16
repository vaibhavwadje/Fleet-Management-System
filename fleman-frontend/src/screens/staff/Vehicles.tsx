import { useEffect, useState } from 'react'
import { LayoutGrid, List, Eye, Users, Gauge, Car as CarIcon, AlertTriangle, Fuel } from 'lucide-react'
import type { NavFn } from '../../data'
import { api, session } from '../../api'
import type { CarResponse, CarStatus } from '../../api'
import {
  Button, Card, Badge, SearchBar, SectionHeader, Modal, EmptyState,
} from '../../components/shared'

const FILTERS: { label: string; value: CarStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Rented', value: 'RENTED' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Retired', value: 'RETIRED' },
]

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function StaffVehicles({ nav: _nav }: { nav: NavFn }) {
  const [cars, setCars] = useState<CarResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<CarStatus | 'ALL'>('ALL')
  const [viewing, setViewing] = useState<CarResponse | null>(null)

  const hubId = session.getStaffHubId()

  const load = async () => {
    if (!hubId) {
      setError('No hub is linked to your staff account.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setCars(await api.carsByHub(hubId))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const visible = cars.filter(c => {
    const matchesStatus = status === 'ALL' || c.status === status
    const needle = query.trim().toLowerCase()
    const matchesQuery =
      !needle ||
      c.registrationNo.toLowerCase().includes(needle) ||
      c.brandName.toLowerCase().includes(needle) ||
      c.modelName.toLowerCase().includes(needle)
    return matchesStatus && matchesQuery
  })

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Vehicles"
        subtitle={`${cars.length} vehicle${cars.length === 1 ? '' : 's'} at your hub`}
        action={
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white text-blue-600 shadow-card' : 'text-slate-500'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-white text-blue-600 shadow-card' : 'text-slate-500'}`}
            >
              <List size={16} />
            </button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by registration, brand or model..."
          className="md:w-80"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                status === f.value
                  ? 'gradient-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} /> {error}
          <Button size="xs" variant="outline" className="ml-auto" onClick={load}>Retry</Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CarIcon size={28} />}
            title="No vehicles found"
            description="Try a different status filter or clear your search."
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(car => (
            <Card key={car.carId} className="overflow-hidden" hover>
              <div className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
                {car.image ? (
                  <img
                    src={car.image}
                    alt={car.modelName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CarIcon size={36} className="text-slate-300" />
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {car.brandName} {car.modelName}
                    </p>
                    <p className="text-xs text-slate-500">{car.registrationNo}</p>
                  </div>
                  <Badge label={car.status} />
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users size={13} />{car.seatCapacity} seats</span>
                  <span className="flex items-center gap-1"><Fuel size={13} />{car.fuelType}</span>
                  <span className="flex items-center gap-1"><Gauge size={13} />{car.transmission}</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  icon={<Eye size={14} />}
                  onClick={() => setViewing(car)}
                >
                  View details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-bold px-5 py-4">Registration</th>
                  <th className="text-left font-bold px-5 py-4">Vehicle</th>
                  <th className="text-left font-bold px-5 py-4">Fuel</th>
                  <th className="text-left font-bold px-5 py-4">Transmission</th>
                  <th className="text-left font-bold px-5 py-4">Service due</th>
                  <th className="text-left font-bold px-5 py-4">Status</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(car => (
                  <tr key={car.carId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">{car.registrationNo}</td>
                    <td className="px-5 py-4 text-slate-600">{car.brandName} {car.modelName}</td>
                    <td className="px-5 py-4 text-slate-600">{car.fuelType}</td>
                    <td className="px-5 py-4 text-slate-600">{car.transmission}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(car.serviceDueDate)}</td>
                    <td className="px-5 py-4"><Badge label={car.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setViewing(car)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.brandName} ${viewing.modelName}` : ''}
        subtitle={viewing?.registrationNo}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="p-6 space-y-5">
            {viewing.image && (
              <img src={viewing.image} alt={viewing.modelName}
                className="w-full h-44 object-cover rounded-2xl" />
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{viewing.registrationNo}</span>
              <Badge label={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-[15px]">
              <Detail label="Year" value={String(viewing.year)} />
              <Detail label="Seats" value={String(viewing.seatCapacity)} />
              <Detail label="Fuel type" value={viewing.fuelType} />
              <Detail label="Transmission" value={viewing.transmission} />
              <Detail label="Mileage" value={`${viewing.mileage ?? '—'} km/l`} />
              <Detail label="Service due" value={formatDate(viewing.serviceDueDate)} />
              <Detail label="Hub" value={viewing.hubName} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}
