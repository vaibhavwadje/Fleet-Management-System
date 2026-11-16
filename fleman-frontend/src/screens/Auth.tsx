import { useState } from 'react'
import { Car, ArrowRight, Eye, EyeOff, ArrowLeft, Shield, Zap, Users } from 'lucide-react'
import type { NavFn } from '../data'
import { Button, Input } from '../components/shared'
import { PublicPage } from '../components/SiteChrome'
import { api, session } from '../api'

type LoginAs = 'CUSTOMER' | 'STAFF'

export function Login({ nav }: { nav: NavFn }) {
  const [loginAs, setLoginAs] = useState<LoginAs>('CUSTOMER')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loginAsCustomer = async () => {
    const res = await api.login(email, password)

    // Store a minimal session first so the token is available for the
    // profile call that follows.
    session.saveCustomer(res.accessToken, { email: res.email })

    try {
      const p = await api.profile()
      session.saveCustomer(res.accessToken, {
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        drivingLicenseNo: p.drivingLicenseNo,
      })
    } catch {
      // A missing profile must not block the login itself.
    }

    // Everyone lands on the shared home page. Staff and customers reach
    // their dashboards from the header menu, not by being redirected.
    nav('landing')
  }

  const loginAsStaff = async () => {
    const res = await api.staffLogin(email, password)

    session.saveStaff(res.token, {
      staffId: res.staffId,
      firstName: res.firstName,
      lastName: res.lastName,
      email: res.email,
      hubId: res.hubId,
    })

    nav('landing')
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (loginAs === 'STAFF') {
        await loginAsStaff()
      } else {
        await loginAsCustomer()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicPage nav={nav}>
    <div className="flex items-center justify-center p-4">
      <div className="relative grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-float overflow-hidden w-full max-w-[900px] animate-scale-in" style={{ maxWidth: '900px' }}>
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col justify-between p-12 gradient-hero text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Car size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black">FLEMAN</span>
          </div>
          <div>
            <h2 className="text-3xl font-black mb-4 leading-tight">Welcome back to India's premium fleet platform.</h2>
            <div className="space-y-3 text-sm text-blue-200">
              {[
                { icon: Shield, t: 'Secure & encrypted login' },
                { icon: Zap,    t: 'Instant booking access' },
                { icon: Users,  t: '12,000+ happy members' },
              ].map(f => (
                <div key={f.t} className="flex items-center gap-2.5"><f.icon size={14} className="text-blue-400" />{f.t}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-white/60 rounded-full" />
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="w-2 h-2 bg-white/60 rounded-full" />
          </div>
        </div>

        {/* Right: Form */}
        <div className="p-10 lg:p-12 lg:px-14 flex flex-col justify-center">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center"><Car size={16} className="text-white" /></div>
            <span className="font-black text-slate-900 text-xl">FLEMAN</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-1">Sign in to your account</h1>
          <p className="text-slate-500 text-sm mb-6">Don't have one? <button onClick={() => nav('register')} className="text-blue-600 font-semibold hover:underline">Register for free</button></p>

          {/* Customer / Staff switch - staff use a different login endpoint */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            {(['CUSTOMER', 'STAFF'] as LoginAs[]).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => { setLoginAs(role); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  loginAs === role ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {role === 'CUSTOMER' ? 'Customer' : 'Staff'}
              </button>
            ))}
          </div>

          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); handleLogin() }}
          >
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="field pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-blue-600 hover:underline font-semibold">Forgot password?</button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 flex items-center gap-2">⚠ {error}</div>}
            <Button type="submit" loading={loading} fullWidth size="lg">
              Sign In <ArrowRight size={16} />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="border-t border-slate-200" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-400">or sign in with</span>
          </div>

          <div className="flex flex-col gap-2">
            {/* Sends the browser to the backend, which starts the Google flow
                and redirects back to /oauth-success carrying a JWT. */}
            <button
              onClick={() => { window.location.href = '/oauth2/authorization/google' }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Continue with Google
            </button>
            <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 23 23"><rect width="23" height="23" rx="2" fill="#f25022"/><rect x="12" width="11" height="11" rx="0" fill="#7fba00"/><rect y="12" width="11" height="11" rx="0" fill="#00a4ef"/><rect x="12" y="12" width="11" height="11" rx="0" fill="#ffb900"/></svg>
              Continue with Microsoft
            </button>
          </div>

          <button onClick={() => nav('landing')} className="mt-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </button>
        </div>
      </div>
    </div>
    </PublicPage>
  )
}

export function Register({ nav }: { nav: NavFn }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const pw = form.password
  const pwChecks = [
    { label: 'Minimum 8 characters', pass: pw.length >= 8 },
    { label: 'At least 1 uppercase letter', pass: /[A-Z]/.test(pw) },
    { label: 'At least 1 number', pass: /[0-9]/.test(pw) },
  ]

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'firstName': return value.trim() ? '' : 'First name is required'
      case 'lastName': return value.trim() ? '' : 'Last name is required'
      case 'email':
        if (!value.trim()) return 'Please enter a valid email address'
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Please enter a valid email address'
      case 'phone':
        if (!value.trim()) return 'Phone number must be exactly 10 digits'
        return /^[0-9]{10}$/.test(value) ? '' : 'Phone number must be exactly 10 digits'
      case 'password':
        if (!value) return 'Password must be at least 8 characters, with 1 uppercase and 1 number'
        return value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value)
          ? '' : 'Password must be at least 8 characters, with 1 uppercase and 1 number'
      case 'confirmPassword':
        if (!value) return 'Passwords do not match'
        return value === form.password ? '' : 'Passwords do not match'
      default: return ''
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    if (touched[field]) setErrors(p => ({ ...p, [field]: validateField(field, value) }))
    if (field === 'password' && touched.confirmPassword && form.confirmPassword) {
      setErrors(p => ({ ...p, confirmPassword: value === form.confirmPassword ? '' : 'Passwords do not match' }))
    }
  }

  const handleBlur = (field: string) => {
    setTouched(p => ({ ...p, [field]: true }))
    setErrors(p => ({ ...p, [field]: validateField(field, form[field as keyof typeof form]) }))
  }

  const isFormValid = () => {
    const fieldErrors: Record<string, string> = {}
    ;(['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'] as const).forEach(f => {
      const err = validateField(f, form[f])
      if (err) fieldErrors[f] = err
    })
    if (!agreeTerms) fieldErrors.terms = 'Please agree to the Terms & Conditions'
    setErrors(fieldErrors)
    return Object.keys(fieldErrors).length === 0
  }

  const handleSubmit = async () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true })
    if (!isFormValid()) return
    setLoading(true)
    setError('')
    try {
      await api.register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      setLoading(false)
      nav('login')
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const showError = (field: string) => touched[field] && errors[field] ? errors[field] : null

  return (
    <PublicPage nav={nav}>
    <div className="flex items-center justify-center p-4">
      <div className="relative grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-float overflow-hidden w-full max-w-[900px] animate-scale-in" style={{ maxWidth: '900px' }}>
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col justify-between p-12 gradient-hero text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Car size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black">FLEMAN</span>
          </div>
          <div>
            <h2 className="text-3xl font-black mb-4 leading-tight">Welcome to India's premium fleet platform.</h2>
            <div className="space-y-3 text-sm text-blue-200">
              {[
                { icon: Shield, t: 'Secure & encrypted login' },
                { icon: Zap,    t: 'Instant booking access' },
                { icon: Users,  t: '12,000+ happy members' },
              ].map(f => (
                <div key={f.t} className="flex items-center gap-2.5"><f.icon size={14} className="text-blue-400" />{f.t}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-2 h-2 bg-white/60 rounded-full" />
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="w-2 h-2 bg-white/60 rounded-full" />
          </div>
        </div>

        {/* Right: Form */}
        <div className="p-10 lg:p-12 lg:px-14 flex flex-col justify-center overflow-y-auto">
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 gradient-primary rounded-xl flex items-center justify-center"><Car size={16} className="text-white" /></div>
            <span className="font-black text-slate-900 text-xl">FLEMAN</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm mb-6">Already have one? <button onClick={() => nav('login')} className="text-blue-600 font-semibold hover:underline">Sign in</button></p>

          <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Input label="First Name" placeholder="Arjun" value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')} required />
              {showError('firstName') && <p className="text-xs text-red-600 mt-1">{showError('firstName')}</p>}
            </div>
            <div>
              <Input label="Last Name" placeholder="Mehta" value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')} required />
              {showError('lastName') && <p className="text-xs text-red-600 mt-1">{showError('lastName')}</p>}
            </div>
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Input label="Email Address" type="email" placeholder="arjun@email.com" value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')} required />
              {showError('email') && <p className="text-xs text-red-600 mt-1">{showError('email')}</p>}
            </div>
            <div>
              <Input label="Phone Number" type="tel" placeholder="9876543210" value={form.phone}
                onChange={e => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => handleBlur('phone')} required />
              {showError('phone') && <p className="text-xs text-red-600 mt-1">{showError('phone')}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Min. 8 characters" required
                className={`w-full border rounded-xl py-2.5 pl-3.5 pr-10 text-sm focus:ring-2 focus:ring-blue-100 ${showError('password') ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} />
              <button onClick={() => setShowPw(!showPw)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {showError('password') && <p className="text-xs text-red-600 mt-1">{showError('password')}</p>}
          </div>

          {/* Password validation list */}
          <ul className="text-xs space-y-1 mb-4 bg-slate-50 rounded-xl p-3">
            {pwChecks.map(c => (
              <li key={c.label} className={c.pass ? 'text-green-600 font-semibold' : 'text-slate-500'}>
                {c.pass ? '✓' : '•'} {c.label}
              </li>
            ))}
          </ul>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
            <div className="relative">
              <input type={showConfirmPw ? 'text' : 'password'} value={form.confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Confirm your password" required
                className={`w-full border rounded-xl py-2.5 pl-3.5 pr-10 text-sm focus:ring-2 focus:ring-blue-100 ${showError('confirmPassword') ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} />
              <button onClick={() => setShowConfirmPw(!showConfirmPw)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {showError('confirmPassword') && <p className="text-xs text-red-600 mt-1">{showError('confirmPassword')}</p>}
          </div>

          {/* Terms checkbox */}
          <div className="mb-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={agreeTerms} onChange={e => { setAgreeTerms(e.target.checked); if (e.target.checked) setErrors(p => { const n = { ...p }; delete n.terms; return n }); else setErrors(p => ({ ...p, terms: 'Please agree to the Terms & Conditions' })) }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-slate-600">I agree to the <a href="#" className="text-blue-600 hover:underline">Terms &amp; Conditions</a></span>
            </label>
            {errors.terms && <p className="text-xs text-red-600 mt-1">{errors.terms}</p>}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3 flex items-center gap-2 mb-4">⚠ {error}</div>}

          <Button type="submit" loading={loading} fullWidth size="lg"
            disabled={!form.firstName || !form.lastName || !form.email || !form.phone || !form.password || !form.confirmPassword || !agreeTerms}>
            Create an account <ArrowRight size={16} />
          </Button>
          </form>

          <div className="relative my-6">
            <div className="border-t border-slate-200" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-semibold text-slate-400">or sign up with</span>
          </div>

          <div className="flex flex-col gap-2">
            {/* Sends the browser to the backend, which starts the Google flow
                and redirects back to /oauth-success carrying a JWT. */}
            <button
              onClick={() => { window.location.href = '/oauth2/authorization/google' }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Continue with Google
            </button>
            <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 23 23"><rect width="23" height="23" rx="2" fill="#f25022"/><rect x="12" width="11" height="11" rx="0" fill="#7fba00"/><rect y="12" width="11" height="11" rx="0" fill="#00a4ef"/><rect x="12" y="12" width="11" height="11" rx="0" fill="#ffb900"/></svg>
              Continue with Microsoft
            </button>
          </div>

          <button onClick={() => nav('landing')} className="mt-6 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={14} /> Back to Home
          </button>
        </div>
      </div>
    </div>
    </PublicPage>
  )
}
