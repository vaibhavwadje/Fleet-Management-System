import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface SearchOption {
  id: number | string
  label: string
}

/**
 * A dropdown you can type into, so long lists stay usable.
 *
 * Behaves like the airport search box, but filters a list that is already
 * loaded instead of calling the server on every keystroke. States and cities
 * are short lists, so there is no need for a search endpoint.
 *
 *   <SearchSelect
 *     value={stateId}
 *     options={states.map(s => ({ id: s.stateId, label: s.stateName }))}
 *     placeholder="Select State"
 *     onSelect={opt => setStateId(opt ? String(opt.id) : '')}
 *   />
 */
export function SearchSelect({
  value,
  options,
  onSelect,
  placeholder,
  icon: Icon,
  disabled = false,
  disabledText,
  emptyText = 'No matches',
  name,
  invalid = false,
  onBlur,
}: {
  value?: string | number
  options: SearchOption[]
  onSelect: (option: SearchOption | null) => void
  placeholder: string
  icon?: any
  disabled?: boolean
  disabledText?: string
  emptyText?: string
  /** Lets a form focus this field, e.g. document.querySelector('[name="stateId"]') */
  name?: string
  /** Draws a red border when the field failed validation. */
  invalid?: boolean
  onBlur?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected =
    options.find(o => String(o.id) === String(value ?? '')) ?? null

  // Typing filters the list; an empty box shows everything.
  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? options.filter(o => o.label.toLowerCase().includes(needle))
    : options

  // Clicking anywhere else closes the list and drops whatever was typed.
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  // Keep the highlighted row in range as the list shrinks.
  useEffect(() => { setHighlight(0) }, [query, open])

  const choose = (option: SearchOption) => {
    onSelect(option)
    setQuery('')
    setOpen(false)
  }

  const clear = () => {
    onSelect(null)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        choose(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  // While the list is open the box is empty so every option is visible;
  // the current choice is kept visible as the placeholder.
  const shownValue = open ? query : (selected?.label ?? '')
  const shownPlaceholder = disabled
    ? (disabledText ?? placeholder)
    : (open && selected ? selected.label : placeholder)

  return (
    <div ref={boxRef} className="relative">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
        />
      )}

      <input
        ref={inputRef}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-invalid={invalid}
        autoComplete="off"
        disabled={disabled}
        value={shownValue}
        placeholder={shownPlaceholder}
        onFocus={() => { if (!disabled) setOpen(true) }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className={`field ${Icon ? 'field-icon' : ''} pr-9
          ${invalid ? '!border-red-400 !bg-red-50' : ''}`}
      />

      {/* Clear when something is chosen, otherwise the usual dropdown arrow */}
      {selected && !disabled ? (
        <button
          type="button"
          onClick={clear}
          title="Clear"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X size={14} />
        </button>
      ) : (
        <ChevronDown
          size={15}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      )}

      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2.5 text-sm text-slate-400">{emptyText}</p>
          ) : (
            filtered.map((option, i) => {
              const isSelected = String(option.id) === String(value ?? '')
              return (
                <button
                  key={option.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={() => choose(option)}
                  className={`w-full text-left px-3.5 py-2.5 text-[15px] transition-colors border-b border-slate-50 last:border-0 ${
                    i === highlight ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  } ${isSelected ? 'font-semibold' : ''}`}
                >
                  {option.label}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
