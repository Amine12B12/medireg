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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '8px 12px', border: '0.5px solid #E5E7EB', borderRadius: '8px', background: '#fff', fontSize: '13px', color: selected ? '#111827' : '#9CA3AF', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
      >
        {selected ? selected.label : placeholder}
        <i className="ti ti-chevron-down" style={{ fontSize: '14px', color: '#9CA3AF', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div
              onClick={() => { onChange(''); setOpen(false); setSearch('') }}
              style={{ padding: '9px 14px', fontSize: '13px', color: '#9CA3AF', cursor: 'pointer', borderTop: '0.5px solid #F3F4F6' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              {placeholder}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>Aucun résultat</div>
            ) : filtered.map(o => (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                style={{ padding: '9px 14px', fontSize: '13px', color: '#111827', cursor: 'pointer', background: o.value === value ? '#EFF6FF' : 'transparent', fontWeight: o.value === value ? '500' : '400' }}
                onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {o.value === value && <i className="ti ti-check" style={{ fontSize: '12px', color: '#1A56DB', marginRight: '6px' }} aria-hidden="true" />}
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}