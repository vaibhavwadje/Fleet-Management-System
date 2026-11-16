import { useState } from 'react'
import { Plus, Edit, Trash2, Eye, Search, Shield, Key, Users, Car, MapPin, DollarSign } from 'lucide-react'
import { staffMembers, bookings, vehicles, locations, auditLogs } from '../../data'
import type { NavFn } from '../../data'
import { Button, Card, Badge, Avatar, SearchBar, Modal, Input, Select, SectionHeader, Toast } from '../../components/shared'

// ── Manage Staff ────────────────────────────────────────────────────────
export function ManageStaff({ nav: _nav }: { nav: NavFn }) {
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const filtered = staffMembers.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.role.toLowerCase().includes(query.toLowerCase())
  )

  const handleAdd = () => {
    setShowAdd(false)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="space-y-5">
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast message="Staff member added successfully!" type="success" onClose={() => setShowToast(false)} />
        </div>
      )}

      <SectionHeader
        title="Manage Staff"
        subtitle={`${staffMembers.length} team members`}
        action={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add Staff</Button>}
      />

      <Card className="p-4">
        <SearchBar placeholder="Search staff…" value={query} onChange={setQuery} className="w-72" />
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <Card key={s.id} className="p-5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-3 mb-4">
              <Avatar name={s.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{s.name}</p>
                <p className="text-sm text-slate-500">{s.role}</p>
                <Badge label={s.status} dot={true} />
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 mb-4">
              <p>📧 {s.email}</p>
              <p>📱 {s.phone}</p>
              <p>📍 {s.location}</p>
              <p>🗓 Joined: {s.joined}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" fullWidth><Edit size={12} /> Edit</Button>
              <Button variant="danger" size="xs"><Trash2 size={12} /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff Member">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" placeholder="Rajesh Kumar" />
            <Input label="Email" type="email" placeholder="rajesh@fleman.in" />
            <Input label="Phone" placeholder="+91 98765 43210" />
            <Select label="Role" options={[
              { value: 'fleet-manager', label: 'Fleet Manager' },
              { value: 'customer-relations', label: 'Customer Relations' },
              { value: 'inspector', label: 'Vehicle Inspector' },
              { value: 'accounts', label: 'Accounts Executive' },
              { value: 'ops-head', label: 'Operations Head' },
            ]} />
            <Select label="Location" options={locations.map(l => ({ value: l.id, label: l.name.slice(0, 30) }))} />
            <Input label="Joining Date" type="date" />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAdd(false)} variant="outline" fullWidth>Cancel</Button>
            <Button onClick={handleAdd} fullWidth>Add Staff Member</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Manage Customers ────────────────────────────────────────────────────
