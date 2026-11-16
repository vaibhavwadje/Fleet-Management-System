import { useEffect, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

// ── Button ──────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const btnVariants = {
  primary:   'gradient-primary text-white shadow-blue hover:opacity-90 disabled:opacity-60',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline:   'border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50',
  ghost:     'text-slate-600 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success:   'gradient-success text-white shadow-sm hover:opacity-90',
}
const btnSizes = {
  xs: 'px-3 py-2 text-[13px] gap-1.5 rounded-lg',
  sm: 'px-4 py-2.5 text-[15px] gap-2 rounded-xl',
  md: 'px-5 py-3 text-[15px] gap-2 rounded-xl',
  lg: 'px-6 py-3.5 text-base gap-2.5 rounded-xl',
  xl: 'px-8 py-4 text-lg gap-3 rounded-2xl',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 select-none ${btnVariants[variant]} ${btnSizes[size]} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, glass = false, ...rest }: { children: ReactNode; className?: string; hover?: boolean; glass?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 ${glass ? 'glass' : 'bg-white'} ${hover ? 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer' : 'shadow-card'} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

// ── Badge / Status Chip ──────────────────────────────────────────────────────
const badgeMap = {
  Active:    'status-active',
  Available: 'status-active',
  Completed: 'bg-blue-50 text-blue-700',
  Pending:   'status-pending',
  Cancelled: 'status-danger',
  Inactive:  'status-inactive',
  Info:      'bg-blue-50 text-blue-700',
  Warning:   'status-pending',
  Danger:    'status-danger',
  Maintenance: 'status-pending',
  Reserved:  'bg-purple-50 text-purple-700',

  // Backend enum values (booking + car status) come through in upper case.
  PENDING:     'status-pending',
  CONFIRMED:   'bg-blue-50 text-blue-700',
  COMPLETED:   'bg-green-50 text-green-700',
  CANCELLED:   'status-danger',
  AVAILABLE:   'status-active',
  RENTED:      'bg-blue-50 text-blue-700',
  MAINTENANCE: 'status-pending',
  RETIRED:     'status-inactive',
}

export function Badge({ label, dot = true }: { label: string; dot?: boolean }) {
  const cls = badgeMap[label as keyof typeof badgeMap] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-full ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {label}
    </span>
  )
}

// ── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconRight?: ReactNode
}

