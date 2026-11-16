export type Screen =
  | 'landing' | 'login' | 'register' | 'oauth-success'
  | 'location' | 'vehicles' | 'addons' | 'customer-info' | 'confirmation'
  | 'modify-booking' | 'membership' | 'customer-home' | 'customer-dashboard'
  | 'staff-dashboard' | 'staff-bookings' | 'staff-vehicles'
  | 'staff-handover' | 'staff-returns' | 'staff-invoice' | 'staff-excel'
  | 'staff-on-spot'
  | 'admin-dashboard' | 'admin-staff' | 'admin-customers' | 'admin-vehicles'
  | 'admin-pricing' | 'admin-locations' | 'admin-reports' | 'admin-roles'
  | 'admin-audit' | 'admin-notifications' | 'admin-settings'

/**
 * Moves to another screen.
 *
 * `tab` is for screens that are really a set of tabs behind one Screen name -
 * the customer dashboard is the only one today. Without it, "My Profile" in
 * the header could only drop you on the dashboard's landing tab and you had
 * to click "My Information" in the sidebar to actually get to your profile.
 */
export type NavFn = (screen: Screen, tab?: string) => void

export interface Vehicle {
  id: string
  name: string
  brand: string
  category: 'SUV' | 'Sedan' | 'Luxury' | 'Electric' | 'Compact' | 'Small' | 'Intermediate'
  seats: number
  transmission: 'Automatic' | 'Manual'
  fuel: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid'
  mileage: string
  priceDay: number
  priceWeek: number
  priceMonth: number
  available: boolean
  image: string
  color: string
  year: number
  plate: string
}

export interface Location {
  id: string
  name: string
  address: string
  code: string
  type: 'Airport' | 'City' | 'Hotel'
  available: number
  total: number
}

export interface Booking {
  id: string
  bookingNo: string
  customer: string
  vehicle: string
  pickup: string
  return_: string
  pickupDate: string
  returnDate: string
  status: 'Active' | 'Pending' | 'Completed' | 'Cancelled'
  total: number
  deposit: number
}

export const vehicles: Vehicle[] = [
  {
    id: 'v1', name: 'BMW 5 Series', brand: 'BMW', category: 'Luxury',
    seats: 5, transmission: 'Automatic', fuel: 'Petrol', mileage: '14 km/l',
    priceDay: 185, priceWeek: 1099, priceMonth: 3999,
    available: true, color: '#1E3A5F', year: 2024, plate: 'MH 01 AB 1234',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v2', name: 'Range Rover Sport', brand: 'Land Rover', category: 'SUV',
    seats: 7, transmission: 'Automatic', fuel: 'Diesel', mileage: '11 km/l',
    priceDay: 220, priceWeek: 1350, priceMonth: 4800,
    available: true, color: '#2D4A2D', year: 2024, plate: 'MH 02 CD 5678',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v3', name: 'Tesla Model 3', brand: 'Tesla', category: 'Electric',
    seats: 5, transmission: 'Automatic', fuel: 'Electric', mileage: '15 km/kWh',
    priceDay: 160, priceWeek: 950, priceMonth: 3400,
    available: true, color: '#CC3333', year: 2024, plate: 'MH 03 EF 9012',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v4', name: 'Mercedes-Benz E-Class', brand: 'Mercedes-Benz', category: 'Luxury',
    seats: 5, transmission: 'Automatic', fuel: 'Petrol', mileage: '12 km/l',
    priceDay: 210, priceWeek: 1280, priceMonth: 4600,
    available: true, color: '#2C2C2C', year: 2023, plate: 'MH 04 GH 3456',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v5', name: 'Toyota Camry', brand: 'Toyota', category: 'Sedan',
    seats: 5, transmission: 'Automatic', fuel: 'Hybrid', mileage: '18 km/l',
    priceDay: 95, priceWeek: 580, priceMonth: 2100,
    available: true, color: '#B8860B', year: 2024, plate: 'MH 05 IJ 7890',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v6', name: 'Honda Civic', brand: 'Honda', category: 'Compact',
    seats: 5, transmission: 'Automatic', fuel: 'Petrol', mileage: '17 km/l',
    priceDay: 75, priceWeek: 450, priceMonth: 1650,
    available: false, color: '#4A4A4A', year: 2023, plate: 'MH 06 KL 1234',
    image: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v7', name: 'Audi Q7', brand: 'Audi', category: 'SUV',
    seats: 7, transmission: 'Automatic', fuel: 'Diesel', mileage: '13 km/l',
    priceDay: 195, priceWeek: 1180, priceMonth: 4200,
    available: true, color: '#5C5C5C', year: 2024, plate: 'MH 07 MN 5678',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop&auto=format',
  },
  {
    id: 'v8', name: 'Hyundai Ioniq 6', brand: 'Hyundai', category: 'Electric',
    seats: 5, transmission: 'Automatic', fuel: 'Electric', mileage: '16 km/kWh',
    priceDay: 130, priceWeek: 780, priceMonth: 2800,
    available: true, color: '#4169E1', year: 2024, plate: 'MH 08 OP 9012',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=500&fit=crop&auto=format',
  },
]

