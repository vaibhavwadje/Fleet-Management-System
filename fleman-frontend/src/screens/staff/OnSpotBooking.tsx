// Staff on-spot booking - a walk-in customer at the counter.
//
// WHAT MAKES THIS DIFFERENT FROM THE CUSTOMER FLOW
// ------------------------------------------------
// Three things are decided for the staff member rather than by them:
//
//   pick-up date  - today
//   pick-up time  - now
//   pick-up hub   - the hub they work at
//
// They are shown as locked fields so the staff member can see what is being
// recorded, but the screen is not what enforces them. The server overwrites
// all three from its own clock and the signed-in staff member's hub, so a
// disabled input here is a courtesy, not a control.
//
// The RETURN location is the exception: staff choose it. The car is
// physically at this counter so it can only leave from here, but it may be
// dropped at any hub - an ordinary one-way rental. It defaults to this hub.
//
// Everything else - customer details, vehicle category, add-ons, pricing,
// confirmation and the e-mail - is the standard booking flow.

import { useEffect, useState } from 'react'
import {
  Clock, MapPin, Lock, AlertTriangle, CheckCircle2, ArrowRight, Car as CarIcon,
} from 'lucide-react'
import type { NavFn } from '../../data'
import { api, session } from '../../api'
import type {
  AddonResponse, CarTypeResponse, HubResponse, StaffBookingRequestPayload,
} from '../../api'
import {
  Button, Card, Input, SectionHeader, Toast, Badge,
} from '../../components/shared'
import { SearchSelect } from '../../components/SearchSelect'
import { todayISO, addDays, rentalDays } from '../../utils/date'

const F = (n: number) =>
  '₹' + (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(2))

const TAX_RATE = 0.18

/**
 * Same monthly / weekly / daily tiering the server uses, so the figure on
 * screen is the figure that gets saved.
 */
function calcVehicleTotal(t: CarTypeResponse, days: number) {
  const months = Math.floor(days / 30)
  let rem = days % 30
  const weeks = Math.floor(rem / 7)
  rem = rem % 7
  return months * t.monthlyRate + weeks * t.weeklyRate + rem * t.dailyRate
}

/** A field the staff member can see but not change. */
function LockedField({ label, value, icon }: {
  label: string; value: string; icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[15px] font-semibold text-slate-700 flex items-center gap-1.5">
        {label}
        <Lock size={12} className="text-slate-400" />
      </label>
      <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-100 border border-slate-300 text-[15px] text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {value}
      </div>
    </div>
  )
}

