/* Era da Pedra — ilustração dos itens: 35 equipamentos (7 peças × 5 materiais), 5 runas esculpidas e caixas +1 a +5. */
(function (root) {
  'use strict';
  const Art = root.Art || (typeof require === 'function' ? require('./art.js') : null);
  const I = {};
  const OUT = '#1b0f08';
  const shade = Art.shade, mix = Art.mix;
  const RARITY = ['#b9a98c', '#7fb95a', '#4f9be0', '#b06be0', '#f0a824'];
  // materiais: madeira/couro, sílex/pele, pedra polida, osso/casco, marfim/mamute
  const M = [
    { base: '#8b5a2b', dark: '#4e2f14', light: '#bd8650', alt: '#6a4220' },
    { base: '#b99466', dark: '#7a5a34', light: '#e8cfa0', alt: '#8a8e96' },
    { base: '#7c8086', dark: '#464a50', light: '#b9bec6', alt: '#5a5e64' },
    { base: '#e2d6b8', dark: '#9a8a68', light: '#f8f0dc', alt: '#3f9a92' },
    { base: '#f0e6c8', dark: '#a8966a', light: '#fffaf0', alt: '#7a2828' },
  ];
  const GOLD = '#d4ac4c';
  const tierOf = (it) => Math.min(4, Math.floor(it.ilvl / 8));

  const wrap = (x, y, w, h, n, col, vertical) => { let d = ''; for (let i = 0; i < n; i++) { const t = i / n; d += vertical ? `M${x} ${y + h * t} l${w} 5 ` : `M${x + w * t} ${y} l5 ${h} `; } return `<path d="${d}" stroke="${col}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`; };
  const grain = (x, y, w, h, n, col, seed) => { const r = Art.rng(seed); let d = ''; for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h; d += `M${px.toFixed(1)} ${py.toFixed(1)} q${(r() * 4 - 2).toFixed(1)} ${(6 + r() * 8).toFixed(1)} ${(r() * 2 - 1).toFixed(1)} ${(10 + r() * 10).toFixed(1)}`; } return `<path d="${d}" stroke="${col}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".55"/>`; };
  const gem = (c, x, y, r, col) => `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${c.glow(col)}" opacity=".7"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c.vol(col)}" stroke="${OUT}" stroke-width="1.4"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff" opacity=".8"/>`;
  const sheen = (d, col) => `<path d="${d}" fill="none" stroke="${col || '#fff'}" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>`;

  /* ---------- ARMAS (desenhadas na vertical e giradas) ---------- */
  function weapon(c, t, ac, seed) {
    const m = M[t];
    let g = '';
    if (t === 0) { // clava de carvalho nodoso
      g = `<path d="M42 96 L58 96 L60 66 Q76 58 70 28 Q64 4 50 4 Q36 4 30 28 Q24 58 40 66 Z" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>${grain(36, 8, 28, 80, 16, m.dark, seed)}
        <ellipse cx="42" cy="30" rx="5" ry="4" fill="${m.dark}" opacity=".8"/><ellipse cx="58" cy="46" rx="4" ry="3.4" fill="${m.dark}" opacity=".8"/><path d="M44 12 Q50 8 58 12" stroke="${m.light}" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
        <rect x="41" y="74" width="18" height="18" rx="4" fill="${c.vol('#6a4a2a')}" stroke="${OUT}" stroke-width="1.8"/>${wrap(41, 75, 18, 0, 5, '#e2d4b0', false).replace(/l5 0/g, 'l2 4')}<path d="M43 80 h14 M43 86 h14" stroke="#d8c8a0" stroke-width="2"/>`;
    } else if (t === 1) { // lança de sílex lascado
      g = `<rect x="46.5" y="26" width="7" height="72" rx="3" fill="${c.vol('#9a6a3a')}" stroke="${OUT}" stroke-width="2"/>${grain(47, 30, 6, 60, 6, '#5a3a1a', seed)}
        <path d="M50 0 L63 24 Q56 34 50 36 Q44 34 37 24 Z" fill="${c.lin('#d8dce2', '#7a808a')}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/><path d="M50 4 L50 34 M50 10 L42 24 M50 10 L58 24 M46 26 L42 24 M54 26 L58 24" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6"/><path d="M40 22 l-3 -2 M60 22 l3 -2" stroke="${OUT}" stroke-width="1.4"/>
        <path d="M42 34 L58 40 M42 40 L58 46 M42 46 L58 52" stroke="#e8dcc0" stroke-width="2.6" stroke-linecap="round"/><circle cx="50" cy="38" r="2.4" fill="${ac}" stroke="${OUT}" stroke-width="1"/>
        <path d="M46 54 Q36 56 34 70 Q42 62 47 62 Z M54 54 Q64 56 66 70 Q58 62 53 62 Z" fill="#e8dcc0" stroke="${OUT}" stroke-width="1.4"/><path d="M46 56 L38 66 M54 56 L62 66" stroke="#b8a88a" stroke-width="1"/>`;
    } else if (t === 2) { // machado de pedra polida
      g = `<rect x="46" y="12" width="8" height="86" rx="3.4" fill="${c.vol('#8a5a30')}" stroke="${OUT}" stroke-width="2"/>${grain(46, 20, 8, 70, 8, '#4a2a10', seed)}
        <path d="M54 14 Q90 6 92 40 Q74 36 54 42 Z" fill="${c.lin('#c4c8d0', '#5e6268')}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M58 18 Q82 14 86 34" stroke="#fff" stroke-width="2.2" fill="none" opacity=".55" stroke-linecap="round"/><path d="M60 24 l14 -1 M60 30 l16 0" stroke="${m.dark}" stroke-width="1" opacity=".6"/>
        <path d="M42 14 L58 14 M42 20 L58 20 M42 26 L58 26 M42 32 L58 32 M42 38 L58 38" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/><path d="M42 16 L58 18 M42 28 L58 30" stroke="#d8c8a0" stroke-width="1.4" opacity=".7"/><circle cx="50" cy="44" r="2.6" fill="${ac}" stroke="${OUT}" stroke-width="1"/>`;
    } else if (t === 3) { // maça de fêmur com presas
      g = `<path d="M44 96 Q40 90 42 82 L44 40 Q40 30 38 22 Q40 10 50 10 Q60 10 62 22 Q60 30 56 40 L58 82 Q60 90 56 96 Q50 100 44 96 Z" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M44 20 Q50 16 56 20 M46 50 Q50 54 54 50" stroke="${m.dark}" stroke-width="1.6" fill="none" opacity=".7"/>${[[36, 18], [64, 18], [34, 30], [66, 30], [50, 4], [38, 8], [62, 8]].map(([x, y]) => `<path d="M${x < 50 ? x + 6 : x - 6} ${y + 2} L${x} ${y - 5} L${x < 50 ? x + 7 : x - 7} ${y - 4} Z" fill="#fff6dc" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`).join('')}
        <path d="M43 62 L57 66 M43 68 L57 72 M43 74 L57 78" stroke="#b08a52" stroke-width="3" stroke-linecap="round"/>${gem(c, 50, 22, 3.2, ac)}`;
    } else { // martelo de presa de mamute
      g = `<path d="M44 98 Q38 70 44 44 L56 44 Q62 70 56 98 Q50 102 44 98 Z" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2.4"/><path d="M44 90 Q50 88 56 90 M44 80 Q50 78 56 80 M44 70 Q50 68 56 70 M44 60 Q50 58 56 60" stroke="${m.dark}" stroke-width="1.2" fill="none" opacity=".7"/>
        <rect x="18" y="8" width="64" height="38" rx="9" fill="${c.vol('#6a6e76')}" stroke="${OUT}" stroke-width="2.6"/><path d="M24 14 h50 M24 40 h50" stroke="${GOLD}" stroke-width="3.4"/><path d="M26 22 q10 -4 18 2 M56 30 q10 4 16 -2" stroke="#fff" stroke-width="1.6" fill="none" opacity=".4"/>
        <path d="M30 20 l8 8 M30 28 l8 -8 M60 20 l6 10" stroke="#a02a1a" stroke-width="2.4" stroke-linecap="round"/><rect x="40" y="46" width="20" height="8" rx="3" fill="${GOLD}" stroke="${OUT}" stroke-width="1.6"/>${gem(c, 50, 27, 4.4, ac)}`;
    }
    return `<g transform="translate(50 52) rotate(40) scale(1.1) translate(-50 -50)">${g}</g>`;
  }

  /* ---------- ESCUDOS ---------- */
  function shield(c, t, ac, seed) {
    const m = M[t]; let g = '';
    if (t === 0) { g = `<circle cx="50" cy="50" r="40" fill="${c.vol('#9a6a3a')}" stroke="${OUT}" stroke-width="2.6"/>` + [26, 38, 50, 62, 74].map((x) => `<path d="M${x} ${50 - Math.sqrt(1600 - (x - 50) * (x - 50)) + 2} V${50 + Math.sqrt(1600 - (x - 50) * (x - 50)) - 2}" stroke="${OUT}" stroke-width="1.6" opacity=".7"/>`).join('') + grain(14, 14, 72, 72, 18, '#4a2a10', seed) + `<circle cx="50" cy="50" r="40" fill="none" stroke="${c.vol('#5a3a1a')}" stroke-width="7"/><circle cx="50" cy="50" r="10" fill="${c.vol('#7a7e84')}" stroke="${OUT}" stroke-width="2"/>`; }
    else if (t === 1) { g = `<circle cx="50" cy="50" r="40" fill="${c.vol('#c8a26e')}" stroke="${OUT}" stroke-width="2.6"/><path d="M26 34 Q50 22 74 34 M24 50 Q50 40 76 50 M26 66 Q50 58 74 66" stroke="#a07a48" stroke-width="1.4" fill="none" opacity=".6"/><path d="M34 62 l8 -22 l8 14 l8 -22 l8 30" stroke="#a02a1a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="50" r="38" fill="none" stroke="#5a3a1a" stroke-width="2" stroke-dasharray="4 4"/><path d="M62 28 q4 -6 8 0 M66 24 v-6 M70 26 l4 -5" stroke="#a02a1a" stroke-width="2.4" stroke-linecap="round" fill="none"/>`; }
    else if (t === 2) { g = `<path d="M50 8 Q86 12 90 48 Q88 84 50 92 Q12 84 10 48 Q14 12 50 8 Z" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2.8"/><path d="M22 30 L38 40 L34 58 M70 24 L62 44 L78 54 M46 66 L56 82" stroke="${m.dark}" stroke-width="2.2" fill="none"/>${[[24, 20], [76, 20], [14, 48], [86, 48], [24, 78], [76, 78], [50, 12], [50, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#f1e6c8" stroke="${OUT}" stroke-width="1.2"/>`).join('')}<path d="M24 28 Q36 14 54 16" stroke="#fff" stroke-width="2.6" fill="none" opacity=".35" stroke-linecap="round"/>${gem(c, 50, 50, 6, ac)}`; }
    else if (t === 3) { g = `<path d="M50 6 Q92 10 92 54 Q88 90 50 94 Q12 90 8 54 Q8 10 50 6 Z" fill="${c.vol(m.alt)}" stroke="${OUT}" stroke-width="2.8"/>` + [[50, 32], [30, 44], [70, 44], [38, 66], [62, 66], [50, 82]].map(([x, y], i) => `<path d="M${x} ${y - 13} L${x + 13} ${y - 5} L${x + 10} ${y + 10} L${x - 10} ${y + 10} L${x - 13} ${y - 5} Z" fill="${c.vol(i % 2 ? '#4aaa9a' : '#2f7a72')}" stroke="${OUT}" stroke-width="1.8"/>`).join('') + `<path d="M22 24 Q40 12 62 14" stroke="#fff" stroke-width="2.6" fill="none" opacity=".4" stroke-linecap="round"/>${gem(c, 50, 54, 4.6, ac)}`; }
    else { g = `<path d="M30 10 L70 90 M70 10 L30 90" stroke="${OUT}" stroke-width="12" stroke-linecap="round"/><path d="M30 10 L70 90 M70 10 L30 90" stroke="${c.vol('#f1e6c8')}" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="40" fill="${c.vol('#7a2d2d')}" stroke="${OUT}" stroke-width="2.8"/>${Art.fur(50, 50, 38, 38, 90, '#2a0c0c', seed, 7)}<circle cx="50" cy="50" r="40" fill="none" stroke="${GOLD}" stroke-width="4.4"/><path d="M50 12 V88 M12 50 H88" stroke="${GOLD}" stroke-width="2.4"/><circle cx="50" cy="50" r="14" fill="${c.vol(GOLD)}" stroke="${OUT}" stroke-width="2"/>${gem(c, 50, 50, 6, ac)}`; }
    return g;
  }

  /* ---------- ELMOS ---------- */
  function helmet(c, t, ac, seed) {
    const m = M[t]; let g = '';
    if (t === 0) g = `<path d="M18 62 Q14 20 50 16 Q86 20 82 62 L74 56 Q50 44 26 56 Z" fill="${c.vol('#8a6a48')}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>${Art.fur(50, 40, 32, 22, 70, '#3a2812', seed, 7)}<path d="M20 58 Q50 44 80 58 L80 66 Q50 54 20 66 Z" fill="${c.vol('#d8cdb4')}" stroke="${OUT}" stroke-width="2"/>${Art.fur(50, 62, 30, 4, 28, '#8a7a5a', seed + 1, 6)}<path d="M20 64 Q12 78 20 90 Q26 80 28 66 Z M80 64 Q88 78 80 90 Q74 80 72 66 Z" fill="${c.vol('#8a6a48')}" stroke="${OUT}" stroke-width="2"/><path d="M24 84 l-2 8 M76 84 l2 8" stroke="#e8dcc0" stroke-width="2.4" stroke-linecap="round"/>`;
    else if (t === 1) g = `<path d="M16 60 Q12 14 50 10 Q88 14 84 60 Q82 70 70 68 L66 74 L62 66 L56 76 L50 66 L44 76 L38 66 L34 74 L30 68 Q18 70 16 60 Z" fill="${c.vol('#e8dcc0')}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M30 38 Q40 44 44 56 Q34 58 28 52 Z M70 38 Q60 44 56 56 Q66 58 72 52 Z" fill="#150b06"/><path d="M44 62 L50 54 L56 62 Q50 68 44 62 Z" fill="#150b06"/><path d="M26 22 Q50 8 74 22" stroke="#fff" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/><path d="M40 20 l4 10 M50 16 v12 M60 20 l-4 10" stroke="#b09a72" stroke-width="1.4"/><path d="M14 62 L8 86 M86 62 L92 86" stroke="#6a4a2a" stroke-width="4" stroke-linecap="round"/>${gem(c, 50, 22, 3.4, ac)}`;
    else if (t === 2) g = `<path d="M14 66 Q10 16 50 12 Q90 16 86 66 L76 58 Q50 44 24 58 Z" fill="${c.vol('#84888e')}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/><path d="M22 30 L34 38 L30 52 M72 24 L66 40" stroke="${m.dark}" stroke-width="2" fill="none"/><path d="M16 50 Q-2 50 2 18 Q16 30 22 40 Z M84 50 Q102 50 98 18 Q84 30 78 40 Z" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M26 66 L20 92 L38 78 Z M74 66 L80 92 L62 78 Z" fill="${c.vol('#8a6a48')}" stroke="${OUT}" stroke-width="2"/><path d="M30 24 Q50 14 70 24" stroke="#fff" stroke-width="2.6" fill="none" opacity=".4" stroke-linecap="round"/>${gem(c, 50, 38, 4.4, ac)}`;
    else if (t === 3) g = `<path d="M12 66 Q8 10 50 8 Q92 10 88 66 Q80 56 50 52 Q20 56 12 66 Z" fill="${c.vol('#3f8f86')}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M${50 + (i - 2) * 16} ${52 - Math.abs(i - 2) * 6} Q${50 + (i - 2) * 12} ${20 + Math.abs(i - 2) * 6} 50 10" stroke="#9ae0d4" stroke-width="2.4" fill="none" opacity=".7"/>`).join('')}<path d="M50 8 Q40 -4 56 -6 Q52 4 56 12 Z" fill="${c.vol('#4aaa9a')}" stroke="${OUT}" stroke-width="2"/><path d="M12 62 Q4 72 12 86 Q20 76 22 62 Z M88 62 Q96 72 88 86 Q80 76 78 62 Z" fill="${c.vol('#2f7a72')}" stroke="${OUT}" stroke-width="2"/><path d="M22 28 Q40 14 62 16" stroke="#fff" stroke-width="2.6" fill="none" opacity=".4" stroke-linecap="round"/>${gem(c, 50, 44, 4.6, ac)}`;
    else g = `<path d="M50 -2 Q40 -14 54 -18 Q50 -6 56 8 Z" fill="${c.vol('#a02a1a')}" stroke="${OUT}" stroke-width="1.8" transform="translate(0 14)"/><path d="M14 68 Q8 14 50 12 Q92 14 86 68 L74 60 Q50 46 26 60 Z" fill="${c.vol('#f0e6c8')}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/><path d="M24 40 Q38 34 44 46 Q36 50 26 48 Z M76 40 Q62 34 56 46 Q64 50 74 48 Z" fill="#150b06"/><path d="M12 60 Q-6 64 -2 26 Q14 38 18 52 Z M88 60 Q106 64 102 26 Q86 38 82 52 Z" fill="${c.vol('#fffaf0')}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 56 H84" stroke="${GOLD}" stroke-width="5"/><path d="M26 66 L18 94 L38 80 Z M74 66 L82 94 L62 80 Z" fill="${c.vol('#7a2d2d')}" stroke="${OUT}" stroke-width="2"/>${gem(c, 50, 38, 5, ac)}<path d="M28 24 Q50 12 72 24" stroke="#fff" stroke-width="2.6" fill="none" opacity=".5" stroke-linecap="round"/>`;
    return `<g transform="translate(0 6)">${g}</g>`;
  }

  /* ---------- ARMADURAS ---------- */
  function armor(c, t, ac, seed) {
    const m = M[t];
    const body = (fill, extra) => `<path d="M30 14 Q50 24 70 14 L90 28 L82 52 L76 48 L78 92 Q50 98 22 92 L24 48 L18 52 L10 28 Z" fill="${fill}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>${extra || ''}`;
    let g = '';
    if (t === 0) g = body(c.vol('#8a6a48'), Art.fur(50, 56, 36, 38, 110, '#3a2812', seed, 8) + `<path d="M40 16 Q50 38 60 16" fill="#2a1a10" opacity=".5"/><path d="M30 14 Q50 26 70 14" stroke="#e8dcc0" stroke-width="3" fill="none"/><path d="M44 36 l6 8 l6 -8 M44 46 l6 8 l6 -8" stroke="#e8dcc0" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M22 90 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8" stroke="#3a2812" stroke-width="2" fill="none"/>`);
    else if (t === 1) g = body(c.vol('#c0955a'), `<path d="M50 20 V92" stroke="${OUT}" stroke-width="2"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M42 ${28 + i * 10} L58 ${34 + i * 10} M58 ${28 + i * 10} L42 ${34 + i * 10}" stroke="#4a2c14" stroke-width="2.6" stroke-linecap="round"/>`).join('')}<path d="M30 14 Q50 24 70 14" stroke="#6a4220" stroke-width="3.6" fill="none"/><path d="M22 44 Q50 52 78 44" stroke="#8a6238" stroke-width="2" fill="none" stroke-dasharray="3 3"/><path d="M26 64 Q50 70 74 64" stroke="#8a6238" stroke-width="2" fill="none" stroke-dasharray="3 3"/>${grain(24, 24, 52, 64, 10, '#8a6238', seed)}`);
    else if (t === 2) g = body(c.vol('#8a6a48'), [0, 1, 2, 3, 4].map((i) => `<path d="M50 ${26 + i * 12} Q${30 - i * 1} ${22 + i * 12} 24 ${34 + i * 12} Q32 ${28 + i * 12} 50 ${34 + i * 12} Z M50 ${26 + i * 12} Q${70 + i} ${22 + i * 12} 76 ${34 + i * 12} Q68 ${28 + i * 12} 50 ${34 + i * 12} Z" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`).join('') + `<path d="M50 20 V92" stroke="#e8dcc0" stroke-width="5.4"/><path d="M50 20 V92" stroke="${OUT}" stroke-width="1.2"/>` + gem(c, 50, 24, 3.4, ac));
    else if (t === 3) g = body(c.vol('#2f7a72'), [0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((k) => `<path d="M${26 + k * 13 + (r % 2) * 6} ${28 + r * 12} q6.5 14 13 0 Z" fill="${c.vol(r % 2 ? '#4aaa9a' : '#58bcac')}" stroke="${OUT}" stroke-width="1.4"/>`).join('')).join('') + `<ellipse cx="18" cy="26" rx="10" ry="8" fill="${c.vol('#9ae0d4')}" stroke="${OUT}" stroke-width="2"/><ellipse cx="82" cy="26" rx="10" ry="8" fill="${c.vol('#9ae0d4')}" stroke="${OUT}" stroke-width="2"/>` + gem(c, 50, 24, 3.6, ac));
    else g = `<path d="M8 22 Q-4 8 12 -2 Q10 12 24 20 Z M92 22 Q104 8 88 -2 Q90 12 76 20 Z" fill="${c.vol('#fffaf0')}" stroke="${OUT}" stroke-width="2.4" transform="translate(0 8)"/>` + body(c.vol('#7a2d2d'), Art.fur(50, 56, 36, 38, 90, '#2a0c0c', seed, 8) + `<path d="M30 14 Q50 26 70 14" stroke="#e8dcc0" stroke-width="6"/>${Art.fur(50, 18, 22, 4, 26, '#9a8a6a', seed + 2, 6)}<path d="M28 30 L50 56 L72 30" stroke="${GOLD}" stroke-width="3.4" fill="none"/><path d="M24 90 H76" stroke="${GOLD}" stroke-width="4.4"/>` + gem(c, 50, 56, 5.6, ac));
    return `<g transform="translate(0 2)">${g}</g>`;
  }

  /* ---------- LUVAS ---------- */
  function gloves(c, t, ac, seed) {
    const m = M[t];
    const hand = (x, sx, fill, cuff, extra) => `<g transform="translate(${x} 0) scale(${sx} 1)"><path d="M-14 56 L14 56 L16 84 L-16 84 Z" fill="${cuff}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-16 28 Q-18 14 -10 14 L-8 14 Q-6 4 0 6 Q6 4 8 14 L12 14 Q18 14 16 28 L14 56 L-14 56 Z" fill="${fill}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-4 14 V32 M4 14 V32" stroke="${OUT}" stroke-width="1.4" opacity=".6"/><path d="M-16 40 Q-26 36 -22 22 Q-16 24 -14 34 Z" fill="${fill}" stroke="${OUT}" stroke-width="2.2"/>${extra || ''}</g>`;
    let g = '';
    if (t === 0) { const f = c.vol('#c8a674'); g = hand(28, 1, f, c.vol('#a07a48'), wrap(-14, 58, 28, 0, 5, '#e8dcc0', false).replace(/l5 0/g, 'l2 4') + `<path d="M-14 62 h28 M-14 70 h28 M-14 78 h28" stroke="#6a4220" stroke-width="2.2"/>`) + hand(72, -1, f, c.vol('#a07a48'), `<path d="M-14 62 h28 M-14 70 h28 M-14 78 h28" stroke="#6a4220" stroke-width="2.2"/>`); }
    else if (t === 1) { const f = c.vol('#9a7a52'); g = hand(28, 1, f, c.vol('#e0d4b8'), Art.fur(0, 60, 14, 6, 26, '#9a8a6a', seed, 6)) + hand(72, -1, f, c.vol('#e0d4b8'), Art.fur(0, 60, 14, 6, 26, '#9a8a6a', seed + 1, 6)); }
    else if (t === 2) { const f = c.vol('#a08060'); const cuff = c.vol('#f1e6c8'); const plates = `<path d="M-14 60 h28 M-14 70 h28 M-14 80 h28" stroke="${OUT}" stroke-width="1.6"/><circle cx="-8" cy="65" r="1.8" fill="#6a4a2a"/><circle cx="8" cy="65" r="1.8" fill="#6a4a2a"/>`; g = hand(28, 1, f, cuff, plates) + hand(72, -1, f, cuff, plates); }
    else if (t === 3) { const f = c.vol('#3f8f86'); const claws = `<path d="M-10 8 L-12 -4 L-6 6 Z M-2 2 L-2 -10 L2 2 Z M6 4 L10 -6 L10 8 Z" fill="#fff6dc" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`; g = hand(28, 1, f, c.vol('#2f7a72'), claws + `<path d="M-14 62 q14 8 28 0 M-14 74 q14 8 28 0" stroke="#9ae0d4" stroke-width="2" fill="none"/>`) + hand(72, -1, f, c.vol('#2f7a72'), claws + `<path d="M-14 62 q14 8 28 0 M-14 74 q14 8 28 0" stroke="#9ae0d4" stroke-width="2" fill="none"/>`); }
    else { const f = c.vol('#7a2d2d'); const sp = `<path d="M-12 56 l-3 -10 l7 6 Z M0 56 l0 -12 l5 10 Z M10 56 l4 -10 l1 12 Z" fill="#fffaf0" stroke="${OUT}" stroke-width="1.4"/><path d="M-14 60 H14" stroke="${GOLD}" stroke-width="3.4"/>`; g = hand(28, 1, f, c.vol('#f0e6c8'), sp + `<circle cx="0" cy="72" r="4" fill="${ac}" stroke="${OUT}" stroke-width="1.4"/>`) + hand(72, -1, f, c.vol('#f0e6c8'), sp + `<circle cx="0" cy="72" r="4" fill="${ac}" stroke="${OUT}" stroke-width="1.4"/>`); }
    return g;
  }

  /* ---------- BOTAS ---------- */
  function boots(c, t, ac, seed) {
    const m = M[t];
    const boot = (x, sx, fill, extra) => `<g transform="translate(${x} 0) scale(${sx} 1)"><path d="M-14 8 L12 8 L14 52 Q14 62 28 66 Q40 70 40 82 L40 90 L-18 90 L-16 62 Z" fill="${fill}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-18 82 H40" stroke="${OUT}" stroke-width="2.4"/><rect x="-18" y="84" width="58" height="8" rx="3" fill="${c.vol('#4a3018')}" stroke="${OUT}" stroke-width="2"/>${extra || ''}</g>`;
    let g = '';
    if (t === 0) { const f = c.vol('#c8a674'); const e = `<path d="M-12 20 L12 26 M-12 30 L12 36 M-12 40 L12 46 M-14 50 L14 56" stroke="#6a4220" stroke-width="3" stroke-linecap="round"/><path d="M-12 14 L12 14" stroke="#e8dcc0" stroke-width="2.6"/>`; g = boot(30, 1, f, e) + boot(70, -1, f, e).replace(/<\/g>$/, '</g>'); g = `<g transform="translate(-4 -2) scale(.94)">${g}</g>`; }
    else if (t === 1) { const f = c.vol('#a67c4c'); const e = `<path d="M0 10 V50" stroke="${OUT}" stroke-width="1.6"/>${[0, 1, 2, 3, 4].map((i) => `<path d="M-8 ${14 + i * 8} L8 ${20 + i * 8} M8 ${14 + i * 8} L-8 ${20 + i * 8}" stroke="#e8dcc0" stroke-width="2" stroke-linecap="round"/>`).join('')}<path d="M-14 12 H12" stroke="#6a4220" stroke-width="4"/>`; g = `<g transform="translate(-4 -2) scale(.94)">${boot(30, 1, f, e) + boot(70, -1, f, e)}</g>`; }
    else if (t === 2) { const f = c.vol('#8a6a48'); const e = Art.fur(0, 12, 16, 8, 30, '#d8cdb4', seed, 7) + `<path d="M-16 8 Q0 -2 14 8 L14 18 Q0 8 -16 18 Z" fill="${c.vol('#e0d4b8')}" stroke="${OUT}" stroke-width="2"/>` + Art.fur(-1, 12, 14, 4, 18, '#9a8a6a', seed + 3, 6); g = `<g transform="translate(-4 -2) scale(.94)">${boot(30, 1, f, e) + boot(70, -1, f, e)}</g>`; }
    else if (t === 3) { const f = c.vol('#3f8f86'); const e = `<path d="M-14 24 q14 10 28 0 M-14 38 q14 10 28 0 M-16 52 q14 10 28 0" stroke="#9ae0d4" stroke-width="2.4" fill="none"/><path d="M26 84 l6 8 l4 -8 M14 84 l5 9 l5 -8 M2 84 l4 9 l5 -8" fill="#fff6dc" stroke="${OUT}" stroke-width="1.4"/><path d="M38 70 L48 72 L40 80 Z" fill="#fff6dc" stroke="${OUT}" stroke-width="1.6"/>`; g = `<g transform="translate(-4 -2) scale(.94)">${boot(30, 1, f, e) + boot(70, -1, f, e)}</g>`; }
    else { const f = c.vol('#6a2828'); const e = `<path d="M-14 8 H12" stroke="${GOLD}" stroke-width="5"/><path d="M4 20 L-6 40 L2 40 L-4 58 L10 34 L2 34 L8 20 Z" fill="#ffe27a" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-16 84 H40" stroke="${GOLD}" stroke-width="3"/>`; g = `<g transform="translate(-4 -2) scale(.94)">${boot(30, 1, f, e) + boot(70, -1, f, e)}</g>`; }
    return g;
  }

  /* ---------- AMULETOS ---------- */
  function amulet(c, t, ac, seed) {
    const cord = (d) => `<path d="${d}" stroke="${OUT}" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#6a4a2a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="3 2"/>`;
    const C = 'M14 8 Q18 52 50 56 Q82 52 86 8';
    let g = cord(C);
    if (t === 0) g += `<path d="M44 56 Q40 70 46 88 Q60 78 58 60 Q54 54 44 56 Z" fill="${c.lin('#fff6dc', '#c8b890')}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/><path d="M46 62 Q50 76 52 84" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/><circle cx="50" cy="54" r="5" fill="${c.vol('#8a6a48')}" stroke="${OUT}" stroke-width="1.6"/>${gem(c, 28, 30, 2.8, ac)}${gem(c, 72, 30, 2.8, ac)}`;
    else if (t === 1) g += [[24, 30], [34, 44], [66, 44], [76, 30]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="1.4"/>`).join('') + `<path d="M50 58 Q32 62 34 76 Q40 92 54 88 Q70 84 66 68 Q62 56 50 58 Z" fill="${c.vol('#f2d0b8')}" stroke="${OUT}" stroke-width="2.4"/><path d="M42 68 Q50 62 58 70 M40 76 Q50 70 62 78" stroke="#c08a70" stroke-width="2" fill="none"/>${gem(c, 50, 52, 3, ac)}`;
    else if (t === 2) g += `<rect x="36" y="54" width="28" height="38" rx="7" fill="${c.vol('#7c8086')}" stroke="${OUT}" stroke-width="2.6"/><path d="M42 64 h16 M42 70 L50 78 L58 70 M44 84 h12" stroke="#2a2c30" stroke-width="2.4" stroke-linecap="round" fill="none"/><circle cx="43" cy="64" r="2.4" fill="#e8dcc0"/><circle cx="57" cy="64" r="2.4" fill="#e8dcc0"/><path d="M40 58 Q50 54 60 58" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/>${gem(c, 50, 52, 3, ac)}`;
    else if (t === 3) g += `<path d="M50 54 Q80 58 82 76 Q78 94 50 94 Q22 94 18 76 Q20 58 50 54 Z" fill="${c.vol('#d8c8a0')}" stroke="${OUT}" stroke-width="2.4"/><path d="M50 58 Q76 62 78 76 Q74 90 50 90 Q26 90 22 76 Q24 62 50 58 Z" fill="${c.vol('#3aaaa0')}" stroke="${OUT}" stroke-width="2"/><ellipse cx="50" cy="76" rx="17" ry="11" fill="#e8fff8" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="76" r="8" fill="${c.vol('#1a7a74')}"/><circle cx="50" cy="76" r="3.6" fill="#041a18"/><circle cx="47" cy="73" r="1.6" fill="#fff"/><path d="M24 70 l-6 -2 M76 70 l6 -2" stroke="#e8dcc0" stroke-width="2.4" stroke-linecap="round"/>`;
    else g += `<path d="M50 56 L74 64 L78 82 L62 96 L38 96 L22 82 L26 64 Z" fill="none" stroke="${GOLD}" stroke-width="3.6" stroke-linejoin="round"/><path d="M50 60 L70 67 L73 82 L60 92 L40 92 L27 82 L30 67 Z" fill="${c.vol('#d8401a')}" stroke="${OUT}" stroke-width="2"/><path d="M42 70 L50 80 L44 90 M58 72 L52 82 L62 88" stroke="#ffd24a" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="50" cy="78" r="16" fill="${c.glow('#ff8a2a')}" opacity=".55"/>`;
    return `<g transform="translate(0 2)">${g}</g>`;
  }

  /* ---------- RUNAS esculpidas ---------- */
  const GLYPH = {
    forca: '<path d="M42 30 L58 30 L50 46 L60 46 L44 74 L48 54 L40 54 Z" fill="currentColor" stroke="none"/>',
    vida: '<path d="M50 28 Q70 50 62 64 Q56 74 50 74 Q44 74 38 64 Q30 50 50 28 Z" fill="currentColor" stroke="none"/><path d="M50 40 V64 M42 52 L50 46 L58 52" stroke="#1b0f08" stroke-width="2" fill="none" opacity=".5"/>',
    pedra: '<path d="M50 28 L68 62 L32 62 Z M40 62 V74 M60 62 V74" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    sorte: '<path d="M50 50 m0 0 q-10 -4 -8 -12 q8 -4 8 6 q0 -10 8 -6 q2 8 -8 12 M50 50 q-12 6 -18 -2 q4 -8 12 -4 M50 50 q12 6 18 -2 q-4 -8 -12 -4 M50 52 V74" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    sangue: '<path d="M50 26 Q66 48 62 60 Q58 72 50 72 Q42 72 38 60 Q34 48 50 26 Z" fill="currentColor" stroke="none"/><path d="M50 78 q-3 6 0 10 q3 -4 0 -10" fill="currentColor" stroke="none"/>',
  };
  function rune(c, it, ac) {
    const t = it.rune ? it.rune.t : 'forca';
    return `<ellipse cx="50" cy="52" rx="44" ry="44" fill="${c.glow(ac)}" opacity=".55"/><path d="M26 14 Q50 4 74 14 Q88 40 82 70 Q74 92 50 94 Q26 92 18 70 Q12 40 26 14 Z" fill="${c.vol('#4a4a52')}" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/><path d="M28 20 Q48 12 66 20" stroke="#fff" stroke-width="2.6" fill="none" opacity=".25" stroke-linecap="round"/><path d="M22 60 l8 -4 M70 78 l8 -4 M30 84 l6 -8" stroke="#2a2a30" stroke-width="1.6" opacity=".7"/><g style="color:${ac};filter:drop-shadow(0 0 3px ${ac})">${GLYPH[t] || GLYPH.forca}</g>`;
  }

  /* ---------- API ---------- */
  I.icon = function (it, o) {
    o = o || {};
    const t = tierOf(it), ac = RARITY[it.rarity], seed = Art.hash(String(it.slot) + t);
    const key = it.rune ? 'runa-' + it.rune.t : `${it.slot}-${t}`, pic = Art.pack && Art.pack.items && Art.pack.items[key];
    if (pic) return `<img class="artimg" src="${pic}" alt="${it.slot}" draggable="false" style="width:100%;height:100%;object-fit:contain">`;
    const c = Art.Ctx({ base: M[t].base, dark: M[t].dark, light: M[t].light, belly: M[t].light, accent: ac });
    let g = '';
    if (it.rune || it.slot === 'runa') g = rune(c, it, ac);
    else g = ({ arma: weapon, escudo: shield, elmo: helmet, armadura: armor, luvas: gloves, botas: boots, amuleto: amulet })[it.slot](c, t, ac, seed);
    const cls = o.cls ? ` class="${o.cls}"` : '';
    return `<svg${cls} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${it.slot}"><defs>${c.defs.join('')}</defs><g>${g}</g></svg>`;
  };
  I.silhouette = function (slot, tierIdx) { return I.icon({ slot, ilvl: (tierIdx || 0) * 8 + 1, rarity: 0 }).replace('<g>', '<g style="filter:brightness(0) opacity(.35)">'); };

  // caixas +1 a +5: caixote de madeira → baú ósseo → baú dourado
  I.box = function (tierN) {
    const col = RARITY[tierN - 1], c = Art.Ctx({ base: '#8b5a2b', dark: '#4e2f14', light: '#bd8650', belly: '#bd8650', accent: col });
    const wood = tierN >= 3 ? '#6a4a2a' : '#9a6a3a', band = tierN >= 4 ? GOLD : tierN >= 3 ? '#e8dcc0' : '#5a3a1a';
    const g = `<ellipse cx="50" cy="90" rx="38" ry="7" fill="#000" opacity=".4"/>
      <path d="M12 44 L12 84 Q50 94 88 84 L88 44 Z" fill="${c.vol(wood)}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>${grain(14, 48, 72, 34, 12, '#3a2210', tierN)}
      <path d="M10 44 Q10 18 50 14 Q90 18 90 44 Z" fill="${c.vol(shade(wood, 0.12))}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/><path d="M10 44 H90" stroke="${OUT}" stroke-width="2.4"/>
      <path d="M26 16 V84 M74 16 V84" stroke="${band}" stroke-width="5.4" opacity=".95"/><path d="M26 16 V84 M74 16 V84" stroke="${OUT}" stroke-width="1" opacity=".5"/>
      ${tierN >= 2 ? `<path d="M10 44 H90" stroke="${band}" stroke-width="4.4"/>` : ''}
      ${tierN >= 3 ? [[26, 30], [74, 30], [26, 70], [74, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#f1e6c8" stroke="${OUT}" stroke-width="1.2"/>`).join('') : ''}
      <rect x="42" y="38" width="16" height="16" rx="3" fill="${c.vol(tierN >= 4 ? GOLD : '#c8b890')}" stroke="${OUT}" stroke-width="2"/><circle cx="50" cy="46" r="2.6" fill="#1b0f08"/>
      ${tierN >= 5 ? `<path d="M30 24 l5 6 l-5 6 M70 24 l-5 6 l5 6" stroke="${col}" stroke-width="2.4" fill="none"/>` : ''}
      <path d="M14 46 Q50 56 86 46" stroke="${col}" stroke-width="${tierN >= 3 ? 3 : 1.6}" fill="none" opacity="${0.4 + tierN * 0.12}" stroke-linecap="round"/><ellipse cx="50" cy="48" rx="40" ry="34" fill="${c.glow(col)}" opacity="${0.12 + tierN * 0.07}"/>`;
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Caixa +${tierN}"><defs>${c.defs.join('')}</defs>${g}</svg>`;
  };
  I.TIERS = ['Madeira e couro', 'Sílex e pele', 'Pedra polida', 'Osso e casco', 'Marfim de mamute'];
  root.ItemArt = I;
  if (typeof module !== 'undefined' && module.exports) module.exports = I;
})(typeof window !== 'undefined' ? window : globalThis);