export const locations: Location[] = [
  { id: 'l1', name: 'Chhatrapati Shivaji International Airport', address: 'Andheri East, Mumbai 400099', code: 'BOM', type: 'Airport', available: 12, total: 18 },
  { id: 'l2', name: 'Bandra Kurla Complex', address: 'BKC, Mumbai 400051', code: 'BKC', type: 'City', available: 8, total: 12 },
  { id: 'l3', name: 'Pune Airport', address: 'Lohegaon, Pune 411032', code: 'PNQ', type: 'Airport', available: 6, total: 10 },
  { id: 'l4', name: 'Nariman Point', address: 'Marine Drive, Mumbai 400021', code: 'NP', type: 'City', available: 5, total: 8 },
  { id: 'l5', name: 'Taj Hotel Gateway', address: 'Apollo Bunder, Mumbai 400001', code: 'TAJ', type: 'Hotel', available: 4, total: 6 },
  { id: 'l6', name: 'Hyatt Regency', address: 'Sahar Road, Mumbai 400099', code: 'HYT', type: 'Hotel', available: 7, total: 9 },
]

export const bookings: Booking[] = [
  { id: 'b1', bookingNo: 'FLM-2024-001', customer: 'Arjun Mehta', vehicle: 'BMW 5 Series', pickup: 'BOM Airport', return_: 'BKC Office', pickupDate: '2024-12-20', returnDate: '2024-12-25', status: 'Active', total: 925, deposit: 300 },
  { id: 'b2', bookingNo: 'FLM-2024-002', customer: 'Priya Sharma', vehicle: 'Tesla Model 3', pickup: 'Nariman Point', return_: 'BOM Airport', pickupDate: '2024-12-21', returnDate: '2024-12-28', status: 'Pending', total: 1120, deposit: 250 },
  { id: 'b3', bookingNo: 'FLM-2024-003', customer: 'Rahul Gupta', vehicle: 'Range Rover Sport', pickup: 'PNQ Airport', return_: 'PNQ Airport', pickupDate: '2024-12-18', returnDate: '2024-12-22', status: 'Active', total: 880, deposit: 350 },
  { id: 'b4', bookingNo: 'FLM-2024-004', customer: 'Sneha Patel', vehicle: 'Toyota Camry', pickup: 'Taj Hotel', return_: 'Hyatt Regency', pickupDate: '2024-12-15', returnDate: '2024-12-19', status: 'Completed', total: 380, deposit: 150 },
  { id: 'b5', bookingNo: 'FLM-2024-005', customer: 'Vikram Nair', vehicle: 'Audi Q7', pickup: 'BOM Airport', return_: 'BOM Airport', pickupDate: '2024-12-22', returnDate: '2024-12-27', status: 'Pending', total: 975, deposit: 300 },
  { id: 'b6', bookingNo: 'FLM-2024-006', customer: 'Anita Desai', vehicle: 'Honda Civic', pickup: 'BKC Office', return_: 'Nariman Point', pickupDate: '2024-12-10', returnDate: '2024-12-14', status: 'Cancelled', total: 300, deposit: 100 },
  { id: 'b7', bookingNo: 'FLM-2024-007', customer: 'Kiran Rao', vehicle: 'Mercedes E-Class', pickup: 'Hyatt Regency', return_: 'BOM Airport', pickupDate: '2024-12-23', returnDate: '2024-12-30', status: 'Pending', total: 1470, deposit: 400 },
  { id: 'b8', bookingNo: 'FLM-2024-008', customer: 'Deepak Joshi', vehicle: 'Hyundai Ioniq 6', pickup: 'PNQ Airport', return_: 'Taj Hotel', pickupDate: '2024-12-19', returnDate: '2024-12-24', status: 'Active', total: 650, deposit: 200 },
]

