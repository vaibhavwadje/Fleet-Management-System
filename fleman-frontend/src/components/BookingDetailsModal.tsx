// One booking-details popup, shared by every staff screen.
//
// The staff area used to have its own cramped variant while the customer
// dashboard had a nicer two-column one. This is the customer dashboard's
// layout, lifted into a component so Bookings, Hand-over and Returns all show
// the same thing and there is only one place to change it.

import { MapPin, Calendar, Car as CarIcon, User } from 'lucide-react'
import type { ReactNode } from 'react'
import type { BookingResponse } from '../api'
import { Button, Badge, Modal } from './shared'

function money(value: number | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** A small uppercase heading above a block of detail. */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
      {children}
    </h3>
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

function CostRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'border-t border-slate-200 pt-2.5 mt-1' : ''}`}>
      <span className={bold ? 'font-bold text-slate-800' : 'text-slate-600'}>{label}</span>
      <span className={bold ? 'font-black text-blue-600 text-lg' : 'font-semibold text-slate-800'}>
        {value}
      </span>
    </div>
  )
}

export function BookingDetailsModal({
  booking,
  open,
  onClose,
  actions,
}: {
  booking: BookingResponse | null
  open: boolean
  onClose: () => void
  /** Extra buttons for the footer, e.g. "Cancel booking". */
  actions?: ReactNode
}) {
  return (
    <Modal
      open={open && !!booking}
      onClose={onClose}
      title={booking ? `Booking #${booking.bookingId}` : ''}
      subtitle={booking ? `Placed by ${booking.customerName || 'Guest'}` : undefined}
      maxWidth="max-w-4xl"
      footer={
        <>
          {actions}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </>
      }
    >
      {booking && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left: vehicle, rental period, customer */}
          <div className="md:col-span-3 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <Badge label={booking.bookingStatus} />
              <span className="text-sm text-slate-500">
                Booked {formatDate(booking.bookingDate)}
              </span>
            </div>

            <div>
              <SectionTitle>Vehicle</SectionTitle>
              <div className="flex gap-4">
                {booking.carTypeImageUrl ? (
                  <img
                    src={booking.carTypeImageUrl}
                    alt={booking.carTypeName ?? 'Vehicle'}
                    className="w-28 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-28 h-20 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <CarIcon size={26} className="text-slate-300" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-slate-900 text-[15px]">
                    {booking.carTypeName ?? 'Vehicle'}
                  </p>
                  {booking.assignedCarRegistrationNo ? (
                    <p className="text-[15px] text-slate-700 mt-0.5">
                      {booking.assignedCarBrandName} {booking.assignedCarModelName} ·{' '}
                      {booking.assignedCarRegistrationNo}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 mt-0.5">
                      No vehicle assigned yet — staff allocate one at hand-over
                    </p>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <SectionTitle>Rental Period</SectionTitle>
              <div className="space-y-2.5 text-[15px]">
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-700">Pick-up</p>
                    <p className="text-slate-500">{booking.pickupHubName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-700">Return</p>
                    <p className="text-slate-500">{booking.dropoffHubName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-500 pt-1">
                  <Calendar size={14} />
                  <span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                    {booking.duration} day{booking.duration === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <SectionTitle>Customer</SectionTitle>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(booking.customerName || 'G').charAt(0).toUpperCase()}
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 flex-1">
                  <Detail label="Name" value={booking.customerName || 'Guest'} />
                  <Detail label="Email" value={booking.email} />
                  <Detail label="Phone" value={booking.phone ?? '—'} />
                  <Detail label="Driving licence" value={booking.drivingLicenseNo ?? '—'} />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <SectionTitle>Hand-over &amp; Return</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                <Detail label="Handed over" value={formatDate(booking.handoverDate)} />
                <Detail
                  label="Fuel out / in"
                  value={`${booking.fuelLevelOut ?? '—'}% / ${booking.fuelLevelIn ?? '—'}%`}
                />
              </div>
            </div>
          </div>

          {/* Right: money */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <SectionTitle>Cost Breakdown</SectionTitle>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-[15px]">
                <CostRow label="Vehicle amount" value={money(booking.vehicleAmount)} />
                {booking.addonAmount > 0 && (
                  <CostRow label="Add-ons" value={money(booking.addonAmount)} />
                )}
                <CostRow label="GST (18%)" value={money(booking.taxAmount)} />
                {booking.fuelCharges != null && booking.fuelCharges > 0 && (
                  <CostRow label="Fuel charges" value={money(booking.fuelCharges)} />
                )}
                <CostRow label="Grand total" value={money(booking.grandTotal)} bold />
              </div>
            </div>

            {booking.addons.length > 0 && (
              <div>
                <SectionTitle>Add-ons</SectionTitle>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {booking.addons.map(a => (
                    <div
                      key={a.bookingDetailId}
                      className="flex justify-between px-4 py-3 text-[15px]"
                    >
                      <span className="text-slate-600">{a.addonName}</span>
                      <span className="font-semibold text-slate-800">{money(a.addonPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionTitle>Rates Snapshot</SectionTitle>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Daily', value: booking.dailyRate },
                  { label: 'Weekly', value: booking.weeklyRate },
                  { label: 'Monthly', value: booking.monthlyRate },
                ].map(r => (
                  <div key={r.label} className="bg-slate-50 rounded-xl py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase">{r.label}</p>
                    <p className="text-[15px] font-bold text-slate-800 mt-0.5">
                      {r.value != null ? money(r.value) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {booking.addressLine1 && (
              <div>
                <SectionTitle>Billing Address</SectionTitle>
                <div className="text-[15px] text-slate-600 leading-relaxed flex gap-2">
                  <User size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{booking.addressLine1}</p>
                    {booking.addressLine2 && <p>{booking.addressLine2}</p>}
                    <p>
                      {[booking.cityName, booking.stateName].filter(Boolean).join(', ')}
                      {booking.pincode ? ` - ${booking.pincode}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
