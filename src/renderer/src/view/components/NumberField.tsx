import {useState} from 'react'

interface Props {
    label: string
    value: number
    onChange: (v: number) => void
    step?: number
    disabled?: boolean
}

const round = (n: number): number => Math.round(n * 1000) / 1000

/** Text input that applies edits live. Drag the label sideways to scrub; arrow keys nudge (Shift = x10). */
export function NumberField({label, value, onChange, step = 1, disabled}: Props) {
    const [draft, setDraft] = useState<string | null>(null)
    const shown = draft ?? String(round(value))

    const scrub = (e: React.PointerEvent): void => {
        if (disabled) return
        const x0 = e.clientX
        const base = value
        const move = (ev: PointerEvent): void => onChange(round(base + (ev.clientX - x0) * step * (ev.shiftKey ? 0.1 : 0.5)))
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), {once: true})
    }

    return (
        <div className={`field${disabled ? ' disabled' : ''}`}>
      <span className="field-label" onPointerDown={scrub} title="Drag to change">
        {label}
      </span>
            <input
                type="text"
                inputMode="decimal"
                value={shown}
                disabled={disabled}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                    setDraft(e.target.value)
                    const n = parseFloat(e.target.value)
                    if (Number.isFinite(n)) onChange(n)
                }}
                onBlur={() => setDraft(null)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault()
                        const cur = Number.isFinite(parseFloat(shown)) ? parseFloat(shown) : value
                        const n = round(cur + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1))
                        setDraft(String(n))
                        onChange(n)
                    }
                }}
            />
        </div>
    )
}
