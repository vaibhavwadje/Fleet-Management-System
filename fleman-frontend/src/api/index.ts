// The single API surface used by every screen.
//
//   import { api } from '../api'
//   const states = await api.states()
//
// Grouped by area so it stays easy to find things:
//   auth / profile · bookings · staff · master data

import { http, session } from './client'
import type {
  AddonResponse,
  AirportResponse,
  AssignVehicleRequest,
  AssignVehicleResponse,
  BookingPageResponse,
  BookingRequestPayload,
  BookingResponse,
  BookingStatsResponse,
  BookingStatus,
  CarResponse,
  CarStatus,
  CarStatusCountResponse,
  CarTypeResponse,
  ChangePasswordRequest,
  CityResponse,
  ConfirmHandoverRequest,
  ExcelUploadResult,
  GuestBookingRequestPayload,
  HubResponse,
  HubScope,
  InvoicePageResponse,
  InvoiceResponse,
  LoginResponse,
  ProfileResponse,
  RegisterRequest,
  ReturnVehicleRequest,
  StaffBookingRequestPayload,
  StaffLoginResponse,
  StaffResponse,
  StateResponse,
  UpdateBookingRequestPayload,
  UpdateCustomerRequest,
} from './types'

export * from './types'
export { session } from './client'
export type { Role, StaffSession } from './client'

