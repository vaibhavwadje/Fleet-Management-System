import { useState, useEffect } from 'react'
import {
  ArrowLeft, ArrowRight, MapPin, Car, Fuel, Users, Gauge,
  CheckCircle2, Shield, Navigation2, AlertCircle,
  Baby, Tent, Wifi, UserPlus, PhoneCall, X,
  Check, Calendar, FileText
} from 'lucide-react'
import { type Vehicle } from '../data'
import type { NavFn, Screen } from '../data'
import { PublicPage } from '../components/SiteChrome'
import { rentalDays, todayISO } from '../utils/date'
import { Button, Card, Badge, Stepper, Input, Modal } from '../components/shared'
import { SearchSelect } from '../components/SearchSelect'
import {
  api, session,
  type CarTypeResponse, type HubResponse, type AddonResponse,
  type StateResponse, type CityResponse,
  type BookingRequestPayload, type GuestBookingRequestPayload,
} from '../api'

/** Today in yyyy-MM-dd. Used as `max` so a future date of birth cannot be picked. */
const TODAY = todayISO()

const STEPS = ['Location', 'Vehicle', 'Add-ons', 'Your Info', 'Confirm']

const F = (n: number) => '\u20B9' + (Number.isInteger(n) ? n.toString() : n.toFixed(2))

/**
 * What the "Your Info" step collects.
 * The address is collected from everybody, guest or signed-in. A signed-in
 * customer gets theirs pre-filled from their profile and anything they change
 * is saved back to it, so the invoice always has an address to print.
 */
export interface CustomerDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  license: string
  passport: string
  addressLine1?: string
  addressLine2?: string
  stateId?: number
  cityId?: number
  // Carried alongside the ids purely so the confirm screen can show the
  // address in words. Only the ids are ever sent to the server.
  stateName?: string
  cityName?: string
  pincode?: string
}

/**
 * The "Your Information" form, kept between visits to that step.
 *
 * WHY THE WHOLE FORM AND NOT JUST CustomerDetails
 * -----------------------------------------------
 * The root component already held the CustomerDetails it got from onNext, but
 * that DTO carries only the fields the booking needs. Date of birth, emergency
 * contact and the hotel field live on the form and nowhere else, so restoring
 * from CustomerDetails alone would still have lost them.
 *
 * sessionStorage rather than component state because it also survives a page
 * refresh, and it is cleared as soon as the booking is confirmed.
 */
const CUSTOMER_FORM_KEY = 'bookingCustomerForm'

