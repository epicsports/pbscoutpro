import React from 'react';

/**
 * RdIcon — the premium "North Star" line-icon set (design handoff). 16×16 viewBox,
 * `currentColor` stroke ~1.4, round caps/joins. NO emoji anywhere. Ported verbatim
 * from the handoff `reference/redesign.jsx:77`, plus a few app-specific extras
 * (trash, shield, globe, palette) the menu/settings need.
 *
 * Names: compass, flag, target, impact, duo, note, footsteps, pin, warn, pencil,
 * play, pause, check, clock, layers, eye, eyeoff, trophy, chevron, close, swap, map,
 * building, jersey, book, hand, todo, home, door, user, trash, shield, globe, palette.
 */
export default function RdIcon({ name, size = 16, fill }) {
  const p = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', style: { display: 'block' } };
  const s = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'compass': return <svg {...p}><circle cx="8" cy="8" r="6.2" {...s} /><path d="M10.6 5.4L9 9l-3.6 1.6L7 7z" {...s} /></svg>;
    case 'flag': return <svg {...p}><path d="M4.2 14V2.4" {...s} /><path d="M4.2 3h7l-1.4 2.2L11.2 7.4h-7" {...s} /></svg>;
    case 'target': return <svg {...p}><circle cx="8" cy="8" r="6" {...s} /><circle cx="8" cy="8" r="2.6" {...s} /><path d="M8 .8v2.2M8 13v2.2M.8 8H3M13 8h2.2" {...s} /></svg>;
    case 'impact': return <svg {...p}><path d="M8 1.4l1.7 3.5 3.8-.6-2 3.3 2 3.3-3.8-.6L8 14.6l-1.7-3.7-3.8.6 2-3.3-2-3.3 3.8.6z" {...s} /></svg>;
    case 'duo': return <svg {...p}><circle cx="5.8" cy="5.4" r="2.3" {...s} /><path d="M1.8 13.4c0-2.3 1.8-3.8 4-3.8s4 1.5 4 3.8" {...s} /><path d="M10.8 3.9a2.3 2.3 0 010 4.4M11.4 13.4c0-1.9-.8-3.2-2-3.7" {...s} /></svg>;
    case 'note': return <svg {...p}><rect x="3" y="2.4" width="10" height="11.2" rx="1.3" {...s} /><path d="M5.4 5.8h5.2M5.4 8.3h5.2M5.4 10.8h3.2" {...s} /></svg>;
    case 'footsteps': return <svg {...p}><path d="M5 2.6c1 0 1.5 1.1 1.3 2.6C6.1 6.7 5.5 7.4 4.6 7.2 3.7 7 3.4 5.7 3.6 4.2 3.8 2.9 4.2 2.6 5 2.6z" {...s} /><path d="M3.6 9.2c.7-.2 1.3.3 1.5 1.2M10.6 6.8c1 0 1.4 1.1 1.2 2.6-.2 1.5-.8 2.2-1.7 2-.9-.2-1.2-1.5-1-3 .2-1.3.7-1.6 1.5-1.6z" {...s} /><path d="M9.3 13.4c.7-.2 1.3.3 1.5 1.1" {...s} /></svg>;
    case 'pin': return <svg {...p}><path d="M8 14.2s4.4-4.1 4.4-7.2a4.4 4.4 0 10-8.8 0c0 3.1 4.4 7.2 4.4 7.2z" {...s} /><circle cx="8" cy="7" r="1.7" {...s} /></svg>;
    case 'warn': return <svg {...p}><path d="M8 2.2l6 11.3H2z" {...s} /><path d="M8 6.6v3.1" {...s} /><circle cx="8" cy="11.4" r=".5" fill="currentColor" stroke="none" /></svg>;
    case 'pencil': return <svg {...p}><path d="M10.6 2.7l2.7 2.7L6 12.7l-3 .8.8-3z" {...s} /><path d="M9.4 3.9l2.7 2.7" {...s} /></svg>;
    case 'play': return <svg {...p}><path d="M5 3.4v9.2l7.2-4.6z" {...s} fill={fill || 'currentColor'} /></svg>;
    case 'pause': return <svg {...p}><path d="M5.5 3.5v9M10.5 3.5v9" {...s} strokeWidth="2" /></svg>;
    case 'check': return <svg {...p}><path d="M3 8.5l3.3 3.3L13 4.5" {...s} strokeWidth="1.8" /></svg>;
    case 'clock': return <svg {...p}><circle cx="8" cy="8" r="6.2" {...s} /><path d="M8 4.6V8l2.4 1.6" {...s} /></svg>;
    case 'layers': return <svg {...p}><path d="M8 2L2 5.2l6 3.2 6-3.2z" {...s} /><path d="M2.2 8.2L8 11.4l5.8-3.2M2.2 11.2L8 14.4l5.8-3.2" {...s} /></svg>;
    case 'eye': return <svg {...p}><path d="M1.4 8S3.8 3.6 8 3.6 14.6 8 14.6 8 12.2 12.4 8 12.4 1.4 8 1.4 8z" {...s} /><circle cx="8" cy="8" r="2" {...s} /></svg>;
    case 'eyeoff': return <svg {...p}><path d="M6.3 3.9A6 6 0 018 3.6c4.2 0 6.6 4.4 6.6 4.4a11 11 0 01-1.8 2.3M9.6 9.7A2 2 0 016.3 6.5M1.4 8s1.2-2.2 3.3-3.4M2.4 2.4l11.2 11.2" {...s} /></svg>;
    case 'trophy': return <svg {...p}><path d="M4.5 2.6h7v2.2a3.5 3.5 0 01-7 0z" {...s} /><path d="M4.5 3.4H2.8v1c0 1 .8 1.8 1.8 1.8M11.5 3.4h1.7v1c0 1-.8 1.8-1.8 1.8M8 8.3v2.4M5.8 13.4h4.4M6.4 10.7h3.2l.3 2.7H6.1z" {...s} /></svg>;
    case 'chevron': return <svg {...p}><path d="M6 3.8l4.2 4.2L6 12.2" {...s} /></svg>;
    case 'close': return <svg {...p}><path d="M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" {...s} /></svg>;
    case 'swap': return <svg {...p}><path d="M3.4 5.4h8.2M9.2 3l2.6 2.4L9.2 7.8" {...s} /><path d="M12.6 10.6H4.4M6.8 8.2 4.2 10.6 6.8 13" {...s} /></svg>;
    case 'map': return <svg {...p}><path d="M2.2 4.2 6 2.8l4 1.4 3.8-1.4v9.2L10 13.2 6 11.8l-3.8 1.4z" {...s} /><path d="M6 2.8v9M10 4.2v9" {...s} /></svg>;
    case 'building': return <svg {...p}><path d="M3 13.4V3.2a.8.8 0 01.8-.8h4.6a.8.8 0 01.8.8v10.2" {...s} /><path d="M9.2 6.4H12a.8.8 0 01.8.8v6.2" {...s} /><path d="M5 5.2h1.6M5 7.6h1.6M5 10h1.6M2.2 13.4h11.6" {...s} /></svg>;
    case 'jersey': return <svg {...p}><path d="M5.6 2.6 3 4.3l1.3 2.1 1.1-.6v7.6h5.2V5.8l1.1.6L13 4.3l-2.6-1.7a2.4 2.4 0 01-4.8 0z" {...s} /></svg>;
    case 'book': return <svg {...p}><path d="M8 4.2C6.7 3.3 4.9 3.1 2.8 3.6v8.3c2.1-.5 3.9-.3 5.2.6 1.3-.9 3.1-1.1 5.2-.6V3.6c-2.1-.5-3.9-.3-5.2.6z" {...s} /><path d="M8 4.2v8.3" {...s} /></svg>;
    case 'hand': return <svg {...p}><path d="M5.4 7.8V4.3a.85.85 0 011.7 0M7.1 7V3.5a.85.85 0 011.7 0v3.4M8.8 7.4V4.6a.85.85 0 011.7 0V9c0 2.5-1.6 4.4-3.9 4.4-1.3 0-2.3-.6-3-1.6L2.5 9.2c-.4-.6.3-1.4 1-1.1l1.9.9z" {...s} /></svg>;
    case 'todo': return <svg {...p}><path d="M2.4 4.4 3.3 5.3 4.9 3.6M2.4 8.4 3.3 9.3 4.9 7.6M2.6 12.2h.01" {...s} /><path d="M6.8 4.4h6.8M6.8 8.4h6.8M6.8 12.2h4.4" {...s} /></svg>;
    case 'home': return <svg {...p}><path d="M2.6 7.4 8 2.8l5.4 4.6" {...s} /><path d="M4 6.4V13h8V6.4" {...s} /><path d="M6.6 13V9.4h2.8V13" {...s} /></svg>;
    case 'door': return <svg {...p}><path d="M9 2.6H4a.8.8 0 00-.8.8v9.2a.8.8 0 00.8.8h5" {...s} /><path d="M11.6 8H6.6M9.4 5.6 11.8 8 9.4 10.4" {...s} /></svg>;
    case 'user': return <svg {...p}><circle cx="8" cy="5.4" r="2.7" {...s} /><path d="M3.4 13.4c0-2.6 2-4.5 4.6-4.5s4.6 1.9 4.6 4.5" {...s} /></svg>;
    // ── app extras (same vocabulary; not in the handoff set) ──
    case 'trash': return <svg {...p}><path d="M3 4.2h10M6.4 4.2V2.9a.8.8 0 01.8-.8h1.6a.8.8 0 01.8.8v1.3M4.2 4.2l.7 8.4a.9.9 0 00.9.8h4.4a.9.9 0 00.9-.8l.7-8.4" {...s} /><path d="M6.6 6.6v4.2M9.4 6.6v4.2" {...s} /></svg>;
    case 'shield': return <svg {...p}><path d="M8 2.2l4.8 1.8v3.6c0 3-2 5.2-4.8 6.2-2.8-1-4.8-3.2-4.8-6.2V4z" {...s} /><path d="M5.9 8l1.5 1.5L10.3 6.6" {...s} /></svg>;
    case 'globe': return <svg {...p}><circle cx="8" cy="8" r="6.2" {...s} /><path d="M1.8 8h12.4M8 1.8c1.7 1.7 2.6 3.9 2.6 6.2S9.7 12.5 8 14.2C6.3 12.5 5.4 10.3 5.4 8S6.3 3.5 8 1.8z" {...s} /></svg>;
    case 'palette': return <svg {...p}><path d="M8 2.2c3.4 0 5.8 2.2 5.8 5 0 1.9-1.6 2.6-2.8 2.6h-1.2c-.8 0-1.4.6-1.4 1.4 0 .4.2.7.2 1.1 0 .8-.6 1.5-1.6 1.5-3 0-5-2.7-5-5.8 0-3.4 2.6-5.8 6-5.8z" {...s} /><circle cx="5.6" cy="7" r=".7" fill="currentColor" stroke="none" /><circle cx="8" cy="5.3" r=".7" fill="currentColor" stroke="none" /><circle cx="10.4" cy="7" r=".7" fill="currentColor" stroke="none" /></svg>;
    default: return null;
  }
}
