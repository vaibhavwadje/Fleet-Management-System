// Staff changing where a booking is collected from or returned to.
//
// WHY THIS SITS INSIDE THE HAND-OVER AND RETURN SCREENS
// -----------------------------------------------------
// The moment it is needed is the moment a staff member is already looking at
// the booking - the customer is at the counter, or on the phone, saying
// "actually, can I drop it at the airport instead". Sending them to another
// tab to make the change and then back again would be the wrong shape for
// that conversation.
//
// Collapsed by default, because most bookings never need it.

import { useEffect, useState } from 'react'
import { MapPin, AlertTriangle, Check } from 'lucide-react'
import { api } from '../api'
import type { BookingResponse, HubResponse } from '../api'
import { Button } from './shared'
import { SearchSelect } from './SearchSelect'

export function ChangeLocations({
  booking,
  onUpdated,
}: {
  booking: BookingResponse
  /** Called with the saved booking so the caller can refresh its lists. */
  onUpdated: (updated: BookingResponse) => void
}) {
  const [open, setOpen] = useState(false)
  const [hubs, setHubs] = useState<HubResponse[]>([])
  const [pickupHubId, setPickupHubId] = useState<number>(booking.pickupHubId ?? 0)
  const [dropoffHubId, setDropoffHubId] = useState<number>(booking.dropoffHubId ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  // The car has physically left a specific hub, so where it was collected
  // from is now a fact rather than a plan. The server refuses to change it
  // too - this only stops staff being offered something that will fail.
  const handedOver = !!booking.handoverDate

  // Assigning a vehicle is itself what sets the pick-up hub - the car comes
  // from the assigning hub's fleet. So once a car is allocated the pick-up
  // location is already decided, and editing it here would contradict the
  // vehicle standing in the bay.
  const pickupLockedByCar = !handedOver && !!booking.assignedCarId

  useEffect(() => {
    if (open && hubs.length === 0) {
      api.allHubs().then(setHubs).catch(() => setHubs([]))
    }
  }, [open])

  // Re-seed when the caller selects a different booking.
  useEffect(() => {
    setPickupHubId(booking.pickupHubId ?? 0)
    setDropoffHubId(booking.dropoffHubId ?? 0)
    setError('')
    setDone('')
  }, [booking.bookingId, booking.pickupHubId, booking.dropoffHubId])

  const pickupChanged = pickupHubId !== (booking.pickupHubId ?? 0)
  const dropoffChanged = dropoffHubId !== (booking.dropoffHubId ?? 0)
  const dirty = pickupChanged || dropoffChanged

  const save = async () => {
    setSaving(true)
    setError('')
    setDone('')
    try {
      const updated = await api.updateBookingLocations(booking.bookingId, {
        // Only send what actually changed, so an unchanged pick-up hub never
        // trips the after-hand-over guard.
        pickupHubId: pickupChanged ? pickupHubId : undefined,
        dropoffHubId: dropoffChanged ? dropoffHubId : undefined,
      })
      setDone('Locations updated')
      onUpdated(updated)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const options = hubs.map(h => ({ id: h.hubId, label: h.hubName }))

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[15px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
      >
        <MapPin size={15} /> Change pick-up / return location
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800">Change locations</h4>
          <p className="text-[13px] text-slate-500 mt-0.5">
            The booking moves to the new hub's lists straight away. Handing a
            vehicle over also sets the pick-up location to your own hub.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[13px] font-semibold text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[15px] font-semibold text-slate-700">
            Pick-up location
            {(handedOver || pickupLockedByCar) && (
              <span className="text-slate-400 font-normal"> (fixed)</span>
            )}
          </label>
          {handedOver || pickupLockedByCar ? (
            <div className="field bg-slate-100 text-slate-600">
              {booking.pickupHubName}
            </div>
          ) : (
            <SearchSelect
              name="pickupHubId"
              value={pickupHubId ? String(pickupHubId) : ''}
              options={options}
              placeholder="Search hub..."
              icon={MapPin}
              onSelect={o => setPickupHubId(o ? Number(o.id) : 0)}
            />
          )}
          {handedOver && (
            <span className="text-[13px] text-slate-500">
              The vehicle has already been handed over.
            </span>
          )}
          {pickupLockedByCar && (
            <span className="text-[13px] text-slate-500">
              Set by the vehicle allocated from {booking.pickupHubName}.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[15px] font-semibold text-slate-700">
            Return location
          </label>
          <SearchSelect
            name="dropoffHubId"
            value={dropoffHubId ? String(dropoffHubId) : ''}
            options={options}
            placeholder="Search hub..."
            icon={MapPin}
            onSelect={o => setDropoffHubId(o ? Number(o.id) : 0)}
          />
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 text-[15px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </p>
      )}

      {done && (
        <p className="flex items-center gap-2 text-[15px] text-green-700">
          <Check size={16} /> {done}
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
          Save locations
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
