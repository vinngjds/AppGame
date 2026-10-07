/* Era da Pedra — avatar em camadas (SVG). Começa só com a roupa de baixo e muda conforme o equipamento. */
(function (root) {
  'use strict';
  const A = {};
  A.SKINS = ['#f3d2b0', '#dba87a', '#b27244', '#744a2c'];
  A.HAIRS = ['#25160d', '#6b3b18', '#c9a24a', '#8a8a8a'];
  // materiais por faixa de nível (couro, pele, pedra, concha, mamute)
  const MAT = [
    { base: '#8a5a2b', dark: '#5e3b19', light: '#b07a43' },
    { base: '#b08a5a', dark: '#7a5a34', light: '#d9b886' },
    { base: '#7f8288', dark: '#53565c', light: '#aeb2ba' },
    { base: '#3f8f8a', dark: '#24605c', light: '#74c6bf' },
    { base: '#7a2d2d', dark: '#4a1717', light: '#c9a24a' },
  ];
  const RARITY = ['#b9a98c', '#7fb95a', '#4f9be0', '#b06be0', '#f0a824'];

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const tier = (it) => Math.min(4, Math.floor(it.ilvl / 8));
  const rim = (it) => RARITY[it.rarity];
  const glow = (it) => (it.rarity >= 3 ? ` style="filter:drop-shadow(0 0 4px ${RARITY[it.rarity]})"` : '');

  function weapon(it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    let body = '';
    if (t === 0) body = `<rect x="-4" y="-78" width="8" height="84" rx="4" fill="${m.base}" stroke="${rc}" stroke-width="2"/><ellipse cx="0" cy="-78" rx="9" ry="14" fill="${m.light}" stroke="${rc}" stroke-width="2"/>`;
    else if (t === 1) body = `<rect x="-2.5" y="-100" width="5" height="108" rx="2" fill="${m.dark}"/><path d="M0 -122 L8 -98 L0 -104 L-8 -98 Z" fill="#c8c9cc" stroke="${rc}" stroke-width="2"/>`;
    else if (t === 2) body = `<rect x="-3" y="-82" width="6" height="90" rx="3" fill="${MAT[0].dark}"/><path d="M3 -80 Q30 -82 26 -52 Q12 -58 3 -58 Z" fill="${m.light}" stroke="${rc}" stroke-width="2"/>`;
    else if (t === 3) body = `<rect x="-3.5" y="-80" width="7" height="88" rx="3" fill="#e8dcc0" stroke="${rc}" stroke-width="1.5"/><circle cx="0" cy="-86" r="14" fill="#efe3c8" stroke="${rc}" stroke-width="2"/><path d="M-14 -86 l-6 -3 M14 -86 l6 -3 M0 -100 l0 -7 M-9 -96 l-5 -5 M9 -96 l5 -5" stroke="${rc}" stroke-width="3" stroke-linecap="round"/>`;
    else body = `<rect x="-4" y="-84" width="8" height="92" rx="3" fill="${m.dark}" stroke="#c9a24a" stroke-width="2"/><rect x="-20" y="-104" width="40" height="26" rx="6" fill="${m.base}" stroke="#c9a24a" stroke-width="3"/><path d="M-20 -91 h40" stroke="#c9a24a" stroke-width="2"/>`;
    return `<g transform="translate(40 176) rotate(-6)"${glow(it)}>${body}</g>`;
  }
  function shield(it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    return `<g${glow(it)}><circle cx="156" cy="152" r="27" fill="${m.base}" stroke="${rc}" stroke-width="4"/><circle cx="156" cy="152" r="18" fill="${m.light}" opacity=".55"/>
      <circle cx="156" cy="152" r="7" fill="${m.dark}" stroke="${rc}" stroke-width="2"/>${t >= 2 ? `<path d="M156 125 V179 M129 152 H183" stroke="${m.dark}" stroke-width="2.5"/>` : ''}</g>`;
  }
  function helmet(it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    let h = `<path d="M77 56 Q76 28 100 28 Q124 28 123 56 L116 50 Q100 40 84 50 Z" fill="${m.base}" stroke="${rc}" stroke-width="2.5"/>`;
    if (t === 0) h += `<path d="M82 44 Q100 36 118 44" stroke="${m.light}" stroke-width="2" fill="none"/>`;
    if (t >= 1) h += `<path d="M84 50 l3 6 l3 -6 l3 6 l3 -6 M104 50 l3 6 l3 -6 l3 6 l3 -6" stroke="#efe3c8" stroke-width="2" fill="none"/>`;
    if (t >= 2) h += `<path d="M78 44 Q58 40 56 18 Q70 26 80 36 Z" fill="#efe3c8" stroke="${rc}" stroke-width="2"/><path d="M122 44 Q142 40 144 18 Q130 26 120 36 Z" fill="#efe3c8" stroke="${rc}" stroke-width="2"/>`;
    if (t >= 3) h += `<path d="M86 34 Q100 12 114 34 Z" fill="${m.light}" stroke="${rc}" stroke-width="2"/>`;
    if (t >= 4) h += `<path d="M100 28 Q96 6 112 -2 Q106 12 108 28 Z" fill="#c9a24a" stroke="${rc}" stroke-width="1.5"/>`;
    return `<g${glow(it)}>${h}</g>`;
  }
  function armor(it, d) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    const tw = d.topW + 4, ww = d.waistW + 2, hw = d.hipW + 4;
    let a = `<path d="M${100 - tw} 92 Q100 82 ${100 + tw} 92 L${100 + ww} 140 L${100 + hw} 172 L${100 + hw + 3} 200 L${100 - hw - 3} 200 L${100 - hw} 172 L${100 - ww} 140 Z" fill="${m.base}" stroke="${rc}" stroke-width="3"/>`;
    if (t === 0) a += `<path d="M${100 - hw - 3} 200 l5 -8 l5 8 l5 -8 l5 8 l5 -8 l5 8 l5 -8 l5 8 l5 -8 l5 8 l5 -8 l5 8" stroke="${m.dark}" stroke-width="2" fill="none"/>`;
    if (t === 1) a += `<path d="M${100 - tw + 6} 94 L${100 + ww - 14} 168 M${100 + tw - 6} 94 L${100 - ww + 14} 168" stroke="${m.dark}" stroke-width="4"/>`;
    if (t === 2) a += `<path d="M${100 - ww} 112 H${100 + ww} M${100 - ww} 134 H${100 + ww} M${100 - hw} 156 H${100 + hw}" stroke="${m.dark}" stroke-width="3"/><circle cx="${100 - tw}" cy="96" r="9" fill="${m.light}" stroke="${rc}" stroke-width="2"/><circle cx="${100 + tw}" cy="96" r="9" fill="${m.light}" stroke="${rc}" stroke-width="2"/>`;
    if (t === 3) { for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) a += `<path d="M${84 + j * 11 + (i % 2) * 5} ${110 + i * 22} q5 10 10 0" stroke="${m.light}" stroke-width="2.5" fill="none"/>`; a += `<circle cx="${100 - tw}" cy="96" r="10" fill="${m.light}" stroke="${rc}" stroke-width="2"/><circle cx="${100 + tw}" cy="96" r="10" fill="${m.light}" stroke="${rc}" stroke-width="2"/>`; }
    if (t === 4) a += `<path d="M${100 - ww} 100 L100 124 L${100 + ww} 100" stroke="#c9a24a" stroke-width="3" fill="none"/><path d="M${100 - tw - 6} 96 l-8 -16 l14 8 Z M${100 + tw + 6} 96 l8 -16 l-14 8 Z" fill="#c9a24a" stroke="${rc}" stroke-width="1.5"/><path d="M${100 - hw} 172 H${100 + hw}" stroke="#c9a24a" stroke-width="4"/>`;
    return `<g${glow(it)}>${a}</g>`;
  }
  function gloves(it) {
    const m = MAT[tier(it)], rc = rim(it);
    const one = (cx, ax) => `<g><path d="M${ax - 8} 146 L${ax + 8} 146 L${cx + 9} 170 L${cx - 9} 170 Z" fill="${m.base}" stroke="${rc}" stroke-width="2"/><circle cx="${cx}" cy="174" r="10" fill="${m.base}" stroke="${rc}" stroke-width="2.5"/><path d="M${cx - 6} 168 h12" stroke="${m.dark}" stroke-width="2"/></g>`;
    return `<g${glow(it)}>${one(52, 55)}${one(148, 145)}</g>`;
  }
  function boots(it) {
    const m = MAT[tier(it)], rc = rim(it);
    const one = (x0, x1) => `<path d="M${x0} 236 H${x1} L${x1 + 1} 268 Q${x1 + 1} 277 ${x1 - 8} 277 H${x0 - 4} Q${x0 - 6} 277 ${x0 - 4} 268 Z" fill="${m.base}" stroke="${rc}" stroke-width="2.5"/><path d="M${x0} 244 H${x1}" stroke="${m.light}" stroke-width="3"/>`;
    return `<g${glow(it)}>${one(80, 98)}${one(102, 120)}</g>`;
  }
  function amulet(it) {
    const rc = rim(it), t = tier(it);
    return `<g${glow(it)}><path d="M86 88 Q100 124 114 88" stroke="#5a3a1a" stroke-width="3" fill="none"/><circle cx="100" cy="112" r="8" fill="${t >= 3 ? '#74c6bf' : '#efe3c8'}" stroke="${rc}" stroke-width="3"/><circle cx="100" cy="112" r="3" fill="${rc}"/></g>`;
  }
  function runes(list) {
    const pos = [[28, 52], [172, 52], [100, 8]];
    return list.map((r, i) => (r ? `<g style="filter:drop-shadow(0 0 5px ${RARITY[r.rarity]})"><path d="M${pos[i][0]} ${pos[i][1] - 11} l9 11 l-9 11 l-9 -11 Z" fill="${RARITY[r.rarity]}" stroke="#fff6" stroke-width="1.5"/></g>` : '')).join('');
  }

  // cfg: {g:'m'|'f', skin:0-3, hair:0-3}; eq: st.equipped
  A.svg = function (cfg, eq, opts) {
    cfg = cfg || { g: 'm', skin: 1, hair: 1 }; eq = eq || {};
    const f = cfg.g === 'f', skin = A.SKINS[cfg.skin] || A.SKINS[1], sd = shade(skin, -0.18), hair = A.HAIRS[cfg.hair] || A.HAIRS[1];
    const d = f ? { topW: 29, waistW: 22, hipW: 30 } : { topW: 34, waistW: 27, hipW: 27 };
    const torso = f
      ? `M${100 - d.topW} 92 Q100 84 ${100 + d.topW} 92 L${100 + d.waistW} 135 Q${100 + d.hipW + 1} 150 ${100 + d.hipW} 172 L${100 - d.hipW} 172 Q${100 - d.hipW - 1} 150 ${100 - d.waistW} 135 Z`
      : `M${100 - d.topW} 92 Q100 82 ${100 + d.topW} 92 L${100 + d.waistW} 172 L${100 - d.waistW} 172 Z`;
    const hairBack = f ? `<path d="M76 56 Q74 26 100 26 Q126 26 124 56 L129 104 Q122 110 116 102 L84 102 Q78 110 71 104 Z" fill="${hair}"/>` : '';
    const hairFront = f
      ? `<path d="M77 58 Q78 36 100 36 Q122 36 123 58 Q116 46 100 46 Q84 46 77 58 Z" fill="${hair}"/><circle cx="76" cy="100" r="5" fill="#c9a24a"/><circle cx="124" cy="100" r="5" fill="#c9a24a"/>`
      : `<path d="M77 56 Q76 30 100 30 Q124 30 123 56 Q114 42 100 42 Q86 42 77 56 Z" fill="${hair}"/>`;
    const beard = f ? '' : `<path d="M82 62 Q84 84 100 84 Q116 84 118 62 Q112 74 100 74 Q88 74 82 62 Z" fill="${hair}"/>`;
    const head = `<circle cx="78" cy="60" r="4.5" fill="${skin}"/><circle cx="122" cy="60" r="4.5" fill="${skin}"/><circle cx="100" cy="58" r="22" fill="${skin}"/>
      <circle cx="92" cy="58" r="2.4" fill="#25160d"/><circle cx="108" cy="58" r="2.4" fill="#25160d"/><path d="M89 52 Q92 50 95 52 M105 52 Q108 50 111 52" stroke="${hair}" stroke-width="1.8" fill="none"/>
      <path d="M95 69 Q100 72 105 69" stroke="${sd}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const out = [];
    out.push('<ellipse cx="100" cy="282" rx="52" ry="8" fill="#0007"/>');
    if (eq.escudo === undefined) { /* nada */ }
    out.push(hairBack);
    // pernas e pés
    out.push(`<path d="M${100 - d.hipW + 2} 168 L80 262 Q80 270 88 270 L98 270 L99 168 Z" fill="${skin}"/><path d="M101 168 L102 270 L112 270 Q120 270 120 262 L${100 + d.hipW - 2} 168 Z" fill="${skin}"/>
      <ellipse cx="88" cy="272" rx="11" ry="5" fill="${sd}"/><ellipse cx="112" cy="272" rx="11" ry="5" fill="${sd}"/>`);
    // braços
    out.push(`<path d="M${100 - d.topW + 2} 94 L${100 - d.topW + 14} 96 L62 168 L48 166 Z" fill="${skin}"/><path d="M${100 + d.topW - 2} 94 L${100 + d.topW - 14} 96 L138 168 L152 166 Z" fill="${skin}"/>
      <circle cx="52" cy="174" r="9" fill="${skin}"/><circle cx="148" cy="174" r="9" fill="${skin}"/>`);
    out.push(`<rect x="92" y="76" width="16" height="16" fill="${sd}"/><path d="${torso}" fill="${skin}"/>`);
    // roupa de baixo (sempre presente)
    out.push(`<path d="M${100 - d.hipW - 1} 162 H${100 + d.hipW + 1} L${100 + d.hipW - 3} 190 Q${100 + 14} 204 100 192 Q${100 - 14} 204 ${100 - d.hipW + 3} 190 Z" fill="${MAT[0].base}" stroke="${MAT[0].dark}" stroke-width="2"/>
      <rect x="${100 - d.hipW - 2}" y="158" width="${2 * d.hipW + 4}" height="8" rx="3" fill="${MAT[0].dark}"/><circle cx="100" cy="162" r="3" fill="${MAT[0].light}"/>`);
    out.push(head, beard, hairFront);
    // equipamentos (por cima)
    if (eq.botas) out.push(boots(eq.botas));
    if (eq.armadura) out.push(armor(eq.armadura, d));
    if (eq.amuleto) out.push(amulet(eq.amuleto));
    if (eq.luvas) out.push(gloves(eq.luvas));
    if (eq.elmo) out.push(helmet(eq.elmo));
    if (eq.arma) out.push(weapon(eq.arma));
    if (eq.escudo) out.push(shield(eq.escudo));
    if (eq.runas) out.push(runes(eq.runas));
    const cls = opts && opts.cls ? ` class="${opts.cls}"` : '';
    return `<svg${cls} viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar do herói">${out.join('')}</svg>`;
  };
  root.Avatar = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
