import { useState } from 'react'
import { Search, ArrowLeft, Calendar, MapPin, Car, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { bookings } from '../data'
import type { NavFn } from '../data'
import { PublicPage } from '../components/SiteChrome'
import { Button, Card, Badge, Modal, Input } from '../components/shared'

export default function ModifyBooking({ nav }: { nav: NavFn }) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<typeof bookings[0] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [showModify, setShowModify] = useState(false)

  const handleSearch = () => {
    const b = bookings.find(b => b.bookingNo.toLowerCase() === query.toLowerCase().trim())
    if (b) { setFound(b); setNotFound(false) }
    else { setNotFound(true); setFound(null) }
  }

  const handleCancel = () => { setCancelled(true); setShowCancelConfirm(false) }

  return (
    <PublicPage nav={nav}>
    <div className="px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => nav('landing')} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Manage Your Booking</h1>
            <p className="text-slate-500 text-sm">Search by booking reference number to modify or cancel</p>
          </div>
        </div>

        {/* Search */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Find Your Booking</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. FLM-2024-001"
                className="field field-icon"
              />
            </div>
            <Button onClick={handleSearch} size="lg">
              <Search size={16} /> Search
            </Button>
          </div>

          {notFound && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
              <AlertTriangle size={16} />
              <span>Booking not found. Please check your booking reference.</span>
            </div>
          )}

          {/* Sample numbers hint */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400">Try:</span>
            {['FLM-2024-001', 'FLM-2024-002', 'FLM-2024-003'].map(n => (
              <button key={n} onClick={() => setQuery(n)} className="text-xs font-mono font-semibold text-blue-600 hover:underline">{n}</button>
            ))}
          </div>
        </Card>

        {/* Result */}
        {found && !cancelled && (
          <Card className="p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-900 text-lg">{found.bookingNo}</h3>
                  <Badge label={found.status} />
                </div>
                <p className="text-slate-500 text-sm">Booked by {found.customer}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Car size={12} /> Vehicle Details
                </h4>
                <div>
                  <p className="font-bold text-slate-800">{found.vehicle}</p>
                  <p className="text-sm text-slate-500">Plate: Auto-assigned</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} /> Duration
                </h4>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="text-slate-600">Pickup: <strong className="text-slate-800">{found.pickupDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1.5">
                    <span className="w-2 h-2 bg-green-600 rounded-full" />
                    <span className="text-slate-600">Return: <strong className="text-slate-800">{found.returnDate}</strong></span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} /> Locations
                </h4>
                <p className="text-sm"><strong className="text-slate-700">Pickup:</strong> <span className="text-slate-600">{found.pickup}</span></p>
                <p className="text-sm"><strong className="text-slate-700">Return:</strong> <span className="text-slate-600">{found.return_}</span></p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pricing</h4>
                <p className="text-2xl font-black text-blue-600">₹{found.total}</p>
                <p className="text-xs text-slate-400">Deposit paid: ₹{found.deposit}</p>
              </div>
            </div>

            {found.status !== 'Cancelled' && found.status !== 'Completed' && (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <Button onClick={() => setShowModify(true)} variant="outline">
                  <Calendar size={16} /> Modify Dates
                </Button>
                <Button onClick={() => setShowCancelConfirm(true)} variant="danger">
                  <X size={16} /> Cancel Booking
                </Button>
              </div>
            )}

            {(found.status === 'Cancelled' || found.status === 'Completed') && (
              <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                This booking cannot be modified as it is {found.status.toLowerCase()}.
              </div>
            )}
          </Card>
        )}

        {/* Cancelled Success */}
        {cancelled && (
          <Card className="p-8 text-center animate-scale-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Booking Cancelled</h3>
            <p className="text-slate-500 mb-2">Your booking <strong>{found?.bookingNo}</strong> has been cancelled.</p>
            <p className="text-sm text-slate-400 mb-6">Refund of <strong className="text-green-600">₹{found ? found.total - 150 : 0}</strong> will be processed within 5–7 business days.</p>
            <Button onClick={() => nav('landing')}>Back to Home</Button>
          </Card>
        )}

        {/* Cancel Confirm Modal */}
        <Modal open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} title="Cancel Booking?">
          <div className="p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Cancellation Policy</p>
                <p className="text-sm text-amber-700 mt-1">A cancellation fee of ₹150 applies. You will receive a refund of <strong>₹{found ? found.total - 150 : 0}</strong> within 5–7 business days.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">Are you sure you want to cancel booking <strong>{found?.bookingNo}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowCancelConfirm(false)} variant="outline" fullWidth>Keep Booking</Button>
              <Button onClick={handleCancel} variant="danger" fullWidth>Yes, Cancel</Button>
            </div>
          </div>
        </Modal>

        {/* Modify Modal */}
        <Modal open={showModify} onClose={() => setShowModify(false)} title="Modify Booking">
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">Update your rental dates and locations.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="New Pickup Date" type="date" defaultValue={found?.pickupDate} />
              <Input label="New Return Date" type="date" defaultValue={found?.returnDate} />
            </div>
            <Input label="Pickup Location" defaultValue={found?.pickup} />
            <Input label="Return Location" defaultValue={found?.return_} />
            <div className="flex gap-3 pt-2">
              <Button onClick={() => setShowModify(false)} variant="outline" fullWidth>Cancel</Button>
              <Button onClick={() => setShowModify(false)} fullWidth>Save Changes</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
    </PublicPage>
  )
}
