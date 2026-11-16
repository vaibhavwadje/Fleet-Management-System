import { useState, useEffect } from 'react'
import {
  User, Calendar, BookText, Lock, Headphones, LogOut,
  Car, MapPin, ArrowRight, ChevronDown, LayoutDashboard,
  Clock, CheckCircle2, Wallet, AlertTriangle, Plus, Receipt, Download,
  Menu, X, ChevronRight, Home
} from 'lucide-react'
import type { NavFn, Screen } from '../data'
import { Button, Card, Badge, Input } from '../components/shared'
import { createPortal } from 'react-dom'
import { SearchSelect } from '../components/SearchSelect'
import { todayISO, addDays, rentalDays } from '../utils/date'
import { formatAddress, hasAddress } from '../utils/address'
import { api, logout, type CarTypeResponse, type CityResponse, type StateResponse,
  type InvoiceResponse, type ProfileResponse, type BookingResponse, type BookingStatsResponse, type HubResponse, type AddonResponse, type CarResponse } from '../api'

/** Today in yyyy-MM-dd, used as the `min` on every booking date picker
    so past dates cannot be chosen. The backend enforces the same rule. */
const TODAY = todayISO()

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'my-info',     label: 'My Information',  icon: User },
  { id: 'my-bookings', label: 'My Bookings',     icon: BookText },
  { id: 'invoices',    label: 'Invoices',        icon: Receipt },
  { id: 'change-pw',   label: 'Change Password', icon: Lock },
  { id: 'support',     label: 'Support',         icon: Headphones },
]

/** Saves a Blob to disk using a temporary link. */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getCurrentUser() {
  const s = typeof window !== 'undefined' ? localStorage.getItem('customer') : null
  return s ? JSON.parse(s) : { firstName: 'Guest', lastName: '', email: '' }
}

// ── Dashboard (overview) ────────────────────────────────────────────────────

