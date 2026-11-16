// The header and footer every public-facing page shares.
//
// WHY THIS FILE EXISTS
// --------------------
// The header used to be copy-pasted into two separate home pages, and the
// footer existed only on one of them. Booking, Login, Register, Membership
// and Modify had neither, so moving between pages felt like moving between
// different websites. Everything now renders the same chrome from here, which
// also means a change to the navigation happens in exactly one place.
//
// There is one home page for everybody - guest, customer and staff. Nobody is
// redirected to a dashboard on sign-in; the Dashboard link in this header is
// how they get there.

import { useState, type ReactNode } from 'react'
import {
  Car, Menu, X, User, LogOut, ChevronDown, Home, Zap, LayoutDashboard,
} from 'lucide-react'
import type { NavFn, Screen } from '../data'
import { Button } from './shared'
import { logout, session } from '../api'

/** The in-page sections of the landing page, in the order they appear. */
const NAV_LINKS: { label: string; id: string }[] = [
  { label: 'Home', id: 'home' },
  { label: 'Vehicles', id: 'vehicles' },
  { label: 'Offers', id: 'offers' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

function readCustomer(): Record<string, any> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('customer') || '{}')
  } catch {
    return {}
  }
}

export function SiteHeader({
  nav,
  onLanding = false,
}: {
  nav: NavFn
  /** True only on the landing page, where the nav links are real anchors. */
  onLanding?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const role = session.getRole()
  const signedIn = !!session.getToken()
  const staff = session.getStaff()
  const account = role === 'STAFF'
    ? { firstName: staff?.firstName ?? 'Staff', email: staff?.email ?? '' }
    : readCustomer()

  // One home page for guests, customers and staff alike.
  const homeScreen: Screen = 'landing'

  /** Where "Dashboard" takes this particular user. */
  const dashboardScreen: Screen =
    role === 'STAFF' ? 'staff-dashboard' : 'customer-dashboard'

  /**
   * The section links only exist on the landing page. From anywhere else we
   * go there first and scroll once it has rendered - otherwise the link
   * would silently do nothing, which is worse than a small delay.
   */
  const goToSection = (id: string) => {
    setMenuOpen(false)
    if (onLanding) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    nav('landing')
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 120)
  }

  const goToTab = (tab: string) => {
    setProfileOpen(false)
    setMenuOpen(false)
    if (role === 'STAFF') nav('staff-dashboard')
    else nav('customer-dashboard', tab)
  }

  const handleSignOut = () => {
    logout()
    setProfileOpen(false)
    setMenuOpen(false)
    nav('landing')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="mx-4 mt-4 glass rounded-2xl px-6 py-3.5 shadow-float flex items-center gap-6">
        <button
          onClick={() => nav(homeScreen)}
          className="flex items-center gap-2.5 mr-4 cursor-pointer"
        >
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
            <Car size={18} className="text-white" />
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tight">FLEMAN</span>
        </button>

        <div className="hidden lg:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(l => (
            <button
              key={l.id}
              onClick={() => goToSection(l.id)}
              className="px-4 py-2 rounded-xl text-[15px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              {l.label}
            </button>
          ))}
          {signedIn && (
            <button
              onClick={() => nav(dashboardScreen)}
              className="px-4 py-2 rounded-xl text-[15px] font-bold text-blue-600 hover:bg-blue-50 transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {signedIn ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                  {account.firstName
                    ? account.firstName.charAt(0).toUpperCase()
                    : <User size={16} />}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {account.firstName || 'My account'}
                  </p>
                  <p className="text-xs text-slate-500 leading-tight">{account.email}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 min-w-[210px] bg-white rounded-xl shadow-float border border-slate-100 py-2 z-50 animate-scale-in">
                    <MenuItem icon={<Home size={15} />} label="Home"
                      onClick={() => { setProfileOpen(false); nav(homeScreen) }} />
                    <MenuItem icon={<LayoutDashboard size={15} />} label="Dashboard"
                      onClick={() => goToTab('dashboard')} />
                    {role === 'CUSTOMER' && (
                      <>
                        <MenuItem icon={<User size={15} />} label="My Profile"
                          onClick={() => goToTab('my-info')} />
                        <MenuItem icon={<Zap size={15} />} label="My Bookings"
                          onClick={() => goToTab('my-bookings')} />
                      </>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    <MenuItem icon={<LogOut size={15} />} label="Sign Out"
                      onClick={handleSignOut} danger />
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => nav('login')}
                className="hidden sm:block px-4 py-2 text-[15px] font-semibold text-slate-700 hover:text-blue-600 transition-colors rounded-xl hover:bg-blue-50"
              >
                Sign In
              </button>
              <Button onClick={() => nav('register')} size="sm">Register</Button>
            </>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mx-4 mt-2 glass rounded-2xl p-4 shadow-float animate-scale-in lg:hidden">
          {NAV_LINKS.map(l => (
            <button
              key={l.id}
              onClick={() => goToSection(l.id)}
              className="block w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </button>
          ))}
          <div className="mt-3 border-t border-slate-100 pt-3">
            {signedIn ? (
              <>
                <MenuItem icon={<Home size={15} />} label="Home"
                  onClick={() => { setMenuOpen(false); nav(homeScreen) }} />
                <MenuItem icon={<LayoutDashboard size={15} />} label="Dashboard"
                  onClick={() => goToTab('dashboard')} />
                {role === 'CUSTOMER' && (
                  <MenuItem icon={<User size={15} />} label="My Profile"
                    onClick={() => goToTab('my-info')} />
                )}
                <MenuItem icon={<LogOut size={15} />} label="Sign Out"
                  onClick={handleSignOut} danger />
              </>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => nav('login')} variant="outline" size="sm" className="flex-1">
                  Sign In
                </Button>
                <Button onClick={() => nav('register')} size="sm" className="flex-1">
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function MenuItem({ icon, label, onClick, danger }: {
  icon: ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-2.5 text-[15px] font-semibold transition-colors flex items-center gap-3 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon} {label}
    </button>
  )
}

export function SiteFooter({ nav }: { nav: NavFn }) {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-400 py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
                <Car size={18} className="text-white" />
              </div>
              <span className="font-black text-white text-xl">FLEMAN</span>
            </div>
            <p className="text-[15px] leading-relaxed mb-5">
              India's premium fleet rental platform. Trusted by thousands of
              travellers across the country.
            </p>
            <div className="flex gap-3">
              {['f', 't', 'in', 'li'].map(s => (
                <span
                  key={s}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Only links that actually go somewhere are buttons. The rest are
              plain text, because a link that does nothing is worse than no
              link at all. */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-[15px]">
              <li><FooterLink onClick={() => nav('location')}>Book a Vehicle</FooterLink></li>
              <li><FooterLink onClick={() => nav('modify-booking')}>Manage Booking</FooterLink></li>
              <li><FooterLink onClick={() => nav('membership')}>Membership</FooterLink></li>
              <li><FooterLink onClick={() => nav('landing')}>Locations</FooterLink></li>
              <li><FooterLink onClick={() => nav('landing')}>Offers</FooterLink></li>
            </ul>
          </div>

          {[
            { title: 'Vehicles', links: ['SUV Rentals', 'Luxury Cars', 'Electric Vehicles', 'Sedans', 'Compact Cars'] },
            { title: 'Support', links: ['Help Center', 'FAQs', 'Contact Us', 'Insurance Info', 'Terms & Conditions'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-[15px]">
                {col.links.map(l => <li key={l}>{l}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[15px]">
          <p>© {year} FLEMAN Fleet Management Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="hover:text-white transition-colors text-left">
      {children}
    </button>
  )
}

/**
 * Wraps a page in the shared chrome.
 *
 * The header is `fixed`, so anything that is not the landing hero needs top
 * padding or it starts underneath the navbar. `flex-col` plus `mt-auto` on the
 * footer keeps the footer at the bottom on short pages instead of floating
 * halfway up the screen.
 */
export function PublicPage({ nav, children, className = '' }: {
  nav: NavFn; children: ReactNode; className?: string
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      <SiteHeader nav={nav} />
      <main className={`flex-1 pt-28 pb-16 ${className}`}>{children}</main>
      <SiteFooter nav={nav} />
    </div>
  )
}
