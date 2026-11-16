// Find any booking by its id, from any hub.
//
// WHY THIS IS SEPARATE FROM THE LIST FILTERS
// ------------------------------------------
// The lists are each staff member's own work queue: this hub's pending
// hand-overs, this hub's vehicles due back. That scoping is what makes them
// useful, and it is also what makes them useless the moment a customer turns
// up with a booking from another branch.
//
// So this is the deliberate way out of the scope: a lookup by id, ignoring
// both hub and status. Whatever it finds can be acted on, because the
// hand-over and return operations themselves carry no hub restriction.
//
// Default view = my hub. Search = everywhere. Actions = unrestricted.

import { useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import type { BookingResponse } from '../api'
import { Button } from './shared'

export function BookingIdSearch({
  onFound,
  placeholder = 'Find any booking by ID...',
  className = '',
}: {
  onFound: (booking: BookingResponse) => void
  placeholder?: string
  className?: string
}) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    const id = Number(value.replace(/\D/g, ''))
    if (!id) {
      setError('Enter a booking ID')
      return
    }
    setLoading(true)
    setError('')
    try {
      const booking = await api.staffBooking(id)
      onFound(booking)
      setValue('')
    } catch (e: any) {
      setError(e.message || `No booking found with ID ${id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      {/* A form, so Enter submits - staff type a number and hit return. */}
      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); search() }}
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={value}
            onChange={e => { setValue(e.target.value.replace(/\D/g, '')); setError('') }}
            placeholder={placeholder}
            inputMode="numeric"
            className="field field-icon"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!value}>
          Search
        </Button>
      </form>

      {error && (
        <p className="flex items-center gap-2 text-[13px] text-red-600 mt-2">
          <AlertTriangle size={14} className="flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