const F_DATE = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Small stat tile used across the overview. */
function OverviewStat({ label, value, icon, tone }: {
  label: string
  value: string | number
  icon: React.ReactNode
  tone: 'blue' | 'amber' | 'green' | 'slate'
}) {
  const tones = {
    blue:  'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    slate: 'bg-slate-100 text-slate-500',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl flex-shrink-0 ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  )
}

function DashboardContent({ nav, onViewDetails, goToBookings }: {
  nav: NavFn
  onViewDetails: (id: string) => void
  goToBookings: () => void
}) {
  const [stats, setStats] = useState<BookingStatsResponse | null>(null)
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const customer = getCurrentUser()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsData, page] = await Promise.all([
        api.bookingStats(),
        api.bookings(0, 20),
      ])
      setStats(statsData)
      setBookings(page.bookings ?? [])
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-slate-100 animate-pulse" />
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

  // Money actually committed - cancelled bookings do not count.
  const totalSpent = bookings
    .filter(b => b.bookingStatus !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.grandTotal ?? 0), 0)

  // The next rental that has not finished yet, soonest first.
  const today = TODAY
  const upcoming = bookings
    .filter(b => (b.bookingStatus === 'PENDING' || b.bookingStatus === 'CONFIRMED') && b.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]

  const recent = bookings.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-black text-slate-900">
          Welcome back{customer.firstName ? `, ${customer.firstName}` : ''}
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Here is what is happening with your rentals.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <OverviewStat label="Total Bookings" value={stats?.total ?? 0} tone="blue" icon={<BookText size={20} />} />
        <OverviewStat label="Awaiting Pick-up" value={stats?.pending ?? 0} tone="amber" icon={<Clock size={20} />} />
        <OverviewStat label="On Rent" value={stats?.confirmed ?? 0} tone="green" icon={<Car size={20} />} />
        <OverviewStat label="Total Spent" value={F(totalSpent)} tone="slate" icon={<Wallet size={20} />} />
      </div>

      {/* Next rental */}
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-4">Your next rental</h3>

        {!upcoming ? (
          <div className="flex flex-col items-center text-center py-8 gap-3">
            <div className="p-4 bg-slate-50 rounded-3xl text-slate-300"><Calendar size={26} /></div>
            <p className="text-sm font-semibold text-slate-700">No upcoming rentals</p>
            <p className="text-sm text-slate-400 max-w-xs">
              When you book a car it will show up here with your pick-up details.
            </p>
            <Button size="sm" onClick={() => nav('landing')} icon={<Plus size={14} />}>
              Book a car
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Booking</p>
                <p className="text-lg font-black text-slate-900">#{upcoming.bookingId}</p>
              </div>
              <Badge label={upcoming.bookingStatus} />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Pick-up</p>
                <p className="text-slate-800 font-medium mt-0.5 flex items-start gap-1.5">
                  <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  {upcoming.pickupHubName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Drop-off</p>
                <p className="text-slate-800 font-medium mt-0.5 flex items-start gap-1.5">
                  <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  {upcoming.dropoffHubName}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Dates</p>
                <p className="text-slate-800 font-medium mt-0.5">
                  {F_DATE(upcoming.startDate)} → {F_DATE(upcoming.endDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Vehicle</p>
                <p className="text-slate-800 font-medium mt-0.5">
                  {upcoming.assignedCarRegistrationNo
                    ? `${upcoming.assignedCarBrandName} ${upcoming.assignedCarModelName}`
                    : 'Assigned at pick-up'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-black text-slate-900">{F(upcoming.grandTotal ?? 0)}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => onViewDetails(String(upcoming.bookingId))}>
                View details
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Recent bookings + quick actions */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h3 className="font-bold text-slate-800">Recent bookings</h3>
            {recent.length > 0 && (
              <Button size="xs" variant="ghost" onClick={goToBookings} iconRight={<ArrowRight size={13} />}>
                View all
              </Button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              You have not made any bookings yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map(b => (
                <button
                  key={b.bookingId}
                  onClick={() => onViewDetails(String(b.bookingId))}
                  className="w-full flex items-center gap-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-xl px-2 -mx-2"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Car size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">#{b.bookingId}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.pickupHubName} · {F_DATE(b.startDate)}
                    </p>
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-slate-700">
                    {F(b.grandTotal ?? 0)}
                  </span>
                  <Badge label={b.bookingStatus} />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Quick actions</h3>
          <div className="space-y-2">
            <Button fullWidth onClick={() => nav('landing')} icon={<Plus size={15} />}>
              Book a car
            </Button>
            <Button fullWidth variant="outline" onClick={goToBookings} icon={<BookText size={15} />}>
              My bookings
            </Button>
            <Button fullWidth variant="secondary" onClick={() => nav('landing')} icon={<Home size={15} />}>
              Back to home
            </Button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Completed trips</span>
              <span className="font-semibold text-slate-800">{stats?.completed ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cancelled</span>
              <span className="font-semibold text-slate-800">{stats?.cancelled ?? 0}</span>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
            <CheckCircle2 size={12} /> Live from your booking history.
          </p>
        </Card>
      </div>
    </div>
  )
}

// ── Invoices ────────────────────────────────────────────────────────────────

/**
 * Lists the bookings that have been returned, because an invoice is only
 * raised once the vehicle comes back.
 */
function InvoicesContent({ onViewInvoice }: { onViewInvoice: (id: string) => void }) {
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const page = await api.bookings(0, 50, 'COMPLETED')
      setBookings(page.bookings ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDownload = async (bookingId: number) => {
    setDownloadingId(bookingId)
    setError('')
    try {
      const blob = await api.downloadInvoice(bookingId)
      saveBlob(blob, `Invoice-Booking-${bookingId}.pdf`)
      setToast('Invoice downloaded')
      setTimeout(() => setToast(''), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Invoices</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          An invoice is issued once you return the vehicle.
        </p>
      </div>

      {toast && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          ✓ {toast}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="p-4 bg-slate-50 rounded-3xl text-slate-300 w-fit mx-auto mb-3">
            <Receipt size={26} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No invoices yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Once a rental is completed and the vehicle is returned, your
            invoice will appear here to view and download.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-bold px-5 py-4">Booking</th>
                  <th className="text-left font-bold px-5 py-4">Vehicle</th>
                  <th className="text-left font-bold px-5 py-4">Rental period</th>
                  <th className="text-right font-bold px-5 py-4">Amount</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map(b => (
                  <tr key={b.bookingId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      #{b.bookingId}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {b.assignedCarRegistrationNo
                        ? `${b.assignedCarBrandName} ${b.assignedCarModelName}`
                        : (b.carTypeName ?? '—')}
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                      {F_DATE(b.startDate)} → {F_DATE(b.endDate)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {F(b.grandTotal ?? 0)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onViewInvoice(String(b.bookingId))}
                        >
                          View
                        </Button>
                        <Button
                          size="xs"
                          loading={downloadingId === b.bookingId}
                          onClick={() => handleDownload(b.bookingId)}
                          icon={<Download size={13} />}
                        >
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/** Full invoice, matching the PDF, with a download button. */
function ViewInvoiceModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.invoiceForBooking(Number(bookingId))
      .then(setInvoice)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [bookingId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await api.downloadInvoice(Number(bookingId))
      saveBlob(blob, `Invoice-${invoice?.invoiceNo ?? bookingId}.pdf`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const row = (label: string, value: string) => (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  )

  // Rendered into document.body. The dashboard content sits inside
  // `animate-fade-in`, whose transform makes it the containing block for
  // anything `position: fixed` - so without the portal this backdrop covers
  // the content area rather than the screen. See components/shared.tsx.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-float w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-slate-800">
            {invoice ? `Invoice ${invoice.invoiceNo}` : 'Invoice'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {loading && <p className="text-sm text-slate-400 py-8 text-center">Loading invoice…</p>}

          {error && !loading && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {invoice && !loading && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="font-black text-slate-900">FLEMAN Fleet Management Pvt. Ltd.</p>
                  <p className="text-xs text-slate-400">
                    Bandra Kurla Complex, Mumbai 400051 · support@fleman.in
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Invoice</p>
                  <p className="font-black text-blue-600">{invoice.invoiceNo}</p>
                  <p className="text-xs text-slate-400">
                    {F_DATE(invoice.invoiceDate)} · Booking #{invoice.bookingId}
                  </p>
                </div>
              </div>

              {/* Billed to + period */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Billed to</p>
                  <p className="font-bold text-slate-800">{invoice.customerName}</p>
                  <p className="text-sm text-slate-500">{invoice.email}</p>
                  <p className="text-sm text-slate-500">{invoice.phone ?? '—'}</p>
                  {hasAddress(invoice) && (
                    <p className="text-sm text-slate-500 mt-1">
                      {formatAddress(invoice)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {row('Pick-up', invoice.pickupHubName)}
                  {row('Drop-off', invoice.dropoffHubName)}
                  {row('Handed over', F_DATE(invoice.handoverDate))}
                  {row('Returned', F_DATE(invoice.returnDate))}
                </div>
              </div>

              {/* Vehicle */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100">
                {row('Category', invoice.carTypeName ?? '—')}
                {row('Registration', invoice.registrationNo ?? '—')}
                {row('Vehicle', `${invoice.brandName ?? ''} ${invoice.modelName ?? ''}`.trim() || '—')}
                {row('Duration', `${invoice.duration} day(s)`)}
              </div>

              {/* Charges */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Charges</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Vehicle rental ({invoice.duration} day(s))
                    </span>
                    <span className="font-semibold">{F(invoice.vehicleAmount)}</span>
                  </div>

                  {invoice.addons.map(a => (
                    <div key={a.invoiceDetailId} className="flex justify-between">
                      <span className="text-slate-500 pl-3">Add-on: {a.addonName}</span>
                      <span className="font-semibold">{F(a.addonPrice)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between">
                    <span className="text-slate-500">Add-ons subtotal</span>
                    <span className="font-semibold">{F(invoice.addonAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">GST (18%)</span>
                    <span className="font-semibold">{F(invoice.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking total</span>
                    <span className="font-semibold">{F(invoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Fuel charges (out {invoice.fuelLevelOut ?? '—'}% / in {invoice.fuelLevelIn ?? '—'}%)
                    </span>
                    <span className="font-semibold">{F(invoice.fuelCharges ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="font-black text-slate-800">Total payable</span>
                    <span className="font-black text-blue-600 text-lg">
                      {F(invoice.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
                <Button
                  size="sm"
                  loading={downloading}
                  onClick={handleDownload}
                  icon={<Download size={14} />}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    ,
    document.body,
  )
}

function MyBookingsContent({ onViewDetails, onManageBooking }: { onViewDetails: (id: string) => void; onManageBooking: (id: string) => void }) {
  const [page, setPage] = useState<BookingResponse[]>([])
  const [stats, setStats] = useState<BookingStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [carCache, setCarCache] = useState<Record<number, CarResponse>>({})

  const fetch = () => {
    setLoading(true)
    setError('')
    Promise.all([
      api.bookings(0, 20).then(p => setPage(p.bookings || [])).catch(() => {}),
      api.bookingStats().then(setStats).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  // A vehicle is only attached once staff assign one at hand-over, so we
  // look up assignedCarId rather than carId.
  useEffect(() => {
    const ids = [...new Set(
      page.map(b => b.assignedCarId).filter((id): id is number => !!id),
    )]
    if (ids.length === 0) return
    Promise.all(ids.map(id => api.car(id).catch(() => null))).then(cars => {
      const map: Record<number, CarResponse> = {}
      cars.forEach(c => { if (c) map[c.carId] = c })
      setCarCache(map)
    })
  }, [page])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900">My Bookings</h2>
      <p className="text-slate-500 text-sm -mt-4">View and manage all your bookings.</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'Confirmed', value: stats.confirmed, color: 'green' },
            { label: 'Pending', value: stats.pending, color: 'amber' },
            { label: 'Completed', value: stats.completed, color: 'slate' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase">{s.label}</p>
              <p className={`text-xl font-black text-${s.color}-600 mt-1`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 bg-slate-200 rounded-xl" />
          <div className="h-12 bg-slate-200 rounded-xl" />
          <div className="h-12 bg-slate-200 rounded-xl" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-700 mb-4">Unable to load bookings.</p>
          <Button onClick={fetch} variant="outline" size="sm">Retry</Button>
        </div>
      )}

      {!loading && page.length > 0 && (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Booking ID</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickup</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {page.map(b => {
                  const car = b.assignedCarId ? carCache[b.assignedCarId] : undefined
                  return (
                    <tr key={b.bookingId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs font-bold text-blue-600">#{b.bookingId}</td>
                      <td className="py-3 px-2 font-semibold text-slate-800 text-xs max-w-32 truncate">{b.pickupHubName}</td>
                      <td className="py-3 px-2 text-slate-600 text-xs">{b.startDate}</td>
                      <td className="py-3 px-2 text-slate-600 text-xs">{b.endDate}</td>
                      <td className="py-3 px-2"><Badge label={b.bookingStatus} dot /></td>
                      <td className="py-3 px-2 text-right font-semibold text-xs">{F(b.grandTotal ?? 0)}</td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => onViewDetails(String(b.bookingId))} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50">View</button>
                          {(b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PENDING') && (
                            <button onClick={() => onManageBooking(String(b.bookingId))} className="text-xs font-semibold text-amber-600 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50">Manage</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && page.length === 0 && (
        <Card className="p-5">
          <div className="text-center py-6">
            <Car size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 font-bold text-lg">No bookings yet</p>
            <p className="text-slate-400 text-sm mt-1">Book your first vehicle today!</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function MyInfoContent() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // View mode by default; the Edit button swaps in the form.
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const [states, setStates] = useState<StateResponse[]>([])
  const [cities, setCities] = useState<CityResponse[]>([])

  // Email is deliberately absent: it is the login identity and is read only.
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    dateOfBirth: '', gender: '', nationality: '',
    drivingLicenseNo: '', passportNo: '',
    addressLine1: '', addressLine2: '',
    stateId: '', cityId: '', pincode: '',
  })

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const load = () => {
    setLoading(true)
    setError('')
    api.profile()
      .then(p => {
        setProfile(p)
        setForm({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          phone: p.phone ?? '',
          dateOfBirth: p.dateOfBirth ?? '',
          gender: p.gender ?? '',
          nationality: p.nationality ?? '',
          drivingLicenseNo: p.drivingLicenseNo ?? '',
          passportNo: p.passportNo ?? '',
          addressLine1: p.addressLine1 ?? '',
          addressLine2: p.addressLine2 ?? '',
          stateId: p.stateId ? String(p.stateId) : '',
          cityId: p.cityId ? String(p.cityId) : '',
          pincode: p.pincode ?? '',
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (editing && states.length === 0) {
      api.states().then(setStates).catch(() => {})
    }
  }, [editing])

  useEffect(() => {
    if (!form.stateId) { setCities([]); return }
    api.citiesByState(Number(form.stateId)).then(setCities).catch(() => setCities([]))
  }, [form.stateId])

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required'
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      return 'Phone number must be 10 digits starting with 6-9'
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      return 'Pincode must be 6 digits'
    }
    return ''
  }

  const handleSave = async () => {
    const problem = validate()
    if (problem) { setError(problem); setSuccess(''); return }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      // Reuses the existing PUT /api/customer/profile - no new endpoint.
      const updated = await api.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        nationality: form.nationality,
        drivingLicenseNo: form.drivingLicenseNo,
        passportNo: form.passportNo,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        stateId: form.stateId ? Number(form.stateId) : undefined,
        cityId: form.cityId ? Number(form.cityId) : undefined,
        pincode: form.pincode,
      })

      setProfile(updated)
      setEditing(false)
      setSuccess('Your details have been saved')
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = profile ? [
    { label: 'First Name', value: profile.firstName },
    { label: 'Last Name', value: profile.lastName },
    { label: 'Email Address', value: profile.email },
    { label: 'Phone Number', value: profile.phone },
    { label: 'Date of Birth', value: profile.dateOfBirth },
    { label: 'Gender', value: profile.gender },
    { label: 'Nationality', value: profile.nationality },
    { label: 'Driving License', value: profile.drivingLicenseNo },
    { label: 'Passport No', value: profile.passportNo },
    { label: 'Address', value: formatAddress(profile) },
  ].filter(f => f.value) : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">My Information</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Keep these up to date - they are copied onto every booking you make.
          </p>
        </div>
        {!loading && !editing && (
          <Button size="sm" onClick={() => { setEditing(true); setError('') }}>
            <User size={14} /> Edit Profile
          </Button>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading profile…</p>}

      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          ⚠ {error}
        </div>
      )}

      {/* ---------- View mode ---------- */}
      {!loading && !editing && (
        <Card className="p-6">
          {fields.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Your profile is empty. Use Edit Profile to fill it in.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {fields.map(f => (
                <div key={f.label}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{f.value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ---------- Edit mode ---------- */}
      {!loading && editing && (
        <Card className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="First Name *" value={form.firstName}
              onChange={e => set('firstName', e.target.value)} />
            <Input label="Last Name" value={form.lastName}
              onChange={e => set('lastName', e.target.value)} />

            <Input label="Email Address" value={profile?.email ?? ''} disabled
              hint="Your email is your sign-in and cannot be changed here." />
            <Input label="Phone Number" value={form.phone}
              onChange={e => set('phone', digitsOnly(e.target.value, 10))}
              inputMode="numeric" maxLength={10} placeholder="10 digits" />

            <Input label="Date of Birth" type="date" max={TODAY} value={form.dateOfBirth}
              onChange={e => set('dateOfBirth', e.target.value)} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="field">
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input label="Nationality" value={form.nationality}
              onChange={e => set('nationality', e.target.value)} />
            <Input label="Driving License Number" value={form.drivingLicenseNo}
              onChange={e => set('drivingLicenseNo', e.target.value)} />
            <Input label="Passport Number" value={form.passportNo}
              onChange={e => set('passportNo', e.target.value)} />
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Address</p>
            <Input label="Address Line 1" value={form.addressLine1}
              onChange={e => set('addressLine1', e.target.value)} />
            <Input label="Address Line 2" value={form.addressLine2}
              onChange={e => set('addressLine2', e.target.value)} />

            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">State</label>
                <SearchSelect
                  value={form.stateId}
                  options={states.map(st => ({ id: st.stateId, label: st.stateName }))}
                  placeholder="Search state..."
                  onSelect={opt => { set('stateId', opt ? String(opt.id) : ''); set('cityId', '') }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">City</label>
                <SearchSelect
                  value={form.cityId}
                  options={cities.map(c => ({ id: c.cityId, label: c.cityName }))}
                  placeholder="Search city..."
                  disabled={!form.stateId}
                  disabledText="Select a state first"
                  onSelect={opt => set('cityId', opt ? String(opt.id) : '')}
                />
              </div>
              <Input label="Pincode" value={form.pincode}
                onChange={e => set('pincode', digitsOnly(e.target.value, 6))}
                inputMode="numeric" maxLength={6} placeholder="6 digits" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm"
              onClick={() => { setEditing(false); setError(''); load() }}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              Save changes
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ChangePasswordContent() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all three fields')
      return
    }
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.changePassword({ oldPassword, newPassword, confirmPassword })
      setSuccess('Your password has been updated')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    {
      label: 'Current Password',
      placeholder: 'Enter current password',
      value: oldPassword,
      onChange: setOldPassword,
    },
    {
      label: 'New Password',
      placeholder: 'Enter new password (min. 8 characters)',
      value: newPassword,
      onChange: setNewPassword,
    },
    {
      label: 'Confirm New Password',
      placeholder: 'Re-enter new password',
      value: confirmPassword,
      onChange: setConfirmPassword,
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900">Change Password</h2>
      <Card className="p-6 max-w-lg">
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">{f.label}</label>
              <input
                type="password"
                placeholder={f.placeholder}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="field"
              />
            </div>
          ))}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3">⚠ {error}</div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 rounded-xl p-3">✓ {success}</div>
          )}

          <Button fullWidth loading={loading} onClick={handleSubmit}>
            <Lock size={14} /> Update Password
          </Button>
        </div>
      </Card>
    </div>
  )
}

function SupportContent() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-900">Support</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-2">Contact Us</h3>
          <p className="text-sm text-slate-500 mb-4">Our team is available 24/7 to assist you.</p>
          <div className="space-y-3">
            {[
              { label: 'Phone', value: '+91 1800 266 3526' },
              { label: 'Email', value: 'support@fleman.in' },
              { label: 'WhatsApp', value: '+91 98765 43210' },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-16">{c.label}</span>
                <span className="text-sm font-semibold text-slate-800">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-4">Send a Message</h3>
          <div className="space-y-3">
            <input placeholder="Subject" className="field" />
            <textarea rows={4} placeholder="Describe your issue..." className="field resize-none" />
            <Button fullWidth><Headphones size={14} /> Send Message</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ViewDetailsModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [data, setData] = useState<BookingResponse | null>(null)
  const [car, setCar] = useState<CarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = () => {
    setLoading(true)
    setError('')
    api.viewBooking(Number(bookingId))
      .then(b => {
        setData(b)
        if (b.assignedCarId) api.car(b.assignedCarId).then(setCar).catch(() => {})
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [bookingId])

  // Rendered into document.body. The dashboard content sits inside
  // `animate-fade-in`, whose transform makes it the containing block for
  // anything `position: fixed` - so without the portal this backdrop covers
  // the content area rather than the screen. See components/shared.tsx.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-float w-full max-w-4xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900">
            Booking Details{data ? ` - #${data.bookingId}` : ''}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading booking details…</p>
          </div>
        )}

        {error && (
          <div className="p-10 text-center">
            <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">⚠ {error}</p>
            <Button onClick={fetch} variant="outline" size="sm">Retry</Button>
          </div>
        )}

        {data && !loading && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left column: Vehicle Info + Rental Period */}
            <div className="md:col-span-3 space-y-5">
              {/* Vehicle Info */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vehicle Information</h3>
                <div className="flex gap-4">
                  {(car?.image || data.carTypeImageUrl) && (
                    <img
                      src={car?.image || data.carTypeImageUrl || ''}
                      alt={data.carTypeName ?? 'Vehicle'}
                      className="w-28 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div>
                    {/* The category is always known - the actual car only
                        exists once staff assign one at hand-over. */}
                    <p className="font-bold text-slate-900">
                      {data.carTypeName ?? 'Vehicle'}
                    </p>
                    {car ? (
                      <>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {car.brandName} {car.modelName} · {car.registrationNo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {car.transmission} · {car.fuelType} · {car.seatCapacity} seats
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {data.carClass ? `${data.carClass} class · ` : ''}
                        Your exact vehicle is allocated at pick-up
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Rental Period */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rental Period</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-700">Pick-up</p>
                      <p className="text-slate-500">{data.pickupHubName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-700">Return</p>
                      <p className="text-slate-500">{data.dropoffHubName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 mt-1">
                    <Calendar size={12} />
                    <span>{data.startDate} → {data.endDate}</span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{data.duration} days</span>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Customer</h3>
                <p className="text-sm font-semibold text-slate-800">{data.customerName}</p>
                <p className="text-xs text-slate-500">{data.email}</p>
              </div>
            </div>

            {/* Right column: Cost Breakdown + Status + Close */}
            <div className="md:col-span-2 space-y-5">
              {/* Cost Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cost Breakdown</h3>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vehicle Amount</span>
                    <span className="font-semibold">{F(data.vehicleAmount)}</span>
                  </div>
                  {data.addonAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Add-ons Total</span>
                      <span className="font-semibold">{F(data.addonAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (18%)</span>
                    <span className="font-semibold">{F(data.taxAmount)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-3 flex justify-between">
                    <span className="font-bold text-slate-800">Grand Total</span>
                    <span className="font-black text-blue-600 text-lg">{F(data.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                <Badge label={data.bookingStatus} dot />
              </div>

              {/* Close */}
              <Button onClick={onClose} fullWidth variant="outline">Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
    ,
    document.body,
  )
}

function ManageBookingModal({ bookingId, onClose, onBookingChanged }: { bookingId: string; onClose: () => void; onBookingChanged: () => void }) {
  const [data, setData] = useState<BookingResponse | null>(null)
  const [car, setCar] = useState<CarResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editPickupHubId, setEditPickupHubId] = useState<number>(0)
  const [editReturnHubId, setEditReturnHubId] = useState<number>(0)
  const [editAddonIds, setEditAddonIds] = useState<number[]>([])
  const [editCarTypeId, setEditCarTypeId] = useState<number>(0)

  // Fetched data for edit mode
  const [hubs, setHubs] = useState<HubResponse[]>([])
  const [availableAddons, setAvailableAddons] = useState<AddonResponse[]>([])
  const [carTypes, setCarTypes] = useState<CarTypeResponse[]>([])

  const fetch = () => {
    setLoading(true)
    setError('')
    api.viewBooking(Number(bookingId))
      .then(b => {
        setData(b)
        if (b.assignedCarId) api.car(b.assignedCarId).then(setCar).catch(() => {})
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [bookingId])

  // When booking data loads, populate edit fields.
  //
  // The guard matters: this effect runs on every `data` change, and `data` is
  // refetched after a save. Without it, a customer part-way through a second
  // edit would watch their inputs reset underneath them. While edit mode is
  // open the form is the customer's, not the server's.
  useEffect(() => {
    if (!data) return
    if (editMode) return

    resetEditFields(data)
    setConfirmCancel(false)
    setCancelling(false)

    // Fetch hubs and addons for edit mode
    if (data.pickupHubId) {
      api.hub(data.pickupHubId).then(h => {
        api.hubs(h.stateId, h.cityId).then(setHubs).catch(() => {})
      }).catch(() => {})
      api.addons(data.pickupHubId).then(setAvailableAddons).catch(() => {})
      // Vehicle categories available at this hub, so the customer can switch.
      api.carTypes(data.pickupHubId).then(setCarTypes).catch(() => {})
    }
  }, [data])

  // Live calculation
  // rentalDays parses at local midnight, so this agrees with the booking
  // widget and with the server rather than drifting by a day near midnight.
  const days = (!editStartDate || !editEndDate)
    ? 0
    : rentalDays(editStartDate, editEndDate)

  const selectedCarType = carTypes.find(t => t.carTypeId === editCarTypeId)

  /**
   * Same monthly / weekly / daily tiering the server uses when it reprices,
   * so the figure shown here matches what gets saved.
   */
  const calcVehicleTotal = (days: number) => {
    if (!selectedCarType) {
      // Rate card not loaded yet - fall back to the stored per-day amount.
      if (data?.vehicleAmount && data.duration) {
        return Math.round((data.vehicleAmount / data.duration) * days)
      }
      return data?.vehicleAmount || 0
    }
    const months = Math.floor(days / 30)
    const remainder = days % 30
    const weeks = Math.floor(remainder / 7)
    const extraDays = remainder % 7
    return months * selectedCarType.monthlyRate
      + weeks * selectedCarType.weeklyRate
      + extraDays * selectedCarType.dailyRate
  }

  const vehicleAmount = editMode ? calcVehicleTotal(days) : (data?.vehicleAmount || 0)
  const addonAmount = editMode
    ? availableAddons.filter(a => editAddonIds.includes(a.addonId)).reduce((s, a) => s + a.pricePerDay * days, 0)
    : (data?.addonAmount || 0)
  const tax = editMode ? Math.round((vehicleAmount + addonAmount) * 0.18) : (data?.taxAmount || 0)
  const grandTotal = editMode ? vehicleAmount + addonAmount + tax : (data?.grandTotal || 0)

  const handleCancel = async () => {
    setCancelling(true)
    setError('')
    try {
      await api.cancelBooking(Number(bookingId))
      onBookingChanged()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Unable to cancel booking. Please try again.')
    } finally {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!data) return

    const today = TODAY

    // Once the vehicle is out, the start date is history - checking it
    // against today would block every change the customer is still allowed
    // to make. The server applies the same distinction.
    if (!limitedEdit && editStartDate < today) {
      setError('Start date cannot be in the past.'); return
    }
    if (editEndDate < today) { setError('Return date cannot be in the past.'); return }
    if (editEndDate <= editStartDate) { setError('Return date must be after the pick-up date.'); return }
    if (days < 1) { setError('Minimum rental period is 1 day.'); return }
    if (days > 30) { setError('Maximum rental period is 30 days.'); return }

    setSaving(true)
    setError('')
    setSuccessMsg('')

    const pickupHub = hubs.find(h => h.hubId === editPickupHubId)
    const dropHub = hubs.find(h => h.hubId === editReturnHubId)

    try {
      await api.updateBooking(Number(bookingId), {
        carTypeId: editCarTypeId,
        startDate: editStartDate,
        endDate: editEndDate,
        pickupHubId: editPickupHubId,
        pickupHubName: pickupHub?.hubName || data.pickupHubName,
        dropoffHubId: editReturnHubId,
        dropoffHubName: dropHub?.hubName || data.dropoffHubName,
        duration: days,
        vehicleAmount,
        addonAmount,
        taxAmount: tax,
        grandTotal,
        addons: availableAddons.filter(a => editAddonIds.includes(a.addonId)).map(a => ({
          addonId: a.addonId,
          addonName: a.addonName,
          addonPrice: a.pricePerDay * days,
        })),
      })
      setSuccessMsg('Booking updated successfully!')
      setEditMode(false)
      onBookingChanged()
      api.viewBooking(Number(bookingId)).then(setData).catch(() => {})
    } catch (e: any) {
      setError(e.message || 'Unable to update booking. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const enterEditMode = () => {
    setEditMode(true)
    setSuccessMsg('')
    setError('')
  }

  /**
   * Discards the in-progress edit and puts every field back to what the
   * booking actually says.
   *
   * This used to do `setEditAddonIds([])` - blanking the add-ons instead of
   * restoring them. Cancel an edit, open it again, and your add-ons had
   * silently vanished from the form; save at that point and they were gone
   * from the booking too. It also never restored the vehicle category.
   */
  const cancelEdit = () => {
    if (!data) return
    resetEditFields(data)
    setEditMode(false)
    setError('')
  }

  /** Puts every edit field back to the saved booking. */
  const resetEditFields = (b: BookingResponse) => {
    setEditStartDate(b.startDate)
    setEditEndDate(b.endDate)
    setEditPickupHubId(b.pickupHubId || 0)
    setEditReturnHubId(b.dropoffHubId || b.pickupHubId || 0)
    setEditAddonIds(b.addons.map(a => a.addonId))
    setEditCarTypeId(b.carTypeId ?? 0)
  }

  /**
   * Has the vehicle actually been handed over?
   *
   * This one flag drives both rules below, so they can never disagree about
   * which state the booking is in.
   */
  const handedOver = !!data && (!!data.assignedCarId || !!data.handoverDate)

  /**
   * Cancelling is off once the car is out.
   *
   * There is nothing left to cancel - the customer is driving it. Allowing it
   * would leave a car marked RENTED against a CANCELLED booking, which no
   * Return screen would ever list, so it could never come back into the
   * fleet. BookingServiceImpl.cancelBooking refuses it for the same reason.
   */
  const canCancel = !!data
    && (data.bookingStatus === 'CONFIRMED' || data.bookingStatus === 'PENDING')
    && !handedOver

  /**
   * Modifying stays on after hand-over, but narrows to two fields.
   *
   *   before hand-over - dates, hubs, vehicle category, add-ons
   *   after hand-over  - return date and return location only
   *
   * Both cases end at CANCELLED or COMPLETED. These are exactly the rules
   * BookingServiceImpl.updateBooking enforces - keeping them identical is
   * what stops the button offering something the server will refuse.
   */
  const isOpen = !!data
    && data.bookingStatus !== 'CANCELLED'
    && data.bookingStatus !== 'COMPLETED'

  const canModify = isOpen

  /** True when only the return date and location may be changed. */
  const limitedEdit = isOpen && handedOver

  /** Explains a disabled Cancel button instead of leaving it silently dead. */
  const cancelBlockedReason = (): string => {
    if (!data) return ''
    if (data.bookingStatus === 'CANCELLED') return 'This booking has already been cancelled.'
    if (data.bookingStatus === 'COMPLETED') return 'This rental is already complete.'
    if (handedOver) {
      return 'The vehicle has been handed over, so this booking can no longer be cancelled. '
           + 'You can still change your return date or return location below.'
    }
    return ''
  }

  /** Explains a disabled Modify button instead of leaving it silently dead. */
  const modifyBlockedReason = (): string => {
    if (!data) return ''
    if (data.bookingStatus === 'CANCELLED') return 'This booking has been cancelled.'
    if (data.bookingStatus === 'COMPLETED') return 'This rental is already complete.'
    return ''
  }

  // Rendered into document.body. The dashboard content sits inside
  // `animate-fade-in`, whose transform makes it the containing block for
  // anything `position: fixed` - so without the portal this backdrop covers
  // the content area rather than the screen. See components/shared.tsx.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-float w-full max-w-4xl ${editMode ? 'max-h-[92vh]' : 'max-h-[88vh]'} overflow-y-auto`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-black text-slate-900">
            Booking Details{data ? ` - #${data.bookingId}` : ''}
            {editMode && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ml-2">Editing</span>}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading booking details…</p>
          </div>
        )}

        {error && !cancelling && !saving && !editMode && (
          <div className="p-10 text-center">
            <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4">⚠ {error}</p>
            <Button onClick={fetch} variant="outline" size="sm">Retry</Button>
          </div>
        )}

        {successMsg && (
          <div className="px-6 pt-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800 font-semibold flex items-center gap-2">
              ✓ {successMsg}
            </div>
          </div>
        )}

        {data && !loading && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: Vehicle + Rental */}
            <div className="md:col-span-3 space-y-5">
              {/* Vehicle Info */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vehicle Information</h3>
                <div className="flex gap-4">
                  {(car?.image || data.carTypeImageUrl) && (
                    <img
                      src={car?.image || data.carTypeImageUrl || ''}
                      alt={data.carTypeName ?? 'Vehicle'}
                      className="w-28 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div>
                    {/* The category is always known - the actual car only
                        exists once staff assign one at hand-over. */}
                    <p className="font-bold text-slate-900">
                      {data.carTypeName ?? 'Vehicle'}
                    </p>
                    {car ? (
                      <>
                        <p className="text-sm text-slate-700 mt-0.5">
                          {car.brandName} {car.modelName} · {car.registrationNo}
                        </p>
                        <p className="text-xs text-slate-500">
                          {car.transmission} · {car.fuelType} · {car.seatCapacity} seats
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {data.carClass ? `${data.carClass} class · ` : ''}
                        Your exact vehicle is allocated at pick-up
                      </p>
                    )}
                  </div>
                </div>

                {/* Switch vehicle category while editing. Changing this
                    reprices the whole booking on the server.
                    Hidden once the vehicle is out - you cannot
                    retrospectively change which car you were given. */}
                {editMode && !limitedEdit && (
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">
                      Vehicle Type <span className="text-blue-600">(editable)</span>
                    </label>
                    {carTypes.length === 0 ? (
                      <p className="text-xs text-slate-400">Loading vehicle types…</p>
                    ) : (
                      <select
                        value={editCarTypeId}
                        onChange={e => setEditCarTypeId(Number(e.target.value))}
                        className="field"
                      >
                        {carTypes.map(t => (
                          <option key={t.carTypeId} value={t.carTypeId}>
                            {t.carType} — {F(t.dailyRate)}/day
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Changing the vehicle type recalculates your total.
                    </p>
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              {/* Rental Period */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Rental Period{editMode && <span className="text-blue-600 text-xs ml-1">(editable)</span>}
                </h3>
                {editMode ? (
                  <div className="space-y-3">
                    {limitedEdit && (
                      <div className="flex items-start gap-2 text-[13px] text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                        <span>
                          Your vehicle is already out, so the pick-up details are
                          fixed. You can still change when and where you bring it
                          back - the cost updates to match.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">
                          Start Date{limitedEdit && <span className="text-slate-400"> (fixed)</span>}
                        </label>
                        {limitedEdit ? (
                          <div className="field bg-slate-100 text-slate-600">{editStartDate}</div>
                        ) : (
                          <input type="date" min={TODAY} value={editStartDate}
                            onChange={e => {
                              setEditStartDate(e.target.value)
                              // Keep the pair legal: a return on or before the
                              // pick-up day is not a rental.
                              if (e.target.value && editEndDate <= e.target.value) {
                                setEditEndDate(addDays(e.target.value, 1))
                              }
                            }}
                            className="field" />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">
                          End Date{limitedEdit && <span className="text-blue-600"> (editable)</span>}
                        </label>
                        {/* Once the car is out the return date cannot be moved
                            into the past - the server refuses it too. */}
                        <input type="date"
                          min={limitedEdit
                            ? (TODAY > editStartDate ? TODAY : addDays(editStartDate, 1))
                            : addDays(editStartDate || TODAY, 1)}
                          value={editEndDate}
                          onChange={e => setEditEndDate(e.target.value)}
                          className="field" />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Calendar size={12} /> Duration: <span className="font-semibold text-slate-700">{days} day{days !== 1 ? 's' : ''}</span>
                    </div>

                    {hubs.length > 0 && (
                      <>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1 block">
                            Pick-up Location{limitedEdit && <span className="text-slate-400"> (fixed)</span>}
                          </label>
                          {limitedEdit ? (
                            <div className="field bg-slate-100 text-slate-600">
                              {data.pickupHubName}
                            </div>
                          ) : (
                            <select value={editPickupHubId} onChange={e => setEditPickupHubId(Number(e.target.value))}
                              className="field">
                              {hubs.map(h => (
                                <option key={h.hubId} value={h.hubId}>{h.hubName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1 block">
                            Return Location{limitedEdit && <span className="text-blue-600"> (editable)</span>}
                          </label>
                          <select value={editReturnHubId} onChange={e => setEditReturnHubId(Number(e.target.value))}
                            className="field">
                            {hubs.map(h => (
                              <option key={h.hubId} value={h.hubId}>{h.hubName}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-700">Pick-up</p>
                        <p className="text-slate-500">{data.pickupHubName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-700">Return</p>
                        <p className="text-slate-500">{data.dropoffHubName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                      <Calendar size={12} />
                      <span>{data.startDate} → {data.endDate}</span>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{data.duration} days</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Customer</h3>
                <p className="text-sm font-semibold text-slate-800">{data.customerName}</p>
                <p className="text-xs text-slate-500">{data.email}</p>
              </div>

              {/* Add-ons (editable in edit mode) */}
              {editMode && (
                <>
                  <hr className="border-slate-100" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add-ons</h3>
                    {availableAddons.length === 0 ? (
                      <p className="text-xs text-slate-400">No add-ons available</p>
                    ) : (
                      <div className="space-y-2">
                        {availableAddons.map(a => {
                          const checked = editAddonIds.includes(a.addonId)
                          return (
                            <label key={a.addonId} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${checked ? 'border-blue-200 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                              <input type="checkbox" checked={checked} onChange={() => {
                                setEditAddonIds(prev => checked ? prev.filter(id => id !== a.addonId) : [...prev, a.addonId])
                              }} className="w-4 h-4 accent-blue-600 rounded" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{a.addonName}</p>
                                {a.description && <p className="text-xs text-slate-400 truncate">{a.description}</p>}
                              </div>
                              <span className="text-sm font-semibold text-slate-700">{F(a.pricePerDay)}<span className="text-xs font-normal text-slate-400">/day</span></span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Cost + Status + Actions */}
            <div className="md:col-span-2 space-y-5">
              {/* Cost Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Cost Breakdown{editMode && <span className="text-blue-600 text-xs ml-1">(estimated)</span>}
                </h3>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vehicle Amount</span>
                    <span className="font-semibold">{F(vehicleAmount)}</span>
                  </div>
                  {editMode ? (
                    availableAddons.filter(a => editAddonIds.includes(a.addonId)).map(a => (
                      <div key={a.addonId} className="flex justify-between">
                        <span className="text-slate-600">{a.addonName}</span>
                        <span className="font-semibold">{F(a.pricePerDay * days)}</span>
                      </div>
                    ))
                  ) : (
                    data.addonAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Add-ons Total</span>
                        <span className="font-semibold">{F(data.addonAmount)}</span>
                      </div>
                    )
                  )}
                  {addonAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Add-ons Total</span>
                      <span className="font-semibold">{F(addonAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax (18%)</span>
                    <span className="font-semibold">{F(tax)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-3 flex justify-between">
                    <span className="font-bold text-slate-800">Grand Total</span>
                    <span className="font-black text-blue-600 text-lg">{F(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
                <Badge label={data.bookingStatus} dot />
              </div>

              {/* Error in edit mode */}
              {error && (editMode || saving) && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3">{error}</p>
              )}

              {/* Confirmation dialog for cancel */}
              {confirmCancel && (
                <div className="bg-red-50 rounded-2xl p-4 space-y-3 border border-red-200">
                  <p className="text-sm font-semibold text-red-800">Are you sure you want to cancel this booking?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
                      No, Keep Booking
                    </Button>
                    <Button size="sm" onClick={handleCancel} disabled={cancelling} className="!bg-red-600 hover:!bg-red-700 text-white">
                      {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Error during cancel */}
              {error && cancelling && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              {/* Action buttons */}
              {editMode ? (
                <div className="space-y-2">
                  <Button fullWidth size="sm" onClick={handleSaveChanges} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Button fullWidth size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              ) : (
                !confirmCancel && (
                  <div className="space-y-2">
                    <Button fullWidth size="sm" className="!bg-red-600 hover:!bg-red-700 text-white" disabled={!canCancel || cancelling} onClick={() => { setError(''); setConfirmCancel(true) }}>
                      <X size={14} /> Cancel Booking
                    </Button>
                    {!canCancel && cancelBlockedReason() && (
                      <p className="text-[13px] text-slate-500 text-center px-2 leading-snug">
                        {cancelBlockedReason()}
                      </p>
                    )}
                    <Button fullWidth size="sm" variant="outline" disabled={!canModify} onClick={enterEditMode}>
                      <Calendar size={14} />
                      {limitedEdit ? 'Change Return Date / Location' : 'Modify Booking'}
                    </Button>
                    {!canModify && modifyBlockedReason() && (
                      <p className="text-xs text-slate-400 text-center px-2">
                        {modifyBlockedReason()}
                      </p>
                    )}
                    <Button onClick={onClose} fullWidth variant="outline">Close</Button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    ,
    document.body,
  )
}

/** Keeps only digits and caps the length - used for phone and pincode. */
function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

const F = (n: number) => '\u20B9' + (Number.isInteger(n) ? n.toString() : n.toFixed(2))

export default function CustomerDashboard({ nav }: { nav: NavFn }) {
  const cu = getCurrentUser()
  // Open on the tab the caller asked for. "My Profile" in the header sets
  // 'my-info', so it lands straight on the profile instead of dropping the
  // customer on the dashboard and making them click a second time.
  const [activeTab, setActiveTab] = useState(() => {
    const requested = sessionStorage.getItem('openTab')
    // Read once and clear, otherwise every later visit reopens the same tab.
    sessionStorage.removeItem('openTab')
    return requested && navItems.some(n => n.id === requested)
      ? requested
      : 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [viewBookingId, setViewBookingId] = useState('')
  const [manageBookingId, setManageBookingId] = useState('')
  const [viewInvoiceId, setViewInvoiceId] = useState('')
  const [dashboardVersion, setDashboardVersion] = useState(0)

  const handleSignOut = () => {
    logout()
    nav('login')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <DashboardContent
          key={dashboardVersion}
          nav={nav}
          onViewDetails={id => setViewBookingId(id)}
          goToBookings={() => setActiveTab('my-bookings')}
        />
      )
      case 'my-info': return <MyInfoContent />
      case 'my-bookings': return <MyBookingsContent key={dashboardVersion} onViewDetails={id => setViewBookingId(id)} onManageBooking={id => setManageBookingId(id)} />
      case 'invoices': return <InvoicesContent onViewInvoice={id => setViewInvoiceId(id)} />
      case 'change-pw': return <ChangePasswordContent />
      case 'support': return <SupportContent />
      default: return <DashboardContent nav={nav} onViewDetails={id => setViewBookingId(id)} goToBookings={() => setActiveTab('my-bookings')} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Mobile sidebar backdrop */}
      {mobileSidebar && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileSidebar(false)} />}

      {/* Sidebar */}
      <aside className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-slate-100 shadow-sm flex-shrink-0 z-30 ${mobileSidebar ? 'fixed inset-y-0 left-0' : 'hidden lg:flex'}`}>
        {/* Logo */}
        <div className="flex items-center h-16 border-b border-slate-100 px-4 gap-3 flex-shrink-0">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in overflow-hidden">
              <span className="font-black text-slate-900 text-lg tracking-tight">FLEMAN</span>
              <span className="block text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md w-fit">Customer</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-0.5 px-2">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileSidebar(false) }}
                className={`sidebar-item w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  isActive ? 'sidebar-item-active font-semibold' : 'text-slate-600 font-medium'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-[15px] flex-1 animate-fade-in whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 p-2 rounded-xl animate-fade-in">
              <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {cu.firstName?.charAt(0) || 'G'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 truncate">{cu.firstName} {cu.lastName}</p>
                <p className="text-xs text-slate-500 truncate">{cu.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="h-[4.5rem] bg-white border-b border-slate-200 flex items-center px-6 gap-4 shadow-sm flex-shrink-0 z-10">
          <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => nav('landing')} className="text-slate-500 hover:text-blue-600 font-semibold text-[15px] transition-colors flex items-center gap-1.5">
              <Home size={16} /> Home
            </button>
            <ChevronRight size={15} className="text-slate-300" />
            <span className="text-slate-900 font-bold text-[15px]">{navItems.find(n => n.id === activeTab)?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {cu.firstName?.charAt(0) || 'G'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{cu.firstName} {cu.lastName}</p>
                  <p className="text-xs text-slate-500">{cu.email}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-float border border-slate-100 z-50 animate-scale-in py-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800">{cu.firstName} {cu.lastName}</p>
                      <p className="text-xs text-slate-500">{cu.email}</p>
                    </div>
                    <button onClick={() => { setProfileOpen(false); setActiveTab('my-info') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      <User size={15} className="text-slate-400" /> My Profile
                    </button>
                    <button onClick={() => { setProfileOpen(false); setActiveTab('change-pw') }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      <Lock size={15} className="text-slate-400" /> Settings
                    </button>
                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>

      {viewBookingId && (
        <ViewDetailsModal bookingId={viewBookingId} onClose={() => setViewBookingId('')} />
      )}
      {viewInvoiceId && (
        <ViewInvoiceModal bookingId={viewInvoiceId} onClose={() => setViewInvoiceId('')} />
      )}
      {manageBookingId && (
        <ManageBookingModal bookingId={manageBookingId} onClose={() => setManageBookingId('')} onBookingChanged={() => setDashboardVersion(v => v + 1)} />
      )}
    </div>
  )
}
