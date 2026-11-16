import { useState } from 'react'
import type { Screen } from './data'
import { session } from './api'

// Customer
import Landing from './screens/Landing'
import BookingFlow from './screens/BookingFlow'
import { Login, Register } from './screens/Auth'
import ModifyBooking from './screens/Modify'
import Membership from './screens/Membership'
import CustomerDashboard from './screens/CustomerDashboard'
import OAuthSuccess from './screens/OAuthSuccess'

// Staff
import { Layout } from './components/Layout'
import StaffDashboard from './screens/staff/Dashboard'
import StaffBookings from './screens/staff/Bookings'
import StaffVehicles from './screens/staff/Vehicles'
import { Handover, Returns } from './screens/staff/Operations'
import StaffInvoices from './screens/staff/Invoices'
import ExcelUpload from './screens/staff/ExcelUpload'
import OnSpotBooking from './screens/staff/OnSpotBooking'

// Screens that require a signed-in staff member.
const STAFF_SCREENS: Screen[] = [
  'staff-dashboard',
  'staff-bookings',
  'staff-vehicles',
  'staff-handover',
  'staff-returns',
  'staff-invoice',
  'staff-excel',
  'staff-on-spot',
]

// Screens that require a signed-in customer.
// The home page is deliberately NOT in here - guests, customers and staff all
// see the same one.
const CUSTOMER_SCREENS: Screen[] = [
  'customer-dashboard',
]

export default function App() {
  // Google redirects the browser to /oauth-success, so honour that path on
  // first load. Everything else is driven by nav() as usual.
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined'
        && window.location.pathname === '/oauth-success') {
      return 'oauth-success'
    }
    return 'landing'
  })
  /**
   * There is no router, so a requested tab is parked in sessionStorage and
   * the destination screen picks it up as it mounts. sessionStorage rather
   * than state because the screen remounts on the way in, which would throw
   * a piece of component state away.
   */
  const nav = (s: Screen, tab?: string) => {
    if (tab) sessionStorage.setItem('openTab', tab)
    setScreen(s)
  }

  if (screen === 'oauth-success') return <OAuthSuccess nav={nav} />

  // Read on every render so it stays correct right after sign-in / sign-out.
  const role = session.getRole()

  // ── Staff area ────────────────────────────────────────────────────────────
  if (STAFF_SCREENS.includes(screen)) {
    if (role !== 'STAFF') {
      return <Login nav={nav} />
    }
    return (
      <Layout screen={screen} nav={nav} role="staff">
        {screen === 'staff-dashboard' && <StaffDashboard nav={nav} />}
        {screen === 'staff-bookings' && <StaffBookings nav={nav} />}
        {screen === 'staff-vehicles' && <StaffVehicles nav={nav} />}
        {screen === 'staff-handover' && <Handover nav={nav} />}
        {screen === 'staff-returns' && <Returns nav={nav} />}
        {screen === 'staff-invoice' && <StaffInvoices nav={nav} />}
        {screen === 'staff-excel' && <ExcelUpload nav={nav} />}
        {screen === 'staff-on-spot' && <OnSpotBooking nav={nav} />}
      </Layout>
    )
  }

  // ── Customer area ─────────────────────────────────────────────────────────
  if (CUSTOMER_SCREENS.includes(screen)) {
    if (role !== 'CUSTOMER') {
      return <Login nav={nav} />
    }
    return <CustomerDashboard nav={nav} />
  }

  // ── Public screens ────────────────────────────────────────────────────────
  // 'customer-home' is kept as an alias so any older link still works.
  if (screen === 'landing' || screen === 'customer-home') return <Landing nav={nav} />
  if (screen === 'login') return <Login nav={nav} />
  if (screen === 'register') return <Register nav={nav} />
  if (screen === 'location') return <BookingFlow nav={nav} startStep={0} />
  if (screen === 'vehicles') return <BookingFlow nav={nav} startStep={1} />
  if (screen === 'addons') return <BookingFlow nav={nav} startStep={2} />
  if (screen === 'customer-info') return <BookingFlow nav={nav} startStep={3} />
  if (screen === 'confirmation') return <BookingFlow nav={nav} startStep={4} />
  if (screen === 'modify-booking') return <ModifyBooking nav={nav} />
  if (screen === 'membership') return <Membership nav={nav} />

  return <Landing nav={nav} />
}