export function Input({ label, error, hint, icon, iconRight, className = '', ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[15px] font-semibold text-slate-700">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>}
        <input
          className={`w-full border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-[15px] transition-all py-3 ${icon ? 'pl-10' : 'pl-3.5'} ${iconRight ? 'pr-10' : 'pr-3.5'} ${error ? 'border-red-400 bg-red-50' : ''} ${className}`}
          {...rest}
        />
        {iconRight && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{iconRight}</span>}
      </div>
      {error && <span className="text-[13px] text-red-600 font-medium">{error}</span>}
      {hint && !error && <span className="text-[13px] text-slate-500">{hint}</span>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[15px] font-semibold text-slate-700">{label}</label>}
      <select
        className={`w-full border border-slate-300 rounded-xl bg-white text-slate-900 text-[15px] py-3 px-3.5 transition-all ${error ? 'border-red-400' : ''} ${className}`}
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
}

// ── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export function Textarea({ label, error, className = '', ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[15px] font-semibold text-slate-700">{label}</label>}
      <textarea
        className={`w-full border border-slate-300 rounded-xl bg-white text-slate-900 text-[15px] py-3 px-3.5 resize-none transition-all ${error ? 'border-red-400' : ''} ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
//
// WHY THIS RENDERS THROUGH A PORTAL
// ---------------------------------
// `position: fixed` is relative to the viewport *unless* an ancestor has a
// transform, filter or backdrop-filter - then that ancestor becomes the
// containing block. Both dashboards wrap their content in
// `<div className="p-6 animate-fade-in">`, and that animation ends on
// `transform: translateY(0)` with `fill-mode: both`, so the transform sticks
// around forever after the animation finishes. `translateY(0)` is still a
// transform as far as the spec is concerned.
//
// The result: every modal inside a dashboard was positioned and clipped
// against the padded content box instead of the screen. It sat under the
// sidebar, the backdrop only darkened part of the page, and a tall modal was
// cut off by the scroll container.
//
// Rendering into document.body sidesteps the whole problem - there is no
// transformed ancestor out there.
export function Modal({
  open, onClose, title, subtitle, children, maxWidth = 'max-w-lg', footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxWidth?: string
  footer?: ReactNode
}) {
  // Escape closes, and the page behind must not scroll while a modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative bg-white rounded-3xl shadow-float w-full ${maxWidth} max-h-[88vh] flex flex-col animate-scale-in`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 flex-shrink-0">
            <div>
              <h3 className="text-xl font-black text-slate-900">{title}</h3>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Only the body scrolls, so the title and the buttons stay put. */}
        <div className="overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0 bg-slate-50 rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'warning' | 'info'; onClose?: () => void }) {
  const styles = {
    success: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 size={18} className="text-green-600" />, text: 'text-green-800' },
    error:   { bg: 'bg-red-50 border-red-200',   icon: <X size={18} className="text-red-600" />,           text: 'text-red-800' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={18} className="text-amber-600" />, text: 'text-amber-800' },
    info:    { bg: 'bg-blue-50 border-blue-200',  icon: <Info size={18} className="text-blue-600" />,       text: 'text-blue-800' },
  }[type]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-float text-sm font-medium animate-scale-in ${styles.bg} ${styles.text}`}>
      {styles.icon}
      <span>{message}</span>
      {onClose && <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>}
    </div>
  )
}

// ── Stepper ──────────────────────────────────────────────────────────────────
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < current ? 'gradient-primary text-white' : i === current ? 'gradient-primary text-white shadow-blue' : 'bg-slate-100 text-slate-400'}`}>
              {i < current ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold whitespace-nowrap ${i === current ? 'text-blue-600' : i < current ? 'text-slate-600' : 'text-slate-400'}`}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-12 md:w-20 mx-2 mb-4 transition-all ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md', src }: { name: string; size?: 'sm' | 'md' | 'lg'; src?: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-amber-100 text-amber-700', 'bg-red-100 text-red-700']
  const color = colors[name.charCodeAt(0) % colors.length]
  if (src) return <img src={src} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} />
  return <div className={`${sizeMap[size]} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>{initials}</div>
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ title, value, change, changeType, icon, color = 'blue' }: {
  title: string; value: string | number; change?: string; changeType?: 'up' | 'down'; icon: ReactNode; color?: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600', text: 'text-amber-600' },
  }[color]
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-slate-500">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-1.5">{value}</p>
          {change && (
            <p className={`text-xs font-semibold mt-1 ${changeType === 'up' ? 'text-green-600' : 'text-red-500'}`}>
              {changeType === 'up' ? '↑' : '↓'} {change} vs last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${colorMap.icon}`}>{icon}</div>
      </div>
    </Card>
  )
}

// ── Search Bar ───────────────────────────────────────────────────────────────
import { Search } from 'lucide-react'
export function SearchBar({ placeholder = 'Search...', value, onChange, className = '' }: { placeholder?: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
      />
    </div>
  )
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'blue', label }: { value: number; max?: number; color?: 'blue' | 'green' | 'amber' | 'red'; label?: string }) {
  const pct = Math.round((value / max) * 100)
  const colorMap = { blue: 'bg-blue-600', green: 'bg-green-600', amber: 'bg-amber-500', red: 'bg-red-500' }
  return (
    <div className="space-y-1">
      {label && <div className="flex justify-between text-xs font-medium text-slate-600"><span>{label}</span><span>{pct}%</span></div>}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, total, perPage = 10, onChange }: { page: number; total: number; perPage?: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-slate-500 mr-2">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${p === page ? 'gradient-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="p-5 bg-slate-50 rounded-3xl text-slate-300">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && <p className="text-[15px] text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        {subtitle && <p className="text-[15px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
