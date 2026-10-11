/* Era da Pedra — estúdio de ilustração vetorial: monstros com sombreamento e cenários por bioma. */
(function (root) {
  'use strict';
  const Art = { pack: null };

  /* ---------- cores ---------- */
  function hex(n) { return '#' + ((1 << 24) + n).toString(16).slice(1); }
  function parse(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = parse(a), B = parse(b); return hex((Math.round(A[0] + (B[0] - A[0]) * t) << 16) + (Math.round(A[1] + (B[1] - A[1]) * t) << 8) + Math.round(A[2] + (B[2] - A[2]) * t)); }
  const shade = (c, f) => (f < 0 ? mix(c, '#000000', -f) : mix(c, '#ffffff', f));
  Art.shade = shade; Art.mix = mix;
  let UID = 0;

  /* ---------- contexto de desenho (gradientes únicos por criatura) ---------- */
  function Ctx(P) {
    const id = 'a' + (++UID);
    const defs = []; let n = 0;
    const api = {
      P, defs,
      // gradiente radial "volume": luz no alto-esquerda
      vol(c, o) { o = o || {}; const g = `${id}v${++n}`; defs.push(`<radialGradient id="${g}" cx="${o.cx || 0.36}" cy="${o.cy || 0.3}" r="${o.r || 0.85}"><stop offset="0" stop-color="${shade(c, 0.38)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.5)}"/></radialGradient>`); return `url(#${g})`; },
      lin(c1, c2, vert) { const g = `${id}l${++n}`; defs.push(`<linearGradient id="${g}" x1="0" y1="0" x2="${vert ? 0 : 1}" y2="${vert ? 1 : 0}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`); return `url(#${g})`; },
      glow(c) { const g = `${id}g${++n}`; defs.push(`<radialGradient id="${g}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`); return `url(#${g})`; },
      id,
    };
    return api;
  }
  // gerador pseudo-aleatório determinístico (os desenhos não "tremem" entre telas)
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- peças reutilizáveis ---------- */
  const OUT = '#1b0f08';
  function eye(x, y, r, o) {
    o = o || {};
    const iris = o.iris || '#ffcf3a', pupil = o.slit ? `<ellipse cx="${x}" cy="${y}" rx="${r * 0.2}" ry="${r * 0.75}" fill="#050202"/>` : `<circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="#050202"/>`;
    return `<g>${o.glow ? `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="${o.glow}" opacity=".35"/>` : ''}<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * (o.slit ? 0.8 : 0.9)}" fill="${o.white || '#f4ead0'}" stroke="${OUT}" stroke-width="1.8"/>
      <circle cx="${x}" cy="${y}" r="${r * 0.68}" fill="${iris}"/>${pupil}<circle cx="${x - r * 0.28}" cy="${y - r * 0.3}" r="${r * 0.2}" fill="#fff" opacity=".9"/>
      ${o.lid ? `<path d="M${x - r * 1.15} ${y - r * 0.15} Q${x} ${y - r * 1.4} ${x + r * 1.15} ${y - r * 0.15} L${x + r * 1.15} ${y - r * 0.7} Q${x} ${y - r * 1.8} ${x - r * 1.15} ${y - r * 0.7} Z" fill="${o.lid}" stroke="${OUT}" stroke-width="1.6"/>` : ''}</g>`;
  }
  function furStrokes(cx, cy, rx, ry, count, color, seed, len) {
    const r = rng(seed); let d = '';
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d0 = Math.sqrt(r()), x = cx + Math.cos(a) * rx * d0, y = cy + Math.sin(a) * ry * d0, l = (len || 8) * (0.6 + r() * 0.8), ang = Math.atan2(y - cy, x - cx);
      d += `M${x.toFixed(1)} ${y.toFixed(1)} q${(Math.cos(ang) * l * 0.5).toFixed(1)} ${(Math.sin(ang) * l * 0.5 + 2).toFixed(1)} ${(Math.cos(ang) * l).toFixed(1)} ${(Math.sin(ang) * l).toFixed(1)}`;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  }
  function scalesPattern(cx, cy, rx, ry, color, seed, size) {
    const r = rng(seed); let d = '';
    for (let y = -ry; y < ry; y += size) for (let x = -rx; x < rx; x += size) {
      const px = x + ((Math.round(y / size) % 2) ? size / 2 : 0), nx = (px / rx), ny = (y / ry);
      if (nx * nx + ny * ny > 0.92) continue;
      d += `M${(cx + px - size * 0.4).toFixed(1)} ${(cy + y).toFixed(1)} q${(size * 0.4).toFixed(1)} ${(size * 0.55).toFixed(1)} ${(size * 0.8).toFixed(1)} 0`;
    }
    return `<path d="${d}" stroke="${color}" stroke-width="1.2" fill="none" opacity=".45"/>`;
  }
  const fang = (x, y, h, w, flip) => `<path d="M${x - w} ${y} L${x} ${y + h * (flip ? -1 : 1)} L${x + w} ${y} Z" fill="#f2ead2" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`;
  function teethRow(x0, x1, y, h, n, flip) { let s = ''; for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n; s += fang(x, y, h * (0.75 + 0.5 * ((i % 2) ? 1 : 0.6)), (x1 - x0) / n * 0.42, flip); } return s; }
  const shadowEl = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.12}" fill="#000" opacity=".4"/>`;

  /* ---------- ARQUÉTIPOS ---------- */
  // cada função desenha numa caixa 240×200, de frente, e devolve o SVG interno
  const DRAW = {};

  // --- mamíferos (cabeça parametrizável)
  DRAW.mammal = function (c, o) {
    const P = c.P, r = rng(o.seed), out = [];
    const body = c.vol(P.base), light = c.vol(P.light), dark = c.vol(P.dark);
    const cy = 100, sn = o.snout == null ? 0.5 : o.snout, hw = o.wide || 50;
    // juba / pelagem atrás da cabeça
    if (o.mane) { let m = ''; const n = 22; for (let i = 0; i < n; i++) { const a = Math.PI * (1.05 + 1.9 * i / n), x = 120 + Math.cos(a) * 62, y = cy + Math.sin(a) * 58; m += `L${(120 + Math.cos(a) * 92).toFixed(1)} ${(cy + Math.sin(a) * 86).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}`; } out.push(`<path d="M120 ${cy}${m} Z" fill="${c.vol(o.maneColor || P.dark)}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`); }
    // tronco / ombros
    out.push(`<path d="M30 200 Q36 150 80 138 Q120 150 160 138 Q204 150 210 200 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4"/>`);
    out.push(furStrokes(120, 175, 80, 24, 46, P.dark, o.seed + 1, 9));
    if (o.armor) out.push(`<path d="M52 176 Q62 150 96 146 L96 200 L40 200 Z M188 176 Q178 150 144 146 L144 200 L200 200 Z" fill="${c.vol('#6a6c72')}" stroke="${OUT}" stroke-width="2.2"/>`);
    // chifres / orelhas atrás
    const horn = (sx, col) => {
      const x0 = 120 + sx * 38, y0 = 70;
      const hc = c.vol(col || '#e9dfc4');
      switch (o.horns) {
        case 'bull': return `<path d="M${x0} ${y0 + 4} Q${120 + sx * 86} ${y0 - 6} ${120 + sx * 82} ${y0 - 46} Q${120 + sx * 70} ${y0 - 22} ${x0 - sx * 8} ${y0 - 10} Z" fill="${hc}" stroke="${OUT}" stroke-width="2.2"/>`;
        case 'goat': return `<path d="M${x0} ${y0 + 6} Q${120 + sx * 58} ${y0 - 36} ${120 + sx * 40} ${y0 - 64} Q${120 + sx * 76} ${y0 - 40} ${120 + sx * 70} ${y0 - 2} Z" fill="${hc}" stroke="${OUT}" stroke-width="2.2"/><path d="M${120 + sx * 46} ${y0 - 18} l${sx * 10} 3 M${120 + sx * 54} ${y0 - 34} l${sx * 9} 3" stroke="${OUT}" stroke-width="1.4"/>`;
        case 'antler': return `<path d="M${x0} ${y0 + 6} Q${120 + sx * 70} ${y0 - 10} ${120 + sx * 70} ${y0 - 60} M${120 + sx * 62} ${y0 - 18} L${120 + sx * 92} ${y0 - 34} M${120 + sx * 68} ${y0 - 42} L${120 + sx * 96} ${y0 - 64} M${120 + sx * 66} ${y0 - 56} L${120 + sx * 52} ${y0 - 80}" stroke="${OUT}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M${x0} ${y0 + 6} Q${120 + sx * 70} ${y0 - 10} ${120 + sx * 70} ${y0 - 60} M${120 + sx * 62} ${y0 - 18} L${120 + sx * 92} ${y0 - 34} M${120 + sx * 68} ${y0 - 42} L${120 + sx * 96} ${y0 - 64} M${120 + sx * 66} ${y0 - 56} L${120 + sx * 52} ${y0 - 80}" stroke="#cdbd96" stroke-width="5" fill="none" stroke-linecap="round"/>`;
        default: return '';
      }
    };
    if (o.horns && o.horns !== 'rhino' && o.horns !== 'none') out.push(horn(-1, o.hornColor) + horn(1, o.hornColor));
    // orelhas
    const ear = (sx) => {
      const x = 120 + sx * 44, e = o.ear || 'point';
      if (e === 'round') return `<circle cx="${x + sx * 6}" cy="64" r="17" fill="${body}" stroke="${OUT}" stroke-width="2.2"/><circle cx="${x + sx * 6}" cy="65" r="9" fill="${P.belly}" opacity=".7"/>`;
      if (e === 'flop') return `<path d="M${x - sx * 6} 66 Q${x + sx * 36} 62 ${x + sx * 30} 112 Q${x + sx * 8} 100 ${x - sx * 10} 90 Z" fill="${dark}" stroke="${OUT}" stroke-width="2.2"/>`;
      if (e === 'big') return `<path d="M${x - sx * 4} 78 Q${x + sx * 52} 40 ${x + sx * 46} 112 Q${x + sx * 20} 112 ${x - sx * 6} 96 Z" fill="${body}" stroke="${OUT}" stroke-width="2.2"/><path d="M${x + sx * 4} 84 Q${x + sx * 38} 62 ${x + sx * 34} 102 Q${x + sx * 18} 100 ${x + sx * 2} 94 Z" fill="${P.belly}" opacity=".6"/>`;
      if (e === 'none') return '';
      return `<path d="M${x - sx * 8} 78 L${x + sx * 4} 28 L${x + sx * 30} 72 Z" fill="${body}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/><path d="M${x - sx * 1} 70 L${x + sx * 5} 42 L${x + sx * 20} 68 Z" fill="${P.belly}" opacity=".55"/>`;
    };
    out.push(ear(-1) + ear(1));
    // cabeça
    out.push(`<ellipse cx="120" cy="${cy}" rx="${hw + 2}" ry="${46}" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(furStrokes(120, cy - 8, hw - 6, 36, 48, P.dark, o.seed + 2, 8));
    // listras / manchas
    if (o.stripes) { let d = ''; for (let i = 0; i < 4; i++) { const sx = 30 + i * 11, y = 62 + i * 3; d += `M${120 - sx} ${y} q10 10 6 24 M${120 + sx} ${y} q-10 10 -6 24`; } d += 'M120 56 v22 M110 58 q-4 10 0 18 M130 58 q4 10 0 18'; out.push(`<path d="${d}" stroke="${o.stripeColor || '#201208'}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`); }
    if (o.spots) { let d = ''; for (let i = 0; i < 9; i++) { d += `M${70 + r() * 100} ${64 + r() * 40} l.1 0`; } out.push(`<path d="${d}" stroke="${P.dark}" stroke-width="6" stroke-linecap="round" opacity=".7"/>`); }
    // focinho
    const mw = 22 + 16 * sn, mh = 17 + 14 * sn, my = cy + 24 + 3 * sn;
    const muz = o.ape ? '#5a4a42' : mix(P.base, P.belly, 0.55);
    if (o.ape) out.push(`<ellipse cx="120" cy="${cy + 6}" rx="38" ry="38" fill="${c.vol('#4a3c36')}" stroke="${OUT}" stroke-width="2.2"/>`);
    out.push(`<ellipse cx="120" cy="${my}" rx="${o.ape ? mw * 1.25 : mw}" ry="${o.ape ? mh * 0.85 : mh}" fill="${c.vol(o.ape ? '#5a4a42' : muz)}" stroke="${OUT}" stroke-width="2.2"/>`);
    // chifre de rinoceronte / tromba
    let rhino = '';
    if (o.horns === 'rhino') rhino = `<path d="M100 ${my - 6} Q106 ${my - 60} 138 ${my - 78} Q130 ${my - 40} 140 ${my - 6} Z" fill="${c.vol('#e0d4b4')}" stroke="${OUT}" stroke-width="2.4"/><path d="M110 ${my - 18} q8 -18 20 -32" stroke="${OUT}" stroke-width="1.4" fill="none" opacity=".7"/><path d="M104 ${my - 4} Q112 ${my - 26} 126 ${my - 30} Q122 ${my - 14} 128 ${my - 4} Z" fill="${c.vol('#cfc2a0')}" stroke="${OUT}" stroke-width="2"/>`;
    if (o.trunk) out.push(`<path d="M104 ${my - 8} Q96 ${my + 40} 120 ${my + 60} Q142 ${my + 44} 138 ${my - 8} Q130 ${my + 22} 120 ${my + 26} Q110 ${my + 20} 104 ${my - 8} Z" fill="${body}" stroke="${OUT}" stroke-width="2.4"/><path d="M108 ${my + 6} h22 M110 ${my + 18} h18 M114 ${my + 32} h12" stroke="${P.dark}" stroke-width="1.6" opacity=".7"/>`);
    else if (o.ape) out.push(`<path d="M104 ${my - 6} Q120 ${my - 16} 136 ${my - 6} L132 ${my + 8} Q120 ${my + 12} 108 ${my + 8} Z" fill="#2a1e1a" stroke="${OUT}" stroke-width="1.8"/><ellipse cx="113" cy="${my}" rx="3" ry="2.2" fill="#0a0504"/><ellipse cx="127" cy="${my}" rx="3" ry="2.2" fill="#0a0504"/>`);
    else out.push(`<path d="M${120 - 11} ${my - mh * 0.55} Q120 ${my - mh * 0.95} ${120 + 11} ${my - mh * 0.55} Q${120 + 8} ${my - mh * 0.1} 120 ${my} Q${120 - 8} ${my - mh * 0.1} ${120 - 11} ${my - mh * 0.55} Z" fill="${o.nose || '#2a1a1c'}" stroke="${OUT}" stroke-width="1.6"/><ellipse cx="116" cy="${my - mh * 0.62}" rx="2.4" ry="1.2" fill="#fff" opacity=".35"/>`);
    // boca
    const mouthY = my + mh * 0.55;
    if (o.snarl) out.push(`<path d="M${120 - mw * 0.95} ${mouthY - 6} Q120 ${mouthY + 34} ${120 + mw * 0.95} ${mouthY - 6} Q120 ${mouthY + 4} ${120 - mw * 0.95} ${mouthY - 6} Z" fill="#2a0a0e" stroke="${OUT}" stroke-width="2.4"/><path d="M${120 - mw * 0.55} ${mouthY + 12} Q120 ${mouthY + 30} ${120 + mw * 0.55} ${mouthY + 12} Q120 ${mouthY + 20} ${120 - mw * 0.55} ${mouthY + 12} Z" fill="#b84a5a"/>${teethRow(120 - mw * 0.9, 120 + mw * 0.9, mouthY - 4, 13, 7, false)}${teethRow(120 - mw * 0.55, 120 + mw * 0.55, mouthY + 21, 9, 5, true)}`);
    out.push(`<path d="M${120} ${my + 2} v${mh * 0.25} M${120 - mw * 0.7} ${mouthY - 2} Q${120 - mw * 0.35} ${mouthY + 7} 120 ${my + mh * 0.3} Q${120 + mw * 0.35} ${mouthY + 7} ${120 + mw * 0.7} ${mouthY - 2}" stroke="${OUT}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    if (o.fangs && !o.snarl) out.push(fang(120 - mw * 0.5, mouthY + 1, 15, 4.5) + fang(120 + mw * 0.5, mouthY + 1, 15, 4.5));
    if (o.tusks === 'boar') out.push(`<path d="M${120 - mw * 0.75} ${mouthY - 2} Q${120 - mw - 18} ${mouthY - 8} ${120 - mw - 16} ${mouthY - 40} Q${120 - mw - 4} ${mouthY - 18} ${120 - mw * 0.55} ${mouthY - 12} Z" fill="${c.vol('#efe5c9')}" stroke="${OUT}" stroke-width="2"/><path d="M${120 + mw * 0.75} ${mouthY - 2} Q${120 + mw + 18} ${mouthY - 8} ${120 + mw + 16} ${mouthY - 40} Q${120 + mw + 4} ${mouthY - 18} ${120 + mw * 0.55} ${mouthY - 12} Z" fill="${c.vol('#efe5c9')}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.tusks === 'saber') out.push(`<path d="M${120 - mw * 0.55} ${mouthY} L${120 - mw * 0.7} ${mouthY + 44} L${120 - mw * 0.35} ${mouthY + 2} Z" fill="#f4ecd4" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/><path d="M${120 + mw * 0.55} ${mouthY} L${120 + mw * 0.7} ${mouthY + 44} L${120 + mw * 0.35} ${mouthY + 2} Z" fill="#f4ecd4" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`);
    if (o.tusks === 'mammoth') out.push(`<path d="M${120 - mw * 0.9} ${my + 6} Q${120 - mw - 38} ${my + 38} ${120 - mw - 4} ${my + 86} Q${120 - mw - 22} ${my + 52} ${120 - mw * 0.6} ${my + 14} Z" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="2.2"/><path d="M${120 + mw * 0.9} ${my + 6} Q${120 + mw + 38} ${my + 38} ${120 + mw + 4} ${my + 86} Q${120 + mw + 22} ${my + 52} ${120 + mw * 0.6} ${my + 14} Z" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="2.2"/>`);
    // olhos
    const ey = cy - 12, ex = 26 + (o.eyeGap || 0);
    out.push(`<ellipse cx="${120 - ex}" cy="${ey + 1}" rx="15" ry="11" fill="#000" opacity=".28"/><ellipse cx="${120 + ex}" cy="${ey + 1}" rx="15" ry="11" fill="#000" opacity=".28"/>`);
    const er = o.ape ? 6.5 : 7;
    out.push(eye(120 - ex, ey, er, { iris: o.iris || '#e9b32a', lid: P.dark, glow: o.glow }) + eye(120 + ex, ey, er, { iris: o.iris || '#e9b32a', lid: P.dark, glow: o.glow }));
    out.push(`<path d="M${120 - ex - 15} ${ey - 18} L${120 - ex + 15} ${ey - 4} L${120 - ex + 13} ${ey - 9} L${120 - ex - 13} ${ey - 21} Z M${120 + ex + 15} ${ey - 18} L${120 + ex - 15} ${ey - 4} L${120 + ex - 13} ${ey - 9} L${120 + ex + 13} ${ey - 21} Z" fill="${o.ape ? '#2a1e1a' : OUT}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`);
    out.push(rhino);
    if (o.scar) out.push(`<path d="M${120 + ex - 8} ${ey - 20} l12 40" stroke="#6a1a14" stroke-width="3" stroke-linecap="round"/><path d="M${120 + ex - 12} ${ey - 4} l10 3 M${120 + ex - 6} ${ey + 10} l10 3" stroke="#e8d6c0" stroke-width="1.4"/>`);
    if (o.horns === 'none' || !o.horns) { /* sem chifres */ }
    return out.join('');
  };

  // --- répteis e dinossauros (frontal)
  DRAW.reptile = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base), cy = 104;
    const wide = o.wide || 54, sn = o.snout == null ? 0.6 : o.snout;
    // pescoço / tronco
    out.push(`<path d="M44 200 Q50 150 92 140 L148 140 Q190 150 196 200 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4"/>`);
    out.push(scalesPattern(120, 176, 66, 26, P.dark, o.seed, 9));
    out.push(`<path d="M82 200 Q120 170 158 200 Z" fill="${c.vol(P.belly)}" opacity=".85"/>`);
    // crista / leque atrás
    if (o.frill) { let m = ''; for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + 0.84 * i / 8); m += `L${(120 + Math.cos(a) * 92).toFixed(1)} ${(cy + 6 + Math.sin(a) * 78).toFixed(1)} L${(120 + Math.cos(a + 0.1) * 66).toFixed(1)} ${(cy + 6 + Math.sin(a + 0.1) * 54).toFixed(1)}`; } out.push(`<path d="M120 ${cy}${m} Z" fill="${c.vol(o.frillColor || P.accent)}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`); }
    if (o.spikes) { let sp = ''; for (let i = 0; i < 7; i++) { const x = 70 + i * 17; sp += `<path d="M${x - 6} 62 L${x} ${38 - (i % 2) * 8} L${x + 6} 62 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`; } out.push(sp); }
    // cabeça (crânio largo)
    out.push(`<path d="M${120 - wide} ${cy + 6} Q${120 - wide - 4} ${cy - 40} 120 ${cy - 46} Q${120 + wide + 4} ${cy - 40} ${120 + wide} ${cy + 6} Q${120 + wide - 6} ${cy + 40} 120 ${cy + 44} Q${120 - wide + 6} ${cy + 40} ${120 - wide} ${cy + 6} Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(scalesPattern(120, cy - 8, wide - 4, 34, P.dark, o.seed + 3, 8));
    // focinho
    const mw = 28 + 14 * sn, my = cy + 20;
    out.push(`<path d="M${120 - mw} ${my - 6} Q120 ${my - 26 - 6 * sn} ${120 + mw} ${my - 6} L${120 + mw - 4} ${my + 20} Q120 ${my + 28} ${120 - mw + 4} ${my + 20} Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2.4"/>`);
    out.push(`<ellipse cx="${120 - 11}" cy="${my - 8}" rx="3.6" ry="2.4" fill="${OUT}"/><ellipse cx="${120 + 11}" cy="${my - 8}" rx="3.6" ry="2.4" fill="${OUT}"/>`);
    // mandíbula e dentes
    out.push(`<path d="M${120 - mw - 2} ${my + 14} Q120 ${my + 56 + 4 * sn} ${120 + mw + 2} ${my + 14} Q120 ${my + 30} ${120 - mw - 2} ${my + 14} Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2.4"/>`);
    out.push(`<path d="M${120 - mw + 6} ${my + 24} Q120 ${my + 44} ${120 + mw - 6} ${my + 24}" fill="#b7424a" opacity=".7"/>`);
    out.push(teethRow(120 - mw + 4, 120 + mw - 4, my + 17, o.teeth || 12, 8, false) + teethRow(120 - mw + 10, 120 + mw - 10, my + 40, (o.teeth || 12) * 0.8, 6, true));
    // chifres de testa
    if (o.horns === 'trike') out.push(`<path d="M${120 - wide + 6} ${cy - 18} Q${120 - wide - 22} ${cy - 66} ${120 - wide + 20} ${cy - 76} Q${120 - wide + 12} ${cy - 46} ${120 - wide + 22} ${cy - 24} Z" fill="${c.vol('#eadfc2')}" stroke="${OUT}" stroke-width="2"/><path d="M${120 + wide - 6} ${cy - 18} Q${120 + wide + 22} ${cy - 66} ${120 + wide - 20} ${cy - 76} Q${120 + wide - 12} ${cy - 46} ${120 + wide - 22} ${cy - 24} Z" fill="${c.vol('#eadfc2')}" stroke="${OUT}" stroke-width="2"/><path d="M110 ${my - 18} Q120 ${my - 70} 130 ${my - 18} Z" fill="${c.vol('#eadfc2')}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.horns === 'devil') out.push(`<path d="M${120 - 34} ${cy - 34} Q${120 - 56} ${cy - 66} ${120 - 36} ${cy - 84} Q${120 - 40} ${cy - 56} ${120 - 22} ${cy - 40} Z M${120 + 34} ${cy - 34} Q${120 + 56} ${cy - 66} ${120 + 36} ${cy - 84} Q${120 + 40} ${cy - 56} ${120 + 22} ${cy - 40} Z" fill="${c.vol('#2b2420')}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.croc) out.push(`<circle cx="${120 - 40}" cy="${cy - 30}" r="14" fill="${body}" stroke="${OUT}" stroke-width="2.4"/><circle cx="${120 + 40}" cy="${cy - 30}" r="14" fill="${body}" stroke="${OUT}" stroke-width="2.4"/>`);
    if (o.rex) out.push(`<path d="M${120 - wide + 4} ${cy - 22} Q${120 - 30} ${cy - 40} ${120 - 10} ${cy - 22} L${120 - 18} ${cy - 14} Q${120 - 30} ${cy - 24} ${120 - wide + 12} ${cy - 10} Z M${120 + wide - 4} ${cy - 22} Q${120 + 30} ${cy - 40} ${120 + 10} ${cy - 22} L${120 + 18} ${cy - 14} Q${120 + 30} ${cy - 24} ${120 + wide - 12} ${cy - 10} Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.2"/><path d="M${120 - 30} ${cy + 22} l6 -10 M${120 + 30} ${cy + 22} l-6 -10" stroke="${OUT}" stroke-width="2" opacity=".6"/>`);
    // olhos
    const ex = o.eyeX || 34, ey = cy - (o.croc ? 30 : 12);
    out.push(`<ellipse cx="${120 - ex}" cy="${ey + 1}" rx="15" ry="11" fill="#000" opacity=".28"/><ellipse cx="${120 + ex}" cy="${ey + 1}" rx="15" ry="11" fill="#000" opacity=".28"/>`);
    out.push(eye(120 - ex, ey, 8, { slit: true, iris: o.iris || '#e8c52a', lid: P.dark, glow: o.glow }) + eye(120 + ex, ey, 8, { slit: true, iris: o.iris || '#e8c52a', lid: P.dark, glow: o.glow }));
    out.push(`<path d="M${120 - ex - 15} ${ey - 15} L${120 - ex + 15} ${ey - 3} L${120 - ex + 13} ${ey - 8} L${120 - ex - 13} ${ey - 18} Z M${120 + ex + 15} ${ey - 15} L${120 + ex - 15} ${ey - 3} L${120 + ex - 13} ${ey - 8} L${120 + ex + 13} ${ey - 18} Z" fill="${OUT}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`);
    return out.join('');
  };

  // --- serpente
  DRAW.snake = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base), belly = c.vol(P.belly);
    // corpo enrolado (anéis)
    const coil1 = 'M36 188 Q14 164 56 158 Q112 154 122 172 Q126 186 76 186', coil2 = 'M204 186 Q226 158 176 152 Q128 152 122 170 Q118 184 170 184';
    out.push(`<path d="${coil1}" fill="none" stroke="${OUT}" stroke-width="38" stroke-linecap="round"/><path d="${coil2}" fill="none" stroke="${OUT}" stroke-width="38" stroke-linecap="round"/>`);
    out.push(`<path d="${coil1}" fill="none" stroke="${P.base}" stroke-width="33" stroke-linecap="round"/><path d="${coil2}" fill="none" stroke="${P.base}" stroke-width="33" stroke-linecap="round"/>`);
    out.push(`<path d="${coil1}" fill="none" stroke="${P.light}" stroke-width="8" stroke-linecap="round" opacity=".35" transform="translate(0 -9)"/><path d="${coil2}" fill="none" stroke="${P.light}" stroke-width="8" stroke-linecap="round" opacity=".35" transform="translate(0 -9)"/>`);
    out.push(`<path d="${coil1}" fill="none" stroke="${P.dark}" stroke-width="3" stroke-dasharray="3 11" stroke-linecap="round" opacity=".7" transform="translate(0 4)"/>`);
    // pescoço em S
    out.push(`<path d="M120 170 Q60 150 100 110 Q130 84 120 62" fill="none" stroke="${OUT}" stroke-width="40" stroke-linecap="round"/><path d="M120 170 Q60 150 100 110 Q130 84 120 62" fill="none" stroke="${P.base}" stroke-width="35" stroke-linecap="round"/>`);
    out.push(`<path d="M120 170 Q60 150 100 110 Q130 84 120 62" fill="none" stroke="${P.belly}" stroke-width="14" stroke-linecap="round" stroke-dasharray="2 7" opacity=".8"/>`);
    // padrão de losangos
    let pat = ''; for (let i = 0; i < 6; i++) { const t = i / 5, x = 112 + Math.sin(t * 5) * 10 - 18 * (1 - t), y = 150 - t * 84; pat += `<path d="M${x} ${y - 7} l7 7 l-7 7 l-7 -7 Z" fill="${P.accent}" opacity=".8" stroke="${OUT}" stroke-width="1"/>`; }
    out.push(pat);
    // capuz
    if (o.hood) out.push(`<path d="M120 62 Q70 38 76 82 Q90 104 120 112 Q150 104 164 82 Q170 38 120 62 Z" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.4"/><path d="M104 86 Q120 74 136 86 Q130 104 120 108 Q110 104 104 86 Z" fill="${P.accent}" opacity=".6"/>`);
    // cabeça
    out.push(`<path d="M120 24 Q154 30 156 64 Q150 90 120 94 Q90 90 84 64 Q86 30 120 24 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(scalesPattern(120, 56, 30, 28, P.dark, o.seed, 8));
    out.push(`<path d="M96 84 Q120 108 144 84 Q120 96 96 84 Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2"/>${fang(104, 86, 16, 4) + fang(136, 86, 16, 4)}`);
    out.push(`<path d="M120 94 v14 l-7 9 M120 108 l7 9" stroke="#c8283a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    out.push(eye(103, 54, 7.5, { slit: true, iris: o.iris || '#f0d02a', lid: P.dark, glow: o.glow }) + eye(137, 54, 7.5, { slit: true, iris: o.iris || '#f0d02a', lid: P.dark, glow: o.glow }));
    out.push(`<path d="M90 44 L112 50 M150 44 L128 50" stroke="${OUT}" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="114" cy="72" rx="2" ry="1.4" fill="${OUT}"/><ellipse cx="126" cy="72" rx="2" ry="1.4" fill="${OUT}"/>`);
    if (o.rattle) out.push(`<g transform="translate(214 176)"><ellipse rx="9" ry="7" fill="${P.light}" stroke="${OUT}" stroke-width="2"/><ellipse cx="9" cy="-8" rx="8" ry="6" fill="${P.belly}" stroke="${OUT}" stroke-width="2"/></g>`);
    return out.join('');
  };

  // --- morcego
  DRAW.bat = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base), wing = c.lin(shade(P.base, 0.1), shade(P.dark, -0.2), true);
    const w = (sx) => `<path d="M${120 + sx * 18} 100 Q${120 + sx * 70} 40 ${120 + sx * 112} 62 Q${120 + sx * 92} 80 ${120 + sx * 100} 112 Q${120 + sx * 82} 104 ${120 + sx * 76} 128 Q${120 + sx * 62} 112 ${120 + sx * 52} 138 Q${120 + sx * 40} 120 ${120 + sx * 30} 140 Z" fill="${wing}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M${120 + sx * 20} 102 L${120 + sx * 110} 62 M${120 + sx * 24} 104 L${120 + sx * 98} 112 M${120 + sx * 24} 106 L${120 + sx * 74} 128 M${120 + sx * 24} 108 L${120 + sx * 50} 138" stroke="${OUT}" stroke-width="2.6" fill="none"/>`;
    out.push(w(-1) + w(1));
    out.push(`<ellipse cx="120" cy="124" rx="30" ry="40" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>${furStrokes(120, 126, 24, 32, 30, P.dark, o.seed, 7)}`);
    // orelhas grandes
    out.push(`<path d="M92 66 L84 14 L112 50 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M148 66 L156 14 L128 50 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M94 58 L89 28 L106 52 Z" fill="${P.accent}" opacity=".6"/><path d="M146 58 L151 28 L134 52 Z" fill="${P.accent}" opacity=".6"/>`);
    out.push(`<ellipse cx="120" cy="82" rx="30" ry="28" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(`<path d="M104 96 Q120 86 136 96 Q132 112 120 114 Q108 112 104 96 Z" fill="${c.vol(P.belly)}" stroke="${OUT}" stroke-width="2"/><path d="M114 94 l-3 -7 l9 3 l9 -3 l-3 7 Z" fill="${OUT}"/>`);
    out.push(`<path d="M108 106 Q120 118 132 106 Q120 112 108 106 Z" fill="#3a0f12"/>${fang(111, 107, 12, 3.4) + fang(129, 107, 12, 3.4)}`);
    out.push(eye(106, 78, 6.5, { iris: o.iris || '#e8402a', glow: '#ff3a2a', lid: P.dark }) + eye(134, 78, 6.5, { iris: o.iris || '#e8402a', glow: '#ff3a2a', lid: P.dark }));
    out.push(`<path d="M94 68 L114 74 M146 68 L126 74" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>`);
    return out.join('');
  };

  // --- aves (águia, gavião, pterodáctilo)
  DRAW.bird = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base), feather = c.lin(P.base, P.dark, true);
    const wing = (sx) => { let f = ''; for (let i = 0; i < 6; i++) { const a = 0.06 + i * 0.1; f += `<path d="M${120 + sx * 34} ${108 - i * 4} Q${120 + sx * (90 + i * 4)} ${48 + i * 8} ${120 + sx * (120 - i * 3)} ${74 + i * 14} Q${120 + sx * 84} ${96 + i * 10} ${120 + sx * 38} ${126 - i * 3} Z" fill="${i % 2 ? feather : c.vol(P.base)}" stroke="${OUT}" stroke-width="2" opacity="${1 - i * 0.04}"/>`; } return f; };
    if (o.ptero) out.push(`<path d="M120 100 L16 44 Q40 90 28 120 Q60 112 74 140 L120 124 Z" fill="${c.lin(shade(P.base, 0.05), shade(P.dark, -0.1), true)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M120 100 L224 44 Q200 90 212 120 Q180 112 166 140 L120 124 Z" fill="${c.lin(shade(P.base, 0.05), shade(P.dark, -0.1), true)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M118 100 L18 46 M122 100 L222 46 M118 108 L30 122 M122 108 L210 122" stroke="${OUT}" stroke-width="2.2"/>`);
    else out.push(wing(-1) + wing(1));
    out.push(`<path d="M86 120 Q84 84 120 74 Q156 84 154 120 Q150 170 120 180 Q90 170 86 120 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>${furStrokes(120, 140, 28, 34, 36, P.dark, o.seed, 8)}`);
    out.push(`<path d="M100 140 Q120 120 140 140 Q134 172 120 176 Q106 172 100 140 Z" fill="${c.vol(P.belly)}" opacity=".85"/>`);
    if (o.ptero) out.push(`<path d="M104 70 Q120 6 150 24 Q136 38 134 70 Z" fill="${c.vol(P.accent)}" stroke="${OUT}" stroke-width="2.2"/>`);
    out.push(`<ellipse cx="120" cy="66" rx="30" ry="28" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>${furStrokes(120, 62, 24, 20, 22, P.dark, o.seed + 4, 6)}`);
    if (o.ptero) out.push(`<path d="M104 70 L96 100 Q120 128 144 100 L136 70 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2.4"/>`);
    const beak = o.beak || '#e6b030';
    out.push(`<path d="M102 70 Q120 58 138 70 Q136 92 120 112 Q104 92 102 70 Z" fill="${c.vol(beak)}" stroke="${OUT}" stroke-width="2.4"/><path d="M110 86 Q120 94 130 86" stroke="${OUT}" stroke-width="2" fill="none"/><ellipse cx="114" cy="78" rx="2" ry="3" fill="${OUT}"/><ellipse cx="126" cy="78" rx="2" ry="3" fill="${OUT}"/>`);
    out.push(eye(100, 58, 7, { iris: o.iris || '#f4c21c', lid: P.dark }) + eye(140, 58, 7, { iris: o.iris || '#f4c21c', lid: P.dark }));
    out.push(`<path d="M86 50 L108 60 M154 50 L132 60" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>`);
    return out.join('');
  };

  // --- peixe / enguia / tubarão
  DRAW.fish = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    if (o.shark) {
      out.push(`<path d="M120 20 L96 78 L144 78 Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>`);
      out.push(`<path d="M24 150 Q40 80 120 70 Q200 80 216 150 Q200 188 120 190 Q40 188 24 150 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
      out.push(`<path d="M44 150 Q120 130 196 150 Q180 186 120 188 Q60 186 44 150 Z" fill="${c.vol(P.belly)}"/>`);
      out.push(`<path d="M48 148 Q120 166 192 148 Q120 200 48 148 Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2.4"/>${teethRow(56, 184, 150, 16, 11, false)}${teethRow(66, 174, 166, 12, 8, true)}`);
      out.push(`<path d="M30 118 L8 96 L40 100 Z M210 118 L232 96 L200 100 Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2"/>`);
      out.push(`<path d="M52 108 l6 12 M62 106 l6 12 M72 104 l6 12 M168 104 l-6 12 M178 106 l-6 12 M188 108 l-6 12" stroke="${OUT}" stroke-width="1.8" opacity=".6"/>`);
      out.push(eye(70, 112, 7, { iris: '#111', white: '#d8d8d8', lid: P.dark }) + eye(170, 112, 7, { iris: '#111', white: '#d8d8d8', lid: P.dark }));
      return out.join('');
    }
    if (o.eel) {
      out.push(`<path d="M20 170 Q40 120 80 150 Q120 184 150 130 Q180 84 210 120" fill="none" stroke="${OUT}" stroke-width="44" stroke-linecap="round"/><path d="M20 170 Q40 120 80 150 Q120 184 150 130 Q180 84 210 120" fill="none" stroke="${P.base}" stroke-width="39" stroke-linecap="round"/>`);
      out.push(`<path d="M20 170 Q40 120 80 150 Q120 184 150 130 Q180 84 210 120" fill="none" stroke="${P.light}" stroke-width="12" stroke-linecap="round" opacity=".4" transform="translate(0 -10)"/>`);
      out.push(`<path d="M20 170 Q40 120 80 150 Q120 184 150 130 Q180 84 210 120" fill="none" stroke="${P.accent}" stroke-width="5" stroke-dasharray="3 10" stroke-linecap="round" opacity=".85" transform="translate(0 6)"/>`);
      if (o.spark) out.push(`<path d="M44 112 l10 -14 l-4 12 l12 -8 M180 70 l-10 -14 l4 12 l-12 -8" stroke="#8ae0ff" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      out.push(`<path d="M120 22 Q168 22 168 62 Q160 96 120 100 Q80 96 72 62 Q72 22 120 22 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
      out.push(scalesPattern(120, 56, 34, 30, P.dark, o.seed, 9));
      out.push(`<path d="M88 76 Q120 112 152 76 Q120 92 88 76 Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2.2"/>${teethRow(92, 148, 78, 13, 8, false)}${teethRow(100, 140, 92, 9, 6, true)}`);
      out.push(eye(98, 52, 8, { iris: o.iris || '#e8d22a', lid: P.dark, glow: o.spark ? '#6ad8ff' : null }) + eye(142, 52, 8, { iris: o.iris || '#e8d22a', lid: P.dark, glow: o.spark ? '#6ad8ff' : null }));
      return out.join('');
    }
    return DRAW.mammal(c, { seed: o.seed });
  };

  // --- sapo
  DRAW.frog = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    out.push(`<path d="M24 190 Q20 120 120 110 Q220 120 216 190 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    let warts = ''; const r = rng(o.seed); for (let i = 0; i < 16; i++) warts += `<circle cx="${50 + r() * 140}" cy="${130 + r() * 54}" r="${2 + r() * 3.5}" fill="${P.accent}" opacity=".75" stroke="${OUT}" stroke-width=".8"/>`;
    out.push(warts);
    out.push(`<ellipse cx="120" cy="150" rx="68" ry="40" fill="${c.vol(P.belly)}" opacity=".5"/>`);
    out.push(`<path d="M42 118 Q120 52 198 118 Q198 168 120 172 Q42 168 42 118 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(`<path d="M52 132 Q120 168 188 132" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/><path d="M58 138 Q120 176 182 138 Q120 190 58 138 Z" fill="#8a2a30" opacity=".5"/>`);
    out.push(`<circle cx="76" cy="84" r="24" fill="${body}" stroke="${OUT}" stroke-width="2.6"/><circle cx="164" cy="84" r="24" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(eye(76, 82, 14, { slit: false, iris: o.iris || '#f0b32a', lid: P.dark }) + eye(164, 82, 14, { slit: false, iris: o.iris || '#f0b32a', lid: P.dark }));
    out.push(`<path d="M56 66 Q76 56 96 66 M144 66 Q164 56 184 66" stroke="${OUT}" stroke-width="3" fill="none"/><ellipse cx="108" cy="116" rx="2.6" ry="1.8" fill="${OUT}"/><ellipse cx="132" cy="116" rx="2.6" ry="1.8" fill="${OUT}"/>`);
    if (o.poison) out.push(`<path d="M60 108 q-2 12 2 16 M180 104 q2 12 -2 16" stroke="#7aff4a" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/>`);
    return out.join('');
  };

  // --- aranha
  DRAW.spider = function (c, o) {
    const P = c.P, out = [];
    const leg = (sx, i) => { const y0 = 100 + i * 14, k = 1 + i * 0.06; return `<path d="M${120 + sx * 26} ${y0} Q${120 + sx * 70 * k} ${y0 - 64} ${120 + sx * 100 * k} ${y0 - 18 + i * 4} Q${120 + sx * 112 * k} ${y0 + 20} ${120 + sx * 104 * k} ${150 + i * 12}" fill="none" stroke="${OUT}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M${120 + sx * 26} ${y0} Q${120 + sx * 70 * k} ${y0 - 64} ${120 + sx * 100 * k} ${y0 - 18 + i * 4} Q${120 + sx * 112 * k} ${y0 + 20} ${120 + sx * 104 * k} ${150 + i * 12}" fill="none" stroke="${P.base}" stroke-width="5" stroke-linecap="round"/>`; };
    for (let i = 0; i < 4; i++) out.push(leg(-1, i) + leg(1, i));
    out.push(`<ellipse cx="120" cy="150" rx="42" ry="40" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.6"/>`);
    if (o.mark) out.push(`<path d="M120 126 l12 16 l-12 20 l-12 -20 Z" fill="${P.accent}" stroke="${OUT}" stroke-width="1.6"/>`);
    out.push(`<ellipse cx="120" cy="92" rx="38" ry="32" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.6"/>${furStrokes(120, 92, 30, 24, 30, P.dark, o.seed, 6)}`);
    out.push(`<path d="M96 108 Q86 134 100 134 Q104 120 108 112 Z M144 108 Q154 134 140 134 Q136 120 132 112 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2"/>${fang(98, 130, 14, 3) + fang(142, 130, 14, 3)}`);
    const eyes = [[104, 82, 6.5], [136, 82, 6.5], [92, 92, 4.5], [148, 92, 4.5], [112, 70, 4], [128, 70, 4]];
    out.push(eyes.map(([x, y, r]) => eye(x, y, r, { iris: o.iris || '#ff3a2a', glow: '#ff2a1a', slit: false })).join(''));
    return out.join('');
  };

  // --- escorpião
  DRAW.scorpion = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    out.push(`<path d="M120 176 Q214 170 210 96 Q206 44 160 30 Q150 24 156 14" fill="none" stroke="${OUT}" stroke-width="30" stroke-linecap="round"/><path d="M120 176 Q214 170 210 96 Q206 44 160 30 Q150 24 156 14" fill="none" stroke="${P.base}" stroke-width="25" stroke-linecap="round"/>`);
    out.push(`<path d="M120 176 Q214 170 210 96 Q206 44 160 30" fill="none" stroke="${P.dark}" stroke-width="3" stroke-dasharray="6 9"/>`);
    out.push(`<path d="M156 14 Q176 10 170 34 L156 26 Z" fill="${c.vol(P.accent)}" stroke="${OUT}" stroke-width="2.2"/><circle cx="158" cy="22" r="10" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.2"/>`);
    const claw = (sx) => `<path d="M${120 + sx * 30} 120 Q${120 + sx * 80} 130 ${120 + sx * 84} 92" fill="none" stroke="${OUT}" stroke-width="17" stroke-linecap="round"/><path d="M${120 + sx * 30} 120 Q${120 + sx * 80} 130 ${120 + sx * 84} 92" fill="none" stroke="${P.base}" stroke-width="12" stroke-linecap="round"/><path d="M${120 + sx * 70} 94 Q${120 + sx * 110} 50 ${120 + sx * 76} 52 Q${120 + sx * 82} 68 ${120 + sx * 94} 74 Z" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.4"/><path d="M${120 + sx * 84} 96 Q${120 + sx * 116} 84 ${120 + sx * 98} 106 Q${120 + sx * 92} 108 ${120 + sx * 84} 104 Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.2"/>`;
    out.push(claw(-1) + claw(1));
    let legs = ''; for (let i = 0; i < 4; i++) { const y = 138 + i * 10; legs += `<path d="M96 ${y} Q56 ${y + 14} 40 ${y + 30} M144 ${y} Q184 ${y + 14} 200 ${y + 30}" stroke="${OUT}" stroke-width="6" fill="none" stroke-linecap="round"/>`; }
    out.push(legs);
    out.push(`<ellipse cx="120" cy="146" rx="40" ry="38" fill="${body}" stroke="${OUT}" stroke-width="2.6"/><path d="M84 132 Q120 124 156 132 M82 148 Q120 140 158 148 M86 164 Q120 156 154 164" stroke="${OUT}" stroke-width="2" fill="none" opacity=".7"/>`);
    out.push(`<ellipse cx="120" cy="112" rx="28" ry="22" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2.4"/>${eye(108, 108, 5, { iris: '#ff3a2a', glow: '#ff2a1a' }) + eye(132, 108, 5, { iris: '#ff3a2a', glow: '#ff2a1a' })}<path d="M104 124 q16 14 32 0" stroke="${OUT}" stroke-width="2.4" fill="none"/>`);
    return out.join('');
  };

  // --- caranguejo
  DRAW.crab = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    let legs = ''; for (let i = 0; i < 4; i++) { const y = 140 + i * 10; legs += `<path d="M84 ${y} Q40 ${y - 6} 28 ${y + 34} M156 ${y} Q200 ${y - 6} 212 ${y + 34}" stroke="${OUT}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M84 ${y} Q40 ${y - 6} 28 ${y + 34} M156 ${y} Q200 ${y - 6} 212 ${y + 34}" stroke="${P.base}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`; }
    out.push(legs);
    const claw = (sx) => `<path d="M${120 + sx * 40} 124 Q${120 + sx * 84} 118 ${120 + sx * 82} 80" fill="none" stroke="${OUT}" stroke-width="20" stroke-linecap="round"/><path d="M${120 + sx * 40} 124 Q${120 + sx * 84} 118 ${120 + sx * 82} 80" fill="none" stroke="${P.base}" stroke-width="15" stroke-linecap="round"/><path d="M${120 + sx * 60} 90 Q${120 + sx * 112} 24 ${120 + sx * 92} 20 Q${120 + sx * 70} 22 ${120 + sx * 66} 62 Z" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.6"/><path d="M${120 + sx * 70} 92 Q${120 + sx * 116} 76 ${120 + sx * 100} 52 Q${120 + sx * 92} 68 ${120 + sx * 72} 70 Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.6"/>${teethRow(0, 0, 0, 0, 0)}`;
    out.push(claw(-1) + claw(1));
    out.push(`<path d="M44 150 Q44 100 120 96 Q196 100 196 150 Q190 182 120 184 Q50 182 44 150 Z" fill="${body}" stroke="${OUT}" stroke-width="2.8"/>${scalesPattern(120, 144, 62, 34, P.dark, o.seed, 9)}`);
    out.push(`<path d="M66 134 Q120 110 174 134" stroke="${P.light}" stroke-width="3" fill="none" opacity=".6"/>`);
    out.push(`<path d="M100 98 L98 70 M140 98 L142 70" stroke="${OUT}" stroke-width="6" stroke-linecap="round"/><path d="M100 98 L98 70 M140 98 L142 70" stroke="${P.base}" stroke-width="2.6" stroke-linecap="round"/>`);
    out.push(eye(98, 66, 8, { iris: '#111', white: '#f0e4c8' }) + eye(142, 66, 8, { iris: '#111', white: '#f0e4c8' }));
    out.push(`<path d="M96 130 Q120 150 144 130 Q120 140 96 130 Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2"/>${teethRow(100, 140, 131, 7, 6, false)}`);
    return out.join('');
  };

  // --- polvo / kraken
  DRAW.octopus = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    const ten = (x, ang, len, k) => `<path d="M${x} 130 Q${x + ang * 0.6} ${130 + len * 0.5} ${x + ang} ${130 + len * 0.7} Q${x + ang * 1.4} ${130 + len} ${x + ang * 0.6 + k} ${150 + len}" fill="none" stroke="${OUT}" stroke-width="17" stroke-linecap="round"/><path d="M${x} 130 Q${x + ang * 0.6} ${130 + len * 0.5} ${x + ang} ${130 + len * 0.7} Q${x + ang * 1.4} ${130 + len} ${x + ang * 0.6 + k} ${150 + len}" fill="none" stroke="${P.base}" stroke-width="12" stroke-linecap="round"/><path d="M${x} 130 Q${x + ang * 0.6} ${130 + len * 0.5} ${x + ang} ${130 + len * 0.7}" fill="none" stroke="${P.accent}" stroke-width="3.5" stroke-dasharray="1 7" stroke-linecap="round"/>`;
    out.push(ten(52, -34, 36, -10) + ten(80, -22, 44, -8) + ten(160, 22, 44, 8) + ten(188, 34, 36, 10) + ten(106, -8, 48, 6) + ten(134, 8, 48, -6));
    out.push(`<path d="M48 120 Q42 22 120 18 Q198 22 192 120 Q186 150 120 154 Q54 150 48 120 Z" fill="${body}" stroke="${OUT}" stroke-width="2.8"/>`);
    let sp = ''; const r = rng(o.seed); for (let i = 0; i < 18; i++) sp += `<circle cx="${70 + r() * 100}" cy="${34 + r() * 60}" r="${2 + r() * 4}" fill="${P.accent}" opacity=".7"/>`;
    out.push(sp);
    out.push(`<path d="M70 50 Q96 26 126 30" stroke="${P.light}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/>`);
    out.push(eye(92, 108, 12, { iris: o.iris || '#f2c92a', slit: true, lid: P.dark, glow: o.glow }) + eye(148, 108, 12, { iris: o.iris || '#f2c92a', slit: true, lid: P.dark, glow: o.glow }));
    out.push(`<path d="M72 92 L108 104 M168 92 L132 104" stroke="${OUT}" stroke-width="4.5" stroke-linecap="round"/><path d="M106 132 Q120 146 134 132" stroke="${OUT}" stroke-width="2.6" fill="none"/>`);
    return out.join('');
  };

  // --- golem / troll de pedra
  DRAW.golem = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    out.push(`<path d="M16 200 L24 140 Q40 118 70 124 L170 124 Q200 118 216 140 L224 200 Z" fill="${body}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>`);
    out.push(`<path d="M40 150 l24 -10 l16 18 M180 146 l-22 -8 l-14 22 M96 176 l20 -14 l28 10" stroke="${OUT}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    const shoulder = (sx) => `<path d="M${120 + sx * 56} 138 L${120 + sx * 100} 118 L${120 + sx * 104} 170 L${120 + sx * 62} 176 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M${120 + sx * 70} 132 l${sx * 14} 24 M${120 + sx * 88} 126 l${sx * -6} 30" stroke="${OUT}" stroke-width="1.8"/>`;
    out.push(shoulder(-1) + shoulder(1));
    out.push(`<path d="M76 98 L84 54 L120 38 L156 54 L164 98 L150 132 L90 132 Z" fill="${c.vol(P.base)}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>`);
    out.push(`<path d="M90 60 L120 48 M96 80 l16 -8 M146 70 l-14 14 M104 120 l20 -12" stroke="${P.dark}" stroke-width="2.4" fill="none" opacity=".8"/>`);
    if (o.moss) out.push(`<path d="M80 60 Q98 46 118 56 Q104 64 90 70 Z M140 124 Q154 114 162 98 Q164 116 150 130 Z" fill="#5f8a3c" opacity=".8"/>`);
    if (o.horns) out.push(`<path d="M80 62 Q56 40 64 18 Q76 38 92 52 Z M160 62 Q184 40 176 18 Q164 38 148 52 Z" fill="${c.vol('#d8ccb0')}" stroke="${OUT}" stroke-width="2.2"/>`);
    out.push(`<path d="M92 76 L112 82 L112 92 L92 86 Z M148 76 L128 82 L128 92 L148 86 Z" fill="${o.glow || '#ffb22a'}" stroke="${OUT}" stroke-width="1.8"/><circle cx="102" cy="85" r="14" fill="${c.glow(o.glow || '#ffb22a')}" opacity=".6"/><circle cx="138" cy="85" r="14" fill="${c.glow(o.glow || '#ffb22a')}" opacity=".6"/>`);
    out.push(`<path d="M100 114 L108 106 L116 114 L124 106 L132 114 L140 108 L140 120 L100 120 Z" fill="#1a0e08" stroke="${OUT}" stroke-width="2"/>`);
    return out.join('');
  };

  // --- humanoide (caçador, xamã, guerreiros)
  DRAW.human = function (c, o) {
    const P = c.P, out = [], skin = c.vol(o.skin || '#a56f4a');
    out.push(`<path d="M30 200 Q36 148 84 138 L156 138 Q204 148 210 200 Z" fill="${c.vol(o.cloth || P.base)}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(`<path d="M90 138 L120 170 L150 138 Q120 150 90 138 Z" fill="${skin}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.armor) out.push(`<path d="M44 190 Q52 152 90 146 L90 200 Z M196 190 Q188 152 150 146 L150 200 Z" fill="${c.vol('#7d8088')}" stroke="${OUT}" stroke-width="2.4"/><circle cx="62" cy="158" r="12" fill="${c.vol('#9aa0a8')}" stroke="${OUT}" stroke-width="2"/><circle cx="178" cy="158" r="12" fill="${c.vol('#9aa0a8')}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.fur) out.push(`<path d="M34 196 Q40 150 86 142 Q100 160 120 158 Q140 160 154 142 Q200 150 206 196 Z" fill="${c.vol('#8a6a44')}" stroke="${OUT}" stroke-width="2.4"/>${furStrokes(120, 168, 80, 22, 40, '#3a2812', o.seed, 9)}`);
    out.push(`<path d="M120 42 Q164 44 164 92 Q160 128 120 136 Q80 128 76 92 Q76 44 120 42 Z" fill="${skin}" stroke="${OUT}" stroke-width="2.6"/>`);
    if (o.mask) out.push(`<path d="M78 80 Q120 60 162 80 L158 118 Q120 138 82 118 Z" fill="${c.vol(o.maskColor || '#e8dfc8')}" stroke="${OUT}" stroke-width="2.6"/><path d="M92 92 L110 96 L106 108 L90 104 Z M148 92 L130 96 L134 108 L150 104 Z" fill="#150b06"/><path d="M104 122 h32 M110 118 v10 M120 118 v10 M130 118 v10" stroke="#150b06" stroke-width="2.4"/><path d="M120 94 v18" stroke="${OUT}" stroke-width="2"/>`);
    else { out.push(eye(100, 86, 6.5, { iris: o.iris || '#d9a03a', lid: P.dark }) + eye(140, 86, 6.5, { iris: o.iris || '#d9a03a', lid: P.dark })); out.push(`<path d="M88 76 L110 82 M152 76 L130 82 M120 90 l-4 14 l8 0 M104 118 Q120 126 136 118" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>`); }
    out.push(`<path d="M74 80 Q70 30 120 28 Q170 30 166 80 Q154 52 120 52 Q86 52 74 80 Z" fill="${c.vol(o.hair || '#1c120c')}" stroke="${OUT}" stroke-width="2.4"/>`);
    if (o.beard) out.push(`<path d="M84 104 Q90 144 120 148 Q150 144 156 104 Q146 124 120 124 Q94 124 84 104 Z" fill="${c.vol(o.hair || '#1c120c')}" stroke="${OUT}" stroke-width="2.2"/>`);
    if (o.helm) out.push(`<path d="M74 78 Q72 28 120 24 Q168 28 166 78 L152 70 Q120 56 88 70 Z" fill="${c.vol('#8d9097')}" stroke="${OUT}" stroke-width="2.6"/><path d="M114 24 L120 6 L126 24 Z" fill="${c.vol('#b0301f')}" stroke="${OUT}" stroke-width="2"/>`);
    if (o.horns) out.push(`<path d="M80 54 Q52 40 58 14 Q74 34 92 46 Z M160 54 Q188 40 182 14 Q166 34 148 46 Z" fill="${c.vol('#e8dec2')}" stroke="${OUT}" stroke-width="2.2"/>`);
    if (o.tattoo) out.push(`<path d="M92 66 v14 M96 68 v14 M148 66 v14 M144 68 v14" stroke="${o.tattoo}" stroke-width="3" stroke-linecap="round"/>`);
    if (o.staff) out.push(`<path d="M206 40 L196 200" stroke="${OUT}" stroke-width="10" stroke-linecap="round"/><path d="M206 40 L196 200" stroke="#6b4a26" stroke-width="6" stroke-linecap="round"/><circle cx="206" cy="30" r="16" fill="${c.glow(o.glow || '#6af')}"/><circle cx="206" cy="30" r="9" fill="${o.glow || '#6af'}" stroke="${OUT}" stroke-width="2"/>`);
    return out.join('');
  };

  // --- fantasma
  DRAW.ghost = function (c, o) {
    const P = c.P, out = [];
    out.push(`<ellipse cx="120" cy="112" rx="92" ry="92" fill="${c.glow(P.accent)}" opacity=".5"/>`);
    out.push(`<path d="M52 190 Q40 100 76 62 Q120 20 164 62 Q200 100 188 190 Q176 170 164 190 Q152 170 140 192 Q128 170 116 192 Q104 170 92 190 Q80 170 52 190 Z" fill="${c.lin('#f0f4ff', P.base, true)}" stroke="${OUT}" stroke-width="2.4" opacity=".92"/>`);
    out.push(`<path d="M72 90 Q56 120 66 160 M168 90 Q184 120 174 160" stroke="${P.dark}" stroke-width="3" fill="none" opacity=".5"/>`);
    out.push(`<ellipse cx="98" cy="90" rx="12" ry="16" fill="#0a0a14"/><ellipse cx="142" cy="90" rx="12" ry="16" fill="#0a0a14"/><circle cx="98" cy="90" r="4" fill="${P.accent}"/><circle cx="142" cy="90" r="4" fill="${P.accent}"/>`);
    out.push(`<path d="M100 130 Q120 158 140 130 Q120 140 100 130 Z" fill="#0a0a14"/>`);
    return out.join('');
  };

  // --- fera de fogo / lava
  DRAW.fire = function (c, o) {
    const P = c.P, out = [];
    out.push(`<ellipse cx="120" cy="120" rx="100" ry="84" fill="${c.glow('#ff7a1a')}" opacity=".55"/>`);
    let fl = ''; for (let i = 0; i < 9; i++) { const x = 40 + i * 20, h = 50 + (i % 3) * 22; fl += `<path d="M${x - 14} 116 Q${x - 6} ${116 - h} ${x} ${110 - h - 14} Q${x + 8} ${116 - h * 0.6} ${x + 14} 116 Z" fill="${c.lin('#ffd24a', '#e8401a', true)}" opacity=".85" stroke="#7a1a08" stroke-width="1.4"/>`; }
    out.push(fl);
    out.push(`<path d="M30 200 Q30 130 120 116 Q210 130 210 200 Z" fill="${c.vol('#3a1a14')}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(`<path d="M60 160 l14 -8 l8 14 M150 150 l16 -4 l4 16 M100 186 l12 -10 l12 12" stroke="#ff8a24" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    out.push(`<path d="M70 96 Q70 50 120 44 Q170 50 170 96 Q164 132 120 138 Q76 132 70 96 Z" fill="${c.vol('#4a221a')}" stroke="${OUT}" stroke-width="2.6"/>`);
    out.push(`<path d="M86 60 L96 26 L110 54 Z M130 54 L144 26 L154 60 Z" fill="${c.vol('#2a1410')}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>`);
    out.push(`<path d="M88 84 L112 92 L110 100 L88 94 Z M152 84 L128 92 L130 100 L152 94 Z" fill="#ffd24a" stroke="${OUT}" stroke-width="1.6"/><circle cx="100" cy="92" r="16" fill="${c.glow('#ffb02a')}"/><circle cx="140" cy="92" r="16" fill="${c.glow('#ffb02a')}"/>`);
    out.push(`<path d="M92 114 Q120 140 148 114 Q120 126 92 114 Z" fill="#1a0a06"/><path d="M98 116 l6 8 l6 -8 l6 8 l6 -8 l6 8 l6 -8" stroke="#ffb02a" stroke-width="2" fill="none"/>`);
    if (o.titan) out.push(`<path d="M70 96 L82 124 M170 96 L158 124 M120 50 L120 76 M96 60 L110 80 M144 60 L130 80" stroke="#ff8a24" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M62 80 L38 44 L76 62 Z M178 80 L202 44 L164 62 Z" fill="#2a1410" stroke="#1b0f08" stroke-width="2.2" stroke-linejoin="round"/><path d="M36 150 L16 170 M204 150 L224 170" stroke="#ff8a24" stroke-width="6" stroke-linecap="round"/>`);
    return out.join('');
  };

  // --- tartaruga / anquilossauro
  DRAW.turtle = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base);
    out.push(`<path d="M14 200 Q14 70 120 52 Q226 70 226 200 Z" fill="${c.vol(P.dark)}" stroke="${OUT}" stroke-width="2.8"/>`);
    let plates = ''; const pts = [[120, 74], [74, 100], [166, 100], [48, 150], [192, 150], [100, 140], [140, 140], [120, 180]]; pts.forEach(([x, y], i) => { plates += `<path d="M${x} ${y - 20} L${x + 22} ${y - 6} L${x + 18} ${y + 16} L${x - 18} ${y + 16} L${x - 22} ${y - 6} Z" fill="${c.vol(i % 2 ? P.base : P.light)}" stroke="${OUT}" stroke-width="2"/>`; }); out.push(plates);
    if (o.spikes) { let s = ''; for (let i = 0; i < 7; i++) { const x = 40 + i * 27; s += `<path d="M${x - 8} ${88 + Math.abs(3 - i) * 12} L${x} ${58 + Math.abs(3 - i) * 10} L${x + 8} ${88 + Math.abs(3 - i) * 12} Z" fill="${c.vol('#d8cdb0')}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`; } out.push(s); }
    out.push(`<path d="M76 130 Q70 100 120 96 Q170 100 164 130 Q160 170 120 174 Q80 170 76 130 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>${scalesPattern(120, 134, 38, 32, P.dark, o.seed, 8)}`);
    out.push(`<path d="M96 154 Q120 172 144 154 Q120 160 96 154 Z" fill="#3a0f12" stroke="${OUT}" stroke-width="2"/>`);
    out.push(`<ellipse cx="112" cy="140" rx="2.4" ry="1.8" fill="${OUT}"/><ellipse cx="128" cy="140" rx="2.4" ry="1.8" fill="${OUT}"/>`);
    out.push(eye(100, 122, 6.5, { iris: '#e8c52a', lid: P.dark }) + eye(140, 122, 6.5, { iris: '#e8c52a', lid: P.dark }));
    out.push(`<path d="M88 112 L108 118 M152 112 L132 118" stroke="${OUT}" stroke-width="3.4" stroke-linecap="round"/>`);
    return out.join('');
  };

  // --- dragão (peça principal): cabeça angular, boca aberta com o sopro, chifres e cristas
  DRAW.dragon = function (c, o) {
    const P = c.P, out = [], body = c.vol(P.base), br = o.breath || '#ff9a2a';
    out.push(`<ellipse cx="120" cy="104" rx="118" ry="94" fill="${c.glow(o.aura || P.accent)}" opacity=".4"/>`);
    // asas com membrana e ossos
    const wing = (sx) => `<path d="M${120 + sx * 40} 126 Q${120 + sx * 62} 60 ${120 + sx * 114} 4 Q${120 + sx * 104} 40 ${120 + sx * 116} 62 Q${120 + sx * 96} 56 ${120 + sx * 98} 84 Q${120 + sx * 80} 76 ${120 + sx * 76} 108 Q${120 + sx * 60} 98 ${120 + sx * 56} 134 Z" fill="${c.lin(shade(P.dark, 0.18), shade(P.dark, -0.45), true)}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M${120 + sx * 42} 122 Q${120 + sx * 70} 56 ${120 + sx * 114} 6 M${120 + sx * 46} 126 L${120 + sx * 100} 84 M${120 + sx * 48} 130 L${120 + sx * 78} 108" stroke="${P.base}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M${120 + sx * 114} 4 l${sx * 8} -4 M${120 + sx * 98} 84 l${sx * 8} 2" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>`;
    out.push(wing(-1) + wing(1));
    // pescoço e peito
    out.push(`<path d="M52 200 Q54 150 92 134 L148 134 Q186 150 188 200 Z" fill="${body}" stroke="${OUT}" stroke-width="2.6"/>${scalesPattern(120, 176, 62, 28, P.dark, o.seed, 9)}`);
    out.push(`<path d="M92 200 Q120 158 148 200 Z" fill="${c.vol(P.belly)}" opacity=".92"/><path d="M98 192 h44 M102 180 h36 M108 168 h24" stroke="${P.dark}" stroke-width="2" opacity=".6"/>`);
    // cristas/cristais atrás
    const spike = (x, y, h, w) => (o.crystal
      ? `<path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} L${x} ${y + h * 0.25} Z" fill="${c.lin('#e8faff', '#5ab8f0', true)}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round" opacity=".95"/>`
      : `<path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z" fill="${c.vol(P.accent)}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`);
    out.push(spike(120, 30, 26, 9) + spike(100, 38, 20, 7) + spike(140, 38, 20, 7) + spike(82, 56, 16, 6) + spike(158, 56, 16, 6));
    // chifres grandes curvados para trás
    const horn = (sx) => `<path d="M${120 + sx * 38} 58 Q${120 + sx * 74} 56 ${120 + sx * 92} 14 Q${120 + sx * 98} 40 ${120 + sx * 82} 66 Q${120 + sx * 64} 80 ${120 + sx * 44} 74 Z" fill="${c.vol(o.crystal ? '#d8f2ff' : '#e8dcc0')}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${120 + sx * 54} 56 q${sx * 12} -2 ${sx * 20} -16 M${120 + sx * 60} 64 q${sx * 12} -4 ${sx * 18} -14" stroke="${OUT}" stroke-width="1.4" fill="none" opacity=".6"/><path d="M${120 + sx * 22} 52 Q${120 + sx * 30} 28 ${120 + sx * 20} 12 Q${120 + sx * 38} 30 ${120 + sx * 36} 56 Z" fill="${c.vol('#d8ccae')}" stroke="${OUT}" stroke-width="2"/>`;
    out.push(horn(-1) + horn(1));
    // espinhos de bochecha
    out.push(`<path d="M62 100 L34 92 L58 112 Z M178 100 L206 92 L182 112 Z M64 116 L38 124 L66 128 Z M176 116 L202 124 L174 128 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`);
    // cabeça angular
    out.push(`<path d="M120 36 L152 52 L176 84 L170 120 L150 150 L120 158 L90 150 L70 120 L64 84 L88 52 Z" fill="${body}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>${scalesPattern(120, 86, 48, 40, P.dark, o.seed + 2, 9)}`);
    out.push(`<path d="M120 40 L120 76 M96 64 L120 76 L144 64" stroke="${OUT}" stroke-width="2.4" fill="none" opacity=".55"/><path d="M80 78 Q120 56 160 78" stroke="${P.light}" stroke-width="3.4" fill="none" opacity=".55"/>`);
    // focinho e boca aberta
    out.push(`<path d="M84 108 L120 96 L156 108 L150 134 Q120 142 90 134 Z" fill="${c.vol(P.light)}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`);
    out.push(`<ellipse cx="108" cy="112" rx="4.6" ry="3.2" fill="${OUT}"/><ellipse cx="132" cy="112" rx="4.6" ry="3.2" fill="${OUT}"/>`);
    out.push(`<path d="M106 106 q-8 -14 2 -26 q-10 4 -10 14 M134 106 q8 -14 -2 -26 q10 4 10 14" stroke="${o.crystal ? '#bfeaff' : '#b8b0a8'}" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/>`);
    out.push(`<path d="M80 136 Q120 190 160 136 Q120 150 80 136 Z" fill="#2a0a0e" stroke="${OUT}" stroke-width="2.6"/><ellipse cx="120" cy="156" rx="30" ry="14" fill="${c.glow(br)}"/><ellipse cx="120" cy="158" rx="18" ry="8" fill="${br}" opacity=".9"/>`);
    out.push(teethRow(84, 156, 135, 18, 8, false) + teethRow(92, 148, 163, 14, 6, true));
    out.push(`<path d="M92 156 Q120 176 148 156" stroke="${OUT}" stroke-width="2" fill="none" opacity=".7"/>`);
    // olhos estreitos e brilhantes
    out.push(`<ellipse cx="94" cy="92" rx="17" ry="10" fill="#000" opacity=".35"/><ellipse cx="146" cy="92" rx="17" ry="10" fill="#000" opacity=".35"/>`);
    out.push(eye(94, 92, 9.5, { slit: true, iris: o.iris || '#ffd02a', lid: P.dark, glow: o.glow || o.aura }) + eye(146, 92, 9.5, { slit: true, iris: o.iris || '#ffd02a', lid: P.dark, glow: o.glow || o.aura }));
    out.push(`<path d="M72 74 L108 90 L106 82 L76 66 Z M168 74 L132 90 L134 82 L164 66 Z" fill="${OUT}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`);
    return out.join('');
  };

  /* ---------- ESPECIFICAÇÕES: cada monstro → arquétipo + paleta ---------- */
  const pal = (base, extra) => Object.assign({ base, dark: shade(base, -0.42), light: shade(base, 0.32), belly: shade(base, 0.5), accent: shade(base, 0.2) }, extra || {});
  // [arquétipo, cor-base, opções]
  const SPEC = {
    // zona 1
    'Morcego da Caverna': ['bat', '#4a3b5c', {}], 'Cobra das Sombras': ['snake', '#3b3a5a', { accent: '#8a6ae0', hood: true }], 'Morcego Vampiro': ['bat', '#6a1f2e', { iris: '#ff2a2a' }], 'Víbora das Sombras': ['snake', '#2d2548', { accent: '#b46af0', hood: true, glow: '#a050ff' }],
    // zona 2
    'Lobo Jovem': ['mammal', '#7a7f88', { snarl: true, snout: 0.9, ear: 'point', fangs: true }], 'Javali Selvagem': ['mammal', '#6b4a32', { snout: 0.8, ear: 'point', tusks: 'boar', wide: 54 }], 'Leão da Mata': ['mammal', '#c89a4a', { snout: 0.6, mane: true, maneColor: '#6a3a14', ear: 'round', snarl: true }], 'Lobo Cinzento Alfa': ['mammal', '#8a9099', { snarl: true, snout: 0.95, ear: 'point', fangs: true, scar: true, glow: '#ffcf3a' }],
    // zona 3
    'Enguia do Lago': ['fish', '#3a6a7a', { eel: true }], 'Sapo Venenoso': ['frog', '#4a8a3a', { poison: true, accent: '#d8e83a' }], 'Crocodilo do Pântano': ['reptile', '#4c6a3a', { snout: 1, teeth: 15, croc: true, wide: 50 }], 'Monstro do Lago': ['reptile', '#2f6a78', { snout: 0.7, frill: true, frillColor: '#3aa6b8', spikes: true, teeth: 14, croc: true, glow: '#6ad8ff' }],
    // zona 4
    'Águia das Pedras': ['bird', '#7a5a38', { beak: '#e6b030' }], 'Lagarto Espinhoso': ['reptile', '#9a7a4a', { spikes: true, snout: 0.5 }], 'Bode da Montanha': ['mammal', '#c9c2b0', { snout: 0.7, ear: 'flop', horns: 'goat', hornColor: '#d8ccb0' }], 'Rei Águia': ['bird', '#5a4a6a', { beak: '#f2c230', glow: '#ffd02a' }],
    // zona 5
    'Hiena Faminta': ['mammal', '#a58a52', { snarl: true, snout: 0.75, ear: 'round', spots: true, fangs: true }], 'Bisão Enraivecido': ['mammal', '#4a3424', { snout: 0.6, horns: 'bull', ear: 'flop', wide: 58 }], 'Tigre Caçador': ['mammal', '#d88a2a', { snarl: true, snout: 0.5, ear: 'round', stripes: true, fangs: true }], 'Mamute Ancestral': ['mammal', '#6b4a38', { trunk: true, tusks: 'mammoth', ear: 'big', wide: 56, fur: true }],
    // zona 6
    'Macaco Feroz': ['mammal', '#7a5030', { ape: true, snout: 0.2, ear: 'round', wide: 46, fangs: true }], 'Aranha Gigante': ['spider', '#3a3028', { mark: true }], 'Gorila Ancestral': ['mammal', '#3a3a42', { ape: true, snout: 0.15, ear: 'round', wide: 56, fangs: true }], 'Rei Macaco Gigante': ['mammal', '#2c2c36', { ape: true, snout: 0.15, ear: 'round', wide: 58, fangs: true, scar: true, armor: true, glow: '#ff8a2a' }],
    // zona 7
    'Escorpião Gigante': ['scorpion', '#a8782a', {}], 'Cascavel do Deserto': ['snake', '#b0884a', { rattle: true, accent: '#6a4a1a' }], 'Lagarto das Dunas': ['reptile', '#c2a45a', { spikes: true, snout: 0.6, frill: true, frillColor: '#d8884a' }], 'Escorpião Imperador': ['scorpion', '#3a2a4a', { accent: '#9a6ae8' }],
    // zona 8
    'Lobo das Neves': ['mammal', '#d9e4ee', { snarl: true, snout: 0.9, ear: 'point', fangs: true, iris: '#7ad0ff' }], 'Mamute Jovem': ['mammal', '#8a6a52', { trunk: true, tusks: 'mammoth', ear: 'big', wide: 50 }], 'Urso das Cavernas': ['mammal', '#5a4030', { snout: 0.55, ear: 'round', wide: 56, snarl: true }], 'Rinoceronte Lanudo': ['mammal', '#7a6a62', { snout: 0.9, ear: 'small', horns: 'rhino', wide: 60, eyeGap: 4, nose: '#4a3a34' }],
    // zona 9
    'Raptor Veloz': ['reptile', '#5a7a3a', { snout: 1, teeth: 12, eyeX: 30, wide: 44 }], 'Dinossauro Chifrudo': ['reptile', '#8a6a4a', { horns: 'trike', frill: true, frillColor: '#b0482a', snout: 0.3, teeth: 8 }], 'Dilofossauro': ['reptile', '#6a8a3a', { frill: true, frillColor: '#e8742a', snout: 0.7, teeth: 12 }], 'Rei dos Raptores': ['reptile', '#7a2a2a', { snout: 0.9, teeth: 15, spikes: true, glow: '#ff3a2a' }],
    // zona 10
    'Caranguejo Gigante': ['crab', '#c2502a', {}], 'Tubarão Pré-histórico': ['fish', '#5a7a8c', { shark: true }], 'Polvo Gigante': ['octopus', '#8a3a6a', {}], 'Kraken do Abismo': ['octopus', '#2a3a6a', { accent: '#5ad0ff', glow: '#5ad0ff', iris: '#7affd8' }],
    // zona 11
    'Golem de Rocha': ['golem', '#7a7468', { moss: true }], 'Alce Colossal': ['mammal', '#7a5a3a', { snout: 0.75, ear: 'big', horns: 'antler', wide: 46 }], 'Troll de Pedra': ['golem', '#6a7a68', { moss: true, horns: true, glow: '#ffa02a' }], 'Anquilossauro Pétreo': ['turtle', '#7a7468', { spikes: true }],
    // zona 12
    'Caçador de Crânios': ['human', '#6a4a36', { mask: true, fur: true, skin: '#8a5a3a', beard: false, tattoo: '#e8dfc8' }], 'Espectro das Árvores': ['ghost', '#5a8a8a', { accent: '#7affd8' }], 'Xamã Aprendiz': ['human', '#4a3a6a', { mask: true, maskColor: '#d8cdb0', staff: true, glow: '#8a6aff', hair: '#2a1a38' }], 'Xamã Sombrio': ['human', '#2a1a3a', { mask: true, maskColor: '#3a2a4a', staff: true, glow: '#b84aff', horns: true, hair: '#150c20' }],
    // zona 13
    'Besta de Lava': ['fire', '#4a221a', {}], 'Serpente de Fogo': ['snake', '#a8321a', { accent: '#ffb02a', glow: '#ff8a1a', iris: '#fff07a' }], 'Salamandra Gigante': ['reptile', '#c25a1a', { frill: true, frillColor: '#ffb02a', snout: 0.5, glow: '#ffb02a' }], 'Titã de Magma': ['fire', '#3a1810', { titan: true }],
    // zona 14
    'Guerreiro Rival': ['human', '#7a5a3a', { armor: true, helm: true, skin: '#8a5a3a', beard: true }], 'Fera das Ruínas': ['mammal', '#5a4a3a', { snout: 0.8, ear: 'point', tusks: 'boar', fangs: true }], 'Capitão dos Rivais': ['human', '#5a3a2a', { armor: true, helm: true, skin: '#7a4a2a', beard: true, hair: '#3a2010' }], 'Senhor da Guerra': ['human', '#3a2a28', { armor: true, horns: true, mask: true, maskColor: '#5a4a4a', fur: true, skin: '#6a4028' }],
    // zona 15
    'Tiranete': ['reptile', '#6a7a3a', { snout: 0.9, teeth: 14, rex: true, wide: 52 }], 'Fera Primordial': ['mammal', '#4a3a52', { snout: 0.7, ear: 'point', horns: 'bull', hornColor: '#d8ccb0', tusks: 'saber', snarl: true, glow: '#ff5a3a' }], 'Alfa do Tirano': ['reptile', '#7a3a2a', { snout: 0.9, teeth: 16, spikes: true, rex: true, wide: 56 }], 'Tiranossauro Rei': ['reptile', '#5a1f1a', { snout: 1, teeth: 20, spikes: true, horns: 'devil', glow: '#ff3a1a', wide: 60, rex: true }],
    // eventos
    'Javali Gigante': ['mammal', '#5a3a28', { snout: 0.8, ear: 'point', tusks: 'boar', wide: 58, glow: '#ffcf3a' }], 'Lobo Alfa': ['mammal', '#4a4f58', { snarl: true, snout: 0.9, ear: 'point', fangs: true, glow: '#ffcf3a' }],
    'Crocodilo Ancestral': ['reptile', '#3a5a2e', { snout: 1, teeth: 16, croc: true, wide: 56, glow: '#ffcf3a' }], 'Águia Rapina': ['bird', '#5a3a28', { beak: '#e6b030', glow: '#ffcf3a' }],
    'Naja Gigante': ['snake', '#6a7a2a', { accent: '#d8c23a', glow: '#ffcf3a' }], 'Urso Pardo Gigante': ['mammal', '#4a3020', { snout: 0.7, ear: 'round', wide: 56, claws: true, glow: '#ffcf3a' }],
    'Mamute Alfa': ['mammal', '#4a3a4a', { trunk: true, tusks: 'mammoth', ear: 'big', wide: 56, glow: '#ffcf3a' }], 'Rei Dentes-de-Sabre': ['mammal', '#e0a23a', { snarl: true, snout: 0.5, ear: 'round', stripes: true, tusks: 'saber', glow: '#ffcf3a' }], 'Matriarca dos Raptores': ['reptile', '#3a6a8a', { snout: 0.9, teeth: 15, frill: true, frillColor: '#e8a22a' }], 'Urso Fantasma': ['mammal', '#d9e8f2', { snout: 0.55, ear: 'round', wide: 58, snarl: true, iris: '#7ad0ff', glow: '#7ad0ff' }],
    'Dragão de Fogo': ['dragon', '#b0301a', { aura: '#ff7a1a', breath: '#ff9a2a', accent: '#ffb02a' }], 'Tiranossauro Ancestral': ['reptile', '#3a4a2a', { snout: 1, teeth: 20, spikes: true, wide: 60, glow: '#ffb02a', rex: true }], 'Titã de Pedra': ['golem', '#5a5a64', { horns: true, glow: '#6ad8ff' }], 'Hidra do Pântano': ['snake', '#2a5a3a', { accent: '#8aff4a', hood: true, glow: '#7aff4a' }],
    // dragões especiais
    'Dragão Verde': ['dragon', '#2f8a3a', { aura: '#6aff7a', breath: '#9aff4a', accent: '#c8f04a', iris: '#fff07a' }], 'Dragão Azul': ['dragon', '#2a5aaa', { aura: '#6ac8ff', breath: '#a8e8ff', accent: '#bfeaff', iris: '#e8faff', crystal: true }],
  };
  const FALLBACK = { '🦇': 'Morcego da Caverna', '🐍': 'Cobra das Sombras', '🐺': 'Lobo Jovem', '🐗': 'Javali Selvagem', '🦁': 'Leão da Mata', '🐊': 'Crocodilo do Pântano', '🦅': 'Águia das Pedras', '🐻': 'Urso das Cavernas', '🦖': 'Raptor Veloz', '🦍': 'Gorila Ancestral' };
  Art.slug = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  Art.hasSpec = (name) => !!SPEC[name.replace(/ Veterano$/, '')];

  /* ---------- API: monstro ---------- */
  function specFor(mon) {
    const nm = String(mon.name || '').replace(/ Veterano$/, '');
    return SPEC[nm] || SPEC[FALLBACK[mon.emoji]] || SPEC['Lobo Jovem'];
  }
  Art.monster = function (mon, opts) {
    opts = opts || {};
    const img = Art.pack && Art.pack.monsters && Art.pack.monsters[String(mon.name).replace(/ Veterano$/, '')];
    if (img) return `<img class="artimg" src="${img}" alt="${mon.name}" draggable="false">`;
    const [arch, base, o] = specFor(mon), P = pal(base, o), c = Ctx(P);
    const body = DRAW[arch](c, Object.assign({ seed: hash(mon.name) }, o));
    const elite = mon.kind === 'elite' ? `<ellipse cx="120" cy="104" rx="112" ry="92" fill="${c.glow('#b06be0')}" opacity=".4"/>` : '';
    const sm = mon.kind === 'semi' ? `<ellipse cx="120" cy="104" rx="112" ry="92" fill="${c.glow('#ff9a2a')}" opacity=".28"/>` : '';
    const ground = shadowEl(120, 196, 84);
    const grain = Art.GRAIN ? ' filter="url(#' + c.id + 'n)"' : '';
    const filt = Art.GRAIN ? `<filter id="${c.id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="t"/><feColorMatrix in="t" type="matrix" values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 1 0" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply" result="b"/><feComposite in="b" in2="SourceAlpha" operator="in"/></filter>` : '';
    const cls = opts.cls ? ` class="${opts.cls}"` : '';
    return `<svg${cls} viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${mon.name}"><defs>${c.defs.join('')}${filt}</defs>${elite}${sm}${ground}<g${grain}>${body}</g></svg>`;
  };
  Art.GRAIN = true;

  /* ---------- CENÁRIOS por bioma ---------- */
  const BIOME = {
    1: 'cave', 2: 'forest', 3: 'lake', 4: 'rocks', 5: 'plain', 6: 'jungle', 7: 'desert', 8: 'tundra', 9: 'valley', 10: 'coast', 11: 'peak', 12: 'cursed', 13: 'volcano', 14: 'ruins', 15: 'lair',
  };
  const SKY = {
    cave: ['#120d1c', '#2a2040'], forest: ['#2d4a3a', '#5a7a52'], lake: ['#34606e', '#8ab8c0'], rocks: ['#6a7a92', '#c2b090'], plain: ['#d8a85a', '#f2d28a'], jungle: ['#1f4a3a', '#5a8a5a'],
    desert: ['#e8a860', '#f8dca0'], tundra: ['#8aa8c8', '#e8f0f8'], valley: ['#8a7a3a', '#d2c07a'], coast: ['#3a78a8', '#a8d8e8'], peak: ['#4a5a7a', '#a8b8d0'], cursed: ['#1a1030', '#4a2a5a'],
    volcano: ['#3a0e0a', '#c2401a'], ruins: ['#5a5238', '#b8a878'], lair: ['#2a0a0a', '#7a2018'],
    glade: ['#183a24', '#4f9a52'], ice: ['#16324a', '#7ac0e0'], neutral: ['#2a1d13', '#5a4028'],
  };
  const GROUND = { cave: '#1a1220', forest: '#2a3a22', lake: '#2a4a52', rocks: '#5a5248', plain: '#8a7234', jungle: '#1f3a22', desert: '#c08a46', tundra: '#d0dce8', valley: '#5a6a2a', coast: '#c8b078', peak: '#6a6e7a', cursed: '#241638', volcano: '#2a0e0a', ruins: '#6a6048', lair: '#2a1010', glade: '#244a2a', ice: '#a8d0e8', neutral: '#3a2a1a' };
  Art.scene = function (biomeOrZone, opts) {
    const b = typeof biomeOrZone === 'number' ? BIOME[biomeOrZone] : biomeOrZone;
    const simg = Art.pack && Art.pack.scenes && Art.pack.scenes[b];
    if (simg) return `<img class="scene artimg" src="${simg}" alt="" draggable="false" style="width:100%;height:100%;object-fit:cover">`;
    const [s0, s1] = SKY[b] || SKY.neutral, gnd = GROUND[b] || GROUND.neutral, r = rng(hash(String(b)));
    const id = 's' + (++UID);
    let far = '', mid = '', fg = '', fx = '';
    const peaks = (col, y0, amp, n, seed) => { const q = rng(seed); let d = `M0 220 L0 ${y0}`; for (let i = 1; i <= n; i++) d += ` L${(360 * i / n - 360 / n / 2 * (q() > 0.4 ? 1 : 0.5)).toFixed(0)} ${(y0 - q() * amp).toFixed(0)} L${(360 * i / n).toFixed(0)} ${(y0 - q() * amp * 0.3).toFixed(0)}`; return `<path d="${d} L360 220 Z" fill="${col}"/>`; };
    const trees = (col, y, n, h, seed, dark) => { const q = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = (i + q() * 0.6) * 360 / n, hh = h * (0.7 + q() * 0.6); s += `<path d="M${x - 5} ${y} L${x - 3} ${y - hh} L${x + 3} ${y - hh} L${x + 5} ${y} Z" fill="${col}"/><ellipse cx="${x}" cy="${y - hh}" rx="${hh * 0.34}" ry="${hh * 0.3}" fill="${dark || col}" opacity=".95"/>`; } return s; };
    switch (b) {
      case 'cave': far = peaks('#1c1430', 150, 50, 7, 11); for (let i = 0; i < 12; i++) fx += `<path d="M${i * 31 + 6} 0 L${i * 31 + 16} ${20 + (i * 37) % 44} L${i * 31 + 26} 0 Z" fill="#150f22"/>`; mid = peaks('#241a3a', 178, 30, 6, 7); fx += `<ellipse cx="270" cy="110" rx="60" ry="46" fill="#7a5aff" opacity=".12"/>`; break;
      case 'forest': far = trees('#27402e', 160, 11, 90, 3, '#2f5236'); mid = trees('#1d3222', 190, 8, 120, 5, '#25402a'); fx = '<path d="M0 70 Q90 50 180 66 T360 60 L360 100 L0 100 Z" fill="#cfe8c0" opacity=".08"/>'; break;
      case 'lake': far = peaks('#4a6a78', 150, 40, 6, 4); mid = '<rect y="150" width="360" height="70" fill="#2f6070"/>'; for (let i = 0; i < 9; i++) fx += `<path d="M${r() * 300} ${160 + i * 7} q14 -5 28 0 t28 0" stroke="#cfeaf0" stroke-width="1.6" fill="none" opacity=".4"/>`; break;
      case 'rocks': far = peaks('#7a7a88', 140, 70, 5, 8); mid = peaks('#5a5a62', 170, 60, 6, 9); break;
      case 'plain': far = '<path d="M0 150 Q90 130 180 146 T360 140 L360 220 L0 220 Z" fill="#b8963e"/>'; mid = '<path d="M0 176 Q90 160 180 172 T360 166 L360 220 L0 220 Z" fill="#9a7a30"/>'; for (let i = 0; i < 30; i++) fg += `<path d="M${r() * 360} 220 q-2 -22 2 -30 M${r() * 360} 220 q3 -20 -1 -26" stroke="#6a5420" stroke-width="1.4" fill="none"/>`; break;
      case 'jungle': far = trees('#1a3a2a', 170, 10, 100, 12, '#256a42'); mid = trees('#12281c', 200, 7, 140, 13, '#1f5a36'); for (let i = 0; i < 7; i++) fx += `<path d="M${40 + i * 50} 0 q${i % 2 ? 14 : -14} 50 0 ${90 + (i * 13) % 40}" stroke="#2f7a44" stroke-width="3" fill="none" opacity=".7"/>`; break;
      case 'desert': far = '<path d="M0 156 Q80 120 160 150 T360 138 L360 220 L0 220 Z" fill="#d6965a"/>'; mid = '<path d="M0 182 Q100 150 200 176 T360 164 L360 220 L0 220 Z" fill="#c08040"/>'; fx = '<circle cx="290" cy="50" r="24" fill="#fff0b0" opacity=".85"/>'; for (let i = 0; i < 4; i++) fg += `<path d="M${30 + i * 90} 200 l6 -14 l6 14 M${34 + i * 90} 200 l2 -22" stroke="#e8e0c8" stroke-width="3" fill="none"/>`; break;
      case 'tundra': far = peaks('#a8c0d8', 140, 60, 6, 15); mid = peaks('#d8e8f4', 172, 36, 7, 16); for (let i = 0; i < 40; i++) fx += `<circle cx="${r() * 360}" cy="${r() * 200}" r="${0.8 + r() * 1.6}" fill="#fff" opacity=".8"/>`; break;
      case 'valley': far = peaks('#6a7a3a', 150, 44, 7, 17); mid = trees('#364a1a', 192, 9, 70, 18, '#4a6a22'); break;
      case 'coast': far = '<rect y="120" width="360" height="100" fill="#2a6a98"/>'; mid = '<path d="M0 170 Q60 158 120 170 T240 168 T360 172 L360 220 L0 220 Z" fill="#e0c88a"/>'; for (let i = 0; i < 8; i++) fx += `<path d="M${r() * 320} ${130 + i * 9} q16 -6 32 0 t32 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`; break;
      case 'peak': far = peaks('#7a8aa8', 120, 90, 4, 19); mid = peaks('#566078', 160, 70, 5, 20); fx = '<path d="M60 70 L90 30 L120 70 Z M230 80 L262 34 L292 80 Z" fill="#f4f8ff" opacity=".85"/>'; break;
      case 'cursed': far = trees('#1a1030', 170, 9, 110, 21, '#241640'); mid = trees('#120a22', 200, 6, 150, 22, '#1a1032'); fx = '<path d="M0 150 Q90 130 180 150 T360 146 L360 220 L0 220 Z" fill="#7a5aff" opacity=".13"/><circle cx="80" cy="50" r="22" fill="#d8d0ff" opacity=".7"/>'; break;
      case 'volcano': far = '<path d="M60 220 L140 60 L170 60 L260 220 Z" fill="#2a0e0a"/><path d="M140 60 L170 60 L162 40 L148 40 Z" fill="#ff6a1a"/>'; mid = peaks('#3a1410', 180, 40, 6, 23); fx = '<path d="M0 200 Q90 184 180 200 T360 196 L360 220 L0 220 Z" fill="#ff5a1a" opacity=".8"/><circle cx="155" cy="30" r="40" fill="#ff7a1a" opacity=".25"/>'; for (let i = 0; i < 22; i++) fx += `<circle cx="${r() * 360}" cy="${r() * 200}" r="${0.8 + r() * 1.6}" fill="#ffb02a" opacity=".8"/>`; break;
      case 'ruins': far = peaks('#6a6248', 160, 30, 6, 24); for (let i = 0; i < 5; i++) mid += `<rect x="${24 + i * 70}" y="${100 + (i % 2) * 22}" width="22" height="${100 - (i % 2) * 22}" fill="#8a8060"/><rect x="${20 + i * 70}" y="${96 + (i % 2) * 22}" width="30" height="8" fill="#a09470"/>`; break;
      case 'lair': far = peaks('#3a1414', 150, 60, 6, 25); for (let i = 0; i < 10; i++) mid += `<path d="M${i * 38} 220 q6 -${30 + (i * 17) % 30} 12 0 Z" fill="#e8dcc0" opacity=".85"/>`; fx = '<circle cx="180" cy="120" r="80" fill="#ff5a1a" opacity=".16"/>'; break;
      case 'glade': far = trees('#14301c', 165, 11, 100, 31, '#1f4a2a'); mid = trees('#0e2415', 195, 8, 130, 32, '#194024'); fx = '<ellipse cx="180" cy="90" rx="110" ry="60" fill="#9aff7a" opacity=".12"/>'; break;
      case 'ice': far = peaks('#4a7aa8', 130, 80, 5, 33); mid = peaks('#8ac0e0', 170, 50, 6, 34); for (let i = 0; i < 30; i++) fx += `<circle cx="${r() * 360}" cy="${r() * 200}" r="${0.8 + r() * 1.4}" fill="#e8faff" opacity=".8"/>`; break;
      default: far = peaks('#3a2a1a', 160, 40, 6, 26);
    }
    return `<svg class="scene" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset="1" stop-color="${s1}"/></linearGradient><radialGradient id="${id}v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
      <rect width="360" height="220" fill="url(#${id})"/>${far}${mid}${fx}<path d="M0 200 Q90 190 180 200 T360 198 L360 220 L0 220 Z" fill="${gnd}"/>${fg}<rect width="360" height="220" fill="url(#${id}v)"/></svg>`;
  };
  Art.biomeOf = (z) => BIOME[z] || 'neutral';
  Art.ground = (b) => GROUND[b] || GROUND.neutral;
  Art.BIOMES = Object.values(BIOME).concat(['glade', 'ice']);

  // pacote de imagens opcional (art/manifest.json): { "monsters": { "Lobo Jovem": "art/monsters/lobo-jovem.png" }, "scenes": { "forest": "art/scenes/forest.jpg" } }
  Art.loadPack = function () {
    if (typeof fetch !== 'function' || typeof location === 'undefined' || !location.protocol.startsWith('http')) return Promise.resolve(null);
    return fetch('art/manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => { Art.pack = j; return j; }).catch(() => null);
  };

  Art.Ctx = Ctx; Art.fur = furStrokes; Art.scalesPattern = scalesPattern; Art.rng = rng; Art.hash = hash; Art.OUT = OUT; Art.eye = eye;
  root.Art = Art;
  if (typeof module !== 'undefined' && module.exports) module.exports = Art;
})(typeof window !== 'undefined' ? window : globalThis);
