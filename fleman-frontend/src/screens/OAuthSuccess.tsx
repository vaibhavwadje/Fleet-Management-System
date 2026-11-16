import { useEffect, useState } from 'react'
import { Car, AlertTriangle } from 'lucide-react'
import type { NavFn } from '../data'
import { Button } from '../components/shared'
import { api, session } from '../api'

/**
 * Landing spot after Google Sign-In.
 *
 * The backend redirects here as:
 *     /oauth-success?token=<jwt>&role=CUSTOMER
 * or, if something went wrong:
 *     /oauth-success?error=<message>
 *
 * All this screen does is store the token the same way a password login
 * would, then send the user on to their dashboard.
 */
export default function OAuthSuccess({ nav }: { nav: NavFn }) {
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const failure = params.get('error')
    const token = params.get('token')
    const role = params.get('role')

    if (failure) {
      setError(failure)
      return
    }

    if (!token) {
      setError('Google sign-in did not return a token. Please try again.')
      return
    }

    const finish = async () => {
      if (role === 'STAFF') {
        // Staff signing in with Google. We only have the token, so store a
        // minimal session; the staff screens re-read what they need.
        session.saveStaff(token, {
          staffId: 0,
          firstName: 'Staff',
          lastName: '',
          email: '',
          hubId: 0,
        })
        cleanUrl()
        nav('staff-dashboard')
        return
      }

      // Customer: store the token, then fill in the profile details.
      session.saveCustomer(token, {})

      try {
        const profile = await api.profile()
        session.saveCustomer(token, {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          drivingLicenseNo: profile.drivingLicenseNo,
        })
      } catch {
        // A missing profile must not block the sign-in itself.
      }

      cleanUrl()
      nav('landing')
    }

    finish()
  }, [])

  /** Drops the token out of the address bar so it is not left in history. */
  const cleanUrl = () => {
    window.history.replaceState({}, document.title, '/')
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8 max-w-md w-full text-center">
          <AlertTriangle size={30} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-black text-slate-900 mb-1">
            Google sign-in failed
          </h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Button fullWidth onClick={() => { cleanUrl(); nav('login') }}>
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center animate-pulse">
        <Car size={22} className="text-white" />
      </div>
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  )
}
