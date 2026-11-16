/**
 * One place that turns the structured address fields into readable text.
 *
 * The address is stored as separate columns - line 1, line 2, city, state,
 * pincode - and never as a single blob. Every screen formats it through here
 * so it reads the same way on the profile, the booking details, the invoice
 * and the PDF.
 */
export interface StructuredAddress {
  addressLine1?: string | null
  addressLine2?: string | null
  cityName?: string | null
  stateName?: string | null
  pincode?: string | null
}

/**
 * Single line, e.g.
 *   "A-701 Oberoi Springs, Andheri West, Mumbai, Maharashtra 400053"
 *
 * Missing parts are skipped rather than leaving stray commas.
 */
export function formatAddress(a: StructuredAddress | null | undefined): string {
  if (!a) return ''

  const parts = [a.addressLine1, a.addressLine2, a.cityName]
    .map(p => (p ?? '').trim())
    .filter(Boolean)

  // State and pincode belong together: "Maharashtra 400053".
  const region = [(a.stateName ?? '').trim(), (a.pincode ?? '').trim()]
    .filter(Boolean)
    .join(' ')

  if (region) parts.push(region)

  return parts.join(', ')
}

/** Multi-line version for cards and invoices. */
export function addressLines(a: StructuredAddress | null | undefined): string[] {
  if (!a) return []

  const lines: string[] = []
  if (a.addressLine1?.trim()) lines.push(a.addressLine1.trim())
  if (a.addressLine2?.trim()) lines.push(a.addressLine2.trim())

  const cityLine = [(a.cityName ?? '').trim(), (a.stateName ?? '').trim()]
    .filter(Boolean)
    .join(', ')

  const lastLine = [cityLine, (a.pincode ?? '').trim()].filter(Boolean).join(' ')
  if (lastLine) lines.push(lastLine)

  return lines
}

/** True when there is anything worth showing. */
export function hasAddress(a: StructuredAddress | null | undefined): boolean {
  return formatAddress(a).length > 0
}