/** Builds `?a=1&b=2`, skipping empty values. */
function query(params: Record<string, string | number | undefined | null>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export const api = {
  health: () => fetch('/health').then(r => r.ok),

  // ── Customer auth & profile ───────────────────────────────────────────────

  login: (email: string, password: string) =>
    http.post<LoginResponse>('/customer/login', { email, password }),

  register: (data: RegisterRequest) =>
    http.post<string>('/customer/register', data),

  profile: () => http.get<ProfileResponse>('/customer/profile'),

  updateProfile: (data: UpdateCustomerRequest) =>
    http.put<ProfileResponse>('/customer/profile', data),

  changePassword: (data: ChangePasswordRequest) =>
    http.put<string>('/customer/change-password', data),

  // ── Staff auth ────────────────────────────────────────────────────────────

  staffLogin: (email: string, password: string) =>
    http.post<StaffLoginResponse>('/staff/login', { email, password }),

  staffByHub: (hubId: number) =>
    http.get<StaffResponse[]>(`/staff/hub/${hubId}`),

  // ── Customer bookings ─────────────────────────────────────────────────────

  createBooking: (data: BookingRequestPayload) =>
    http.post<BookingResponse>('/bookings', data),

  createGuestBooking: (data: GuestBookingRequestPayload) =>
    http.post<BookingResponse>('/bookings/guest', data),

  bookings: (page = 0, size = 10, status?: BookingStatus) =>
    http.get<BookingPageResponse>(
      `/bookings${query({ page, size, status })}`,
    ),

  bookingStats: () => http.get<BookingStatsResponse>('/bookings/stats'),

  viewBooking: (bookingId: number) =>
    http.get<BookingResponse>(`/bookings/${bookingId}`),

  updateBooking: (bookingId: number, data: UpdateBookingRequestPayload) =>
    http.put<BookingResponse>(`/bookings/${bookingId}`, data),

  cancelBooking: (bookingId: number) =>
    http.patch<BookingResponse>(`/bookings/${bookingId}/cancel`),

  // ── Staff bookings ────────────────────────────────────────────────────────

  staffBookings: (
    page = 0,
    size = 10,
    status?: BookingStatus,
    scope?: HubScope,
  ) =>
    http.get<BookingPageResponse>(
      `/staff/bookings${query({ page, size, status, scope })}`,
    ),

  /**
   * One booking by id, from ANY hub.
   *
   * Deliberately not hub-restricted: this is a lookup, not an action. The
   * response carries pickupHub / dropoffHub so the screen can say whether
   * this hub may actually act on it.
   */
  staffBooking: (bookingId: number) =>
    http.get<BookingResponse>(`/staff/bookings/${bookingId}`),

  /**
   * Staff changing where a booking is collected from or returned to.
   * Send one hub or both; the pick-up hub is refused after hand-over.
   */
  updateBookingLocations: (
    bookingId: number,
    data: { pickupHubId?: number; dropoffHubId?: number },
  ) =>
    http.patch<BookingResponse>(`/staff/bookings/${bookingId}/locations`, data),

  /** Staff on-spot booking for a walk-in customer. */
  createStaffBooking: (data: StaffBookingRequestPayload) =>
    http.post<BookingResponse>('/staff/bookings/on-spot', data),

  staffBookingStats: () =>
    http.get<BookingStatsResponse>('/staff/bookings/stats'),

  updateStaffBookingStatus: (bookingId: number, status: BookingStatus) =>
    http.patch<BookingResponse>(`/staff/bookings/${bookingId}/status`, {
      status,
    }),

  // ── Staff hand-over & return ──────────────────────────────────────────────

  assignVehicle: (data: AssignVehicleRequest) =>
    http.post<AssignVehicleResponse>('/staff/handover/assign-vehicle', data),

  confirmHandover: (data: ConfirmHandoverRequest) =>
    http.post<string>('/staff/handover/confirm', data),

  returnVehicle: (data: ReturnVehicleRequest) =>
    http.post<string>('/staff/handover/return', data),

  // ── Excel upload (staff) ──────────────────────────────────────────────────

  /** Uploads a filled-in vehicle rate sheet. Sent as multipart, not JSON. */
  uploadCarTypeRates: async (file: File): Promise<ExcelUploadResult> => {
    const token = session.getToken()
    const form = new FormData()
    form.append('file', file)

    const res = await fetch('/api/staff/excel/car-types', {
      method: 'POST',
      // No Content-Type header: the browser sets the multipart boundary.
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(json?.message || 'The upload failed. Please try again.')
    }
    return json.data as ExcelUploadResult
  },

  /** Downloads the blank .xlsx template. */
  downloadRateTemplate: async () => {
    const token = session.getToken()
    const res = await fetch('/api/staff/excel/car-types/template', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Could not download the template.')
    return res.blob()
  },

  // ── Invoices ──────────────────────────────────────────────────────────────

  invoiceForBooking: (bookingId: number) =>
    http.get<InvoiceResponse>(`/invoices/booking/${bookingId}`),

  /**
   * Downloads the invoice PDF.
   * Uses fetch directly because the response is a binary file, not the usual
   * JSON envelope.
   */
  downloadInvoice: async (bookingId: number) => {
    const token = session.getToken()
    const res = await fetch(`/api/invoices/booking/${bookingId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error('Could not download the invoice. Please try again.')
    }
    return res.blob()
  },

  /** Staff: invoices raised at their hub, searchable. */
  staffInvoices: (page = 0, size = 10, search?: string) =>
    http.get<InvoicePageResponse>(`/staff/invoices${query({ page, size, search })}`),

  staffInvoice: (invoiceId: number) =>
    http.get<InvoiceResponse>(`/staff/invoices/${invoiceId}`),

  downloadStaffInvoice: async (invoiceId: number) => {
    const token = session.getToken()
    const res = await fetch(`/api/staff/invoices/${invoiceId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Could not download the invoice. Please try again.')
    return res.blob()
  },

  // ── Cars ──────────────────────────────────────────────────────────────────

  cars: () => http.get<CarResponse[]>('/cars'),

  car: (carId: number) => http.get<CarResponse>(`/cars/${carId}`),

  carsByHub: (hubId: number, status?: CarStatus) =>
    http.get<CarResponse[]>(`/cars/hub/${hubId}${query({ status })}`),

  /** Cars of one category at a hub - used at hand-over. */
  carsByHubAndType: (hubId: number, carTypeId: number, status?: CarStatus) =>
    http.get<CarResponse[]>(
      `/cars/hub/${hubId}/car-type/${carTypeId}${query({ status })}`,
    ),

  carStatusCount: () =>
    http.get<CarStatusCountResponse[]>('/car-types/status/count'),

  carTypes: (hubId: number) =>
    http.get<CarTypeResponse[]>(`/car-types/${hubId}`),

  // ── Locations ─────────────────────────────────────────────────────────────

  states: () => http.get<StateResponse[]>('/states'),

  citiesByState: (stateId: number) =>
    http.get<CityResponse[]>(`/cities/state/${stateId}`),

  hubs: (stateId: number, cityId: number) =>
    http.get<HubResponse[]>(`/hubs${query({ stateId, cityId })}`),

  hub: (hubId: number) => http.get<HubResponse>(`/hubs/${hubId}`),

  /** Every hub, for the staff location picker. */
  allHubs: () => http.get<HubResponse[]>('/hubs/all'),

  airports: () => http.get<AirportResponse[]>('/airports'),

  airportsByCity: (cityId: number) =>
    http.get<AirportResponse[]>(`/airports/city/${cityId}`),

  searchAirports: (keyword: string) =>
    http.get<AirportResponse[]>(`/airports/search${query({ keyword })}`),

  // ── Add-ons ───────────────────────────────────────────────────────────────

  addons: (hubId: number) => http.get<AddonResponse[]>(`/addons/${hubId}`),
}

/** Clears the stored session. Used by the logout buttons. */
export function logout() {
  session.clear()
}
