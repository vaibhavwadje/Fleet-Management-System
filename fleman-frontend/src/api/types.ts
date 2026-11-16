// All request / response shapes exchanged with the backend.
// Keep these in sync with the DTOs in com.example.demo.dto.

// ── Envelope ────────────────────────────────────────────────────────────────
// Every endpoint replies with { success, message, data }.
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  tokenType: string
  customerId: string
  email: string
}

export interface StaffLoginResponse {
  token: string
  tokenType: string
  staffId: number
  firstName: string
  lastName: string
  email: string
  hubId: number
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

// ── Customer profile ────────────────────────────────────────────────────────

export interface ProfileResponse {
  customerId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string | null
  gender: string | null
  nationality: string | null
  drivingLicenseNo: string | null
  passportNo: string | null
  addressLine1: string | null
  addressLine2: string | null
  cityId: number | null
  cityName: string | null
  stateId: number | null
  stateName: string | null
  pincode: string | null
  documentType: string | null
}

// Every field is optional - send only what changed.
export interface UpdateCustomerRequest {
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: string | null
  gender?: string
  nationality?: string
  drivingLicenseNo?: string
  passportNo?: string
  addressLine1?: string
  addressLine2?: string
  cityId?: number
  stateId?: number
  pincode?: string
  documentType?: string
}

// ── Bookings ────────────────────────────────────────────────────────────────

/**
 * Which end of a rental a staff member is looking at.
 * A one-way booking belongs to the pick-up hub for hand-over and the
 * drop-off hub for return.
 */
export type HubScope = 'PICKUP' | 'RETURN' | 'ALL'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingAddon {
  bookingDetailId: number
  addonId: number
  addonName: string
  addonPrice: number
}

export interface BookingResponse {
  bookingId: number
  bookingStatus: BookingStatus
  bookingDate: string | null

  customerId: string | null
  customerName: string
  email: string
  phone: string | null
  drivingLicenseNo: string | null

  // Structured address - never a single free-text blob.
  addressLine1: string | null
  addressLine2: string | null
  cityId: number | null
  cityName: string | null
  stateId: number | null
  stateName: string | null
  pincode: string | null

  // Empty until staff assign a real vehicle at hand-over.
  carId: number | null
  carTypeId: number | null

  // The category the customer actually booked, e.g. "Full Size SUV".
  carTypeName: string | null
  carClass: string | null
  carTypeImageUrl: string | null

  startDate: string
  endDate: string
  duration: number

  pickupHubId: number | null
  pickupHubName: string
  dropoffHubId: number | null
  dropoffHubName: string

  dailyRate: number | null
  weeklyRate: number | null
  monthlyRate: number | null

  vehicleAmount: number
  addonAmount: number
  taxAmount: number
  grandTotal: number

  assignedCarId: number | null
  assignedCarRegistrationNo: string | null
  assignedCarBrandName: string | null
  assignedCarModelName: string | null

  handoverDate: string | null
  fuelLevelOut: number | null
  fuelLevelIn: number | null
  fuelCharges: number | null

  addons: BookingAddon[]

  // Only set on the staff single-booking endpoint. Any staff member can look
  // any booking up, so these say how it relates to THEIR hub.
  pickupHub?: boolean
  dropoffHub?: boolean
}

export interface BookingPageResponse {
  bookings: BookingResponse[]
  currentPage: number
  pageSize: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface BookingStatsResponse {
  total: number
  todayBookings: number
  pending: number
  confirmed: number
  cancelled: number
  completed: number
}

export interface AddonRequestItem {
  addonId: number
  addonName: string
  addonPrice: number
}

export interface BookingRequestPayload {
  // The customer books a car TYPE. carId is filled in by staff later.
  carTypeId: number
  // When supplied these are also saved onto the customer's profile, so the
  // booking snapshot and the invoice both end up with a real address.
  drivingLicenseNo?: string
  passportNo?: string
  addressLine1?: string
  addressLine2?: string
  stateId?: number
  cityId?: number
  pincode?: string
  startDate: string
  endDate: string
  pickupHubId: number
  pickupHubName: string
  dropoffHubId: number
  dropoffHubName: string
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
  duration: number
  vehicleAmount: number
  addonAmount: number
  taxAmount: number
  grandTotal: number
  addons: AddonRequestItem[]
}

export interface GuestBookingRequestPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  drivingLicenseNo: string
  passportNo: string
  addressLine1: string
  addressLine2: string
  stateId: number
  cityId: number
  pincode: string
  booking: BookingRequestPayload
}

/**
 * A booking taken by staff at the counter.
 *
 * There is no start date and no hub here on purpose - the server fills those
 * in from its own clock and the staff member's hub, so an on-spot booking
 * cannot be back-dated or booked against another branch.
 */
export interface StaffBookingRequestPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  drivingLicenseNo: string
  passportNo?: string
  addressLine1?: string
  addressLine2?: string
  stateId?: number
  cityId?: number
  pincode?: string
  booking: {
    carTypeId: number
    endDate: string
    addons: AddonRequestItem[]
    // Sent but ignored by the server; kept so the payload matches
    // BookingRequest on the Java side.
    startDate: string
    pickupHubId: number
    pickupHubName: string
    dropoffHubId: number
    dropoffHubName: string
    duration: number
    dailyRate: number
    weeklyRate: number
    monthlyRate: number
    vehicleAmount: number
    addonAmount: number
    taxAmount: number
    grandTotal: number
  }
}

