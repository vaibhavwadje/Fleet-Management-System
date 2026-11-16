import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Car, MapPin, Calendar, Clock, ChevronRight, Star, Phone, Mail,
  ArrowRight, X, Shield, Zap, User, Gift, Headphones, Globe, ChevronDown,
} from 'lucide-react'
import type { NavFn } from '../data'
import { Button, Card } from '../components/shared'
import { SiteHeader, SiteFooter } from '../components/SiteChrome'
import { api } from '../api'
import { SearchSelect } from '../components/SearchSelect'
import { todayISO, addDays, rentalDays } from '../utils/date'

/** Today in yyyy-MM-dd, used as the `min` on every booking date picker so
    past dates cannot be chosen. The backend enforces the same rule.
    Computed in LOCAL time - see utils/date.ts for why that matters. */
const TODAY = todayISO()

const FEATURES = [
  { icon: Shield, title: 'Fully Insured', desc: 'Every rental comes with comprehensive insurance coverage for total peace of mind.' },
  { icon: Zap,    title: 'Instant Booking', desc: 'Book in under 2 minutes. Get confirmation instantly on email and SMS.' },
  { icon: MapPin, title: '50+ Locations', desc: 'Airport, hotel, and city pickups across major metro areas.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Our dedicated team is available around the clock to assist you.' },
]

const CATEGORY_IMAGES: Record<string, string> = {
  SUV: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&h=280&fit=crop',
  Luxury: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=280&fit=crop',
  Electric: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=280&fit=crop',
  Sedan: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=280&fit=crop',
  Compact: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=400&h=280&fit=crop',
}

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Business Executive, Mumbai', stars: 5, text: "FLEMAN made my corporate travel seamless. The BMW was immaculate, and pickup from BOM was effortless. Will absolutely use again.", avatar: 'PS' },
  { name: 'Rahul Gupta', role: 'Travel Blogger', stars: 5, text: "Booked a Range Rover for a week-long trip. The app is intuitive, pricing is transparent, and the car was spotless. Highly recommend FLEMAN.", avatar: 'RG' },
  { name: 'Anita Desai', role: 'Wedding Planner, Pune', stars: 5, text: "Used FLEMAN for our wedding convoy — 6 luxury vehicles, all perfectly arranged. The staff was professional and punctual. Exceptional service!", avatar: 'AD' },
]

const OFFERS = [
  { badge: 'Limited', title: '30% Off Weekends', desc: 'Book any vehicle for Fri–Sun and save big. Use code WEEKEND30.', color: 'from-blue-600 to-blue-800', expires: 'Ends Dec 31' },
  { badge: 'New Member', title: 'First Booking Free Insurance', desc: 'New members get complimentary insurance on their first rental.', color: 'from-green-600 to-green-800', expires: 'Always on' },
  { badge: 'Long Stay', title: 'Monthly Rate: Save 40%', desc: 'Rent for 30+ days and get our best monthly pricing automatically.', color: 'from-purple-600 to-purple-800', expires: 'Ongoing' },
]

