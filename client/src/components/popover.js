import { useEffect, useLayoutEffect, useState } from 'react';

// Shared by the gold popups (DateTimePicker, Select).

export function useIsPhone() {
  const [phone, setPhone] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setPhone(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return phone;
}

// Fixed position for a popup under its field (or above it when there's no room), kept inside the window.
// The popup is rendered into document.body so scrolling modals can't cut it off.
export function useAnchoredPosition(open, disabled, triggerRef, popRef, matchWidth = false) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || disabled) { setPos(null); return; }
    const place = () => {
      const t = triggerRef.current, p = popRef.current;
      if (!t || !p) return;
      const r = t.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = matchWidth ? Math.min(Math.max(r.width, 200), vw - 24) : p.offsetWidth;
      const h = p.offsetHeight;
      const below = r.bottom + 8 + h <= vh - 12 || r.top - 8 - h < 12;
      const top = below ? r.bottom + 8 : r.top - 8 - h;
      const left = Math.min(Math.max(12, r.left), vw - w - 12);
      setPos({ top, left, width: matchWidth ? w : undefined });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, disabled, triggerRef, popRef, matchWidth]);
  return pos;
}

// Close on a click outside the field and popup, or on Escape
export function useDismiss(open, triggerRef, popRef, onDismiss, onEscape) {
  useEffect(() => {
    if (!open) return;
    const down = e => {
      if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      onDismiss();
    };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); (onEscape || onDismiss)(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [open, triggerRef, popRef, onDismiss, onEscape]);
}
