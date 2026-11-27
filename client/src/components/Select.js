import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useIsPhone, useAnchoredPosition, useDismiss } from './popover';

// Dropdown styled like the rest of TruckFlow. Drop-in for <select>: it takes the same
// <option> children, but onChange receives the new value itself (not an event).
//   compact : the smaller size used by filter bars
//   dots    : optional { value: cssColor } to show a coloured dot beside an option
// A search box appears when there are more than 8 options.

export const STATUS_DOTS = {
  'Pending': 'var(--yellow)',
  'In Transit': 'var(--blue)',
  'Delivered': 'var(--green)',
  'Invoiced': 'var(--accent)',
  'Paid': 'var(--green)',
  'unpaid': 'var(--red)',
};

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node.props) return textOf(node.props.children);
  return '';
}

function readOptions(children) {
  const out = [];
  React.Children.toArray(children).forEach(child => {
    if (!child || child.type !== 'option') return;
    const label = textOf(child.props.children);
    out.push({ value: child.props.value !== undefined ? String(child.props.value) : label, label, disabled: !!child.props.disabled });
  });
  return out;
}

export default function Select({ value, onChange, children, placeholder = 'Select…', compact = false, dots, style, className = '', 'aria-label': ariaLabel }) {
  const options = useMemo(() => readOptions(children), [children]);
  const current = value == null ? '' : String(value);
  const selected = options.find(o => o.value === current);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const typeahead = useRef({ text: '', at: 0 });
  const phone = useIsPhone();
  const searchable = options.length > 8;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const openList = () => {
    setQuery('');
    setActive(Math.max(0, options.findIndex(o => o.value === current)));
    setOpen(true);
  };
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  const pick = o => { if (o.disabled) return; if (o.value !== current) onChange(o.value); close(); };

  const pos = useAnchoredPosition(open, phone, triggerRef, popRef, true);
  useDismiss(open, triggerRef, popRef, () => setOpen(false), close);

  // Focus the search box (desktop only, so phones don't pop the keyboard) or the list
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      if (searchable && !phone) searchRef.current?.focus();
      else listRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, searchable, phone]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (!open || active < 0) return;
    const list = listRef.current;
    const el = list?.children[active];
    if (!el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 6;
  }, [active, open, shown]);

  const onTriggerKey = e => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
  };

  const onListKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === 'Tab') { setOpen(false); }
    else if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      // Type the first letters of an option to jump to it
      const now = Date.now();
      const t = typeahead.current;
      t.text = (now - t.at > 700 ? '' : t.text) + e.key.toLowerCase();
      t.at = now;
      const i = shown.findIndex(o => o.label.toLowerCase().startsWith(t.text));
      if (i >= 0) setActive(i);
    }
  };

  const panel = (
    <div
      ref={popRef}
      className={`sel-pop${phone ? ' is-sheet' : ''}`}
      style={phone ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width }}
      onKeyDown={onListKey}
    >
      {phone && <div className="dtp-grab" />}
      {searchable && (
        <div className="sel-search">
          <Search size={14} />
          <input
            ref={searchRef}
            value={query}
            placeholder="Search"
            aria-label="Search options"
            onChange={e => { setQuery(e.target.value); setActive(0); }}
          />
        </div>
      )}
      <div className="sel-list" ref={listRef} role="listbox" tabIndex={-1} aria-activedescendant={active >= 0 ? `sel-opt-${active}` : undefined}>
        {shown.map((o, i) => {
          const on = o.value === current;
          return (
            <button
              type="button"
              key={o.value + i}
              id={`sel-opt-${i}`}
              role="option"
              aria-selected={on}
              disabled={o.disabled}
              tabIndex={-1}
              className={`sel-opt${on ? ' is-on' : ''}${i === active ? ' is-active' : ''}${o.value === '' ? ' is-empty' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              {dots?.[o.value] && <i className="sel-dot" style={{ background: dots[o.value], boxShadow: `0 0 10px ${dots[o.value]}` }} />}
              <span className="sel-label">{o.label}</span>
              {on && <Check size={15} className="sel-check" />}
            </button>
          );
        })}
        {!shown.length && <div className="sel-none">No matches</div>}
      </div>
    </div>
  );

  return (
    <div className={`sel-field${compact ? ' is-compact' : ''} ${className}`} style={style}>
      <button
        type="button"
        ref={triggerRef}
        className={`form-control sel-trigger${open ? ' is-open' : ''}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {selected && dots?.[selected.value] && <i className="sel-dot" style={{ background: dots[selected.value], boxShadow: `0 0 10px ${dots[selected.value]}` }} />}
        <span className={`sel-value${!selected || selected.value === '' ? ' is-muted' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={compact ? 14 : 16} className="sel-chev" />
      </button>
      {open && createPortal(
        phone ? <div className="dtp-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>{panel}</div> : panel,
        document.body,
      )}
    </div>
  );
}
