import { useEffect, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, Fuel, Car as CarIcon, Calendar, RotateCcw, Eye,
  ArrowLeftRight,
} from 'lucide-react'
import type { NavFn } from '../../data'
import { api, session } from '../../api'
import type { BookingResponse, CarResponse } from '../../api'
import {
  Button, Card, Badge, SectionHeader, Input, Toast, EmptyState, Stepper,
} from '../../components/shared'
import { BookingDetailsModal } from '../../components/BookingDetailsModal'
import { BookingIdSearch } from '../../components/BookingIdSearch'
import { ChangeLocations } from '../../components/ChangeLocations'

// ── Small shared pieces ──────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function money(value: number | null) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}

/**
 * Days before its service date that a car stops being rentable.
 * Mirrors RentalPricingCalculator.SERVICE_BLACKOUT_DAYS - the server is what
 * actually enforces it; this is so staff are not offered a car that will be
 * refused.
 */
const SERVICE_BLACKOUT_DAYS = 3

/** True when a booking would run into this car's service window. */
function clashesWithService(
  serviceDueDate: string | null,
  bookingStart: string,
  bookingEnd: string,
) {
  if (!serviceDueDate) return false
  const due = new Date(`${serviceDueDate.split('T')[0]}T00:00:00`)
  const from = new Date(due)
  from.setDate(from.getDate() - SERVICE_BLACKOUT_DAYS)

  const inWindow = (d: string) => {
    if (!d) return false
    const day = new Date(`${d.split('T')[0]}T00:00:00`)
    return day >= from && day <= due
  }
  // Both ends: a rental that starts clear but ENDS inside the window would
  // still have the car out on the day it is due in the workshop.
  return inWindow(bookingStart) || inWindow(bookingEnd)
}

/** Fuel level picker - the BRD asks for 1/4, 1/2, 3/4 and Full. */
function FuelPicker({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  const options = [
    { label: '¼', value: 25 },
    { label: '½', value: 50 },
    { label: '¾', value: 75 },
    { label: 'Full', value: 100 },
  ]
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Fuel size={15} className="text-blue-600" /> {label}
      </p>
      <div className="flex gap-2">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
              value === o.value
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">Selected: {value}%</p>
    </div>
  )
}