export default function OnSpotBooking({ nav }: { nav: NavFn }) {
  const staff = session.getStaff()
  const hubId = staff?.hubId ?? null

  const [hub, setHub] = useState<HubResponse | null>(null)
  const [carTypes, setCarTypes] = useState<CarTypeResponse[]>([])
  const [addonList, setAddonList] = useState<AddonResponse[]>([])
  const [states, setStates] = useState<{ stateId: number; stateName: string }[]>([])
  const [cities, setCities] = useState<{ cityId: number; cityName: string }[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [createdId, setCreatedId] = useState<number | null>(null)

  // Recomputed on every render so a counter left open past midnight does not
  // keep yesterday's date.
  const today = todayISO()
  const now = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    drivingLicenseNo: '', passportNo: '',
    addressLine1: '', addressLine2: '',
    stateId: '', cityId: '', pincode: '',
    endDate: addDays(todayISO(), 1),
    carTypeId: 0,
    // 0 means "same as the pick-up hub". The server treats a missing or
    // matching id the same way.
    dropoffHubId: 0,
  })
  const set = (k: string, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // One-way return. Off by default - most counter bookings come back here.
  const [oneWay, setOneWay] = useState(false)
  const [returnStateId, setReturnStateId] = useState('')
  const [returnCityId, setReturnCityId] = useState('')
  const [returnCities, setReturnCities] = useState<{ cityId: number; cityName: string }[]>([])
  const [returnHubs, setReturnHubs] = useState<HubResponse[]>([])

  const [addonIds, setAddonIds] = useState<number[]>([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  useEffect(() => {
    if (!hubId) {
      setError('Your staff account is not linked to a hub, so it cannot take bookings.')
      setLoading(false)
      return
    }
    Promise.all([
      api.hub(hubId).then(setHub).catch(() => {}),
      api.carTypes(hubId).then(setCarTypes).catch(() => setCarTypes([])),
      api.addons(hubId).then(setAddonList).catch(() => setAddonList([])),
      api.states().then(setStates).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [hubId])

  useEffect(() => {
    if (!form.stateId) { setCities([]); return }
    api.citiesByState(Number(form.stateId)).then(setCities).catch(() => setCities([]))
  }, [form.stateId])

  // Return location: state -> city -> hub, the same cascade the customer
  // booking flow uses, so no new endpoint is needed.
  useEffect(() => {
    if (!returnStateId) { setReturnCities([]); return }
    api.citiesByState(Number(returnStateId))
      .then(setReturnCities).catch(() => setReturnCities([]))
  }, [returnStateId])

  useEffect(() => {
    if (!returnStateId || !returnCityId) { setReturnHubs([]); return }
    api.hubs(Number(returnStateId), Number(returnCityId))
      .then(setReturnHubs).catch(() => setReturnHubs([]))
  }, [returnStateId, returnCityId])

  // ── Live pricing ─────────────────────────────────────────────────────────
  const days = rentalDays(today, form.endDate)
  const carType = carTypes.find(t => t.carTypeId === form.carTypeId)
  const vehicleAmount = carType ? calcVehicleTotal(carType, days) : 0
  const chosenAddons = addonList.filter(a => addonIds.includes(a.addonId))
  const addonAmount = chosenAddons.reduce((s, a) => s + a.pricePerDay * days, 0)
  const taxAmount = Math.round((vehicleAmount + addonAmount) * TAX_RATE)
  const grandTotal = vehicleAmount + addonAmount + taxAmount

  // ── Validation ───────────────────────────────────────────────────────────
  const errors: Record<string, string> = {
    firstName: !form.firstName.trim() ? 'First name is required' : '',
    lastName: !form.lastName.trim() ? 'Last name is required' : '',
    email: !form.email.trim()
      ? 'Email is required'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ? 'Enter a valid email address' : '',
    phone: !/^[6-9]\d{9}$/.test(form.phone)
      ? 'Phone must be 10 digits starting 6-9' : '',
    drivingLicenseNo: !form.drivingLicenseNo.trim()
      ? 'Driving licence is required' : '',
    carTypeId: !form.carTypeId ? 'Choose a vehicle category' : '',
    endDate: !form.endDate || form.endDate <= today
      ? 'The return date must be after today' : '',
    pincode: form.pincode && !/^\d{6}$/.test(form.pincode)
      ? 'A pincode is 6 digits' : '',
    // Only required once the staff member has said it is a one-way rental.
    dropoffHubId: oneWay && !form.dropoffHubId
      ? 'Choose the hub the vehicle comes back to' : '',
  }
  const allValid = !Object.values(errors).some(Boolean)
  const blur = (f: string) => setTouched(p => ({ ...p, [f]: true }))
  const show = (f: string) => (touched[f] || submitAttempted) ? errors[f] : undefined

  const handleSubmit = async () => {
    setSubmitAttempted(true)
    if (!allValid || !hubId || !hub || !carType) return

    setSaving(true)
    setError('')

    // startDate and the hubs are sent to satisfy the shared BookingRequest
    // shape. The server ignores them and uses its own clock and hub.
    const payload: StaffBookingRequestPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      drivingLicenseNo: form.drivingLicenseNo.trim(),
      passportNo: form.passportNo || undefined,
      addressLine1: form.addressLine1 || undefined,
      addressLine2: form.addressLine2 || undefined,
      stateId: form.stateId ? Number(form.stateId) : undefined,
      cityId: form.cityId ? Number(form.cityId) : undefined,
      pincode: form.pincode || undefined,
      booking: {
        carTypeId: form.carTypeId,
        endDate: form.endDate,
        addons: chosenAddons.map(a => ({
          addonId: a.addonId,
          addonName: a.addonName,
          addonPrice: a.pricePerDay * days,
        })),
        startDate: today,
        pickupHubId: hubId,
        pickupHubName: hub.hubName,
        // 0 means "same hub". The server resolves the name from the id, so
        // whatever we send here is replaced with the real one.
        dropoffHubId: form.dropoffHubId || hubId,
        dropoffHubName:
          returnHubs.find(h => h.hubId === form.dropoffHubId)?.hubName
          ?? hub.hubName,
        duration: days,
        dailyRate: carType.dailyRate,
        weeklyRate: carType.weeklyRate,
        monthlyRate: carType.monthlyRate,
        vehicleAmount,
        addonAmount,
        taxAmount,
        grandTotal,
      },
    }

    try {
      const created = await api.createStaffBooking(payload)
      setCreatedId(created.bookingId)
      setToast(`Booking #${created.bookingId} created`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const startAnother = () => {
    setCreatedId(null)
    setForm({
      firstName: '', lastName: '', email: '', phone: '',
      drivingLicenseNo: '', passportNo: '',
      addressLine1: '', addressLine2: '',
      stateId: '', cityId: '', pincode: '',
      endDate: addDays(todayISO(), 1),
      carTypeId: 0,
      dropoffHubId: 0,
    })
    setOneWay(false)
    setReturnStateId('')
    setReturnCityId('')
    setAddonIds([])
    setTouched({})
    setSubmitAttempted(false)
    setError('')
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Booking created</h2>
          <p className="text-[15px] text-slate-500 mb-6">
            Booking <strong className="text-slate-800">#{createdId}</strong> is
            confirmed for today at {hub?.hubName}
            {form.dropoffHubId && form.dropoffHubId !== hubId
              ? `, returning to ${returnHubs.find(h => h.hubId === form.dropoffHubId)?.hubName}`
              : ''}. A confirmation e-mail with the PDF has been sent to
            {' '}{form.email}.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => nav('staff-handover')} icon={<CarIcon size={15} />}>
              Go to Hand-over
            </Button>
            <Button variant="outline" onClick={startAnother}>
              Take another booking
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <Toast message={toast} onClose={() => setToast('')} />
        </div>
      )}

      <SectionHeader
        title="On-spot Booking"
        subtitle="Take a booking for a customer standing at your counter"
      />

      {error && (
        <div className="flex items-start gap-2 text-[15px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">

          {/* Fixed by the rules of an on-spot booking */}
          <Card className="p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-bold text-slate-800">Pick-up</h3>
              <span className="text-xs text-slate-400">Set automatically</span>
            </div>
            <p className="text-[13px] text-slate-500 mb-4">
              An on-spot booking starts now, at your own hub. These cannot be
              changed here or from the server.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <LockedField label="Pick-up date" value={today} icon={<Clock size={15} />} />
              <LockedField label="Pick-up time" value={now} icon={<Clock size={15} />} />
              <LockedField
                label="Pick-up location"
                value={hub?.hubName ?? '—'}
                icon={<MapPin size={15} />}
              />
              <Input
                label="Return date *"
                type="date"
                min={addDays(today, 1)}
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                onBlur={() => blur('endDate')}
                error={show('endDate')}
                hint={`${days} day${days === 1 ? '' : 's'}`}
              />
            </div>

            {/* ── Return location ──────────────────────────────────────────
                The one location the staff member chooses. The car is
                physically here so it can only leave from here, but it can be
                dropped anywhere - an ordinary one-way rental.

                Off by default, because most counter bookings come back to
                the same hub and an extra three dropdowns on every booking
                would be a tax on the common case. */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={oneWay}
                  onChange={e => {
                    setOneWay(e.target.checked)
                    if (!e.target.checked) {
                      // Back to a same-hub rental.
                      setReturnStateId('')
                      setReturnCityId('')
                      set('dropoffHubId', 0)
                    }
                  }}
                />
                <span className="text-[15px] font-semibold text-slate-700">
                  Returning to a different location
                </span>
              </label>

              {!oneWay ? (
                <p className="text-[13px] text-slate-500 mt-2">
                  Returning to <strong>{hub?.hubName ?? 'this hub'}</strong>.
                </p>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[15px] font-semibold text-slate-700">
                      Return state *
                    </label>
                    <SearchSelect
                      name="returnStateId"
                      value={returnStateId}
                      options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
                      placeholder="Search state..."
                      icon={MapPin}
                      onSelect={o => {
                        setReturnStateId(o ? String(o.id) : '')
                        setReturnCityId('')
                        set('dropoffHubId', 0)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[15px] font-semibold text-slate-700">
                      Return city *
                    </label>
                    <SearchSelect
                      name="returnCityId"
                      value={returnCityId}
                      options={returnCities.map(c => ({ id: c.cityId, label: c.cityName }))}
                      placeholder="Search city..."
                      icon={MapPin}
                      disabled={!returnStateId}
                      disabledText="Select a state first"
                      onSelect={o => {
                        setReturnCityId(o ? String(o.id) : '')
                        set('dropoffHubId', 0)
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[15px] font-semibold text-slate-700">
                      Return hub *
                    </label>
                    <SearchSelect
                      name="dropoffHubId"
                      value={form.dropoffHubId ? String(form.dropoffHubId) : ''}
                      options={returnHubs.map(h => ({ id: h.hubId, label: h.hubName }))}
                      placeholder="Search hub..."
                      icon={MapPin}
                      disabled={!returnCityId}
                      disabledText="Select a city first"
                      invalid={!!show('dropoffHubId')}
                      onSelect={o => set('dropoffHubId', o ? Number(o.id) : 0)}
                    />
                    {show('dropoffHubId') && (
                      <span className="text-[13px] text-red-600 font-medium">
                        {errors.dropoffHubId}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {oneWay && form.dropoffHubId > 0 && (
                <p className="flex items-start gap-2 text-[13px] text-slate-500 mt-3">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                  This is a one-way rental. Your hub hands the vehicle over;{' '}
                  <strong className="text-slate-700">
                    {returnHubs.find(h => h.hubId === form.dropoffHubId)?.hubName}
                  </strong>{' '}
                  accepts it back and the car joins their fleet.
                </p>
              )}
            </div>
          </Card>

          {/* Customer */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">Customer details</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="First name *" value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                onBlur={() => blur('firstName')} error={show('firstName')} />
              <Input label="Last name *" value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                onBlur={() => blur('lastName')} error={show('lastName')} />
              <Input label="Email *" type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => blur('email')} error={show('email')} />
              <Input label="Phone *" value={form.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric" maxLength={10}
                onBlur={() => blur('phone')} error={show('phone')} />
              <Input label="Driving licence *" value={form.drivingLicenseNo}
                onChange={e => set('drivingLicenseNo', e.target.value)}
                onBlur={() => blur('drivingLicenseNo')} error={show('drivingLicenseNo')} />
              <Input label="Passport (optional)" value={form.passportNo}
                onChange={e => set('passportNo', e.target.value)} />
            </div>

            <h4 className="font-bold text-slate-800 mt-6 mb-3 text-[15px]">
              Billing address
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Address line 1" value={form.addressLine1}
                onChange={e => set('addressLine1', e.target.value)}
                placeholder="Flat / house, building" />
              <Input label="Address line 2" value={form.addressLine2}
                onChange={e => set('addressLine2', e.target.value)}
                placeholder="Street, area" />
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-slate-700">State</label>
                <SearchSelect
                  name="stateId"
                  value={form.stateId}
                  options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
                  placeholder="Search state..."
                  icon={MapPin}
                  onSelect={o => { set('stateId', o ? String(o.id) : ''); set('cityId', '') }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[15px] font-semibold text-slate-700">City</label>
                <SearchSelect
                  name="cityId"
                  value={form.cityId}
                  options={cities.map(c => ({ id: c.cityId, label: c.cityName }))}
                  placeholder="Search city..."
                  icon={MapPin}
                  disabled={!form.stateId}
                  disabledText="Select a state first"
                  onSelect={o => set('cityId', o ? String(o.id) : '')}
                />
              </div>
              <Input label="Pincode" value={form.pincode}
                onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric" maxLength={6}
                onBlur={() => blur('pincode')} error={show('pincode')} />
            </div>
          </Card>

          {/* Vehicle category */}
          <Card className="overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="font-bold text-slate-800">Vehicle category *</h3>
              {show('carTypeId') && (
                <p className="text-[13px] text-red-600 mt-1">{errors.carTypeId}</p>
              )}
            </div>
            {carTypes.length === 0 ? (
              <p className="px-5 pb-5 text-[15px] text-slate-500">
                No vehicle categories are set up at your hub yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-bold px-5 py-4">Category</th>
                      <th className="text-right font-bold px-5 py-4">Daily</th>
                      <th className="text-right font-bold px-5 py-4 hidden sm:table-cell">Weekly</th>
                      <th className="text-right font-bold px-5 py-4 hidden sm:table-cell">Monthly</th>
                      <th className="text-right font-bold px-5 py-4">{days}-day total</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carTypes.map(t => (
                      <tr
                        key={t.carTypeId}
                        onClick={() => set('carTypeId', t.carTypeId)}
                        className={`cursor-pointer transition-colors ${
                          form.carTypeId === t.carTypeId ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-5 py-4 font-bold text-slate-900">{t.carType}</td>
                        <td className="px-5 py-4 text-right">{F(t.dailyRate)}</td>
                        <td className="px-5 py-4 text-right text-slate-600 hidden sm:table-cell">
                          {F(t.weeklyRate)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 hidden sm:table-cell">
                          {F(t.monthlyRate)}
                        </td>
                        <td className="px-5 py-4 text-right font-black text-blue-600">
                          {F(calcVehicleTotal(t, days))}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {form.carTypeId === t.carTypeId
                            ? <Badge label="Selected" />
                            : <Button size="xs" variant="outline"
                                onClick={e => { e.stopPropagation(); set('carTypeId', t.carTypeId) }}>
                                Select
                              </Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Add-ons */}
          {addonList.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Add-ons</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {addonList.map(a => {
                  const on = addonIds.includes(a.addonId)
                  return (
                    <button
                      key={a.addonId}
                      type="button"
                      onClick={() => setAddonIds(prev =>
                        on ? prev.filter(id => id !== a.addonId) : [...prev, a.addonId])}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        on ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-bold text-slate-800 text-[15px]">{a.addonName}</p>
                      <p className="text-[13px] text-slate-500 mt-0.5">{a.description}</p>
                      <p className="text-[15px] font-black text-blue-600 mt-2">
                        {F(a.pricePerDay)}
                        <span className="text-slate-400 font-normal text-[13px]">/day</span>
                      </p>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">Summary</h3>
            <div className="space-y-2.5 text-[15px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Pick-up</span>
                <span className="font-semibold text-slate-800">{hub?.hubName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Return</span>
                <span className="font-semibold text-slate-800">
                  {form.dropoffHubId
                    ? returnHubs.find(h => h.hubId === form.dropoffHubId)?.hubName ?? '—'
                    : hub?.hubName ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-semibold text-slate-800">
                  {days} day{days === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-800">
                  {carType?.carType ?? 'Not chosen'}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2.5 flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="font-semibold">{F(vehicleAmount)}</span>
              </div>
              {chosenAddons.map(a => (
                <div key={a.addonId} className="flex justify-between">
                  <span className="text-slate-500">{a.addonName}</span>
                  <span className="font-semibold">{F(a.pricePerDay * days)}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-slate-500">GST (18%)</span>
                <span className="font-semibold">{F(taxAmount)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between">
                <span className="font-bold text-slate-800">Grand total</span>
                <span className="font-black text-blue-600 text-xl">{F(grandTotal)}</span>
              </div>
            </div>

            <p className="text-[13px] text-slate-400 mt-3">
              The server reprices from the rate card, so this is what will be
              charged.
            </p>
          </Card>

          {submitAttempted && !allValid && (
            <div className="flex items-start gap-2 text-[15px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Please complete the fields marked * before confirming.</span>
            </div>
          )}

          {/* Clickable on purpose - a disabled button gives no clue what is
              missing. Clicking runs the checks and marks the offenders. */}
          <Button onClick={handleSubmit} loading={saving} fullWidth size="lg"
            iconRight={<ArrowRight size={16} />}>
            Confirm booking
          </Button>
        </div>
      </div>
    </div>
  )
}
