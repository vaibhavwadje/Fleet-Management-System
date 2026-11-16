import { useEffect, useState } from 'react'
import { Eye, Calendar, AlertTriangle, ArrowLeftRight, RotateCcw } from 'lucide-react'
import type { NavFn } from '../../data'
import { api } from '../../api'
import type { BookingResponse, BookingStatus } from '../../api'
import {
  Button, Badge, SearchBar, SectionHeader, Modal, Avatar, Card, EmptyState, Toast,
} from '../../components/shared'
import { BookingDetailsModal } from '../../components/BookingDetailsModal'
import { BookingIdSearch } from '../../components/BookingIdSearch'

const PAGE_SIZE = 10

const FILTERS: { label: string; value: BookingStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function money(value: number | null) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`
}

export default function StaffBookings({ nav }: { nav: NavFn }) {
  const [rows, setRows] = useState<BookingResponse[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [viewing, setViewing] = useState<BookingResponse | null>(null)
  const [cancelling, setCancelling] = useState<BookingResponse | null>(null)
  const [working, setWorking] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.staffBookings(
        page,
        PAGE_SIZE,
        status === 'ALL' ? undefined : status,
      )
      setRows(data.bookings ?? [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, status])

  // Search runs on the page already loaded - the backend has no search API yet.
  const visible = rows.filter(b => {
    if (!query.trim()) return true
    const needle = query.toLowerCase()
    return (
      String(b.bookingId).includes(needle) ||
      (b.customerName ?? '').toLowerCase().includes(needle) ||
      (b.email ?? '').toLowerCase().includes(needle) ||
      (b.assignedCarRegistrationNo ?? '').toLowerCase().includes(needle)
    )
  })

  const handleCancel = async () => {
    if (!cancelling) return
    setWorking(true)
    setError('')
    try {
      await api.updateStaffBookingStatus(cancelling.bookingId, 'CANCELLED')
      setToast(`Booking #${cancelling.bookingId} cancelled`)
      setCancelling(null)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <Toast message={toast} onClose={() => setToast('')} />
        </div>
      )}

      <SectionHeader
        title="Bookings"
        subtitle={`${totalElements} booking${totalElements === 1 ? '' : 's'} at your hub`}
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Filter this page by id, customer or vehicle..."
          className="md:w-80"
        />
        {/* The filter above only searches the rows already on screen, and
            only this hub's. This finds any booking anywhere by its ID. */}
        <BookingIdSearch className="md:w-80" onFound={setViewing} />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(0) }}
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
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Calendar size={28} />}
            title="No bookings found"
            description="Try a different status filter or clear your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-bold px-5 py-4">Booking</th>
                  <th className="text-left font-bold px-5 py-4">Customer</th>
                  <th className="text-left font-bold px-5 py-4">Dates</th>
                  <th className="text-left font-bold px-5 py-4">Vehicle</th>
                  <th className="text-right font-bold px-5 py-4">Total</th>
                  <th className="text-left font-bold px-5 py-4">Status</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(b => (
                  <tr key={b.bookingId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">#{b.bookingId}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={b.customerName || 'Guest'} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {b.customerName || 'Guest'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                      {formatDate(b.startDate)} → {formatDate(b.endDate)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {b.assignedCarRegistrationNo
                        ? `${b.assignedCarBrandName} ${b.assignedCarModelName} (${b.assignedCarRegistrationNo})`
                        : <span className="text-slate-400">Not assigned</span>}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {money(b.grandTotal)}
                    </td>
                    <td className="px-5 py-4"><Badge label={b.bookingStatus} /></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setViewing(b)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        {b.bookingStatus === 'PENDING' && (
                          <button
                            onClick={() => nav('staff-handover')}
                            title="Hand over"
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          >
                            <ArrowLeftRight size={15} />
                          </button>
                        )}
                        {b.bookingStatus === 'CONFIRMED' && (
                          <button
                            onClick={() => nav('staff-returns')}
                            title="Process return"
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-green-600 transition-colors"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Booking details - the same popup Hand-over and Returns use. */}
      <BookingDetailsModal
        booking={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing && (viewing.bookingStatus === 'PENDING' ||
                      viewing.bookingStatus === 'CONFIRMED') ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setCancelling(viewing); setViewing(null) }}
            >
              Cancel booking
            </Button>
          ) : null
        }
      />

      {/* Cancel confirmation */}
      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel this booking?"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCancelling(null)}>
              Keep booking
            </Button>
            <Button variant="danger" size="sm" loading={working} onClick={handleCancel}>
              Yes, cancel it
            </Button>
          </>
        }
      >
        <p className="p-6 text-[15px] text-slate-600">
          Booking #{cancelling?.bookingId} for {cancelling?.customerName} will be
          marked as cancelled. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
