// Date helpers for the booking widgets.
//
// WHY NOT toISOString()
// ---------------------
// `new Date().toISOString().split('T')[0]` is the UTC date, not the local one.
// India is UTC+5:30, so between midnight and 05:30 IST it returns *yesterday*.
// That was enough to let the date picker offer a day the backend then rejected
// with "The pick-up date cannot be in the past". These helpers work in local
// time, which is what the customer sees on their own calendar.

const MS_PER_DAY = 86_400_000

/** Formats a Date as yyyy-MM-dd using local time. */
export function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today, local time, as yyyy-MM-dd. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Adds days to a yyyy-MM-dd string and returns yyyy-MM-dd. */
export function addDays(iso: string, days: number): string {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * Whole days between two yyyy-MM-dd strings.
 *
 * Both are parsed at local midnight so daylight-saving and timezone offsets
 * cancel out. Returns 0 when either date is missing or unparseable.
 */
export function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / MS_PER_DAY)
}

/**
 * The rental length in days, as the pricing uses it.
 *
 * A rental is charged from the pick-up day to the return day, so a booking
 * that goes out on the 1st and comes back on the 6th is 5 days. The return
 * date must be after the pick-up date, so this never legitimately returns 0 -
 * but it floors at 1 anyway rather than ever pricing a booking at zero.
 */
export function rentalDays(startDate: string, endDate: string): number {
  return Math.max(1, daysBetween(startDate, endDate))
}