function TimePicker({ value, onChange, icon: Icon }: {
  value: string
  onChange: (v: string) => void
  icon?: any
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [h24, m] = value.split(':').map(Number)
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (h: number, mi: string, ap: string) => {
    let hh = h
    if (ap === 'AM' && hh === 12) hh = 0
    if (ap === 'PM' && hh !== 12) hh += 12
    onChange(`${String(hh).padStart(2, '0')}:${mi}`)
  }

  return (
    <div ref={ref} className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`field ${Icon ? 'field-icon' : ''} text-left cursor-pointer`}
      >
        {`${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`}
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
          <div className="flex gap-3 items-start">
            {/* Hours */}
            <div className="flex-1 max-h-40 overflow-y-auto space-y-0.5">
              {hours.map(h => (
                <button
                  key={h}
                  type="button"
                  onMouseDown={() => pick(Number(h), String(m).padStart(2, '0'), ampm)}
                  className={`w-full text-center px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    Number(h) === h12 ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >{h}</button>
              ))}
            </div>
            {/* Minutes */}
            <div className="flex-1 max-h-40 overflow-y-auto space-y-0.5">
              {minutes.map(mi => (
                <button
                  key={mi}
                  type="button"
                  onMouseDown={() => pick(h12, mi, ampm)}
                  className={`w-full text-center px-2 py-1.5 text-sm rounded-lg transition-colors ${
                    mi === String(m).padStart(2, '0') ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >{mi}</button>
              ))}
            </div>
            {/* AM/PM */}
            <div className="space-y-1">
              {['AM', 'PM'].map(ap => (
                <button
                  key={ap}
                  type="button"
                  onMouseDown={() => pick(h12, String(m).padStart(2, '0'), ap)}
                  className={`block w-12 text-center px-2 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    ap === ampm ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >{ap}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DynamicSearch({ endpoint, placeholder, icon: Icon, onChange, displayFormat = 'code+name', extraQueryParams, onItemSelect }: {
  endpoint: string
  placeholder: string
  icon?: any
  onChange: (v: string) => void
  displayFormat?: 'code+name' | 'name'
  extraQueryParams?: Record<string, string>
  onItemSelect?: (item: { id?: string; code: string; name: string; hubId?: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ id?: string; code: string; name: string; hubId?: number }[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const loadedOnce = useRef(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buildUrl = useCallback((q: string) => {
    const params = new URLSearchParams()
    if (endpoint.includes('/airports/search')) {
      params.set('keyword', q)
    } else {
      params.set('query', q)
    }
    if (extraQueryParams) {
      Object.entries(extraQueryParams).forEach(([k, v]) => { if (v) params.set(k, v) })
    }
    return `${endpoint}?${params.toString()}`
  }, [endpoint, extraQueryParams])

  const fetchSuggestions = useCallback((q: string) => {
    if (controllerRef.current) controllerRef.current.abort()

    controllerRef.current = new AbortController()
    fetch(buildUrl(q), { signal: controllerRef.current.signal })
      .then(res => { if (!res.ok) throw new Error(); return res.json() })
      .then(raw => {
        const list = raw && !Array.isArray(raw) && raw.data ? raw.data : raw
        if (!list || list.length === 0) { setSuggestions([]); setOpen(false); loadedOnce.current = true; return }
        setSuggestions(list.map((item: any) => ({
          id: item.stateId ?? item.cityId ?? item.airportId ?? undefined,
          code: item.airportCode || item.stateName || item.cityName || item.code || '',
          name: item.airportName || item.stateName || item.cityName || item.name || '',
          hubId: item.hubId ?? undefined
        })))
        setOpen(true)
        loadedOnce.current = true
      })
      .catch(() => { /* silent */ })
  }, [buildUrl])

  const handleInput = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const handleSelect = (item: { id?: string; code: string; name: string; hubId?: number }) => {
    setQuery(displayFormat === 'code+name' ? item.code : item.name)
    onChange(displayFormat === 'code+name' ? item.code : item.name)
    onItemSelect?.(item)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />}
      <input
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => {
          if (!loadedOnce.current) fetchSuggestions('')
          else if (suggestions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={`field ${Icon ? 'field-icon' : ''}`}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <button
              key={item.code || item.name}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-50 last:border-0"
            >
              {displayFormat === 'code+name' ? (
                <><span className="font-semibold">{item.code}</span><span className="text-slate-400 ml-2 text-xs">{item.name}</span></>
              ) : (
                <span className="font-semibold">{item.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Landing({ nav }: { nav: NavFn }) {
  // The header and its sign-in / profile menu now live in SiteHeader, so
  // this screen only owns the booking widget below.
  const [signedOut, setSignedOut] = useState(false)

  const today = TODAY
  const future = addDays(TODAY, 5)

  const [rentalDate, setRentalDate] = useState(today)

  /**
   * A rental has to last at least one day, so the return date can never be
   * the same as - or before - the pick-up date. Moving the pick-up date
   * forward drags the return date along with it rather than leaving an
   * impossible pair on screen for the customer to puzzle over.
   */
  const handleRentalDateChange = (value: string) => {
    setRentalDate(value)
    if (value && returnDate <= value) {
      setReturnDate(addDays(value, 1))
    }
  }
  const [rentalTime, setRentalTime] = useState('10:00')
  const [returnDate, setReturnDate] = useState(future)
  const [returnTime, setReturnTime] = useState('10:00')

  const [pickupMode, setPickupMode] = useState<'airport' | 'city'>('airport')
  const [pickupStateId, setPickupStateId] = useState('')
  const [pickupCityKey, setPickupCityKey] = useState(0)
  const [pickupAirport, setPickupAirport] = useState('')
  const [pickupAirportId, setPickupAirportId] = useState<number>()
  const [pickupHubId, setPickupHubId] = useState<number>()
  const [pickupCity, setPickupCity] = useState('')
  const [pickupCityId, setPickupCityId] = useState<number>()
  const [pickupState, setPickupState] = useState('')

  const [diffReturn, setDiffReturn] = useState(false)
  const [returnMode, setReturnMode] = useState<'airport' | 'city'>('airport')
  const [returnStateId, setReturnStateId] = useState('')
  const [returnCityKey, setReturnCityKey] = useState(0)
  const [returnAirport, setReturnAirport] = useState('')
  const [returnAirportId, setReturnAirportId] = useState<number>()
  const [returnHubId, setReturnHubId] = useState<number>()
  const [returnCity, setReturnCity] = useState('')
  const [returnCityId, setReturnCityId] = useState<number>()
  const [returnState, setReturnState] = useState('')

  const [states, setStates] = useState<{ stateId: number; stateName: string }[]>([])
  const [pickupCities, setPickupCities] = useState<{ cityId: number; cityName: string }[]>([])
  const [returnCities, setReturnCities] = useState<{ cityId: number; cityName: string }[]>([])

  useEffect(() => { api.states().then(setStates).catch(() => {}) }, [])

  useEffect(() => {
    if (pickupStateId) api.citiesByState(Number(pickupStateId)).then(setPickupCities).catch(() => setPickupCities([]))
    else setPickupCities([])
  }, [pickupStateId])

  useEffect(() => {
    if (returnStateId) api.citiesByState(Number(returnStateId)).then(setReturnCities).catch(() => setReturnCities([]))
    else setReturnCities([])
  }, [returnStateId])

  const [locationError, setLocationError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)

  const showError = (msg: string) => {
    setLocationError(msg)
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    setTimeout(() => setLocationError(''), 5000)
  }

  const handleContinueBooking = () => {
    const requiresReturn = diffReturn && returnMode === 'airport' ? !returnAirport
      : diffReturn && returnMode === 'city' ? !returnStateId || !returnCity
      : false
    if (requiresReturn) {
      showError(diffReturn && returnMode === 'airport' ? 'Please search and select a return airport'
        : 'Please select a return state and city')
      return
    }
    if (pickupMode === 'airport' && !pickupAirport) { showError('Please search and select an airport'); return }
    if (pickupMode === 'city' && !pickupStateId) { showError('Please select a state'); return }
    if (pickupMode === 'city' && pickupStateId && !pickupCity) { showError('Please select a city for the selected state'); return }
    // A rental must last at least one day. The picker already blocks this,
    // but a typed-in date bypasses the picker's `min`.
    if (!rentalDate || !returnDate) { showError('Please choose a rental and a return date'); return }
    if (rentalDate < TODAY) { showError('The rental date cannot be in the past'); return }
    if (returnDate <= rentalDate) { showError('The return date must be after the rental date'); return }

    sessionStorage.setItem('bookingLocation', JSON.stringify({
      type: pickupMode, airport: pickupAirport, state: pickupState, stateId: pickupStateId, city: pickupCity,
      cityId: pickupCityId, airportId: pickupAirportId, hubId: pickupHubId,
      rentalDate, rentalTime, returnDate, returnTime,
      diffReturn, returnType: diffReturn ? returnMode : null,
      returnAirport: diffReturn ? returnAirport : null, returnState: diffReturn ? returnState : null,
      returnStateId: diffReturn ? returnStateId : null, returnCity: diffReturn ? returnCity : null,
      returnCityId: diffReturn ? returnCityId : null, returnAirportId: diffReturn ? returnAirportId : null,
      returnHubId: diffReturn ? returnHubId : null,
    }))
    nav('location')
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ──────────────────────────────────────── */}
      <SiteHeader nav={nav} onLanding />

      {/* ── Hero Section ────────────────────────────────── */}
      <section id="home" className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1920&h=1080&fit=crop&auto=format"
            alt="Premium fleet"
            className="w-full h-full object-cover opacity-25"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />

        {/* Floating dots pattern */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Headline */}
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm font-semibold">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              50+ vehicles available now
            </div>
            <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight">
              Drive the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Premium
              </span>
              <br />Experience.
            </h1>
            <p className="text-lg text-slate-300 max-w-md leading-relaxed">
              India's most trusted fleet rental platform. Luxury vehicles, seamless booking, and white-glove service — wherever you go.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" className="text-amber-400" />)}
                <span className="text-sm text-slate-300 ml-2">4.9 · 2,400+ reviews</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {FEATURES.slice(0,3).map(f => (
                <div key={f.title} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-sm text-white/90 border border-white/10">
                  <f.icon size={14} className="text-blue-300" />
                  {f.title}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Reservation Card */}
          <div className="animate-scale-in">
            <div className="glass rounded-2xl p-6 shadow-float border border-white/30">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">Make a Reservation</h2>
                <p className="text-sm text-slate-500 mt-0.5">Find and book your perfect vehicle</p>
              </div>

              <div className="space-y-5">

                {/* Row 1 – Rental Date & Time */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Rental Date &amp; Time</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input type="date" min={TODAY} value={rentalDate} onChange={e => handleRentalDateChange(e.target.value)}
                        className="field field-icon" />
                    </div>
                    <div className="flex-1">
                      <TimePicker value={rentalTime} onChange={setRentalTime} icon={Clock} />
                    </div>
                  </div>
                </div>

                {/* Row 2 – Return Date & Time */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Return Date &amp; Time</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input type="date" min={addDays(rentalDate || TODAY, 1)} value={returnDate} onChange={e => setReturnDate(e.target.value)}
                        className="field field-icon" />
                    </div>
                    <div className="flex-1">
                      <TimePicker value={returnTime} onChange={setReturnTime} icon={Clock} />
                    </div>
                  </div>
                  {/* Shown so the customer can see exactly how many days
                      they are being priced for before they commit. */}
                  {rentalDate && returnDate && returnDate > rentalDate && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Rental length:{' '}
                      <span className="font-semibold text-slate-700">
                        {rentalDays(rentalDate, returnDate)} day
                        {rentalDays(rentalDate, returnDate) === 1 ? '' : 's'}
                      </span>
                    </p>
                  )}
                </div>

                {/* Row 3 – Pick-Up Location */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-2 block">Pick-Up Location <span className="text-red-500">*</span></label>
                  <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-0.5 w-fit">
                    <button onClick={() => setPickupMode('airport')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${pickupMode === 'airport' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Airport Code</button>
                    <button onClick={() => setPickupMode('city')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${pickupMode === 'city' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>State / City</button>
                  </div>

                  {pickupMode === 'airport' ? (
                    <DynamicSearch
                      endpoint="/api/airports/search"
                      placeholder="Search airport..."
                      icon={Globe}
                      onChange={() => {}}
                      displayFormat="code+name"
                      onItemSelect={(item) => {
                        setPickupAirport(item.code + ' - ' + item.name)
                        setPickupAirportId(Number(item.id))
                        setPickupHubId(item.hubId)
                      }}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchSelect
                          value={pickupStateId}
                          options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
                          placeholder="Search state..."
                          icon={MapPin}
                          onSelect={opt => {
                            setPickupStateId(opt ? String(opt.id) : '')
                            setPickupState(opt ? opt.label : '')
                            setPickupCity('')
                            setPickupCityId(undefined)
                            setLocationError('')
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <SearchSelect
                          value={pickupCityId ?? ''}
                          options={pickupCities.map(c => ({ id: c.cityId, label: c.cityName }))}
                          placeholder="Search city..."
                          icon={MapPin}
                          disabled={!pickupStateId}
                          disabledText="Select a state first"
                          onSelect={opt => {
                            setPickupCity(opt ? opt.label : '')
                            setPickupCityId(opt ? Number(opt.id) : undefined)
                            setLocationError('')
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 4 – Different Return Location checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={diffReturn} onChange={e => setDiffReturn(e.target.checked)}
                    className="checkbox-custom" />
                  <span className="text-sm font-medium text-slate-700">I may return the car to a different location</span>
                </label>

                {/* Row 5 – Return Location (conditional) */}
                {diffReturn && (
                  <div className="animate-fade-in">
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">Return Location <span className="text-red-500">*</span></label>
                    <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-0.5 w-fit">
                      <button onClick={() => setReturnMode('airport')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${returnMode === 'airport' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Airport Code</button>
                      <button onClick={() => setReturnMode('city')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${returnMode === 'city' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>State / City</button>
                    </div>

                    {returnMode === 'airport' ? (
                      <DynamicSearch
                        endpoint="/api/airports/search"
                        placeholder="Search airport..."
                        icon={Globe}
                        onChange={() => {}}
                        displayFormat="code+name"
                        onItemSelect={(item) => {
                          setReturnAirport(item.code + ' - ' + item.name)
                          setReturnAirportId(Number(item.id))
                          setReturnHubId(item.hubId)
                        }}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <SearchSelect
                            value={returnStateId}
                            options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
                            placeholder="Search state..."
                            icon={MapPin}
                            onSelect={opt => {
                              setReturnStateId(opt ? String(opt.id) : '')
                              setReturnState(opt ? opt.label : '')
                              setReturnCity('')
                              setReturnCityId(undefined)
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <SearchSelect
                            value={returnCityId ?? ''}
                            options={returnCities.map(c => ({ id: c.cityId, label: c.cityName }))}
                            placeholder="Search city..."
                            icon={MapPin}
                            disabled={!returnStateId}
                            disabledText="Select a state first"
                            onSelect={opt => {
                              setReturnCity(opt ? opt.label : '')
                              setReturnCityId(opt ? Number(opt.id) : undefined)
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 6 – Continue Booking */}
                {locationError && (
                  <div ref={errorRef} className="text-sm text-red-600 bg-red-50 rounded-xl p-3 flex items-center gap-2">
                    ⚠ {locationError}
                  </div>
                )}
                <Button onClick={handleContinueBooking} fullWidth size="lg" className="shadow-blue">
                  Continue Booking <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 animate-bounce">
          <span className="text-xs font-medium">Scroll to explore</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────── */}
      <section className="bg-blue-600 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
            {[
              { value: '54', unit: '+', label: 'Fleet Vehicles' },
              { value: '12', unit: 'K+', label: 'Happy Customers' },
              { value: '50', unit: '+', label: 'Pickup Locations' },
              { value: '4.9', unit: '★', label: 'Average Rating' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black">{s.value}<span className="text-blue-200">{s.unit}</span></div>
                <div className="text-sm text-blue-200 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vehicle Categories ───────────────────────────── */}
      <section id="vehicles" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Our Fleet</span>
          <h2 className="text-4xl font-black text-slate-900 mt-2">Choose Your Category</h2>
          <p className="text-slate-500 text-lg mt-3 max-w-xl mx-auto">From compact city cars to prestigious luxury vehicles — we have the perfect match for every journey.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Display only: the cards and their footer buttons are shown but do
              nothing. No click handler, no hover lift, and the cursor stays a
              plain arrow so they do not look clickable while being dead. */}
          {['SUV', 'Luxury', 'Electric', 'Sedan'].map(name => (
                <Card key={name} className="vehicle-card overflow-hidden p-0 group cursor-default">
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img src={CATEGORY_IMAGES[name]} alt={name} className="vehicle-card-img w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="font-black text-lg leading-tight">{name}</p>
                      <p className="text-xs text-white/80 font-medium">From ₹{name === 'SUV' ? '220' : name === 'Luxury' ? '185' : name === 'Electric' ? '130' : '95'}/day</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-slate-600">Browse vehicles</span>
                    <ChevronRight size={16} className="text-blue-600" />
                  </div>
                </Card>
              ))}
        </div>
      </section>

      {/* ── Why FLEMAN ──────────────────────────────────── */}
      <section id="about" className="py-20 bg-gradient-to-br from-slate-900 to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-blue-400 text-sm font-bold uppercase tracking-widest">Why FLEMAN</span>
            <h2 className="text-4xl font-black text-white mt-2">Built for the Modern Traveller</h2>
            <p className="text-slate-400 text-lg mt-3 max-w-xl mx-auto">Every feature designed to make your journey effortless, comfortable, and memorable.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Offers ──────────────────────────────────────── */}
      <section id="offers" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Special Offers</span>
          <h2 className="text-4xl font-black text-slate-900 mt-2">Exclusive Deals</h2>
          <p className="text-slate-500 text-lg mt-3">Don't miss out on our best rates and seasonal promotions.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {OFFERS.map((offer, i) => (
            // Display only - see the note on the category cards above.
            <div key={i} className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${offer.color} text-white cursor-default`}>
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-bold">{offer.badge}</span>
              </div>
              <Gift size={32} className="mb-4 opacity-80" />
              <h3 className="text-xl font-black mb-2">{offer.title}</h3>
              <p className="text-sm opacity-80 mb-4 leading-relaxed">{offer.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-70">{offer.expires}</span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  Book Now <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Reviews</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2">Loved by Travellers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="p-6 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-1 mb-3">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={14} fill="currentColor" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{t.text}</p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-bold text-sm">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact & Customer Care ──────────────────────── */}
      <section id="contact" className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Contact Us</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2 mb-6">Get in Touch</h2>
            <div className="space-y-4">
              {[
                { icon: Phone, label: '24/7 Helpline', value: '+91 1800 266 3526', sub: 'Always available' },
                { icon: Mail,  label: 'Email Support', value: 'support@fleman.in', sub: 'Response within 1 hour' },
                { icon: MapPin, label: 'Head Office', value: 'BKC, Mumbai — 400 051', sub: 'Mon–Sat, 9am–6pm' },
              ].map(c => (
                <div key={c.label} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div className="p-3 bg-blue-50 rounded-xl"><c.icon size={20} className="text-blue-600" /></div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
                    <p className="font-bold text-slate-800">{c.value}</p>
                    <p className="text-xs text-slate-400">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="p-6">
            <h3 className="font-bold text-slate-800 mb-4">Send us a Message</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <input className="field" placeholder="Arjun" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <input className="field" placeholder="Mehta" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <input type="email" className="field" placeholder="arjun@email.com" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Message</label>
                <textarea rows={4} className="field resize-none" placeholder="How can we help you?" />
              </div>
              <Button fullWidth>Send Message <ArrowRight size={16} /></Button>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <SiteFooter nav={nav} />
      {/* Signed out toast */}
      {signedOut && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-float text-sm font-semibold animate-scale-in">
          Signed out successfully
        </div>
      )}
    </div>
  )
}