export function ManageCustomers({ nav: _nav }: { nav: NavFn }) {
  const [query, setQuery] = useState('')

  const customers = bookings.map((b, i) => ({
    id: b.id, name: b.customer, bookings: Math.floor(Math.random() * 8) + 1,
    spent: b.total * (Math.floor(Math.random() * 3) + 1),
    joined: `2024-0${(i % 9) + 1}-${String(i + 10).padStart(2, '0')}`,
    tier: i < 2 ? 'Gold' : i < 4 ? 'Silver' : 'Basic',
    status: b.status === 'Cancelled' ? 'Inactive' : 'Active',
  }))

  const tierColor: Record<string, string> = {
    Gold: 'bg-amber-50 text-amber-700',
    Silver: 'bg-blue-50 text-blue-700',
    Basic: 'bg-slate-100 text-slate-600',
  }

  const filtered = customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Manage Customers"
        subtitle={`${customers.length} registered customers`}
        action={<Button size="sm"><Plus size={14} /> Add Customer</Button>}
      />

      <Card className="p-4">
        <SearchBar placeholder="Search customers…" value={query} onChange={setQuery} className="w-72" />
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Customer', 'Membership', 'Total Bookings', 'Total Spent', 'Joined', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} size="sm" />
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${tierColor[c.tier]}`}>{c.tier}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-slate-700">{c.bookings}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-bold text-slate-800">₹{c.spent.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3.5"><span className="text-sm text-slate-500">{c.joined}</span></td>
                <td className="px-4 py-3.5"><Badge label={c.status} /></td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={13} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><Edit size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Manage Vehicles ─────────────────────────────────────────────────────
export function ManageVehicles({ nav: _nav }: { nav: NavFn }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Manage Vehicles"
        subtitle={`${vehicles.length} vehicles in fleet`}
        action={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} /> Add Vehicle</Button>}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {vehicles.map(v => (
          <Card key={v.id} className="overflow-hidden p-0">
            <img src={v.image} alt={v.name} className="w-full h-36 object-cover" />
            <div className="p-4">
              <p className="font-bold text-slate-800 text-sm">{v.name}</p>
              <p className="text-xs text-slate-500 mb-2">{v.plate}</p>
              <div className="flex items-center justify-between mb-3">
                <Badge label={v.available ? 'Available' : 'On Rent'} />
                <span className="text-xs font-bold text-blue-600">₹{v.priceDay}/day</span>
              </div>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" fullWidth><Edit size={11} /> Edit</Button>
                <Button size="xs" variant="danger"><Trash2 size={11} /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Vehicle" maxWidth="max-w-2xl">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vehicle Name" placeholder="BMW 5 Series" />
            <Input label="Brand" placeholder="BMW" />
            <Select label="Category" options={[
              { value: 'suv', label: 'SUV' }, { value: 'sedan', label: 'Sedan' },
              { value: 'luxury', label: 'Luxury' }, { value: 'electric', label: 'Electric' }, { value: 'compact', label: 'Compact' },
            ]} />
            <Input label="Year" type="number" placeholder="2024" />
            <Input label="License Plate" placeholder="MH 01 AB 1234" />
            <Select label="Transmission" options={[{ value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' }]} />
            <Select label="Fuel Type" options={[{ value: 'petrol', label: 'Petrol' }, { value: 'diesel', label: 'Diesel' }, { value: 'electric', label: 'Electric' }, { value: 'hybrid', label: 'Hybrid' }]} />
            <Input label="Seats" type="number" placeholder="5" />
            <Input label="Price/Day (₹)" type="number" placeholder="185" />
            <Input label="Price/Week (₹)" type="number" placeholder="1099" />
          </div>
          <Input label="Image URL" placeholder="https://..." />
          <div className="flex gap-3">
            <Button onClick={() => setShowAdd(false)} variant="outline" fullWidth>Cancel</Button>
            <Button onClick={() => setShowAdd(false)} fullWidth>Add Vehicle</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Pricing ────────────────────────────────────────────────────────────
export function AdminPricing({ nav: _nav }: { nav: NavFn }) {
  const pricingRules = [
    { id: 1, name: 'Standard Daily Rate — Luxury', base: 185, peak: 230, weekend: 210, active: true },
    { id: 2, name: 'Standard Daily Rate — SUV', base: 150, peak: 190, weekend: 175, active: true },
    { id: 3, name: 'Standard Daily Rate — Sedan', base: 95, peak: 120, weekend: 105, active: true },
    { id: 4, name: 'Standard Daily Rate — Electric', base: 130, peak: 160, weekend: 145, active: true },
    { id: 5, name: 'Standard Daily Rate — Compact', base: 75, peak: 95, weekend: 85, active: false },
    { id: 6, name: 'Airport Pickup Surcharge', base: 25, peak: 35, weekend: 30, active: true },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Pricing Management"
        subtitle="Manage rates and pricing rules"
        action={<Button size="sm"><Plus size={14} /> Add Rule</Button>}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Pricing Rule', 'Base Rate', 'Peak Rate', 'Weekend Rate', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pricingRules.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-50/70 group">
                  <td className="px-4 py-3.5 font-semibold text-slate-800 text-sm">{rule.name}</td>
                  <td className="px-4 py-3.5"><span className="font-bold text-slate-800">₹{rule.base}</span>/day</td>
                  <td className="px-4 py-3.5"><span className="font-bold text-amber-600">₹{rule.peak}</span>/day</td>
                  <td className="px-4 py-3.5"><span className="font-bold text-blue-600">₹{rule.weekend}</span>/day</td>
                  <td className="px-4 py-3.5"><Badge label={rule.active ? 'Active' : 'Inactive'} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><Edit size={13} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Locations ───────────────────────────────────────────────────────────
export function AdminLocations({ nav: _nav }: { nav: NavFn }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Location Management"
        subtitle="Manage pickup and return locations"
        action={<Button size="sm"><Plus size={14} /> Add Location</Button>}
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {locations.map(loc => (
          <Card key={loc.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="font-mono text-sm font-bold text-blue-600">{loc.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${loc.type === 'Airport' ? 'bg-blue-50 text-blue-700' : loc.type === 'Hotel' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{loc.type}</span>
                </div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{loc.name}</p>
                <p className="text-xs text-slate-500 mt-1">{loc.address}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Available</span>
                <span className="font-bold text-green-600">{loc.available}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Total capacity</span>
                <span className="font-bold text-slate-700">{loc.total}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" fullWidth><Edit size={11} /> Edit</Button>
              <Button variant="danger" size="xs"><Trash2 size={11} /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Role Management ─────────────────────────────────────────────────────
export function RoleManagement({ nav: _nav }: { nav: NavFn }) {
  const roles = [
    { name: 'Super Admin', users: 1, perms: 12, color: 'bg-red-50 text-red-700 border-red-200' },
    { name: 'Fleet Manager', users: 3, perms: 8, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Customer Relations', users: 5, perms: 6, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Vehicle Inspector', users: 4, perms: 5, color: 'bg-green-50 text-green-700 border-green-200' },
    { name: 'Accounts Executive', users: 2, perms: 4, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Viewer', users: 2, perms: 2, color: 'bg-slate-50 text-slate-600 border-slate-200' },
  ]

  const permissions = [
    'View Dashboard', 'Manage Bookings', 'Create Bookings', 'Cancel Bookings',
    'Manage Vehicles', 'Process Handover', 'Process Returns', 'Generate Invoices',
    'Manage Staff', 'View Reports', 'Manage Pricing', 'System Settings',
  ]

  const rolePermsMap: Record<string, string[]> = {
    'Super Admin': permissions,
    'Fleet Manager': permissions.slice(0, 8),
    'Customer Relations': ['View Dashboard', 'Manage Bookings', 'Create Bookings', 'Cancel Bookings', 'Process Handover', 'Process Returns'],
    'Vehicle Inspector': ['View Dashboard', 'Manage Vehicles', 'Process Handover', 'Process Returns', 'Generate Invoices'],
    'Accounts Executive': ['View Dashboard', 'Generate Invoices', 'View Reports'],
    'Viewer': ['View Dashboard', 'View Reports'],
  }

  const [selectedRole, setSelectedRole] = useState('Fleet Manager')

  return (
    <div className="space-y-5">
      <SectionHeader title="Role & Permissions" subtitle="Manage access control" action={<Button size="sm"><Plus size={14} /> Create Role</Button>} />

      <div className="grid xl:grid-cols-3 gap-5">
        {/* Role List */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Roles</h3>
          <div className="space-y-2">
            {roles.map(r => (
              <button
                key={r.name}
                onClick={() => setSelectedRole(r.name)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${selectedRole === r.name ? r.color : 'border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold">{r.name}</p>
                    <p className="text-xs opacity-70">{r.users} users</p>
                  </div>
                </div>
                <span className="text-xs font-bold opacity-70">{r.perms} perms</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Permissions */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Permissions: {selectedRole}</h3>
            <Button size="xs"><Key size={12} /> Save Changes</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {permissions.map(perm => {
              const granted = rolePermsMap[selectedRole]?.includes(perm)
              return (
                <label key={perm} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${granted ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <input type="checkbox" defaultChecked={granted} className="checkbox-custom" />
                  <span className={`text-sm font-medium ${granted ? 'text-green-800' : 'text-slate-600'}`}>{perm}</span>
                </label>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Audit Logs ──────────────────────────────────────────────────────────
export function AuditLogs({ nav: _nav }: { nav: NavFn }) {
  const [query, setQuery] = useState('')
  const filtered = auditLogs.filter(l =>
    l.action.toLowerCase().includes(query.toLowerCase()) ||
    l.user.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Logs" subtitle="All system events and user actions" />
      <Card className="p-4">
        <SearchBar placeholder="Search logs…" value={query} onChange={setQuery} className="w-72" />
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Timestamp', 'Action', 'User', 'Target', 'IP Address', 'Severity'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3.5">
                  <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-slate-800">{log.action}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={log.user === 'Unknown' ? 'U' : log.user} size="sm" />
                    <span className="text-sm text-slate-700 whitespace-nowrap">{log.user}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{log.target}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs font-mono text-slate-500">{log.ip}</span>
                </td>
                <td className="px-4 py-3.5">
                  <Badge label={log.severity} dot={true} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Notifications ───────────────────────────────────────────────────────
export function NotificationCenter({ nav: _nav }: { nav: NavFn }) {
  const notifs = [
    { id: 1, title: 'BMW 5 Series maintenance overdue', body: 'Vehicle MH01AB1234 is 500km past scheduled maintenance. Immediate action required.', type: 'Warning', time: '10 min ago', read: false },
    { id: 2, title: 'New booking from Vikram Nair', body: 'Booking FLM-2024-005 for Audi Q7 pending confirmation for Dec 22–27.', type: 'Info', time: '45 min ago', read: false },
    { id: 3, title: 'Monthly revenue target achieved', body: 'December revenue of ₹89,000 has exceeded the monthly target of ₹75,000.', type: 'Active', time: '2 hours ago', read: false },
    { id: 4, title: 'Suspicious login attempt blocked', body: 'Login attempt from IP 203.45.67.89 was blocked. Location: Unknown.', type: 'Danger', time: '5 hours ago', read: true },
    { id: 5, title: 'Staff quarterly review reminder', body: 'Quarterly performance reviews for all staff due by Dec 31, 2024.', type: 'Info', time: '1 day ago', read: true },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Notification Center"
        subtitle="System alerts and communications"
        action={<Button size="sm"><Plus size={14} /> Create Notification</Button>}
      />
      <div className="space-y-3">
        {notifs.map(n => (
          <Card key={n.id} className={`p-4 ${!n.read ? 'border-l-4 border-l-blue-500' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-600' : 'bg-slate-300'}`} />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{n.body}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <Badge label={n.type} />
                    <span className="text-xs text-slate-400">{n.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── System Settings ─────────────────────────────────────────────────────
export function SystemSettings({ nav: _nav }: { nav: NavFn }) {
  const [darkMode, setDarkMode] = useState(false)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSMS, setNotifSMS] = useState(true)
  const [autoInvoice, setAutoInvoice] = useState(true)

  return (
    <div className="space-y-5">
      <SectionHeader title="System Settings" subtitle="Configure platform-wide preferences" />

      <div className="grid xl:grid-cols-2 gap-5">
        {/* General */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">General Settings</h3>
          <div className="space-y-4">
            <Input label="Company Name" defaultValue="FLEMAN Fleet Management Pvt. Ltd." />
            <Input label="GST Number" defaultValue="27AAACF0832R1Z1" />
            <Input label="Support Email" type="email" defaultValue="support@fleman.in" />
            <Input label="Support Phone" defaultValue="+91 1800 266 3526" />
            <Button fullWidth>Save General Settings</Button>
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Preferences</h3>
          <div className="space-y-4">
            {[
              { label: 'Dark Mode', sub: 'Enable dark theme across the platform', state: darkMode, set: setDarkMode },
              { label: 'Email Notifications', sub: 'Send automated email alerts', state: notifEmail, set: setNotifEmail },
              { label: 'SMS Notifications', sub: 'Send booking confirmations via SMS', state: notifSMS, set: setNotifSMS },
              { label: 'Auto Invoice Generation', sub: 'Generate invoices on booking completion', state: autoInvoice, set: setAutoInvoice },
            ].map(pref => (
              <div key={pref.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-800">{pref.label}</p>
                  <p className="text-xs text-slate-500">{pref.sub}</p>
                </div>
                <button
                  onClick={() => pref.set(!pref.state)}
                  className={`w-12 h-6 rounded-full transition-all relative ${pref.state ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${pref.state ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Security Settings</h3>
          <div className="space-y-3">
            <Select label="Session Timeout" options={[
              { value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' },
              { value: '480', label: '8 hours' }, { value: '1440', label: '24 hours' },
            ]} />
            <Select label="Password Policy" options={[
              { value: 'basic', label: 'Basic (8+ chars)' },
              { value: 'strong', label: 'Strong (8+ chars, uppercase, number)' },
              { value: 'enterprise', label: 'Enterprise (12+ chars, special char)' },
            ]} />
            <Button variant="danger" fullWidth>Force All Users to Re-login</Button>
          </div>
        </Card>

        {/* Integrations */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Integrations</h3>
          <div className="space-y-3">
            {[
              { name: 'Payment Gateway (Razorpay)', status: 'Connected', ok: true },
              { name: 'SMS Gateway (MSG91)', status: 'Connected', ok: true },
              { name: 'Email (SendGrid)', status: 'Connected', ok: true },
              { name: 'Google Maps API', status: 'Connected', ok: true },
              { name: 'GST Portal', status: 'Configure', ok: false },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <p className="text-sm font-semibold text-slate-700">{i.name}</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${i.ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{i.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Reports ─────────────────────────────────────────────────────────────
export function AdminReports({ nav: _nav }: { nav: NavFn }) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Reports" subtitle="Download and schedule reports" action={<Button size="sm"><Plus size={14} /> Schedule Report</Button>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { title: 'Revenue Report', desc: 'Monthly and quarterly revenue breakdown', icon: DollarSign, color: 'bg-blue-50 text-blue-600', last: 'Dec 2024' },
          { title: 'Fleet Utilization Report', desc: 'Vehicle usage rates and availability trends', icon: Car, color: 'bg-green-50 text-green-600', last: 'Dec 2024' },
          { title: 'Customer Analytics', desc: 'Customer acquisition and retention metrics', icon: Users, color: 'bg-purple-50 text-purple-600', last: 'Nov 2024' },
          { title: 'Staff Performance', desc: 'Individual and team performance metrics', icon: Shield, color: 'bg-amber-50 text-amber-600', last: 'Nov 2024' },
          { title: 'Location Performance', desc: 'Revenue and utilization by location', icon: MapPin, color: 'bg-red-50 text-red-600', last: 'Dec 2024' },
          { title: 'Booking Analytics', desc: 'Trends, cancellations and patterns', icon: Search, color: 'bg-cyan-50 text-cyan-600', last: 'Dec 2024' },
        ].map(r => (
          <Card key={r.title} hover className="p-5">
            <div className={`w-10 h-10 ${r.color} rounded-2xl flex items-center justify-center mb-3`}>
              <r.icon size={20} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{r.title}</h3>
            <p className="text-xs text-slate-500 mb-3">{r.desc}</p>
            <p className="text-xs text-slate-400 mb-3">Last generated: {r.last}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" fullWidth>Preview</Button>
              <Button size="xs" fullWidth>Download</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
