import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format, parse, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { useIsPhone, useAnchoredPosition, useDismiss } from './popover';

// Date + time picker styled like the rest of TruckFlow.
// mode="datetime": value / onChange use "yyyy-MM-ddTHH:mm" (like <input type="datetime-local">), or "".
// mode="date":     value / onChange use "yyyy-MM-dd" (like <input type="date">), or "".
//                  A full ISO string from the server is accepted too; only its date part is used.
// compact: the smaller size used by filter bars.
const FMT = "yyyy-MM-dd'T'HH:mm";
const DATE_FMT = 'yyyy-MM-dd';
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toDate(v, dateOnly) {
  if (!v) return null;
  const d = dateOnly ? parse(String(v).slice(0, 10), DATE_FMT, new Date()) : parse(v, FMT, new Date());
  return isValid(d) ? d : null;
}

export default function DateTimePicker({ value, onChange, mode = 'datetime', compact = false, clearable = true, placeholder, defaultHour = 8, style }) {
  const dateOnly = mode === 'date';
  const selected = toDate(value, dateOnly);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(selected || new Date()));
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const phone = useIsPhone();

  const openPicker = () => { setView(startOfMonth(selected || new Date())); setOpen(true); };
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  const pos = useAnchoredPosition(open, phone, triggerRef, popRef);
  useDismiss(open, triggerRef, popRef, () => setOpen(false), close);

  // Bring the chosen hour and minute into view when the popup opens
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      popRef.current?.querySelectorAll('.dtp-col .is-on').forEach(el => {
        const col = el.parentElement;
        col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const emit = d => onChange(format(d, dateOnly ? DATE_FMT : FMT));
  const base = () => selected || (() => { const d = new Date(); d.setHours(defaultHour, 0, 0, 0); return d; })();

  const pickDay = day => {
    const d = new Date(day);
    const b = base();
    d.setHours(b.getHours(), b.getMinutes(), 0, 0);
    emit(d);
    if (dateOnly) { close(); return; }
    if (!isSameMonth(day, view)) setView(startOfMonth(day));
  };
  const setTime = ({ h12, m, pm }) => {
    const b = base();
    const cur12 = b.getHours() % 12 || 12;
    const curPm = b.getHours() >= 12;
    const hour12 = h12 ?? cur12;
    const isPm = pm ?? curPm;
    const d = new Date(b);
    d.setHours((hour12 % 12) + (isPm ? 12 : 0), m ?? b.getMinutes(), 0, 0);
    emit(d);
  };

  const days = useMemo(() => {
    const out = [];
    for (let d = startOfWeek(view); d <= endOfWeek(endOfMonth(view)); d = addDays(d, 1)) out.push(d);
    return out;
  }, [view]);

  const h12 = selected ? (selected.getHours() % 12 || 12) : null;
  const min = selected ? selected.getMinutes() : null;
  const pm = selected ? selected.getHours() >= 12 : null;
  const minutes = min != null && !MINUTES.includes(min) ? [...MINUTES, min].sort((a, b) => a - b) : MINUTES;

  const panel = (
    <div
      ref={popRef}
      className={`dtp-pop${phone ? ' is-sheet' : ''}${dateOnly ? ' is-date' : ''}`}
      role="dialog"
      aria-label="Choose date and time"
      style={phone ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
    >
      {phone && <div className="dtp-grab" />}
      <div className="dtp-body">
        <div className="dtp-cal">
          <div className="dtp-head">
            <span className="dtp-month">{format(view, 'MMMM')} <em>{format(view, 'yyyy')}</em></span>
            <div className="dtp-nav">
              <button type="button" aria-label="Previous month" onClick={() => setView(v => addMonths(v, -1))}><ChevronLeft size={17} /></button>
              <button type="button" aria-label="Next month" onClick={() => setView(v => addMonths(v, 1))}><ChevronRight size={17} /></button>
            </div>
          </div>
          <div className="dtp-grid">
            {WEEKDAYS.map(w => <span key={w} className="dtp-wd">{w}</span>)}
            {days.map(d => {
              const on = selected && isSameDay(d, selected);
              const cls = ['dtp-day', on && 'is-on', isToday(d) && 'is-today', !isSameMonth(d, view) && 'is-out'].filter(Boolean).join(' ');
              return (
                <button type="button" key={d.toISOString()} className={cls} aria-pressed={!!on}
                  aria-label={format(d, 'EEEE, MMMM d, yyyy')} onClick={() => pickDay(d)}>
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {!dateOnly && <div className="dtp-time">
          <div className="dtp-time-label">Time</div>
          <div className="dtp-cols">
            <div className="dtp-col" aria-label="Hour">
              {HOURS.map(h => (
                <button type="button" key={h} className={h === h12 ? 'is-on' : ''} onClick={() => setTime({ h12: h })}>{h}</button>
              ))}
            </div>
            <div className="dtp-col" aria-label="Minute">
              {minutes.map(m => (
                <button type="button" key={m} className={m === min ? 'is-on' : ''} onClick={() => setTime({ m })}>{String(m).padStart(2, '0')}</button>
              ))}
            </div>
            <div className="dtp-ampm" aria-label="AM or PM">
              <button type="button" className={pm === false ? 'is-on' : ''} onClick={() => setTime({ pm: false })}>AM</button>
              <button type="button" className={pm === true ? 'is-on' : ''} onClick={() => setTime({ pm: true })}>PM</button>
            </div>
          </div>
        </div>}
      </div>

      <div className="dtp-foot">
        <button type="button" className="dtp-link" onClick={() => { const d = new Date(); d.setSeconds(0, 0); emit(d); setView(startOfMonth(d)); if (dateOnly) close(); }}>{dateOnly ? 'Today' : 'Now'}</button>
        {clearable && value && <button type="button" className="dtp-link" onClick={() => onChange('')}>Clear</button>}
        <button type="button" className="btn btn-primary dtp-done" onClick={close}>Done</button>
      </div>
    </div>
  );

  return (
    <>
      <div className={`dtp-field${compact ? ' is-compact' : ''}${clearable ? '' : ' no-clear'}`} style={style}>
        <button
          type="button"
          ref={triggerRef}
          className={`form-control dtp-trigger${open ? ' is-open' : ''}`}
          aria-label={selected ? undefined : (placeholder || (dateOnly ? 'Select date' : 'Select date & time'))}
          onClick={() => (open ? setOpen(false) : openPicker())}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarDays size={16} className="dtp-icon" />
          {selected
            ? (dateOnly
              ? <span className="dtp-value">{format(selected, compact ? 'MMM d, yyyy' : 'EEE, MMM d, yyyy')}</span>
              : <span className="dtp-value">{format(selected, 'EEE, MMM d')}<span className="dtp-dot">·</span>{format(selected, 'h:mm a')}</span>)
            : <span className="dtp-placeholder">{placeholder || (dateOnly ? 'Select date' : 'Select date & time')}</span>}
        </button>
        {clearable && value && !open && (
          <button type="button" className="dtp-clear" aria-label="Clear date and time" onClick={() => onChange('')}><X size={14} /></button>
        )}
      </div>
      {open && createPortal(
        phone ? <div className="dtp-scrim" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>{panel}</div> : panel,
        document.body,
      )}
    </>
  );
}
