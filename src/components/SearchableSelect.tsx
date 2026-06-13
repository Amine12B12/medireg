'use client'

import { useState, useRef, useEffect } from 'react'

type Option = { value: string; label: string }

type Props = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Sélectionner...' }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 10)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', fontSize: '12px', color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)', fontFamily: 'var(--font)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <i className="ti ti-chevron-down" style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '8px' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Rechercher..."
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)' }}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div
              onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); setSearch('') }}
              style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer', borderTop: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {placeholder}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>Aucun résultat</div>
            ) : filtered.map(o => (
              <div
                key={o.value}
                onMouseDown={e => { e.preventDefault(); onChange(o.value); setOpen(false); setSearch('') }}
                style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', background: o.value === value ? 'var(--accent-light)' : 'transparent', fontWeight: o.value === value ? '500' : '400', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)' }}
                onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {o.value === value && <i className="ti ti-check" style={{ fontSize: '11px', color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />}
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}