/** Booking summary card reused by both flows. */
function BookingSummary({ booking, onView }: {
  booking: BookingResponse
  onView: () => void
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase">Booking</p>
          <p className="text-xl font-black text-slate-900">#{booking.bookingId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={booking.bookingStatus} />
          <Button size="xs" variant="outline" icon={<Eye size={13} />} onClick={onView}>
            View
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <Detail label="Customer" value={booking.customerName || 'Guest'} />
        <Detail label="Phone" value={booking.phone ?? '—'} />
        <Detail label="Driving licence" value={booking.drivingLicenseNo ?? '—'} />
        <Detail label="Duration" value={`${booking.duration} day(s)`} />
        <Detail label="Pick-up" value={booking.pickupHubName} />
        <Detail label="Drop-off" value={booking.dropoffHubName} />
        <Detail label="Start date" value={formatDate(booking.startDate)} />
        <Detail label="End date" value={formatDate(booking.endDate)} />
      </div>

      {booking.addons.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Add-ons</p>
          <div className="flex flex-wrap gap-1.5">
            {booking.addons.map(a => (
              <span
                key={a.bookingDetailId}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-600"
              >
                {a.addonName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 flex justify-between text-sm">
        <span className="font-bold text-slate-700">Grand total</span>
        <span className="font-black text-slate-900">{money(booking.grandTotal)}</span>
      </div>
    </Card>
  )
}

/** Left-hand list of bookings waiting for an action. */
function BookingPicker({
  bookings,
  selectedId,
  onSelect,
  onView,
  emptyTitle,
  emptyText,
}: {
  bookings: BookingResponse[]
  selectedId: number | null
  onSelect: (b: BookingResponse) => void
  onView: (b: BookingResponse) => void
  emptyTitle: string
  emptyText: string
}) {
  if (bookings.length === 0) {
    return (
      <Card>
        <EmptyState icon={<Calendar size={26} />} title={emptyTitle} description={emptyText} />
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {bookings.map(b => (
        <button
          key={b.bookingId}
          onClick={() => onSelect(b)}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
            selectedId === b.bookingId
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800">#{b.bookingId}</span>
            <div className="flex items-center gap-1.5">
              <Badge label={b.bookingStatus} />
              {/* A span, not a button: a button inside a button is invalid
                  HTML and the browser drops the inner click handler. */}
              <span
                role="button"
                tabIndex={0}
                title="View full details"
                onClick={e => { e.stopPropagation(); onView(b) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onView(b) }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 transition-colors cursor-pointer"
              >
                <Eye size={14} />
              </span>
            </div>
          </div>
          <p className="text-[15px] text-slate-600 mt-1">{b.customerName || 'Guest'}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDate(b.startDate)} → {formatDate(b.endDate)}
          </p>
          {b.assignedCarRegistrationNo && (
            <p className="text-xs text-blue-600 font-semibold mt-1">
              {b.assignedCarRegistrationNo}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Hand-over ────────────────────────────────────────────────────────────────

const HANDOVER_STEPS = ['Select booking', 'Assign vehicle', 'Fuel & confirm']

export function Handover({ nav: _nav }: { nav: NavFn }) {
  const [pending, setPending] = useState<BookingResponse[]>([])
  const [cars, setCars] = useState<CarResponse[]>([])
  const [selected, setSelected] = useState<BookingResponse | null>(null)
  const [carId, setCarId] = useState<number | null>(null)
  const [fuelLevelOut, setFuelLevelOut] = useState(100)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [viewing, setViewing] = useState<BookingResponse | null>(null)

  const hubId = session.getStaffHubId()

  const [loadingCars, setLoadingCars] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // PICKUP scope: this hub's own work queue. Anything belonging to
      // another hub is reached through the ID search above, not by wading
      // through a national list.
      const page = await api.staffBookings(0, 50, 'PENDING', 'PICKUP')
      setPending(page.bookings ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  /**
   * Loads the vehicles staff may actually hand over for this booking:
   * AVAILABLE cars at this hub, of the car type the customer booked.
   *
   * Showing the whole fleet would invite handing over the wrong category -
   * the backend rejects that anyway, so filtering here saves a failed attempt.
   */
  /**
   * Vehicles this staff member can actually hand over.
   *
   * YOUR OWN hub's fleet, of the category the customer booked - not the
   * booking's original pick-up hub. A customer who walks into Indore
   * collects an Indore car, and confirming the hand-over moves the booking's
   * pick-up hub to match. Listing the original hub's cars would offer a
   * vehicle standing hundreds of miles away.
   */
  const loadCarsFor = async (booking: BookingResponse) => {
    if (!hubId || !booking.carTypeId) {
      setCars([])
      return
    }
    setLoadingCars(true)
    setCars([])
    try {
      setCars(await api.carsByHubAndType(
        hubId, booking.carTypeId, 'AVAILABLE'))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingCars(false)
    }
  }

  const reset = () => {
    setSelected(null)
    setCarId(null)
    setFuelLevelOut(100)
  }

  // Step 0 = pick booking, 1 = assign vehicle, 2 = fuel + confirm
  const step = !selected ? 0 : selected.assignedCarId ? 2 : 1

  const handleAssign = async () => {
    if (!selected || !carId) return
    setWorking(true)
    setError('')
    try {
      await api.assignVehicle({ bookingId: selected.bookingId, carId })
      const fresh = await api.staffBooking(selected.bookingId)
      setSelected(fresh)
      setToast(`Vehicle assigned to booking #${selected.bookingId}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setWorking(false)
    }
  }

  const handleConfirm = async () => {
    if (!selected) return
    setWorking(true)
    setError('')
    try {
      await api.confirmHandover({
        bookingId: selected.bookingId,
        fuelLevelOut,
      })
      setToast(`Hand-over complete for booking #${selected.bookingId}`)
      reset()
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
        title="Vehicle Hand-over"
        subtitle="Assign a vehicle, record the fuel level and release the car"
      />

      <Stepper steps={HANDOVER_STEPS} current={step} />

      {/* Look a booking up by ID, from any hub. The list below is scoped to
          this hub's pick-ups; this is how staff find everything else. */}
      <BookingIdSearch
        className="md:w-[26rem]"
        placeholder="Find any booking by ID, including other hubs..."
        onFound={b => {
          if (b.bookingStatus === 'PENDING') {
            setSelected(b)
            setCarId(null)
            setError('')
            loadCarsFor(b)
          }
          setViewing(b)
        }}
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* Left: bookings awaiting hand-over */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">
              Awaiting hand-over ({pending.length})
            </h3>
            <BookingPicker
              bookings={pending}
              selectedId={selected?.bookingId ?? null}
              onSelect={b => {
                setSelected(b)
                setCarId(null)
                setError('')
                loadCarsFor(b)
              }}
              onView={setViewing}
              emptyTitle="Nothing to hand over"
              emptyText="Bookings with status PENDING at your hub show up here."
            />
          </div>

          {/* Right: the actual hand-over */}
          {!selected ? (
            <Card>
              <EmptyState
                icon={<CarIcon size={28} />}
                title="Select a booking to begin"
                description="Pick a booking from the list on the left."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <BookingSummary booking={selected} onView={() => setViewing(selected)} />

              <ChangeLocations
                booking={selected}
                onUpdated={updated => {
                  setSelected(updated)
                  // The car pool follows the pick-up hub, so reload it.
                  loadCarsFor(updated)
                  load()
                }}
              />

              {/* Step: assign vehicle */}
              {!selected.assignedCarId ? (
                <Card className="p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800">Assign a vehicle</h3>
                    {selected.carTypeName && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                        Booked category: {selected.carTypeName}
                      </span>
                    )}
                  </div>

                  {loadingCars ? (
                    <div className="space-y-2">
                      {[0, 1].map(i => (
                        <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : cars.length === 0 ? (
                    <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>
                        No <strong>{selected.carTypeName ?? 'matching'}</strong> vehicle is
                        available in your hub's fleet right now. Wait for one to be
                        returned, or free one up from the Vehicles screen. Handing this
                        booking over here will move its pick-up location to your hub.
                      </span>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {cars.map(car => {
                        const dueForService = clashesWithService(
                          car.serviceDueDate, selected.startDate, selected.endDate)
                        return (
                        <button
                          key={car.carId}
                          onClick={() => !dueForService && setCarId(car.carId)}
                          disabled={dueForService}
                          title={dueForService
                            ? `Due for service on ${formatDate(car.serviceDueDate)}`
                            : undefined}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            dueForService
                              ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                              : carId === car.carId
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="font-semibold text-slate-800 text-sm">
                            {car.brandName} {car.modelName}
                          </p>
                          <p className="text-xs text-slate-500">{car.registrationNo}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {car.fuelType} · {car.transmission} · {car.seatCapacity} seats
                          </p>
                          {dueForService && (
                            <p className="text-xs font-semibold text-amber-700 mt-1.5">
                              Due for service {formatDate(car.serviceDueDate)} — unavailable
                            </p>
                          )}
                        </button>
                        )
                      })}
                    </div>
                  )}

                  <Button
                    onClick={handleAssign}
                    disabled={!carId}
                    loading={working}
                    fullWidth
                  >
                    Assign selected vehicle
                  </Button>
                </Card>
              ) : (
                /* Step: fuel + confirm */
                <Card className="p-5 space-y-5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-800">Vehicle assigned</p>
                      <p className="text-green-700">
                        {selected.assignedCarBrandName} {selected.assignedCarModelName} ·{' '}
                        {selected.assignedCarRegistrationNo}
                      </p>
                    </div>
                  </div>

                  <FuelPicker
                    label="Fuel level at hand-over"
                    value={fuelLevelOut}
                    onChange={setFuelLevelOut}
                  />

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={reset} fullWidth>
                      Cancel
                    </Button>
                    <Button onClick={handleConfirm} loading={working} fullWidth>
                      Confirm hand-over
                    </Button>
                  </div>

                  <p className="text-xs text-slate-400">
                    Confirming marks the booking CONFIRMED, sets the vehicle to
                    RENTED and records the hand-over date.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Opened from the list or from an ID search. When the booking can
          actually be handed over, the popup offers that rather than making
          the staff member close it and hunt for the row they just found. */}
      <BookingDetailsModal
        booking={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing && viewing.bookingStatus === 'PENDING' ? (
            <Button
              size="sm"
              icon={<ArrowLeftRight size={14} />}
              onClick={() => {
                setSelected(viewing)
                setCarId(null)
                setError('')
                loadCarsFor(viewing)
                setViewing(null)
              }}
            >
              Proceed to hand-over
            </Button>
          ) : null
        }
      />
    </div>
  )
}

// ── Return ───────────────────────────────────────────────────────────────────

export function Returns({ nav: _nav }: { nav: NavFn }) {
  const [active, setActive] = useState<BookingResponse[]>([])
  const [selected, setSelected] = useState<BookingResponse | null>(null)
  const [fuelLevelIn, setFuelLevelIn] = useState(100)
  // No fuel-charge input any more: the amount follows from the two gauge
  // readings. Mirrors RentalPricingCalculator.FULL_TANK_CHARGE on the server,
  // which is the figure that actually gets billed.
  const FULL_TANK_CHARGE = 40
  const [viewing, setViewing] = useState<BookingResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // RETURN scope: vehicles due back at this hub.
      const page = await api.staffBookings(0, 50, 'CONFIRMED', 'RETURN')
      setActive(page.bookings ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const reset = () => {
    setSelected(null)
    setFuelLevelIn(100)
  }

  /** Missing fuel, in percentage points. Never negative. */
  const fuelMissing = selected?.fuelLevelOut != null
    ? Math.max(0, selected.fuelLevelOut - fuelLevelIn)
    : 0

  const chargesValue = Number(((FULL_TANK_CHARGE * fuelMissing) / 100).toFixed(2))

  const handleReturn = async () => {
    if (!selected) return
    setWorking(true)
    setError('')
    try {
      await api.returnVehicle({
        bookingId: selected.bookingId,
        fuelLevelIn,
        // Sent for older-client compatibility only - the server recalculates
        // it from the fuel levels and ignores whatever arrives here.
        fuelCharges: chargesValue,
      })
      setToast(`Booking #${selected.bookingId} completed`)
      reset()
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
        title="Vehicle Return"
        subtitle="Record the fuel level and any fuel charges, then close the booking"
      />

      <BookingIdSearch
        className="md:w-[26rem]"
        placeholder="Find any booking by ID, including other hubs..."
        onFound={b => {
          if (b.bookingStatus === 'CONFIRMED') {
            setSelected(b)
            setError('')
          }
          setViewing(b)
        }}
      />

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">
              Vehicles on rent ({active.length})
            </h3>
            <BookingPicker
              bookings={active}
              selectedId={selected?.bookingId ?? null}
              onSelect={b => { setSelected(b); setError('') }}
              onView={setViewing}
              emptyTitle="No vehicles are out"
              emptyText="Bookings that have been handed over show up here."
            />
          </div>

          {!selected ? (
            <Card>
              <EmptyState
                icon={<RotateCcw size={28} />}
                title="Select a booking to process the return"
                description="Pick a booking from the list on the left."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              <BookingSummary booking={selected} onView={() => setViewing(selected)} />

              <ChangeLocations
                booking={selected}
                onUpdated={updated => { setSelected(updated); load() }}
              />

              <Card className="p-5 space-y-5">
                <h3 className="font-bold text-slate-800">Return details</h3>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <Detail
                    label="Vehicle"
                    value={
                      selected.assignedCarRegistrationNo
                        ? `${selected.assignedCarBrandName} ${selected.assignedCarModelName} (${selected.assignedCarRegistrationNo})`
                        : '—'
                    }
                  />
                  <Detail label="Handed over" value={formatDate(selected.handoverDate)} />
                  <Detail
                    label="Fuel at hand-over"
                    value={selected.fuelLevelOut != null ? `${selected.fuelLevelOut}%` : '—'}
                  />
                  <Detail label="Returning on" value={formatDate(new Date().toISOString())} />
                </div>

                <FuelPicker
                  label="Fuel level on return"
                  value={fuelLevelIn}
                  onChange={setFuelLevelIn}
                />

                {/* Calculated, not typed. The staff member records what they
                    SEE - the two fuel levels - and the charge follows. */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Fuel charge
                    </p>
                  </div>
                  <div className="p-4 space-y-2 text-[15px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">At hand-over</span>
                      <span className="font-semibold text-slate-800">
                        {selected.fuelLevelOut != null ? `${selected.fuelLevelOut}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">On return</span>
                      <span className="font-semibold text-slate-800">{fuelLevelIn}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Missing</span>
                      <span className="font-semibold text-slate-800">
                        {fuelMissing}%{fuelMissing > 0 ? ` of a tank` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2.5 mt-1">
                      <span className="font-bold text-slate-800">To charge</span>
                      <span className="font-black text-blue-600 text-xl">
                        {money(chargesValue)}
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-500 pt-1">
                      A full tank is {money(FULL_TANK_CHARGE)}, charged in
                      proportion to what is missing. Returning with more fuel
                      than it left with is not refunded.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={reset} fullWidth>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReturn}
                    loading={working}
                    fullWidth
                  >
                    Complete return
                  </Button>
                </div>

                <p className="text-xs text-slate-400">
                  Completing the return marks the booking COMPLETED, sets the
                  vehicle back to AVAILABLE and records today as the return date.
                </p>
              </Card>
            </div>
          )}
        </div>
      )}

      <BookingDetailsModal
        booking={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing && viewing.bookingStatus === 'CONFIRMED' ? (
            <Button
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => {
                setSelected(viewing)
                setError('')
                setViewing(null)
              }}
            >
              Proceed to return
            </Button>
          ) : null
        }
      />
    </div>
  )
}

// The staff Invoices screen now lives in its own file: screens/staff/Invoices.tsx
