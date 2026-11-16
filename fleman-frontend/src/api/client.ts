// Low level HTTP helper plus the session helpers everything else builds on.

const BASE = '/api'

// Give up rather than spin forever if the server stops responding.
const TIMEOUT_MS = 20000

// ── Session storage ─────────────────────────────────────────────────────────
// Kept in one place so no screen has to remember the localStorage keys.

export type Role = 'CUSTOMER' | 'STAFF'

export interface StaffSession {
  staffId: number
  firstName: string
  lastName: string
  email: string
  hubId: number
}

const KEY_TOKEN = 'token'
const KEY_ROLE = 'role'
const KEY_CUSTOMER = 'customer'
const KEY_STAFF = 'staff'

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const session = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(KEY_TOKEN)
  },

  getRole(): Role | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(KEY_ROLE) as Role | null
  },

  getStaff(): StaffSession | null {
    return read<StaffSession>(KEY_STAFF)
  },

  /** Hub the logged-in staff member works at. */
  getStaffHubId(): number | null {
    return this.getStaff()?.hubId ?? null
  },

  saveCustomer(token: string, customer: Record<string, unknown>) {
    localStorage.setItem(KEY_TOKEN, token)
    localStorage.setItem(KEY_ROLE, 'CUSTOMER')
    localStorage.setItem(KEY_CUSTOMER, JSON.stringify(customer))
    localStorage.removeItem(KEY_STAFF)
  },

  saveStaff(token: string, staff: StaffSession) {
    localStorage.setItem(KEY_TOKEN, token)
    localStorage.setItem(KEY_ROLE, 'STAFF')
    localStorage.setItem(KEY_STAFF, JSON.stringify(staff))
    localStorage.removeItem(KEY_CUSTOMER)
  },

  clear() {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_ROLE)
    localStorage.removeItem(KEY_CUSTOMER)
    localStorage.removeItem(KEY_STAFF)
  },
}

// ── HTTP ────────────────────────────────────────────────────────────────────

/**
 * Sends a JSON request and unwraps the { success, message, data } envelope.
 * Throws an Error carrying the backend message so screens can just
 * `catch (e) { setError(e.message) }`.
 */
export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = session.getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(
        'The server took too long to respond. Please try again.',
      )
    }
    throw new Error(
      'Unable to reach the server. Please make sure the backend is running.',
    )
  } finally {
    clearTimeout(timer)
  }

  // 204 and friends have no body.
  if (res.status === 204) return undefined as T

  let json: any = null
  const text = await res.text()
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`Server returned an unexpected response (${res.status}).`)
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      // The token is gone or expired - drop it so the user is asked to
      // sign in again instead of seeing repeated failures.
      session.clear()
      throw new Error(json?.message || 'Your session has expired. Please sign in again.')
    }
    throw new Error(json?.message || `Request failed (${res.status}).`)
  }

  // Endpoints reply with the envelope; unwrap `data` when it is there.
  if (json && typeof json === 'object' && 'success' in json) {
    return json.data as T
  }

  return json as T
}

export const http = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),

  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
