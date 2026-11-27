import React, { useId } from 'react';

const SERIF = "'Instrument Serif', Georgia, serif";

// TruckFlow "Route" mark: a T whose stem bends into a lane and ends at a drop-off point,
// in obsidian on a solid champagne-gold tile. Same artwork as public/favicon.svg.
export function LogoMark({ size = 40, className = 'logo-mark', style }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={className} style={{
      width: size, height: size, borderRadius: size * 0.27, flexShrink: 0,
      display: 'block', lineHeight: 0, ...style,
    }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ display: 'block', borderRadius: size * 0.27 }}>
        <defs>
          <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#EBD3A2" />
            <stop offset="1" stopColor="#C4A266" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="17" fill={`url(#${id}t)`} />
        <rect x="0.5" y="0.5" width="63" height="63" rx="16.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1" />
        <g transform="translate(-2.5 -2)" fill="none" stroke="#0A0A0B" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H45" />
          <path d="M32 21V32.5C32 40 36 44.5 41.5 44.5" />
        </g>
        <circle cx="47" cy="42.5" r="3.4" fill="#0A0A0B" />
      </svg>
    </div>
  );
}

// "Truck" in ivory, "Flow" in glowing gold italic
export function Wordmark({ size = 28, color = '#F7F5F1', style }) {
  return (
    <span style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1, color, whiteSpace: 'nowrap', ...style }}>
      Truck<em style={{
        fontStyle: 'italic', color: '#D8BC86',
        textShadow: '0 0 18px rgba(216,188,134,0.50), 0 0 3px rgba(216,188,134,0.32)',
      }}>Flow</em>
    </span>
  );
}
