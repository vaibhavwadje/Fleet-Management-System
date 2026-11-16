import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Star, Zap, Crown, Car } from 'lucide-react'
import type { NavFn } from '../data'
import { PublicPage } from '../components/SiteChrome'
import { todayISO } from '../utils/date'
import { Button, Card, Input, Select } from '../components/shared'

const PLANS = [
  {
    id: 'basic', name: 'Basic', price: 'Free', period: '',
    color: 'border-slate-200', badge: '', icon: Star,
    perks: ['Standard booking', 'Email support', '1 vehicle category', 'Basic insurance'],
  },
  {
    id: 'silver', name: 'Silver', price: '₹499', period: '/year',
    color: 'border-blue-500 bg-blue-50', badge: 'Popular', icon: Zap,
    perks: ['Priority booking', 'Free GPS navigation', '10% discount', 'Phone support', 'Free cancellation'],
  },
  {
    id: 'gold', name: 'Gold', price: '₹999', period: '/year',
    color: 'border-amber-500 bg-amber-50', badge: 'Premium', icon: Crown,
    perks: ['First priority', 'Free upgrades', '20% discount', 'Concierge', 'Free extra driver', 'Lounge access'],
  },
]

export default function Membership({ nav }: { nav: NavFn }) {
  const [step, setStep] = useState(0)
  const [plan, setPlan] = useState('silver')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setDone(true) }, 1500)
  }

  if (done) {
    const selectedPlan = PLANS.find(p => p.id === plan)!
    const memberNo = 'FLM-MEMBER-' + Math.random().toString().slice(2, 8).toUpperCase()
    return (
      <PublicPage nav={nav}>
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-float p-10 max-w-md w-full text-center animate-scale-in">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${plan === 'gold' ? 'bg-amber-100' : plan === 'silver' ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <selectedPlan.icon size={44} className={plan === 'gold' ? 'text-amber-600' : plan === 'silver' ? 'text-blue-600' : 'text-slate-600'} />
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold mb-4 inline-block ${plan === 'gold' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {selectedPlan.name} Member
          </span>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Welcome to FLEMAN!</h2>
          <p className="text-slate-500 mb-6">Your membership has been activated. Enjoy exclusive benefits on every rental.</p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Membership ID</p>
            <p className="font-mono font-black text-slate-800 text-lg">{memberNo}</p>
          </div>
          <div className="space-y-2 mb-6 text-left">
            {selectedPlan.perks.map(p => (
              <div key={p} className="flex items-center gap-2.5 text-sm text-slate-700">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                {p}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => nav('landing')} variant="outline" fullWidth>Go Home</Button>
            <Button onClick={() => nav('location')} fullWidth>Book Now <ArrowRight size={14} /></Button>
          </div>
        </div>
      </div>
      </PublicPage>
    )
  }

  return (
    <PublicPage nav={nav}>
    <div className="px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => nav('landing')} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Join FLEMAN Membership</h1>
            <p className="text-slate-500 text-sm">Unlock exclusive benefits, discounts, and priority service</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-10">
          {['Choose Plan', 'Personal Info', 'Driving Details', 'Confirm'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < step ? 'gradient-primary text-white' : i === step ? 'gradient-primary text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${i === step ? 'text-blue-600' : i < step ? 'text-slate-600' : 'text-slate-400'}`}>{s}</span>
              {i < 3 && <div className={`w-8 h-px ${i < step ? 'bg-blue-600' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Plan Selection */}
        {step === 0 && (
          <div className="animate-fade-in">
            <div className="grid md:grid-cols-3 gap-5 mb-8">
              {PLANS.map(p => {
                const Icon = p.icon
                const selected = plan === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 ${selected ? p.color + ' shadow-card-hover scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    {p.badge && (
                      <span className={`absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full ${p.id === 'gold' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>{p.badge}</span>
                    )}
                    <Icon size={28} className={`mb-4 ${p.id === 'gold' ? 'text-amber-500' : p.id === 'silver' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h3 className="font-black text-slate-900 text-lg mb-1">{p.name}</h3>
                    <p className={`text-2xl font-black mb-4 ${p.id === 'gold' ? 'text-amber-600' : p.id === 'silver' ? 'text-blue-600' : 'text-slate-500'}`}>
                      {p.price}<span className="text-sm font-semibold text-slate-400">{p.period}</span>
                    </p>
                    <ul className="space-y-2">
                      {p.perks.map(perk => (
                        <li key={perk} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                    {selected && (
                      <div className="mt-4 pt-4 border-t border-current/20">
                        <span className="text-xs font-bold text-current flex items-center gap-1">
                          <CheckCircle2 size={12} /> Selected
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} size="lg">
                Continue with {PLANS.find(p => p.id === plan)?.name} <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card className="p-6 animate-fade-in">
            <h3 className="font-bold text-slate-800 mb-5">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input label="First Name" placeholder="Arjun" />
              <Input label="Last Name" placeholder="Mehta" />
              <Input label="Email Address" type="email" placeholder="arjun@email.com" />
              <Input label="Phone Number" placeholder="+91 98765 43210" />
              <Input label="Date of Birth" type="date" max={todayISO()} />
              <Select label="Gender" options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Prefer not to say' },
              ]} />
            </div>
            <Input label="Home Address" placeholder="12, Marine Drive, Mumbai 400020" />
            <div className="flex gap-3 mt-6">
              <Button onClick={() => setStep(0)} variant="outline" fullWidth><ArrowLeft size={14} /> Back</Button>
              <Button onClick={() => setStep(2)} fullWidth>Continue <ArrowRight size={16} /></Button>
            </div>
          </Card>
        )}

        {/* Step 2: Driving Details */}
        {step === 2 && (
          <Card className="p-6 animate-fade-in">
            <h3 className="font-bold text-slate-800 mb-5">Driving & Identity</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input label="Driving License Number" placeholder="MH1220230001234" />
              <Input label="License Expiry Date" type="date" />
              <Input label="Passport Number" placeholder="B1234567" />
              <Input label="Passport Expiry" type="date" />
              <Select label="Preferred Vehicle" options={[
                { value: 'suv', label: 'SUV' },
                { value: 'sedan', label: 'Sedan' },
                { value: 'luxury', label: 'Luxury' },
                { value: 'electric', label: 'Electric' },
                { value: 'compact', label: 'Compact' },
              ]} />
              <Select label="Preferred Fuel" options={[
                { value: 'petrol', label: 'Petrol' },
                { value: 'diesel', label: 'Diesel' },
                { value: 'electric', label: 'Electric' },
                { value: 'hybrid', label: 'Hybrid' },
              ]} />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" fullWidth><ArrowLeft size={14} /> Back</Button>
              <Button onClick={() => setStep(3)} fullWidth>Continue <ArrowRight size={16} /></Button>
            </div>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="animate-fade-in space-y-4">
            <Card className="p-6">
              <h3 className="font-bold text-slate-800 mb-4">Review & Confirm</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ['Full Name', 'Arjun Mehta'],
                  ['Email', 'arjun@email.com'],
                  ['Phone', '+91 98765 43210'],
                  ['Plan', PLANS.find(p => p.id === plan)?.name || ''],
                  ['License', 'MH1220230001234'],
                  ['Passport', 'B1234567'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">{k}</p>
                    <p className="font-semibold text-slate-800 text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-sm text-blue-700">
                <CheckCircle2 size={14} className="text-blue-600" />
                By proceeding, you agree to FLEMAN's Terms of Service and Privacy Policy.
              </div>
            </Card>
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" fullWidth><ArrowLeft size={14} /> Back</Button>
              <Button onClick={handleSubmit} loading={loading} fullWidth size="lg">
                <CheckCircle2 size={16} /> Complete Registration
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PublicPage>
  )
}
