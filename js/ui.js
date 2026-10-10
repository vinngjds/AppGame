/* Era da Pedra v2 — interface (mobile first) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const view = $('#view'), top = $('#top'), nav = $('#nav'), overlay = $('#overlay'), modal = $('#modal'), toastEl = $('#toast');
  let st = G.load();
  let jTab = 'mapa', screen = 'mapa', shopTab = 'equip', shopSet = null, bagFilter = 'todos', bagSort = 'poder', forgeTab = 'melhorar';
  let fight = null, busy = false, lastSnap = '';

  const TABS = [['mapa', '🗺️', 'Jornada'], ['heroi', '🧍', 'Herói'], ['arvore', '🌳', 'Árvore'], ['bau', '🧳', 'Baú'], ['loja', '🛒', 'Loja'], ['treino', '💪', 'Treino'], ['eventos', '🎉', 'Eventos']];
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
  const save = () => G.save(st);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const buzz = (ms) => {
    try {
      const hp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (hp) hp.vibrate({ duration: ms }); else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* ignore */ }
  };
  const rarColor = (it) => G.RARITIES[it.rarity].color;
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`; };

  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.hidden = true), 2400);
  }

  /* ---------- Cabeçalho / navegação ---------- */
  function renderTop() {
    const s = G.heroStats(st), need = G.xpToNext(st.level);
    const pct = st.level >= G.MAX_LEVEL ? 100 : Math.floor((st.xp / need) * 100);
    top.innerHTML = `
      <div class="toprow"><div class="title">🦴 ERA DA PEDRA${G.isVip(st) ? ' <span class="vipbadge">👑 VIP</span>' : ''}</div><div><span class="gold">🪙 ${fmt(st.gold)}</span> <span class="gold" style="margin-left:6px">🦴 ${fmt(st.ossos)}</span> <span class="gold gem" style="margin-left:6px" title="Diamantes">💎 ${fmt(st.diamonds || 0)}</span> <button class="btn sm" data-act="menu" style="margin-left:6px">⚙️</button></div></div>
      <div class="stats"><span>⚔️ ${fmt(s.atk)}</span><span>❤️ ${fmt(s.hp)}</span><span>🛡️ ${fmt(s.arm)}</span><span>🎯 ${s.crit.toFixed(0)}%</span></div>
      <div class="xpbar"><b>⬆ ${st.level}</b><div class="bar"><i style="width:${pct}%"></i></div><b>${st.level >= G.MAX_LEVEL ? 'MÁX' : pct + '%'}</b></div>`;
    const free = G.skillPoints(st).free;
    nav.innerHTML = TABS.map(([id, ic, nm]) => `<button data-nav="${id}" class="${id === screen ? 'on' : ''}"><span>${ic}</span>${nm}${id === 'arvore' && (free > 0 || !st.cls) ? `<i class="badge">${st.cls ? free : '!'}</i>` : ''}</button>`).join('');
  }
  function render() {
    G.syncTime(st);
    renderTop();
    ({ mapa: vMapa, heroi: vHeroi, arvore: vArvore, bau: vBau, loja: vLoja, treino: vTreino, eventos: vEventos })[screen]();
    lastSnap = snapshot();
  }

  /* ---------- Util de interface ---------- */
  function hpBar(cur, max, cls) { return `<div class="bar ${cls || 'hp'}"><i style="width:${Math.max(0, (cur / max) * 100)}%"></i><div class="t">${fmt(cur)} / ${fmt(max)}</div></div>`; }
  function modTags(mods) { return mods.map((m) => `<span class="tag" title="${esc(G.MODS[m].desc)}">${G.MODS[m].icon} ${G.MODS[m].name}</span>`).join(''); }
  const KIND_LABEL = { normal: 'Fera', elite: 'Fera Veterana', semi: 'Semi-chefe', boss: 'Chefe', event: 'Chefe de Evento', dragon: 'Dragão' };

  function statLine(it) {
    if (it.rune) return `${G.RUNES[it.rune.t].icon} +${G.runeValue(it)}${G.RUNES[it.rune.t].unit}`;
    const s = G.itemStats(it), p = [];
    if (s.atk) p.push(`⚔️ +${s.atk}`); if (s.hp) p.push(`❤️ +${s.hp}`); if (s.arm) p.push(`🛡️ +${s.arm}`); if (s.crit) p.push(`🎯 +${s.crit}%`);
    return p.join(' · ');
  }
  function diffLine(it) {
    if (it.rune) return '';
    const cur = st.equipped[it.slot];
    if (cur && cur.id === it.id) return '';
    const a = G.itemStats(it), b = cur ? G.itemStats(cur) : { atk: 0, hp: 0, arm: 0, crit: 0 };
    const part = (ic, d) => (d ? `<span class="${d > 0 ? 'up' : 'down'}">${ic}${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}</span>` : '');
    const out = [part('⚔️', a.atk - b.atk), part('❤️', a.hp - b.hp), part('🛡️', a.arm - b.arm), part('🎯', a.crit - b.crit)].filter(Boolean).join(' ');
    return out ? `<div class="stat">vs equipado: ${out}</div>` : '';
  }
  function betterThanEquipped(it) {
    if (it.rune) { const eq = st.equipped.runas; return eq.some((x) => !x) || eq.some((x) => G.itemScore(it) > G.itemScore(x)); }
    return G.itemScore(it) > G.itemScore(st.equipped[it.slot]);
  }
  function itemRow(it, right, attr, price) {
    const arrow = betterThanEquipped(it) && !isEquipped(it) ? '<span class="up">▲</span>' : '';
    return `<div class="item" ${attr || `data-item="${it.id}"`} style="border-color:${rarColor(it)}">
      <div class="pic ic" style="border-color:${rarColor(it)}">${ItemArt.icon(it)}</div>
      <div class="grow"><div class="name" style="color:${rarColor(it)}">${it.lock ? '🔒 ' : ''}${esc(G.itemName(it))}${it.plus ? ' +' + it.plus : ''} ${arrow}</div>
      <div class="stat">${G.RARITIES[it.rarity].name} · nv ${it.ilvl} · ${G.SLOTS[it.slot].name}</div><div class="stat">${statLine(it)}</div>${price ? '' : diffLine(it)}</div>${right || ''}</div>`;
  }
  function isEquipped(it) { return it.rune ? st.equipped.runas.some((x) => x && x.id === it.id) : !!(st.equipped[it.slot] && st.equipped[it.slot].id === it.id); }
  function openModal(html) { modal.innerHTML = `<div class="sheet">${html}</div>`; modal.hidden = false; }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

  /* ---------- Pular espera com ouro ---------- */
  function waitRow() {
    const zero = st.energy <= 0, mx = G.maxEnergy(st);
    return `<div class="row waitrow"><button class="btn sm" data-act="buyen" ${st.energy < mx ? '' : 'disabled'}>⚡ +1 encontro · 🪙 ${fmt(G.energyBuyCost(st))}</button>
      <button class="btn sm ${zero ? 'go' : ''}" data-act="resetEn" ${zero ? '' : 'disabled'}>♻️ Restaurar tudo · 🪙 ${fmt(G.energyResetCost(st))}</button></div>`;
  }

  /* ---------- Caçar ---------- */
  function bonusBanner(d) {
    return G.bonusEvents(d).map((e) => `<div class="card event"><div class="row"><div class="pic">${e.icon}</div><div class="grow"><div class="name">${e.name}</div><div class="sub">${e.desc}</div></div></div></div>`).join('');
  }
  const boxChip = (bx, extra) => `<div class="box t${bx.tier}" ${extra || ''} style="border-color:${G.RARITIES[bx.tier - 1].color};box-shadow:0 0 8px ${G.RARITIES[bx.tier - 1].color}66 inset">${ItemArt.box(bx.tier)}<b style="color:${G.RARITIES[bx.tier - 1].color}">+${bx.tier}</b></div>`;
  function boxRange(kind, z) {
    const pw = G.boxPower(kind, z), lo = Math.max(1, Math.round(pw - 0.8)), hi = Math.min(5, Math.round(pw + 0.8));
    return lo === hi ? `+${lo}` : `+${lo} a +${hi}`;
  }
  // desenho do mapa: 15 locais ligados por uma trilha
  function mapSvg() {
    const W = 360, gap = 116, top = 52, H = top + gap * 14 + 90;
    const pts = G.ZONES.map((z, i) => ({ x: 180 + 100 * Math.sin(i * 1.25), y: top + i * gap }));
    let paths = '', deco = '', nodes = '';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], done = G.zoneCleared(st, i);
      paths += `<path d="M${a.x} ${a.y} C${a.x} ${a.y + gap * 0.6},${b.x} ${b.y - gap * 0.6},${b.x} ${b.y}" fill="none" stroke="${done ? '#e0a83e' : '#6b5a44'}" stroke-width="${done ? 6 : 5}" stroke-linecap="round" ${done ? '' : 'stroke-dasharray="2 11"'} opacity="${done ? 1 : 0.8}"/>`;
    }
    G.ZONES.forEach((z, i) => {
      const p = pts[i], prog = G.zoneProgress(st, z.id), unlocked = G.zoneUnlocked(st, z.id), cleared = prog >= 4, cur = z.id === G.currentZone(st) && !st.finished;
      const pips = [0, 1, 2, 3].map((k) => `<circle cx="${p.x - 21 + k * 14}" cy="${p.y + 46}" r="4.5" fill="${prog > k ? '#e0a83e' : '#0b0705'}" stroke="${k === 3 ? '#d0583a' : k === 2 ? '#d9822b' : '#8a6e4a'}" stroke-width="1.6"/>`).join('');
      nodes += `<g data-zone="${z.id}" class="mnode ${unlocked ? '' : 'locked'}" role="button" aria-label="${esc(z.name)}">
        ${cur ? `<circle cx="${p.x}" cy="${p.y}" r="38" fill="none" stroke="#ffd24a" stroke-width="3" class="pulse"/>` : ''}
        <circle cx="${p.x}" cy="${p.y}" r="31" fill="${z.color}" stroke="${cleared ? '#e0a83e' : unlocked ? '#c9a678' : '#5a4a38'}" stroke-width="${cleared ? 5 : 3.5}"/>
        <text x="${p.x}" y="${p.y + 11}" font-size="30" text-anchor="middle">${z.icon}</text>
        <text x="${p.x}" y="${p.y + 66}" font-size="12.5" font-weight="bold" text-anchor="middle" fill="#efe3c8" stroke="#000" stroke-width="3" paint-order="stroke">${z.id}. ${esc(z.name)}</text>
        ${pips}
        ${!unlocked ? `<text x="${p.x + 24}" y="${p.y - 20}" font-size="18" text-anchor="middle">🔒</text>` : ''}
        ${cleared ? `<circle cx="${p.x + 24}" cy="${p.y - 22}" r="11" fill="#e0a83e" stroke="#000" stroke-width="2"/><text x="${p.x + 24}" y="${p.y - 17}" font-size="14" font-weight="bold" text-anchor="middle" fill="#2a1d13">✓</text>` : ''}
      </g>`;
    });
    return `<svg class="map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa da jornada">
      <defs><linearGradient id="mp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a1a"/><stop offset=".5" stop-color="#2e2415"/><stop offset="1" stop-color="#3b1f1a"/></linearGradient></defs>
      <rect width="${W}" height="${H}" rx="14" fill="url(#mp)"/>${deco}${paths}${nodes}</svg>`;
  }
  function dragonCard(id) {
    const d = G.DRAGONS[id], chk = G.canFightDragon(st, id), left = G.dragonLeft(st, id), unlocked = G.dragonUnlocked(st, id);
    const mon = G.dragonMonster(id), blue = id === 'azul';
    return `<div class="card dragon ${id}"><div class="row"><div class="pic art big">${Art.monster(mon)}</div><div class="grow">
      <div class="name">${d.name} · nível ${d.level}</div><div class="sub">${d.blurb}</div><div class="tags">${modTags(d.mods)}<span class="tag">💥 ${d.sp}</span></div></div></div>
      <div class="sub" style="margin-top:6px">Recompensa: 📦 Caixas ${blue ? '+4 / +5' : '+3 / +4'} · troféu ${d.tIcon} ${G.bonusText(d.bonus)}</div>
      <div class="sub">Volta a cada 5 minutos.</div>
      ${!unlocked ? `<button class="btn" disabled>🔒 Vença ${d.unlockZone} locais (${G.zonesCleared(st)}/${d.unlockZone})</button>`
        : left > 0 ? `<div class="row waitrow"><button class="btn sm" disabled>⏳ Volta em <span data-live="dr-${id}">${mmss(left)}</span></button><button class="btn sm" data-skipdr="${id}">⏩ Chamar agora · 🪙 <span data-live="drcost-${id}">${G.dragonSkipCost(st, id)}</span></button></div>`
        : `<button class="btn red" data-dragon="${id}" ${chk.ok ? '' : 'disabled'}>🔥 Desafiar o ${d.name}</button>${chk.ok ? '' : `<div class="sub center" style="margin-top:6px">${chk.msg}</div>`}`}</div>`;
  }
  function vMapa() {
    const s = G.heroStats(st), mxEn = G.maxEnergy(st);
    const cz = G.currentZone(st), Z = G.ZONES[cz - 1], prog = G.zoneProgress(st, cz);
    const nextEn = st.energy < mxEn ? Math.ceil(G.energySecs(st) - (Date.now() - st.energyAt) / 1000) : 0;
    let h = bonusBanner(new Date());
    h += `<div class="card"><div class="sub">Vida do herói</div>${hpBar(st.hp, s.hp)}
      <div class="row" style="margin-top:8px"><div class="grow sub">🧪 ${st.potions.small} pequenas · ${st.potions.large} grandes</div>
      <button class="btn sm" data-act="rest" ${G.restCost(st) <= 0 ? 'disabled' : ''}>🔥 Descansar · 🪙 ${G.restCost(st)}</button></div></div>`;
    h += `<div class="card"><div class="row"><div class="grow"><div class="name">⚡ Encontros: <span data-live="en">${st.energy}</span>/${mxEn}${G.isVip(st) ? ' <span class="vipbadge">👑 x2</span>' : ''}</div>
      <div class="sub">${st.energy < mxEn ? `próximo em <span data-live="ent">${mmss(nextEn)}</span>` : 'cheio — pode lutar sem esperar'}${st.energy <= 0 ? ' · <b class="down">acabaram!</b>' : ''}</div></div></div>${waitRow()}</div>`;
    h += `<div class="chips" style="margin-top:4px"><button data-jt="mapa" class="${jTab === 'mapa' ? 'on' : ''}">🗺️ Mapa</button><button data-jt="drag" class="${jTab === 'drag' ? 'on' : ''}">🐉 Dragões</button></div>`;
    if (jTab === 'drag') { view.innerHTML = h + `<h2 class="banner">🐉 Covil dos Dragões</h2>${dragonCard('verde')}${dragonCard('azul')}`; return; }
    if (st.finished) h += `<div class="card center"><div class="big">👑</div><div class="name">Você recuperou o fogo sagrado!</div><div class="sub">Os 15 locais foram vencidos. Rejogue os locais, enfrente os dragões e os eventos até o nível ${G.MAX_LEVEL}.</div></div>`;
    else {
      const nextStep = Math.min(3, prog), mon = G.stepMonster(cz, nextStep, true), chk = G.canFightZone(st, cz, nextStep);
      h += `<h2 class="banner">📍 Local atual</h2><div class="card ${nextStep === 3 ? 'boss' : nextStep === 2 ? 'semi' : ''}">
        <div class="row"><div class="pic art">${Art.monster(mon)}</div><div class="grow"><div class="name">${cz}. ${Z.name}</div><div class="sub">Próxima luta ${nextStep + 1}/4: ${mon.emoji} ${esc(mon.name)} · nv ${mon.level}</div>
        <div class="sub">${G.STEPS[nextStep].label} · 📦 Caixa ${boxRange(G.STEPS[nextStep].kind, cz)} · custa ${G.STEP_COST[nextStep]} ⚡</div></div></div>
        <div class="prog">${[0, 1, 2, 3].map((k) => `<b class="${prog > k ? 'on' : ''} ${k === 2 ? 'semi' : ''}"></b>`).join('')}</div>
        <button class="btn ${nextStep === 3 ? 'red' : 'go'}" data-step="${cz}:${nextStep}" ${chk.ok ? '' : 'disabled'}>${nextStep === 3 ? '⚔️ Enfrentar o Chefe' : nextStep === 2 ? '🐾 Enfrentar o Semi-chefe' : '🏹 Lutar'}</button>
        ${chk.ok ? '' : `<div class="sub center" style="margin-top:6px">${chk.msg}</div>`}
        <button class="btn" data-zone="${cz}">📜 Ver o local</button></div>`;
    }
    h += `<h2 class="banner">🗺️ Mapa da Jornada (${G.zonesCleared(st)}/15)</h2><div class="sub center" style="margin-bottom:8px">Toque num local para ver a história e as 4 lutas.</div><div class="mapwrap">${mapSvg()}</div>`;
    view.innerHTML = h;
  }

  // Painel de um local: história + 4 lutas
  function showZone(z) {
    const Z = G.ZONES[z - 1], prog = G.zoneProgress(st, z), unlocked = G.zoneUnlocked(st, z);
    if (!unlocked) { return openModal(`<h2 class="banner">🔒 ${Z.name}</h2><div class="sub center">Vença o chefe de <b>${G.ZONES[z - 2].name}</b> para chegar aqui.</div><button class="btn" data-close>Fechar</button>`); }
    const rows = G.STEPS.map((stp, i) => {
      const mon = G.stepMonster(z, i, true), chk = G.canFightZone(st, z, i), done = i < prog, next = i === prog;
      const btn = done ? `<button class="btn sm" data-step="${z}:${i}" ${chk.ok ? '' : 'disabled'}>↻ Rejogar</button>` : next ? `<button class="btn sm ${i === 3 ? 'red' : 'go'}" data-step="${z}:${i}" ${chk.ok ? '' : 'disabled'}>⚔️ Lutar</button>` : '<span class="sub">🔒</span>';
      return `<div class="item" data-noop style="border-color:${i === 3 ? '#a8452b' : i === 2 ? '#d9822b' : 'var(--edge)'}"><div class="pic art">${Art.monster(mon)}</div><div class="grow">
        <div class="name">${done ? '✅ ' : ''}${i + 1}. ${esc(mon.name)}</div><div class="stat">${stp.label} · nível ${mon.level} · ${G.STEP_COST[i]} ⚡</div>
        <div class="stat">📦 Caixa ${boxRange(stp.kind, z)}${i === 3 ? ` · 🏆 ${Z.boss.trophy} (${G.bonusText(G.trophyBonus(z))})` : ''}</div><div class="tags" style="margin-top:2px">${modTags(mon.mods)}</div></div>${btn}</div>`;
    }).join('');
    openModal(`<h2 class="banner">${Z.icon} ${z}. ${Z.name}</h2><div class="sub" style="line-height:1.5;margin-bottom:8px">${Z.story}</div>
      ${prog >= 4 ? `<div class="card center"><div class="sub" style="line-height:1.5">📜 ${Z.clear}</div></div>` : ''}${rows}
      <div class="sub center" style="margin-top:6px">Rejogar rende 60% de XP e ouro.</div><button class="btn" data-close>Fechar</button>`);
  }

  /* ---------- Herói (boneco) ---------- */
  function slotBox(slot, ri) {
    const it = slot === 'runa' ? st.equipped.runas[ri] : st.equipped[slot];
    const attr = it ? `data-item="${it.id}"` : `data-empty="${slot}" data-ri="${ri == null ? '' : ri}"`;
    return it
      ? `<div class="slot" ${attr} style="border-color:${rarColor(it)};box-shadow:0 0 8px ${rarColor(it)}55 inset">${ItemArt.icon(it)}${it.plus ? `<small>+${it.plus}</small>` : ''}</div>`
      : `<div class="slot empty" ${attr} title="${G.SLOTS[slot].name}">${G.SLOTS[slot].icon}<small>${G.SLOTS[slot].name}</small></div>`;
  }
  function doll() {
    return `<div class="doll"><div class="col">${['elmo', 'armadura', 'luvas', 'botas'].map((s) => slotBox(s)).join('')}</div>
      <div class="figure">${Avatar.svg(st.avatar, st.equipped)}</div>
      <div class="col">${['arma', 'escudo', 'amuleto'].map((s) => slotBox(s)).join('')}<div class="slot ghost"></div></div></div>
      <div class="sub center" style="margin:8px 0 4px">Runas</div><div class="runes">${[0, 1, 2].map((i) => slotBox('runa', i)).join('')}</div>`;
  }
  function vHeroi() {
    const s = G.heroStats(st);
    const bt = G.BOSSES.map((b) => { const got = st.trophies.includes(b.no); return `<div class="t ${got ? '' : 'lock'}"><div class="e">${got ? b.tIcon : '❔'}</div><b>${got ? b.trophy : 'Chefe ' + b.no}</b><div class="muted">${got ? b.name : 'Bloqueado'}</div><div class="bonus">${G.bonusText(G.trophyBonus(b.no))}</div></div>`; }).join('');
    const dt = Object.values(G.DRAGONS).map((d) => { const got = st.dragonTrophies.includes(d.id); return `<div class="t ${got ? '' : 'lock'}"><div class="e">${got ? d.tIcon : '❔'}</div><b>${got ? d.trophy : d.name}</b><div class="muted">${got ? d.name : 'Bloqueado'}</div><div class="bonus">${G.bonusText(d.bonus)}</div></div>`; }).join('');
    const tt = G.trophyTotals(st);
    const ttLine = ['atk', 'hp', 'arm', 'crit'].map((k) => `<span>${G.TB_ICON[k]} +${Math.round(tt[k] * 10) / 10}${k === 'crit' ? '' : '%'}</span>`).join(' · ');
    const et = st.evTrophies.length ? st.evTrophies.slice().reverse().map((t) => `<div class="t"><div class="e">${t.icon}</div><b>${esc(t.name)}</b><div class="muted">${t.type === 'weekly' ? 'Semanal' : 'Mensal'}</div>${t.bonus ? `<div class="bonus">${G.bonusText(t.bonus)}</div>` : ''}</div>`).join('') : '<div class="sub">Vença os chefes de evento para ganhar troféus especiais.</div>';
    view.innerHTML = `<div class="card center"><div class="name">${esc(st.name)} · Nível ${st.level}${st.cls ? ` · ${G.classIcon(st)} ${G.classTitle(st)}` : ''}${G.isVip(st) ? ' · 👑' : ''}</div>
      <div class="sub">Chefes: ${st.trophies.length}/15 · Feras abatidas: ${st.totalKills}</div>${doll()}<div class="sub" style="margin-top:6px">Toque num espaço para equipar ou ver detalhes.</div></div>
      <div class="card"><div class="name">Atributos</div><div class="hr"></div>
      <div class="row"><span class="grow">⚔️ Força</span><b>${fmt(s.atk)}</b></div><div class="row"><span class="grow">❤️ Vida</span><b>${fmt(s.hp)}</b></div>
      <div class="row"><span class="grow">🛡️ Armadura</span><b>${fmt(s.arm)}</b></div><div class="row"><span class="grow">🎯 Crítico</span><b>${s.crit.toFixed(1)}% (x${s.critDmg.toFixed(2)})</b></div>
      <div class="row"><span class="grow">🩸 Vida roubada</span><b>${s.vamp.toFixed(1)}%</b></div><div class="row"><span class="grow">💨 Esquiva</span><b>${s.dodge.toFixed(0)}%</b></div></div>
      ${collectionCard()}
      <h2 class="banner">Troféus de Chefes (${st.trophies.length}/15)</h2>
      <div class="card center"><div class="name">Bônus vitalício dos troféus</div><div class="sub" style="margin-top:4px">${ttLine}</div><div class="sub">Cada troféu dá um bônus permanente de atributo.</div></div><div class="troph">${bt}</div>
      <h2 class="banner" style="margin-top:14px">Troféus de Dragões (${st.dragonTrophies.length}/2)</h2><div class="troph">${dt}</div>
      <h2 class="banner" style="margin-top:14px">Troféus de Eventos (${st.evTrophies.length})</h2><div class="troph">${et}</div>`;
  }

  /* ---------- Coleção de itens ---------- */
  function collectionCard() {
    const c = G.collection(st);
    return `<div class="card"><div class="row"><div class="grow"><div class="name">📖 Coleção de Itens</div><div class="sub">${c.found}/${c.total} descobertos · ${c.done}/6 conjuntos completos</div>
      <div class="sub up">Bônus de coleção: +${c.bonus}% de Força, Vida e Armadura</div></div><button class="btn sm" data-act="codex">Abrir</button></div>
      <div class="bar" style="margin-top:8px"><i style="width:${(100 * c.found) / c.total}%"></i></div></div>`;
  }
  function showCodex() {
    const c = G.collection(st), cx = st.codex || {};
    let h = `<h2 class="banner">📖 Coleção de Itens</h2><div class="sub center" style="margin-bottom:8px">${c.found}/${c.total} descobertos. Cada conjunto completo dá <b>+${G.COLLECTION_BONUS}%</b> de Força, Vida e Armadura para sempre.</div>`;
    G.MATERIALS.forEach((mat, t) => {
      const f = c.fam[t];
      h += `<div class="cfam ${f.complete ? 'done' : ''}"><div class="row"><div class="grow name">${f.complete ? '✅ ' : ''}${mat}</div><span class="sub">${f.have}/7</span></div><div class="cgrid">`;
      G.SLOT_ORDER.forEach((sl) => {
        const got = cx[`${sl}:${t}`], it = { slot: sl, ilvl: t * 8 + 2, rarity: Math.min(4, t) };
        h += `<div class="cell ${got ? '' : 'lock'}" ${got ? `data-cdx="${sl}:${t}"` : ''}>${got ? ItemArt.icon(it) : ItemArt.silhouette(sl, t)}</div>`;
      });
      h += '</div></div>';
    });
    const f = c.fam[5];
    h += `<div class="cfam ${f.complete ? 'done' : ''}"><div class="row"><div class="grow name">${f.complete ? '✅ ' : ''}Runas esculpidas</div><span class="sub">${f.have}/5</span></div><div class="cgrid">`;
    Object.keys(G.RUNES).forEach((r, i) => { const got = cx['runa:' + r], it = { slot: 'runa', ilvl: 10, rarity: 2, rune: { t: r, v: 1 } }; h += `<div class="cell ${got ? '' : 'lock'}" ${got ? `data-cdx="runa:${r}"` : ''}>${got ? ItemArt.icon(it) : ItemArt.silhouette('runa')}</div>`; });
    h += '</div></div><button class="btn" data-close>Fechar</button>';
    openModal(h);
  }
  function showCodexEntry(key) {
    const [a, b] = key.split(':');
    if (a === 'runa') { const it = { slot: 'runa', ilvl: 10, rarity: 2, rune: { t: b, v: 1 } }; return openModal(`<div class="cdetail">${ItemArt.icon(it)}</div><h2 class="banner">Runa da ${G.RUNES[b].name}</h2><div class="flavor">${esc(G.itemDesc(it))}</div><button class="btn" data-act="codex">Voltar</button>`); }
    const t = +b, it = { slot: a, ilvl: t * 8 + 2, rarity: Math.min(4, t) };
    openModal(`<div class="cdetail">${ItemArt.icon(it)}</div><h2 class="banner">${esc(G.itemName(it))}</h2><div class="flavor"><b>${G.MATERIALS[t]}</b> — ${esc(G.itemDesc(it))}</div><div class="sub center">Nível de item a partir de ${t * 8}</div><button class="btn" data-act="codex">Voltar</button>`);
  }

  /* ---------- Classes e árvore de habilidades ---------- */
  function classCards() {
    return G.CLASS_ORDER.map((id) => {
      const c = G.CLASSES[id];
      const sample = G.TREE.filter((d) => d.cls === id && d.type === 'active' && d.tier <= 2).slice(0, 4).map((d) => `${d.icon} ${d.name}`).join(' · ');
      return `<div class="card class" style="border-color:${c.color}"><div class="row"><div class="pic" style="font-size:38px">${c.icon}</div><div class="grow"><div class="name">${c.name}</div><div class="sub">${c.blurb}</div></div></div>
        <div class="sub up" style="margin-top:6px">Bônus: ${c.bonusText}</div><div class="sub">Ramos: ${c.branches.map((b) => b[1] + ' ' + b[0]).join(' · ')}</div><div class="sub">${sample}…</div>
        <button class="btn go" data-cls="${id}">Ser ${c.name}</button></div>`;
    }).join('');
  }
  function showClassPick(first) {
    openModal(`<h2 class="banner">Escolha sua classe</h2><div class="sub center" style="margin-bottom:8px">Sua classe define a árvore de habilidades. A cada nível você ganha 1 ponto. Para trocar depois, é preciso redefinir a árvore (custa ouro).</div>${classCards()}`);
  }
  const nodeState = (d) => { const r = G.treeRank(st, d.id), c = G.canLearn(st, d.id); return r >= G.TREE_MAX_RANK ? 'maxed learned' : c.ok ? (r > 0 ? 'learned avail' : 'avail') : r > 0 ? 'learned' : 'locked'; };
  const evoBonusText = (b) => [b.atkPct && `+${b.atkPct}% Força`, b.hpPct && `+${b.hpPct}% Vida`, b.armPct && `+${b.armPct}% Armadura`, b.crit && `+${b.crit} Crítico`, b.critDmg && `+${Math.round(b.critDmg * 100)}% dano crítico`,
    b.vamp && `+${b.vamp}% vida roubada`, b.dodge && `+${b.dodge}% esquiva`, b.dotMult && `+${b.dotMult}% veneno/fogo`, b.poisonChance && `+${Math.round(b.poisonChance * 100)}% de envenenar`, b.skillDmg && `+${b.skillDmg}% dano de habilidades`].filter(Boolean).join(', ');
  function evoCard(c) {
    const evs = G.EVOS[st.cls];
    if (st.evo != null) {
      const e = evs[st.evo], list = G.TREE.filter((d) => d.cls === st.cls && d.evo && d.branch === st.evo);
      return `<div class="card evo on"><div class="row"><div class="pic" style="font-size:34px">${e.icon}</div><div class="grow"><div class="name">${e.name}</div><div class="sub">${e.blurb}</div><div class="sub up">${evoBonusText(e.bonus)}</div></div></div>
        <div class="bhead" style="margin-top:8px">Habilidades de ${e.name}</div><div class="tchain two">${list.map((d) => {
        const r = G.treeRank(st, d.id), stt = nodeState(d), cost = G.canLearn(st, d.id).cost;
        return `<button class="tnode ${stt} ${d.type}" data-sk="${d.id}"><div class="ring">${d.icon}</div><div class="nm">${esc(d.name)}</div>
          <div class="pips">${[1, 2, 3].map((k) => `<b class="${r >= k ? 'on' : ''}"></b>`).join('')}</div>${r < G.TREE_MAX_RANK && cost ? `<span class="cp">${cost} pt</span>` : '<span class="cp">&nbsp;</span>'}</button>`;
      }).join('')}</div></div>`;
    }
    return `<div class="card evo"><div class="name">🌟 Evolução de classe</div><div class="sub">No nível ${G.EVO_LEVEL}, o caminho que você seguiu na árvore vira uma <b>nova classe</b>: bônus permanente e 2 habilidades exclusivas. Aprenda ao menos a 2ª habilidade de um ramo e escolha a evolução.</div>
      <div class="evolist">${c.branches.map((b, bi) => { const e = evs[bi], pp = G.branchPoints(st, bi), ck = G.canEvolve(st, bi);
        return `<button class="evobtn ${ck.ok ? 'ready' : ''}" data-evolve="${bi}"><div class="e">${e.icon}</div><b>${e.name}</b><span>${b[1]} ${b[0]} · ${pp} pt</span></button>`; }).join('')}</div></div>`;
  }
  function showEvolve(b) {
    const e = G.EVOS[st.cls][b], ck = G.canEvolve(st, b), sk = G.TREE.filter((d) => d.cls === st.cls && d.evo && d.branch === b);
    openModal(`<div class="row"><div class="pic" style="font-size:38px">${e.icon}</div><div class="grow"><div class="name">${e.name}</div><div class="sub">${G.CLASSES[st.cls].name} · ramo ${G.CLASSES[st.cls].branches[b][0]}</div></div></div>
      <div class="flavor">${e.blurb}</div><div class="sub up">Bônus permanente: ${evoBonusText(e.bonus)}</div><div class="hr"></div>
      ${sk.map((d) => `<div class="rank"><b>${d.icon} ${esc(d.name)}</b> <span class="tag">${d.type === 'active' ? 'ATIVA' : 'PASSIVA'}</span><div class="sub">${G.skillDesc(d, 1)}</div><div class="sub">Custo ${G.treeCost(d, 1)} pt · requer nível ${G.treeReqLevel(d, 1)}</div></div>`).join('')}
      <div class="sub" style="margin-top:6px">⚠️ A evolução é definitiva (até redefinir a árvore). Só as habilidades da sua evolução ficam disponíveis.</div>
      <button class="btn go" data-do-evolve="${b}" ${ck.ok ? '' : 'disabled'}>Evoluir · 🪙 ${fmt(G.evoCost(st))}</button>${ck.ok ? '' : `<div class="sub center down" style="margin-top:6px">${ck.msg}</div>`}<button class="btn" data-close>Fechar</button>`);
  }
  function vArvore() {
    if (!st.cls) { view.innerHTML = `<h2 class="banner">🌳 Árvore de Habilidades</h2><div class="sub center" style="margin-bottom:8px">Escolha uma classe para começar.</div>${classCards()}`; return; }
    const c = G.CLASSES[st.cls], pts = G.skillPoints(st);
    let h = `<div class="card" style="border-color:${c.color}"><div class="row"><div class="pic" style="font-size:36px">${G.classIcon(st)}</div><div class="grow"><div class="name">${G.classTitle(st)} · nível ${st.level}</div><div class="sub">${st.evo != null ? `${c.icon} ${c.name} → evolução` : c.bonusText}</div></div>
      <div class="ptsbox"><div class="pts">${pts.free}</div><div class="sub">pontos livres</div></div></div>
      <div class="sub" style="margin-top:6px">⭐ ${pts.spent} usados de ${pts.total} (1 por nível). Habilidades <b>ativas</b> (quadradas) viram botões na batalha; <b>passivas</b> (redondas) valem sempre.</div></div>`;
    h += evoCard(c);
    c.branches.forEach((b, bi) => {
      const list = G.TREE.filter((d) => d.cls === st.cls && d.branch === bi && !d.evo);
      h += `<div class="branch"><div class="bhead">${b[1]} ${b[0]}</div><div class="tchain">${list.map((d) => {
        const r = G.treeRank(st, d.id), stt = nodeState(d), cost = G.canLearn(st, d.id).cost;
        return `<button class="tnode ${stt} ${d.type}" data-sk="${d.id}"><div class="ring">${d.icon}</div><div class="nm">${esc(d.name)}</div>
          <div class="pips">${[1, 2, 3].map((k) => `<b class="${r >= k ? 'on' : ''}"></b>`).join('')}</div>${r < G.TREE_MAX_RANK && cost ? `<span class="cp">${cost} pt</span>` : '<span class="cp">&nbsp;</span>'}</button>`;
      }).join('')}</div></div>`;
    });
    h += `<button class="btn red" data-act="respec">↺ Redefinir árvore e classe · 🪙 ${fmt(G.respecCost(st))}</button>`;
    view.innerHTML = h;
  }
  function showSkill(id) {
    const d = G.TREE_BY_ID[id], r = G.treeRank(st, id), c = G.canLearn(st, id);
    const rows = [1, 2, 3].map((k) => `<div class="rank ${r >= k ? 'got' : ''}"><b>Nível ${k}</b> ${r >= k ? '✅' : ''}<div class="sub">${G.skillDesc(d, k)}</div><div class="sub">Custo: ${G.treeCost(d, k)} pt · requer nível ${G.treeReqLevel(d, k)} do herói</div></div>`).join('');
    const btn = r >= G.TREE_MAX_RANK ? '<button class="btn" disabled>Nível máximo</button>' : `<button class="btn go" data-learn="${id}" ${c.ok ? '' : 'disabled'}>${r ? 'Melhorar' : 'Aprender'} · ${c.cost || G.treeCost(d, r + 1)} pt</button>${c.ok ? '' : `<div class="sub center down" style="margin-top:6px">${c.msg}</div>`}`;
    openModal(`<div class="row"><div class="pic" style="font-size:36px;border-radius:${d.type === 'active' ? 12 : 50}%">${d.icon}</div><div class="grow"><div class="name">${esc(d.name)}</div><div class="sub"><span class="tag">${d.type === 'active' ? 'ATIVA · botão na batalha' : 'PASSIVA'}</span> ${d.evo ? 'evolução' : 'tier ' + d.tier}${d.req ? ' · requer ' + esc(G.TREE_BY_ID[d.req].name) : ''}</div></div></div>${rows}${btn}<button class="btn" data-close>Fechar</button>`);
  }

  /* ---------- Itens: detalhe ---------- */
  function showItem(id) {
    const f = G.findItem(st, id); if (!f) return;
    const it = f.it, where = f.where;
    let h = itemRow(it, '', 'data-noop');
    h += `<div class="flavor"><b>${esc(G.itemMaterial(it))}</b> — ${esc(G.itemDesc(it))}</div>`;
    if (it.rune) {
      st.equipped.runas.forEach((r, i) => { if (r && r.id !== it.id) h += `<div class="sub">Runa ${i + 1}: ${esc(G.itemName(r))} — ${statLine(r)}</div>`; });
    } else if (st.equipped[it.slot] && st.equipped[it.slot].id !== it.id) h += `<div class="sub">Equipado: ${esc(G.itemName(st.equipped[it.slot]))} — ${statLine(st.equipped[it.slot])}</div>`;
    h += '<div class="hr"></div>';
    if (where === 'bag') {
      if (it.rune) h += [0, 1, 2].map((i) => `<button class="btn go" data-eq="${it.id}" data-ri="${i}">Equipar na runa ${i + 1}${st.equipped.runas[i] ? ' (troca)' : ''}</button>`).join('');
      else h += `<button class="btn go" data-eq="${it.id}">Equipar</button>`;
      h += `<button class="btn" data-lock="${it.id}">${it.lock ? '🔓 Destravar' : '🔒 Travar (protege de venda)'}</button>`;
    }
    if (where === 'eq') h += `<button class="btn" data-uneq="${it.slot}" data-ri="${st.equipped.runas.findIndex((x) => x && x.id === it.id)}">Desequipar</button>`;
    h += it.plus >= G.MAX_PLUS ? '<button class="btn" disabled>Ferreiro: nível máximo</button>' : `<button class="btn" data-go-forge="${it.id}">🔨 Melhorar no ferreiro</button>`;
    if (where === 'bag' && !it.lock) h += `<button class="btn" data-dis="${it.id}">♻️ Desmontar · 🦴 +${G.dismantleYield(it)}</button><button class="btn red" data-sell="${it.id}">Vender · 🪙 ${fmt(G.sellPrice(it))}</button>`;
    openModal(h + '<button class="btn" data-close>Fechar</button>');
  }
  function showEmptySlot(slot, ri) {
    const list = st.bag.filter((i) => i.slot === slot).sort((a, b) => G.itemScore(b) - G.itemScore(a));
    if (!list.length) return toast(`Nenhum item de ${G.SLOTS[slot].name.toLowerCase()} no baú. Compre na loja ou cace!`);
    openModal(`<h2 class="banner">Equipar ${G.SLOTS[slot].name}</h2>` + list.map((i) => itemRow(i, `<button class="btn sm go" data-eq="${i.id}" data-ri="${ri}">Equipar</button>`, 'data-noop')).join('') + '<button class="btn" data-close>Fechar</button>');
  }

  /* ---------- Caixas ---------- */
  function showOpened(items, title) {
    openModal(`<div class="big">📦</div><h2 class="banner">${title}</h2>` + items.map((i) => itemRow(i, '', 'data-noop', true)).join('') + '<button class="btn go" data-close>Continuar</button>');
  }
  function openOneBox(id) {
    const r = G.openBox(st, id);
    if (!r.ok) return toast(r.msg);
    buzz(30); save(); showOpened(r.items, `Caixa +${r.box.tier} aberta!${r.diamonds ? ' 💎 +' + r.diamonds : ''}`); render();
  }
  function openAllBoxes() {
    const got = []; let n = 0, dia = 0;
    for (const b of st.boxes.slice().sort((a, c) => c.tier - a.tier)) { const r = G.openBox(st, b.id); if (!r.ok) { if (!n) return toast(r.msg); break; } got.push(...r.items); dia += r.diamonds || 0; n++; }
    buzz(40); save(); showOpened(got.sort((a, b) => b.rarity - a.rarity), `${n} caixa(s) aberta(s)${dia ? ' · 💎 +' + dia : ''}`); render();
  }

  function showOdds() {
    const names = G.RARITIES.map((r) => `<span style="color:${r.color}">${r.name}</span>`);
    let h = `<h2 class="banner">📦 Chances das Caixas</h2><div class="sub center" style="margin-bottom:8px">Épicos, lendários e runas são raros: só as caixas mais altas os trazem. Peças épicas e lendárias do material certo entram nos conjuntos da loja. 💎 Diamantes também podem sair das caixas +4 e +5.</div>`;
    for (let t = 1; t <= 5; t++) {
      const od = G.BOX_ODDS[t - 1], tot = od.reduce((a, b) => a + b, 0);
      h += `<div class="cfam"><div class="row">${boxChip(G.makeBox(t, 1))}<div class="grow"><div class="name">Caixa +${t}</div><div class="sub">${G.BOX_ITEMS[t - 1]} item(ns) · 🔶 runa: ${Math.round(G.BOX_RUNE[t - 1] * 100)}% por item${G.BOX_DIAMOND[t - 1] ? ` · 💎 ${Math.round(G.BOX_DIAMOND[t - 1] * 100)}% de 1 diamante` : ''}</div></div></div>
        <div class="oddsbar">${od.map((v, i) => (v ? `<i style="width:${(100 * v) / tot}%;background:${G.RARITIES[i].color}" title="${G.RARITIES[i].name}"></i>` : '')).join('')}</div>
        <div class="odds">${od.map((v, i) => (v ? `<span>${names[i]} ${Math.round((100 * v) / tot * 10) / 10}%</span>` : '')).join('')}</div></div>`;
    }
    openModal(h + '<button class="btn" data-close>Fechar</button>');
  }

  /* ---------- Baú ---------- */
  const SORTS = { poder: (a, b) => G.itemScore(b) - G.itemScore(a), raridade: (a, b) => b.rarity - a.rarity || G.itemScore(b) - G.itemScore(a), nivel: (a, b) => b.ilvl - a.ilvl || b.rarity - a.rarity };
  function vBau() {
    const f = ['todos', ...G.SLOT_ORDER, 'runa'];
    const list = st.bag.filter((i) => bagFilter === 'todos' || i.slot === bagFilter).sort(SORTS[bagSort]);
    const bx = st.boxes.slice().sort((a, b) => b.tier - a.tier);
    const boxCard = `<div class="card"><div class="row"><div class="grow"><div class="name">📦 Caixas (${bx.length})</div><div class="sub">Toque numa caixa para abrir. Caixas maiores têm itens melhores.</div></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm go" data-act="openall" ${bx.length ? '' : 'disabled'}>Abrir todas</button><button class="btn sm" data-act="odds">ℹ️ Chances</button></div></div>
      ${bx.length ? `<div class="boxes">${bx.map((b) => boxChip(b, `data-box="${b.id}"`)).join('')}</div>` : '<div class="sub" style="margin-top:6px">Vença lutas na Jornada para ganhar caixas.</div>'}</div>`;
    view.innerHTML = `${boxCard}<h2 class="banner">Baú de Itens (${st.bag.length}/${st.bagSize})</h2>
      <div class="chips">${f.map((x) => `<button data-bf="${x}" class="${x === bagFilter ? 'on' : ''}">${x === 'todos' ? 'Todos' : G.SLOTS[x].icon}</button>`).join('')}</div>
      <div class="row" style="margin-bottom:8px"><button class="btn sm" data-act="sort">↕️ Ordem: ${bagSort}</button><div class="grow"></div><button class="btn sm red" data-act="bulk">🧹 Limpar baú</button></div>
      ${list.length ? list.map((i) => itemRow(i)).join('') : '<div class="card center muted">Nada por aqui. Cace feras para encontrar itens!</div>'}`;
  }
  function bulkMenu() {
    openModal(`<h2 class="banner">Limpar baú</h2><div class="sub" style="margin-bottom:8px">Itens travados 🔒 e itens melhores que o equipado nunca entram.</div>
      <button class="btn" data-bulk="sell:0">Vender todos os Comuns</button><button class="btn" data-bulk="sell:1">Vender até Incomuns</button>
      <button class="btn" data-bulk="dis:0">♻️ Desmontar todos os Comuns</button><button class="btn" data-bulk="dis:1">♻️ Desmontar até Incomuns</button><button class="btn" data-close>Fechar</button>`);
  }
  function doBulk(mode, max) {
    let total = 0, n = 0;
    for (const it of st.bag.slice()) {
      if (it.lock || it.rarity > max || betterThanEquipped(it)) continue;
      total += mode === 'sell' ? G.sell(st, it.id) : G.dismantle(st, it.id); n++;
    }
    toast(n ? (mode === 'sell' ? `${n} item(ns) vendidos: 🪙 ${fmt(total)}` : `${n} item(ns) desmontados: 🦴 ${fmt(total)}`) : 'Nenhum item elegível.');
    save(); closeModal(); render();
  }

  /* ---------- Loja ---------- */
  function diffBadge(it) {
    if (it.rune) return '';
    return diffLine(it);
  }
  /* ---------- Loja de conjuntos ---------- */
  const SET_SLOT_NAMES = { arma: 'Arma', escudo: 'Escudo', elmo: 'Elmo', armadura: 'Armadura', luvas: 'Luvas', botas: 'Botas', amuleto: 'Amuleto' };
  function setPreview(set) {
    const eq = { runas: [null, null, null] };
    for (const sl of G.SLOT_ORDER) eq[sl] = G.setPiece(st, set, sl);
    return Avatar.svg(st.avatar, eq);
  }
  function setPriceText(set) {
    const ps = G.SLOT_ORDER.map((sl) => G.setPrice(st, set, sl)), tot = ps.reduce((a, p) => a + p.n, 0);
    return set.cur === 'gem' ? `💎 ${fmt(tot)} (conjunto completo)` : `🪙 ${fmt(tot)} (conjunto completo)`;
  }
  function vSetList() {
    let h = `<div class="card"><div class="sub">Compre o conjunto <b>peça por peça</b>. Cada peça já vem pronta; juntando 3, 5 ou 7 do mesmo conjunto você ganha bônus de atributos. Os conjuntos mais fortes liberam com o nível do herói. O conjunto lendário só se compra com <b>💎 Diamantes</b>.</div></div>`;
    h += G.SETS.map((set) => {
      const un = G.setUnlocked(st, set), n = G.setProgress(st, set), col = G.RARITIES[set.rarity].color;
      return `<div class="item setcard ${un ? '' : 'locked'}" data-set="${set.id}" style="border-color:${col}"><div class="setpic">${setPreview(set)}</div>
        <div class="grow"><div class="name" style="color:${col}">${set.name}</div>
        <div class="stat">${G.RARITIES[set.rarity].name} · ${set.mat}</div>
        <div class="stat">${un ? `Peças: <b>${n}/7</b>` : `🔒 Alcance o nível ${set.minLevel}`}</div>
        <div class="stat">${setPriceText(set)}</div>
        ${un ? `<div class="bar"><i style="width:${(n / 7) * 100}%"></i><div class="t">${n}/7</div></div>` : ''}</div></div>`;
    }).join('');
    return h;
  }
  function vSetDetail(set) {
    const un = G.setUnlocked(st, set), n = G.setProgress(st, set), col = G.RARITIES[set.rarity].color;
    let h = `<button class="btn sm" data-set="">← Conjuntos</button>
      <div class="card setdet" style="border-color:${col}"><div class="row"><div class="setpic big">${setPreview(set)}</div><div class="grow">
        <div class="name" style="color:${col}">${set.name}</div><div class="sub">${G.RARITIES[set.rarity].name} · ${set.mat} · nível do item ${G.setIlvl(st, set)}</div>
        <div class="sub">Peças: <b>${n}/7</b></div><div class="bar"><i style="width:${(n / 7) * 100}%"></i><div class="t">${n}/7</div></div>
        <div class="sub" style="margin-top:6px">Bônus equipando: ${G.SET_BONUS.slice().reverse().map(([k, v]) => `${k} peças +${v}%`).join(' · ')} em Força, Vida e Armadura.</div>
        ${set.cur === 'gem' ? `<div class="sub">Você tem 💎 ${fmt(st.diamonds)}</div>` : ''}</div></div></div>`;
    if (!un) h += `<div class="card center"><b class="down">🔒 Alcance o nível ${set.minLevel} para comprar este conjunto.</b></div>`;
    h += G.SLOT_ORDER.map((sl) => {
      const it = G.setPiece(st, set, sl), p = G.setPrice(st, set, sl), own = G.setOwned(st, set, sl);
      const right = own ? '<span class="tag">✔ Comprado</span>' : `<div class="pricebox"><button class="btn sm go" data-buyset="${set.id}:${sl}" ${un ? '' : 'disabled'}>${p.cur === 'diamonds' ? '💎' : '🪙'} ${fmt(p.n)}</button></div>`;
      return itemRow(it, right, 'data-noop', true);
    }).join('');
    return h;
  }
  function vLoja() {
    const tabs = [['equip', '🛡️ Conjuntos'], ['runas', '🔶 Runas'], ['pocao', '🧪 Poções'], ['vender', '💰 Vender'], ['forja', '🔨 Ferreiro'], ['mochila', '🎒 Baú'], ['vip', '👑 VIP']];
    let h = `<h2 class="banner">Mercador</h2><div class="chips wrap">${tabs.map(([id, n]) => `<button data-st="${id}" class="${id === shopTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (shopTab === 'equip') {
      h += shopSet == null ? vSetList() : vSetDetail(G.SETS[shopSet]);
    } else if (shopTab === 'runas') {
      h += `<div class="card"><div class="sub">🔶 Runas só se compram com <b>💎 Diamantes</b> — raros: vêm de dragões, eventos e caixas +4/+5. Também saem de caixas altas. Você tem <b>💎 ${fmt(st.diamonds)}</b>.${st.level < G.RUNE_SHOP_LEVEL ? ` <b class="down">Disponível a partir do nível ${G.RUNE_SHOP_LEVEL}.</b>` : ''}</div></div>`;
      h += G.runeOffers(st).map((o) => {
        const it = G.makeRune(st.level, o.rarity, o.t), ok = st.level >= G.RUNE_SHOP_LEVEL;
        return itemRow(it, `<div class="pricebox"><button class="btn sm go" data-buyrune="${o.t}:${o.rarity}" ${ok ? '' : 'disabled'}>💎 ${o.price}</button></div>`, 'data-noop', true);
      }).join('');
    } else if (shopTab === 'pocao') {
      h += [['small', 'Poção Pequena', 'Recupera 35% da vida em combate'], ['large', 'Poção Grande', 'Recupera 65% da vida em combate']].map(([k, n, d]) =>
        `<div class="card"><div class="row"><div class="pic">🧪</div><div class="grow"><div class="name">${n} (x${st.potions[k]})</div><div class="sub">${d}</div></div>
        <button class="btn sm go" data-pot="${k}">🪙 ${fmt(G.potionPrice(st, k))}</button></div></div>`).join('');
      h += `<div class="card"><div class="row"><div class="pic">🔥</div><div class="grow"><div class="name">Fogueira</div><div class="sub">Cura toda a vida agora.</div></div><button class="btn sm" data-act="rest" ${G.restCost(st) <= 0 ? 'disabled' : ''}>🪙 ${G.restCost(st)}</button></div></div>`;
    } else if (shopTab === 'vender') {
      const list = st.bag.filter((i) => !i.lock).sort(SORTS.raridade);
      h += list.length ? list.map((i) => itemRow(i, `<button class="btn sm red" data-sellq="${i.id}">🪙 ${fmt(G.sellPrice(i))}</button>`, `data-item="${i.id}"`, true)).join('') : '<div class="card center muted">Nada para vender (itens travados não aparecem).</div>';
    } else if (shopTab === 'vip') {
      const vip = G.isVip(st), V = G.VIP;
      h += `<div class="card vip"><div class="big">👑</div><div class="name center">Passe VIP · ${V.days} dias</div>
        <ul class="vipl"><li>⚡ <b>${V.slots} encontros</b> (em vez de ${G.MAX_ENERGY}) e recarga ${Math.round((1 - V.regen) * 100)}% mais rápida</li><li>🪙 +${Math.round((V.gold - 1) * 100)}% de ouro e ⭐ +${Math.round((V.xp - 1) * 100)}% de XP</li><li>♻️ Restaurar encontros ${Math.round((1 - V.resetDiscount) * 100)}% mais barato</li><li>👑 Selo VIP no herói</li></ul>
        ${vip ? `<div class="sub center up">VIP ativo — restam <span data-live="vip">${mmss(G.vipLeft(st) / 1000)}</span></div>` : ''}
        <button class="btn go" data-act="buyvip">${vip ? 'Renovar' : 'Comprar'} · 💎 ${V.price}</button>
        <div class="sub center" style="margin-top:6px">Você tem 💎 ${fmt(st.diamonds)}. Diamantes são raros: dragões, eventos especiais e caixas +4/+5.</div></div>`;
    } else if (shopTab === 'forja') {
      h += vForja();
    } else {
      h += `<div class="card"><div class="row"><div class="pic">🎒</div><div class="grow"><div class="name">Ampliar o Baú</div><div class="sub">Capacidade atual: ${st.bagSize}/${G.BAG_MAX}. +5 vagas por compra.</div></div>
        <button class="btn sm go" data-act="bagup" ${st.bagSize >= G.BAG_MAX ? 'disabled' : ''}>🪙 ${fmt(G.bagUpgradeCost(st))}</button></div></div>`;
    }
    view.innerHTML = h;
  }

  /* ---------- Ferreiro ---------- */
  function vForja() {
    const forge = G.bonusMul(new Date()).forge;
    const tabs = [['melhorar', 'Melhorar'], ['desmontar', 'Desmontar'], ['fundir', 'Fundir runas']];
    let h = `<div class="card"><div class="sub">🦴 Ossos: <b>${fmt(st.ossos)}</b> · Melhorias dão +12% por nível (até +${G.MAX_PLUS}); acima de +2 podem falhar. Desmonte o que sobra para ganhar ossos.${forge < 1 ? ' <b class="up">Quarta da Forja: -25%!</b>' : ''}</div></div>
      <div class="seg">${tabs.map(([id, n]) => `<button data-ft="${id}" class="${id === forgeTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    if (forgeTab === 'melhorar') {
      const all = G.SLOT_ORDER.map((s) => st.equipped[s]).concat(st.equipped.runas).filter(Boolean).concat(st.bag);
      h += all.length ? all.map((i) => {
        const max = i.plus >= G.MAX_PLUS;
        return itemRow(i, max ? '<span class="sub">MÁX</span>' : `<div class="pricebox"><div class="sub">${Math.round(G.upgradeChance(i) * 100)}% de sucesso</div><button class="btn sm" data-upq="${i.id}">🪙 ${fmt(G.upgradeCost(i, forge))} · 🦴 ${G.upgradeOssos(i)}${G.upgradeDiamonds(i) ? ' · 💎 ' + G.upgradeDiamonds(i) : ''}</button></div>`, 'data-noop', true);
      }).join('') : '<div class="card center muted">Sem itens.</div>';
    } else if (forgeTab === 'desmontar') {
      const list = st.bag.filter((i) => !i.lock).sort(SORTS.raridade);
      h += list.length ? list.map((i) => itemRow(i, `<button class="btn sm" data-disq="${i.id}">🦴 +${G.dismantleYield(i)}</button>`, 'data-item="' + i.id + '"', true)).join('') : '<div class="card center muted">Nada para desmontar.</div>';
    } else {
      const gr = G.runeGroups(st);
      h += gr.length ? gr.map((g) => `<div class="card"><div class="row"><div class="pic">${G.RUNES[g.t].icon}</div><div class="grow"><div class="name">3x Runa ${G.RUNES[g.t].name} ${G.RARITIES[g.rarity].name}</div><div class="sub">→ 1 runa ${G.RARITIES[g.rarity + 1].name} · tem ${g.items.length}</div></div><button class="btn sm" data-fuse="${g.key}">🪙 ${G.fuseCost(g.rarity)}</button></div></div>`).join('')
        : '<div class="card center muted">Junte 3 runas iguais (mesmo tipo e raridade) para fundir numa melhor.</div>';
    }
    return h;
  }

  /* ---------- Treino (habilidades) ---------- */
  function vTreino() {
    let h = `<h2 class="banner">Treinamento</h2>`;
    if (st.training) {
      const sk = G.SKILLS[st.training.id], left = Math.max(0, (st.training.endsAt - Date.now()) / 1000);
      const total = G.skillTime({ skills: { [st.training.id]: st.training.from } }, st.training.id);
      h += `<div class="card boss"><div class="row"><div class="pic">${sk.icon}</div><div class="grow"><div class="name">Treinando: ${sk.name}</div>
        <div class="sub">Nível ${st.training.from} → ${st.training.from + 1} · faltam <b data-live="tr">${mmss(left)}</b></div></div></div>
        <div class="bar" style="margin-top:8px"><i data-live="trbar" style="width:${Math.min(100, 100 - (left / total) * 100)}%"></i></div>
        <button class="btn" data-act="speedup">⚡ Acelerar · 🪙 ${G.speedupCost(st)}</button></div>`;
    } else h += `<div class="card"><div class="sub">Nenhum treino em andamento. Escolha uma habilidade abaixo — o treino continua mesmo com o app fechado.</div></div>`;
    h += '<h2 class="banner">Habilidades</h2>';
    h += G.SKILL_ORDER.map((id) => {
      const sk = G.SKILLS[id], r = G.skillRank(st, id), maxed = r >= sk.max, req = G.skillReqLevel(st, id);
      const locked = st.level < req;
      return `<div class="card skill ${locked ? 'locked' : ''}"><div class="row"><div class="pic">${sk.icon}</div><div class="grow"><div class="name">${sk.name} <span class="muted">${r}/${sk.max}</span>${sk.active ? ' <span class="tag">ATIVA</span>' : ''}</div>
        <div class="sub">${r ? sk.desc(r) : 'Não aprendida'}${maxed ? '' : ` → <b>${sk.desc(r + 1)}</b>`}</div>
        ${maxed ? '<div class="sub up">Máximo!</div>' : `<div class="sub">${locked ? `🔒 Requer nível ${req}` : `⏱️ ${mmss(G.skillTime(st, id))} · 🪙 ${fmt(G.skillCost(st, id))}`}</div>`}</div>
        ${maxed ? '' : `<button class="btn sm go" data-train="${id}" ${locked || st.training ? 'disabled' : ''}>Treinar</button>`}</div></div>`;
    }).join('');
    view.innerHTML = h;
  }

  /* ---------- Eventos ---------- */
  function vEventos() {
    const now = new Date(), wk = G.eventMonster(st, 'weekly', now), mo = G.eventMonster(st, 'monthly', now);
    const card = (type, e, label, tryTxt) => {
      const unlocked = G.eventUnlocked(st, type), chk = G.canFight(st, 'event-' + type);
      const claimed = st.ev[type === 'weekly' ? 'claimW' : 'claimM'] === e.key;
      return `<div class="card boss"><div class="row"><div class="pic art big">${Art.monster({ name: e.def.name, emoji: e.def.emoji, kind: 'event' })}</div><div class="grow"><div class="tag">${label}</div><div class="name">${e.def.name}</div>
        <div class="sub">Nível ${e.mon.level} · golpe especial: ${e.def.sp}</div><div class="tags">${modTags(e.def.mods)}</div></div></div>
        <div class="sub" style="margin-top:6px">Tentativas hoje: <b>${st.ev[type]}</b> · ${tryTxt}</div>
        <div class="sub">Recompensa: 🦕 Fósseis ${claimed ? '' : '+ item e runa ' + (type === 'monthly' ? 'épicos/lendários' : 'raros/épicos') + ' + troféu ' + e.def.tIcon + ' (1ª vitória)'}</div>
        <button class="btn red" data-ev="${type}" ${chk.ok ? '' : 'disabled'}>${unlocked ? '⚔️ Enfrentar' : '🔒 Derrote ' + G.EVENT_UNLOCK[type] + ' chefes'}</button>${unlocked && !chk.ok ? `<div class="sub center" style="margin-top:6px">${chk.msg}</div>` : ''}</div>`;
    };
    const bonus = G.bonusEvents(now);
    let h = `<h2 class="banner">Eventos</h2>`;
    h += bonus.length ? bonusBanner(now) : '<div class="card"><div class="sub">Sem bônus hoje. Fins de semana: +50% XP · dias 1–3: +50% ouro · quartas: ferreiro -25%.</div></div>';
    h += `<div class="card">${waitRow()}</div>`;
    h += `<h2 class="banner">Chefe da Semana</h2>${card('weekly', wk, 'SEMANAL · ' + wk.key, 'renova toda segunda')}`;
    h += `<h2 class="banner">Chefe do Mês</h2>${card('monthly', mo, 'MENSAL · ' + mo.key, 'só 1 por dia, forte!')}`;
    h += `<h2 class="banner">Troca de Fósseis (🦕 ${st.fossils})</h2>` + G.EVENT_SHOP.map((o) =>
      `<div class="card"><div class="row"><div class="pic">${o.icon}</div><div class="grow"><div class="name">${o.name}</div></div><button class="btn sm go" data-evbuy="${o.id}" ${st.fossils < o.cost ? 'disabled' : ''}>🦕 ${o.cost}</button></div></div>`).join('');
    view.innerHTML = h;
  }

  /* ---------- Combate ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function beginFight(mon, opts) {
    if (st.hp < 1) G.setHp(st, 1);
    fight = G.startFight(st, mon, opts);
    closeModal(); save(); drawFight([lineHtml({ kind: 'info', text: `${fight.mon.boss ? '👑 ' : ''}${fight.mon.name} apareceu! O que você vai fazer?` })]); overlay.hidden = false;
  }
  function startZone(z, step) {
    const chk = G.canFightZone(st, z, step);
    if (!chk.ok) { toast(chk.msg); render(); return; }
    G.spendEnergy(st, chk.cost);
    beginFight(G.stepMonster(z, step), { mode: 'zone', zone: { z, step } });
  }
  function startDragon(id) {
    const chk = G.canFightDragon(st, id);
    if (!chk.ok) { toast(chk.msg); render(); return; }
    beginFight(G.dragonMonster(id), { mode: 'dragon' });
  }
  function startEvent(type) {
    const chk = G.canFight(st, 'event-' + type);
    if (!chk.ok) { toast(chk.msg); render(); return; }
    const e = G.eventMonster(st, type);
    beginFight(e.mon, { mode: 'event-' + type, event: { key: e.key, def: e.def } });
  }
  function sceneFor(f) {
    if (f.zone) return f.zone.z;
    if (f.mode === 'dragon') return f.mon.dragon === 'azul' ? 'ice' : 'glade';
    return f.mode === 'event-monthly' ? 'volcano' : 'cursed';
  }
  function drawFight(logLines) {
    const f = fight, m = f.mon, h = f.hero;
    const cls = h.cls && G.CLASSES[h.cls];
    const atkLabel = cls ? cls.btn : '⚔️ Atacar';
    const skillBtns = h.skills.map((x) => { const d = G.TREE_BY_ID[x.id], cd = f.cd[x.id] || 0; return `<button class="btn sk" data-fa="skill:${x.id}" ${cd > 0 ? 'disabled' : ''}><span class="ic">${d.icon}</span><span>${esc(d.name)}</span><i>${cd > 0 ? 'recarga ' + cd : 'pronto'}</i></button>`; }).join('');
    const heroSt = [f.stunned ? '💫' : '', f.poison ? '☠️' : '', ...f.buffs.map((b) => `<span title="${esc(b.name)}">${b.icon}${b.turns}</span>`), f.shield ? `👻${f.shield.amt}` : '', f.evade > 0 ? '💨' : '', f.guard != null ? '🛡️' : ''].filter(Boolean).join(' ');
    const monSt = [f.mstun ? '💫 atordoado' : '', ...f.dots.map((d) => `${d.icon} ${d.name}`), f.slow ? '🌨️ lento' : '', f.mark ? '📍 marcado' : ''].filter(Boolean).map((x) => `<span class="tag st">${x}</span>`).join('');
    const potBtn = (k, n) => `<button class="btn" data-fa="potion-${k}" ${st.potions[k] > 0 ? '' : 'disabled'}>🧪 ${n} (${st.potions[k]})</button>`;
    const label = KIND_LABEL[m.kind];
    const biome = typeof sceneFor(f) === 'number' ? Art.biomeOf(sceneFor(f)) : sceneFor(f);
    overlay.innerHTML = `<div class="fight">
      <div class="stage ${m.boss ? 'boss' : m.kind === 'semi' ? 'semi' : m.kind === 'elite' ? 'elite' : ''}" id="arena" style="--gc:${Art.ground(biome)};--k:${Math.min(1.45, Math.max(1, (window.innerHeight - 480) / 310)).toFixed(3)}">
        <div class="sceneBg">${Art.scene(sceneFor(f))}</div>
        <div class="world"><div class="cam" style="animation-delay:-${((Date.now() / 1000) % 16).toFixed(2)}s">
          <div class="floor">
            <div class="plat pm"></div><div class="plat ph"></div>
            <div class="spr smon" id="mon"><div class="inner">${Art.monster(m)}</div></div>
            <div class="spr shero" id="hero"><div class="inner">${Avatar.svg(st.avatar, st.equipped, { back: true })}</div></div>
          </div>
        </div></div>
        <div class="hpbox mb"><div class="hn"><b>${m.boss ? '👑 ' : ''}${esc(m.name)}</b><span>Nv ${m.level}</span></div>${hpBar(m.hp, m.maxHp, 'mhp')}<div class="hn sm"><span>${label}</span><span class="mst">${monSt}</span></div></div>
        <div class="hpbox hb"><div class="hn"><b>${esc(st.name)}</b><span>Nv ${st.level}${cls ? ' · ' + G.classIcon(st) : ''}</span></div>${hpBar(h.hp, h.max)}<div class="hn sm"><span class="hst">${heroSt || '&nbsp;'}</span></div></div>
      </div>
      <div class="tags" style="justify-content:center;margin-top:6px">${modTags(m.mods)}${m.special ? `<span class="tag">💥 ${esc(m.special.name)}</span>` : ''}</div>
      <div class="warn" id="warn" ${f.warn ? '' : 'hidden'}>⚠️ ${esc(m.name)} vai usar ${esc(m.special ? m.special.name : '')}! Proteja-se!</div>
      <div class="log" id="log">${logLines.join('')}</div>
      <div class="acts" style="margin-top:8px"><button class="btn red wide" data-fa="attack">${atkLabel}</button></div>
      ${skillBtns ? `<div class="skgrid">${skillBtns}</div>` : ''}
      <div class="acts" style="margin-top:6px">${potBtn('small', 'Poção P')}${potBtn('large', 'Poção G')}
        <button class="btn" data-fa="flee" style="grid-column:span 2" ${m.boss || f.mode !== 'zone' ? 'disabled' : ''}>🏃 Fugir</button></div></div>`;
  }
  function lineHtml(e) {
    const c = e.kind === 'hit' ? (e.who === 'hero' ? 'hit-h' : 'hit-m') : e.kind;
    return `<div class="${c}">${esc(e.text)}</div>`;
  }
  function floatDmg(txt, cls, onMon) {
    const arena = $('#arena'); if (!arena) return;
    const d = document.createElement('div'); d.className = 'floatdmg ' + cls; d.textContent = txt;
    d.style.left = onMon ? '64%' : '26%'; d.style.top = onMon ? '22%' : '52%';
    arena.appendChild(d); setTimeout(() => d.remove(), 900);
  }
  async function doAction(action) {
    if (busy || !fight || fight.over) return;
    busy = true;
    const f = fight, events = G.heroAction(st, f, action);
    const lines = Array.from(document.querySelectorAll('#log div')).map((d) => d.outerHTML);
    for (const e of events) {
      lines.push(lineHtml(e));
      const logEl = $('#log'); if (logEl) logEl.innerHTML = lines.slice(-6).join('');
      const mon = $('#mon .inner'), hero = $('#hero .inner');
      const play = (el, cls) => { if (!el) return; el.classList.remove('hatk', 'matk', 'hurt', 'smash'); void el.offsetWidth; el.classList.add(cls); };
      if (mon && e.kind === 'hit' && e.who === 'hero') { play(hero, 'hatk'); setTimeout(() => play(mon, e.crit ? 'smash' : 'hurt'), 170); floatDmg('-' + e.dmg, e.crit ? 'crit' : '', true); buzz(e.crit ? 40 : 15); }
      if (mon && e.kind === 'hit' && e.who === 'mon') { play(mon, 'matk'); setTimeout(() => play(hero, 'hurt'), 170); floatDmg('-' + e.dmg, e.special ? 'crit' : '', false); buzz(e.special ? 60 : 25); }
      if (e.kind === 'heal') floatDmg('+', 'heal', e.who !== 'hero');
      const bars = document.querySelectorAll('#overlay .hpbox .bar');
      if (bars[0]) { bars[0].firstElementChild.style.width = (e.m / f.mon.maxHp) * 100 + '%'; bars[0].querySelector('.t').textContent = fmt(e.m) + ' / ' + fmt(f.mon.maxHp); }
      if (bars[1]) { bars[1].firstElementChild.style.width = (e.h / f.hero.max) * 100 + '%'; bars[1].querySelector('.t').textContent = fmt(e.h) + ' / ' + fmt(f.hero.max); }
      await sleep(e.kind === 'info' || e.kind === 'warn' ? 380 : 520);
    }
    if (f.over) { await sleep(350); endFight(); } else drawFight(lines.slice(-6));
    busy = false;
  }
  function endFight() {
    const f = fight; fight = null;
    const rep = G.finishFight(st, f);
    save(); overlay.hidden = true;
    let h;
    if (rep.fled) h = `<div class="big">🏃</div><h2 class="banner">Você fugiu!</h2>`;
    else if (!rep.won) h = `<div class="big">💀</div><h2 class="banner">Derrota</h2><div class="center sub">Você perdeu ${fmt(-rep.gold)} 🪙 e foi levado de volta à fogueira. Descanse, melhore seu equipamento, treine habilidades e tente de novo.</div>`;
    else {
      const big = rep.dragonTrophy ? rep.dragonTrophy.tIcon : rep.trophy ? rep.trophy.tIcon : rep.evTrophy ? rep.evTrophy.icon : rep.kind === 'semi' ? '🐾' : rep.kind === 'dragon' ? '🐉' : '🏆';
      const title = rep.kind === 'dragon' ? 'Dragão derrotado!' : rep.trophy ? 'Chefe derrotado!' : rep.kind === 'semi' ? 'Semi-chefe derrotado!' : rep.kind === 'event' ? 'Chefe de evento derrotado!' : 'Vitória!';
      h = `<div class="big">${big}</div><h2 class="banner">${title}</h2>
        <div class="center">✨ +${fmt(rep.xp)} XP · 🪙 +${fmt(rep.gold)} · 🦴 +${rep.ossos}${rep.fossils ? ' · 🦕 +' + rep.fossils : ''}${rep.diamonds ? ' · 💎 +' + rep.diamonds : ''}</div>${rep.replay ? '<div class="sub center">Local já vencido: 60% de XP e ouro.</div>' : ''}`;
      if (rep.boxes.length) h += `<div class="sub center" style="margin:10px 0 4px">Você ganhou:</div><div class="boxes" style="justify-content:center">${rep.boxes.map((b) => boxChip(b)).join('')}</div><div class="sub center">Abra as caixas no Baú 🧳</div>`;
      else h += '<div class="sub center" style="margin-top:8px">Nenhuma caixa desta vez.</div>';
      if (rep.trophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu conquistado</b><div>${rep.trophy.tIcon} ${rep.trophy.trophy}</div><div class="up" style="margin-top:4px">Bônus vitalício: ${G.bonusText(rep.trophyBonus)}</div></div>`;
      if (rep.dragonTrophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu de dragão</b><div>${rep.dragonTrophy.tIcon} ${rep.dragonTrophy.trophy}</div><div class="up" style="margin-top:4px">Bônus vitalício: ${G.bonusText(rep.dragonTrophy.bonus)}</div></div>`;
      if (rep.evTrophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu de evento</b><div>${rep.evTrophy.icon} ${esc(rep.evTrophy.name)}</div><div class="up" style="margin-top:4px">Bônus vitalício: ${G.bonusText(rep.evTrophy.bonus)}</div></div>`;
      if (rep.zoneCleared) h += `<div class="card center"><b>📜 ${esc(rep.zoneCleared.name)} vencido!</b><div class="sub" style="line-height:1.5;margin-top:4px">${rep.zoneCleared.clear}</div>${rep.nextZone ? `<div class="up" style="margin-top:6px">Novo local: ${rep.nextZone.icon} ${esc(rep.nextZone.name)}</div>` : ''}</div>`;
      if (rep.levels.length) h += `<div class="card center"><b>⬆ Subiu para o nível ${rep.levels[rep.levels.length - 1]}!</b><div class="sub">Vida restaurada e novo estoque na loja.</div><div class="up" style="margin-top:4px">⭐ +${rep.levels.length} ponto(s) de habilidade${G.skillPoints(st).free ? ` (livres: ${G.skillPoints(st).free})` : ''}</div>${st.cls ? '<button class="btn sm go" data-go-tree style="margin-top:6px">🌳 Abrir a árvore</button>' : ''}</div>`;
      if (rep.finishedGame) h += `<div class="card center"><div class="big">👑</div><b>O fogo sagrado voltou à tribo!</b><div class="sub">Você venceu os 15 locais. Agora enfrente os dragões e os eventos!</div></div>`;
    }
    openModal(h + '<button class="btn go" data-close>Continuar</button>');
    render();
  }

  /* ---------- Menu / início ---------- */
  function menu() {
    openModal(`<h2 class="banner">Menu</h2>
      <button class="btn" data-act="rename">🎭 Nome e avatar</button>
      <button class="btn red" data-act="reset">🗑️ Reiniciar jogo</button>
      <button class="btn" data-close>Fechar</button>
      <div class="sub center" style="margin-top:10px">Era da Pedra v2.1 · progresso salvo neste aparelho</div>`);
  }
  let draft = null;
  const swatch = (arr, key, cur) => arr.map((c, i) => `<button class="sw ${i === cur ? 'on' : ''}" data-av-${key}="${i}" style="background:${c}" aria-label="${key} ${i + 1}"></button>`).join('');
  function avatarPicker() {
    return `<div class="avpick"><div class="avprev" id="avprev">${Avatar.svg(draft, st.equipped)}</div>
      <div class="avopts"><div class="sub">Corpo</div><div class="chips"><button data-av-g="m" class="${draft.g === 'm' ? 'on' : ''}">🚹 Homem</button><button data-av-g="f" class="${draft.g === 'f' ? 'on' : ''}">🚺 Mulher</button></div>
      <div class="sub">Pele</div><div class="swatches" data-sw="skin">${swatch(Avatar.SKINS, 'skin', draft.skin)}</div>
      <div class="sub">Cabelo</div><div class="swatches" data-sw="hair">${swatch(Avatar.HAIRS, 'hair', draft.hair)}</div></div></div>`;
  }
  function askName(first) {
    draft = Object.assign({}, st.avatar);
    openModal(`<h2 class="banner">${first ? 'Bem-vindo à Era da Pedra' : 'Herói'}</h2>
      <div class="sub center" style="margin-bottom:8px">${first ? 'Você é um caçador de nível 1. Crie seu herói, derrote 15 chefes e vire lenda.' : 'Mude o nome ou a aparência do herói.'}</div>
      <input id="nm" maxlength="14" value="${first ? '' : esc(st.name)}" placeholder="Nome do herói" style="width:100%;padding:12px;font:inherit;font-size:16px;border-radius:8px;border:2px solid var(--edge);background:#0b0705;color:var(--bone);user-select:text;-webkit-user-select:text">
      ${avatarPicker()}<button class="btn go" data-act="savename">${first ? 'Começar aventura' : 'Salvar'}</button>`);
  }
  function setAvatar(key, val) {
    draft[key] = key === 'g' ? val : +val;
    const prev = $('#avprev'); if (prev) prev.innerHTML = Avatar.svg(draft, st.equipped);
    document.querySelectorAll('.avopts [data-av-g]').forEach((b) => b.classList.toggle('on', b.dataset.avG === draft.g));
    ['skin', 'hair'].forEach((k) => document.querySelectorAll(`[data-av-${k}]`).forEach((b) => b.classList.toggle('on', +b.dataset['av' + k[0].toUpperCase() + k.slice(1)] === draft[k])));
  }

  /* ---------- Eventos de clique ---------- */
  const SEL = '[data-act],[data-nav],[data-item],[data-set],[data-buyset],[data-buyrune],[data-evolve],[data-do-evolve],[data-eq],[data-uneq],[data-sell],[data-sellq],[data-upq],[data-close],[data-bf],[data-st],[data-ft],[data-pot],[data-fa],[data-empty],[data-lock],[data-dis],[data-disq],[data-bulk],[data-fuse],[data-av-g],[data-av-skin],[data-av-hair],[data-train],[data-sk],[data-cls],[data-learn],[data-go-tree],[data-cdx],[data-jt],[data-zone],[data-step],[data-dragon],[data-skipdr],[data-box],[data-ev],[data-evbuy],[data-go-forge]';
  const after = (msg, ok = true) => { if (msg) toast(msg); if (ok) { save(); closeModal(); } render(); };
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest(SEL);
    if (!t) return;
    const d = t.dataset;
    if (d.fa !== undefined) return doAction(d.fa);
    if (d.close !== undefined) { closeModal(); return; }
    if (d.nav) { screen = d.nav; render(); view.scrollTop = 0; return; }
    if (d.bf) { bagFilter = d.bf; return render(); }
    if (d.st) { shopTab = d.st; return render(); }
    if (d.ft) { forgeTab = d.ft; return render(); }
    if (d.avG) return setAvatar('g', d.avG);
    if (d.avSkin !== undefined) return setAvatar('skin', d.avSkin);
    if (d.avHair !== undefined) return setAvatar('hair', d.avHair);
    if (d.empty) return showEmptySlot(d.empty, d.ri === '' ? null : +d.ri);
    if (d.item) return showItem(d.item);
    if (d.set !== undefined) { shopSet = d.set === '' ? null : +d.set; return render(); }
    if (d.buyset) { const [sid, sl] = d.buyset.split(':'); const r = G.buySetPiece(st, +sid, sl); if (r.ok) buzz(20); return after(r.msg, false); }
    if (d.buyrune) { const [t, rr] = d.buyrune.split(':'); const r = G.buyRune(st, t, +rr); if (r.ok) buzz(20); return after(r.msg, false); }
    if (d.evolve !== undefined) return showEvolve(+d.evolve);
    if (d.doEvolve !== undefined) { const r = G.evolve(st, +d.doEvolve); if (r.ok) { buzz(60); save(); closeModal(); render(); toast(r.msg); } else toast(r.msg); return; }
    if (d.eq) { G.equip(st, d.eq, d.ri === undefined || d.ri === '' ? undefined : +d.ri); return after('Equipado!'); }
    if (d.uneq) { const ok = G.unequip(st, d.uneq, +d.ri); return after(ok ? 'Desequipado.' : 'Baú cheio!', ok); }
    if (d.lock) { const l = G.toggleLock(st, d.lock); return after(l ? 'Item travado 🔒' : 'Item destravado'); }
    if (d.sell || d.sellq) { const p = G.sell(st, d.sell || d.sellq); return after(p ? `Vendido por ${p} 🪙` : 'Item travado.'); }
    if (d.dis || d.disq) { const p = G.dismantle(st, d.dis || d.disq); return after(p ? `Desmontado: 🦴 +${p}` : 'Item travado.'); }
    if (d.upq) { const r = G.upgrade(st, d.upq); if (r.ok) buzz(r.success ? 30 : 10); return after(r.msg, r.ok); }
    if (d.goForge !== undefined) { closeModal(); screen = 'loja'; shopTab = 'forja'; forgeTab = 'melhorar'; return render(); }
    if (d.bulk) { const [m, x] = d.bulk.split(':'); return doBulk(m, +x); }
    if (d.fuse) { const r = G.fuseRunes(st, d.fuse); return after(r.msg, r.ok); }
    if (d.pot) { const r = G.buyPotion(st, d.pot); return after(r.msg, r.ok); }
    if (d.train) { const r = G.startTraining(st, d.train); return after(r.msg, r.ok); }
    if (d.sk) return showSkill(d.sk);
    if (d.cls) { const r = G.setClass(st, d.cls); if (r.ok) { buzz(30); save(); closeModal(); screen = 'arvore'; render(); toast(r.msg + ' Aprenda sua 1ª habilidade!'); } else toast(r.msg); return; }
    if (d.learn) { const r = G.learn(st, d.learn); if (r.ok) buzz(25); save(); if (r.ok) closeModal(); render(); return toast(r.msg); }
    if (d.goTree !== undefined) { closeModal(); screen = 'arvore'; render(); return; }
    if (d.cdx) return showCodexEntry(d.cdx);
    if (d.jt) { jTab = d.jt; return render(); }
    if (d.zone) return showZone(+d.zone);
    if (d.step) { const [z, k] = d.step.split(':'); return startZone(+z, +k); }
    if (d.dragon) return startDragon(d.dragon);
    if (d.skipdr) { const r = G.skipDragon(st, d.skipdr); if (r.ok) buzz(20); return after(r.msg, false); }
    if (d.box) return openOneBox(d.box);
    if (d.ev) return startEvent(d.ev);
    if (d.evbuy) { const r = G.buyEventOffer(st, d.evbuy); return after(r.msg, r.ok); }
    switch (d.act) {
      case 'openall': return openAllBoxes();
      case 'codex': return showCodex();
      case 'respec': { if (!confirm(`Redefinir a árvore e a classe por ${G.respecCost(st)} de ouro?`)) return; const r = G.respec(st); toast(r.msg); save(); render(); if (r.ok) showClassPick(); return; }
      case 'odds': return showOdds();
      case 'menu': return menu();
      case 'rename': return askName(false);
      case 'savename': { const v = ($('#nm').value || '').trim(); if (v) st.name = v; if (draft) st.avatar = Object.assign({}, draft); closeModal(); save(); render(); if (!st.cls) showClassPick(true); return; }
      case 'reset': if (confirm('Apagar todo o progresso?')) { G.wipe(); st = G.newState(''); fight = null; closeModal(); save(); render(); askName(true); } return;
      case 'rest': { const r = G.rest(st); return after(r.msg, false); }
      case 'resetEn': { const c = G.energyResetCost(st); if (st.energy > 0) return toast('Ainda há encontros.'); if (!confirm(`Restaurar todos os encontros por ${fmt(c)} de ouro?`)) return; const r = G.resetEnergy(st); if (r.ok) buzz(30); return after(r.msg, false); }
      case 'buyvip': { if (!confirm(`Comprar VIP por ${G.VIP.price} diamantes (${G.VIP.days} dias)?`)) return; const r = G.buyVip(st); if (r.ok) buzz(40); return after(r.msg, false); }
      case 'buyen': { const r = G.buyEnergy(st); if (r.ok) buzz(20); return after(r.msg, false); }
      case 'bagup': { const r = G.buyBagSlots(st); return after(r.msg, false); }
      case 'sort': bagSort = bagSort === 'poder' ? 'raridade' : bagSort === 'raridade' ? 'nivel' : 'poder'; return render();
      case 'bulk': return bulkMenu();
      case 'speedup': { const r = G.speedupTraining(st); if (r.ok) toast(`${G.SKILLS[r.id].name} subiu de nível!`); else toast(r.msg); return after(null, false); }
    }
  });

  /* ---------- Relógio: atualiza contadores sem recriar a tela ---------- */
  function snapshot() {
    return [st.energy, G.isVip(st), st.diamonds, G.dragonLeft(st, 'verde') > 0, G.dragonLeft(st, 'azul') > 0, !!st.training, st.hp >= G.heroStats(st).hp].join('|');
  }
  function tick() {
    if (fight || !modal.hidden) return;
    const trainDone = G.syncTime(st);
    if (trainDone) { toast(`🎓 ${G.SKILLS[trainDone].name} subiu para o nível ${G.skillRank(st, trainDone)}!`); buzz(40); save(); render(); return; }
    if (snapshot() !== lastSnap) { render(); return; }
    const set = (k, v) => { const el = view.querySelector(`[data-live="${k}"]`); if (el) el.textContent = v; };
    if (st.energy < G.maxEnergy(st)) set('ent', mmss(G.energySecs(st) - (Date.now() - st.energyAt) / 1000));
    if (st.training) {
      const left = Math.max(0, (st.training.endsAt - Date.now()) / 1000), total = G.skillTime({ skills: { [st.training.id]: st.training.from } }, st.training.id);
      set('tr', mmss(left)); const b = view.querySelector('[data-live="trbar"]'); if (b) b.style.width = Math.min(100, 100 - (left / total) * 100) + '%';
    }
    for (const id of ['verde', 'azul']) { set('dr-' + id, mmss(G.dragonLeft(st, id))); set('drcost-' + id, G.dragonSkipCost(st, id)); }
    if (screen === 'loja' && shopTab === 'vip') set('vip', mmss(G.vipLeft(st) / 1000));
    if (screen === 'mapa' && st.hp < G.heroStats(st).hp) { const bar = view.querySelector('.bar.hp'); if (bar) { const mx = G.heroStats(st).hp; bar.firstElementChild.style.width = (st.hp / mx) * 100 + '%'; bar.querySelector('.t').textContent = fmt(st.hp) + ' / ' + fmt(mx); } }
  }

  /* ---------- Início ---------- */
  const fresh = !st;
  if (!st) { st = G.newState(''); st.name = 'Herói'; save(); }
  render();
  if (fresh) askName(true); else if (!st.cls) showClassPick(true);
  Art.loadPack().then((j) => { if (j && !fight) render(); });
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !fight) render(); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