export interface UpdateBookingRequestPayload {
  // The customer may switch vehicle category. The server reprices from this
  // car type, so the amounts below are informational only.
  carTypeId: number
  startDate: string
  endDate: string
  pickupHubId: number
  pickupHubName: string
  dropoffHubId: number
  dropoffHubName: string
  duration: number
  vehicleAmount: number
  addonAmount: number
  taxAmount: number
  grandTotal: number
  addons: AddonRequestItem[]
}

// ── Hand-over / return ──────────────────────────────────────────────────────

export interface AssignVehicleRequest {
  bookingId: number
  carId: number
}

export interface AssignVehicleResponse {
  bookingId: number
  assignedCarId: number
  carRegistrationNo: string
  brandName: string
  modelName: string
  message: string
}

export interface ConfirmHandoverRequest {
  bookingId: number
  fuelLevelOut: number
}

export interface ReturnVehicleRequest {
  bookingId: number
  fuelLevelIn: number
  fuelCharges: number
}

// ── Master data ─────────────────────────────────────────────────────────────

export type CarStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED'

export interface CarResponse {
  carId: number
  registrationNo: string
  modelName: string
  brandName: string
  year: number
  transmission: string
  mileage: number
  fuelType: string
  seatCapacity: number
  serviceDueDate: string
  status: CarStatus
  image: string
  carTypeId: number
  hubId: number
  hubName: string
}

export interface CarStatusCountResponse {
  status: CarStatus
  count: number
}

export interface CarTypeResponse {
  carTypeId: number
  carClass: string
  carType: string
  imageUrl: string
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
  hubId: number
  hubName: string
}

export interface HubResponse {
  hubId: number
  hubName: string
  hubType: string
  addressLine1: string
  addressLine2: string
  cityId: number
  cityName: string
  stateId: number
  stateName: string
  pincode: string
  phone: string
}

export interface AirportResponse {
  airportId: number
  airportCode: string
  airportName: string
  hubId: number
}

export interface StateResponse {
  stateId: number
  stateName: string
}

export interface CityResponse {
  cityId: number
  cityName: string
}

export interface AddonResponse {
  addonId: number
  addonName: string
  description: string
  pricePerDay: number
}

export interface StaffResponse {
  id: number
  firstName: string
  lastName: string
  email: string
  gender: string
  dateOfBirth: string
  phone: string
  addressLine1: string
  addressLine2: string
  cityName: string
  stateName: string
  hubId: number
  hubName: string
}

// ── Invoices ────────────────────────────────────────────────────────────────

export interface InvoiceAddon {
  invoiceDetailId: number
  addonId: number
  addonName: string
  addonPrice: number
}

export interface InvoicePageResponse {
  invoices: InvoiceResponse[]
  currentPage: number
  pageSize: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface InvoiceResponse {
  invoiceId: number
  invoiceNo: string
  invoiceDate: string | null
  bookingId: number

  customerId: string | null
  customerName: string
  email: string
  phone: string | null
  drivingLicenseNo: string | null
  passportNo: string | null
  addressLine1: string | null
  addressLine2: string | null
  cityName: string | null
  stateName: string | null
  pincode: string | null

  carId: number | null
  registrationNo: string | null
  brandName: string | null
  modelName: string | null
  carTypeName: string | null

  pickupHubName: string
  dropoffHubName: string

  startDate: string
  endDate: string
  handoverDate: string | null
  returnDate: string | null
  duration: number

  dailyRate: number | null
  weeklyRate: number | null
  monthlyRate: number | null

  vehicleAmount: number
  addonAmount: number
  taxAmount: number
  grandTotal: number
  fuelCharges: number | null
  finalAmount: number

  fuelLevelOut: number | null
  fuelLevelIn: number | null

  addons: InvoiceAddon[]
}

// ── Excel upload (BRD 3.5) ──────────────────────────────────────────────────

export interface ExcelRowError {
  rowNumber: number
  message: string
}

export interface ExcelUploadResult {
  fileName: string
  totalRows: number
  inserted: number
  updated: number
  failed: number
  errors: ExcelRowError[]
}
