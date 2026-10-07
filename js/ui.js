/* Era da Pedra v2 — interface (mobile first) */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const view = $('#view'), top = $('#top'), nav = $('#nav'), overlay = $('#overlay'), modal = $('#modal'), toastEl = $('#toast');
  let st = G.load();
  let screen = 'cacar', shopTab = 'equip', shopSlot = 'todos', bagFilter = 'todos', bagSort = 'poder', forgeTab = 'melhorar';
  let fight = null, busy = false, lastSnap = '';

  const TABS = [['cacar', '⚔️', 'Caçar'], ['heroi', '🧍', 'Herói'], ['bau', '🧳', 'Baú'], ['loja', '🛒', 'Loja'], ['treino', '💪', 'Treino'], ['eventos', '🎉', 'Eventos']];
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
      <div class="toprow"><div class="title">🦴 ERA DA PEDRA</div><div><span class="gold">🪙 ${fmt(st.gold)}</span> <span class="gold" style="margin-left:6px">🦴 ${fmt(st.ossos)}</span> <button class="btn sm" data-act="menu" style="margin-left:6px">⚙️</button></div></div>
      <div class="stats"><span>⚔️ ${fmt(s.atk)}</span><span>❤️ ${fmt(s.hp)}</span><span>🛡️ ${fmt(s.arm)}</span><span>🎯 ${s.crit.toFixed(0)}%</span></div>
      <div class="xpbar"><b>⬆ ${st.level}</b><div class="bar"><i style="width:${pct}%"></i></div><b>${st.level >= G.MAX_LEVEL ? 'MÁX' : pct + '%'}</b></div>`;
    nav.innerHTML = TABS.map(([id, ic, nm]) => `<button data-nav="${id}" class="${id === screen ? 'on' : ''}"><span>${ic}</span>${nm}</button>`).join('');
  }
  function render() {
    G.syncTime(st);
    renderTop();
    ({ cacar: vCacar, heroi: vHeroi, bau: vBau, loja: vLoja, treino: vTreino, eventos: vEventos })[screen]();
    lastSnap = snapshot();
  }

  /* ---------- Util de interface ---------- */
  function hpBar(cur, max, cls) { return `<div class="bar ${cls || 'hp'}"><i style="width:${Math.max(0, (cur / max) * 100)}%"></i><div class="t">${fmt(cur)} / ${fmt(max)}</div></div>`; }
  function modTags(mods) { return mods.map((m) => `<span class="tag" title="${esc(G.MODS[m].desc)}">${G.MODS[m].icon} ${G.MODS[m].name}</span>`).join(''); }
  const KIND_LABEL = { normal: 'Fera', elite: 'Fera Veterana', semi: 'Semi-chefe', boss: 'Chefe', event: 'Chefe de Evento' };

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
      <div class="pic" style="border-color:${rarColor(it)}">${it.icon}</div>
      <div class="grow"><div class="name" style="color:${rarColor(it)}">${it.lock ? '🔒 ' : ''}${esc(it.name)}${it.plus ? ' +' + it.plus : ''} ${arrow}</div>
      <div class="stat">${G.RARITIES[it.rarity].name} · nv ${it.ilvl} · ${G.SLOTS[it.slot].name}</div><div class="stat">${statLine(it)}</div>${price ? '' : diffLine(it)}</div>${right || ''}</div>`;
  }
  function isEquipped(it) { return it.rune ? st.equipped.runas.some((x) => x && x.id === it.id) : !!(st.equipped[it.slot] && st.equipped[it.slot].id === it.id); }
  function openModal(html) { modal.innerHTML = `<div class="sheet">${html}</div>`; modal.hidden = false; }
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
  const energyCostNow = () => G.ENERGY_COST[G.nextStoryKind(st) === 'boss' ? 'boss' : 'story'];

  /* ---------- Pular espera com ouro ---------- */
  function waitRow() {
    const cd = G.cooldownLeft(st);
    return `<div class="row waitrow"><button class="btn sm" data-act="skipcd" ${cd > 0 ? '' : 'disabled'}>⏩ Pular fôlego · 🪙 <span data-live="cdcost">${cd > 0 ? G.cooldownSkipCost(st) : 0}</span></button>
      <button class="btn sm" data-act="buyen" ${st.energy < G.MAX_ENERGY ? '' : 'disabled'}>⚡ +1 encontro · 🪙 ${G.energyBuyCost(st)}</button></div>`;
  }

  /* ---------- Caçar ---------- */
  function bonusBanner(d) {
    return G.bonusEvents(d).map((e) => `<div class="card event"><div class="row"><div class="pic">${e.icon}</div><div class="grow"><div class="name">${e.name}</div><div class="sub">${e.desc}</div></div></div></div>`).join('');
  }
  function vCacar() {
    const s = G.heroStats(st), kind = G.nextStoryKind(st), boss = G.BOSSES[Math.min(st.bossNo, 15) - 1];
    const cd = G.cooldownLeft(st), cost = energyCostNow();
    const chk = G.canFight(st, 'story');
    const pips = Array.from({ length: G.KILLS_PER_BOSS }, (_, i) => `<b class="${i < st.kills ? 'on' : ''} ${i === G.KILLS_PER_BOSS - 1 ? 'semi' : ''}"></b>`).join('');
    const nextEn = st.energy < G.MAX_ENERGY ? Math.ceil(G.ENERGY_SECS - (Date.now() - st.energyAt) / 1000) : 0;
    let h = bonusBanner(new Date());
    h += `<div class="card"><div class="sub">Vida do herói</div>${hpBar(st.hp, s.hp)}
      <div class="row" style="margin-top:8px"><div class="grow sub">🧪 ${st.potions.small} pequenas · ${st.potions.large} grandes</div>
      <button class="btn sm" data-act="rest" ${G.restCost(st) <= 0 ? 'disabled' : ''}>🔥 Descansar · 🪙 ${G.restCost(st)}</button></div></div>`;
    h += `<div class="card"><div class="row"><div class="grow"><div class="name">⚡ Encontros: <span data-live="en">${st.energy}</span>/${G.MAX_ENERGY}</div>
      <div class="sub">${st.energy < G.MAX_ENERGY ? `próximo em <span data-live="ent">${mmss(nextEn)}</span>` : 'cheio'} · fôlego: <span data-live="cd">${cd > 0 ? cd + 's' : 'pronto'}</span></div></div></div>${waitRow()}</div>`;
    if (st.finished) h += `<div class="card center"><div class="big">👑</div><div class="name">Você derrotou os 15 chefes!</div><div class="sub">Continue evoluindo: treine, enfrente os eventos e chegue ao nível ${G.MAX_LEVEL}.</div></div>`;
    h += `<h2 class="banner">${kind === 'boss' ? '🔥 O CHEFE TE DESAFIA!' : kind === 'semi' ? '⚠️ Um Semi-chefe se aproxima' : 'Caçada: ' + st.kills + '/' + G.KILLS_PER_BOSS}</h2>`;
    const btn = (cls, label) => `<button class="btn ${cls}" data-act="fight-story" ${chk.ok ? '' : 'disabled'}>${label}</button>${chk.ok ? '' : `<div class="sub center" style="margin-top:6px">${chk.msg}</div>`}`;
    if (kind === 'boss') {
      h += `<div class="card boss"><div class="row"><div class="pic">${boss.emoji}</div><div class="grow">
        <div class="name">Chefe ${boss.no}/15 · ${boss.name}</div><div class="sub">Nível ${st.level + 1} · Golpe especial: ${boss.sp}</div>
        <div class="sub">Recompensa: ${boss.tIcon} ${boss.trophy} + itens raros · custa ${cost} encontros</div><div class="tags">${modTags(boss.mods)}</div></div></div>
        <div class="prog">${pips}</div>${btn('red', '⚔️ Enfrentar o Chefe')}</div>`;
    } else {
      h += `<div class="card ${kind === 'semi' ? 'semi' : ''}"><div class="row"><div class="pic">${kind === 'semi' ? '🐾' : '🌿'}</div><div class="grow"><div class="name">${kind === 'semi' ? 'Semi-chefe da região' : 'Caçar na Selva'}</div>
        <div class="sub">${kind === 'semi' ? 'Uma fera alfa, mais forte e com golpe especial. Vença para enfrentar o chefe ' + boss.no + '.' : 'Derrote ' + (G.KILLS_PER_BOSS - st.kills) + ' fera(s) para despertar o chefe ' + boss.no + '.'}</div></div></div>
        <div class="prog">${pips}</div>${btn('go', kind === 'semi' ? '🐾 Enfrentar o Semi-chefe' : '🏹 Caçar')}</div>`;
    }
    view.innerHTML = h;
  }

  /* ---------- Herói (boneco) ---------- */
  function slotBox(slot, ri) {
    const it = slot === 'runa' ? st.equipped.runas[ri] : st.equipped[slot];
    const attr = it ? `data-item="${it.id}"` : `data-empty="${slot}" data-ri="${ri == null ? '' : ri}"`;
    return it
      ? `<div class="slot" ${attr} style="border-color:${rarColor(it)};box-shadow:0 0 8px ${rarColor(it)}55 inset">${it.icon}${it.plus ? `<small>+${it.plus}</small>` : ''}</div>`
      : `<div class="slot empty" ${attr} title="${G.SLOTS[slot].name}">${G.SLOTS[slot].icon}<small>${G.SLOTS[slot].name}</small></div>`;
  }
  function doll() {
    const e = st.equipped, ic = (s) => (e[s] ? e[s].icon : '');
    return `<div class="doll"><div class="col">${['elmo', 'armadura', 'luvas', 'botas'].map((s) => slotBox(s)).join('')}</div>
      <div class="figure"><div class="fh">${ic('elmo')}</div><div class="fb">🧔</div><div class="fa">${ic('armadura')}</div><div class="fw">${ic('arma')}</div><div class="fs">${ic('escudo')}</div><div class="ff">${ic('botas')}</div></div>
      <div class="col">${['arma', 'escudo', 'amuleto'].map((s) => slotBox(s)).join('')}<div class="slot ghost"></div></div></div>
      <div class="sub center" style="margin:8px 0 4px">Runas</div><div class="runes">${[0, 1, 2].map((i) => slotBox('runa', i)).join('')}</div>`;
  }
  function vHeroi() {
    const s = G.heroStats(st);
    const bt = G.BOSSES.map((b) => { const got = st.trophies.includes(b.no); return `<div class="t ${got ? '' : 'lock'}"><div class="e">${got ? b.tIcon : '❔'}</div><b>${got ? b.trophy : 'Chefe ' + b.no}</b><div class="muted">${got ? b.name : 'Bloqueado'}</div></div>`; }).join('');
    const et = st.evTrophies.length ? st.evTrophies.slice().reverse().map((t) => `<div class="t"><div class="e">${t.icon}</div><b>${esc(t.name)}</b><div class="muted">${t.type === 'weekly' ? 'Semanal' : 'Mensal'}</div></div>`).join('') : '<div class="sub">Vença os chefes de evento para ganhar troféus especiais.</div>';
    view.innerHTML = `<div class="card center"><div class="name">${esc(st.name)} · Nível ${st.level}</div>
      <div class="sub">Chefes: ${st.trophies.length}/15 · Feras abatidas: ${st.totalKills}</div>${doll()}<div class="sub" style="margin-top:6px">Toque num espaço para equipar ou ver detalhes.</div></div>
      <div class="card"><div class="name">Atributos</div><div class="hr"></div>
      <div class="row"><span class="grow">⚔️ Força</span><b>${fmt(s.atk)}</b></div><div class="row"><span class="grow">❤️ Vida</span><b>${fmt(s.hp)}</b></div>
      <div class="row"><span class="grow">🛡️ Armadura</span><b>${fmt(s.arm)}</b></div><div class="row"><span class="grow">🎯 Crítico</span><b>${s.crit.toFixed(1)}% (x${s.critDmg.toFixed(2)})</b></div>
      <div class="row"><span class="grow">🩸 Vida roubada</span><b>${s.vamp.toFixed(1)}%</b></div><div class="row"><span class="grow">💥 Golpe Forte</span><b>x${s.heavy.toFixed(2)}</b></div></div>
      <h2 class="banner">Troféus de Chefes (${st.trophies.length}/15)</h2><div class="troph">${bt}</div>
      <h2 class="banner" style="margin-top:14px">Troféus de Eventos (${st.evTrophies.length})</h2><div class="troph">${et}</div>`;
  }

  /* ---------- Itens: detalhe ---------- */
  function showItem(id, shopMode) {
    let it, where;
    if (shopMode) { it = st.shop.equip.concat(st.shop.runes).find((x) => x.id === id); where = 'shop'; }
    else { const f = G.findItem(st, id); if (!f) return; it = f.it; where = f.where; }
    if (!it) return;
    let h = itemRow(it, '', 'data-noop');
    if (it.rune) {
      st.equipped.runas.forEach((r, i) => { if (r && r.id !== it.id) h += `<div class="sub">Runa ${i + 1}: ${esc(r.name)} — ${statLine(r)}</div>`; });
    } else if (st.equipped[it.slot] && st.equipped[it.slot].id !== it.id) h += `<div class="sub">Equipado: ${esc(st.equipped[it.slot].name)} — ${statLine(st.equipped[it.slot])}</div>`;
    h += '<div class="hr"></div>';
    if (where === 'shop') h += `<button class="btn go" data-buy="${it.id}">Comprar · 🪙 ${fmt(G.shopPrice(st, it))}</button>`;
    if (where === 'bag') {
      if (it.rune) h += [0, 1, 2].map((i) => `<button class="btn go" data-eq="${it.id}" data-ri="${i}">Equipar na runa ${i + 1}${st.equipped.runas[i] ? ' (troca)' : ''}</button>`).join('');
      else h += `<button class="btn go" data-eq="${it.id}">Equipar</button>`;
      h += `<button class="btn" data-lock="${it.id}">${it.lock ? '🔓 Destravar' : '🔒 Travar (protege de venda)'}</button>`;
    }
    if (where === 'eq') h += `<button class="btn" data-uneq="${it.slot}" data-ri="${st.equipped.runas.findIndex((x) => x && x.id === it.id)}">Desequipar</button>`;
    if (where !== 'shop') h += it.plus >= G.MAX_PLUS ? '<button class="btn" disabled>Ferreiro: nível máximo</button>' : `<button class="btn" data-go-forge="${it.id}">🔨 Melhorar no ferreiro</button>`;
    if (where === 'bag' && !it.lock) h += `<button class="btn" data-dis="${it.id}">♻️ Desmontar · 🦴 +${G.dismantleYield(it)}</button><button class="btn red" data-sell="${it.id}">Vender · 🪙 ${fmt(G.sellPrice(it))}</button>`;
    openModal(h + '<button class="btn" data-close>Fechar</button>');
  }
  function showEmptySlot(slot, ri) {
    const list = st.bag.filter((i) => i.slot === slot).sort((a, b) => G.itemScore(b) - G.itemScore(a));
    if (!list.length) return toast(`Nenhum item de ${G.SLOTS[slot].name.toLowerCase()} no baú. Compre na loja ou cace!`);
    openModal(`<h2 class="banner">Equipar ${G.SLOTS[slot].name}</h2>` + list.map((i) => itemRow(i, `<button class="btn sm go" data-eq="${i.id}" data-ri="${ri}">Equipar</button>`, 'data-noop')).join('') + '<button class="btn" data-close>Fechar</button>');
  }

  /* ---------- Baú ---------- */
  const SORTS = { poder: (a, b) => G.itemScore(b) - G.itemScore(a), raridade: (a, b) => b.rarity - a.rarity || G.itemScore(b) - G.itemScore(a), nivel: (a, b) => b.ilvl - a.ilvl || b.rarity - a.rarity };
  function vBau() {
    const f = ['todos', ...G.SLOT_ORDER, 'runa'];
    const list = st.bag.filter((i) => bagFilter === 'todos' || i.slot === bagFilter).sort(SORTS[bagSort]);
    view.innerHTML = `<h2 class="banner">Baú de Itens (${st.bag.length}/${st.bagSize})</h2>
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
  function vLoja() {
    const tabs = [['equip', '🛡️ Equip.'], ['runas', '🔶 Runas'], ['pocao', '🧪 Poções'], ['vender', '💰 Vender'], ['forja', '🔨 Ferreiro'], ['mochila', '🎒 Baú']];
    const left = Math.max(0, G.SHOP_SECS - (Date.now() - st.shop.at) / 1000);
    let h = `<h2 class="banner">Mercador</h2><div class="chips wrap">${tabs.map(([id, n]) => `<button data-st="${id}" class="${id === shopTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    const stock = (list) => list.map((i) => itemRow(i, `<div class="pricebox">${st.shop.deal === i.id ? '<div class="deal">🔥 -25%</div>' : ''}<button class="btn sm go" data-buyq="${i.id}">🪙 ${fmt(G.shopPrice(st, i))}</button></div>`, `data-shopitem="${i.id}"`)).join('');
    const renew = `<button class="btn" data-act="refreshshop">🔄 Renovar estoque · 🪙 ${G.shopRefreshCost(st)}</button><div class="sub center" style="margin-top:6px">Renova sozinho em <span data-live="shop">${mmss(left)}</span> ou ao subir de nível.</div>`;
    if (shopTab === 'equip') {
      const f = ['todos', ...G.SLOT_ORDER];
      h += `<div class="chips small">${f.map((x) => `<button data-ss="${x}" class="${x === shopSlot ? 'on' : ''}">${x === 'todos' ? 'Todos' : G.SLOTS[x].icon}</button>`).join('')}</div>`;
      const list = st.shop.equip.filter((i) => shopSlot === 'todos' || i.slot === shopSlot);
      h += (list.length ? stock(list) : '<div class="card center muted">Sem itens desse tipo agora.</div>') + renew;
    } else if (shopTab === 'runas') {
      h += (st.shop.runes.length ? stock(st.shop.runes) : '<div class="card center muted">Estoque esgotado.</div>') + renew;
    } else if (shopTab === 'pocao') {
      h += [['small', 'Poção Pequena', 'Recupera 35% da vida em combate'], ['large', 'Poção Grande', 'Recupera 65% da vida em combate']].map(([k, n, d]) =>
        `<div class="card"><div class="row"><div class="pic">🧪</div><div class="grow"><div class="name">${n} (x${st.potions[k]})</div><div class="sub">${d}</div></div>
        <button class="btn sm go" data-pot="${k}">🪙 ${fmt(G.potionPrice(st, k))}</button></div></div>`).join('');
      h += `<div class="card"><div class="row"><div class="pic">🔥</div><div class="grow"><div class="name">Fogueira</div><div class="sub">Cura toda a vida agora.</div></div><button class="btn sm" data-act="rest" ${G.restCost(st) <= 0 ? 'disabled' : ''}>🪙 ${G.restCost(st)}</button></div></div>`;
    } else if (shopTab === 'vender') {
      const list = st.bag.filter((i) => !i.lock).sort(SORTS.raridade);
      h += list.length ? list.map((i) => itemRow(i, `<button class="btn sm red" data-sellq="${i.id}">🪙 ${fmt(G.sellPrice(i))}</button>`, `data-item="${i.id}"`, true)).join('') : '<div class="card center muted">Nada para vender (itens travados não aparecem).</div>';
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
        return itemRow(i, max ? '<span class="sub">MÁX</span>' : `<div class="pricebox"><div class="sub">${Math.round(G.upgradeChance(i) * 100)}% de sucesso</div><button class="btn sm" data-upq="${i.id}">🪙 ${fmt(G.upgradeCost(i, forge))} · 🦴 ${G.upgradeOssos(i)}</button></div>`, 'data-noop', true);
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

  /* ---------- Treino (habilidades + arena) ---------- */
  function vTreino() {
    const cd = G.cooldownLeft(st), chk = G.canFight(st, 'training');
    let h = `<h2 class="banner">Treinamento</h2>`;
    if (st.training) {
      const sk = G.SKILLS[st.training.id], left = Math.max(0, (st.training.endsAt - Date.now()) / 1000);
      const total = G.skillTime({ skills: { [st.training.id]: st.training.from } }, st.training.id);
      h += `<div class="card boss"><div class="row"><div class="pic">${sk.icon}</div><div class="grow"><div class="name">Treinando: ${sk.name}</div>
        <div class="sub">Nível ${st.training.from} → ${st.training.from + 1} · faltam <b data-live="tr">${mmss(left)}</b></div></div></div>
        <div class="bar" style="margin-top:8px"><i data-live="trbar" style="width:${Math.min(100, 100 - (left / total) * 100)}%"></i></div>
        <button class="btn" data-act="speedup">⚡ Acelerar · 🪙 ${G.speedupCost(st)}</button></div>`;
    } else h += `<div class="card"><div class="sub">Nenhum treino em andamento. Escolha uma habilidade abaixo — o treino continua mesmo com o app fechado.</div></div>`;
    h += `<div class="card"><div class="row"><div class="pic">🏟️</div><div class="grow"><div class="name">Arena de Treino</div>
      <div class="sub">Custa 1 encontro (${st.energy}/${G.MAX_ENERGY}). XP e ouro reduzidos, chance de itens e ossos.</div></div></div>
      <button class="btn" data-act="fight-train" ${chk.ok ? '' : 'disabled'}>🥊 Treinar na Arena</button>${waitRow()}${chk.ok ? '' : `<div class="sub center" style="margin-top:6px">${chk.msg}</div>`}</div>`;
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
    const cd = G.cooldownLeft(st);
    const card = (type, e, label, tryTxt) => {
      const unlocked = G.eventUnlocked(st, type), chk = G.canFight(st, 'event-' + type);
      const claimed = st.ev[type === 'weekly' ? 'claimW' : 'claimM'] === e.key;
      return `<div class="card boss"><div class="row"><div class="pic">${e.def.emoji}</div><div class="grow"><div class="tag">${label}</div><div class="name">${e.def.name}</div>
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
  function spendEnergy(n) { if (st.energy >= G.MAX_ENERGY) st.energyAt = Date.now(); st.energy -= n; }
  function startFight(type) {
    const chk = G.canFight(st, type);
    if (!chk.ok) { toast(chk.msg); render(); return; }
    let mon, mode, event = null;
    if (type === 'training') { spendEnergy(1); mon = G.trainingMonster(st); mode = 'training'; }
    else if (type === 'story') { const r = G.nextStoryMonster(st); spendEnergy(r.cost); mon = r.mon; mode = r.mode; }
    else { const t = type.split('-')[1], e = G.eventMonster(st, t); mon = e.mon; mode = type; event = { key: e.key, def: e.def }; }
    if (st.hp < 1) G.setHp(st, 1);
    fight = G.startFight(st, mon, { mode, event });
    save(); drawFight([]); overlay.hidden = false;
  }
  function drawFight(logLines) {
    const f = fight, m = f.mon, h = f.hero;
    const cdTxt = (k) => (f.cd[k] > 0 ? ` (${f.cd[k]})` : '');
    const potBtn = (k, n) => `<button class="btn" data-fa="potion-${k}" ${st.potions[k] > 0 ? '' : 'disabled'}>🧪 ${n} (${st.potions[k]})</button>`;
    const label = KIND_LABEL[m.kind];
    overlay.innerHTML = `<div class="fight">
      <div class="arena ${m.boss ? 'boss' : m.kind === 'semi' ? 'semi' : m.kind === 'elite' ? 'elite' : ''}" id="arena" style="position:relative">
        <div class="sub">${m.boss ? '👑 ' : ''}${label} · Nível ${m.level}</div><div class="name">${esc(m.name)}</div>
        <div class="mon" id="mon">${m.emoji}</div>${hpBar(m.hp, m.maxHp, 'mhp')}
        <div class="tags" style="justify-content:center">${modTags(m.mods)}${m.special ? `<span class="tag">💥 ${esc(m.special.name)}</span>` : ''}</div></div>
      <div class="warn" id="warn" ${f.warn ? '' : 'hidden'}>⚠️ ${esc(m.name)} vai usar ${esc(m.special ? m.special.name : '')}! Defenda-se!</div>
      <div class="log" id="log">${logLines.join('')}</div>
      <div style="font-size:13px;margin-bottom:4px">🧔 ${esc(st.name)} ${f.stunned ? '💫' : ''}${f.poison ? '☠️' : ''}${f.buff.grito > 0 ? '📣' : ''}${f.buff.postura > 0 ? '🗿' : ''}</div>${hpBar(h.hp, h.max)}
      <div class="acts" style="margin-top:8px">
        <button class="btn red" data-fa="attack">⚔️ Atacar</button>
        <button class="btn" data-fa="heavy" ${f.cd.heavy > 0 ? 'disabled' : ''}>💥 Golpe Forte${cdTxt('heavy')}</button>
        <button class="btn" data-fa="guard">🛡️ Defender</button>
        ${h.grito ? `<button class="btn" data-fa="grito" ${f.cd.grito > 0 ? 'disabled' : ''}>📣 Grito${cdTxt('grito')}</button>` : ''}
        ${h.postura ? `<button class="btn" data-fa="postura" ${f.cd.postura > 0 ? 'disabled' : ''}>🗿 Postura${cdTxt('postura')}</button>` : ''}
        ${potBtn('small', 'Poção P')}${potBtn('large', 'Poção G')}
        <button class="btn" data-fa="flee" ${m.boss || (f.mode !== 'story' && f.mode !== 'training') ? 'disabled' : ''}>🏃 Fugir</button></div></div>`;
  }
  function lineHtml(e) {
    const c = e.kind === 'hit' ? (e.who === 'hero' ? 'hit-h' : 'hit-m') : e.kind;
    return `<div class="${c}">${esc(e.text)}</div>`;
  }
  function floatDmg(txt, cls, onMon) {
    const arena = $('#arena'); if (!arena) return;
    const d = document.createElement('div'); d.className = 'floatdmg ' + cls; d.textContent = txt;
    d.style.left = onMon ? '55%' : '20%'; d.style.top = onMon ? '45%' : '85%';
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
      const mon = $('#mon');
      if (mon && e.kind === 'hit' && e.who === 'hero') { mon.classList.remove('shake'); void mon.offsetWidth; mon.classList.add('shake'); floatDmg('-' + e.dmg, e.crit ? 'crit' : '', true); buzz(e.crit ? 40 : 15); }
      if (mon && e.kind === 'hit' && e.who === 'mon') { mon.classList.remove('lunge'); void mon.offsetWidth; mon.classList.add('lunge'); floatDmg('-' + e.dmg, e.special ? 'crit' : '', false); buzz(e.special ? 60 : 25); }
      if (e.kind === 'heal') floatDmg('+', 'heal', e.who !== 'hero');
      const bars = document.querySelectorAll('#overlay .bar');
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
      h = `<div class="big">${rep.trophy ? rep.trophy.tIcon : rep.evTrophy ? rep.evTrophy.icon : rep.kind === 'semi' ? '🐾' : '🏆'}</div><h2 class="banner">${rep.trophy ? 'Chefe derrotado!' : rep.kind === 'semi' ? 'Semi-chefe derrotado!' : rep.kind === 'event' ? 'Chefe de evento derrotado!' : 'Vitória!'}</h2>
        <div class="center">✨ +${fmt(rep.xp)} XP · 🪙 +${fmt(rep.gold)} · 🦴 +${rep.ossos}${rep.fossils ? ' · 🦕 +' + rep.fossils : ''}</div>`;
      if (rep.trophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu conquistado</b><div>${rep.trophy.tIcon} ${rep.trophy.trophy}</div></div>`;
      if (rep.evTrophy) h += `<div class="card center" style="margin-top:10px"><b>Troféu de evento</b><div>${rep.evTrophy.icon} ${esc(rep.evTrophy.name)}</div></div>`;
      if (rep.levels.length) h += `<div class="card center"><b>⬆ Subiu para o nível ${rep.levels[rep.levels.length - 1]}!</b><div class="sub">Vida restaurada e novo estoque na loja.</div></div>`;
      if (rep.items.length) h += `<div class="sub" style="margin:8px 0 4px">Itens encontrados:</div>` + rep.items.map((i) => itemRow(i, '', 'data-noop', true)).join('');
      if (rep.bagFull) h += `<div class="sub down">Baú cheio: ${rep.lost.length} item(ns) vendido(s) automaticamente.</div>`;
      if (rep.finishedGame) h += `<div class="card center"><div class="big">👑</div><b>Você é o Rei da Era da Pedra!</b><div class="sub">Todos os 15 chefes foram derrotados. Continue evoluindo!</div></div>`;
    }
    openModal(h + '<button class="btn go" data-close>Continuar</button>');
    render();
  }

  /* ---------- Menu / início ---------- */
  function menu() {
    openModal(`<h2 class="banner">Menu</h2>
      <button class="btn" data-act="rename">✏️ Mudar nome do herói</button>
      <button class="btn red" data-act="reset">🗑️ Reiniciar jogo</button>
      <button class="btn" data-close>Fechar</button>
      <div class="sub center" style="margin-top:10px">Era da Pedra v2.0 · progresso salvo neste aparelho</div>`);
  }
  function askName(first) {
    openModal(`<div class="big">🦴</div><h2 class="banner">${first ? 'Bem-vindo à Era da Pedra' : 'Nome do herói'}</h2>
      <div class="sub center" style="margin-bottom:8px">${first ? 'Você é um caçador de nível 1. Derrote feras, vença 15 chefes e vire lenda.' : ''}</div>
      <input id="nm" maxlength="14" value="${first ? '' : esc(st.name)}" placeholder="Nome do herói" style="width:100%;padding:12px;font:inherit;font-size:16px;border-radius:8px;border:2px solid var(--edge);background:#0b0705;color:var(--bone);user-select:text;-webkit-user-select:text">
      <button class="btn go" data-act="savename">${first ? 'Começar aventura' : 'Salvar'}</button>`);
  }

  /* ---------- Eventos de clique ---------- */
  const SEL = '[data-act],[data-nav],[data-item],[data-shopitem],[data-buy],[data-buyq],[data-eq],[data-uneq],[data-sell],[data-sellq],[data-upq],[data-close],[data-bf],[data-st],[data-ss],[data-ft],[data-pot],[data-fa],[data-empty],[data-lock],[data-dis],[data-disq],[data-bulk],[data-fuse],[data-train],[data-ev],[data-evbuy],[data-go-forge]';
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
    if (d.ss) { shopSlot = d.ss; return render(); }
    if (d.ft) { forgeTab = d.ft; return render(); }
    if (d.empty) return showEmptySlot(d.empty, d.ri === '' ? null : +d.ri);
    if (d.item) return showItem(d.item);
    if (d.shopitem) return showItem(d.shopitem, true);
    if (d.buy || d.buyq) { const r = G.buyItem(st, d.buy || d.buyq); if (r.ok) buzz(20); return after(r.msg, r.ok); }
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
    if (d.ev) return startFight('event-' + d.ev);
    if (d.evbuy) { const r = G.buyEventOffer(st, d.evbuy); return after(r.msg, r.ok); }
    switch (d.act) {
      case 'fight-story': return startFight('story');
      case 'fight-train': return startFight('training');
      case 'menu': return menu();
      case 'rename': return askName(false);
      case 'savename': { const v = ($('#nm').value || '').trim(); if (v) st.name = v; closeModal(); save(); render(); return; }
      case 'reset': if (confirm('Apagar todo o progresso?')) { G.wipe(); st = G.newState(''); fight = null; closeModal(); save(); render(); askName(true); } return;
      case 'refreshshop': { const c = G.shopRefreshCost(st); if (st.gold < c) return toast('Ouro insuficiente.'); st.gold -= c; G.refreshShop(st); return after('Estoque renovado.', false); }
      case 'rest': { const r = G.rest(st); return after(r.msg, false); }
      case 'skipcd': { const r = G.skipCooldown(st); if (r.ok) buzz(20); return after(r.msg, false); }
      case 'buyen': { const r = G.buyEnergy(st); if (r.ok) buzz(20); return after(r.msg, false); }
      case 'bagup': { const r = G.buyBagSlots(st); return after(r.msg, false); }
      case 'sort': bagSort = bagSort === 'poder' ? 'raridade' : bagSort === 'raridade' ? 'nivel' : 'poder'; return render();
      case 'bulk': return bulkMenu();
      case 'speedup': { const r = G.speedupTraining(st); if (r.ok) toast(`${G.SKILLS[r.id].name} subiu de nível!`); else toast(r.msg); return after(null, false); }
    }
  });

  /* ---------- Relógio: atualiza contadores sem recriar a tela ---------- */
  function snapshot() {
    return [G.cooldownLeft(st) > 0, st.energy, !!st.training, st.hp >= G.heroStats(st).hp, st.shop && st.shop.at].join('|');
  }
  function tick() {
    if (fight || !modal.hidden) return;
    const trainDone = G.syncTime(st);
    if (trainDone) { toast(`🎓 ${G.SKILLS[trainDone].name} subiu para o nível ${G.skillRank(st, trainDone)}!`); buzz(40); save(); render(); return; }
    if (snapshot() !== lastSnap) { render(); return; }
    const cd = G.cooldownLeft(st);
    const set = (k, v) => { const el = view.querySelector(`[data-live="${k}"]`); if (el) el.textContent = v; };
    set('cd', cd > 0 ? cd + 's' : 'pronto'); set('cdcost', G.cooldownSkipCost(st));
    if (st.energy < G.MAX_ENERGY) set('ent', mmss(G.ENERGY_SECS - (Date.now() - st.energyAt) / 1000));
    if (st.training) {
      const left = Math.max(0, (st.training.endsAt - Date.now()) / 1000), total = G.skillTime({ skills: { [st.training.id]: st.training.from } }, st.training.id);
      set('tr', mmss(left)); const b = view.querySelector('[data-live="trbar"]'); if (b) b.style.width = Math.min(100, 100 - (left / total) * 100) + '%';
    }
    if (st.shop) set('shop', mmss(G.SHOP_SECS - (Date.now() - st.shop.at) / 1000));
    if (screen === 'cacar' && st.hp < G.heroStats(st).hp) { const bar = view.querySelector('.bar.hp'); if (bar) { const mx = G.heroStats(st).hp; bar.firstElementChild.style.width = (st.hp / mx) * 100 + '%'; bar.querySelector('.t').textContent = fmt(st.hp) + ' / ' + fmt(mx); } }
  }

  /* ---------- Início ---------- */
  const fresh = !st;
  if (!st) { st = G.newState(''); st.name = 'Herói'; save(); }
  render();
  if (fresh) askName(true);
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !fight) render(); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
