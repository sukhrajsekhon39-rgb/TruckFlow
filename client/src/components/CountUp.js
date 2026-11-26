import { useEffect, useRef, useState } from 'react';

// Animates the number inside a formatted string, e.g. "$15,800", "$3.04", "5,190".
// Anything without a number (like "—") is shown as-is.
const NUM = /-?[\d,]*\.?\d+/;
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function parse(text) {
  const str = String(text ?? '');
  const m = str.match(NUM);
  if (!m) return null;
  const raw = m[0];
  const dot = raw.indexOf('.');
  return {
    prefix: str.slice(0, m.index),
    suffix: str.slice(m.index + raw.length),
    value: parseFloat(raw.replace(/,/g, '')),
    decimals: dot === -1 ? 0 : raw.length - dot - 1,
    commas: raw.includes(','),
  };
}

function render(p, v) {
  let s = v.toFixed(p.decimals);
  if (p.commas || Math.abs(v) >= 1000) {
    const [i, d] = s.split('.');
    s = Number(i).toLocaleString('en-US') + (d ? '.' + d : '');
  }
  return p.prefix + s + p.suffix;
}

const ease = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)); // ease-out expo

export default function CountUp({ value, duration = 1100 }) {
  const target = parse(value);
  const [shown, setShown] = useState(() => (target && !reduceMotion() ? render(target, 0) : String(value ?? '')));
  const from = useRef(0);

  useEffect(() => {
    const p = parse(value);
    if (!p || reduceMotion()) { setShown(String(value ?? '')); if (p) from.current = p.value; return; }
    const start = performance.now();
    const a = from.current, b = p.value;
    let raf;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      setShown(render(p, a + (b - a) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{shown}</span>;
}