export const revenueData = [
  { month: 'Jul', revenue: 42000, bookings: 48 },
  { month: 'Aug', revenue: 58000, bookings: 64 },
  { month: 'Sep', revenue: 51000, bookings: 57 },
  { month: 'Oct', revenue: 67000, bookings: 73 },
  { month: 'Nov', revenue: 74000, bookings: 82 },
  { month: 'Dec', revenue: 89000, bookings: 97 },
]

export const vehicleStatusData = [
  { name: 'Available', value: 24, color: '#16A34A' },
  { name: 'On Rent', value: 18, color: '#2563EB' },
  { name: 'Maintenance', value: 4, color: '#D97706' },
  { name: 'Reserved', value: 8, color: '#7C3AED' },
]

export const staffMembers = [
  { id: 's1', name: 'Rajesh Kumar', role: 'Fleet Manager', email: 'rajesh@fleman.in', phone: '+91 98765 43210', status: 'Active', location: 'BOM Airport', joined: '2022-01-15' },
  { id: 's2', name: 'Meena Iyer', role: 'Customer Relations', email: 'meena@fleman.in', phone: '+91 87654 32109', status: 'Active', location: 'BKC Office', joined: '2022-06-01' },
  { id: 's3', name: 'Suresh Pillai', role: 'Vehicle Inspector', email: 'suresh@fleman.in', phone: '+91 76543 21098', status: 'Active', location: 'PNQ Airport', joined: '2023-03-10' },
  { id: 's4', name: 'Kavitha Raman', role: 'Accounts Executive', email: 'kavitha@fleman.in', phone: '+91 65432 10987', status: 'Inactive', location: 'BOM Airport', joined: '2021-11-20' },
  { id: 's5', name: 'Amit Sinha', role: 'Operations Head', email: 'amit@fleman.in', phone: '+91 54321 09876', status: 'Active', location: 'Head Office', joined: '2020-08-05' },
]

export const auditLogs = [
  { id: 'a1', action: 'Booking Created', user: 'Meena Iyer', target: 'FLM-2024-007', timestamp: '2024-12-19 14:32:15', ip: '192.168.1.45', severity: 'Info' },
  { id: 'a2', action: 'Vehicle Status Changed', user: 'Rajesh Kumar', target: 'BMW 5 Series (MH01AB1234)', timestamp: '2024-12-19 13:15:42', ip: '192.168.1.12', severity: 'Info' },
  { id: 'a3', action: 'Invoice Generated', user: 'Kavitha Raman', target: 'INV-2024-089', timestamp: '2024-12-19 12:08:31', ip: '192.168.1.78', severity: 'Info' },
  { id: 'a4', action: 'Booking Cancelled', user: 'Meena Iyer', target: 'FLM-2024-006', timestamp: '2024-12-19 11:44:09', ip: '192.168.1.45', severity: 'Warning' },
  { id: 'a5', action: 'Pricing Rule Updated', user: 'Amit Sinha', target: 'SUV Weekend Rate', timestamp: '2024-12-19 10:30:00', ip: '192.168.1.5', severity: 'Warning' },
  { id: 'a6', action: 'Failed Login Attempt', user: 'Unknown', target: 'admin@fleman.in', timestamp: '2024-12-19 09:22:55', ip: '203.45.67.89', severity: 'Danger' },
  { id: 'a7', action: 'Staff Role Changed', user: 'Amit Sinha', target: 'Suresh Pillai → Senior Inspector', timestamp: '2024-12-18 17:15:00', ip: '192.168.1.5', severity: 'Warning' },
  { id: 'a8', action: 'Vehicle Added', user: 'Rajesh Kumar', target: 'Hyundai Ioniq 6 (MH08OP9012)', timestamp: '2024-12-18 15:00:00', ip: '192.168.1.12', severity: 'Info' },
]
