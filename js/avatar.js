/* Era da Pedra — avatar em camadas (SVG ilustrado). Começa só com a roupa de baixo e muda conforme o equipamento. */
(function (root) {
  'use strict';
  const Art = root.Art || (typeof require === 'function' ? require('./art.js') : null);
  const A = {};
  A.SKINS = ['#f3d2b0', '#dba87a', '#b27244', '#744a2c'];
  A.HAIRS = ['#25160d', '#6b3b18', '#c9a24a', '#8a8a8a'];
  const OUT = '#1b0f08';
  const shade = Art.shade, mix = Art.mix;
  // materiais por faixa de nível: couro, pele, pedra, concha, mamute
  const MAT = [
    { base: '#8a5a2b', dark: '#5e3b19', light: '#b98348' },
    { base: '#b08a5a', dark: '#7a5a34', light: '#e0bf8c' },
    { base: '#7f8288', dark: '#53565c', light: '#b4b8c0' },
    { base: '#3f8f8a', dark: '#24605c', light: '#7ccdc4' },
    { base: '#7a2d2d', dark: '#4a1717', light: '#d4ac4c' },
  ];
  const RARITY = ['#b9a98c', '#7fb95a', '#4f9be0', '#b06be0', '#f0a824'];
  const tier = (it) => Math.min(4, Math.floor(it.ilvl / 8));
  const rim = (it) => RARITY[it.rarity];
  const glow = (it) => (it.rarity >= 3 ? ` style="filter:drop-shadow(0 0 4px ${RARITY[it.rarity]})"` : '');

  // medidas por gênero (meia-largura em cada altura)
  const DIM = {
    m: { sh: 37, chest: 33, waist: 25, hip: 28, thigh: 15 },
    f: { sh: 30, chest: 27, waist: 20, hip: 31, thigh: 16 },
  };
  function torso(d, grow) {
    const g = grow || 0;
    return `M${100 - d.sh - g} 76 Q100 66 ${100 + d.sh + g} 76 Q${100 + d.chest + g} 100 ${100 + d.waist + g} 124 Q${100 + d.hip + g} 138 ${100 + d.hip + g} 152 L${100 - d.hip - g} 152 Q${100 - d.hip - g} 138 ${100 - d.waist - g} 124 Q${100 - d.chest - g} 100 ${100 - d.sh - g} 76 Z`;
  }
  const limb = (pts, w, col, ol) => {
    const d = 'M' + pts.map((p) => p.join(' ')).join(' L');
    return `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };

  /* ---------- equipamentos ---------- */
  function weapon(c, it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    let b = '';
    const grip = `<rect x="-4.5" y="-6" width="9" height="26" rx="4" fill="${c.lin(m.dark, '#2a1a0c')}" stroke="${OUT}" stroke-width="2"/><path d="M-4 0 h8 M-4 7 h8 M-4 14 h8" stroke="#d9c8a0" stroke-width="1.6" opacity=".7"/>`;
    if (t === 0) b = `<rect x="-4" y="-86" width="8" height="84" rx="4" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2"/><ellipse cx="0" cy="-86" rx="11" ry="17" fill="${c.vol(m.light)}" stroke="${OUT}" stroke-width="2.2"/><path d="M-6 -92 l3 6 M4 -98 l-2 8 M0 -78 l4 5" stroke="${m.dark}" stroke-width="1.6"/>`;
    else if (t === 1) b = `<rect x="-2.8" y="-110" width="5.6" height="112" rx="2.5" fill="${c.vol('#8a6a3a')}" stroke="${OUT}" stroke-width="1.6"/><path d="M0 -140 L9 -112 L0 -118 L-9 -112 Z" fill="${c.lin('#e2e4e8', '#9aa0aa')}" stroke="${rc}" stroke-width="2.2" stroke-linejoin="round"/><path d="M-5 -104 l10 4 M-5 -98 l10 4" stroke="#d9c8a0" stroke-width="2"/>`;
    else if (t === 2) b = `<rect x="-3.4" y="-90" width="6.8" height="96" rx="3" fill="${c.vol('#6a4a28')}" stroke="${OUT}" stroke-width="2"/><path d="M3 -92 Q34 -96 30 -58 Q14 -66 3 -62 Z" fill="${c.lin('#c4c8d0', '#6a7078')}" stroke="${rc}" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 -84 Q24 -86 24 -68" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5"/><path d="M-3 -66 h6 M-3 -72 h6" stroke="#d9c8a0" stroke-width="2.4"/>`;
    else if (t === 3) b = `<rect x="-3.8" y="-86" width="7.6" height="94" rx="3" fill="${c.vol('#e8dcc0')}" stroke="${OUT}" stroke-width="2"/><circle cx="0" cy="-94" r="15" fill="${c.vol('#f1e6c8')}" stroke="${OUT}" stroke-width="2.4"/><path d="M-15 -94 l-7 -3 M15 -94 l7 -3 M0 -109 l0 -8 M-10 -104 l-6 -6 M10 -104 l6 -6 M-10 -84 l-6 6 M10 -84 l6 6" stroke="${rc}" stroke-width="3.4" stroke-linecap="round"/>`;
    else b = `<rect x="-4.4" y="-92" width="8.8" height="100" rx="3.4" fill="${c.vol('#4a2018')}" stroke="#d4ac4c" stroke-width="2.4"/><rect x="-24" y="-114" width="48" height="30" rx="7" fill="${c.vol('#7a2d2d')}" stroke="#d4ac4c" stroke-width="3"/><path d="M-24 -99 h48 M-12 -114 v30 M12 -114 v30" stroke="#d4ac4c" stroke-width="2.2"/><circle cx="0" cy="-99" r="5" fill="#ffd24a" stroke="${OUT}" stroke-width="1.6"/>`;
    return `<g transform="translate(38 168) rotate(-8)"${glow(it)}>${b}${grip}</g>`;
  }
  function shield(c, it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    return `<g${glow(it)}><circle cx="160" cy="146" r="29" fill="${c.vol(m.base)}" stroke="${OUT}" stroke-width="2"/><circle cx="160" cy="146" r="26" fill="none" stroke="${rc}" stroke-width="4"/>
      <circle cx="160" cy="146" r="18" fill="${c.vol(m.light)}" opacity=".6"/><path d="M160 120 V172 M134 146 H186" stroke="${m.dark}" stroke-width="${t >= 2 ? 4 : 2.4}" opacity=".85"/>
      <circle cx="160" cy="146" r="8" fill="${c.vol(t >= 3 ? '#d4ac4c' : m.dark)}" stroke="${OUT}" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i * Math.PI / 4; return `<circle cx="${(160 + Math.cos(a) * 22).toFixed(1)}" cy="${(146 + Math.sin(a) * 22).toFixed(1)}" r="1.9" fill="#e8dcc0" stroke="${OUT}" stroke-width=".8"/>`; }).join('')}</g>`;
  }
  function helmetBack(c, it) {   // visto por trás: cúpula lisa, chifres, crista e pluma
    const t = tier(it), m = MAT[t], rc = rim(it);
    let h = `<path d="M81 46 Q78 14 100 12 Q122 14 119 46 Q118 56 100 58 Q82 56 81 46 Z" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="2.4" stroke-linejoin="round"/><path d="M86 34 Q100 22 114 34" stroke="${m.light}" stroke-width="2" fill="none"/>`;
    if (t >= 2) h += `<path d="M83 30 Q62 28 58 4 Q72 12 86 22 Z M117 30 Q138 28 142 4 Q128 12 114 22 Z" fill="${c.vol('#efe5c9')}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;
    if (t >= 3) h += `<path d="M88 24 Q100 4 112 24 Z" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2"/>`;
    if (t >= 4) h += `<path d="M100 16 Q94 -6 110 -14 Q104 2 106 16 Z" fill="#d4ac4c" stroke="${OUT}" stroke-width="1.6"/>`;
    return `<g${glow(it)}>${h}</g>`;
  }
  function helmet(c, it) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    let h = `<path d="M82 42 Q80 18 100 16 Q120 18 118 42 L112 38 Q100 30 88 38 Z" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="2.4" stroke-linejoin="round"/>`;
    if (t === 0) h += `<path d="M84 34 Q100 22 116 34" stroke="${m.light}" stroke-width="2" fill="none"/><path d="M82 40 l-3 10 M118 40 l3 10" stroke="${m.dark}" stroke-width="3" stroke-linecap="round"/>`;
    if (t >= 1) h += `<path d="M86 38 l3 6 l3 -6 l3 6 l3 -6 M100 38 l3 6 l3 -6 l3 6 l3 -6" stroke="#f1e6c8" stroke-width="2" fill="none"/><path d="M82 40 l-4 14 l7 -6 Z M118 40 l4 14 l-7 -6 Z" fill="${c.vol(m.dark)}" stroke="${OUT}" stroke-width="1.6"/>`;
    if (t >= 2) h += `<path d="M83 30 Q62 28 58 4 Q72 12 86 22 Z M117 30 Q138 28 142 4 Q128 12 114 22 Z" fill="${c.vol('#efe5c9')}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>`;
    if (t >= 3) h += `<path d="M88 24 Q100 4 112 24 Z" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2"/><path d="M92 20 Q100 10 108 20" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>`;
    if (t >= 4) h += `<path d="M100 16 Q94 -6 110 -14 Q104 2 106 16 Z" fill="#d4ac4c" stroke="${OUT}" stroke-width="1.6"/><path d="M82 40 h36" stroke="#d4ac4c" stroke-width="2.4"/>`;
    return `<g${glow(it)}>${h}</g>`;
  }
  function armor(c, it, d) {
    const t = tier(it), m = MAT[t], rc = rim(it);
    const body = torso(d, 3), skirt = `M${100 - d.hip - 3} 150 L${100 + d.hip + 3} 150 L${100 + d.hip + 7} 190 Q100 200 ${100 - d.hip - 7} 190 Z`;
    let a = `<path d="${skirt}" fill="${c.vol(shade(m.base, -0.1))}" stroke="${rc}" stroke-width="2.4" stroke-linejoin="round"/><path d="${body}" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="3" stroke-linejoin="round"/>`;
    if (t === 0) { a += Art.fur(100, 114, 34, 30, 60, m.dark, 7, 8) + `<path d="M${100 - d.hip - 7} 190 l5 -9 l5 9 l5 -9 l5 9 l5 -9 l5 9 l5 -9 l5 9 l5 -9 l5 9 l5 -9 l5 9" stroke="${m.dark}" stroke-width="2.2" fill="none"/><path d="M96 80 L100 100 L104 80" stroke="${OUT}" stroke-width="2" fill="none"/>`; }
    if (t === 1) a += `<path d="M${100 - d.sh + 8} 78 L100 150 M${100 + d.sh - 8} 78 L100 150" stroke="${m.dark}" stroke-width="4.4"/><path d="M${100 - 18} 100 h36 M${100 - 15} 116 h30 M${100 - 14} 132 h28" stroke="#e8dcc0" stroke-width="2"/><circle cx="100" cy="100" r="2" fill="#e8dcc0"/>`;
    if (t === 2) a += `<path d="M${100 - d.chest} 100 H${100 + d.chest} M${100 - d.waist - 2} 122 H${100 + d.waist + 2} M${100 - d.hip} 144 H${100 + d.hip}" stroke="${m.dark}" stroke-width="3.2"/><path d="M92 90 l6 12 l-4 8 M110 120 l-6 10" stroke="${OUT}" stroke-width="1.6" fill="none" opacity=".7"/>${[[-d.chest + 3, 100], [d.chest - 3, 100], [-d.waist, 122], [d.waist, 122]].map(([x, y]) => `<circle cx="${100 + x}" cy="${y}" r="2.2" fill="#d8dce2" stroke="${OUT}" stroke-width="1"/>`).join('')}<ellipse cx="${100 - d.sh - 4}" cy="82" rx="13" ry="10" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2.2"/><ellipse cx="${100 + d.sh + 4}" cy="82" rx="13" ry="10" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2.2"/>`;
    if (t === 3) { for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) a += `<path d="M${74 + j * 12 + (i % 2) * 6} ${96 + i * 15} q6 11 12 0" stroke="${m.light}" stroke-width="2.4" fill="none"/>`; a += `<ellipse cx="${100 - d.sh - 4}" cy="82" rx="14" ry="11" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2.2"/><ellipse cx="${100 + d.sh + 4}" cy="82" rx="14" ry="11" fill="${c.vol(m.light)}" stroke="${rc}" stroke-width="2.2"/><path d="M${100 - d.sh - 8} 80 q8 6 16 0 M${100 + d.sh - 8} 80 q8 6 16 0" stroke="${OUT}" stroke-width="1.4" fill="none"/>`; }
    if (t === 4) a += `<path d="M${100 - d.chest + 4} 84 L100 118 L${100 + d.chest - 4} 84" stroke="#d4ac4c" stroke-width="3.4" fill="none"/><path d="M${100 - d.hip} 150 H${100 + d.hip}" stroke="#d4ac4c" stroke-width="4"/><path d="M${100 - d.sh - 8} 80 l-8 -18 l16 8 Z M${100 + d.sh + 8} 80 l8 -18 l-16 8 Z" fill="${c.vol('#d4ac4c')}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="100" cy="116" r="6" fill="#ffd24a" stroke="${OUT}" stroke-width="1.6"/>${Art.fur(100, 116, 30, 28, 40, '#3a1010', 11, 7)}`;
    return `<g${glow(it)}>${a}</g>`;
  }
  function gloves(c, it) {
    const m = MAT[tier(it)], rc = rim(it);
    const one = (x0, y0, x1, y1) => `<path d="M${x0 - 8} ${y0} L${x0 + 8} ${y0} L${x1 + 9} ${y1} L${x1 - 9} ${y1} Z" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="2.2" stroke-linejoin="round"/><path d="M${x0 - 8} ${y0 + 4} L${x0 + 8} ${y0 + 4}" stroke="${m.light}" stroke-width="3"/><circle cx="${x1}" cy="${y1 + 4}" r="9.5" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="2.2"/><path d="M${x1 - 5} ${y1 + 1} v8 M${x1} ${y1} v10 M${x1 + 5} ${y1 + 1} v8" stroke="${m.dark}" stroke-width="1.4" opacity=".7"/>`;
    return `<g${glow(it)}>${one(54, 134, 46, 162)}${one(146, 134, 154, 162)}</g>`;
  }
  function boots(c, it) {
    const m = MAT[tier(it)], rc = rim(it);
    const one = (x0, x1, left) => `<path d="M${x0} 232 H${x1} L${x1 + 2} 266 Q${x1 + 2} 280 ${left ? x1 - 14 : x1 - 2} 280 H${left ? x0 - 8 : x0 + 6} Q${left ? x0 - 10 : x0 + 4} 280 ${x0 - 1} 268 Z" fill="${c.vol(m.base)}" stroke="${rc}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${x0} 238 H${x1}" stroke="${m.light}" stroke-width="5"/><path d="M${x0 + 3} 250 l${x1 - x0 - 6} 3 M${x0 + 3} 258 l${x1 - x0 - 6} 3" stroke="#e8dcc0" stroke-width="1.8"/>${Art.fur((x0 + x1) / 2, 236, (x1 - x0) / 2 + 2, 5, 14, m.dark, x0, 5)}`;
    return `<g${glow(it)}>${one(76, 98, true)}${one(102, 124, false)}</g>`;
  }
  function amulet(c, it) {
    const rc = rim(it), t = tier(it);
    return `<g${glow(it)}><path d="M88 70 Q100 104 112 70" stroke="#5a3a1a" stroke-width="3" fill="none"/><path d="M92 84 l-2 3 M108 84 l2 3" stroke="#e8dcc0" stroke-width="2"/><circle cx="100" cy="106" r="9" fill="${c.vol(t >= 3 ? '#5ad0c0' : '#efe3c8')}" stroke="${rc}" stroke-width="3"/><circle cx="100" cy="106" r="3.4" fill="${rc}"/><circle cx="100" cy="106" r="16" fill="${c.glow(rc)}" opacity=".4"/></g>`;
  }
  function runes(list) {
    const pos = [[28, 56], [172, 56], [100, 8]];
    return list.map((r, i) => (r ? `<g style="filter:drop-shadow(0 0 6px ${RARITY[r.rarity]})"><path d="M${pos[i][0]} ${pos[i][1] - 12} l9 12 l-9 12 l-9 -12 Z" fill="${RARITY[r.rarity]}" stroke="#fff8" stroke-width="1.5"/><path d="M${pos[i][0]} ${pos[i][1] - 6} l4 6 l-4 6 l-4 -6 Z" fill="#fff" opacity=".55"/></g>` : '')).join('');
  }

  // cfg: {g:'m'|'f', skin:0-3, hair:0-3}; eq: st.equipped
  A.svg = function (cfg, eq, opts) {
    cfg = cfg || { g: 'm', skin: 1, hair: 1 }; eq = eq || {};
    const back = !!(opts && opts.back);
    const f = cfg.g === 'f', skin = A.SKINS[cfg.skin] || A.SKINS[1], hair = A.HAIRS[cfg.hair] || A.HAIRS[1];
    const sd = shade(skin, -0.28), sl = shade(skin, 0.2), d = DIM[f ? 'f' : 'm'];
    const c = Art.Ctx({ base: skin, dark: sd, light: sl, belly: sl, accent: sl });
    const body = c.lin(sl, shade(skin, -0.22)), flesh = c.vol(skin), hairG = c.vol(hair);
    const out = [];
    out.push('<ellipse cx="100" cy="284" rx="56" ry="8" fill="#000" opacity=".42"/>');
    // cabelo atrás
    if (f) out.push(`<path d="M80 34 Q78 14 100 12 Q122 14 120 34 L128 92 Q122 104 112 98 L112 56 L88 56 L88 98 Q78 104 72 92 Z" fill="${hairG}" stroke="${OUT}" stroke-width="2"/>`);
    // pernas
    out.push(`<path d="M${100 - d.hip + 2} 148 Q${100 - d.hip - 3} 190 ${100 - 22} 222 Q${100 - 26} 250 ${100 - 20} 276 L${100 - 4} 276 Q${100 - 2} 248 ${100 - 4} 222 Q${100 - 2} 186 100 150 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M${100 + d.hip - 2} 148 Q${100 + d.hip + 3} 190 ${100 + 22} 222 Q${100 + 26} 250 ${100 + 20} 276 L${100 + 4} 276 Q${100 + 2} 248 ${100 + 4} 222 Q${100 + 2} 186 100 150 Z" fill="${body}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M${100 - 18} 196 Q${100 - 12} 210 ${100 - 14} 224 M${100 + 18} 196 Q${100 + 12} 210 ${100 + 14} 224" stroke="${sd}" stroke-width="2" fill="none" opacity=".55"/>
      <ellipse cx="${100 - 14}" cy="277" rx="13" ry="5.5" fill="${flesh}" stroke="${OUT}" stroke-width="2"/><ellipse cx="${100 + 14}" cy="277" rx="13" ry="5.5" fill="${flesh}" stroke="${OUT}" stroke-width="2"/>`);
    // braços
    out.push(limb([[100 - d.sh + 2, 80], [52, 118], [46, 156]], 14, skin) + limb([[100 + d.sh - 2, 80], [148, 118], [154, 156]], 14, skin));
    out.push(`<path d="M${100 - d.sh - 2} 76 Q${100 - d.sh - 8} 90 ${100 - d.sh + 2} 98 M${100 + d.sh + 2} 76 Q${100 + d.sh + 8} 90 ${100 + d.sh - 2} 98" stroke="${sd}" stroke-width="2.2" fill="none" opacity=".55"/>`);
    out.push(`<circle cx="46" cy="164" r="8.5" fill="${flesh}" stroke="${OUT}" stroke-width="2.2"/><circle cx="154" cy="164" r="8.5" fill="${flesh}" stroke="${OUT}" stroke-width="2.2"/>`);
    // tronco
    out.push(`<rect x="92" y="56" width="16" height="22" fill="${c.vol(sd)}"/><path d="${torso(d)}" fill="${body}" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`);
    // contornos de volume (estilizados, sem detalhes anatômicos)
    if (back) out.push(`<path d="M100 76 V146 M${100 - 24} 92 Q${100 - 12} 104 ${100 - 4} 98 M${100 + 24} 92 Q${100 + 12} 104 ${100 + 4} 98" stroke="${sd}" stroke-width="2" fill="none" opacity=".5"/>`);
    else out.push(f
      ? `<path d="M${100 - 16} 78 Q100 86 ${100 + 16} 78 M100 90 V140 M${100 - d.waist + 4} 124 Q100 130 ${100 + d.waist - 4} 124" stroke="${sd}" stroke-width="1.8" fill="none" opacity=".4"/>`
      : `<path d="M${100 - 22} 92 Q${100 - 10} 106 100 100 Q${100 + 10} 106 ${100 + 22} 92 M100 100 V146 M${100 - 12} 114 h24 M${100 - 11} 128 h22 M${100 - 15} 80 Q100 86 ${100 + 15} 80" stroke="${sd}" stroke-width="2" fill="none" opacity=".5"/>`);
    // faixa de pele (feminino): peça de cima básica para o avatar da loja
    if (f && !eq.armadura && !back) out.push(`<path d="M${100 - d.chest + 1} 94 Q100 100 ${100 + d.chest - 1} 94 L${100 + d.chest - 2} 112 Q100 118 ${100 - d.chest + 2} 112 Z" fill="${c.vol(MAT[0].base)}" stroke="${OUT}" stroke-width="2.2"/>${Art.fur(100, 104, 26, 6, 18, MAT[0].dark, 5, 5)}<path d="M${100 - d.chest + 1} 94 L${100 - d.sh + 6} 78 M${100 + d.chest - 1} 94 L${100 + d.sh - 6} 78" stroke="${MAT[0].dark}" stroke-width="3"/>`);
    // roupa de baixo (tanga de pele) sempre presente
    out.push(`<path d="M${100 - d.hip - 2} 146 H${100 + d.hip + 2} L${100 + d.hip} 176 Q${100 + 12} 196 100 184 Q${100 - 12} 196 ${100 - d.hip} 176 Z" fill="${c.vol(MAT[0].base)}" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>${Art.fur(100, 164, d.hip - 2, 14, 30, MAT[0].dark, 3, 6)}<path d="M${100 - d.hip} 176 l4 8 l5 -8 l5 8 l5 -8 M${100 + 4} 176 l5 8 l5 -8 l5 8" stroke="${MAT[0].dark}" stroke-width="2" fill="none"/>
      <rect x="${100 - d.hip - 3}" y="142" width="${2 * d.hip + 6}" height="9" rx="4" fill="${c.vol('#6a4220')}" stroke="${OUT}" stroke-width="2"/><path d="M${100 - 14} 143 l4 7 M${100 - 4} 143 l4 7 M${100 + 6} 143 l4 7" stroke="#d9c8a0" stroke-width="1.6" opacity=".7"/><ellipse cx="100" cy="147" rx="5" ry="6" fill="#efe3c8" stroke="${OUT}" stroke-width="1.6"/>`);
    // cabeça
    out.push(`<path d="M${100 - 15} 32 Q${100 - 17} 60 100 66 Q${100 + 17} 60 ${100 + 15} 32 Q100 18 ${100 - 15} 32 Z" fill="${flesh}" stroke="${OUT}" stroke-width="2.4"/>
      <circle cx="${100 - 16}" cy="44" r="4" fill="${flesh}" stroke="${OUT}" stroke-width="1.8"/><circle cx="${100 + 16}" cy="44" r="4" fill="${flesh}" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M${100 - 15} 50 Q100 70 ${100 + 15} 50 Q100 62 ${100 - 15} 50 Z" fill="${sd}" opacity=".18"/>`);
    if (!back) out.push(`<path d="M${100 - 11} 40 Q${100 - 7} 37 ${100 - 3} 40 M${100 + 3} 40 Q${100 + 7} 37 ${100 + 11} 40" stroke="${hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="${100 - 7}" cy="44" rx="3.4" ry="2.4" fill="#f4ead0" stroke="${OUT}" stroke-width="1"/><ellipse cx="${100 + 7}" cy="44" rx="3.4" ry="2.4" fill="#f4ead0" stroke="${OUT}" stroke-width="1"/>
      <circle cx="${100 - 7}" cy="44.4" r="1.9" fill="#3a2414"/><circle cx="${100 + 7}" cy="44.4" r="1.9" fill="#3a2414"/><circle cx="${100 - 7.6}" cy="43.6" r=".6" fill="#fff"/><circle cx="${100 + 6.4}" cy="43.6" r=".6" fill="#fff"/>
      <path d="M100 46 Q97 53 100 55 Q103 53 100 46" fill="${sd}" opacity=".55"/><path d="M${100 - 5} 59 Q100 62 ${100 + 5} 59" stroke="#7a2f2a" stroke-width="2" fill="none" stroke-linecap="round"/>`);
    // cabelo
    if (f) out.push(`<path d="M82 40 Q80 16 100 14 Q120 16 118 40 Q114 28 100 28 Q86 28 82 40 Z" fill="${hairG}" stroke="${OUT}" stroke-width="2"/><path d="M100 14 Q96 28 84 40 M100 14 Q104 28 116 40" stroke="${shade(hair, 0.3)}" stroke-width="1.4" fill="none" opacity=".7"/><path d="M118 40 Q132 64 128 100 Q124 120 120 124 M120 54 l8 4 M122 70 l8 4 M124 86 l6 4" stroke="${OUT}" stroke-width="1.4" fill="none"/><circle cx="121" cy="126" r="4" fill="#d4ac4c" stroke="${OUT}" stroke-width="1.4"/>`);
    else out.push(`<path d="M83 42 Q80 14 100 12 Q120 14 117 42 Q113 26 100 26 Q87 26 83 42 Z" fill="${hairG}" stroke="${OUT}" stroke-width="2"/><path d="M90 20 l-4 8 M100 16 l0 8 M110 20 l4 8 M95 24 l-2 6" stroke="${shade(hair, 0.35)}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><path d="M85 52 Q88 72 100 74 Q112 72 115 52 Q111 64 100 64 Q89 64 85 52 Z" fill="${hairG}" stroke="${OUT}" stroke-width="1.8"/>`);
    if (back) {   // por trás: o cabelo cobre a nuca
      out.push(`<path d="M83 44 Q79 12 100 10 Q121 12 117 44 Q116 66 100 70 Q84 66 83 44 Z" fill="${hairG}" stroke="${OUT}" stroke-width="2"/><path d="M100 12 Q96 40 100 68 M90 22 Q88 44 94 62 M110 22 Q112 44 106 62" stroke="${shade(hair, 0.3)}" stroke-width="1.3" fill="none" opacity=".7"/>`);
      if (f) out.push(`<path d="M84 52 Q76 90 84 112 Q100 120 116 112 Q124 90 116 52 Q100 64 84 52 Z" fill="${hairG}" stroke="${OUT}" stroke-width="2"/>`);
    }
    // equipamentos
    if (eq.botas) out.push(boots(c, eq.botas));
    if (eq.armadura) out.push(armor(c, eq.armadura, d));
    if (eq.amuleto && !back) out.push(amulet(c, eq.amuleto));
    if (eq.luvas) out.push(gloves(c, eq.luvas));
    if (eq.elmo) out.push(back ? helmetBack(c, eq.elmo) : helmet(c, eq.elmo));
    if (eq.arma) out.push(weapon(c, eq.arma));
    if (eq.escudo) out.push(shield(c, eq.escudo));
    if (eq.runas) out.push(runes(eq.runas));
    const cls = opts && opts.cls ? ` class="${opts.cls}"` : '';
    const filt = Art.GRAIN ? `<filter id="${c.id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="t"/><feColorMatrix in="t" type="matrix" values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 1 0" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply" result="b"/><feComposite in="b" in2="SourceAlpha" operator="in"/></filter>` : '';
    return `<svg${cls} viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar do herói"><defs>${c.defs.join('')}${filt}</defs><g${Art.GRAIN ? ` filter="url(#${c.id}n)"` : ''}><g${back ? ' transform="translate(200 0) scale(-1 1)"' : ''}>${out.join('')}</g></g></svg>`;
  };
  root.Avatar = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
