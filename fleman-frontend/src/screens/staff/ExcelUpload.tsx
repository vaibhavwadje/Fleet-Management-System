import { useRef, useState } from 'react'
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X,
} from 'lucide-react'
import type { NavFn } from '../../data'
import { api } from '../../api'
import type { ExcelUploadResult } from '../../api'
import { Button, Card, SectionHeader } from '../../components/shared'

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

const COLUMNS = [
  { name: 'Car Class', note: 'SMALL, COMPACT, INTERMEDIATE, SEDAN or SUV' },
  { name: 'Car Type', note: 'Display name, e.g. Full Size SUV' },
  { name: 'Daily Rate', note: 'Number greater than 0' },
  { name: 'Weekly Rate', note: 'Number greater than 0' },
  { name: 'Monthly Rate', note: 'Number greater than 0' },
  { name: 'Effective From', note: 'yyyy-MM-dd' },
  { name: 'Effective To', note: 'yyyy-MM-dd, not before Effective From' },
  { name: 'Image URL', note: 'Optional' },
]

export default function ExcelUpload({ nav: _nav }: { nav: NavFn }) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ExcelUploadResult | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const chooseFile = (chosen: File | null | undefined) => {
    setError('')
    setResult(null)

    if (!chosen) return

    if (!chosen.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx files are supported. Save your sheet as an Excel Workbook.')
      return
    }
    if (chosen.size > 2 * 1024 * 1024) {
      setError('That file is larger than the 2 MB limit.')
      return
    }

    setFile(chosen)
  }

  const handleTemplate = async () => {
    setDownloading(true)
    setError('')
    try {
      const blob = await api.downloadRateTemplate()
      saveBlob(blob, 'vehicle-rate-template.xlsx')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    try {
      setResult(await api.uploadCarTypeRates(file))
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Excel Upload"
        subtitle="Upload vehicle rate data in bulk for your hub"
        action={
          <Button
            variant="outline"
            size="sm"
            loading={downloading}
            onClick={handleTemplate}
            icon={<Download size={14} />}
          >
            Download template
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Upload box */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault()
              setDragging(false)
              chooseFile(e.dataTransfer.files?.[0])
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => chooseFile(e.target.files?.[0])}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Upload size={24} />
            </div>

            {file ? (
              <>
                <p className="font-semibold text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(0)} KB · click to choose a different file
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-800">
                  Drop your rate sheet here, or click to browse
                </p>
                <p className="text-xs text-slate-400 mt-1">.xlsx only, up to 2 MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              fullWidth
              loading={uploading}
              disabled={!file}
              onClick={handleUpload}
              icon={<FileSpreadsheet size={15} />}
            >
              Upload rates
            </Button>
            {file && (
              <Button
                variant="secondary"
                onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
                icon={<X size={15} />}
              >
                Clear
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Rates are saved against your own hub. Uploading a car class that
            already has rates updates them rather than creating a duplicate.
          </p>
        </Card>

        {/* Expected format */}
        <Card className="p-6">
          <h3 className="font-bold text-slate-800 mb-1">Expected columns</h3>
          <p className="text-xs text-slate-400 mb-4">
            Row 1 must stay as the header. Data starts on row 2.
          </p>
          <ol className="space-y-2.5">
            {COLUMNS.map((c, i) => (
              <li key={c.name} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            {result.failed === 0
              ? <CheckCircle2 size={20} className="text-green-600" />
              : <AlertTriangle size={20} className="text-amber-500" />}
            <h3 className="font-bold text-slate-800">
              Upload finished — {result.fileName}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rows read', value: result.totalRows, tone: 'bg-slate-50 text-slate-700' },
              { label: 'Added', value: result.inserted, tone: 'bg-green-50 text-green-700' },
              { label: 'Updated', value: result.updated, tone: 'bg-blue-50 text-blue-700' },
              { label: 'Rejected', value: result.failed, tone: 'bg-red-50 text-red-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-4 ${s.tone}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">
                Rows that were not saved
              </p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[15px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5 w-24">Row</th>
                      <th className="text-left font-semibold px-4 py-2.5">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map(e => (
                      <tr key={e.rowNumber}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                          {e.rowNumber}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Fix these rows in your sheet and upload it again. Rows that
                already saved will simply be updated, so nothing is duplicated.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