function readSavedCustomerForm(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_FORM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Everything the location step saved, or an empty object. */
function getBookingLocation(): Record<string, any> {
  try {
    return JSON.parse(sessionStorage.getItem('bookingLocation') || '{}')
  } catch {
    return {}
  }
}

/**
 * The hub the customer collects the car from.
 * Set either by the airport search (home page) or by the location step.
 * Returns null when it is missing, so screens can say so instead of
 * silently falling back to some other hub.
 */
function getPickupHubId(): number | null {
  const hubId = Number(getBookingLocation().hubId)
  return hubId > 0 ? hubId : null
}

const calcVehicleTotal = (priceDay: number, priceWeek: number, priceMonth: number, days: number) => {
  const months = Math.floor(days / 30)
  let rem = days % 30
  const weeks = Math.floor(rem / 7)
  rem = rem % 7
  return months * priceMonth + weeks * priceWeek + rem * priceDay
}

// ── Step 2: Location Select ────────────────────────────────────────────────
//
// Which hubs the user has to choose here follows one simple rule:
//
//   * Location picked by AIRPORT CODE  -> the hub is already known.
//     The airport search returns the hub that serves that airport, so there
//     is nothing left to ask.
//   * Location picked by STATE + CITY  -> the hub has to be chosen, because
//     a city can have several hubs.
//
// Applying that to pick-up and return gives every case:
//
//   pick-up   different return?   return by      this page shows
//   --------  ------------------  ------------   ---------------------------
//   airport   no                  -              nothing, skip to Vehicle
//   airport   yes                 airport        nothing, skip to Vehicle
//   airport   yes                 state + city   return hub only
//   city      yes                 state + city   pick-up hub, then return hub
//   city      yes                 airport        pick-up hub only
//   city      no                  -              pick-up hub only
//
// When there is no separate return location, the return hub is simply set to
// whatever the pick-up hub turned out to be.

function LocationSelect({ nav, onNext }: { nav: NavFn; onNext: (pickup: string, drop: string) => void }) {
  const [booking] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('bookingLocation') || '{}') }
    catch { return {} }
  })

  const pickupByAirport = booking.type === 'airport'
  const returnByAirport = booking.returnType === 'airport'
  const diffReturn = !!booking.diffReturn

  // A hub only needs choosing when the location came from state + city.
  const needPickupHub = !pickupByAirport
  const needReturnHub = diffReturn && !returnByAirport

  const [phase, setPhase] = useState<'pickup' | 'return'>(
    needPickupHub ? 'pickup' : 'return',
  )
  const [hubs, setHubs] = useState<HubResponse[]>([])
  const [pickupHub, setPickupHub] = useState<HubResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Nothing to ask -> go straight to the vehicle step.
  const skipThisStep = !needPickupHub && !needReturnHub

  /**
   * Writes the final hub choices back to sessionStorage and moves on.
   *
   * The chosen hubs are passed in rather than read from state, because this
   * runs in the same event handler as the click that selected them and React
   * has not re-rendered yet.
   */
  const finish = (
    chosenPickup: HubResponse | null,
    chosenReturn: HubResponse | null,
  ) => {
    const updated = { ...booking }

    // ---- Pick-up hub ----
    if (chosenPickup) {
      updated.hubId = chosenPickup.hubId
      updated.hubName = chosenPickup.hubName
    } else if (pickupByAirport) {
      // Already carried over from the airport search on the home page.
      updated.hubId = booking.hubId
      updated.hubName = booking.airport
    }

    // ---- Return hub ----
    if (chosenReturn) {
      updated.returnHubId = chosenReturn.hubId
      updated.returnHubName = chosenReturn.hubName
    } else if (diffReturn && returnByAirport) {
      // The return airport brings its own hub with it.
      updated.returnHubId = booking.returnHubId
      updated.returnHubName = booking.returnAirport
    } else {
      // No separate return location - drop the car back where it was collected.
      updated.returnHubId = updated.hubId
      updated.returnHubName = updated.hubName
    }

    sessionStorage.setItem('bookingLocation', JSON.stringify(updated))

    const pickupName = updated.hubName || booking.city || 'Pick-up location'
    const dropName = diffReturn
      ? (updated.returnHubName || booking.returnCity || pickupName)
      : pickupName

    onNext(pickupName, dropName)
  }

  useEffect(() => {
    if (skipThisStep) {
      finish(null, null)
    }
  }, [])

  // Load the hubs for whichever location we are currently asking about.
  useEffect(() => {
    if (skipThisStep) return

    const stateId = phase === 'pickup' ? booking.stateId : booking.returnStateId
    const cityId = phase === 'pickup' ? booking.cityId : booking.returnCityId

    if (!stateId || !cityId) {
      setError('We could not work out that location. Please go back and choose the state and city again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    api.hubs(Number(stateId), Number(cityId))
      .then(setHubs)
      .catch(e => { setHubs([]); setError(e.message) })
      .finally(() => setLoading(false))
  }, [phase])

  const handleSelect = (hub: HubResponse) => {
    if (phase === 'pickup') {
      setPickupHub(hub)
      if (needReturnHub) {
        setPhase('return')   // now ask for the return hub
      } else {
        finish(hub, null)
      }
    } else {
      finish(pickupHub, hub)
    }
  }

  if (skipThisStep) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Preparing your vehicles…</p>
      </div>
    )
  }

  const askingForPickup = phase === 'pickup'
  const phaseLabel = askingForPickup ? 'Pick-up Location' : 'Return Location'
  const phaseCity = askingForPickup ? booking.city : booking.returnCity
  const phaseState = askingForPickup ? booking.state : booking.returnState

  // Only show "1 of 2" when both hubs really are being asked for.
  const bothNeeded = needPickupHub && needReturnHub

  return (
    <div className="px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => (phase === 'return' && needPickupHub ? setPhase('pickup') : nav('landing'))}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Select {phaseLabel}
              {bothNeeded && (
                <span className="ml-2 text-sm font-semibold text-slate-400">
                  {askingForPickup ? '1 of 2' : '2 of 2'}
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm">
              Choose a hub in {phaseCity}{phaseState ? `, ${phaseState}` : ''}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={0} />
        </div>

        {/* Chosen pick-up hub stays visible while choosing the return hub */}
        {!askingForPickup && pickupHub && (
          <div className="mb-5 flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Picking up from <span className="font-semibold">{pickupHub.hubName}</span>
            </p>
          </div>
        )}

        {/* Hub list */}
        <div className="space-y-4">
          {loading && (
            <>
              {[0, 1, 2].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </>
          )}

          {!loading && error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
              {error}
            </div>
          )}

          {!loading && !error && hubs.length === 0 && (
            <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
              No hubs are available in {phaseCity} yet. Please go back and choose
              a different city.
            </div>
          )}

          {!loading && hubs.map(hub => (
            <Card key={hub.hubId} hover onClick={() => handleSelect(hub)}
              className="p-4 cursor-pointer border-2 border-transparent hover:border-blue-300 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{hub.hubName}</p>
                  <p className="text-xs text-slate-500 truncate">{hub.addressLine1}{hub.addressLine2 ? ', ' + hub.addressLine2 : ''}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{hub.hubType}</span>
                    <span className="text-xs text-slate-400">{hub.cityName}, {hub.stateName}</span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-300 flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8">
          <Button onClick={() => nav('landing')} variant="outline">
            <ArrowLeft size={16} /> Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Vehicle Select ─────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, Vehicle['category']> = {
  SMALL: 'Small', COMPACT: 'Compact', INTERMEDIATE: 'Intermediate',
  SEDAN: 'Sedan', SUV: 'SUV', LUXURY: 'Luxury', ELECTRIC: 'Electric',
}

function VehicleSelect({ onNext, onBack, selectedId, days }: {
  onNext: (v: Vehicle) => void
  onBack: () => void
  selectedId?: string
  /** Rental length, so each row can show what it would actually cost. */
  days: number
}) {
  const [data, setData] = useState<CarTypeResponse[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = () => {
    setLoading(true)
    setError('')

    const hubId = getPickupHubId()
    if (!hubId) {
      // Better to say so than to quietly show another hub's fleet.
      setError('We could not work out your pick-up hub. Please go back and choose your location again.')
      setLoading(false)
      return
    }

    api.carTypes(hubId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const toVehicle = (t: CarTypeResponse): Vehicle => ({
    id: String(t.carTypeId),
    name: t.carType,
    brand: t.carType.split(' ')[0],
    category: CATEGORY_MAP[t.carClass.toUpperCase()] ?? 'Sedan' as Vehicle['category'],
    seats: 5,
    transmission: 'Manual' as Vehicle['transmission'],
    fuel: (t.carClass.toUpperCase() === 'ELECTRIC' ? 'Electric' : 'Petrol') as Vehicle['fuel'],
    mileage: '—',
    priceDay: t.dailyRate,
    priceWeek: t.weeklyRate,
    priceMonth: t.monthlyRate,
    available: true,
    image: t.imageUrl || '',
    color: '',
    year: 2024,
    plate: '',
  })

  const allVehicles = data ?? []

  return (
    <div className="px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors bg-white">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Select Your Vehicle</h1>
            <p className="text-slate-500 text-sm">Choose from our premium fleet</p>
          </div>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={1} />
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <div className="bg-red-50 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <Button onClick={fetch} variant="outline" size="sm">Retry</Button>
            </div>
          </div>
        )}

        {/* Loading skeleton - matches the table below so the page does not
            jump around once the rates arrive. */}
        {loading && (
          <Card className="overflow-hidden">
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          </Card>
        )}

        {/* Empty */}
        {!loading && !error && allVehicles.length === 0 && (
          <div className="text-center py-20">
            <Car size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg font-semibold">No vehicles available</p>
            <p className="text-slate-400 text-sm mt-1">Try a different location or date.</p>
          </div>
        )}

        {/* Car types, in a table.
            A table beats cards here because the whole decision is a numeric
            comparison - daily against weekly against monthly - and columns
            line those numbers up so they can actually be compared. */}
        {!loading && !error && allVehicles.length > 0 && (
          <>
            <p className="text-[15px] text-slate-500 mb-3">
              {allVehicles.length} vehicle categor{allVehicles.length === 1 ? 'y' : 'ies'} available
              at this hub. Rates are per period; your {days} day
              {days === 1 ? '' : 's'} are priced using the best combination.
            </p>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[15px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-bold px-5 py-4">Vehicle</th>
                      <th className="text-left font-bold px-5 py-4 hidden md:table-cell">Category</th>
                      <th className="text-left font-bold px-5 py-4 hidden lg:table-cell">Details</th>
                      <th className="text-right font-bold px-5 py-4">Daily</th>
                      <th className="text-right font-bold px-5 py-4 hidden sm:table-cell">Weekly</th>
                      <th className="text-right font-bold px-5 py-4 hidden sm:table-cell">Monthly</th>
                      <th className="text-right font-bold px-5 py-4">Est. total</th>
                      <th className="px-5 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allVehicles.map(item => {
                      const v = toVehicle(item)
                      const isSelected = v.id === selectedId
                      const estimate = calcVehicleTotal(v.priceDay, v.priceWeek, v.priceMonth, days)
                      return (
                        <tr
                          key={v.id}
                          onClick={() => onNext(v)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {v.image ? (
                                <img
                                  src={v.image}
                                  alt={v.name}
                                  className="w-20 h-14 object-cover rounded-xl flex-shrink-0 bg-slate-100"
                                />
                              ) : (
                                <div className="w-20 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <Car size={20} className="text-slate-300" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 leading-snug">{v.name}</p>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 mt-0.5">
                                    <Check size={12} /> Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600 hidden md:table-cell">
                            {v.category}
                          </td>
                          <td className="px-5 py-4 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                            {v.seats} seats · {v.transmission}
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {F(v.priceDay)}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-600 hidden sm:table-cell whitespace-nowrap">
                            {F(v.priceWeek)}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-600 hidden sm:table-cell whitespace-nowrap">
                            {F(v.priceMonth)}
                          </td>
                          <td className="px-5 py-4 text-right font-black text-blue-600 whitespace-nowrap">
                            {F(estimate)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              size="sm"
                              onClick={e => { e.stopPropagation(); onNext(v) }}
                              iconRight={<ArrowRight size={14} />}
                            >
                              Select
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Footer — Back only */}
        {!loading && !error && allVehicles.length > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft size={16} /> Back
            </Button>
            <div />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Add-ons ────────────────────────────────────────────────────────
const ADDON_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  GPS: Navigation2, Navigation: Navigation2, Child: Baby, Camping: Tent,
  Insurance: Shield, Driver: UserPlus, WiFi: Wifi, Roadside: PhoneCall,
}

function getAddonIcon(name: string) {
  const key = Object.keys(ADDON_ICON_MAP).find(k => name.toLowerCase().includes(k.toLowerCase()))
  return key ? ADDON_ICON_MAP[key] : Shield
}

function AddOns({ vehicle, days, onNext, onBack }: {
  vehicle: Vehicle; days: number; onNext: (addons: string[]) => void; onBack: () => void
}) {
  const [addonList, setAddonList] = useState<AddonResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(() => {
    const stored = sessionStorage.getItem('bookingEditAddons')
    if (stored) {
      try { return new Set<number>(JSON.parse(stored).map(Number)) } catch {}
    }
    return new Set<number>()
  })

  useEffect(() => {
    const hubId = getPickupHubId()
    if (!hubId) return
    api.addons(hubId).then(setAddonList).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const addonTotal = addonList.filter(a => selected.has(a.addonId)).reduce((s, a) => s + a.pricePerDay * days, 0)
  const vehicleTotal = calcVehicleTotal(vehicle.priceDay, vehicle.priceWeek, vehicle.priceMonth, days)
  const grandTotal = vehicleTotal + addonTotal

  return (
    <div className="px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Enhance Your Journey</h1>
            <p className="text-slate-500 text-sm">Optional add-ons to make your trip perfect</p>
          </div>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={2} />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-500">Loading add-ons...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Add-ons Grid */}
            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {addonList.map(addon => {
                const Icon = getAddonIcon(addon.addonName)
                const active = selected.has(addon.addonId)
                return (
                  <button
                    key={addon.addonId}
                    onClick={() => toggle(addon.addonId)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{addon.addonName}</p>
                          {active && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{addon.description}</p>
                        <p className="text-sm font-black text-blue-600 mt-2">{F(addon.pricePerDay)}<span className="text-slate-400 font-normal text-xs">/day</span></p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Price Summary */}
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex gap-3 mb-4">
                  {vehicle.image && (
                    <img src={vehicle.image} alt={vehicle.name} className="w-20 h-14 object-cover rounded-xl flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{vehicle.name}</p>
                    <p className="text-xs text-slate-500">{vehicle.category} · {days} days</p>
                    <p className="text-sm font-black text-blue-600 mt-1">{F(vehicleTotal)}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Vehicle ({days} days)</span>
                    <span className="font-semibold">{F(vehicleTotal)}</span>
                  </div>

                  {addonList.filter(a => selected.has(a.addonId)).map(a => (
                    <div key={a.addonId} className="flex justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <button onClick={() => toggle(a.addonId)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                        {a.addonName}
                      </span>
                      <span className="font-semibold">{F(a.pricePerDay * days)}</span>
                    </div>
                  ))}

                  <div className="border-t border-slate-200 pt-3 flex justify-between">
                    <span className="font-bold text-slate-800">Subtotal</span>
                    <span className="font-black text-blue-600 text-lg">{F(grandTotal)}</span>
                  </div>
                </div>
              </Card>

              <Button onClick={() => onNext([...selected].map(String))} fullWidth size="lg">
                Continue <ArrowRight size={16} />
              </Button>
              <Button onClick={onBack} variant="outline" fullWidth>
                <ArrowLeft size={16} /> Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 5: Customer Information ──────────────────────────────────────────
const VALIDATE = {
  firstName: (v: string) =>
    !v.trim() ? 'First Name is required' :
    v.trim().length < 2 ? 'First Name must be at least 2 characters' :
    v.trim().length > 50 ? 'First Name must be at most 50 characters' : '',
  lastName: (v: string) =>
    !v.trim() ? 'Last Name is required' :
    v.trim().length < 2 ? 'Last Name must be at least 2 characters' :
    v.trim().length > 50 ? 'Last Name must be at most 50 characters' : '',
  email: (v: string) =>
    !v.trim() ? 'Email Address is required' :
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Please enter a valid email address' : '',
  phone: (v: string) =>
    !v.trim() ? 'Phone Number is required' :
    !/^\+?\d{10,15}$/.test(v.replace(/[\s-]/g, '')) ? 'Please enter a valid phone number' : '',
  license: (v: string) =>
    !v.trim() ? 'Driving License Number is required' :
    v.trim().length < 6 ? 'Please enter a valid driving license number' :
    !/^[a-zA-Z0-9]+$/.test(v.trim()) ? 'License must be alphanumeric' : '',
  addressLine1: (v: string) =>
    !v.trim() ? 'Address Line 1 is required' :
    v.trim().length < 3 ? 'Please enter your address' :
    v.trim().length > 100 ? 'Address Line 1 must be at most 100 characters' : '',
  // Optional field: empty is fine, six digits is fine, anything else is not.
  pincode: (v: string) =>
    !v.trim() ? '' :
    !/^\d{6}$/.test(v.trim()) ? 'A pincode is 6 digits' : '',
}

function CustomerInfo({ vehicle, days, addons, onNext, onBack }: {
  vehicle: Vehicle; days: number; addons: string[]; onNext: (data: CustomerDetails) => void; onBack: () => void
}) {
  const [addonList, setAddonList] = useState<AddonResponse[]>([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Everybody fills the address in here, guest or signed-in. The booking
  // snapshot - and therefore the invoice - reads the address off the customer
  // record, so if we skipped this step for signed-in customers their invoice
  // would print a blank address.
  const isGuest = !(session.getToken() && session.getRole() === 'CUSTOMER')

  const [states, setStates] = useState<StateResponse[]>([])
  const [cities, setCities] = useState<CityResponse[]>([])

  useEffect(() => {
    const hubId = getPickupHubId()
    if (hubId) api.addons(hubId).then(setAddonList).catch(() => {})
    api.states().then(setStates).catch(() => {})
  }, [])

  const addonObjs = addonList.filter(a => addons.includes(String(a.addonId)))
  const addonTotal = addonObjs.reduce((s, a) => s + a.pricePerDay * days, 0)
  const vehicleTotal = calcVehicleTotal(vehicle.priceDay, vehicle.priceWeek, vehicle.priceMonth, days)
  const tax = Math.round((vehicleTotal + addonTotal) * 0.18)
  const grand = vehicleTotal + addonTotal + tax

  const getCurrentUser = () => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('customer') : null
    return s ? JSON.parse(s) : {}
  }
  const c = getCurrentUser()

  // Anything typed on a previous visit to this step wins over the defaults.
  // This is what makes "Modify Booking" on the review page come back to a
  // filled-in form instead of a blank one.
  const [form, setForm] = useState(() => {
    const defaults = {
      membership: '', firstName: c.firstName || '', lastName: c.lastName || '', email: c.email || '',
      phone: c.phone || '',
      license: c.drivingLicenseNo || '', passport: '', dob: '',
      card: '', emergency: '', hotel: '',
      addressLine1: '', addressLine2: '',
      stateId: '', cityId: '', pincode: '',
    }
    const saved = readSavedCustomerForm()
    return saved ? { ...defaults, ...saved } : defaults
  })
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  // Save on every keystroke. Cheap, and it means nothing is lost to a stray
  // refresh either, not just to Modify Booking.
  useEffect(() => {
    try {
      sessionStorage.setItem(CUSTOMER_FORM_KEY, JSON.stringify(form))
    } catch {
      // A full or disabled sessionStorage must not break the booking.
    }
  }, [form])

  // A signed-in customer should not retype an address they have already
  // given us, so pull the saved one in and let them correct it if it changed.
  // Anything they leave alone is simply sent back unchanged.
  useEffect(() => {
    if (isGuest) return
    api.profile().then(p => {
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || p.firstName || '',
        lastName: prev.lastName || p.lastName || '',
        email: prev.email || p.email || '',
        phone: prev.phone || p.phone || '',
        license: prev.license || p.drivingLicenseNo || '',
        passport: prev.passport || p.passportNo || '',
        addressLine1: prev.addressLine1 || p.addressLine1 || '',
        addressLine2: prev.addressLine2 || p.addressLine2 || '',
        stateId: prev.stateId || (p.stateId ? String(p.stateId) : ''),
        cityId: prev.cityId || (p.cityId ? String(p.cityId) : ''),
        pincode: prev.pincode || p.pincode || '',
      }))
    }).catch(() => {
      // A profile we cannot read must not block the booking - the fields
      // simply start empty and the customer types them.
    })
  }, [])

  // Cities depend on the chosen state.
  //
  // The city is deliberately NOT cleared here. On first load the pre-filled
  // state arrives together with the pre-filled city, and clearing on every
  // state change would wipe the city the customer already had saved. The
  // state picker clears it explicitly instead, which only fires on a real
  // change made by hand.
  useEffect(() => {
    if (!form.stateId) { setCities([]); return }
    api.citiesByState(Number(form.stateId)).then(setCities).catch(() => setCities([]))
  }, [form.stateId])

  const errors: Record<string, string> = {
    firstName: VALIDATE.firstName(form.firstName),
    lastName: VALIDATE.lastName(form.lastName),
    email: VALIDATE.email(form.email),
    phone: VALIDATE.phone(form.phone),
    license: VALIDATE.license(form.license),
    // The address is required for everyone - it is printed on the invoice.
    addressLine1: VALIDATE.addressLine1(form.addressLine1),
    stateId: !form.stateId ? 'Please select your state' : '',
    cityId: !form.cityId ? 'Please select your city' : '',
    // Optional, but if it is filled in it has to be a real pincode.
    pincode: VALIDATE.pincode(form.pincode),
  }
  const allValid = !Object.values(errors).some(Boolean)

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }))

  // Shown after a failed attempt so the reason is never a mystery.
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const handleSubmit = () => {
    setSubmitAttempted(true)
    setTouched(prev => ({
      ...prev,
      firstName: true, lastName: true, email: true, phone: true, license: true,
      addressLine1: true, stateId: true, cityId: true, pincode: true,
    }))

    if (!allValid) {
      // Jump to the first problem rather than leaving the user hunting.
      // FIELD_ORDER keeps this matching the order fields appear on screen.
      const FIELD_ORDER = [
        'firstName', 'lastName', 'email', 'phone',
        'addressLine1', 'stateId', 'cityId', 'pincode', 'license',
      ]
      const firstInvalid = FIELD_ORDER.find(f => errors[f])
      if (firstInvalid) {
        const el = document.querySelector(`[name="${firstInvalid}"]`) as HTMLElement | null
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el?.focus(), 300)
      }
      return
    }
    onNext({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      license: form.license,
      passport: form.passport,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      stateId: form.stateId ? Number(form.stateId) : undefined,
      cityId: form.cityId ? Number(form.cityId) : undefined,
      stateName: states.find(s => String(s.stateId) === form.stateId)?.stateName,
      cityName: cities.find(ct => String(ct.cityId) === form.cityId)?.cityName,
      pincode: form.pincode,
    })
  }

  return (
    <div className="px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Your Information</h1>
            <p className="text-slate-500 text-sm">Complete your details to finalize the booking</p>
          </div>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={3} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Personal */}
            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  name="firstName"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  error={touched.firstName ? errors.firstName : undefined}
                />
                <Input
                  label="Last Name *"
                  name="lastName"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  error={touched.lastName ? errors.lastName : undefined}
                />
                <Input
                  label="Email Address *"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  error={touched.email ? errors.email : undefined}
                />
                <Input
                  label="Phone Number *"
                  name="phone"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  maxLength={10}
                  onBlur={() => handleBlur('phone')}
                  error={touched.phone ? errors.phone : undefined}
                />
                <Input label="Date of Birth" type="date" max={TODAY}
                  value={form.dob} onChange={e => set('dob', e.target.value)} />
                <Input label="Hotel / Stay Address" value={form.hotel} onChange={e => set('hotel', e.target.value)} />
              </div>
            </Card>

            {/* ── Billing Address ────────────────────────────────────────
                Its own card because it is required of everybody now, not a
                footnote to the personal details. It is captured as separate
                lines rather than one free-text blob so it can be stored,
                searched and printed on the invoice consistently.
                A signed-in customer sees theirs pre-filled. */}
            <Card className="p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-bold text-slate-800">Billing Address</h3>
                <span className="text-xs text-slate-400">* required</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {isGuest
                  ? 'This address is printed on your booking confirmation and invoice.'
                  : 'Saved to your profile and printed on your booking confirmation and invoice.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Address Line 1 *"
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={e => set('addressLine1', e.target.value)}
                  onBlur={() => handleBlur('addressLine1')}
                  error={touched.addressLine1 ? errors.addressLine1 : undefined}
                  placeholder="Flat / house, building"
                />
                <Input
                  label="Address Line 2 (optional)"
                  value={form.addressLine2}
                  onChange={e => set('addressLine2', e.target.value)}
                  placeholder="Street, area, landmark"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">State *</label>
                  <SearchSelect
                    name="stateId"
                    value={form.stateId}
                    options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
                    placeholder="Search state..."
                    icon={MapPin}
                    invalid={!!(touched.stateId && errors.stateId)}
                    onBlur={() => handleBlur('stateId')}
                    onSelect={opt => {
                      set('stateId', opt ? String(opt.id) : '')
                      // Only a deliberate change clears the city - see the
                      // note on the cities effect above.
                      set('cityId', '')
                      handleBlur('stateId')
                    }}
                  />
                  {touched.stateId && errors.stateId && (
                    <span className="text-xs text-red-500 font-medium">{errors.stateId}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">City *</label>
                  <SearchSelect
                    name="cityId"
                    value={form.cityId}
                    options={cities.map(ct => ({ id: ct.cityId, label: ct.cityName }))}
                    placeholder="Search city..."
                    icon={MapPin}
                    disabled={!form.stateId}
                    disabledText="Select a state first"
                    invalid={!!(touched.cityId && errors.cityId)}
                    onBlur={() => handleBlur('cityId')}
                    onSelect={opt => {
                      set('cityId', opt ? String(opt.id) : '')
                      handleBlur('cityId')
                    }}
                  />
                  {touched.cityId && errors.cityId && (
                    <span className="text-xs text-red-500 font-medium">{errors.cityId}</span>
                  )}
                </div>

                <Input
                  label="Pincode (optional)"
                  name="pincode"
                  value={form.pincode}
                  onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  onBlur={() => handleBlur('pincode')}
                  error={touched.pincode ? errors.pincode : undefined}
                  placeholder="6 digits"
                />
              </div>
            </Card>

            {/* ID & License */}
            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Identity & Documents</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Driving License Number *"
                  name="license"
                  value={form.license}
                  onChange={e => set('license', e.target.value)}
                  onBlur={() => handleBlur('license')}
                  error={touched.license ? errors.license : undefined}
                />
                <Input label="Passport Number" value={form.passport} onChange={e => set('passport', e.target.value)} />
                <Input label="Emergency Contact" value={form.emergency} onChange={e => set('emergency', e.target.value)} />
              </div>
            </Card>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Booking Summary</h3>
              <img src={vehicle.image} alt={vehicle.name} className="w-full h-36 object-cover rounded-xl mb-4" />
              <p className="font-bold text-slate-900">{vehicle.name}</p>
              <p className="text-sm text-slate-500 mb-4">{vehicle.category} · {vehicle.transmission}</p>

              <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-semibold">{days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-semibold">{F(vehicleTotal)}</span>
                </div>
                {addonObjs.map(a => (
                  <div key={a.addonId} className="flex justify-between">
                    <span className="text-slate-500">{a.addonName}</span>
                    <span className="font-semibold">{F(a.pricePerDay * days)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-slate-500">GST (18%)</span>
                  <span className="font-semibold">{F(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-slate-800">Grand Total</span>
                  <span className="font-black text-blue-600 text-lg">{F(grand)}</span>
                </div>
              </div>
            </Card>

            {/* The button stays clickable on purpose: a disabled button gives
                no clue about what is missing. Clicking runs the checks and
                highlights the offending fields. */}
            {submitAttempted && !allValid && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>Please complete the required fields marked * before continuing.</span>
              </div>
            )}

            <Button onClick={handleSubmit} fullWidth size="lg">
              Review Booking <ArrowRight size={16} />
            </Button>
            <Button onClick={onBack} variant="outline" fullWidth>
              <ArrowLeft size={16} /> Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Step 6: Confirmation ───────────────────────────────────────────────────
function Confirmation({ vehicle, days, addons, pickup, drop, customer, onBack, nav, isEditing, editBookingId }: {
  vehicle: Vehicle; days: number; addons: string[]; pickup: string; drop: string; customer: CustomerDetails; onBack: () => void; nav: NavFn; isEditing?: boolean; editBookingId?: string
}) {
  const [addonList, setAddonList] = useState<AddonResponse[]>([])

  useEffect(() => {
    const hubId = getPickupHubId()
    if (!hubId) return
    api.addons(hubId).then(setAddonList).catch(() => {})
  }, [])

  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [homeCountdown, setHomeCountdown] = useState(4)
  const loc = JSON.parse(sessionStorage.getItem('bookingLocation') || '{}')
  const fmtD = (d: string) => {
    if (!d) return ''
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' +
      dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  const rentalDate = loc.rentalDate || ''
  const returnDate = loc.returnDate || ''

  // One home page for everybody now, signed in or not.
  const homeScreen: Screen = 'landing'

  useEffect(() => {
    if (showSuccess && homeCountdown > 0) {
      const timer = setTimeout(() => setHomeCountdown(homeCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (showSuccess && homeCountdown === 0) {
      nav(isEditing ? 'customer-dashboard' : homeScreen)
    }
  }, [showSuccess, homeCountdown, nav, isEditing, homeScreen])

  const addonObjs = addonList.filter(a => addons.includes(String(a.addonId)))
  const addonTotal = addonObjs.reduce((s, a) => s + a.pricePerDay * days, 0)
  const vehicleTotal = calcVehicleTotal(vehicle.priceDay, vehicle.priceWeek, vehicle.priceMonth, days)
  const tax = Math.round((vehicleTotal + addonTotal) * 0.18)
  const insuranceAddon = addonList.find(a => addons.includes(String(a.addonId)) && a.addonName.toLowerCase().includes('insurance'))
  const insurance = insuranceAddon ? insuranceAddon.pricePerDay * days : 0
  const grand = vehicleTotal + addonTotal + tax
  const [bookingNo] = useState(() => {
    const stored = sessionStorage.getItem('bookingRef')
    if (stored) return stored
    const ref = 'FLM-' + Math.random().toString().slice(2,8)
    sessionStorage.setItem('bookingRef', ref)
    return ref
  })

  const handleConfirm = async () => {
    if (!vehicle) return

    const locBk = JSON.parse(sessionStorage.getItem('bookingLocation') || '{}')

    // The booking is tied to a hub, not just a hub name - the staff screens
    // filter on pickupHubId, so it has to be present.
    const pickupHubId = Number(locBk.hubId)
    const dropoffHubId = Number(locBk.returnHubId ?? locBk.hubId)

    if (!pickupHubId) {
      setSubmitError('We could not work out your pick-up location. Please go back and select it again.')
      return
    }

    setConfirmed(true)
    setSubmitError('')

    const bookingPayload: BookingRequestPayload = {
      // vehicle.id is the car TYPE id - staff assign an actual car at hand-over.
      carTypeId: Number(vehicle.id),
      // Details from the "Your Info" step. The server copies these onto the
      // customer's profile and then snapshots them onto the booking, which
      // is where the invoice reads them from. Without them the invoice
      // prints a blank address.
      drivingLicenseNo: customer.license || undefined,
      passportNo: customer.passport || undefined,
      addressLine1: customer.addressLine1 || undefined,
      addressLine2: customer.addressLine2 || undefined,
      stateId: customer.stateId,
      cityId: customer.cityId,
      pincode: customer.pincode || undefined,
      startDate: locBk.rentalDate ? locBk.rentalDate.split('T')[0] : '',
      endDate: locBk.returnDate ? locBk.returnDate.split('T')[0] : '',
      pickupHubId,
      pickupHubName: pickup,
      dropoffHubId,
      dropoffHubName: drop,
      dailyRate: vehicle.priceDay,
      weeklyRate: vehicle.priceWeek,
      monthlyRate: vehicle.priceMonth,
      duration: days,
      vehicleAmount: vehicleTotal,
      addonAmount: addonTotal,
      taxAmount: tax,
      grandTotal: grand,
      addons: addonObjs.map(a => ({
        addonId: a.addonId,
        addonName: a.addonName,
        addonPrice: a.pricePerDay * days,
      })),
    }

    try {
      if (isEditing && editBookingId) {
        await api.updateBooking(Number(editBookingId), {
          carTypeId: bookingPayload.carTypeId,
          startDate: bookingPayload.startDate,
          endDate: bookingPayload.endDate,
          pickupHubId,
          pickupHubName: pickup,
          dropoffHubId,
          dropoffHubName: drop,
          duration: days,
          vehicleAmount: vehicleTotal,
          addonAmount: addonTotal,
          taxAmount: tax,
          grandTotal: grand,
          addons: bookingPayload.addons,
        })
        sessionStorage.removeItem('editingBookingId')
        sessionStorage.removeItem('bookingEditAddons')
        sessionStorage.removeItem('bookingEditPickup')
        sessionStorage.removeItem('bookingEditDrop')
      } else if (session.getToken() && session.getRole() === 'CUSTOMER') {
        const res = await api.createBooking(bookingPayload)
        if (res?.bookingId) {
          localStorage.setItem('activeBookingId', String(res.bookingId))
        }
      } else {
        // Guest booking - the backend needs a real state and city for the
        // customer snapshot, so use whatever the location step captured.
        // State and city come from the "Your Info" step. They fall back to
        // the pick-up location only if that step was somehow skipped.
        const stateId = Number(customer.stateId ?? locBk.stateId)
        const cityId = Number(customer.cityId ?? locBk.cityId)

        if (!stateId || !cityId) {
          throw new Error(
            'Please go back to the Your Info step and select your state and city.',
          )
        }

        const guestPayload: GuestBookingRequestPayload = {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          drivingLicenseNo: customer.license || '',
          passportNo: customer.passport || '',
          addressLine1: customer.addressLine1 || '',
          addressLine2: customer.addressLine2 || '',
          stateId,
          cityId,
          pincode: customer.pincode || '',
          booking: bookingPayload,
        }

        const res = await api.createGuestBooking(guestPayload)
        if (res?.bookingId) {
          localStorage.setItem('activeBookingId', String(res.bookingId))
        }
      }

      // The booking is saved, so the retained form has done its job. Clearing
      // it means the next booking starts from the customer's profile rather
      // than from the last person's typing.
      sessionStorage.removeItem(CUSTOMER_FORM_KEY)

      setShowSuccess(true)
    } catch (e: any) {
      // Never show a success screen for a booking that did not save.
      setSubmitError(e.message)
      setConfirmed(false)
    }
  }

  return (
    <div className="px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Confirm Your Booking</h1>
            <p className="text-slate-500 text-sm">Review all details before confirming</p>
          </div>
        </div>

        <div className="mb-8">
          <Stepper steps={STEPS} current={4} />
        </div>

        {/* Full Booking Summary */}
        <Card className="p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left */}
            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Car size={16} className="text-blue-600" /> Vehicle</h3>
              <div className="flex gap-4">
                <img src={vehicle.image} alt={vehicle.name} className="w-32 h-24 object-cover rounded-xl flex-shrink-0" />
                <div>
                  <p className="font-black text-slate-900">{vehicle.name}</p>
                  <Badge label={vehicle.category} dot={false} />
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Users size={12} />{vehicle.seats} seats</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Fuel size={12} />{vehicle.fuel}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Gauge size={12} />{vehicle.mileage}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><MapPin size={14} className="text-blue-600" /> Locations</h4>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Pickup</p>
                    <p className="text-sm font-semibold text-slate-800">{pickup}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {rentalDate ? fmtD(rentalDate) : 'TBD'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-green-600 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Return</p>
                    <p className="text-sm font-semibold text-slate-800">{drop}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {returnDate ? fmtD(returnDate) : 'TBD'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Pricing */}
            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={16} className="text-blue-600" /> Price Breakdown</h3>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="font-semibold">{F(vehicleTotal)}</span>
                </div>
                {addonObjs.map(a => (
                  <div key={a.addonId} className="flex justify-between text-sm">
                    <span className="text-slate-600">{a.addonName}</span>
                    <span className="font-semibold">{F(a.pricePerDay * days)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">GST (18%)</span>
                  <span className="font-semibold">{F(tax)}</span>
                </div>
                {insurance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Insurance</span>
                    <span className="font-semibold text-green-600">✓ Included</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-3 flex justify-between">
                  <span className="font-black text-slate-800">Grand Total</span>
                  <span className="font-black text-blue-600 text-xl">{F(grand)}</span>
                </div>
              </div>

              {/* Add-ons summary */}
              {addons.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold text-slate-700 text-sm mb-2">Selected Add-ons</h4>
                  <div className="flex flex-wrap gap-2">
                    {addonObjs.map(a => (
                      <span key={a.addonId} className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check size={10} /> {a.addonName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Details */}
              <div className="mt-5">
                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Users size={14} className="text-blue-600" /> Customer</h4>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-slate-800">{customer.firstName} {customer.lastName}</p>
                  <p className="text-slate-500">{customer.email}</p>
                  <p className="text-slate-500">{customer.phone}</p>

                  {/* The address is shown back before confirming, because it
                      is what gets printed on the invoice. */}
                  {customer.addressLine1 && (
                    <div className="pt-1.5 border-t border-slate-200 text-slate-500">
                      <p>{customer.addressLine1}</p>
                      {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                      <p>
                        {[customer.cityName, customer.stateName].filter(Boolean).join(', ')}
                        {customer.pincode ? ` - ${customer.pincode}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Error from the server, if the booking could not be saved */}
        {submitError && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {submitError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft size={16} /> Modify Booking
          </Button>
          <Button onClick={handleConfirm} loading={confirmed && !showSuccess} size="lg">
              <CheckCircle2 size={18} /> {isEditing ? 'Update Booking' : 'Confirm Booking'}
            </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Modal open={showSuccess} onClose={() => nav(homeScreen)} maxWidth="max-w-md">
        <div className="p-8 text-center">
          <div className="w-20 h-20 gradient-success rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">{isEditing ? 'Booking Updated!' : 'Booking Confirmed!'}</h2>
          <p className="text-slate-500 mb-5">{isEditing ? 'Your booking has been updated successfully.' : 'Your reservation has been successfully placed. A confirmation has been sent to your email.'}</p>
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Booking Reference</p>
            <p className="text-2xl font-black text-blue-600 font-mono">{bookingNo}</p>
          </div>
          <div className="space-y-3 text-sm text-left bg-slate-50 rounded-2xl p-4 mb-6">
            <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-semibold">{vehicle.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Pickup</span><span className="font-semibold text-right text-xs max-w-32">{pickup}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-semibold">{days} days</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total Paid</span><span className="font-black text-blue-600">{F(grand)}</span></div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Redirecting to home in <span className="font-bold text-blue-600">{homeCountdown}</span> seconds...</p>
            <Button onClick={() => nav(homeScreen)} fullWidth size="lg" variant="outline">
              Return to Home <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

// ── Main BookingFlow Controller ────────────────────────────────────────────
export default function BookingFlow({ nav, startStep = 0 }: { nav: NavFn; startStep?: number }) {
  const editingBookingId = sessionStorage.getItem('editingBookingId')
  const [step, setStep] = useState(startStep)
  const [pickup, setPickup] = useState(() => {
    if (editingBookingId) return sessionStorage.getItem('bookingEditPickup') || ''
    return ''
  })
  const [drop, setDrop] = useState(() => {
    if (editingBookingId) return sessionStorage.getItem('bookingEditDrop') || ''
    return ''
  })
  const [vehicle, setVehicle] = useState<Vehicle | null>(() => {
    try {
      const stored = sessionStorage.getItem('bookingVehicle')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [addons, setAddons] = useState<string[]>(() => {
    if (editingBookingId) {
      try {
        const stored = sessionStorage.getItem('bookingEditAddons')
        return stored ? JSON.parse(stored) : []
      } catch { return [] }
    }
    return []
  })
  const [customerInfo, setCustomerInfo] = useState<CustomerDetails>({
    firstName: '', lastName: '', email: '', phone: '', license: '', passport: '',
  })

  useEffect(() => {
    if (vehicle) sessionStorage.setItem('bookingVehicle', JSON.stringify(vehicle))
    else sessionStorage.removeItem('bookingVehicle')
  }, [vehicle])
  /**
   * The rental length the whole flow prices against.
   *
   * It reads the dates the customer actually chose. The old fallback of 5
   * days was silently wrong whenever the dates could not be read - the
   * customer saw a five-day price for a two-day booking. One day is the
   * honest floor, and the dates are validated before we ever get here.
   */
  const calcDays = () => {
    const loc = getBookingLocation()
    return rentalDays(loc.rentalDate, loc.returnDate)
  }
  const [days] = useState(calcDays)

  // Every step renders inside the same site chrome, so the header and footer
  // do not disappear halfway through a booking.
  const step0 = <LocationSelect nav={nav} onNext={(p, d) => { setPickup(p); setDrop(d); setStep(1) }} />
  if (step === 0) return <PublicPage nav={nav}>{step0}</PublicPage>
  if (step === 1) return <PublicPage nav={nav}><VehicleSelect onNext={v => { setVehicle(v); setStep(2) }} onBack={() => {
    try {
      const b = JSON.parse(sessionStorage.getItem('bookingLocation') || '{}')
      const isAirportPickup = b.type === 'airport'
      const isAirportReturn = b.returnType === 'airport'
      const hasDiffReturn = b.diffReturn
      const sameCityReturn = hasDiffReturn && b.returnCity && b.returnCity === b.city
      const skip = isAirportPickup && (!hasDiffReturn || isAirportReturn || sameCityReturn)
      if (skip) { nav('landing'); return }
    } catch {}
    setStep(0)
  }} selectedId={vehicle?.id} days={days} /></PublicPage>
  if (step === 2 && vehicle) return <PublicPage nav={nav}><AddOns vehicle={vehicle} days={days} onNext={a => { setAddons(a); setStep(3) }} onBack={() => setStep(1)} /></PublicPage>
  if (step === 3 && vehicle) return <PublicPage nav={nav}><CustomerInfo vehicle={vehicle} days={days} addons={addons} onNext={d => { setCustomerInfo(d); setStep(4) }} onBack={() => setStep(2)} /></PublicPage>
  if (step === 4 && vehicle) return <PublicPage nav={nav}><Confirmation vehicle={vehicle} days={days} addons={addons} pickup={pickup} drop={drop} customer={customerInfo} onBack={() => setStep(3)} nav={nav} isEditing={!!editingBookingId} editBookingId={editingBookingId || undefined} /></PublicPage>
  return null
}
