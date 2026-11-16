import { useEffect, useState } from 'react'
import { Receipt, Download, Eye, AlertTriangle, Search } from 'lucide-react'
import type { NavFn } from '../../data'
import { api } from '../../api'
import type { InvoiceResponse } from '../../api'
import {
  Button, Card, SearchBar, SectionHeader, EmptyState, Toast, Modal,
} from '../../components/shared'
import { formatAddress, hasAddress } from '../../utils/address'

const PAGE_SIZE = 10

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function money(value: number | null) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`
}

/** Saves a Blob to disk using a temporary link. */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function StaffInvoices({ nav: _nav }: { nav: NavFn }) {
  const [rows, setRows] = useState<InvoiceResponse[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [viewing, setViewing] = useState<InvoiceResponse | null>(null)

  // Invoice-ID lookup, deliberately separate from the search box above.
  // That box filters THIS HUB's invoices; this one fetches a single invoice
  // by id from anywhere, which is what you need when a customer rings up
  // quoting a number from another branch.
  const [lookupId, setLookupId] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const lookupInvoice = async () => {
    const id = Number(lookupId.replace(/\D/g, ''))
    if (!id) { setLookupError('Enter an invoice ID'); return }
    setLookingUp(true)
    setLookupError('')
    try {
      setViewing(await api.staffInvoice(id))
      setLookupId('')
    } catch (e: any) {
      setLookupError(e.message || `No invoice found with ID ${id}`)
    } finally {
      setLookingUp(false)
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.staffInvoices(page, PAGE_SIZE, applied || undefined)
      setRows(data.invoices ?? [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, applied])

  // Debounce the search box so we are not querying on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      setApplied(search.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const handleDownload = async (invoice: InvoiceResponse) => {
    setDownloadingId(invoice.invoiceId)
    setError('')
    try {
      const blob = await api.downloadStaffInvoice(invoice.invoiceId)
      saveBlob(blob, `Invoice-${invoice.invoiceNo ?? invoice.invoiceId}.pdf`)
      setToast('Invoice downloaded')
      setTimeout(() => setToast(''), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <Toast message={toast} onClose={() => setToast('')} />
        </div>
      )}

      <SectionHeader
        title="Invoices"
        subtitle={`${totalElements} invoice${totalElements === 1 ? '' : 's'} at your hub - use the ID box to open one from anywhere`}
      />

      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Filter your hub's invoices by no, booking, customer or vehicle..."
          className="md:w-[28rem]"
        />

        {/* Same tab, not a new one. */}
        <div className="md:w-80">
          <form
            className="flex gap-2"
            onSubmit={e => { e.preventDefault(); lookupInvoice() }}
          >
            <div className="relative flex-1">
              <Search size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={lookupId}
                onChange={e => { setLookupId(e.target.value.replace(/\D/g, '')); setLookupError('') }}
                placeholder="Open any invoice by ID..."
                inputMode="numeric"
                className="field field-icon"
              />
            </div>
            <Button type="submit" loading={lookingUp} disabled={!lookupId}>
              Open
            </Button>
          </form>
          {lookupError && (
            <p className="flex items-center gap-2 text-[13px] text-red-600 mt-2">
              <AlertTriangle size={14} className="flex-shrink-0" /> {lookupError}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Receipt size={28} />}
            title={applied ? 'No invoices match that search' : 'No invoices yet'}
            description={
              applied
                ? 'Try a different invoice number, customer or registration.'
                : 'An invoice is raised automatically when a vehicle is returned.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-bold px-5 py-4">Invoice</th>
                  <th className="text-left font-bold px-5 py-4">Booking</th>
                  <th className="text-left font-bold px-5 py-4">Customer</th>
                  <th className="text-left font-bold px-5 py-4">Vehicle</th>
                  <th className="text-left font-bold px-5 py-4">Returned</th>
                  <th className="text-right font-bold px-5 py-4">Total</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(inv => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">
                      {inv.invoiceNo ?? `#${inv.invoiceId}`}
                    </td>
                    <td className="px-5 py-4 text-slate-600">#{inv.bookingId}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{inv.customerName}</p>
                      <p className="text-xs text-slate-400">{inv.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {inv.registrationNo
                        ? `${inv.brandName ?? ''} ${inv.modelName ?? ''} (${inv.registrationNo})`
                        : (inv.carTypeName ?? '—')}
                    </td>
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                      {formatDate(inv.returnDate)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">
                      {money(inv.finalAmount)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="xs" variant="outline"
                          onClick={() => setViewing(inv)} icon={<Eye size={13} />}>
                          View
                        </Button>
                        <Button size="xs"
                          loading={downloadingId === inv.invoiceId}
                          onClick={() => handleDownload(inv)}
                          icon={<Download size={13} />}>
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Invoice details.
          This used to be a hand-rolled `fixed inset-0` div. Inside the staff
          Layout that never worked: the content wrapper carries
          `animate-fade-in`, whose lingering transform makes it the containing
          block for fixed children, so the popup was positioned and clipped
          against the content area instead of the screen. The shared Modal
          renders through a portal into document.body and has none of that
          problem, plus Escape-to-close, click-outside and a scroll lock. */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Invoice ${viewing.invoiceNo ?? `#${viewing.invoiceId}`}` : ''}
        subtitle={viewing ? `Booking #${viewing.bookingId} · ${viewing.customerName}` : undefined}
        maxWidth="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && (
              <Button
                size="sm"
                loading={downloadingId === viewing.invoiceId}
                onClick={() => handleDownload(viewing)}
                icon={<Download size={14} />}
              >
                Download PDF
              </Button>
            )}
          </>
        }
      >
        {viewing && (
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6 text-[15px]">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Customer
                </p>
                <p className="font-bold text-slate-900">{viewing.customerName}</p>
                <p className="text-slate-500">{viewing.email}</p>
                <p className="text-slate-500">{viewing.phone ?? '—'}</p>
                {hasAddress(viewing) && (
                  <p className="text-slate-500 mt-1">{formatAddress(viewing)}</p>
                )}
                <p className="text-slate-500 mt-1">
                  Licence: {viewing.drivingLicenseNo ?? '—'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Booking" value={`#${viewing.bookingId}`} />
                <Detail label="Invoice date" value={formatDate(viewing.invoiceDate)} />
                <Detail label="Handed over" value={formatDate(viewing.handoverDate)} />
                <Detail label="Returned" value={formatDate(viewing.returnDate)} />
                <Detail label="Pick-up" value={viewing.pickupHubName} />
                <Detail label="Drop-off" value={viewing.dropoffHubName} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-y border-slate-100">
              <Detail label="Category" value={viewing.carTypeName ?? '—'} />
              <Detail label="Registration" value={viewing.registrationNo ?? '—'} />
              <Detail
                label="Vehicle"
                value={`${viewing.brandName ?? ''} ${viewing.modelName ?? ''}`.trim() || '—'}
              />
              <Detail label="Duration" value={`${viewing.duration} day(s)`} />
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-2 text-[15px]">
              <Row
                label={`Vehicle rental (${viewing.duration} day(s))`}
                value={money(viewing.vehicleAmount)}
              />
              {viewing.addons.map(a => (
                <Row key={a.invoiceDetailId} indent
                  label={`Add-on: ${a.addonName}`} value={money(a.addonPrice)} />
              ))}
              <Row label="Add-ons subtotal" value={money(viewing.addonAmount)} />
              <Row label="GST (18%)" value={money(viewing.taxAmount)} />
              <Row label="Booking total" value={money(viewing.grandTotal)} />
              <Row
                label={`Fuel charges (out ${viewing.fuelLevelOut ?? '—'}% / in ${viewing.fuelLevelIn ?? '—'}%)`}
                value={money(viewing.fuelCharges)} />
              <div className="flex justify-between border-t border-slate-200 pt-3 mt-1">
                <span className="font-black text-slate-800">Total payable</span>
                <span className="font-black text-blue-600 text-xl">
                  {money(viewing.finalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-[15px] text-slate-800 font-medium mt-0.5">{value}</p>
    </div>
  )
}

function Row({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={`text-slate-600 ${indent ? 'pl-3' : ''}`}>{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  )
}
