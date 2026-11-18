import React, { useEffect, useRef, useState } from 'react';
import { placesApi } from '../utils/api';

// Text input that suggests addresses as you type.
//   value / onChange : the street address text
//   onPick(s)        : called with {address, city, state, zip, label} when a suggestion is chosen
export default function AddressAutocomplete({ value, onChange, onPick, placeholder }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const seq = useRef(0);
  const wrapRef = useRef(null);

  // Runs only when the user types (not when a form is opened with an existing address)
  const search = q => {
    clearTimeout(timer.current);
    const text = q.trim();
    const id = ++seq.current;
    if (text.length < 3) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await placesApi.autocomplete(text);
        if (id !== seq.current) return; // a newer search or a pick replaced this one
        setItems(res.data.results || []);
        setActive(-1);
        setOpen(true);
      } catch {
        if (id === seq.current) { setItems([]); setOpen(false); }
      }
    }, 350);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // Close the list when clicking elsewhere
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = s => {
    clearTimeout(timer.current);
    seq.current++; // ignore any lookup still in flight
    onPick(s);
    setOpen(false);
    setItems([]);
  };

  const onKeyDown = e => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="form-control"
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); search(e.target.value); }}
        onFocus={() => { if (items.length) setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && items.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, marginTop: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border-light)',
          borderRadius: 8, boxShadow: 'var(--shadow)', maxHeight: 240, overflowY: 'auto',
        }}>
          {items.map((s, i) => (
            <div
              key={i}
              role="option"
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                background: i === active ? 'var(--bg-card-hover)' : 'transparent',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
